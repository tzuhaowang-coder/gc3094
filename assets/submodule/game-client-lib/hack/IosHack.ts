import { sys, VERSION } from 'cc';

/**
 * IOS Hack
 */
export function iosHack() {
    if (!sys.isMobile && sys.BrowserType.SAFARI) {
        const isMobile = iosSafariMobile();
        sys.isMobile = isMobile;
    }
    if (String(VERSION) !== '2.2.2') {
        return;
    }
    const isIOS14Device = sys.os === sys.OS.IOS && sys.isBrowser && sys.isMobile && /iPhone OS 14/.test(window.navigator.userAgent);
    if (String(VERSION) === '2.2.2' && isIOS14Device) {
        ios14Hack();
    }
}

function iosSafariMobile() {
    if (/iPad/i.test(navigator.userAgent)) {
        return true;
    }
    if (/Macintosh/i.test(navigator.userAgent)) {
        try {
            document.createEvent('TouchEvent');
            return true;
        } catch (e) { }
    }
    return false;
}
/**
 * IOS 14 FPS SLOW
 */
function ios14Hack() {
    // @ts-ignore
    MeshBuffer.prototype.checkAndSwitchBuffer = function (vertexCount) {
        if (this.vertexOffset + vertexCount > 65535) {
            this.uploadData();
            this._batcher._flush();
        }
    };
    // @ts-ignore
    MeshBuffer.prototype.forwardIndiceStartToOffset = function () {
        this.uploadData();
        this.switchBuffer();
    };
}
