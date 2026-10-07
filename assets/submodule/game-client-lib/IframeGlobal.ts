
import { EXTRA_1110 } from './ParamsGlobal';
import { MsgCode } from './protobuf/ProtobufWarp';
import CommunicationBase from './script/CommunicationBase';
import { exitApp, webViewMode } from './script/WebViewGlobal';
import { Balance, maxSafeBalanceNumber } from './utils/Balance';
import { log } from './utils/Utils';

let isLoginFromLobby = false;

/**
 * 說明頁（infoPageShow）共同欄位
 * key 直接透傳給父層，各遊戲類型（slot / 魚機 / 街機）在此基礎上擴充自己的欄位
 */
export interface InfoFieldsBase {
    cur: string; // currency
}

/** slot 說明頁欄位 */
export interface SlotInfoFields extends InfoFieldsBase {
    tb: number; // totalBet
    bb: number; // baseBet
    pb: string; // powerBet，'0': 非強力投注, '1': 強力投注
}

/** 魚機說明頁欄位（TODO: 規格定案後補） */
export interface FishInfoFields extends InfoFieldsBase {
}

/** 街機說明頁欄位（TODO: 規格定案後補） */
export interface ArcadeInfoFields extends InfoFieldsBase {
}

export type InfoPageFields = SlotInfoFields | FishInfoFields | ArcadeInfoFields;

export function setIsLoginFromLobby(isLobby: boolean) {
    isLoginFromLobby = isLobby;
}

export function getIsLoginFromLobby() {
    return isLoginFromLobby;
}

interface IKeyValuePair {
    k: string;
    v: string;
}

/**
 *
 * @returns 是否是直接開 game.html?
 */
export function hasWindowParent() {
    return window.parent !== window;
}

// 各遊戲用
export function backToLobby(comm: CommunicationBase, callback: (code: MsgCode) => void, token: string, music: string, sound: string, lang: string): void {
    const isFromLobby = getIsLoginFromLobby();
    const inIframe = hasWindowParent();
    if (isFromLobby && inIframe) {
        postOutGame();
    } else if (!isFromLobby) {
        // 不是 isFromLobby
        callback(MsgCode.SUCCESS);
        if (webViewMode()) {
            exitApp();
        } else {
            postOutGame();
        }
    } else {
        // 直接進遊戲
        // 其他異常狀況
        callback(MsgCode.SUCCESS);
    }
}

export function openRecord(token: string, gameId: string) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'betPageShow', data: { token, gid: gameId } }), '*');
    }
}

export function postOutGame(url: string= '') {
    log('out', url);
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'outGame', data: { url } }), '*');
    }
}

export function changeTitle(title: string) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'changeTitle', data: title }), '*');
    }
}

export function gotoUrl(url: string) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'goto', data: url }), '*');
    } else {
        try {
            window.location.replace(url);
        } catch (e) {
        }
    }
}
export function openPage(url: string) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'pageShow', data: { url } }), '*');
    }
}

export function reload() {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'reload' }), '*');
    } else {
        window.location.reload();
    }
}

export function postBonusEventOpen(data:{m:string , s:string}) {
    log('bonusEventOpen');
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data, method: 'bonusEventOpen' }), '*');
    }
}

export function postBonusEventInfoOpen(data:{m:string , s:string}) {
    log('@@ bonusEventInfoOpen');
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data, method: 'bonusEventInfoOpen' }), '*');
    }
}

export function postBonusEventAlert(data: any) {
    log('bonusEventAlert');
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data, method: 'bonusEventAlert' }), '*');
    }
}

export function postBonusEventInfo(data: any, bonusAutoPrize:string= '' , bonusInfoFirstOpenDoNotShowAgain:string= '') {
    log('bonusEventInfo');
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data, bonusAutoPrize, bonusInfoFirstOpenDoNotShowAgain , method: 'bonusEventInfo' }), '*');
    }
}

export function hideBonusEvent() {
    log('hideBonusEvent');
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'hideBonusEvent' }), '*');
    }
}

export function openInfo(fields: InfoPageFields) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'infoPageShow', data: fields }), '*');
    }
}

export function hideInfo() {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'closeInfoIframe' }), '*');
    }
}

const GA_VERSION = 'v2.2.1';

let patchVersion = '0';

export function setGAPatchVersion(version: string) {
    patchVersion = version;
}

// GA
export function loginFinished2(gameId: string, msg: string, loadTime: number = 0, balance: Balance = new Balance(0), currency: string = 'CNY', opt?: {
    setting_audio: string,
    setting_option: string,
}) {
    // log('login', '', 'login', { gameId, msg, loadTime, balance, currency });

    // 事件名稱 login
    //     音量、音效、環境音 setting_audio (內容 111 000)
    //     顯示初始頁、顯示貨幣符號、空白鍵spin setting_option (內容1111,0000)
    report('login', '', 'login', { gameId, msg, loadTime, currency, balance: maxSafeBalanceNumber(balance), setting_audio: opt && opt.setting_audio, setting_option: opt && opt.setting_option  });
}

export function report(event: string, label: string, category: string, argsData?: any) {
    if (hasWindowParent()) {
        const args = Object.assign(
            {
                gaVersion: `${GA_VERSION}-${patchVersion}`,
            },
            argsData,
        );
        log('ga', event, label, category, args);
        window.parent.postMessage(JSON.stringify({ method: 'report', data: { event, label, category, args } }), '*');
    }
}

export function reportClick(gameId: string, currency: string = 'CNY', type: 'record' | 'home' | 'info') {
    // 事件名稱 click content (內容 注單(record) 返回(home) Info)
    report(`click`, '', 'click', { gameId, currency, content: type });
}

export enum DownloadAlertError {
    NONE = 0,
    SCRIPT = -1,
    SCENE = -2,
    RESOURCE = -3,
}

export function downloadAlert(code: DownloadAlertError) {
    if (EXTRA_1110) {
        iframeAlert('system.download_error2', '' + code);
    } else {
        iframeAlert('system.download_error', '' + code);
    }
}

export function iframeAlert(key:string, args?:string) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'alert', data: { key, args } }), '*');
    }
}

/**
 * 開關 直轉橫提示，為 DOM 節點
 * @param able
 */
export function toggleDOMLandscapeHint(able: boolean) {
    return;
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'showLandscape', data: able }), '*');
    }
}

/**
 * 開關 橫轉直提示，為 DOM 節點
 * @param able
 */
export function toggleDOMPortraitHint(able: boolean) {
    return;
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ method: 'showPortrait', data: able }), '*');
    }
}

export function hideDraLoading(force: boolean) {
    if (parent && (window.parent !== window)) {
        parent.postMessage(JSON.stringify({ method: 'draLoadingHide', data:{ force, starBtn: true } }), '*');
    }
}

export function showDraLoading(gid: string) {
    if (parent && (window.parent !== window)) {
        parent.postMessage(JSON.stringify({ method: 'draLoadingShow', data: gid }), '*');
    }
}

/**
 * @param percent 0 - 100
 */
export function progressDraLoading(percent: number) {
    if (parent && (window.parent !== window)) {
        parent.postMessage(JSON.stringify({ method: 'draLoadingUpdateProgress', data: percent }), '*');
    }
}

export function getReferUrl(): string {
    if (hasWindowParent()) {
        try {
            return window.parent.document.referrer;
        } catch (e) {
            return '';
        }
        // let openerUrl = '';
        // if (parent.window.opener) {
        //     try {
        //         openerUrl = parent.window.opener.location.href;
        //     } catch (e) {
        //         // do nothing
        //     }
        // }
        // return openerUrl || referrer;
    }
    return '';
}

/**
 * 比值 > 1 橫版
 * 比值 < 1 直版
 */
export function getParentInnerWHRatio() {
    if (!hasWindowParent()) {
        return innerWidth / innerHeight;
    }
    try {
        return parent.innerWidth / parent.innerHeight;
    } catch (e) {
        // 跨 origin 嵌入時讀不到父視窗尺寸（瀏覽器擋下並丟 SecurityError）——
        // 如本機把遊戲指向 Creator 預覽伺服器：遊戲在 7456、大廳在 9000。
        // iframe 幾乎滿版，退回自身視窗比例，橫豎判定結果相同。
        // 同檔 getReferUrl 對 parent.document 也是這個處理方式。
        return innerWidth / innerHeight;
    }
}
