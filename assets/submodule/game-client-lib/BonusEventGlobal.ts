
import { director, find } from 'cc';
import { Message } from 'google-protobuf';
import { GAME_ID } from '../../script/GameId';
import { audioEnable, audioEnabled, audioPreload } from './component/Audio';
import { isLogin } from './data/LoginState';
import { translate, translateError } from './I18nGlobal';
import { hasWindowParent, postBonusEventAlert, postBonusEventInfo, postBonusEventInfoOpen, postBonusEventOpen } from './IframeGlobal';
import { IMain } from './LibGlobal';
import { EXTRA_1110 } from './ParamsGlobal';
import { MemberServiceBaseKey } from './protobuf/MemberServiceBase';
import { BetBonusRes, BonusEvent, BonusInfoRes, BonusState, CheckBonusRes, EventInfo, MsgCode } from './protobuf/ProtobufWarp';
import CommunicationBase from './script/CommunicationBase';
import { WebViewMessage } from './script/WebViewGlobal';
import { setBonusAutoPrize, setBonusInfoFirstOpenDoNotShowAgain } from './StorageGlobal';
import CommListener from './utils/CommListener';
import { commonMsgCodeToMsgKey } from './utils/HandleError';
import { arraySplice, error, log } from './utils/Utils';

const AUTO_RED_ANIM_TOTAL_TIME = 4.2;

const listenTo = [
    MemberServiceBaseKey.CheckBonusRes,
    MemberServiceBaseKey.BetBonusRes,
    MemberServiceBaseKey.BonusInfoRes,
];

export const BONUS_ENUM = {
    /**
     * 離開遊戲
     */
    BONUS_EVENT_OUT_GAME: 'bonusEventOutGame',
    /**
     * 抽獎頁面載入完成
     */
    BONUS_EVENT_PAGE_LOAD: 'bonusEventPageLoad',
    /**
     * 抽獎頁面已點開抽獎結果
     */
    BONUS_EVENT_FINISH: 'bonusEventFinish',
    /**
     * 抽下一包
     */
    BONUS_EVENT_NEXT: 'bonusEventNext',
    /**
     * 抽獎頁面關閉
     */
    BONUS_EVENT_PAGE_CLOSE: 'bonusEventPageClose',
    /**
     * 抽獎說明頁面載入完成
     */
    BONUS_EVENT_INFO_PAGE_LOAD: 'bonusEventInfoPageLoad',
    /**
     * 抽獎說明頁面關閉
     */
    BONUS_EVENT_INFO_PAGE_CLOSE: 'bonusEventInfoPageClose',

    /**
     * 自動抽紅包結束一包
     */
    BONUS_EVENT_ONE_AUTO_PRIZE_FINISH: 'bonusEventOneAutoPrizeFinish',
};

function windowOnMessage(e: MessageEvent) {
    if (!hasWindowParent()) {
        return;
    }
    try {
        const param = JSON.parse(e.data);
        const wm = new WebViewMessage(param.method, param.data);
        obj.onMessage(wm);
    } catch (e) {
        error(e);
    }
}

const obj: CommListener<any> = {
    onMessage(obj: Message) {
        if (obj instanceof CheckBonusRes) {
            const code = obj.getResult().getCode();
            if (code !== MsgCode.SUCCESS) {
                // const key = commonMsgCodeToMsgKey(code);
                // const msg = translateError(key, code);
                // const main = getMain();
                // main.getToast().show(msg);
                log('CheckBonusRes', code);
                return;
            }
        } else if (obj instanceof BonusInfoRes) {
            const code = obj.getResult().getCode();
            if (code !== MsgCode.SUCCESS) {
                clearTimeout(bonusSendingTimeoutID);
                setBonusSending(false);
                setBonusIdle(true);
                const main = getMain();
                main.toggleLoading(false);
                log('BonusInfoRes', code);
                const key = commonMsgCodeToMsgKey(code);
                const msg = translateError(key, code);
                main.getToast().show(msg);
                emitBonusMessage(obj);
                return;
            }
        } else if (obj instanceof BetBonusRes) {
            const code = obj.getResult().getCode();
            if (code !== MsgCode.SUCCESS) {
                const main = getMain();
                const key = commonMsgCodeToMsgKey(code);
                if (bonusIsOpen) {
                    let msg = translate(key);
                    if (code === MsgCode.GAME_AMOUNT_NOT_ENOUGH) {
                        msg = translate('GAME.sysm_if_bal_bet_bonus');
                    }
                    postBonusEventAlert({ msg, code });
                } else {
                    let msg = translateError(key, code);
                    if (code === MsgCode.GAME_AMOUNT_NOT_ENOUGH) {
                        msg = translate('GAME.sysm_if_bal_bet_bonus') + '(' + code + ')';
                    }
                    main.getToast().show(msg);
                }
                setBonusSending(false);
                setBonusIdle(true);
                main.toggleLoading(false);
                if (isBEvenInfoTemplate() || getIsBonusAutoPrize()) {
                    setBonusAutoPrizeDeltaTime(-5); // 因餘額不足無法提領紅包，延後N秒後再執行一次自動領取。
                    setIsPlayingBonusAutoPrizeAnim(false);
                }
                emitBonusMessage(obj);
                return;
            }
        }
        if (obj instanceof CheckBonusRes) {
            eventInfoList = obj.getEventsList();
            bonusEventCount = obj.getCount();
            bonusActivityState.updateState(obj);
            const bEvenList = obj.getEventsList().filter((ei) => ei.getTemplate()[0] === 'B');
            postBonusEvent('eventInfos', bEvenList.map((ei) => ei.toObject()));
            emitBonusMessage(obj);
            if (bEvenList.length > 0) {
                openFirstInfo();
            } else {
                setBonusIdle(true);
            }
        } else if (obj instanceof BonusInfoRes) {
            if (obj.getEventsList().filter((ei) => ei.getTemplate()[0] === 'B').length > 0) {
                return;
            }
            eventInfoListHasAmount = obj.getEventsList();
            if (!getBonusSending()) {
                return;
            }
            clearTimeout(bonusSendingTimeoutID);
            setBonusSending(false);
            postBonusEventInfoOpen(getMusicSoundData());
            emitBonusMessage(obj);
        } else if (obj instanceof BetBonusRes) {
            setBonusSending(false);
            bonusEventCount = obj.getLastCount();
            bonusActivityState.updateRedCount(obj);
            if (obj.getBonus().getTemplate()[0] === 'B') {
                postBonusEvent('award', obj.getBonus().toObject());
                emitBonusMessage(obj);
                orgAudioEnabled = audioEnabled();
                audioEnable(false);
                director.pause();
                return;
            }
            if (getIsBonusAutoPrize() && !getBonusHasOpenPage()) {// 自動就直接播放
                emitBonusMessage(obj);
                return;
            }
            const bonusEvent = obj.getBonus();
            bonusEventsList.set(bonusEvent.getId(), bonusEvent);
            if (!getBonusIsOpen()) {
                setBonusIsOpen(true);
                postBonusEventOpen(getMusicSoundData());
                emitBonusMessage(obj);
                orgAudioEnabled = audioEnabled();
                audioEnable(false);
                return;
            }
            const data = {
                count: bonusEventCount,
                bonusEvents: [],
            };
            bonusEventsList.forEach((value, key) => {
                data.bonusEvents.push(value.toObject());
            });
            postBonusEventInfo(data);
            emitBonusMessage(obj);
        } else if (obj instanceof WebViewMessage) {
            if (obj.method === BONUS_ENUM.BONUS_EVENT_OUT_GAME) {
                const main = getMain();
                if (EXTRA_1110) {
                    main.offline(translateError('NETWORK.sys_net_error2', -1), -1, false);
                } else {
                    main.offline(translateError('NETWORK.sys_disconnected', -1), -1, false);
                }
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_PAGE_LOAD) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_PAGE_LOAD);
                const data = {
                    count: bonusEventCount,
                    bonusEvents: [],
                };
                bonusEventsList.forEach((value, key) => {
                    data.bonusEvents.push(value.toObject());
                });
                postBonusEventInfo(data);
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_INFO_PAGE_LOAD) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_INFO_PAGE_LOAD);
                const bonusAutoPrize = getIsBonusAutoPrize() ? '1' : '0' ;
                const bonusInfoFirstOpenDoNotShowAgain = getIsBonusInfoFirstOpenDoNotShowAgain() ? '1' : '0' ;
                const data = eventInfoListHasAmount.map(value => value.toObject());
                postBonusEventInfo(data, bonusAutoPrize, bonusInfoFirstOpenDoNotShowAgain);
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_FINISH) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_FINISH);
                const id = obj.data.id;
                bonusEventsList.delete(id);
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_ONE_AUTO_PRIZE_FINISH) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_ONE_AUTO_PRIZE_FINISH);
                if (isBEvenInfoTemplate()) {
                    director.resume();
                    audioEnable(orgAudioEnabled);
                    setBonusIdle(true);
                    setIsPlayingBonusAutoPrizeAnim(false);
                    setBonusAutoPrizeDeltaTime(0);
                }
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_NEXT) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_NEXT);
                setBonusSending(true);
                setBonusIdle(false);
                bonusReqBetBonus();
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_PAGE_CLOSE) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_PAGE_CLOSE);
                setBonusHasOpenPage(false);
                setBonusIsOpen(false);
                const main = getMain();
                main.toggleLoading(false);
                audioEnable(orgAudioEnabled);
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_INFO_PAGE_CLOSE) {
                log('@@@bonus', BONUS_ENUM.BONUS_EVENT_INFO_PAGE_CLOSE);
                setBonusHasOpenPage(false);
                setBonusIsOpen(false);
                const main = getMain();
                main.toggleLoading(false);
                toggleBonusAutoPrize(obj.data && obj.data.bonusAutoPrize === '1' ? true : false);
                toggleBonusInfoFirstOpenDoNotShowAgain(obj.data && obj.data.bonusInfoFirstOpenDoNotShowAgain === '1' ? true : false);
            }
            emitBonusMessage(obj);
        }
    },
};

let loaded: boolean = false;

window.addEventListener('message', windowOnMessage, false);

export type BonusMessageType = CheckBonusRes | BonusInfoRes | BetBonusRes | WebViewMessage | GameIdleMessage | BonusIdleMessage | BonusInfoTimeout;

export interface BonusListener {
    onBonusMessage(obj: BonusMessageType): void;
}

const bonusListeners: BonusListener[] = [];
export function registerBonusMessage(listener: BonusListener) {
    if (!loaded) {
        const comm = getCommBase();
        comm.registListener(listenTo, obj);
        loaded = true;
    }
    bonusListeners.push(listener);
}

export function unregisterBonusMessage(listener: BonusListener) {
    arraySplice(bonusListeners, listener);
}

export function emitBonusMessage(obj: BonusMessageType) {
    const l = bonusListeners.length;
    try {
        for (let i = 0; i < l; i += 1) {
            const listener = bonusListeners[i];
            // @ts-ignore
            if (listener && listener.isValid) {
                listener.onBonusMessage(obj);
            }
        }
    } catch (e) {
        error(e);
    }
}

export function getCommBase() {
    const node = find('Game');
    if (!node) {
        error('Node not found');
        return;
    }
    const comm = node.getComponent(CommunicationBase);
    if (!comm) {
        error('CommBase not found');
        return;
    }
    return comm;
}

export function bonusReqCheckBonus() {
    if (!isLogin(getCommBase().loginState)) {
        return;
    }
    bonusFirstSendFinish();
    getCommBase().requestCheckBonus();
}

export function bonusReqBonusInfo() {
    if (!isLogin(getCommBase().loginState)) {
        return;
    }
    getCommBase().requestBonusInfo();
}

export function bonusReqBetBonus(toggleLoading:boolean = true) {
    if (!isLogin(getCommBase().loginState)) {
        return;
    }
    getCommBase().requestBetBonus(toggleLoading);
}

function getMain(): IMain {
    const node = find('Game');
    if (!node) {
        error('Node not found');
        return;
    }
    const main = node.getComponent('MainBase');
    if (!main) {
        error('MainBase not found');
        return;
    }
    // @ts-ignore
    return main;
}

let bonusIsOpen: boolean = false;
let bonusFirstSend: boolean = true;
let eventInfoList: EventInfo[] = []; // 無流水 遊戲前端使用
let eventInfoListHasAmount: EventInfo[] = []; // 有流水 系統前端使用
let gameIdle: boolean = true;
let bonusIdle: boolean = true;
let bonusSending: boolean = false;
let bonusEventCount: number = 0;
let bonusSendingTimeoutID:number = 0;
const bonusEventsList: Map<string, BonusEvent> = new Map<string, BonusEvent>();
/**
 * 開啟紅包時，要在停音樂遊戲音效。
 * 這邊暫存原始音效啟用狀態，以恢復使用。
 */
let orgAudioEnabled:boolean = false;

/**
 * 是否啟用自動領取紅包
 */
let bonusAutoPrize:boolean = false;
/**
 * 是否進遊戲開啟活動說明頁面
 */
let bonusInfoFirstOpenDoNotShowAgain:boolean = false;
/**
 * 是否正在播放領紅包
 */
let isPlayingBonusAutoPrizeAnim:boolean = false;
/**
 * 起始頁面是否關閉
 */
let isStartPageClose:boolean = false;
/**
 * 是否已經開啟過第一次活動說明頁面
 */
const hasBonusFirstOpenInfo:boolean = false;
/**
 * 是否已經開啟過第一次活動說明頁面 Template BXXX
 */
let hasBonusFirstOpenInfoB: boolean = false;
/**
 * 是否開啟紅包頁面、
 */
let hasBonusOpenPage:boolean = false;
let bonusAutoPrizeDeltaTime:number = 0;

/**
 * slot 特殊模式中，暫時不自動領取紅包
 */
let isBonusHangOnAutoPrize:boolean = false;

export function bonusIsFirstSend() {
    return bonusFirstSend;
}

export function bonusFirstSendFinish() {
    bonusFirstSend = false;
}

export function setBonusIsOpen(value) {
    bonusIsOpen = value;
}

export function getBonusIsOpen() {
    return bonusIsOpen;
}

export function setGameIdle(idle: boolean) {
    if (gameIdle === idle) {
        return;
    }
    gameIdle = idle;
    emitBonusMessage(new GameIdleMessage(idle));
}
export function getGameIdle() {
    return gameIdle;
}

export function setBonusIdle(idle: boolean) {
    if (bonusIdle === idle) {
        return;
    }
    bonusIdle = idle;
    emitBonusMessage(new BonusIdleMessage(idle));
}
export function getBonusIdle() {
    return bonusIdle;
}

export function setBonusSending(able: boolean) {
    bonusSending = able;
}
export function getBonusSending() {
    return bonusSending;
}

export function getBonusEventCount(): number {
    return bonusEventCount + bonusEventsList.size;
}

export function getBonusEventInfoList(): EventInfo[] {
    return eventInfoList;
}

export function getBonusEventInfoCount(): number {
    return eventInfoList.length;
}

export function setBonusSendingTimeoutID(id: number) {
    bonusSendingTimeoutID = id;
}

export class GameIdleMessage {
    constructor(
        public isIdle: boolean,
    ) {

    }
}

export class BonusIdleMessage {
    constructor(
        public isIdle: boolean,
    ) {

    }
}

export class BonusInfoTimeout {

}

export class BonusEventActivityState{

    startActivityCount: number; // 已開始活動的數量。
    finalActivityCount:number;  // 已下架活動數量，超過此時間無法領獎，應該不會顯示活動。
    redCount:number; // 紅包數量。
    hasEventInfos: boolean = false;

    public updateState(obj: CheckBonusRes) {

        this.startActivityCount = 0;
        this.finalActivityCount = 0;

        obj.getEventsList().forEach((ei) => {

            if (ei.getState() === BonusState.FINISH) {// 這活動已經不能領獎。
                this.finalActivityCount += 1;
                return;
            }

            if (ei.getState() === BonusState.START) {
                this.startActivityCount += 1;
                return;
            }
        });

        this.redCount = obj.getCount();
        this.hasEventInfos = obj.getEventsList().length > 0;
    }

    public updateRedCount(obj:BetBonusRes) {
        this.redCount = obj.getLastCount();
    }
}

export class BonusEventUILastStateData {
    spineIsAnim:boolean = false;
    redCount:number = 0;
}
const bonusActivityState:BonusEventActivityState = new BonusEventActivityState();
const bonusLastStateData:BonusEventUILastStateData = new BonusEventUILastStateData() ;

export function getBonusActivityState():BonusEventActivityState {
    return bonusActivityState;
}

export function getLastAnimStateData():BonusEventUILastStateData {
    return bonusLastStateData;
}

export function setLastAnimStateData(spineIsAnim:boolean, redCount:number) {
    bonusLastStateData.spineIsAnim = spineIsAnim;
    bonusLastStateData.redCount = redCount;
}

export function getMusicSoundData() {
    const aEnable = audioEnabled(); // 魚機、街機
    const m = aEnable ?  '1' : '0';
    const s = aEnable ?  '1' : '0';
    return  { m, s };
}

export function setBonusSendingTimeout() {
    const timeoutID = setTimeout(() => {
        const main = getMain();
        const msg = translateError('GAME.bonus_info_timeout', -1);
        main.toggleLoading(false);
        main.getToast().show(msg);

        setBonusSending(false);
        setBonusIdle(true);
        emitBonusMessage(new BonusInfoTimeout());
    },                           1e3 * 5);
    setBonusSendingTimeoutID(timeoutID);
}

export function bonusEventAudioPreload() {
    audioPreload('S999701_question_mark_button');
    audioPreload('S999702_click_red_envelope');
    audioPreload('S999703_enable_red_envelope');
    audioPreload('S999704_win_red_envelope');
    audioPreload('S999705_add_red_envelope');
    audioPreload('S999712_tobalance_red_envelope');
    audioPreload('S999713_open_red_envelope');
}

export function getIsBonusAutoPrize() {
    return bonusAutoPrize;
}

export function isBEvenInfoTemplate() {
    if (eventInfoList.filter(ei => ei.getTemplate()[0] === 'B').length > 0) {
        return true;
    }
    return false;
}

export function hasGame() {
    let hasGame = false;
    eventInfoList.forEach((ei) => {
        if (ei.getGameIdsList().indexOf(GAME_ID) !== -1) {
            hasGame = true;
        }
    });
    return hasGame;
}

export function toggleBonusAutoPrize(able:boolean) {
    bonusAutoPrize = able;
    setBonusAutoPrize(able);
}

export function getIsBonusInfoFirstOpenDoNotShowAgain() {
    return bonusInfoFirstOpenDoNotShowAgain;
}

export function toggleBonusInfoFirstOpenDoNotShowAgain(able:boolean) {
    bonusInfoFirstOpenDoNotShowAgain = able;
    setBonusInfoFirstOpenDoNotShowAgain(able);
}

export function getIsPlayingBonusAutoPrizeAnim() {
    return isPlayingBonusAutoPrizeAnim;
}

export function setIsPlayingBonusAutoPrizeAnim(able:boolean) {
    isPlayingBonusAutoPrizeAnim = able;
}

export function getBonusHasFirstOpenInfo() {
    return hasBonusFirstOpenInfo;
}

export function getBonusHasFirstOpenInfoB() {
    return hasBonusFirstOpenInfoB;
}

/**
 * 起始頁關閉後
 * 需啟用開啟 openFirstInfo
 */
export function setBonusEventIsStartPageClose() {
    isStartPageClose = true;
    openFirstInfo();
}

/**
 * 若有活動，自動開啟活動說明頁面
 */
function openFirstInfo() {
    // if (isBEvenInfoTemplate()) {
    if (!getBonusHasFirstOpenInfoB() && isStartPageClose && getBonusActivityState().hasEventInfos) {
        hasBonusFirstOpenInfoB = true;
        setBonusHasOpenPage(true);
        setBonusIdle(false);
        postBonusEvent('eventOpen');
        return;
    }
    // } else {
    //     if (!getBonusHasFirstOpenInfo() && isStartPageClose && getBonusActivityState().hasEventInfos) {
    //         hasBonusFirstOpenInfo = true;
    //         if (getIsBonusInfoFirstOpenDoNotShowAgain()) {
    //             return;
    //         }
    //         setBonusHasOpenPage(true);
    //         setBonusSendingTimeout();
    //         setBonusSending(true);
    //         setBonusIdle(false);
    //         bonusReqBonusInfo();
    //     }
    // }
}

export function getBonusHasOpenPage() {
    return hasBonusOpenPage;
}

export function setBonusHasOpenPage(able: boolean) {
    hasBonusOpenPage = able;
}

export function addBonusAutoPrizeDeltaTime(dt:number) {
    bonusAutoPrizeDeltaTime += dt;
}

export function setBonusAutoPrizeDeltaTime(value:number) {
    bonusAutoPrizeDeltaTime = value;
}

export function getBonusAutoPrizeDeltaTime() {
    return bonusAutoPrizeDeltaTime;
}

export class BonusAutoPrizeAnimData{
    public startAt:number = 0;
    public overAt:number = 0;
    public wins:string = '';
    public isPlaying:boolean = false;
}

const bonusAutoPrizeAnimData:BonusAutoPrizeAnimData = new BonusAutoPrizeAnimData();

export function setBonusAutoPrizeAnimData(now:number, wins:string) {
    bonusAutoPrizeAnimData.startAt = now;
    bonusAutoPrizeAnimData.overAt = now + (AUTO_RED_ANIM_TOTAL_TIME * 1e3);
    bonusAutoPrizeAnimData.wins = wins;
    bonusAutoPrizeAnimData.isPlaying = true;
}
export function getBonusAutoPrizeAnimData() {
    return bonusAutoPrizeAnimData;
}

export function clearBonusAutoPrizeAnim() {
    bonusAutoPrizeAnimData.startAt = 0;
    bonusAutoPrizeAnimData.overAt = 0;
    bonusAutoPrizeAnimData.wins = '';
    bonusAutoPrizeAnimData.isPlaying = false;
    setBonusAutoPrizeDeltaTime(0);
    setIsPlayingBonusAutoPrizeAnim(false);
}

export function setBonusHangOnAutoPrize(able:boolean) {
    isBonusHangOnAutoPrize = able;
}

export function getBonusHangOnAutoPrize() {
    return isBonusHangOnAutoPrize;
}

export function postBonusEvent(key: string, data?: any) {
    const { m, s } = getMusicSoundData();
    postMessage(key, m, s, data);
}

function postMessage(method: string, m: string, s: string, data: any = null) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data: { method, data, m, s }, method: 'bonusEvent' }), '*');
    }
}
