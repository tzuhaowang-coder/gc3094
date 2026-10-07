'use strict';

const PACKAGE_NAME = 'cocos-reference-finder';

const template = `
<div class="root">
  <div class="toolbar">
    <div class="title">Reference Finder</div>
    <ui-button id="refresh" class="primary">Find References</ui-button>
  </div>
  <div class="target" id="target">No asset selected.</div>
  <div class="status" id="status">Right-click an asset in Assets and choose "Find References".</div>
  <div id="results" class="results"></div>
</div>`;

const style = `
:host { display:block; height:100%; }
* { box-sizing:border-box; }
.root { height:100%; display:flex; flex-direction:column; background:#1f1f1f; color:#ddd; font-family:Arial,sans-serif; }
.toolbar { height:48px; display:flex; align-items:center; padding:0 12px; border-bottom:1px solid #444; gap:12px; }
.title { font-size:16px; font-weight:bold; flex:1; }
.target { padding:10px 12px; border-bottom:1px solid #383838; font-family:monospace; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.status { padding:9px 12px; color:#aaa; font-size:12px; border-bottom:1px solid #383838; }
.results { flex:1; overflow:auto; padding:8px; }
.file { margin-bottom:10px; border:1px solid #3d3d3d; border-radius:4px; overflow:hidden; }
.file-head { padding:8px 10px; background:#2a2a2a; font-weight:bold; font-size:12px; }
.hit { padding:10px; border-top:1px solid #353535; font-family:monospace; font-size:11px; line-height:1.55; }
.path { color:#eee; word-break:break-all; font-size:12px; }
.component { color:#9dc7ff; margin-top:3px; }
.property { color:#aaa; margin-top:3px; word-break:break-all; }
.meta { color:#777; }
.empty { padding:20px; text-align:center; color:#888; }
.badge { display:inline-block; margin-left:6px; padding:1px 5px; border:1px solid #555; border-radius:3px; color:#999; font-size:10px; }
.node-id { color:#666; margin-top:3px; }
`;

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function render(data, panel) {
    const els = panel && panel.$;
    if (!els || !els.target || !els.status || !els.results) return;

    const target = data && data.target;
    els.target.textContent = target
        ? `${target.name || '(unknown)'}  |  ${target.url || ''}  |  UUID: ${target.uuid || ''}`
        : 'No asset selected.';

    const results = data && Array.isArray(data.results) ? data.results : [];
    const scanned = data && Number.isFinite(data.scanned) ? data.scanned : 0;
    const referenceCount = results.reduce((n, r) => n + (Array.isArray(r.hits) ? r.hits.length : 0), 0);
    const resolvedCount = results.reduce((n, r) => n + (Array.isArray(r.hits) ? r.hits.filter(h => h.resolved).length : 0), 0);
    els.status.textContent = `Scanned ${scanned} Scene/Prefab files. Found ${referenceCount} references. Node locations: ${resolvedCount}/${referenceCount}.`;

    if (!results.length) {
        els.results.innerHTML = '<div class="empty">No static references found.</div>';
        return;
    }

    els.results.innerHTML = results.map(file => {
        const hits = Array.isArray(file.hits) ? file.hits : [];
        return `<div class="file">
          <div class="file-head">${escapeHtml(file.kind || '')} · ${escapeHtml(file.relative || '')}</div>
          ${hits.map(hit => {
              const node = hit.nodePath ? escapeHtml(hit.nodePath) : '<span class="meta">Node not resolved</span>';
              const badge = hit.resolved ? '' : '<span class="badge">unresolved</span>';
              const comp = hit.component ? `<div class="component">Component: ${escapeHtml(hit.component)}</div>` : '';
              const prop = hit.propertyPath ? `<div class="property">Property: ${escapeHtml(hit.propertyPath)}</div>` : '';
              const nodeId = hit.nodeUuid ? `<div class="node-id">Node ID: ${escapeHtml(hit.nodeUuid)}</div>` : '';
              return `<div class="hit"><div class="path">${node}${badge}</div>${comp}${prop}${nodeId}</div>`;
          }).join('')}
        </div>`;
    }).join('');
}

async function loadTargetAndSearch(panel) {
    try {
        const target = await Editor.Message.request(PACKAGE_NAME, 'get-target');
        if (!target || !target.uuid) {
            render({ target: null, scanned: 0, results: [] }, panel);
            return;
        }
        render({ target, scanned: 0, results: [] }, panel);
        if (panel.$ && panel.$.status) panel.$.status.textContent = 'Scanning serialized Scene/Prefab object tables...';
        const data = await Editor.Message.request(PACKAGE_NAME, 'find-references', target.uuid);
        render(data, panel);
    } catch (e) {
        console.error('[Reference Finder] Search failed:', e);
        if (panel.$ && panel.$.status) panel.$.status.textContent = `Scan failed: ${e && e.message ? e.message : e}`;
    }
}

module.exports = Editor.Panel.define({
    template,
    style,
    $: {
        refresh: '#refresh',
        target: '#target',
        status: '#status',
        results: '#results',
    },
    ready() {
        const refresh = this.$.refresh;
        if (refresh) {
            this._onRefresh = () => loadTargetAndSearch(this);
            refresh.addEventListener('confirm', this._onRefresh);
            refresh.addEventListener('click', this._onRefresh);
        }
        loadTargetAndSearch(this);
    },
    close() {
        const refresh = this.$.refresh;
        if (refresh && this._onRefresh) {
            refresh.removeEventListener('confirm', this._onRefresh);
            refresh.removeEventListener('click', this._onRefresh);
            this._onRefresh = null;
        }
    }
});
