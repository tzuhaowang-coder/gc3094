
import { hasWindowParent } from '../IframeGlobal';
import { EXTRA_9 } from '../ParamsGlobal';
import CommListener from '../utils/CommListener';
import { error } from '../utils/Utils';

export function webViewMode(): boolean {
    // use url/?extra=9 flag maybe
    return EXTRA_9 && Boolean(window.webview && window.webview.gameKick);
}

window.addEventListener('message', receiveMessageFromIndex, false);

export class WebViewMessage {
    constructor(
        public method: string = '',
        public data: any = null,
    ) {

    }
}

const listeners: CommListener<any>[] = [];
function receiveMessageFromIndex(e: MessageEvent) {
    if (!hasWindowParent()) {
        return;
    }
    try {
        const param = JSON.parse(e.data);
        const wm = new WebViewMessage(param.method, param.data);
        const l = listeners.length;
        for (let i = 0; i < l; i += 1) {
            const listener = listeners[i];
            listener.onMessage(wm);
        }
    } catch (e) {
        error(e);
    }
}

export function registMessage(listener: CommListener<any>) {
    if (!webViewMode()) {
        return;
    }
    listeners.push(listener);
}

export function checkGame(gameID:string, language:string , priority:number) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'webview', data: { method:'checkGame', gid:gameID , lang:language , pri:priority } }), '*');
    }
}

export function downloadGame(gameID:string, language:string , priority:number) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'webview', data: { method:'downloadGame', gid:gameID , lang:language , pri:priority } }), '*');
    }
}

export function convertLang(gameID:string, language:string , priority:number) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'webview', data: { method:'convertLang', gid:gameID , lang:language , pri:priority } }), '*');
    }
}

export function exitApp() {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'webview', data: { method:'exitApp', gid:'' , lang:'' , pri:0 } }), '*');
    }
}
