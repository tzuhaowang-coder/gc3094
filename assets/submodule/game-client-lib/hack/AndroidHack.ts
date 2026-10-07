import { sys } from 'cc';

export function androidHack() {
    if (isAndroid()) {
        sys.isMobile = true;
    }
}

function isAndroid() {
    if (/Android|SamsungBrowser/i.test(navigator.userAgent)) {
        return true;
    }
    return false;
}
