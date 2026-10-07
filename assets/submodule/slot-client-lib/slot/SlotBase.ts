import { _decorator, CCBoolean, Component, Node, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { convertToNodeSpaceARVec2, error, identity, isNone, log, random, vecXToVec3, warn } from '../../game-client-lib/utils/Utils';
import { Symbol, SymbolType } from '../protobuf/ProtobufWarp';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_REEL_STATUS, SLOT_SYMBOL_STATUS, SlotReelsTimeConfig, SlotReelTimeConfig, SlotTimeConfig } from './SlotData';
import SlotReel, { extractSymbolType, SlotReelSymbol } from './SlotReel';
import StripManager, { StripData } from './StripManager';

const { ccclass, property } = _decorator;

export enum SLOT_SPIN_MODE {
    NORMAL = 'ng',
    FREE = 'fg',
    FREE2 = 'fg2',
    BONUS = 'bg',
    BONUS2 = 'bg2',
    FEATURE_BUY_FREE = 'feature_buy_free',
    FEATURE_BUY_FREE2 = 'feature_buy_free2',
    FEATURE_BUY_BONUS = 'feature_buy_bonus',
    FEATURE_BUY_BONUS2 = 'feature_buy_bonus2',
    FEATURE_BUY_FEATURE = 'feature_buy_feature',
    MODE0 = 'm0',
    MODE1 = 'm1',
    MODE2 = 'm2',
    MODE3 = 'm3',
    MODE4 = 'm4',
    MODE5 = 'm5',
    FEATURE_BUY_MODE0 = 'feature_buy_m0',
    FEATURE_BUY_MODE1 = 'feature_buy_m1',
    FEATURE_BUY_MODE2 = 'feature_buy_m2',
    FEATURE_BUY_MODE3 = 'feature_buy_m3',
    FEATURE_BUY_MODE4 = 'feature_buy_m4',
    FEATURE_BUY_MODE5 = 'feature_buy_m5',
}

export class SlotReelSpinReelData {
    constructor(
        public result: SlotReelSymbol[] = [],
        public loop: SlotReelSymbol[] = [],
        public last: SlotReelSymbol = '',
        public prev: SlotReelSymbol = '',
        public freeze: boolean = false,
        public delta: number = 0,
    ) {

    }
}

export function isSA(t: SlotReelSymbol) {
    return extractSymbolType(t) === SymbolType.SA;
}

export function hasSA(ids: SlotReelSymbol[]) {
    return ids.some(isSA);
}

export function isWD(t: SlotReelSymbol) {
    return extractSymbolType(t) === SymbolType.WD;
}

export function hasWD(ids: SlotReelSymbol[]) {
    return ids.some(isWD);
}

export function isFG(t: SlotReelSymbol) {
    return extractSymbolType(t) === SymbolType.FG;
}

export function hasFG(ids: SlotReelSymbol[]) {
    return ids.some(isFG);
}

export function isFG2(t: SlotReelSymbol) {
    return extractSymbolType(t) === SymbolType.FG2;
}

export function hasFG2(ids: SlotReelSymbol[]) {
    return ids.some(isFG2);
}

export function isSC(t: SlotReelSymbol) {
    const t2 = extractSymbolType(t);
    switch (t2) {
    case SymbolType.SC:
    case SymbolType.SC2:
    case SymbolType.SC3:
    case SymbolType.SC4:
    case SymbolType.SC5:
    case SymbolType.SC6:
    case SymbolType.SC7:
    case SymbolType.SC8:
    case SymbolType.SC9:
    case SymbolType.SC10:
    case SymbolType.SC11:
    case SymbolType.SC12:
    case SymbolType.SC13:
    case SymbolType.SC14:
    case SymbolType.SC15:
    case SymbolType.SC16:
    case SymbolType.SC17:
    case SymbolType.SC18:
    case SymbolType.SC19:
    case SymbolType.SC20:
    case SymbolType.SC21:
    case SymbolType.SC22:
    case SymbolType.SC23:
    case SymbolType.SC24:
    case SymbolType.SC25:
    case SymbolType.SC26:
    case SymbolType.SC27:
    case SymbolType.SC28:
    case SymbolType.SC29:
    case SymbolType.SC30:
        return true;
    default:
        return false;
    }
}

export function hasSC(ids: SlotReelSymbol[]) {
    return ids.some(isSC);
}

export function initStripMap(arr: [string, { [s: string]: string[] }], index: number = random(20)): StripData[] {
    const k = arr[0];
    const strip = arr[1];
    const ks = Object.keys(strip);
    return ks.map((key, i) => {
        return {
            index,
            strip: strip[key],
            key: k + '_' + i,
            generator: null,
            custom: null,
        };
    });
}

export function symbolReducer(acc: SlotReelSymbol[][], a: Symbol): SlotReelSymbol[][] {
    const x = a.getX();
    const y = a.getY();
    if (!acc[x]) {
        acc[x] = [];
    }
    const type = a.getSymbolType();
    acc[x][y] = '' + type;
    return acc;
}

export function symbolReducerCreator<T extends SlotReelSymbol[][]>(symbolLengthOrLengthArray: number | number[], each?: (s: Symbol) => string) {
    const len: number = Array.isArray(symbolLengthOrLengthArray) ? -1 : symbolLengthOrLengthArray;
    const arr: number[] = Array.isArray(symbolLengthOrLengthArray) ? symbolLengthOrLengthArray : [];
    return (acc: T, a: Symbol) => {
        const x = a.getX();
        const y = a.getY();
        if (!acc[x]) {
            acc[x] = [];
        }
        const l = (len === -1) ? arr[x] : len;
        const type = a.getSymbolType();
        acc[x][l - 1 - y] = each ? each(a) : ('' + type);
        return acc;
    };
}

export function applyTempoStringToSlot(str: string, slots: SlotBase[]) {
    // 3001!0.5;0.3;;0.3;100;0.1;0.22;110;0.05

    // 第一軸開始停(s)	0.5
    // 每軸轉動間隔時間(s) 0.1
    // 每軸個別轉動延遲時間[(s)]
    // 停軸間距(s)	0.3
    // 每軸個別停軸間距時間
    // 第一軸開始停(s)後，每軸轉多久後停開始停止[(s)] (不支援瞇牌)

    // 向上時間(s)	0.3
    // 向上幅度(px)	100
    // 圖標滾動的速度(s)	0.1
    // 向下時間(s)	0.22
    // 向下幅度(px)	110
    // 瞇牌向上時間(s)
    // 瞇牌向上幅度(px)
    // 瞇牌圖標滾動的速度(s)
    // 瞇牌向下時間(s)
    // 瞇牌向下幅度(px)
    const each = (str: string) => {
        if (!str) {
            return;
        }
        const timeConfig = new SlotTimeConfig();
        const reelsConfig = new SlotReelsTimeConfig();
        const reelConfig = new SlotReelTimeConfig();

        timeConfig.timeConfig = reelsConfig;
        timeConfig.reelTimeConfig = reelConfig;

        const props = str.split(';');
        reelsConfig.firstStopSec          = Number(props[0]);
        reelsConfig.startSequenceDuration = Number(props[1]);
        reelsConfig.startSequenceFix      = props[2].length > 0 ? props[2].split(',').map(v => Number(v)) : [];
        reelsConfig.stopSequenceDuration  = Number(props[3]);
        reelsConfig.stopSequenceFix       = props[4].length > 0 ? props[4].split(',').map(v => Number(v)) : [];
        reelsConfig.afterFirstStopSecStopTimes  = props[5].length > 0 ? props[5].split(',').map(v => Number(v)) : [];

        reelConfig.startDuration          = Number(props[6]);
        reelConfig.startPx                = Number(props[7]);
        reelConfig.loopDuration           = Number(props[8]);
        reelConfig.stopDuration           = Number(props[9]);
        reelConfig.stopPx                 = Number(props[10]);

        if (props[13]) { // MI牌
            const squeezeReelConfig = new SlotReelTimeConfig();
            timeConfig.squeezeReelTimeConfig    = squeezeReelConfig;
            squeezeReelConfig.startDuration     = Number(props[11]);
            squeezeReelConfig.startPx           = Number(props[12]);
            squeezeReelConfig.loopDuration      = Number(props[13]);
            squeezeReelConfig.stopDuration      = Number(props[14]);
            squeezeReelConfig.stopPx            = Number(props[15]);
        }
        return timeConfig;
    };

    str.split('!').forEach((str, idx) => {
        if (idx === 0) {
            return;
        }
        const slot = slots[idx - 1];
        if (!slot) {
            return;
        }
        str.split('$').forEach((s, i) => {
            slot.timeConfigs[i] = each(s);
        });
    });
}

export class SlotSpinData {
    constructor(
        public reels: Partial<SlotReelSpinReelData>[] = [],
        public feature: boolean = false,
        public delta: number = 0,
        public mode: SLOT_SPIN_MODE | string = '',
        public custom: any = null,
        public skipSqueeze: boolean = false,
        public delta0: number = 0, // 部分遊戲(3081、3086 等)FreeRound 有使用到。
        public quick: number = 0,
        public squeezeDur: number = 0,
        public firstStopSecOffset:number = 0, // NG FirstStopSec 參數動態調整，詳情：SlotLobbyBase.calFirstStopSecOffset()
    ) {

    }
}

class SlotTimeData {
    constructor(
        public reels: Partial<SlotTimeReelData>[] = [],
    ) { }
}

class SlotTimeReelData {
    public stopped: boolean;
    public squeezed: boolean;
    constructor(
        public reelIndex: number,
        /** 瞇牌 */
        public squeeze: string,
        public squeezeTime: number,
        public startTime:number,
        public stopTime: number,
        public stoppedTime: number,
        public quick: boolean,
        public reel: SlotReel,
    ) { }
}

export function beforeStopPrevLastShiftOnly1(symbolTypes: SymbolType[], loop: SlotReelSymbol[]) {
    const arr: SlotReelSymbol[] = [];
    let i = 0;
    for (; i < loop.length; i += 1) {
        const s = loop[i];
        const t = extractSymbolType(s);
        if (symbolTypes.indexOf(t) === -1) {
            arr.push(s);
        }
        if (arr.length === 2) {
            break;
        }
    }
    return {
        prev: arr[0],
        last: arr[1],
        shift: i + 1,
    };
}

export function beforeSpinOnly1(symbolTye: SymbolType, reelLength: number, symbols: SlotReelSymbol[], loop: SlotReelSymbol[]): number {
    const t = '' + symbolTye;
    const si = symbols.indexOf(t);
    const li = loop.indexOf(t);
    if (si !== -1 && li < reelLength) {
        // si           li
        // [x,31,x,x,x] [31,x,x,x,x,x]，可接受
        // si = 1, li = 0
        // [x,x,31,x,x] [31,x,x,x,x,x,x]，不可接受
        // si = 2, li = 0
        if (si > li + 1) {
            return li + 1;
        }
    }
    return 0;
}

export type SlotBeforeStopReturnObject = {
    symbols: SlotReelSymbol[],
    appends?: SlotReelSymbol[],
    prev: SlotReelSymbol,
    last: SlotReelSymbol,
    shift: number,
};

export type SlotBeforeSpinReturnObject = {
    skip: number,
    appends?: SlotReelSymbol[],
    loop?: SlotReelSymbol[],
};

export type SlotSqueezeCheckReturnObject = {
    squeeze: string,
    length: number,
};

/**
 * 转轴基础
 * 1. 遮照自行处理，或许是可共用的遮照，不需要每个轴都做
 */
@ccclass
export default abstract class SlotBase extends Component implements ISlot {

    // @property(SlotReelsTimeConfig)
    // timeConfig: SlotReelsTimeConfig = null;

    // @property(SlotReelTimeConfig)
    // reelTimeConfig: SlotReelTimeConfig = null;

    // @property(SlotReelTimeConfig)
    // squeezeReelTimeConfig: SlotReelTimeConfig = null;

    @property([SlotTimeConfig])
    timeConfigs: SlotTimeConfig[] = [];

    @property([SlotReel])
    reels: SlotReel[] = [];

    @property(CCBoolean)
    autoTop: boolean = false;

    @property(CCBoolean)
    autoToggleTopBottom: boolean = false;

    @property({
        type: Node,
        tooltip: '爆框的節點',
    })
    topNode: Node = null;

    private stripManager: StripManager = null;

    private lastSpinAt: number = 0;

    public getStripManager(): StripManager {
        return this.stripManager;
    }

    public revReducer: (map: SlotReelSymbol[][], s: Symbol) => SlotReelSymbol[][] = null;

    public get reverseReducer() {
        if (!this.revReducer) {
            this.revReducer = symbolReducerCreator(this.reels.map(r => r.length));
        }
        return this.revReducer;
    }

    public initStrip(stripDatas: StripData[]) {
        log('stripDatas : ', stripDatas);
        this.stripManager = new StripManager();

        stripDatas.forEach((data) => {
            this.stripManager.set(data);
        });

        this.reels.forEach((reel, index) => {
            const symbols = this.stripManager.get2(SLOT_SPIN_MODE.NORMAL, index);
            const len = reel.getTotal();
            this.stripManager.addIndex2(SLOT_SPIN_MODE.NORMAL, index, len - 1);
            const ss = symbols.slice(0, len);
            reel.setSymbols(ss, SLOT_SYMBOL_STATUS.NORMAL);
        });
    }

    beforeStop?(reelIndex: number, symbols: SlotReelSymbol[], loop: SlotReelSymbol[], squeeze: string): SlotBeforeStopReturnObject;

    /**
     * 時間點：已可以停軸，在 stopCondition 之後
     * 用於：瞇牌
     * @param reelIndex
     * @param next
     */
    squeeze?(reelIndex: number): void;

    squeezeCheck?(reelIndex: number): SlotSqueezeCheckReturnObject;

    /**
     * 時間點：快停下來時，只剩回彈
     * 用於：播放停軸音效
     * @param reelIndex
     */
    almostStop?(reelIndex: number): void;

    /**
     * 時間點：停軸後，在 almostStop 後
     * 用於：清除瞇牌動畫，長 Wild 展演
     * @param reelIndex
     * @param next
     */
    afterStop?(reelIndex: number, next: () => void): void;

    afterAllStopped?(): void;

    /**
     * 時間點：lateUpdate 後
     * 用於：微調 symbol 位置，讓它前後或捲軸效果，可參考 3003、3011
     */
    doLateUpdate?(reelIndex: number, nodes: Node[], percent: number): void;

    /**
     * 時間點：軸旋轉前
     * 用于：判断之后的图标带是否合理
     * 预设应回传 0，1 代表要跳过一格
     * 与 stopCondition 成对
     * @returns number strip 跳過的數量
     * @returns [number, SlotReelSymbol[]] [strip 跳過的數量, 要添加在跳過之前的圖標 ]
     */
    beforeSpin?(reel: SlotReel, loop: SlotReelSymbol[]): SlotBeforeSpinReturnObject;

    /**
     * 時間點：全軸旋轉後
     */
    afterSpin?(): void;

    /**
     * 時間點：呼叫 stopAll 時
     */
    doStopAll?(): void;

    getSymbolPriority?(): SymbolType[];

    private lastReelIndex: number = 0;

    protected spinning: boolean = false;

    protected stopping: boolean = false;

    private promise: Promise<any> = null;

    private resolve: Function = null;

    public data: SlotSpinData = new SlotSpinData();

    // 可停时使用
    private delta: number = -1;

    // spin 时设定，用于计算是否已可停
    private delta0: number = 0;

    public isIdle() {
        return !this.spinning;
    }

    public isSpinning() {
        return this.spinning;
    }

    public isStopping() {
        return this.stopping;
    }

    public isFeature(): boolean {
        return this.data ? this.data.feature : false;
    }

    /**
     * 已改為順序由上到下
     */
    public getCacheSymbol(): SlotReelSymbol[][] {
        return this.reels.map((reel) => {
            return reel.getAllSymbolsReverse();
        });
    }

    /**
     * 畫面上目前的盤面，供 spin 失敗回轉當作停軸資料。
     * slotSymbols 為 length + 2 格（由下到上），中間 length 格為盤面、
     * 順序與 symbolReducerCreator 產生的 result 一致；
     * prev / last 為上下各一格 buffer，上下會露出的機台需要它們才能完全還原。
     */
    public getScreenReels(): Partial<SlotReelSpinReelData>[] {
        return this.reels.map((reel) => {
            const ss = reel.getAllSymbols();
            return {
                result: ss.slice(1, reel.length + 1),
                prev: ss[0],
                last: ss[reel.length + 1],
            };
        });
    }

    /**
     * 已改為順序由上到下
     */
    public setCacheSymbol(symbols: SlotReelSymbol[][], status: SLOT_SYMBOL_STATUS | PREV_SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.NORMAL, force: boolean = false) {
        this.reels.forEach((reel, index) => {
            const ss = symbols[index].slice().reverse();
            reel.setSymbols(ss, status, force);
        });
    }

    onLoad() {
        this.refresh();
    }

    public refresh(force: boolean = false) {
        this.almostStopHandler = this.almostStopHandler.bind(this);
        this.stopHandler = this.stopHandler.bind(this);
        this.stoppedHandler = this.stoppedHandler.bind(this);

        this.reels.forEach((slotReel, index) => {
            if (slotReel.index !== -1 && !force) {
                return;
            }
            slotReel.slot = this;
            slotReel.index = index;
            slotReel.stripIndex = index;
            slotReel.almostStopHandler = this.almostStopHandler;
            slotReel.stopHandler = this.stopHandler;
            slotReel.stoppedHandler = this.stoppedHandler;
            slotReel.doLateUpdate = this.doLateUpdate;
            slotReel.pre();
        });
    }

    private genReelData(data: Partial<SlotReelSpinReelData>, index: number): SlotReelSpinReelData {
        if (!data.result) {
            data.result = this.reels[index].getSymbols();
        }
        return new SlotReelSpinReelData(data.result, data.loop, data.last, data.prev, data.freeze, data.delta);
    }

    private genData(data: Partial<SlotSpinData>, prev: SlotSpinData = null): SlotSpinData {
        if (!data.mode) {
            error('SpinData must have mode');
            throw new Error('SpinData must have mode');
        }

        // 补 reels
        if (!data.reels || !data.reels.length) {
            data.reels = this.reels.map(() => { return {}; });
        }
        if (prev && prev.firstStopSecOffset) {
            data.firstStopSecOffset = prev.firstStopSecOffset;
        }
        return new SlotSpinData(data.reels.map(this.genReelData.bind(this)), data.feature, data.delta, data.mode, data.custom, data.skipSqueeze, data.delta0, data.quick, data.squeezeDur, data.firstStopSecOffset);
    }

    private getTimeConfig(quick: number) {
        return this.timeConfigs[quick];
    }

    doApplyTimeConfig?(quick: number): void;

    private applyTimeConfig(quick: number) {
        if (this.doApplyTimeConfig) {
            this.doApplyTimeConfig(quick);
            return;
        }
        const tc = this.getTimeConfig(quick);
        this.reels.forEach((r) => {
            r.timeConfig = tc.reelTimeConfig;
            r.squeezeTimeConfig = tc.squeezeReelTimeConfig || tc.reelTimeConfig;
        });
    }

    /**
     * 开始转到停
     * @param data
     */
    public spin(data: Partial<SlotSpinData>): Promise<any> {
        if (DEBUG) {
            // tslint:disable-next-line:no-console
            // console.time('spin');
        }
        // 重设资料
        const d = this.genData(data);
        // log('spin', d);
        this.delta0 = 0;
        this.delta = d.delta;
        this.stopping = false;
        this.spinning = true;
        const p = new Promise((resolve) => {
            this.resolve = resolve;
        });
        this.promise = p;
        this.showSymbols();
        this.data = d;
        this.spinFailStopping = false;
        this.lastReelIndex = -1;

        let freezed: number = 0;
        const mode = d.mode;
        let i = 0;
        const tc = this.getTimeConfig(d.quick);
        this.applyTimeConfig(d.quick);
        const startDur = tc.timeConfig.startSequenceDuration;
        const startDurArr = tc.timeConfig.startSequenceFix;
        const quick = (d.quick === 2);
        this.lastSpinAt = Date.now();
        this.reels.forEach(async (reel, index) => {
            const reelData = d.reels[index];
            if (reelData.freeze) {
                reel.status = SLOT_REEL_STATUS.STOPPED;
                freezed += 1;
            } else {
                reel.status = SLOT_REEL_STATUS.IDLE;
                reel.setHasLooped(false);
                this.lastReelIndex = reel.index;
                let loop = (reelData.loop && reelData.loop.length !== 0) ? reelData.loop : this.stripManager.get2(mode, reel.stripIndex);
                const { skip, appends, loop: loop2 } = this.beforeSpin?.(reel, loop) || { skip: 0, appends: [], loop: [] };
                if (skip) {
                    this.stripManager.addIndex2(mode, reel.stripIndex, skip);
                    loop = this.stripManager.get2(mode, reel.stripIndex);
                }
                if (loop2.length) {
                    loop = loop2;
                }
                reelData.loop = loop;
                const next = () => {
                    this.toggleTopBottom(true, index); // 滾輪轉動時，上下必定 activie 顯示出來
                    if (appends && appends.length) {
                        reel.spin(appends.concat(...loop), 0, 0, quick);
                    } else {
                        reel.spin(loop, 0, 0, quick);
                    }
                };

                let startDelay = i * startDur;
                if (startDurArr.length) {
                    const dur = startDurArr[i];
                    startDelay = dur ? dur : 0;
                }
                this.scheduleOnce(next, startDelay);
                i += 1; // 調整成第一軸 不吃 每軸轉動間隔時間(s)
            }
        });

        this.afterSpin?.();

        // 全部都被冰
        if (freezed === this.reels.length) {
            // 不进 update
            this.delta0 = -1;
            this.delta = -1;
            // 暂时 1s 后结束
            this.scheduleOnce(this.allStopped.bind(this), 1);
        } else if (this.delta !== -1) {
            this.timeData = this.calTimeData();
        }
        return p;
    }

    /**
     * 先转然后才停
     * @param data 預設與 spin 資料一致
     */
    public spin2(data: Partial<SlotSpinData>): Promise<any> {
        const d = this.genData(data, this.data);
        // if (DEBUG) {
        //     // tslint:disable-next-line:no-console
        //     console.timeEnd('spin');
        //     // tslint:disable-next-line:no-console
        //     console.time('spin2');
        // }
        this.delta = d.delta;
        const tc = this.getTimeConfig(d.quick);
        this.applyTimeConfig(d.quick);
        if (d.delta0) {
            if (tc.timeConfig.firstStopSec && this.delta0 < tc.timeConfig.firstStopSec) {
                d.delta0 = d.delta0 + tc.timeConfig.firstStopSec - this.delta0;
            }
            this.delta0 = 0;
        }
        this.data = d;
        this.reels.forEach((reel, index) => {
            reel.setHasLooped(false);
            const reelData = d.reels[index];
            if (reelData.loop && reelData.loop.length !== 0) {
                reel.updateLoop(reelData.loop);
            }
        });
        this.timeData = this.calTimeData();
        return this.promise;
    }

    public timeData: SlotTimeData = null;

    private calTimeData(): SlotTimeData {
        const reels = this.reels;
        const data = this.data;
        const tc = this.getTimeConfig(data.quick);

        const td: SlotTimeData = new SlotTimeData();
        const squeezeDur = data.squeezeDur;
        const seqDur = tc.timeConfig.stopSequenceDuration;
        const afterFirstStopSecStopTimes = tc.timeConfig.afterFirstStopSecStopTimes;
        const quick0 = data.quick === 0;
        const quick1 = data.quick === 1;
        const quick2 = data.quick === 2;
        if (quick0 || quick1) {
            const groups: number[][] = reels.map((reel, reelIndex) => {
                const rd = data.reels[reelIndex];
                let group = reelIndex;
                if (tc.timeConfig.stopSequenceGroup.length) {
                    group = tc.timeConfig.stopSequenceGroup[reelIndex];
                    if (typeof group === 'undefined') {
                        debugger;
                    }
                }

                if (rd.freeze) {
                    return null;
                }
                return {
                    group,
                    reelIndex,
                };
            }).filter(identity).reduce(
                (accu, a) => {
                    const g = a.group;
                    if (!accu[g]) {
                        accu[g] = [];
                    }
                    accu[g].push(a.reelIndex);
                    return accu;
                },
                [],
            ).filter(identity);
            for (let i = 0; i < groups.length; i += 1) {
                const group = groups[i];
                const arr: SlotTimeReelData[] = [];
                const lastReel = td.reels.length ? td.reels[td.reels.length - 1] : null;
                const lastReelIndex = lastReel ? lastReel.reelIndex : 0;
                const lastStopTime = lastReel ? lastReel.stopTime : 0;
                const lastStoppedTime = lastReel ? lastReel.stoppedTime : 0;
                const startSequenceFix = tc.timeConfig.startSequenceFix;
                const startTime = startSequenceFix.length > 0 ? startSequenceFix[lastReelIndex] : tc.timeConfig.startSequenceDuration;
                for (let j = 0; j < group.length; j += 1) {
                    const reelIndex = group[j];
                    const reel = this.reels[reelIndex];
                    let fix = 0;
                    if (tc.timeConfig.stopSequenceGroup.length) {
                        const gid = tc.timeConfig.stopSequenceGroup[reelIndex];
                        fix = tc.timeConfig.stopSequenceFix[gid] || 0;
                        // if (typeof fix === 'undefined') {
                        //     debugger;
                        // }
                    } else if (tc.timeConfig.stopSequenceFix.length) {
                        fix = tc.timeConfig.stopSequenceFix[reelIndex];
                    }
                    let squeeze = '';
                    let squeezeTime = 0;
                    let squeezeLen = 0;
                    if (quick0 && !data.skipSqueeze && this.squeezeCheck) {
                        const o = this.squeezeCheck(reel.index);
                        squeeze = o.squeeze;
                        squeezeLen = o.length;
                    }
                    let stopTime = afterFirstStopSecStopTimes.length > 0 ? afterFirstStopSecStopTimes[i] + fix : lastStopTime + seqDur + fix;
                    const stopDuration = reel.timeConfig.stopDuration;
                    if (squeeze) {
                        squeezeTime = lastStoppedTime;
                        stopTime = squeezeTime + squeezeDur;
                        if (squeezeDur === 0) {
                            warn('slot squeeze but no squeezeDur');
                        }
                    } else if (lastReel && lastReel.squeeze) {
                        stopTime = afterFirstStopSecStopTimes.length > 0 ? afterFirstStopSecStopTimes[i] : lastStoppedTime + seqDur;
                    }
                    const stoppedTime = stopTime + (squeezeLen + reel.length + 2) * (squeeze ? reel.squeezeTimeConfig.loopDuration : reel.timeConfig.loopDuration) + stopDuration;
                    const trd: SlotTimeReelData = {
                        reelIndex,
                        squeeze,
                        squeezeTime,
                        startTime,
                        stopTime,
                        stoppedTime,
                        reel,
                        stopped: false,
                        squeezed: false,
                        quick: false,
                    };
                    arr.push(trd);
                }
                td.reels.push(...arr);
            }
        } else { // 2
            // data.delta0 = .001;
            reels.forEach((reel, reelIndex) => {
                const rd = data.reels[reelIndex];
                if (!rd.freeze) {
                    const stopTime = tc.timeConfig.firstStopSec;
                    let stoppedTime = stopTime + reel.length * tc.reelTimeConfig.loopDuration + tc.reelTimeConfig.stopDuration;
                    if (quick2) {
                        stoppedTime = stopTime + tc.reelTimeConfig.stopDuration;
                    }
                    const trd: SlotTimeReelData = {
                        reelIndex,
                        reel,
                        stoppedTime,
                        quick: quick2,
                        squeeze: '',
                        squeezeTime: 0,
                        startTime: 0,
                        stopTime: 0,
                        stopped: false,
                        squeezed: false,
                    };
                    td.reels.push(trd);
                }
            });
        }
        return td;
    }
    update(dt: number) {
        // delta0 为从盘面开始转
        // delta=0 为可以开始停
        if (this.delta0 !== -1 && this.delta === -1) {
            this.delta0 += dt;
        }
        if (this.delta !== -1) {
            const data = this.data;
            const tc = this.getTimeConfig(data.quick);
            let d0 = false;
            if (data.delta0) {
                d0 = this.delta0 < data.delta0;
            }else {
                d0 = this.delta0 < tc.timeConfig.firstStopSec;
                if (data.firstStopSecOffset) { // 若有 firstStopSecOffset 浮動修正，需要處理，詳情：SlotLobbyBase.calFirstStopSecOffset()
                    d0 = this.delta0 < (tc.timeConfig.firstStopSec + data.firstStopSecOffset);
                    if (tc.timeConfig.firstStopSec + data.firstStopSecOffset < 0) {
                        d0 = false; // 浮動修正小於零，以零表示，直接跳過 firstStopSec 判斷。
                    }
                }
            }
            if (d0) {
                this.delta0 += dt;
                return;
            }

            this.delta += dt;

            const td = this.timeData;
            for (let idx = 0; idx < td.reels.length; idx += 1) {
                const t = td.reels[idx];
                const reel = t.reel;

                // 沒有開始不可以進停止。
                if (reel.status < SLOT_REEL_STATUS.STARTING) {
                    continue;
                }

                // 停軸時間需額外加上前面的，每軸轉動間隔時間(s) or 每軸個別轉動延遲時間[(s)] 與 向上時間(s)
                const totalStopTime = t.stopTime + t.startTime +  reel.timeConfig.startDuration;
                const totalSqueezeTime = t.squeezeTime + t.startTime + reel.timeConfig.startDuration;

                const reelIndex = t.reel.index;
                const d = this.data.reels[reelIndex];
                if (!t.squeezed && t.squeeze && this.delta >= totalSqueezeTime) {
                    t.squeezed = true;
                    reel.status = SLOT_REEL_STATUS.SQUEEZING;
                    this.squeeze(reelIndex);
                }
                if (!t.stopped && this.delta >= totalStopTime) {
                    t.stopped = true;
                    const arr = reel.getLoopSymbols(true);
                    const symbols = arr.slice(1, reel.length + 2);
                    const loop = arr.slice(reel.length + 2);
                    const o = this.beforeStop?.(reelIndex, symbols, loop, t.squeeze) || {
                        symbols: [],
                        appends: [],
                        prev: '',
                        last: '',
                        shift: 0,
                    };
                    const appends = o.appends || [];
                    const prev = o.prev || (this.spinFailStopping ? d.prev : '') || '';
                    const last = o.last || (this.spinFailStopping ? d.last : '') || '';
                    const shift = o.shift || 0;
                    const result = d.result;
                    reel.stop(result, last, prev, shift, appends, t.quick);
                }
            }

            const allReelExecStop = this.timeData.reels.every(v => v.stopped);
            if (allReelExecStop) {
                this.delta0 = -1;
                this.delta = -1;
            }
        }
    }

    public stopAll(manual: boolean) {
        if (!manual) {
            this.timeData = this.calTimeData();
        }
        if (this.stopping) {
            return this.promise;
        }
        const quick2 = this.data.quick === 2;
        if (quick2) {
            return this.promise;
        }
        // 不进 update
        this.delta0 = -1;
        this.delta = -1;
        this.stopping = true;
        this.unscheduleAllCallbacks();

        // const lastReel = this.timeData.reels[this.timeData.reels.length - 1].reel;
        this.doStopAll?.();
        this.timeData.reels.forEach(async (td) => {
            const index = td.reelIndex;
            const d = this.data.reels[index];
            const reel = td.reel;
            const next = () => {
                const arr = reel.getLoopSymbols(true);
                const symbols = arr.slice(1, reel.length + 2);
                const loop = arr.slice(reel.length + 2);
                const o = this.beforeStop?.(index, symbols, loop, '') || {
                    symbols: [],
                    appends: [],
                    prev: '',
                    last: '',
                    shift: 0,
                };
                const appends = o.appends || [];
                const prev = o.prev || (this.spinFailStopping ? d.prev : '') || '';
                const last = o.last || (this.spinFailStopping ? d.last : '') || '';
                const shift = o.shift || 0;
                const result = d.result;
                //     if (lastReel) {
                //         lastReel.copyDeltaTo(reel);
                //     }
                this.almostStop?.(index);
                reel.stop(result, last, prev, shift, appends, td.quick);
                reel.setStopSymbols();
                reel.handleStop();
                // this.afterStop?.(index, () => {});
            };
            // log('stopAll', reel.index, reel.status);
            // this.almostStop?.(index);
            // this.afterStop?.(index, () => {});
            switch (reel.status) {
            case SLOT_REEL_STATUS.SQUEEZING:
            case SLOT_REEL_STATUS.STOPPING:
                if (reel.squeeze) {
                    reel.squeeze = false;
                }
                return next();
            case SLOT_REEL_STATUS.STOPPED:
            case SLOT_REEL_STATUS.STOP_BOUNCE:
                return Promise.resolve(1);
            case SLOT_REEL_STATUS.STARTING:
            case SLOT_REEL_STATUS.LOOPING:
            case SLOT_REEL_STATUS.IDLE:
                return next();
            }
        });
        this.allStopped();
        return this.promise;
    }

    /**
     * 收到錯誤回應時的停軸（spin2 不會到來的情境，如 SpinRes 失敗後的 reset）。
     * quick2 的 stopAll 不執行停軸（見 stopAll 內 guard），錯誤時改由此方法收尾：
     * 盤面沿用 spin() 存入 this.data 的上一局結果，把 delta 從 -1 撥成 0
     * 交給 update() 既有停軸路徑（quick2 瞬停），promise 由 allStopped() resolve。
     * 非 quick2 維持原本 stopAll(false) 行為。
     */
    /**
     * 失敗回轉中。停軸的上下 buffer（prev / last）改用 spin 資料帶的值，
     * 才能連上下會露出的那兩格一起還原；正常停軸與急停不受影響。
     */
    private spinFailStopping: boolean = false;

    public stopSpinFail(): Promise<any> {
        this.spinFailStopping = true;
        if (this.data?.quick !== 2) {
            return this.stopAll(false);
        }
        if (this.delta === -1) { // spin2 未到才需撥動；已在停軸中則不干涉
            this.delta = 0;
            this.timeData = this.calTimeData();
        }
        return this.promise;
    }

    private stopHandler(index: number) {
        // 向下相容
        if (this.stripManager) {
            const reel = this.reels[index];
            const move = reel.getMovedIndex();
            this.stripManager.addIndex2(this.data.mode, index, move);
        }
    }

    private almostStopHandler(index: number) {
        this.almostStop?.(index);
    }

    private stoppedHandler(index: number) {
        // 返回，如果不是当前要停的轴
        // if (this.reelIndex > index) {
        //     return;
        // }
        const next = () => {
            // 確定所有軸都停了
            if (this.reels.every(r => r.isStoped())) {
                this.allStopped();
            }
        };
        if (this.autoTop) {
            this.top(true, index);
        }
        if (this.autoToggleTopBottom) {
            this.toggleTopBottom(false, index);
        }
        if (this.afterStop) {
            this.afterStop(index, next);
        } else {
            next();
        }
    }

    private allStopped() {
        if (DEBUG) {
            // tslint:disable-next-line:no-console
            // console.timeEnd('spin');
            // tslint:disable-next-line:no-console
            // console.timeEnd('spin2');
        }
        this.spinning = false;
        this.spinFailStopping = false;
        this.resolve?.();
        this.resolve = null;
        if (DEBUG) {
            log(`🎰🎰🎰 Spin-Stop：${Date.now() - this.lastSpinAt}ms`);
        }
        this.afterAllStopped?.();
    }

    public getSymbol(reelIndex: number, index: number) {
        return this.reels[reelIndex].getSymbol(index + 1);
    }

    /**
     * 順序由上到下
     */
    public getPosition(reelIndex: number, index: number): Vec2 {
        const reel = this.reels[reelIndex];
        return reel.getPosition(index + 1);
    }

    /**
     * 順序由上到下
     */
    public getPositionReverse(reelIndex: number, index: number): Vec2 {
        const reel = this.reels[reelIndex];
        const total = reel.getTotal();
        // y 是反的
        // 减掉 reel.total
        return reel.getPosition(total - index + 1);
    }

    /**
     * 順序由上到下
     * @param mark 不隱藏要傳 null/undefined，0 也可能是圖標
     */
    public hideSymbols(mark: (number | string)[][], plus1: boolean = true) {
        mark.forEach((idxs, reelIndex) => {
            const reel = this.reels[reelIndex];
            idxs.forEach((val, idx) => {
                if (isNone(val)) {
                    return;
                }
                reel.hideSymbol(idx + (plus1 ? 1 : 0));
            });
        });
    }

    public showSymbols(mark: (number | string)[][] = [], plus1: boolean = true) {
        if (mark.length) {
            mark.forEach((idxs, reelIndex) => {
                const reel = this.reels[reelIndex];
                idxs.forEach((val, idx) => {
                    if (isNone(val)) {
                        return;
                    }
                    reel.showSymbol(idx + (plus1 ? 1 : 0));
                });
            });
        } else {
            this.reels.forEach((reel) => {
                reel.showSymbols();
            });
        }
    }

    public toggleTopBottom(able: boolean, reelIndex: number = -1): void {
        this.reels.forEach((reel, idx) => {
            if (reelIndex === -1 || idx === reelIndex) {
                reel.nodes.forEach((node, i) => {
                    if (i === 0 || i === reel.getTotal() - 1) {
                        node.active = able;
                    }
                });
            }
        });
    }

    /**
     *
     * @param able
     * @param reelIndex // -1全部
     * @returns
     */
    public top(able: boolean, reelIndex: number = -1, index: number = -1, topNode: Node = this.topNode): void {
        if (!topNode) {
            return;
        }
        // warn('slot top', able, reelIndex, index);
        this.reels.forEach((reel, idx) => {
            if (reelIndex === -1 || idx === reelIndex) {
                const parent = able ? topNode : reel.targetNode;
                reel.nodes.forEach((node, i) => {
                    if (i === 0 || i === reel.getTotal() - 1) {
                        return;
                    }
                    if (index !== -1 && (i !== index + 1)) {
                        return;
                    }
                    if (node.parent !== parent) {
                        const world = reel.targetNode !== parent;
                        let pos = reel.getPosition(i, world);
                        if (world) {
                            pos = convertToNodeSpaceARVec2(parent, pos);
                        }
                        node.setParent(parent);
                        node.setPosition(vecXToVec3(pos));
                        this.doTop?.(able, reelIndex, i, node);
                    }
                });
                if (able) {
                    // #TODO
                    // this.getSymbolPriority()
                    const siblingIndex = (node: Node) => {
                        let si = 0;
                        for (let x = 0; x < this.reels.length; x += 1) {
                            const reel = this.reels[x];
                            for (let y = 0; y < reel.nodes.length; y += 1) {
                                const rn = reel.nodes[y];
                                if (node === rn) {
                                    return si + y;
                                }
                            }
                            si += reel.length;
                        }
                        debugger;
                    };
                    const arr = this.topNode.children.map((node) => {
                        return {
                            n: node,
                            si: siblingIndex(node),
                        };
                    });
                    arr.sort((a, b) => {
                        return a.si - b.si;
                    });
                    arr.forEach((item) => {
                        item.n.setSiblingIndex(item.si);
                    });
                } else {
                    // #TODO
                    // this.getSymbolPriority()
                    reel.nodes.forEach((node, idx) => {
                        if (node.parent === parent) {
                            node.setSiblingIndex(idx);
                        }
                    });
                }
            }
        });
    }

    doTop?(able: boolean, reelIndex: number, index: number, node: Node): void;

    /**
     * 滾輪是否全部已經轉動過。
     * 所有滾輪都需滾動過才能急停；quick2 不可急停由 stopAll 內部擋下。
     */
    public isAllReelHasLooped() {
        return this.reels.every(r => r.isHasLooped());
    }
}
