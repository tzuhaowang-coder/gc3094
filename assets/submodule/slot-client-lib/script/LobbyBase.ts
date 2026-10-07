
import { Color, Component, EventKeyboard, Game, Graphics, Input, KeyCode, Label, Node, Tween, UIOpacity, _decorator, game, input, macro, tween } from 'cc';
import { DEBUG, DEV } from 'cc/env';
import { BONUS_ENUM, BonusListener, BonusMessageType, getBonusIdle, postBonusEvent, registerBonusMessage, setBonusEventIsStartPageClose, setBonusHangOnAutoPrize, setBonusIdle, setGameIdle } from '../../game-client-lib/BonusEventGlobal';
import { getCurrencyISO, getCurrencyPrefix, getCurrencyPrefix2, getCurrencySuffix, setCurrencyCode } from '../../game-client-lib/CurrencyGlobal';
import { AlertOpt, TOAST2_KEY, TOAST2_PRIORITY, htmlControlAlerted, htmlControlHideAlert, htmlControlHideToast2, htmlControlRegister, htmlControlShowAlert, htmlControlShowToast2 } from '../../game-client-lib/HtmlControlGlobal';
import { translate, translateError } from '../../game-client-lib/I18nGlobal';
import { backToLobby, getIsLoginFromLobby, getParentInnerWHRatio, hasWindowParent, hideDraLoading, reportClick } from '../../game-client-lib/IframeGlobal';
import { applyLabel } from '../../game-client-lib/LabelGlobal';
import { ILobby, globalDebugNNN, pad2 } from '../../game-client-lib/LibGlobal';
import { BACK_URL, BTN_RECORD, EXTRA_1010, EXTRA_1020_DEFAULT, EXTRA_1020_SETTING, EXTRA_1030, EXTRA_1080, EXTRA_1090, EXTRA_1100, EXTRA_1110, IS_GUEST, getDebugParams } from '../../game-client-lib/ParamsGlobal';
import { resumeTick } from '../../game-client-lib/ResumeGlobal';
import { SKILL_CARD_LOG, getSkillCardManager, skillCardLog } from '../../game-client-lib/SkillCardGlobal';
import { STORAGE_KEY, ZERO_TEMPLATE, applyLocalStorageToCommonUIData, genLocalStorage, getStartPage, setAudioEnable, setEffectEnable, setMusicEnable } from '../../game-client-lib/StorageGlobal';
import { ClickType } from '../../game-client-lib/analytics/AnalyticsTypes';
import { audioDefaultButtonAudioName, audioEnabled, audioPlay, buttonAudioPlay } from '../../game-client-lib/component/Audio';
import { getLang } from '../../game-client-lib/component/I18nManager';
import { LoginState } from '../../game-client-lib/data/LoginState';
import FeatureBuyData, { FeatureBuyInfo2 } from '../../game-client-lib/featurebuy/FeatureBuyData';
import { MemberServiceBaseKey } from '../../game-client-lib/protobuf/MemberServiceBase';
import { AuthRes, BetBonusRes, CheckBonusRes, HeartbeatRes, KickRes, MsgCode, Result, ResumeRes, UpdateBalanceRes, UserInfoRes } from '../../game-client-lib/protobuf/ProtobufWarp';
import { SkillCardType } from '../../game-client-lib/protobuf/SkillCardProto';
import PromiseManager2, { PROMISE_EXECUTOR2_GROUP, PromiseExecutor2 } from '../../game-client-lib/script/PromiseManager2';
import { WebViewMessage } from '../../game-client-lib/script/WebViewGlobal';
import { BIG_WIN_LEVEL, BigWinConfig, getBigWinLevel } from '../../game-client-lib/ui/BigWinBase';
import { BET_LEVEL_ACTION } from '../../game-client-lib/ui/CommonUI';
import CommonUIData from '../../game-client-lib/ui/CommonUIData';
import ForegroundBase from '../../game-client-lib/ui/ForegroundBase';
import MessageMarqueeBase from '../../game-client-lib/ui/MessageMarqueeBase';
import UIBase from '../../game-client-lib/ui/UIBase';
import UIDataBase from '../../game-client-lib/ui/UIDataBase';
import { Balance, balance, balanceNumber, balanceSub, fixAmountNumber, fixThousandth2, safeMul, setBalanceDecimal, setReplaceByMK, setTrimRightZero } from '../../game-client-lib/utils/Balance';
import BalanceData from '../../game-client-lib/utils/BalanceData';
import BalanceManager from '../../game-client-lib/utils/BalanceManager';
import CommListener from '../../game-client-lib/utils/CommListener';
import { INFINITY_MARK, flattenDeep, isNone, log, random, range2, setFrameRate, setNodeAnchor, setNodeContentSize, setNodePosition, setTickSpeed, sumReducer, warn } from '../../game-client-lib/utils/Utils';
import { ISlotPuzzle, autoTable, handleError, handleKick } from '../SlotGlobal';
import { getTempo2ConfigString, getTempo3ConfigString, getTempoConfigString } from '../SlotTempoGlobal';
import { GameServiceKey } from '../protobuf/GameService';
import { FeatureBuyInfo, InMachineRes, LineData, LineInfo, MachineInfo, RoundInfo, SpinData, SpinRes, SpinResult, SpinType, Symbol, SymbolType, WinType } from '../protobuf/ProtobufWarp';
import PuzzleBase, { applyTempoStringToPuzzle } from '../puzzle/PuzzleBase';
import PuzzleBase2, { applyTempoStringToPuzzle2 } from '../puzzle2/PuzzleBase2';
import { ISkillCardLobby, SkillCardSlotManager, SkillCardSlotPlayer, attachSlotSkillCard, detachSlotSkillCard, skillCardRoundsText } from '../skillcard/SkillCardSlot';
import SlotBase, { applyTempoStringToSlot, symbolReducerCreator } from '../slot/SlotBase';
import SlotPayLine, { SlotPayLineOdds } from '../slot/SlotPayLine';
import { SlotReelSymbol, extractSymbolType } from '../slot/SlotReel';
import { IResult } from '../slot/SlotResultBase';
import { StripData, StripGenerator } from '../slot/StripManager';
import { analyticsClick, analyticsPing, analyticsSpin, getIsFirstSpin, setAnalyticsShowDataInit, setIsFirstSpin } from './Analytics';
import Communication3XXX from './Communication3XXX';
import DebugConditionView from './DebugConditionView';
import MainBase from './MainBase';

const { ccclass, property } = _decorator;

const SLOT_FRAME_RATE = 120;

export function isSpecialGame(spinType: SpinType) {
    if (isSpinNormal(spinType)) {
        return false;
    } else if (isSpinFeatureBuyNormal(spinType)) {
        return false;
    } else {
        return true;
    }
}

/**
 * 給爬蟲用
 */
export function logSymbols(sr: SpinResult) {

    const sep1 = ',';
    const sep2 = ';';
    const str = sr.getRoundInfosList().map((ri) => {
        // 有 next 就用 next
        let ss = ri.getNextList();
        if (!ss || !ss.length) {
            ss = ri.getSymbolsList();
        }
        return ss.sort(symbolSort).map(s => s.getSymbolType()).join(sep1);
    }).join(sep2);

    log('spinResult symbols', str);
}

/**
 * 小至大
 */
export function symbolSort(a: Symbol, b: Symbol) {
    return a.getX() === b.getX() ? a.getY() - b.getY() : a.getX() - b.getX();
}

export function hasWinLine(lines: LineInfo[]): boolean {
    return lines.findIndex((li) => {
        return li.getWin() > 0;
    }) !== -1;
}

export function hasFreeLine(lines: LineInfo[]): boolean {
    return lines.findIndex((line) => {
        return line.getType() === WinType.WIN_FREE;
    }) !== -1;
}

export function isAddFreeRound(ri: RoundInfo, prevRi: RoundInfo): boolean {
    return ri.getRemainingRound() >= prevRi.getRemainingRound();
}

export function hasBonusLine(lines: LineInfo[]): boolean {
    return lines.findIndex((line) => {
        return line.getType() === WinType.WIN_BONUS;
    }) !== -1;
}

export function sumTotalWins(roundInfos: RoundInfo[], start?: number, end?: number) {
    const tws = roundInfos.map(i => i.getTotalwin());
    return tws.slice(start, end).reduce(sumReducer, 0);
}

export function sumSpinTypeWins(roundInfos: RoundInfo[], type: SpinType, start?: number, end?: number) {
    return roundInfos
        .slice(start, end)
        .filter(i => i.getSpinType() === type)
        .map(i => i.getTotalwin())
        .reduce(sumReducer, 0);
}

export function sumSpinTypesWins(roundInfos: RoundInfo[], types: SpinType[], start?: number, end?: number) {
    return types
        .map(t => sumSpinTypeWins(roundInfos, t, start, end))
        .reduce(sumReducer, 0);
}

export function sumLineTypeWins(roundInfos: RoundInfo[], type: WinType, start?: number, end?: number) {
    const ls = roundInfos.map(ri => ri.getLinesList());
    const ll = flattenDeep(ls.slice(start, end));
    return ll.filter(l => l.getType() === type).map(l => l.getWin()).reduce(sumReducer, 0);
}

export function sumSpinTypeLineTypeWins(roundInfos: RoundInfo[], spinTypes: SpinType[], type: WinType, start?: number, end?: number) {
    const rs = roundInfos.filter(i => spinTypes.indexOf(i.getSpinType()) !== -1).slice(start, end);
    const ls = flattenDeep(rs.map(ri => ri.getLinesList()));
    return ls.filter(l => l.getType() === type).map(l => l.getWin()).reduce(sumReducer, 0);
}

export function isSpinNormal(spinType: SpinType): boolean {
    switch (spinType) {
    case SpinType.NORMALGAME:
    case SpinType.NORMALGAME_2:
    case SpinType.NORMALGAME_3:
    case SpinType.NORMALGAME_4:
    case SpinType.NORMALGAME_5:
    case SpinType.NORMALGAME_6:
    case SpinType.NORMALGAME_7:
    case SpinType.NORMALGAME_8:
    case SpinType.NORMALGAME_9:
    case SpinType.NORMALGAME_10:
    case SpinType.NORMALGAME_11:
    case SpinType.NORMALGAME_12:
    case SpinType.NORMALGAME_13:
    case SpinType.NORMALGAME_14:
    case SpinType.NORMALGAME_15:
    case SpinType.NORMALGAME_16:
    case SpinType.NORMALGAME_17:
    case SpinType.NORMALGAME_18:
    case SpinType.NORMALGAME_19:
    case SpinType.NORMALGAME_20:
    case SpinType.NORMALGAME_21:
    case SpinType.NORMALGAME_22:
    case SpinType.NORMALGAME_23:
    case SpinType.NORMALGAME_24:
    case SpinType.NORMALGAME_25:
    case SpinType.NORMALGAME_26:
    case SpinType.NORMALGAME_27:
    case SpinType.NORMALGAME_28:
    case SpinType.NORMALGAME_29:
    case SpinType.NORMALGAME_30:
    case SpinType.NORMALGAME_31:
    case SpinType.NORMALGAME_32:
    case SpinType.NORMALGAME_33:
    case SpinType.NORMALGAME_34:
    case SpinType.NORMALGAME_35:
    case SpinType.NORMALGAME_36:
    case SpinType.NORMALGAME_37:
    case SpinType.NORMALGAME_38:
    case SpinType.NORMALGAME_39:
    case SpinType.NORMALGAME_40:
    case SpinType.NORMALGAME_41:
    case SpinType.NORMALGAME_42:
    case SpinType.NORMALGAME_43:
    case SpinType.NORMALGAME_44:
    case SpinType.NORMALGAME_45:
    case SpinType.NORMALGAME_46:
    case SpinType.NORMALGAME_47:
    case SpinType.NORMALGAME_48:
    case SpinType.NORMALGAME_49:
    case SpinType.NORMALGAME_50:
        return true;
    default:
        return false;
    }
}

export function isSpinFeatureBuyNormal(spinType: SpinType): boolean {
    switch (spinType) {
    case SpinType.FEATUREBUY_NORMALGAME:
    case SpinType.FEATUREBUY_NORMALGAME_2:
    case SpinType.FEATUREBUY_NORMALGAME_3:
    case SpinType.FEATUREBUY_NORMALGAME_4:
    case SpinType.FEATUREBUY_NORMALGAME_5:
    case SpinType.FEATUREBUY_NORMALGAME_6:
    case SpinType.FEATUREBUY_NORMALGAME_7:
    case SpinType.FEATUREBUY_NORMALGAME_8:
    case SpinType.FEATUREBUY_NORMALGAME_9:
    case SpinType.FEATUREBUY_NORMALGAME_10:
    case SpinType.FEATUREBUY_NORMALGAME_11:
    case SpinType.FEATUREBUY_NORMALGAME_12:
    case SpinType.FEATUREBUY_NORMALGAME_13:
    case SpinType.FEATUREBUY_NORMALGAME_14:
    case SpinType.FEATUREBUY_NORMALGAME_15:
    case SpinType.FEATUREBUY_NORMALGAME_16:
    case SpinType.FEATUREBUY_NORMALGAME_17:
    case SpinType.FEATUREBUY_NORMALGAME_18:
    case SpinType.FEATUREBUY_NORMALGAME_19:
    case SpinType.FEATUREBUY_NORMALGAME_20:
    case SpinType.FEATUREBUY_NORMALGAME_21:
    case SpinType.FEATUREBUY_NORMALGAME_22:
    case SpinType.FEATUREBUY_NORMALGAME_23:
    case SpinType.FEATUREBUY_NORMALGAME_24:
    case SpinType.FEATUREBUY_NORMALGAME_25:
    case SpinType.FEATUREBUY_NORMALGAME_26:
    case SpinType.FEATUREBUY_NORMALGAME_27:
    case SpinType.FEATUREBUY_NORMALGAME_28:
    case SpinType.FEATUREBUY_NORMALGAME_29:
    case SpinType.FEATUREBUY_NORMALGAME_30:
    case SpinType.FEATUREBUY_NORMALGAME_31:
    case SpinType.FEATUREBUY_NORMALGAME_32:
    case SpinType.FEATUREBUY_NORMALGAME_33:
    case SpinType.FEATUREBUY_NORMALGAME_34:
    case SpinType.FEATUREBUY_NORMALGAME_35:
    case SpinType.FEATUREBUY_NORMALGAME_36:
    case SpinType.FEATUREBUY_NORMALGAME_37:
    case SpinType.FEATUREBUY_NORMALGAME_38:
    case SpinType.FEATUREBUY_NORMALGAME_39:
    case SpinType.FEATUREBUY_NORMALGAME_40:
    case SpinType.FEATUREBUY_NORMALGAME_41:
    case SpinType.FEATUREBUY_NORMALGAME_42:
    case SpinType.FEATUREBUY_NORMALGAME_43:
    case SpinType.FEATUREBUY_NORMALGAME_44:
    case SpinType.FEATUREBUY_NORMALGAME_45:
    case SpinType.FEATUREBUY_NORMALGAME_46:
    case SpinType.FEATUREBUY_NORMALGAME_47:
    case SpinType.FEATUREBUY_NORMALGAME_48:
    case SpinType.FEATUREBUY_NORMALGAME_49:
    case SpinType.FEATUREBUY_NORMALGAME_50:
        return true;
    default:
        return false;
    }
}

export function fillMap<T>(map: T[][], maxSize: [number, number], each: number[] = []) {
    const lx = maxSize[0];
    const ly = maxSize[1];
    const map2: T[][] = [];
    for (let x = 0; x < lx; x += 1) {
        const oldm = map[x];
        const lly = each[x] ? each[x] : ly;
        if (!oldm) {
            const tmp = range2(lly).fill(undefined);
            // @ts-ignore
            map2[x] = tmp;
        } else {
            map2[x] = [];
            for (let y = 0; y < lly; y += 1) {
                const o = oldm[y];
                if (isNone(o)) {
                    map2[x][y] = undefined;
                } else {
                    map2[x][y] = o;
                }
            }
        }
    }
    return map2;
}

export function fillMapReverse<T>(map: T[][], size: [number, number], each: number[] = []) {
    return fillMap(map, size, each).map(m => m.reverse());
}

// /**
//  * 左下為 (0, 0)
//  * @param symbolList
//  * @param lengthOrLengthArray eg. 3001 可以是 3 或 [3, 3, 3, 3, 3]、3019 是 [3, 4, 5, 4, 3]、3018 是 [2, 2, 4, 4, 4]
//  */
// export function symbolListToMap(symbolList: Symbol[], lengthOrLengthArray: number | number[]) {
//     const reducer = symbolReducerCreator(lengthOrLengthArray);
//     return symbolList.reduce(reducer, []);
// }

/**
 * 左下為 (0, 0)
 * @param symbolList
 * @param size
 */
export function symbolListToMapBySize(symbolList: Symbol[], size: [number, number], each: number[] = []) {
    const reducer = symbolReducerCreator(each.length ? each : size[1]);
    return fillMap(symbolList.reduce(reducer, []), size, each);
}

export function getMapSize(symbolList: Symbol[]): [number, number] {
    const mm = getMinMax(symbolList);
    const m = mm.max;
    return [m[0] + 1, m[1] + 1];
}

export function getMinMax(symbolList: Symbol[]): { min: [number, number], max: [number, number] } {
    // if (!symbolList.length){
    //     return {max: [0,0], min:[0,0]}
    // }
    const arrX = symbolList.map(s => s.getX());
    const arrY = symbolList.map(s => s.getY());
    const maxF = (arr: number[]) => Math.max.apply(null, arr);
    const minF = (arr: number[]) => Math.min.apply(null, arr);
    return {
        max: [maxF(arrX), maxF(arrY)],
        min: [minF(arrX), minF(arrY)],
    };
}

export function typeToOddsArray(machineInfo: MachineInfo, type: string, betBase: number): SlotPayLineOdds[] {
    const t = extractSymbolType(type);
    const list = machineInfo.getOddTableList()[0].getOddsList();
    if (!list) {
        return [];
    }
    const odds = list.find(l => l.getSymbol() === t).getOddList();
    return odds.map((odds, count): SlotPayLineOdds => {
        return {
            betBase,
            odds,
            count: count + 1,
            wins: '',
        };
    }).filter(o => o.odds);
}

export enum DO_SPIN_STAT {
    /**
     * 送出後
     */
    REQUEST = 0,
    /**
     * 收到 spinResult
     */
    OK = 1,
    /**
     * 失敗
     */
    FAIL = 2,
    FAIL_IF_BALANCE = 3,

    /**
     * 按鈕音效
     */
    BUTTON_AUDIO = 101,
}

export enum DO_STOP_STAT {

    /**
     * 按鈕音效
     */
    BUTTON_AUDIO = 101,
}

const listenTo = [
    MemberServiceBaseKey.AccountAuthRes,
    MemberServiceBaseKey.GameResumeRes,
    MemberServiceBaseKey.AccountUserInfoRes,
    MemberServiceBaseKey.GameKickRes,
    MemberServiceBaseKey.GameHeartbeatRes,
    MemberServiceBaseKey.AccountUpdateBalanceRes,
    MemberServiceBaseKey.CheckBonusRes,
    MemberServiceBaseKey.BetBonusRes,
    GameServiceKey.InMachineRes,
    GameServiceKey.SpinRes,
];

export function genStrips(machineInfo: MachineInfo, generator?: StripGenerator, reverse: boolean = false) {
    return (key: string, spinType: number, fill: number = 0): StripData[] => {
        const stripInfo = machineInfo.getStripInfoList().find(info => info.getSpinType() === spinType);
        if (!stripInfo) {
            return [];
        }

        const showReel = stripInfo.getShowReel();

        const stripTable = machineInfo.getStripTableList().find(table => table.getShowReel() === showReel);
        if (!stripTable) {
            return [];
        }

        const rollsList = stripTable.getRollsList();

        if (fill) {
            let symbols = rollsList[0].getSymbolsList();
            if (reverse) {
                symbols = symbols.slice(0).reverse();
            }
            return range2(fill).map((i) => {
                const k = key + '_' + i;
                return new StripData(k, symbols.map(s => '' + s), random(20), generator);
            });
        } else {
            return rollsList.sort((a, b) => {
                return a.getName().localeCompare(b.getName());
            }).map((r, i) => {
                const k = key + '_' + i;
                let strip = r.getSymbolsList();
                if (reverse) {
                    strip = strip.slice(0).reverse();
                }
                return new StripData(k, strip.map(s => '' + s), random(20), generator);
            });
        }
    };
}

export function genStripTemplate(key: string, symbols: SymbolType[], fill: number): StripData[] {
    return range2(fill).map((i) => {
        const k = key + '_' + i;
        const strip = symbols;
        return new StripData(k, strip.map(s => '' + s), random(20));
    });
}

export function genLines(mi: MachineInfo, key: string = ''): number[][] {
    const ll = mi.getLineTableList();
    if (ll.length) {
        const reducer = (arr: number[][], l: LineData): number[][] => {
            const id = Number(l.getName()); // line id
            arr[id] = l.getLineList();
            return arr;
        };
        if (key) {
            const l = ll.find(l => l.getName() === key);
            return l.getLinesList().reduce(reducer, []);
        } else {
            return ll[0].getLinesList().reduce(reducer, []);
        }
    }

    // 沒有 line table
    // 為 way game
    // 找滾輪表有幾軸
    const stl = mi.getStripTableList();
    if (stl && stl[0]) {
        const l = stl[0].getRollsList().length;
        return [undefined, range2(l).map(_ => 0)];
    }

    // 沒有 line table 也沒有 strip table
    // 可能為開發中或未知情況
    // 預設 5 軸
    return [undefined, [0, 0, 0, 0, 0]];

}

export interface DebugCondition {
    /*
     * debug?= 的值
     */
    key: string;
    /**
     * 說明
     */
    msg: string;
    /**
     * 測試方法，沒有 pako 及 pako2 時使用
     */
    test?: (key: string, ng: RoundInfo, xgs: RoundInfo[], sd: SpinData) => boolean;
    /**
     * 壓縮的 pako，最優先
     */
    pako?: string;
    /**
     * 未壓縮的 pako，次優先
     */
    pako2?: string;
    /**
     * 給非 =list 時使用，是否只進入一次，用於兩段下注時，如 3012
     */
    once?: boolean;
    occurred?: boolean;
    featurebuy?: string;
    /**
     * DebugConditionView 分頁分組編號，未填預設 0
     */
    group?: number;
}

/**
 * 產生「分頁內互不干涉」的唯一 key：以 group 為前綴（未填視為 0），
 * 同 group 內重複 key 再加序號後綴。例：'1::pako2_example'、'1::pako2_example#2'。
 * DebugConditionView 與 LobbyBase 共用此演算法，確保點擊存入的字串與解析時一致。
 */
export function debugUniqueKey(conditions: DebugCondition[], index: number): string {
    const target = conditions[index];
    const group = target.group ?? 0;
    let seen = 0;
    for (let i = 0; i <= index; i += 1) {
        const c = conditions[i];
        if ((c.group ?? 0) === group && c.key === target.key) {
            seen += 1;
        }
    }
    return `${group}::${target.key}${seen > 1 ? `#${seen}` : ''}`;
}

export let fgDebugCondition: DebugCondition = { key: 'fg', msg: '進 FG', test: (key, ng, xgs) => xgs.filter(ri => hasFreeLine(ri.getLinesList())).length >= 1, once: true };
export let fgFgDebugCondition: DebugCondition = { key: 'fg_fg', msg: '進 FG 觸發 FG', test: (key, ng, xgs) => xgs.filter(ri => hasFreeLine(ri.getLinesList())).length >= 2, once: true };
export let bwDebugCondition: DebugCondition = { key: 'bw', msg: 'Big Win', test: (key, ng, xgs, sd) => getBigWinLevel(sd.getTotalbet(), xgs.map(g => g.getTotalwin()).reduce(sumReducer, 0)) !== '' };
export let ngBwDebugCondition: DebugCondition = { key: 'ng_bw', msg: 'NG Big Win', test: (key, ng, xgs, sd) => xgs.length === 1 && getBigWinLevel(sd.getTotalbet(), ng.getTotalwin()) !== '' };
export let megaWinDebugCondition: DebugCondition = { key: 'mw', msg: 'Mega Win', test: (key, ng, xgs, sd) => getBigWinLevel(sd.getTotalbet(), xgs.map(g => g.getTotalwin()).reduce(sumReducer, 0)) === BIG_WIN_LEVEL.MEGA };

@ccclass
export default abstract class LobbyBase extends Component implements CommListener<AuthRes | InMachineRes | UserInfoRes | SpinRes | HeartbeatRes | UpdateBalanceRes>, BonusListener, ILobby, ISkillCardLobby {
    resumePause: boolean = false;

    public getNextRoundIndex(index?: number): number {
        if (isNaN(index)) {
            index = this.roundIndex + 1;
        }

        const ri = this.roundInfos[index];
        if (!ri) {
            return -1;
        }
        return index;
    }

    public hasNextRound(): boolean {
        const idx = this.getNextRoundIndex();
        return idx !== -1;
    }

    public nextRound(index: number = this.roundIndex + 1): boolean {
        const ri = this.roundInfos[index];
        if (!ri) {
            return false;
        }
        this.roundIndex = index;
        this.doNextRound(ri, index);
        return true;
    }

    protected nextRoundf(resolve: Function) {
        resolve(1);
        if (this.hasNextRound()) {
            this.scheduleOnce(() => this.nextRound(), 0);
        } else {
            warn('no next round');
        }
    }

    /**
     * 壓縮的 pako
     */
    private pako: string = null;

    /**
     * 未壓縮的 pako
     */
    private pako2: string = null;

    /**
     * 9998 RecordDetailLog 的 JSON.stringify 字串
     */
    private pako3: string = null;

    /**
     * @param spinResult
     */
    fixSpinResult?(spinResult: SpinResult): SpinResult;

    abstract getDebugConditions(): DebugCondition[];

    /**
     * 裡面的內容要用 DEBUG 包起來，避免 production 包出去
     * return true 代表要展演，false 代表要 respin
     * @param debug url 上的 debug param 參數，可用此分要走哪個 debug
     * @param ng 第一局
     * @param xgs 全部局
     * @returns SpinRes
     */
    protected debugCondition(obj: SpinRes): SpinRes {
        if (DEBUG) {
            const debug = this.debug;
            const xgs = obj.getSpinResult().getRoundInfosList();
            const ng = xgs[0];
            if (debug === 'pako') {
                return deserializePako(this.pako, this.pako2, this.pako3);
            }
            const arr = this.getDebugConditions();
            // list 點擊存入的是唯一 key（分頁內互不干涉），URL ?debug=key 帶的是原始 key，兩者皆可命中
            const cond = arr.find((c, i) => debugUniqueKey(arr, i) === debug || c.key === debug);
            const fix = (cond: DebugCondition) => {
                if (this.debugList) {
                    this.debug = '';
                    cond.occurred = false;
                } else {
                    if (cond.once && cond.occurred) {
                        this.debug = '';
                    }
                }
            };
            if (cond) {
                if (cond.pako || cond.pako2) {
                    fix(cond);
                    return deserializePako(cond.pako, cond.pako2);
                }
                // 傳原始 key（非含分頁前綴的唯一 key），確保 test 收到的永遠是原本定義的 key
                const ok = cond.test(cond.key, ng, xgs, this.spinData);
                if (ok) {
                    cond.occurred = true;
                    fix(cond);
                    return obj;
                } else {
                    return;
                }
            } else {
                return obj;
            }
        }
        return;
    }

    onMessage(obj: KickRes | AuthRes | InMachineRes | UserInfoRes | SpinRes | HeartbeatRes | UpdateBalanceRes | CheckBonusRes | BetBonusRes | ResumeRes) {

        const result: Result = obj instanceof Result ? obj : obj.getResult && obj.getResult();
        if (obj instanceof AuthRes) {
            this.updateVersionVersionRound(this.ver1, obj.getServerVersion());
            if (obj.getResult().getCode() !== MsgCode.SUCCESS) {
                log('AuthRes !SUCCESS', obj.toObject());
                this.comm.closeWebsocket();
                this.comm.resumeRequesting = false;
                return;
            }
        } else if (obj instanceof ResumeRes) {
            if (obj.getResult().getCode() !== MsgCode.SUCCESS) {
                log('ResumeRes !SUCCESS', obj.toObject());
                this.comm.closeWebsocket();
                this.comm.resumeRequesting = false;
                return;
            }
            // } else if (obj instanceof SpinRes) {
            //     if (obj.getResult().getCode() !== MsgCodeValue.SUCCESS) {
            //         log('@@xx SpinRes !SUCCESS', obj.toObject());

            //         if (obj.getResult().getCode() !== MsgCodeValue.SUCCESS) {
            //             if (obj.getResult().getCode() === MsgCodeValue.AMOUNT_OF_ERROR) {
            //                 this.main.offline(translateError('NETWORK.sys_disconnected', MsgCodeValue.AMOUNT_OF_ERROR), MsgCodeValue.AMOUNT_OF_ERROR);
            //                 log('@@xx SpinRes !SUCCESS', obj.toObject() , MsgCodeValue.AMOUNT_OF_ERROR);
            //                 return;
            //             }
            //         }

            //         this.comm.closeWebsocket();
            //         this.comm.resumeRequesting = false;
            //         return;
            //     }
        }

        if (handleError(result, this.main, this.comm, obj)) {
            if (obj instanceof SpinRes) {
                this.spinData = null;
                if (this.stepping) {
                    this.doSpin(DO_SPIN_STAT.FAIL);
                } else {
                    this.reset(() => {
                        this.spinEffect(false);
                        this.uiBetable(true);
                        this.updateAutoRound(0);
                        this.setTurbo(false);

                        this.doSpin(DO_SPIN_STAT.FAIL);
                    });
                }
            }
            return;
        }
        if (obj instanceof KickRes) { // 登入
            handleKick(obj);
        } else if (obj instanceof AuthRes) { // 登入
            log('AuthRes', obj.toObject());
            this.commonUIData.set('displayDemo', IS_GUEST);
            this.updateCurrencyRatio(obj.getCurrencyRatio());
            this.commonUIData.set('gameId', this.main.getGameId());
            if (!this.machineInfo) {
                this.comm.requestMachineInfo();
                this.updateBalance(balance(obj.getBalance()));
            } else {
                this.comm.requestUserInfo().subscribe();
            }
            this.updateCurrencyCode(obj.getCurrency());

            if (DEBUG && getDebugParams('cur')) {
                this.updateCurrencyCode(getDebugParams('cur'));
            }

            this.updateVersionVersionRound(this.ver1, obj.getServerVersion());
            this.main.token = obj.getResumeToken();
        } else if (obj instanceof ResumeRes) {
            log('ResumeRes1', obj.toObject(), Date.now());
            this.comm.resumeRequesting = false;
            this.main.token = obj.getNewToken();
            this.comm.loginState = LoginState.LOGIN;
            const next = () => {
                this.main.online();
                log('ResumeRes1 online');
                const offline = (code: number) => {
                    if (EXTRA_1110) {
                        this.main.offline(translateError('NETWORK.sys_net_error2', code), code, false);
                    } else {
                        this.main.offline(translateError('NETWORK.sys_disconnected', code), code, true);
                    }
                };
                const obj2 = obj as ResumeRes;
                const any = obj2.getAnyContent();
                let spinRes: SpinRes;
                if (any) {
                    try {
                        spinRes = any.unpack(SpinRes.deserializeBinary, any.getTypeName());
                    } catch (error) {
                        offline(-11);
                        return;
                    }
                    if (spinRes.getResult().getCode() !== MsgCode.SUCCESS) {
                        offline(-12);
                        return;
                    }
                    const roundId = spinRes.getSpinResult().getRoundId();
                    if (!this.spinData) {
                        if (this.lastSpinResultRoundId === roundId) {
                            log('ResumeRes1 after spin fail');
                        } else if (this.stepping) { // 在 stepping 時下注失敗 spinData 被清空
                            log('ResumeRes1 after stepping spin fail');
                        } else {
                            offline(-13);
                            return;
                        }
                    } else if (this.requesting) { // this.spinData && !this.spinRes
                        if (this.lastSpinResultRoundId === roundId) {
                            log('ResumeRes1 any requesting requestSpin');
                            this.comm.requestSpin(this.spinData);
                        } else {
                            log('ResumeRes1 any requesting onMessage');
                            this.onMessage(spinRes);
                        }
                    } else { // this.spinData && this.spinRes
                        const prevRoundId = this.spinRes.getSpinResult().getRoundId();
                        if (roundId !== prevRoundId) {
                            offline(-14);
                            if (this.isIdle) {
                                debugger;
                            } else {
                                debugger;
                            }
                            return;
                        } else {
                            if (this.stepping) {
                                log('ResumeRes1 any stepping onMessage');
                                this.onMessage(spinRes);
                            }
                            // do nothing
                        }
                    }
                } else {
                    if (this.requesting) {
                        if (this.lastSpinResultRoundId === 0) {
                            log('ResumeRes1 requesting requestSpin');
                            this.comm.requestSpin(this.spinData);
                        } else {
                            offline(-15);
                            return;
                        }
                    } else {
                        // do nothing
                    }
                }
                setBonusIdle(true);
                this.doResume?.(obj2, spinRes);
            };
            this.comm.requestMachineInfo(true, next);
        } else if (obj instanceof InMachineRes) {
            this.updateMachineInfo(obj.getMachineInfo());
            this.main.online();
            log('InMachineRes online');
        } else if (obj instanceof SpinRes) {
            this.lastSpinOkAt = Date.now();

            if (DEBUG && this.debug) {
                const passedObj = this.debugCondition(obj);
                if (!passedObj) {
                    const xgs = obj.getSpinResult().getRoundInfosList();
                    const last = xgs[xgs.length - 1];
                    this.updateBalance(balance(last.getBalance()));
                    const sr = obj.getSpinResult();
                    this.spinRes = obj;
                    this.spinResultSpinData = this.spinData.clone();
                    this.spinResult = sr;
                    this.roundIndex = 0;
                    this.roundInfos = sr.getRoundInfosList();
                    log(sr.toObject());
                    const arr = this.getDebugConditions();
                    // 條件未滿足而需重送 spin：同樣以唯一 key（list）或原始 key（URL）找回該條件取 featurebuy
                    const cond = arr.find((c, i) => debugUniqueKey(arr, i) === this.debug || c.key === this.debug);
                    const spinData = this.createSpinData(cond.featurebuy);
                    this.comm.requestSpin(spinData);
                    return;
                }

                if (this.pako3) {
                    const passedList = passedObj.getSpinResult().getRoundInfosList();
                    const objList = obj.getSpinResult().getRoundInfosList();
                    passedList.forEach(r => r.setBalance(objList[objList.length - 1].getBalance())); // 更新當前餘額
                }
                obj = passedObj;
            }

            if (DEBUG) {
                const zlib = window['Zlib'];
                const bin = obj.serializeBinary();
                try {
                    this.pako2 = btoa(String.fromCharCode.apply(null, bin));
                } catch (error) {
                    this.pako2 = '';
                    log('pako error', error);
                }
                // try {
                //     const deflate = zlib.Deflate.compress(bin);
                //     this.pako = btoa(String.fromCharCode.apply(null, deflate));
                // } catch (error) {
                //     this.pako = '';
                //     log('pako compress error', error);
                // }
            }

            const sr = this.fixSpinResult ? this.fixSpinResult(obj.getSpinResult()) : obj.getSpinResult();
            this.spinRes = obj;
            this.spinResultSpinData = this.spinData.clone();
            this.spinResult = sr;
            this.roundIndex = 0;
            this.roundInfos = sr.getRoundInfosList();
            this.ngSymbolCaches = [];
            const ng = this.roundInfos[0];

            const [serial1, serial2] = this.balanceManager.getNextBalanceSerials(2);
            const last = this.roundInfos[this.roundInfos.length - 1];
            this.updateBalance(balanceSub(ng.getBalance(), ng.getTotalwin()), 0, serial1, true);
            if (DEBUG) {
                // debug=list 模式下，盤面回傳餘額為 0 時補一筆大額餘額，避免餘額不足無法連續點列試玩
                if (this.debugList) {
                    if (last.getBalance() === '0') {
                        last.setBalance(10e9 + '');
                    }
                }
            }
            const spinResBd = this.updateBalance(balance(last.getBalance()), this.sumTotalWins(), serial2, false);
            this.spinResBalanceData = spinResBd;
            const isFG = this.spinRes.getSpinResult().getRoundInfosList().findIndex(r => isSpecialGame(r.getSpinType()) === true) !== -1;
            const winTenTimes = this.sumTotalWins() / this.spinData.getTotalbet() > 10;
            setBonusHangOnAutoPrize(isFG || winTenTimes); // 特殊模式 or 贏超過十倍，暫停紅包自動領取。
            const p = this.doSpin(DO_SPIN_STAT.OK);
            if (!getSkillCardManager().isDrawing()) { // 技能卡合成盤面不回報 GA
                this.reportSpinRes(sr);
            }
            const next = () => {
                log(sr.toObject());
                // 从第 0 个开始播
                this.nextRound(0);
                // 如果是 bigwin 就先 preload
                const wins = this.sumTotalWins();
                const bet = this.spinData.getTotalbet();
                const reachBW = getBigWinLevel(bet, wins);
                if (reachBW) {
                    this.foreground.preloadBigWin();
                }
            };
            if (p) {
                p.then(next);
            } else {
                next();
            }
            if (!getSkillCardManager().isDrawing()) { // 技能卡注單 0 元，不計入紅包流水
                postBonusEvent('spinRes', { totalBet: this.spinData.getTotalbet() });
            }
        } else if (obj instanceof UserInfoRes) {
            log('UserInfoRes', this.isIdle, obj.toObject());
            const serial = this.balanceManager.getNextBalanceSerial();
            this.updateBalance(balance(obj.getBalance()), 0, serial, true);
        } else if (obj instanceof UpdateBalanceRes) {
            log('UpdateBalanceRes', this.isIdle, obj.toObject());
            const serial = this.balanceManager.getNextBalanceSerial();
            this.updateBalance(balance(obj.getBalance()), 0, serial, true);
        }
    }

    private betBonusBd: BalanceData = null;

    /** 技能卡：逐局領取展演協調器（onLoad 建立） */
    public skillCardPlayer: SkillCardSlotPlayer = null;
    /** 技能卡：效果側管理者——狀態/啟用時機/0003 控制通道（onLoad 建立） */
    public skillCardManager: SkillCardSlotManager = null;
    /** 技能卡：局演出完成回呼（SkillCardSlotPlayer 掛載） */
    public skillCardRoundComplete?: () => void;
    /** 技能卡起轉（SlotLobbyBase 實作：同 onSpin 但送 SkillCardDrawReq、不檢查餘額） */
    public spinBySkillCard?(cardId: string): void;

    /** 技能卡：開放 SPIN 等待玩家領取下一局（倍率/自動/購買仍被 isDrawing 鎖定） */
    public skillCardArmSpin() {
        this.uiBetable(true);
    }

    /** 技能卡：收尾恢復 UI */
    public skillCardFinishUi() {
        this.uiBetable(true);
    }

    /** 技能卡：畫面押注改顯示卡片金額（displayBet 10^-4 元 → 元字串，經 Balance 與遊戲顯示設定一致） */
    public skillCardShowBet(displayBet: number) {
        this.commonUIData.set('rawTotalBet', balance(displayBet).toString());
    }

    /** 領卡前玩家自己的檔位（skillCardApplyLevel 存、skillCardRestoreBet 取回）；null = 沒切過 */
    private skillCardPrevLevel: number | null = null;

    /**
     * 技能卡：押注檔位真的切到卡上的檔位（betUnit 10^-4 元 → 元）。
     * 不寫 localStorage —— 這是卡的檔位不是玩家偏好，領卡中途關遊戲也不該留給下次登入。
     */
    public skillCardApplyLevel(betUnit: number) {
        const level = balance(betUnit).toNumber();
        if (level <= 0) {
            return; // 舊版服務沒帶 bet_unit：維持玩家檔位，押注只改顯示（skillCardShowBet）
        }
        if (DEBUG) {
            if (SKILL_CARD_LOG && this.commonUIData.levels.indexOf(level) === -1) {
                // 照切（顯示金額要對得上盤面），檔位面板找不到對應項是預期內
                skillCardLog('背包演出：卡的檔位不在本遊戲的檔位清單 level=', level);
            }
        }
        this.skillCardPrevLevel = Number(this.commonUIData.level);
        this.updateLevel(level, false);
    }

    /** 技能卡：恢復玩家自己檔位的押注顯示（切過檔位就一併切回） */
    public skillCardRestoreBet() {
        const prev = this.skillCardPrevLevel;
        this.skillCardPrevLevel = null;
        if (prev !== null) {
            this.updateLevel(prev, false); // 本來就是玩家的值，不需要再寫一次 localStorage
            return;
        }
        this.refreshLevel();
    }

    /** 技能卡：佔用期間鎖定/恢復 倍率/自動/FeatureBuy/PowerBet 按鈕（點擊層另有 isDrawing 防護） */
    public skillCardSetUiLock(locked: boolean) {
        this.commonUIData.set('skillCardLock', locked);
    }

    /**
     * 四種核心請求序列化閘門的狀態變化。上鎖時連 SPIN 一起鎖住，
     * 解鎖只把旗標放掉；能不能下注仍由 betable 決定（演出未結束時 betable 本來就是 false）。
     */
    private onRequestPendingChanged = (pending: boolean) => { this.commonUIData.set('requestPending', pending); };

    /** 技能卡開始前暫停自動連續進行（Coordinator 呼叫；slot＝關閉自動旋轉） */
    public skillCardPauseAutoPlay() {
        this.updateAutoRound(0);
    }

    /** 技能卡：自動旋轉進行中？（無限 auto 時 autoRound 為 Infinity，> 0 同樣成立） */
    public skillCardIsAutoPlaying(): boolean {
        return this.commonUIData.autoRound > 0;
    }

    /**
     * 技能卡：自動旋轉中斷提示（企劃：auto 已停、但該局一般下注尚未結束的期間顯示，
     * 該局結束即關閉）。用共用的黑帶 toast2（滿版橫帶、垂直置中、不擋點擊），
     * duration 帶 0 代表常駐，直到這裡以 show=false 收掉。
     * 沒有 game-ui／ds 那層時（htmlControl* 會 no-op）不顯示提示，不影響流程。
     */
    public skillCardShowAutoStop(show: boolean) {
        const key = TOAST2_KEY.SKILL_CARD_AUTO_STOP;
        if (show) {
            htmlControlShowToast2(translate('COMMONUI.skill_card_auto_stop'), 0, key, TOAST2_PRIORITY[key]);
        } else {
            // 只收自己這條，不影響其他常駐（如 MaxWin）與定時訊息
            htmlControlHideToast2(key);
        }
    }

    // --- 技能卡 skillCardRounds 節點（免費旋轉局數；demo 佔位：正式做法定案後整段移除） ---

    private skillCardRoundsNode: Node = null;
    private skillCardRoundsLabel: Label = null;
    private skillCardRoundsTitleLabel: Label = null;
    private skillCardRoundsOpacity: UIOpacity = null;
    /** 底框重繪（帶入 0~255 透明度）：Graphics 吃不到 UIOpacity，改以 fillColor alpha 跟隨 tween */
    private skillCardRoundsDrawBoard: (opacity: number) => void = null;

    /** 技能卡：更新 spin 按鈕上的 skillCardRounds 節點——白字標題依卡種切換
     * （免費旋轉=COMMONUI.free_spin_rounds / 免費遊戲卡=LOBBY.tx_freegame），
     * 黃字次數兩種卡都顯示「剩餘可用/總數」遞減；total<=0 隱藏；首次顯示時動態掛載 */
    public skillCardUpdateRounds(consumed: number, total: number, cardType?: SkillCardType) {
        const isFreeGame = cardType === SkillCardType.SKILL_CARD_TYPE_FREE_GAME;
        const text = skillCardRoundsText(consumed, total);
        if (text && !this.skillCardRoundsNode) {
            this.mountSkillCardRounds();
        }
        const node = this.skillCardRoundsNode;
        if (!node) {
            return;
        }
        if (text) {
            this.skillCardRoundsTitleLabel.string = translate(isFreeGame ? 'LOBBY.tx_freegame' : 'COMMONUI.free_spin_rounds');
            this.skillCardRoundsLabel.string = text;
        }
        // 開始/結束淡入淡出（領取中每局更新已是全亮，不重播）
        const FADE_SEC = 0.3;
        const op = this.skillCardRoundsOpacity;
        const syncBoard = () => this.skillCardRoundsDrawBoard(op.opacity); // 底框跟著當前透明度重繪
        Tween.stopAllByTarget(op); // 快速切換時接手當前透明度續播
        if (text) {
            node.active = true;
            if (op.opacity < 255) {
                tween(op).to(FADE_SEC, { opacity: 255 }, { onUpdate: syncBoard }).start();
            }
        } else if (node.active) {
            tween(op).to(FADE_SEC, { opacity: 0 }, { onUpdate: syncBoard }).call(() => {
                node.active = false;
            }).start();
        }
    }

    /** skillCardRounds 節點底版與 label 以 Graphics + 系統字程式生成（比照 DebugConditionView 做法）；spin 節點用 colKey  spinState  反查 */
    private mountSkillCardRounds() {
        const cui = this.ui.commonUIManager.commonUI;
        const cols = cui ? cui.getCols('spinState') : null;
        if (!cols || !cols.length || !cols[0].node) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('skillCardRounds：找不到 spinState col 無法掛載');
                }
            }
            return;
        }
        const spinNode = cols[0].node;
        const w = 220;
        const h = 84;
        const node = new Node('skillCardRounds');
        node.layer = spinNode.layer;
        setNodeContentSize(node, w, h);

        // 底版：半透明黑圓角矩形（基準 alpha 153 = 60%，隨 skillCardRounds 節點透明度 0~255 等比縮放）
        const g = node.addComponent(Graphics);
        this.skillCardRoundsDrawBoard = (opacity: number) => {
            g.clear();
            g.roundRect(-w / 2, -h / 2, w, h, 16);
            g.fillColor = new Color(0, 0, 0, Math.round(153 * opacity / 255));
            g.fill();
        };

        const addLabel = (text: string, fontSize: number, color: Color, y: number, bold: boolean): Label => {
            const ln = new Node('label');
            ln.layer = spinNode.layer;
            setNodeAnchor(ln, 0.5, 0.5);
            setNodeContentSize(ln, w - 16, fontSize + 12);
            setNodePosition(ln, 0, y);
            const label = ln.addComponent(Label);
            label.string = text;
            label.fontSize = fontSize;
            label.lineHeight = fontSize + 6;
            label.color = color;
            label.isBold = bold;
            label.overflow = Label.Overflow.SHRINK;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.fontFamily = 'Microsoft JhengHei';
            node.addChild(ln);
            return label;
        };
        // 白字標題：依卡種切換（免費旋轉次數 / 免費遊戲），每次 skillCardUpdateRounds 重設
        this.skillCardRoundsTitleLabel = addLabel(translate('COMMONUI.free_spin_rounds'), 24, new Color(255, 255, 255, 255), 18, false);
        this.skillCardRoundsLabel = addLabel('', 30, new Color(0xff, 0xe1, 0x4c, 255), -16, true); // 黃字局數
        applyLabel(node); // 依語系套用系統字型

        this.skillCardRoundsOpacity = node.addComponent(UIOpacity);
        this.skillCardRoundsOpacity.opacity = 0; // 首次顯示由 0 淡入
        this.skillCardRoundsDrawBoard(0); // 底框同步初始透明度
        node.active = false;
        spinNode.addChild(node);
        node.setSiblingIndex(spinNode.children.length - 1);
        this.skillCardRoundsNode = node;
    }
    /** 技能卡中止復原（SlotLobbyBase 實作：停輪重置，恢復可投注） */
    public skillCardAbort?(): void;

    onBonusMessage(obj: BonusMessageType) {
        if (obj instanceof BetBonusRes) {
            const code = obj.getResult().getCode();
            if (code !== MsgCode.SUCCESS) {
                return;
            }
            const diff = obj.getBonus().getRewardsList().reduce(sumReducer);
            this.betBonusBd = this.updateBalance(balance(obj.getBalance()), diff);
        } else if (obj instanceof WebViewMessage) {
            if (obj.method === BONUS_ENUM.BONUS_EVENT_FINISH || obj.method === BONUS_ENUM.BONUS_EVENT_ONE_AUTO_PRIZE_FINISH) {
                if (this.betBonusBd) {
                    this.balanceManager.finishBalanceData(this.betBonusBd);
                    this.betBonusBd = null;
                }
            }
        }
        this.doOnBonusMessage?.(obj);
    }

    doOnBonusMessage?(obj: BonusMessageType): void;

    private reportSpinRes(spinResult: SpinResult) {
        const spinData = this.spinData;
        const ga = this.main.ga;
        if (!this.main.ga || !spinData) {
            return;
        }

        const commonUIData = this.commonUIData;

        const ris = spinResult.getRoundInfosList();
        const lastRi = ris[ris.length - 1];
        const lastBalance = lastRi.getBalance(); // 餘額
        const featureBuy = spinData.getFeatureBuy();
        const selection = spinData.getSelection();
        const fgSelection = spinData.getFreegameSelection();
        const mi = this.machineInfo;
        const fbi = mi.getFeatureBuyLevelsList().find(fb => fb.getFeatureBuy() === spinData.getFeatureBuy());
        const featureBuyLevel = fbi ? fbi.getFeatureBuyLevel() : 1;
        const hasAutoSpin = ga.getIsAutoSpin();
        const autoTotal = ga.getAutoTotal();
        const autoCount = ga.getAutoCount();
        ga.eventSpinResult(spinData.getLevel(), spinData.getTotalbet(), featureBuy, featureBuyLevel, selection, fgSelection, spinResult, this.commonUIData.quickspin, {
            auto: hasAutoSpin,
            audio: this.commonUIData.playSound,
            vertical: true,
            setting_win: false,
            setting_incbal: false,
            setting_decbal: false,
            setting_special: false,
        });

        if (!getIsFirstSpin()) {
            analyticsClick({ clickType: ClickType.FIRST_SPIN, clickTime: Date.now() });
            setIsFirstSpin();
        }

        analyticsSpin({
            selection,
            fgSelection,
            betId: spinResult.getBetid(),
            bet: spinData.getTotalbet(),
            win: this.sumTotalWins(),
            afterBalance: lastBalance,
            feature: featureBuy,
            autoCount: hasAutoSpin ? autoCount :0,
            autoTotal: hasAutoSpin ? autoTotal :0,
            audio: commonUIData.playSound,
            quick: commonUIData.allowTurbo ? 3 : commonUIData.quickspin,
            vertical: getParentInnerWHRatio() < 1,
            startTime: this.lastSpinAt,
            endTime: Date.now(),
        });
        setAnalyticsShowDataInit(spinResult);
    }

    /**
     * 可於此播放 ng 背景音樂
     * ```
     * audioSwitchBGM('M302701_ng_bgm')
     * ```
     */
    doFinalRound?(loop: boolean): void;

    protected finalRoundf(resolve: Function) {
        const totalWins = this.sumTotalWins();
        this.updateInNormalGame();
        this.updateWins(balanceNumber(totalWins));
        this.balanceManager.finishBalanceData(this.spinResBalanceData);
        this.updateMessage('');
        const autoNext = this.isAutoNextRound();
        this.spinEffect(false);

        if (autoNext) {
            // 如果要繼續轉就沒有 loop
            this.doFinalRound?.(false);
            this.main.ga.setIsAutoSpin(true);
            this.updateAutoRound(this.commonUIData.autoRound - 1);
            this.onSpin();
        } else {
            // 技能卡逐局領取局：保持不可投注，續抽/收尾交給 SkillCardSlotPlayer
            const skillCardRound = getSkillCardManager().isDrawing();
            this.updateAutoRound(0);
            this.setTurbo(false);
            this.spinEffect(false);
            if (!skillCardRound) {
                this.uiBetable(true);
            }
            this.doFinalRound?.(true);
            this.main.ga.setIsAutoSpin(false);
            if (skillCardRound) {
                if (DEBUG) {
                    if (SKILL_CARD_LOG) {
                        skillCardLog('背包演出：finalRound 完成（技能卡局）通知 Player');
                    }
                }
                this.skillCardRoundComplete?.();
            }
        }
        setBonusHangOnAutoPrize(false);
        resolve(1);
    }

    public onFeatureBuyClick(featureBuy: string, level: number, powerBet: string) {
        const bonusIdle = getBonusIdle();
        if (!bonusIdle) {
            return;
        }
        if (getSkillCardManager().isDrawing()) { // 技能卡逐局領取中不可購買
            return;
        }
        // 展演中不可投注
        if (!this.isIdle) {
            return;
        }
        this.ui.commonUIManager.closePanel();
        this.updateLevel(level);
        this.onSpin(featureBuy, powerBet);
    }

    skipBaseReachStopAutoCondition?: boolean = false;

    reachStopAutoCondition?(data: CommonUIData, spinData: SpinData, spinResult: SpinResult, balance: string): boolean;

    /**
     *
     * @returns 是否繼續 auto，true 為繼續
     */
    protected isAutoNextRound(): boolean {
        if (this.commonUIData.autoRound) {  // 未到条件继续
            if (this.reachStopAutoCondition?.(this.commonUIData, this.spinData, this.spinResult, this.balanceCache)) { // 自訂條件
                return false;
            }
            return true;
        } else { // 没有自动
            return false;
        }
    }

    public sumTotalWins(start?: number, end?: number) {
        return sumTotalWins(this.roundInfos, start, end);
    }

    public sumSpinTypeWins(type: SpinType, start?: number, end?: number) {
        return sumSpinTypeWins(this.roundInfos, type, start, end);
    }

    public sumSpinTypesWins(types: SpinType[], start?: number, end?: number) {
        return sumSpinTypesWins(this.roundInfos, types, start, end);
    }

    public sumLineTypeWins(type: WinType, start?: number, end?: number) {
        return sumLineTypeWins(this.roundInfos, type, start, end);
    }

    public sumSpinTypeLineTypeWins(spinTypes: SpinType[], type: WinType, start?: number, end?: number) {
        return sumSpinTypeLineTypeWins(this.roundInfos, spinTypes, type, start, end);
    }

    public sumCurrentRoundWins(currRoundInfo: RoundInfo, roundIndex: number) {
        let i = roundIndex;
        for (; i >= 0; i -= 1) {
            const r = this.roundInfos[i];
            if (currRoundInfo.getRemainingRound() !== r.getRemainingRound()) {
                break;
            }
        }
        return this.sumTotalWins(i + 1, roundIndex + 1);
    }

    abstract doNextRound(ri: RoundInfo, index: number): void;

    protected comm: Communication3XXX = null;

    public main: MainBase = null;

    @property(UIBase)
    ui: UIBase<UIDataBase> = null;

    public uiData: UIDataBase = null;

    public commonUIData: CommonUIData = null;

    @property(ForegroundBase)
    foreground: ForegroundBase = null;

    slot: ISlotPuzzle = null; // slot, puzzle

    slots: ISlotPuzzle[] = []; // slot, puzzle

    /**
     * 取得所有啟用的 Slot (包含單一 slot 與 slots 陣列)
     */
    protected get activeSlots(): ISlotPuzzle[] {
        const slots = [...this.slots];
        if (this.slot) {
            slots.unshift(this.slot);
        }
        return slots;
    }

    @property(SlotPayLine)
    slotPayLine: SlotPayLine = null;

    slotResult: IResult = null;

    slotResults: IResult[] = [];

    /**
     * 取得所有啟用的 SlotResult (包含單一 slotResult 與 slotResults 陣列)
     */
    protected get activeSlotResults(): IResult[] {
        const slotResults = [...this.slotResults];
        if (this.slotResult) {
            slotResults.unshift(this.slotResult);
        }
        return slotResults;
    }

    promiseManager: PromiseManager2 = null;

    @property(MessageMarqueeBase)
    messageMarquee: MessageMarqueeBase = null;

    // 游戏状态
    public isIdle: boolean = true;

    protected machineInfo: MachineInfo = null;
    // 当局下注资料
    public spinData: SpinData = null;
    protected lastSpinAt: number = 0;
    protected lastSpinResultRoundId: number = 0;
    protected lastSpinOkAt: number = 0;
    // 结果资料
    protected spinRes: SpinRes = null;
    protected spinResultSpinData: SpinData = null;
    protected spinResult: SpinResult = null;
    protected roundInfos: RoundInfo[] = null;
    protected roundIndex: number = 0;

    /**
     * 緩存 NG 圖標結果 (多 slot)
     */
    protected ngSymbolCaches: SlotReelSymbol[][][] = [];

    protected balanceCache: string = '0';
    protected balanceManager: BalanceManager = new BalanceManager();
    protected spinResBalanceData: BalanceData = null;
    protected winsManager: BalanceManager = new BalanceManager(true);

    protected maxFGRound: number = 0;

    protected noMoreFG(ri: RoundInfo, prevRi: RoundInfo): boolean {
        return (prevRi.getRemainingRound() - 1 + ri.getCurrentRound()) >= this.maxFGRound;
    }

    public debugList: boolean = false;

    public debug: string = '';

    private startClicked: boolean = false;

    onLoad() {
        setFrameRate(SLOT_FRAME_RATE);
        htmlControlRegister('level', (levelIdx) => {
            log('levelIdx', levelIdx);
            // 100
            // betBase
            // #TODO check
            const level = this.commonUIData.levels[levelIdx];
            this.updateLevel(level);
        });
        htmlControlRegister('auto', (autoData) => {
            const data = autoData.split(';');
            const auto = data[0];
            const turbo = data[1];
            log('auto', auto, 'turbo', turbo);
            this.setTurbo(turbo === '1');
            this.onAutoClick(auto);
        });
        htmlControlRegister('close', (close) => {
            log('close', close);
            // 播關閉音效
            audioPlay(audioDefaultButtonAudioName());
        });
        htmlControlRegister('startClick', () => {
            log('startClick');
            this.startClicked = true;
            postBonusEvent('startPage');
            setBonusEventIsStartPageClose();
            this.doStartClick?.();
            this.skillCardManager?.tryActivate();
        });

        this.promiseManager = this.getComponent(PromiseManager2) || this.addComponent(PromiseManager2);
        this.finalRoundf = this.finalRoundf.bind(this);
        this.nextRoundf = this.nextRoundf.bind(this);

        this.balanceManager.doUpdateBalance = (balance) => {
            this.commonUIData.set('rawBalance', balance.rawString());
        };

        const commonUIMgr = this.ui.commonUIManager;
        commonUIMgr.lobbyHandler = this.onLobbyClick.bind(this);
        commonUIMgr.recordHandler = this.onRecordClick.bind(this);
        commonUIMgr.infoHandler = this.onInfoClick.bind(this);
        commonUIMgr.spinHandler = this.onSpinClick.bind(this);
        commonUIMgr.stopHandler = this.onStopClick.bind(this);
        commonUIMgr.levelHandler = this.onLevelClick.bind(this);
        commonUIMgr.autoHandler = this.onAutoClick.bind(this);
        commonUIMgr.stopAutoHandler = this.onStopAutoClick.bind(this);
        commonUIMgr.quickspinClickHandler = this.doQuickspinClick.bind(this);
        commonUIMgr.featurebuyClickHandler = this.onFeatureBuyClick.bind(this);
        globalDebugNNN(this);

        const onKeyDown = this.onKeyDown;
        this.onKeyDown = (event: EventKeyboard) => {
            this.keyDownEvent = event;
            onKeyDown.call(this, event);
            this.keyDownEvent = null;
        };

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown0, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.KEY_PRESSING, this.onKeyDown, this);

        this.doOnLoad?.();
        this.comm.registListener(listenTo, this);
        this.comm.onRequestPendingChanged = this.onRequestPendingChanged;
        registerBonusMessage(this);

        // 技能卡效果套件（資料橋/查卡/輪詢由 game-client-lib 的 SkillCardBootstrap 於登入時接線）
        attachSlotSkillCard(this, (result, resp) => handleError(result, this.main, this.comm, resp));

        this.uiBetable(false);

        let tempo = getTempoConfigString(this.main.getGameId());
        let tempo2 = getTempo2ConfigString(this.main.getGameId());
        let tempo3 = getTempo3ConfigString(this.main.getGameId());

        if (DEBUG) {
            if (getDebugParams('tempo')) {
                tempo = getDebugParams('tempo');
            }
            if (getDebugParams('tempo2')) {
                tempo2 = getDebugParams('tempo2');
            }
            if (getDebugParams('tempo3')) {
                tempo3 = getDebugParams('tempo3');
            }
            const debug = getDebugParams('debug');
            if (debug === 'list') {
                this.debugList = true;
                const dc = this.addComponent(DebugConditionView);
                dc.lobby = this;
            } else {
                this.debug = debug;
            }
        }
        if (tempo) {
            if (this.doTempoString) {
                this.doTempoString(tempo);
            } else {
                const slots = this.getComponentsInChildren('SlotBase') as SlotBase[];
                if (slots.length) {
                    applyTempoStringToSlot(tempo, slots);
                }
            }
        }
        if (tempo2) {
            const puzzles = this.getComponentsInChildren('PuzzleBase') as PuzzleBase[];
            if (puzzles.length) {
                applyTempoStringToPuzzle(tempo2, puzzles);
            }
        }
        if (tempo3) {
            const puzzles2 = this.getComponentsInChildren('PuzzleBase2') as PuzzleBase2[];
            if (puzzles2.length) {
                applyTempoStringToPuzzle2(tempo3, puzzles2);
            }
        }
        if (this.slotPayLine) {
            this.slotPayLine.typeToOdds = type => typeToOddsArray(this.machineInfo, type, this.getBetBase());
            this.slotPayLine.data = this.commonUIData;
        }

        applyLocalStorageToCommonUIData(this.ui.commonUIManager.data);

        if (this.doCCGameEventShow) {
            game.on(Game.EVENT_SHOW, this.doCCGameEventShow, this);
        }
    }

    abstract getBetBase(powerBet?: string): number;

    doOnLoad?(): void;

    doStart?(): void;

    doTempoString?(str: string): void;

    doStartClick?(): void;

    abstract doMachineInfo(machineInfo: MachineInfo): void;

    preMachineInfo?(machineInfo: MachineInfo): void;

    get requesting() {
        return this.spinData && !this.spinRes;
    }

    public stepping: boolean = false;

    start() {
        applyLabel(this.node);
        // 设定 UI
        this.main.toggleAudio(this.commonUIData.playSound);

        // 设定自动局数
        this.commonUIData.set('autoPanelAutos', autoTable);

        // 前导页
        const able = EXTRA_1100 ? false : getStartPage();
        // log('displayStartPage', able);
        if (EXTRA_1100) {
            this.commonUIData.set('displayStartPage', false);
        }
        this.uiData.set('displayStartPage', able);
        this.commonUIData.set('startPage', able);

        // 目前时间
        this.updateNow();
        this.schedule(this.updateNow.bind(this), 10, macro.REPEAT_FOREVER);
        setInterval(() => resumeTick(this.main, this.comm, this, this.resumePause), 100);

        const audioCallback = () => {
            const data = this.commonUIData;

            setAudioEnable(data.playSound);
            // setAudioRatio(data.soundRatio);
            setEffectEnable(data.playEffect);
            setMusicEnable(data.playMusic);

            this.main.toggleAudio(data.playSound, true);
            this.main.setMusicVolume(data.playSound && data.playMusic ? data.soundRatio : 0);
            this.main.setEffectsVolume(data.playSound && data.playEffect ? data.soundRatio : 0);
            postBonusEvent('musicSound');
        };
        audioCallback();
        this.commonUIData.registerCallback(['playEffect', 'playMusic', 'playSound', 'soundRatio'], audioCallback);

        this.commonUIData.registerCallback(['level', 'displayCurrencySymbol'], () => {
            const fb = this.ui.commonUIManager.commonUI.featureBuy;
            if (fb) {
                fb.updateDisplayCurrencySymbol();
                fb.updateLevel(this.commonUIData.level);
            }
        });

        this.ui.commonUIManager.commonUI.getBetBase = this.getBetBase.bind(this);

        this.promiseManager.bindHandler(() => {
            this.updateSkippable(this.promiseManager.skippable());
        });
        this.doStart?.();
        this.main.login(this.commonUIData);
    }

    onDestroy() {
        // input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        detachSlotSkillCard(this);
        this.comm.onRequestPendingChanged = null;
        this.comm.unregistListener(listenTo, this);
        this.promiseManager.clearHandler();

        if (this.doCCGameEventShow) {
            game.off(Game.EVENT_SHOW, this.doCCGameEventShow, this);
        }
    }

    /**
     * Cocos creator
     * 切換到背景、分頁回來後觸發
     */
    doCCGameEventShow?():void;

    /**
     * @param onSpinFailStopped 只在 spin 失敗的收尾（SpinRes 錯誤、skillCardAbort）才傳入；
     * 滾動中的滾輪全部停妥後才呼叫，用來恢復 UI。
     */
    public reset(onSpinFailStopped: Function = null) {
        if (onSpinFailStopped) {
            const scrollingSlots = this.activeSlots.filter(s => !s.isIdle());
            if (scrollingSlots.length) {
                // 转回原本的；quick2 的 stopAll 不停軸，需走 stopSpinFail（spin 資料停軸）
                const ps = scrollingSlots.map(s => s.stopSpinFail());
                // @ts-ignore
                Promise.all(ps).then(onSpinFailStopped);
            } else {
                onSpinFailStopped();
            }
        }
        this.activeSlotResults.forEach(r => r.clearAll());
        this.foreground.enactive();
        this.doReset?.();
    }

    doReset?(): void;

    public updateNow() {
        const d = new Date();
        const now = [pad2(d.getHours()), pad2(d.getMinutes())].join(':');
        this.commonUIData.set('now', now);
    }

    public updateMachineInfo(mi: MachineInfo) {
        this.preMachineInfo?.(mi);
        // 这时才算可以被操作
        this.uiBetable(true);
        this.spinEffect(false);
        log('machineInfo', mi.toObject());
        this.machineInfo = mi;

        const level0Less100 = mi.getLevelsList()[0] < 100;
        if (level0Less100) {
            log('decimal 3');
            setBalanceDecimal(3);
        }
        if (EXTRA_1010) {
            setTrimRightZero(true);
        }
        if (EXTRA_1090) {
            setReplaceByMK(false);
        }
        if (level0Less100 || EXTRA_1010) {
            this.commonUIData.set('rawBalance', this.commonUIData.rawBalance, true);
            this.updateWins(0);
        }

        this.updateLevels(mi.getLevelsList());

        let featureBuyInfo2s: FeatureBuyInfo2[];
        if (this.fixFeatureBuyInfos) {
            featureBuyInfo2s = this.fixFeatureBuyInfos(mi.getFeatureBuyLevelsList());
        } else {
            featureBuyInfo2s = mi.getFeatureBuyLevelsList().map(info => new FeatureBuyInfo2(info.getFeatureBuy(), info.getFeatureBuyLevel(), ''));
        }
        this.updateFeatureBuyInfos(mi.getLevelsList(), featureBuyInfo2s, mi.getFeatureBuyMax());

        // 关闭 loadingNode
        this.maxFGRound = mi.getFreegameMaxRound();
        this.updateInNormalGame();
        setTimeout(() => { analyticsPing({ ping: Math.floor(this.comm.getPingVaule()), pingTime: Date.now() }); }, 10e3); // Ｎ秒後送出 ping 分析

        this.doMachineInfo(mi);

        // 開發時省去每次點起始頁。但在 iframe 內（0003 本機 ?preview= 或 develop 版）不跳過：
        // 那裡要測的正是完整流程——起始頁關閉才會 postBonusEvent('startPage')、
        // setBonusEventIsStartPageClose()（0003 跨遊戲轉跳啟用窗的 15 秒倒數等此訊號）
        // 與 skillCardManager.tryActivate()，這些只有 htmlControlRegister('startClick')
        // 那條路徑會做完，這裡自動跳過等於整個繞過去。
        if (DEV && !hasWindowParent()) {
            this.doStartClick();
        }
    }

    private blgs: { get: () => number; set: (value: number) => boolean; } = null;

    private preblgs() {
        if (!this.blgs) {
            const key = STORAGE_KEY.BET_LEVEL.replace('{gid}', this.main.getGameId());
            const tmp = ZERO_TEMPLATE;
            this.blgs = genLocalStorage(key, tmp[0], tmp[1], tmp[2]);
        }
    }

    public getBetLevelLocalStorage() {
        this.preblgs();
        return this.blgs.get();
    }

    public setBetLevelLocalStorage(level: number) {
        this.preblgs();
        return this.blgs.set(level);
    }

    public bigWinf(totalBet: number, totalWins: number, config?: BigWinConfig) {
        return (resolve: Function) => {
            // 是否到 big win // 可跳
            if (getBigWinLevel(totalBet, totalWins)) {
                // this.updateWins(0);
                this.foreground.playBigWin(totalBet, totalWins, config).then(() => {
                    this.updateAnimation(false);
                    resolve();
                });
            } else {
                resolve();
            }
        };
    }

    /**
     * 應被設定一次
     * @param levels
     */
    public updateLevels(levels: number[]) {
        const lvs = levels.map(lv => balanceNumber(lv));
        this.commonUIData.set('levels', lvs);
        const local = this.getBetLevelLocalStorage();
        const level2 = EXTRA_1080 ? levels[0] : (levels[2] || levels[1] || levels[0]);
        let level = balanceNumber(local || level2);
        if (lvs.indexOf(level) === -1) {
            level = lvs[0];
        }
        this.updateLevel(level);
    }

    public updateFeatureBuyInfos(levels: number[], featureBuyInfos: FeatureBuyInfo2[], featureBuyMax: number) {
        const fb = this.ui.commonUIManager.commonUI.featureBuy;
        if (!fb) {
            return;
        }

        if (!featureBuyInfos.length) {
            this.commonUIData.set('featureBuy', false);
            return;
        }

        if (fb.items.length !== featureBuyInfos.length) {
            warn('featureBuyInfos FeatureBuyItem length is not match');
        }

        const level = this.commonUIData.level;
        const display = this.commonUIData.displayCurrencySymbol;
        fb.updateBetBaseLevels(this.getBetBase(), levels);
        featureBuyInfos.map((info) => {
            const fbd = new FeatureBuyData();
            const key = info.featureBuy;
            const powerBet = info.powerBet;
            fbd.powerBet = powerBet;
            fbd.set('betBase', this.getBetBase(powerBet));
            fbd.set('key', key);
            fbd.set('odds', info.featureBuyLevel);
            fbd.set('limit', featureBuyMax);
            fbd.set('level', level);
            fbd.set('displayCurrencySymbol', display);

            const item = fb.items.find(item => item.key === key && item.powerBet === powerBet);
            item.bindData(fbd);
        });

        this.commonUIData.set('featureBuy', true);
    }

    public refreshLevel() {
        this.updateLevel(Number(this.commonUIData.level));
    }

    /** @param persist 是否把檔位記成玩家偏好（技能卡切到卡的檔位時傳 false，玩家自己的偏好不動） */
    public updateLevel(level: number, persist: boolean = true) {
        if (persist) {
            this.setBetLevelLocalStorage(fixAmountNumber(level));
        }
        this.commonUIData.set('level', level);
        this.commonUIData.set('rawTotalBet', '' + safeMul(this.getBetBase(), level));
    }

    public updateWins(wins: number) {
        const str = fixThousandth2('' + wins);
        this.commonUIData.set('wins', str);
    }

    /**
     *
     * @param win 已 fixBalance
     * @param group 預設可跳
     */
    public updateWinsExecutor(wins: number, group: PROMISE_EXECUTOR2_GROUP = PROMISE_EXECUTOR2_GROUP.SKIPPABLE): PromiseExecutor2 {
        return [, () => {
            this.updateWins(balanceNumber(wins));
        }, group];
    }

    public updateWinsRawBalance(wins: Balance) {
        this.updateWins(wins.toNumber());
    }

    public updateBalance(balance: Balance, difference: number = 0, serial: number = this.balanceManager.getNextBalanceSerial(), finished: boolean = true): BalanceData {
        const bd = new BalanceData(
            serial,
            difference,
            balance,
            finished,
        );
        this.balanceManager.pushUpdateBalanceData(bd);
        return bd;
        // this.commonUIData.set('rawBalance', balance.rawString());
    }

    public saveBalanceCache() {
        this.balanceCache = this.commonUIData.rawBalance;
    }

    /**
     *
     * @param bal 未 fixBalance
     * @param group 預設可跳
     */
    public updateBalanceExecutor(balance: Balance, group: PROMISE_EXECUTOR2_GROUP = PROMISE_EXECUTOR2_GROUP.SKIPPABLE): PromiseExecutor2 {
        return [, () => {
            this.updateBalance(balance);
        }, group];
    }

    public updateMessage(str: string, force: boolean = false) {
        this.commonUIData.set('message', str, force);
    }

    public updateAutoRound(round: number) {
        this.commonUIData.set('autoRound', round);
    }

    public updateSkippable(able: boolean) {
        this.commonUIData.set('skippable', able);
    }

    public updateInNormalGame() {
        this.updateInFreeGame(false);
        this.updateInBonusGame(false);
        this.updateInSpecialMode3(false);
        this.updateInSpecialMode4(false);
        this.commonUIData.set('displayFeatureBuy', true);
        this.commonUIData.set('displayPowerBet', true);
    }

    public updateInFreeGame(able: boolean, only: boolean = false, special: boolean = true) {
        this.uiData.set('inFG', able);
        this.commonUIData.set('displayFeatureBuy', false);
        this.commonUIData.set('displayPowerBet', false);
        if (only && able) {
            this.uiData.set('inBonus', false);
            this.uiData.set('inSpecialMode3', false);
            this.uiData.set('inSpecialMode4', false);
        }
        this.updateBottomCustom(able);
        if (special) {
            if (this.commonUIData.isSpecialMode !== able) {
                this.commonUIData.set('isSpecialMode', able);
            }
        }
    }

    public updateInBonusGame(able: boolean, only: boolean = false, special: boolean = true) {
        this.uiData.set('inBonus', able);
        this.commonUIData.set('displayFeatureBuy', false);
        this.commonUIData.set('displayPowerBet', false);
        if (only && able) {
            this.uiData.set('inFG', false);
            this.uiData.set('inSpecialMode3', false);
            this.uiData.set('inSpecialMode4', false);
        }
        this.updateBottomCustom(able);
        if (special) {
            if (this.commonUIData.isSpecialMode !== able) {
                this.commonUIData.set('isSpecialMode', able);
            }
        }
    }

    public updateInSpecialMode3(able: boolean, only: boolean = false, special: boolean = true) {
        this.uiData.set('inSpecialMode3', able);
        this.commonUIData.set('displayFeatureBuy', false);
        this.commonUIData.set('displayPowerBet', false);
        if (only && able) {
            this.uiData.set('inFG', false);
            this.uiData.set('inBonus', false);
            this.uiData.set('inSpecialMode4', false);
        }
        this.updateBottomCustom(able);
        if (special) {
            if (this.commonUIData.isSpecialMode !== able) {
                this.commonUIData.set('isSpecialMode', able);
            }
        }
    }

    public updateInSpecialMode4(able: boolean, only: boolean = false, special: boolean = true) {
        this.uiData.set('inSpecialMode4', able);
        if (only && able) {
            this.uiData.set('inFG', able);
            this.uiData.set('inBonus', able);
            this.uiData.set('inSpecialMode3', able);
        }
        this.updateBottomCustom(able);
        if (special) {
            if (this.commonUIData.isSpecialMode !== able) {
                this.commonUIData.set('isSpecialMode', able);
            }
        }
    }

    public updateBottomCustom(able: boolean) {
        this.commonUIData.set('bottomCustom', able);
    }

    private ver1: string = ''; // client
    private ver2: string = ''; // server

    public updateVersionVersionRound(ver1: string, ver2: string = '', roundId: string = '') {
        const arr = [translate('WEB.title'), ver1, ver2];
        if (roundId) {
            arr.push(roundId);
        }
        this.ver1 = ver1;
        this.ver2 = ver2;
        this.commonUIData.set('version', arr.join('-'));
    }

    public updateCurrencyRatio(currencyRatio: string) {
        if (EXTRA_1030 || !currencyRatio || currencyRatio === '1:1') {
            return;
        }
        this.commonUIData.set('currencyRatio', currencyRatio);
    }

    public updateRound(roundId: string = '') {
        this.updateVersionVersionRound(this.ver1, this.ver2, roundId);
    }

    public updateCurrencyCode(code: string) {
        if (!EXTRA_1020_SETTING) {
            code = EXTRA_1020_DEFAULT ? code : '';
        }
        this.commonUIData.set('displaySettingCurrencySymbol', EXTRA_1020_SETTING);
        setCurrencyCode(code);
        this.commonUIData.set('currencyCode', code);
        this.commonUIData.set('currencySymbol', getCurrencyPrefix());
        this.commonUIData.set('currencySymbol2', getCurrencyPrefix2());
        this.commonUIData.set('currencyTail', getCurrencySuffix());
    }

    protected skipFunc: Function = null;

    public updateSkip(skip: boolean, func?: Function) {
        this.commonUIData.set('skip', skip);
        this.skipFunc = func;
    }

    public updateAnimation(able: boolean) {
        this.commonUIData.set('animation', able);
    }

    public spinEffect(able: boolean) {
        this.commonUIData.set('spinEffect', able, true);
    }

    public setTurbo(able:boolean) {
        setTickSpeed(able ? 8 : 1);
        if (able) {// turbo 模式 quickspin 用 2 階閃電，關閉後 0 階閃電。
            this.commonUIData.set('quickspin', 2);
        }
        if (this.commonUIData.allowTurbo && !able) {
            this.commonUIData.set('quickspin', 0);
        }
        this.commonUIData.set('allowTurbo', able);
    }

    public uiBetable(able: boolean, fg: boolean = false, isIdle?: boolean) {
        if (fg) {
            able = false;
        }
        setGameIdle(able);
        this.isIdle = isNone(isIdle) ? able : isIdle;

        if (this.slotPayLine) {
            this.slotPayLine.able = able;
        }
        this.uiData.set('betable', able);
        this.commonUIData.set('betable', able);
        this.commonUIData.set('allowSpin', able);

        this.commonUIData.set('allowStop', fg ? false : !able);
    }

    doCreateSpinData?(sd: SpinData, powerBet?: string): SpinData;

    fixFeatureBuyInfos?(infos: FeatureBuyInfo[]): FeatureBuyInfo2[];

    public createSpinData(featureBuyData: string = '', powerBet: string = '') {
        const sd = new SpinData();

        const level = Number(this.commonUIData.level);
        const lvs = this.machineInfo.getLevelsList().map(l => balanceNumber(l));
        const levelIndex = lvs.indexOf(level);

        // sd.setBet(this.getBetBase());
        sd.setLevel(levelIndex);

        if (featureBuyData) {
            const datas = featureBuyData.split('#');
            const key = datas[0];
            // const odds = Number(datas[1]);
            sd.setFeatureBuy(key);
        }
        sd.setTotalbet(safeMul(fixAmountNumber(level), this.getBetBase(powerBet)));

        sd.setType(SpinType.NORMALGAME);
        // if (this.getSelection && sd.setSelection) {
        //     sd.setSelection(this.getSelection());
        // }
        const sd1 = this.doCreateSpinData?.(sd, powerBet);
        return sd1 || sd;
    }

    /**
     * 部分舊公版遊戲切換 level 跳出 “是否確定切換投注等級？” 的 提示框
     * 使用鍵盤操作，不想跳出此 Alert，遊戲會判斷 keyDownEvent 是否為鍵盤輸入。
     *
     * 後續遊戲不再做這提示框，會影響操作體驗，
     * 取而代之，遊戲切換 level (有累積值的遊戲) 以各自 forgame 方式展演切換 level 的動畫。
     * 新公版遊戲，此參數目前暫暫無作用。
     */
    protected keyDownEvent: EventKeyboard = null;

    /**
     * Space or Enter
     * 按第一次按下立刻關閉 Loading 起始頁面
     * 按第二次才可以 spin
     */
    private isKeyUp:boolean = false;

    doKeyDown?(keyCode: KeyCode): boolean;

    /**
     * 按下 Space or Enter 處理事件
     * 原放在 onKeyDown 處理觸發事件
     * 不希望被 KEY_PRESSING 立即處理觸發事件（e.g.關閉掉彈出畫面、關閉 start page)
     * 需要額外再按一次，才處理觸發事件。
     */
    onKeyDown0(event: EventKeyboard) {
        const keyCode = event.keyCode;
        const space = keyCode === KeyCode.SPACE;
        const enter = keyCode === KeyCode.ENTER || keyCode === KeyCode.NUM_ENTER;
        const isSpaceOrEnter = space || enter;
        if (this.comm.loginState !== LoginState.LOGIN) {
            return;
        }

        if (htmlControlAlerted()) {
            if (this.spinStopAlertedAlertOpt && isSpaceOrEnter) { // 執行“是否切換成極速模式” Alert 的確認
                this.spinStopAlertedAlertOpt.btn1Click();
                this.spinStopAlertedAlertOpt = null;
                htmlControlHideAlert();
            }
        }
        if (!this.startClicked && isSpaceOrEnter) {
            hideDraLoading(true); // 強制空白直接關掉 loading 起始頁
            if (DEV) {
                this.startClicked = true;
            }
        }
    }

    onKeyDown(event: EventKeyboard) {
        const keyCode = event.keyCode;
        const up = keyCode === KeyCode.ARROW_UP;
        const down = keyCode === KeyCode.ARROW_DOWN;
        const left = keyCode === KeyCode.ARROW_LEFT;
        const right = keyCode === KeyCode.ARROW_RIGHT;
        const space = keyCode === KeyCode.SPACE;
        const enter = keyCode === KeyCode.ENTER || keyCode === KeyCode.NUM_ENTER;

        const num1 = keyCode === KeyCode.NUM_1 || keyCode === KeyCode.DIGIT_1;
        const num2 = keyCode === KeyCode.NUM_2 || keyCode === KeyCode.DIGIT_2;
        const num3 = keyCode === KeyCode.NUM_3 || keyCode === KeyCode.DIGIT_3;
        const num4 = keyCode === KeyCode.NUM_4 || keyCode === KeyCode.DIGIT_4;

        const commonUIData = this.commonUIData;
        if (this.comm.loginState !== LoginState.LOGIN) {
            return;
        }

        if (htmlControlAlerted()) {
            return;
        }
        if (!this.startClicked) {
            return;
        }
        if (left || right || down ||  up || num3 || num4) {
            if (!this.isIdle) {
                return;
            }
            if (!commonUIData.allowLevel) {
                return;
            }
            if (this.doKeyDown && this.doKeyDown(keyCode)) {
                return;
            }
            buttonAudioPlay();
            this.onLevelClick(undefined, (right || up || num4) ? BET_LEVEL_ACTION.MORE : BET_LEVEL_ACTION.LESS);
        } else if (num2) {
            if (this.commonUIData.autoRound) {
                this.onStopAutoClick();
            } else {
                if (this.isIdle) {
                    this.onAutoClick(INFINITY_MARK);
                }
            }
        } else if (num1) {
            if (!this.isIdle) {
                return;
            }
            buttonAudioPlay();
            this.onInfoClick();
            return;
        } else if (space || enter) {
            log('space');
            if (this.doKeyDown && this.doKeyDown(keyCode)) {
                return;
            }
            if (!this.isKeyUp) {
                return;
            }

            if (this.isIdle) {
                this.onSpinClick();
            } else {
                this.onStopClick();
            }
        }
    }
    onKeyUp(event: EventKeyboard) {
        this.isKeyUp = true;
    }

    onToggleAutoOptionClick() {
        this.saveBalanceCache();
    }

    // onStartPageClick(able: boolean) {
    //     setStartPage(able);
    // }

    /**
     *
     * request:
        * ```
        * 时间点：按下 spin 按钮 或 自动局
        * 用于：给转轴上一局资料，给转轴合理的图标带，开始转
        * ```
     * fail:
        * ```
        * this.updateRound(VERSION)
        * ```
     * ok:
        * 如果要等待某一段時間就要回傳 promise<void>
        * ```
        * this.lastSpinAt // 格式與 Date.now() 相同
        * this.updateRound(VERSION, '' + this.spinResult.getRoundId());
        * this.updateMessage(translate('LOBBY.message.good_luck'));
        * return null
        * ```
     */
    abstract doSpin(stat: DO_SPIN_STAT): Promise<any>;

    abstract onSpin(featureBuyData?: string, powerBet?: string): void;

    doResume?(resumeRes: ResumeRes, spinRes: SpinRes): void;

    protected spinStopAlertedAlertOpt:AlertOpt = null;
    protected spinStopAlerted: boolean = false;
    protected spinStopTimestamps: { t: 'spin' | 'stop', s: number }[] = [];

    public pushSpinStopTimestamp(type: 'spin' | 'stop', stamp: number) {
        const last = this.spinStopTimestamps[this.spinStopTimestamps.length - 1];
        if (last && last.t === type && type === 'stop') {
            return;
        }
        this.spinStopTimestamps.push({
            t: type,
            s: stamp,
        });
        const l = this.spinStopTimestamps.length;
        if (l > 10) {
            this.spinStopTimestamps.splice(0, l - 10);
        }
    }

    public needSpinStopAlert(): boolean {
        const commonUIData = this.commonUIData;
        if (this.spinStopAlerted || commonUIData.autoRound > 0) {
            return false;
        }
        let need = false;
        const ts = this.spinStopTimestamps;
        if (commonUIData.quickspin !== 2 && ts.length) {
            let spin = 0;
            let stop = 0;
            for (let i = ts.length - 1; i > 0; i -= 1) {
                const x = ts[i];
                if (x.t === 'spin') {
                    spin += 1;
                    if (spin >= 3) {
                        break;
                    }
                } else {
                    stop += 1;
                }
            }
            if (stop >= 3) {
                need = true;
            }
        }

        if (need) {
            this.spinStopAlerted = true;
            const alertOpt: AlertOpt = {
                visible: true,
                alertMsg: translate('COMMONUI.quick_msg'),
                btn1Text: translate('COMMONUI.quick_yes'),
                btn1Visible: true,
                btn1Color: '#6e83c8',
                btn1Click: () => {
                    this.commonUIData.set('quickspin', 2);
                },
                btn2Text: translate('COMMONUI.quick_no'),
                btn2Visible: true,
                btn2Color: '#6e83c8',
                btn2Click: () => {
                    // do nothing
                },
            };
            this.spinStopAlertedAlertOpt = alertOpt;
            htmlControlShowAlert(alertOpt);
            // addTransparentButton(this.node, o.btn1Click);
        }
        return need;
    }

    onSpinClick() {
        const bonusIdle = getBonusIdle();
        if (!bonusIdle) {
            return;
        }
        if (this.comm.isRequestPending()) { // 四種核心請求之一在途：等回應才放行，不可送出第二個
            return;
        }
        if (getSkillCardManager().isUsePending()) { // 技能卡使用確認中：鎖起轉，避免搶出正常投注局
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：使用確認中 忽略 SPIN');
                }
            }
            return;
        }
        if (getSkillCardManager().isDrawing()) { // 技能卡領取中：SPIN 鍵改為「領取下一局」
            if (!this.isIdle) {
                return; // 演出中不可操作
            }
            this.ui.commonUIManager.closePanel();
            this.skillCardPlayer?.onSpinPressed();
            return;
        }
        // 展演中不可投注
        if (!this.isIdle) {
            return;
        }
        if (this.needSpinStopAlert()) {
            return;
        }
        this.pushSpinStopTimestamp('spin', Date.now());
        this.ui.commonUIManager.closePanel();
        this.onSpin();
    }

    abstract doStop(stat: DO_STOP_STAT): void;

    abstract onStop(): void;

    onStopClick() {
        this.pushSpinStopTimestamp('stop', Date.now());
        this.ui.commonUIManager.closePanel();
        this.onStop();
    }

    onSpinStopClick() {
        // if (0) { // auto
        //     this.onStopAutoClick();
        // }
        if (this.isIdle) {
            this.onSpinClick();
        } else {
            this.onStopClick();
        }
    }

    onAutoStopAutoClick() {
        if (this.commonUIData.autoRound) {
            this.onStopAutoClick();
        } else {
            const cui = this.ui.commonUIManager.commonUI;
            cui.onAutoPanelToggleClick();
        }
    }

    onQuickspinClick() {
        const cui = this.ui.commonUIManager.commonUI;
        const data = cui.getData();
        const prev = data.quickspin;
        const value = cui.rotateQuickspin();
        this.doQuickspinClick?.(prev, value);
    }

    doQuickspinClick?(prev: number, value: number): void;

    onLevelPanelToggleClick() {
        const cui = this.ui.commonUIManager.commonUI;
        const settingAble = cui.toggleLevelPanel();
        // 如果打开 setting，关 menu
        if (settingAble) {
            cui.closePanel({ level: true });
            cui.toggleMenu(false);
        }
    }

    onMenuToggleClick() {
        const cui = this.ui.commonUIManager.commonUI;
        cui.toggleMenu();
    }

    autoRoundViewCallback(value: string, label: Label) {
        if (value !== INFINITY_MARK) {
            label.string = value;
        } else {
            label.string = '';
        }
    }

    onLevelClick(x: any, data: any) {
        if (getSkillCardManager().isDrawing()) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：領取中禁止調整倍率');
                }
            }
            return;
        }
        let str: string;
        if (typeof x === 'string') {
            str = x;
        } else if (typeof x !== 'string' && typeof data === 'string') {
            str = data;
        } else {
            debugger;
        }
        if (!this.isIdle) {
            return;
        }
        if (!this.commonUIData.allowLevel) {
            return;
        }
        if (str === BET_LEVEL_ACTION.MORE || str === BET_LEVEL_ACTION.LESS) {
            const lvs = this.commonUIData.levels;
            const lv = this.commonUIData.level;
            const idx = lvs.indexOf(lv);
            if (idx > 0 && str === BET_LEVEL_ACTION.LESS) {
                this.updateLevel(Number(lvs[idx - 1]));
            } else if (idx < lvs.length - 1 && str === BET_LEVEL_ACTION.MORE) {
                this.updateLevel(Number(lvs[idx + 1]));
            }
        } else {
            this.updateLevel(Number(str));
        }
    }

    onAutoClick(autoString: string) {
        if (getSkillCardManager().isDrawing()) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：領取中禁止使用自動旋轉');
                }
            }
            return;
        }
        if (!this.isIdle) {
            return;
        }
        const len = autoString === INFINITY_MARK ? Infinity : Number(autoString) - 1;
        this.main.ga.setIsAutoSpin(true, len + 1);
        this.updateAutoRound(len);
        this.saveBalanceCache();
        this.onSpinClick();
    }

    onStopAutoClick() {
        if (this.commonUIData.autoRound) { // 先停自动
            this.updateAutoRound(0);
            this.setTurbo(false);
            this.doStop(DO_STOP_STAT.BUTTON_AUDIO);
            return;
        }
    }

    // 系統選單
    onRecordClick() {
        if (!BTN_RECORD) {
            return;
        }
        reportClick(this.main.getGameId(), getCurrencyISO(), 'record');
        this.main.toggleRecord(true);
    }

    onInfoClick() {
        reportClick(this.main.getGameId(), getCurrencyISO(), 'info');
        this.main.toggleInfo(true, {
            cur: this.commonUIData.displayCurrencySymbol ? getCurrencyISO() : '',
            bb: this.getBetBase(),
            tb: safeMul(this.getBetBase(), Number(this.commonUIData.level)),
            pb: this.commonUIData.powerBet ? '1' : '0',
        });
    }

    onLobbyClick() {
        const callback = (code: MsgCode) => {
            this.main.getLoading().toggle(false);
            if (code === MsgCode.SUCCESS) {
                const isFromLobby = getIsLoginFromLobby();
                const hasParent = hasWindowParent();
                if (BACK_URL || (isFromLobby && hasParent)) {
                    this.main.offline('', -1);
                } else {
                    this.main.offline(translateError('NETWORK.sys_disconnected', -1), -1);
                }
            } else {
                const r = new Result();
                r.setCode(code);
                const hbr = new HeartbeatRes();
                handleError(r, this.main, this.comm, hbr);
            }
        };
        const music = audioEnabled() ? '1' : '0';
        const sound = audioEnabled() ? '1' : '0';
        this.main.getLoading().toggle(true);
        reportClick(this.main.getGameId(), getCurrencyISO(), 'home');
        analyticsClick({ clickType: ClickType.HOME, clickTime: Date.now() });
        backToLobby(this.comm, callback, this.main.token, music, sound, getLang());
    }

    private runMonkeySpin: any = null;
    /**
     * 簡易亂送資料
     * @param interval 間隔時間
     * @param monkeySpin 自定義亂打 func
     */
    private simpleMonkey(interval:number = 0.03, monkeySpin: (lobby:LobbyBase) => void = simpleMonkeySpin) {
        if (DEBUG) {
            if (this.runMonkeySpin) {
                this.unschedule(this.runMonkeySpin);
                this.runMonkeySpin = null;
                log('monkey stop');
            }else {
                const scheduledSpin = () => monkeySpin(this);
                this.runMonkeySpin = scheduledSpin;
                this.schedule(this.runMonkeySpin, interval);
                log('monkey work');
            }
        }
    }
}

function deserializePako(pako: string, pako2: string, pako3?:string): SpinRes {
    if (pako3) {
        return recordDetailLogToSpinResult(pako3);
    }
    if (pako && pako2) {
        warn('pako + pako2');
    }
    const decompress = pako;
    const str = atob(pako || pako2);
    let u8arr = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
    if (decompress) {
        const zlib = window['Zlib'];
        u8arr = new zlib.Inflate(u8arr).decompress();
    }
    return SpinRes.deserializeBinary(u8arr);
}

function recordDetailLogToSpinResult(recordDetailLogStr:string):SpinRes {
    if (DEBUG) {
        const recordDetailLog = JSON.parse(recordDetailLogStr);
        const roundInfos = recordDetailLog.roundInfosList.map((r) => {
            // TODO : add ronudInfo.setIsMaxWin()
            const ri = new RoundInfo();
            ri.setTotalwin(r.totalwin);
            ri.setSpinType(r.spinType);
            ri.setSymbolsList(r.symbolsList.map((s) => {
                const symbol = new Symbol();
                symbol.setSymbolType(s.symbolType);
                symbol.setX(s.x);
                symbol.setY(s.y);
                symbol.setLevel(s.level);
                return symbol;
            }));
            ri.setNextList(r.nextList.map((s) => {
                const symbol = new Symbol();
                symbol.setSymbolType(s.symbolType);
                symbol.setX(s.x);
                symbol.setY(s.y);
                symbol.setLevel(s.level);
                return symbol;
            }));
            ri.setLinesList(r.linesList.map((l) => {
                const li = new LineInfo();
                li.setId(l.id);
                li.setType(l.type);
                li.setSymbolType(l.symbolType);
                li.setWin(l.win);
                li.setLevel(l.level);
                li.setCount(l.count);
                li.setNum(l.num);
                li.setSymbolsList(l.symbolsList.map((s) => {
                    const symbol = new Symbol();
                    symbol.setSymbolType(s.symbolType);
                    symbol.setX(s.x);
                    symbol.setY(s.y);
                    symbol.setLevel(s.level);
                    return symbol;
                }));
                return li;
            }));
            return ri;
        });

        const result = new Result();
        result.setCode(1);
        const spinResult = new SpinResult();
        spinResult.setRoundInfosList(roundInfos);

        const spinRes = new SpinRes();
        spinRes.setResult(result);
        spinRes.setSpinResult(spinResult);
        return spinRes;
    }
}

function simpleMonkeySpin(lobby:LobbyBase) {
    if (DEBUG) {
        const range = 400;
        const randomStr = () =>  {
            const baseLen = 20;
            const min = 3;
            const max = 18;
            const base = Math.random().toString(36).slice(2, 2 + baseLen);
            const len = Math.floor(Math.random() * (max - min + 1)) + min;
            return base.slice(0, len);
        };

        // @ts-ignore
        const observer = lobby.comm.generateAnyObserver(
            (res: SpinRes) => {
                // const result = res.getResult();
                // const code = result.getCode();
                // if (code !== MsgCode.SUCCESS) {
                //     log('SpinRes error');
                //     return;
                // }
            },
            (err: any) => {

            },
        );

        const spinData = new SpinData();
        const level = random(-range, range);
        spinData.setFeatureBuy(randomStr());
        spinData.setLevel(random(-range, range));
        spinData.setBet(random(-range, range));
        spinData.setTotalbet(safeMul(fixAmountNumber(level), lobby.getBetBase()));
        spinData.setType(random(-range, range));
        spinData.setSelection(random(-range, range));
        spinData.setFreegameSelection(random(-range, range));
        // @ts-ignore
        lobby.comm.requestSpin(spinData, observer);
        log('monkey spin ', Date.now());
    }
}
