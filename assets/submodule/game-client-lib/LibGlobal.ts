import { BlockInputEvents, Button, Component, Node, sys, Widget } from 'cc';
import { DEBUG, EDITOR } from 'cc/env';
import { EXTRA_13, getDebugParams, getHrefURLParams } from './ParamsGlobal';
import Alert from './component/Alert';
import ButtonInteractable from './component/ButtonInteractable';
import Loading from './component/Loading';
import { Toast } from './component/Toast';
import { androidHack } from './hack/AndroidHack';
import { iosHack } from './hack/IosHack';
import { globalDebugCreator } from './utils/Count';
import { arraySplice, debugDeltaScale, log } from './utils/Utils';

iosHack();
androidHack();

export interface ILobby {
    requesting: boolean;
    stepping: boolean;
    resumePause: boolean;
}

export interface IMain {
    token: string;
    offlineData: OfflineData;
    offline(str: string, code: number, refreshAble?: boolean): void;
    offline2(): void;
    resume2(idx?: number): void;
    online(): void;
    getAlert(): Alert;
    getLoading(): Loading;
    getToast(): Toast;
    setIslobby(able: boolean): void;
    setMusic(able: boolean): void;
    setSound(able: boolean): void;
    toggleLoading(able: boolean): void;
    getGameId(): string;
    whenOffline: Function;
}

export interface OfflineData {
    message:string;
    code: number;
    refreshAble: boolean;
}

export interface IAlert {
    alert(messageOrMessages: string | string[], title: string, priority: number, callback?: () => void): void;
    filter(priority: number): void;
    only1(): void;
}

/**
 * Alert訊息層級
 */
export enum ALERT_LEVEL {
    DEFAULT,
    WILL_KICK_TABLE,
    KICK_TABLE,
    NETWORK_RETRY,
    KICK_GAME,
    NETWORK,
}

// 最大延遲時間 (超過就不給玩了)
export let MAX_LATENCY = 2000;

export let isEnterBackground = false;

export function setIsEnterBackground(boo: boolean) {
    isEnterBackground = boo;
}

export function getIsEnterBackground(): boolean {
    return isEnterBackground;
}

const buttonInteractableMap: { [s: string]: ButtonInteractable[] } = {};

export function bindExclusiveButtonInteractable(key: string, bi: ButtonInteractable) {
    if (!bi) {
        return;
    }
    if (!buttonInteractableMap[key]) {
        buttonInteractableMap[key] = [];
    }
    buttonInteractableMap[key].push(bi);
}

export function unbindExclusiveButtonInteractable(key: string, bi: ButtonInteractable) {
    if (!bi) {
        return;
    }
    if (buttonInteractableMap[key]) {
        arraySplice(buttonInteractableMap[key], bi);
    }
}

export function activeButtonExclusive(key: string, bi: ButtonInteractable) {
    if (buttonInteractableMap[key]) {
        buttonInteractableMap[key].forEach((bi2) => {
            bi2.interactable(bi2 === bi);
        });
    }
}

export function disableButtonExclusive(key: string) {
    if (buttonInteractableMap[key]) {
        buttonInteractableMap[key].forEach((bi) => {
            bi.interactable(true);
        });
    }
}

export const MMM = {
    keyTimes: {},
    keyArray: {},
    array: [],
};

export const NNN = [];
if (DEBUG) {
    // @ts-ignore
    window.NNN = NNN;
    // @ts-ignore
    window.MMM = MMM;
}

export let globalDebugNNN = globalDebugCreator(NNN);

export let ccIsMobile: boolean = sys && sys.isMobile || EXTRA_13;
if (!EDITOR && DEBUG) {
    const isMobile = getDebugParams('isMobile');
    if (isMobile !== '') {
        const bool = Boolean(Number(isMobile));
        log('rewrite isMobile to', bool);
        ccIsMobile = bool;
    }
}
export let uiIsMobile: boolean = ccIsMobile;

export function setUiIsMobile(able: boolean) {
    uiIsMobile = able;
}

if (!EDITOR && DEBUG) {
    const deltaScale = getDebugParams('deltaScale');
    if (deltaScale) {
        debugDeltaScale(Number(deltaScale));
    }
}

export function addTransparentMask(parent: Node): Node {
    let node = parent.getChildByName('TransparentMask');
    if (node) {
        return node;
    }
    node = new Node('TransparentMask');
    node.setParent(parent);
    node.addComponent(BlockInputEvents);

    const widget = node.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    widget.top = 0;
    widget.bottom = 0;
    widget.left = 0;
    widget.right = 0;
    widget.updateAlignment();
    return node;
}

export function removeTransparentMask(parent: Node) {
    const node = parent.getChildByName('TransparentMask');
    if (node) {
        node.destroy();
    }
}

const TRANSPARENT_BUTTON_NODE_NAME = 'TransparentButton';

export function addTransparentButton(parent: Node, callback: Function): Node {
    let node = parent.getChildByName(TRANSPARENT_BUTTON_NODE_NAME);
    if (node) {
        return node;
    }
    node = new Node(TRANSPARENT_BUTTON_NODE_NAME);
    node.setParent(parent);
    const b = node.addComponent(Button);
    const k = 'DS_CLICK';
    b[k] = () => {
        callback();
        removeTransparentButton(parent);
    };
    const h = new Component.EventHandler();
    h.target = node;
    h.component = 'cc.Button';
    h.handler = k;
    b.clickEvents.push(h);

    const widget = node.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    widget.top = 0;
    widget.bottom = 0;
    widget.left = 0;
    widget.right = 0;
    widget.updateAlignment();
    return node;
}

export function removeTransparentButton(parent: Node) {
    const node = parent.getChildByName(TRANSPARENT_BUTTON_NODE_NAME);
    if (node) {
        node.destroy();
    }
}

const DEFAULT_OCCUR_KEY = 'default';

const occurMap: { [s: string]: boolean } = {};

export function occurWarper(able: boolean, key: string = DEFAULT_OCCUR_KEY) {
    occurMap[key] = occurMap[key] || able;
    return occurMap[key];
}

export function resetOccur(key: string= DEFAULT_OCCUR_KEY) {
    occurMap[key] = false;
}

export function pad2(num: number) {
    if (num < 10) {
        return '0' + num;
    }
    return '' + num;
}

globalDebugNNN(getHrefURLParams, 'getHrefURLParams', false);
globalDebugNNN(getDebugParams, 'getDebug', false);
