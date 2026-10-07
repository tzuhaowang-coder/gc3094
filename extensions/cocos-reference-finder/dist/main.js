'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'cocos-reference-finder';
globalThis.__referenceFinderTarget = null;

function getProjectPath() {
    return Editor.Project.path;
}

function walkFiles(dir, out) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.DS_Store') continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walkFiles(p, out);
        else if (entry.isFile() && (entry.name.endsWith('.scene') || entry.name.endsWith('.prefab'))) out.push(p);
    }
}

function stripBom(text) {
    return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function getRefIndex(value) {
    if (value && typeof value === 'object' && Number.isInteger(value.__id__)) return value.__id__;
    if (Number.isInteger(value)) return value;
    return null;
}

function getType(obj) {
    return obj && typeof obj === 'object' && typeof obj.__type__ === 'string' ? obj.__type__ : '';
}

function isNodeObject(obj) {
    const type = getType(obj);
    return type === 'cc.Node' || type === 'cc.Node2D' || type === 'cc.Scene' || type.endsWith('.Scene');
}

function isLikelyComponent(obj) {
    if (!obj || typeof obj !== 'object' || isNodeObject(obj)) return false;
    if (obj._node !== undefined) return getRefIndex(obj._node) !== null;
    // Some serialized objects have a component-like type but omit _node in special cases.
    const type = getType(obj);
    return !!type && type.startsWith('cc.') && !type.includes('Asset') && !type.includes('Scene');
}

function objectContainsUuid(value, targetUuid, pathParts, out) {
    if (value === null || value === undefined) return;
    if (typeof value !== 'object') return;

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            objectContainsUuid(value[i], targetUuid, pathParts.concat(`[${i}]`), out);
        }
        return;
    }

    if (value.__uuid__ === targetUuid) {
        out.push(pathParts.length ? pathParts.join('.') : '(root)');
    }

    for (const [key, child] of Object.entries(value)) {
        if (key === '__uuid__') continue;
        objectContainsUuid(child, targetUuid, pathParts.concat(key), out);
    }
}

function buildIndex(objects) {
    const nodes = new Map();
    const components = new Map();
    const objectToNode = new Map();

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (!obj || typeof obj !== 'object') continue;

        if (isNodeObject(obj)) {
            nodes.set(i, obj);
        }
    }

    // Components point to their owning node through _node.
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (!isLikelyComponent(obj)) continue;
        const nodeIndex = getRefIndex(obj._node);
        if (nodeIndex === null || !nodes.has(nodeIndex)) continue;
        components.set(i, {
            nodeIndex,
            type: getType(obj) || 'UnknownComponent'
        });
        objectToNode.set(i, nodeIndex);
    }

    // Also index node-owned component references. This helps with serialized variants where
    // _node is absent or represented unusually on the component object.
    for (const [nodeIndex, node] of nodes) {
        const list = node._components;
        if (!Array.isArray(list)) continue;
        for (const ref of list) {
            const componentIndex = getRefIndex(ref);
            if (componentIndex === null || componentIndex < 0 || componentIndex >= objects.length) continue;
            const component = objects[componentIndex];
            if (!component || typeof component !== 'object') continue;
            if (!components.has(componentIndex)) {
                components.set(componentIndex, {
                    nodeIndex,
                    type: getType(component) || 'UnknownComponent'
                });
            }
            objectToNode.set(componentIndex, nodeIndex);
        }
    }

    return { nodes, components, objectToNode };
}

function getNodeName(node, index) {
    if (!node || typeof node !== 'object') return `Node#${index}`;
    const name = node._name ?? node.name;
    if (name !== undefined && name !== '') return String(name);
    if (getType(node) === 'cc.Scene' || getType(node).endsWith('.Scene')) return 'Scene';
    return `Node#${index}`;
}

function getNodePath(objects, nodeIndex, cache, visiting = new Set()) {
    if (nodeIndex === null || nodeIndex === undefined || nodeIndex < 0 || nodeIndex >= objects.length) return '';
    if (cache.has(nodeIndex)) return cache.get(nodeIndex);
    if (visiting.has(nodeIndex)) return `Node#${nodeIndex}`;

    const node = objects[nodeIndex];
    if (!node || typeof node !== 'object') return '';

    visiting.add(nodeIndex);
    const name = getNodeName(node, nodeIndex);
    const parentIndex = getRefIndex(node._parent);
    let result = name;

    if (parentIndex !== null && parentIndex >= 0 && parentIndex !== nodeIndex) {
        const parentPath = getNodePath(objects, parentIndex, cache, visiting);
        if (parentPath) result = `${parentPath}/${name}`;
    }

    visiting.delete(nodeIndex);
    cache.set(nodeIndex, result);
    return result;
}

function findNearestOwner(objects, objectIndex, indexes) {
    const direct = indexes.components.get(objectIndex);
    if (direct) return direct;

    const obj = objects[objectIndex];
    if (!obj || typeof obj !== 'object') return null;

    if (isNodeObject(obj)) {
        return { nodeIndex: objectIndex, component: getType(obj) || 'cc.Node' };
    }

    if (obj._node !== undefined) {
        const nodeIndex = getRefIndex(obj._node);
        if (nodeIndex !== null && indexes.nodes.has(nodeIndex)) {
            return { nodeIndex, component: getType(obj) || 'UnknownComponent' };
        }
    }

    // Walk references backwards: if a nested serialized object is what contains __uuid__,
    // find a top-level component that references that nested object.
    for (let i = 0; i < objects.length; i++) {
        const candidate = objects[i];
        if (!candidate || typeof candidate !== 'object' || !indexes.components.has(i)) continue;
        if (containsObjectRef(candidate, objectIndex)) return indexes.components.get(i);
    }

    return null;
}

function containsObjectRef(value, targetIndex) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(v => containsObjectRef(v, targetIndex));
    for (const [key, child] of Object.entries(value)) {
        if (key === '__id__' && child === targetIndex) return true;
        if (child && typeof child === 'object' && containsObjectRef(child, targetIndex)) return true;
    }
    return false;
}

function scanFile(file, targetUuid) {
    const text = stripBom(fs.readFileSync(file, 'utf8'));
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return { file, error: `Unable to parse JSON: ${e.message}`, hits: [] };
    }
    if (!Array.isArray(data)) return { file, error: 'Unexpected Cocos serialization format.', hits: [] };

    const indexes = buildIndex(data);
    const nodePathCache = new Map();
    const hits = [];
    const seen = new Set();

    for (let objectIndex = 0; objectIndex < data.length; objectIndex++) {
        const obj = data[objectIndex];
        if (!obj || typeof obj !== 'object') continue;

        const propertyPaths = [];
        objectContainsUuid(obj, targetUuid, [], propertyPaths);
        if (!propertyPaths.length) continue;

        const owner = findNearestOwner(data, objectIndex, indexes);
        for (const propertyPath of propertyPaths) {
            const nodePath = owner ? getNodePath(data, owner.nodeIndex, nodePathCache) : '';
            const key = `${objectIndex}|${propertyPath}|${owner ? owner.nodeIndex : ''}|${owner ? owner.component : ''}`;
            if (seen.has(key)) continue;
            seen.add(key);

            hits.push({
                nodePath,
                nodeIndex: owner ? owner.nodeIndex : null,
                component: owner ? owner.component : '',
                propertyPath,
                objectIndex,
                nodeUuid: owner && data[owner.nodeIndex] ? (data[owner.nodeIndex]._id || '') : '',
                resolved: !!(owner && nodePath)
            });
        }
    }

    const ext = path.extname(file).toLowerCase();
    return {
        file,
        kind: ext === '.scene' ? 'Scene' : 'Prefab',
        hits
    };
}

exports.load = function () {
    console.log('[Reference Finder] loaded 0.2.1');
};
exports.unload = function () {};

function openPanel() {
    Editor.Panel.open(PACKAGE_NAME);
}
function getTarget() {
    return globalThis.__referenceFinderTarget || null;
}
function setTarget(target) {
    globalThis.__referenceFinderTarget = target || null;
}
function findReferences(uuid) {
    if (!uuid) return { target: null, results: [], scanned: 0 };
    const projectAssets = path.join(getProjectPath(), 'assets');
    const files = [];
    walkFiles(projectAssets, files);
    const results = [];
    for (const file of files) {
        const result = scanFile(file, uuid);
        if (result.hits && result.hits.length) {
            result.relative = path.relative(getProjectPath(), file).replace(/\\/g, '/');
            results.push(result);
        }
    }
    return {
        target: globalThis.__referenceFinderTarget || { uuid },
        scanned: files.length,
        results
    };
}

exports.methods = { openPanel, getTarget, setTarget, findReferences };
