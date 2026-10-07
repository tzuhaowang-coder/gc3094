'use strict';

const path = require('path');

async function findReferencesFromAsset(assetInfo) {
    if (!assetInfo || assetInfo.isDirectory || !assetInfo.uuid) {
        return;
    }

    const target = {
        uuid: assetInfo.uuid,
        url: assetInfo.url || '',
        name: assetInfo.displayName || assetInfo.name || path.basename(assetInfo.file || ''),
        file: assetInfo.file || ''
    };

    try {
        const data = await Editor.Message.request('cocos-reference-finder', 'find-references', target.uuid);
        const results = data && Array.isArray(data.results) ? data.results : [];
        const referenceCount = results.reduce((n, r) => n + (Array.isArray(r.hits) ? r.hits.length : 0), 0);
        const resolvedCount = results.reduce((n, r) => n + (Array.isArray(r.hits) ? r.hits.filter(h => h.resolved).length : 0), 0);

        console.groupCollapsed(`[Reference Finder] ${target.name || target.uuid}`);
        console.log('Asset:', target);
        console.log(`Scanned: ${data && data.scanned || 0} Scene/Prefab files`);
        console.log(`References: ${referenceCount}`);
        console.log(`Node locations: ${resolvedCount}/${referenceCount}`);

        if (!results.length) {
            console.log('No static references found.');
        } else {
            for (const file of results) {
                console.group(`${file.kind || 'File'} · ${file.relative || file.file || ''}`);
                for (const hit of (file.hits || [])) {
                    console.log({
                        nodePath: hit.nodePath || '(unresolved)',
                        component: hit.component || '',
                        property: hit.propertyPath || '',
                        nodeId: hit.nodeUuid || '',
                        resolved: !!hit.resolved
                    });
                }
                console.groupEnd();
            }
        }
        console.groupEnd();
    } catch (e) {
        console.error('[Reference Finder] Search failed:', e);
    }
}

function onAssetMenu(assetInfo) {
    if (!assetInfo || assetInfo.isDirectory || !assetInfo.uuid) {
        return [];
    }

    return [{
        label: 'Find References (Console)',
        click() {
            findReferencesFromAsset(assetInfo);
        }
    }];
}

exports.onAssetMenu = onAssetMenu;
