import { _decorator, CCBoolean, Component, easing, instantiate, Node, NodePool, sp, Tween, UITransform, v2, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { globalDebugNNN } from '../../game-client-lib/LibGlobal';
import { nodeTweenToPromise } from '../../game-client-lib/data/NodeTween';
import { schedulePromise } from '../../game-client-lib/script/PromiseManager';
import { delayTime, moveTo, scaleTo, spawn, stopAllActions } from '../../game-client-lib/utils/Tween';
import { arraySplice, getWorldPosition, identity, isNone, log, nodeOpacity, random, range2, setNodeOpacity, setNodeScale, vecXToVec2, vecXToVec3, warn } from '../../game-client-lib/utils/Utils';
import { ISlotPuzzle } from '../SlotGlobal';
import { RoundInfo, Symbol } from '../protobuf/ProtobufWarp';
import { fillMap, fillMapReverse, getMapSize, symbolListToMapBySize } from '../script/LobbyBase';
import { SLOT_SPIN_MODE } from '../slot/SlotBase';
import { PuzzleTimeConfig, SLOT_SYMBOL_STATUS, SlotReelPxConfig } from '../slot/SlotData';
import { extractSymbolType, SlotReelSymbol } from '../slot/SlotReel';
import PuzzleSymbolBase from './PuzzleSymbolBase';

const { ccclass, property } = _decorator;

export let EMPTY_SIZE: [number, number] = [0, 0];
export let EMPTY_EACH: number[] = [];

/**
 * 左上為 (0, 0)
 */
export function symbolListToPuzzleData<T>(riOrSymbolList: RoundInfo | Symbol[], mode: string = '', next: boolean = false, feature: boolean= false, custom?: T) {
    let sl: Symbol[];
    if (riOrSymbolList instanceof RoundInfo) {
        // @ts-ignore
        sl = next ? riOrSymbolList.getNextList() : riOrSymbolList.getSymbolsList();
    } else {
        sl = riOrSymbolList;
    }
    // @ts-ignore
    const size = getMapSize(sl);
    // #TODO each
    const each = [];
    const map: SlotReelSymbol[][] = fillMap(sl.reduce(symbolReducer, []), size, each);
    return new PuzzleData(map, mode, size, EMPTY_EACH, custom, feature);
}

/**
 * 左下為 (0, 0)
 */
export function symbolListToDropData<T>(ri: RoundInfo, mode: string = '', next: boolean = false, feature: boolean= false, custom?: T) {
    const sl = next ? ri.getNextList() : ri.getSymbolsList();
    const size = getMapSize(sl);
    // #TODO each
    const map = symbolListToMapBySize(sl, size);
    return new PuzzleData(map, mode, size, EMPTY_EACH, custom, feature);
}

/**
 * 左下為 (0, 0)
 */
export function symbolListToSinkData<T>(ri: RoundInfo, puzzle: PuzzleBase<T>, mode: string = '', feature:boolean= false, custom?: T) {
    const size = getMapSize(ri.getSymbolsList());
    const sinkedMap = puzzle.getSinkedMap();
    const symbolMap = symbolListToMapBySize(ri.getSymbolsList(), size);
    const map: string[][] = [];

    // #TODO each
    for (let x = 0; x < size[0]; x += 1) {
        for (let y = 0; y < size[1]; y += 1) {
            if (sinkedMap[x][y]) {
                if (DEBUG && symbolMap[x][y] !== sinkedMap[x][y]) {
                    warn('sinkMap and symbolMap not match', sinkedMap, symbolMap);
                }
            } else {
                if (!map[x]) {
                    map[x] = [];
                }
                map[x][y] = symbolMap[x][y];
            }
        }
    }
    // log('sinkData', sinkedMap, symbolMap, map);
    return new PuzzleData(map, mode, size, EMPTY_EACH, custom, feature);
}

export function symbolMapToSinkData(symbolMap: string[][] , sinkedMap: string[][], size: [number, number], each: number[], mode: string = '', feature: boolean= false, custom?: any) {
    const lx = size[0];
    const map: string[][] = [];
    for (let x = 0; x < lx; x += 1) {
        const ly = each[x] ? each[x] : size[1];
        for (let y = 0; y < ly; y += 1) {
            if (sinkedMap[x][y]) {
                if (DEBUG && symbolMap[x][y] !== sinkedMap[x][y]) {
                    warn('sinkMap and symbolMap not match', x, y, symbolMap[x][y], sinkedMap[x][y], sinkedMap, symbolMap);
                }
            } else {
                if (!map[x]) {
                    map[x] = [];
                }
                map[x][y] = symbolMap[x][y];
            }
        }
    }
    return new PuzzleData(map, mode, size, each, custom, feature);
}

export function puzzleDataToSymbols(data: PuzzleData): Symbol[] {
    const x = data.size[0];
    const y = data.size[1];
    const arr: Symbol[] = [];
    const m = data.symbols;
    for (let i = 0; i < x; i += 1) {
        // #TODO each
        for (let j = 0; j < y; j += 1) {
            const t = extractSymbolType(m[i][j]);
            if (t) {
                const sym = new Symbol();
                sym.setX(i);
                sym.setY(j);
                sym.setSymbolType(t);
                arr.push(sym);
            }
        }
    }
    return arr;
}

export class PuzzleData<T = any> {
    constructor(
        /**
         * 左下為 (0, 0)
         */
        public symbols: SlotReelSymbol[][] = null,
        public mode: SLOT_SPIN_MODE | string = '',
        public size: [number, number] = EMPTY_SIZE,
        public each: number[] = EMPTY_EACH,
        public custom: T = null,
        public feature: boolean,
    ) {

    }

    public cloneReverse(): PuzzleData<T> {
        return new PuzzleData(fillMapReverse(this.symbols, this.size, this.each), this.mode, this.size, this.each, this.custom, this.feature);
    }

    public clone(): PuzzleData<T> {
        return new PuzzleData(fillMap(this.symbols, this.size, this.each), this.mode, this.size, this.each, this.custom, this.feature);
    }
}

export enum DROP_TYPE {
    CLEAR,
    DROP,
    SINK,
}

export enum TRANSFORM_TYPE {
    IN,
    IN_ACTION,
    OUT,
    OUT_ACTION,
    END,
}

export function symbolReducer(accu: string[][], s: Symbol) {
    const x = s.getX();
    const y = s.getY();
    if (!accu[x]) {
        accu[x] = [];
    }
    accu[x][y] = '' + s.getSymbolType();
    return accu;
}

export function typeReducer(accu: string[][], s: PuzzleSymbolBase) {
    const x = s.x;
    const y = s.y;
    const type = s.symbol;
    if (!accu[x]) {
        accu[x] = [];
    }
    accu[x][y] = '' + type;
    return accu;
}

export function puzzleSymbolReducer(accu: PuzzleSymbolBase[][], s: PuzzleSymbolBase) {
    const x = s.x;
    const y = s.y;
    if (!accu[x]) {
        accu[x] = [];
    }
    accu[x][y] = s;
    return accu;
}

export function puzzleTimeScale(puzzle: PuzzleBase) {
    return puzzle.config.timeScale;
}

export class PuzzleMoveData {
    public constructor(
        public move: boolean = false,
        public idx: number = 0,
        public i: number = 0,
        public j: number = 0,
        public maxi: number = 0,
        public maxj: number[] = [],
        public prevSymbolMap: string[][] = [],
        public symbolMap: string[][] = [],
    ) {

    }
}

export function applyTempoStringToPuzzle(str: string, puzzles: PuzzleBase[]) {
    // 3001!0.5;0.3;;0.3;100;0.1;0.22;110;0.05

    // 第一軸開始停(s)	0.5
    // 停軸間距(s)	0.3

    // 向上時間(s)	0.3
    // 向上幅度(px)	100
    // 圖標滾動的速度(s)	0.1
    // 向下時間(s)	0.22
    // 向下幅度(px)	110
    // 瞇牌滾動的速度(s)	0.05

    str.split('!').forEach((str, idx) => {
        if (idx === 0) {
            return;
        }
        const puzzle = puzzles[idx - 1];
        if (!puzzle) {
            return;
        }
        const tc = new PuzzleTimeConfig();
        const qtc = new PuzzleTimeConfig();
        const stc = new PuzzleTimeConfig();

        const ctc = new PuzzleTimeConfig();
        const cqtc = new PuzzleTimeConfig();
        const cstc = new PuzzleTimeConfig();

        const [
            r,   s0s,  ss,  dd,  ss1,  cs, ts1,  sds,  mdys,  mds,  csts,
            r2, s0s2, ss2, dd2, ss12, cs2, ts2, sds2, mdys2, mds2, csts2,
            r3, s0s3, ss3, dd3, ss13, cs3, ts3, sds3, mdys3, mds3, csts3,

            r4, s0s4, ss4, dd4, ss14, cs4, ts4, sds4, mdys4, mds4, csts4,
            r5, s0s5, ss5, dd5, ss15, cs5, ts5, sds5, mdys5, mds5, csts5,
            r6, s0s6, ss6, dd6, ss16, cs6, ts6, sds6, mdys6, mds6, csts6,
        ] = str.split(';');

        // 盤面贏分填補
        tc.sequenceRight = Boolean(Number(r));
        tc.sequence0Sec = Number(s0s);
        tc.sequenceSec = Number(ss);
        tc.dropDuration = Number(dd);
        tc.sinkSec = Number(ss1);
        tc.clearSec = Number(cs);
        tc.timeScale = Number(ts1);
        tc.symbolDelaySec = Number(sds);
        tc.miDelaySec = Number(mdys);
        tc.miDuration = Number(mds);
        tc.customs = csts.length > 0 ? csts.split(',').map(v => Number(v)) : [];

        // 盤面贏分填補(加速模式)
        qtc.sequenceRight = Boolean(Number(r2));
        qtc.sequence0Sec = Number(s0s2);
        qtc.sequenceSec = Number(ss2);
        qtc.dropDuration = Number(dd2);
        qtc.sinkSec = Number(ss12);
        qtc.clearSec = Number(cs2);
        qtc.timeScale = Number(ts2);
        qtc.symbolDelaySec = Number(sds2);
        qtc.miDelaySec = Number(mdys2);
        qtc.miDuration = Number(mds2);
        qtc.customs = csts2.length > 0 ? csts2.split(',').map(v => Number(v)) : [];

        // 特殊模式盤面贏分填補
        stc.sequenceRight = Boolean(Number(r3));
        stc.sequence0Sec = Number(s0s3);
        stc.sequenceSec = Number(ss3);
        stc.dropDuration = Number(dd3);
        stc.sinkSec = Number(ss13);
        stc.clearSec = Number(cs3);
        stc.timeScale = Number(ts3);
        stc.symbolDelaySec = Number(sds3);
        stc.miDelaySec = Number(mdys3);
        stc.miDuration = Number(mds3);
        stc.customs = csts3.length > 0 ? csts3.split(',').map(v => Number(v)) : [];

        // 盤面清除掉落
        ctc.sequenceRight = Boolean(Number(r4));
        ctc.sequence0Sec = Number(s0s4);
        ctc.sequenceSec = Number(ss4);
        ctc.dropDuration = Number(dd4);
        ctc.sinkSec = Number(ss14);
        ctc.clearSec = Number(cs4);
        ctc.timeScale = Number(ts4);
        ctc.symbolDelaySec = Number(sds4);
        ctc.miDelaySec = Number(mdys4);
        ctc.miDuration = Number(mds4);
        ctc.customs = csts4.length > 0 ? csts4.split(',').map(v => Number(v)) : [];

        // 盤面清除掉落(加速模式)
        cqtc.sequenceRight = Boolean(Number(r5));
        cqtc.sequence0Sec = Number(s0s5);
        cqtc.sequenceSec = Number(ss5);
        cqtc.dropDuration = Number(dd5);
        cqtc.sinkSec = Number(ss15);
        cqtc.clearSec = Number(cs5);
        cqtc.timeScale = Number(ts5);
        cqtc.symbolDelaySec = Number(sds5);
        cqtc.miDelaySec = Number(mdys5);
        cqtc.miDuration = Number(mds5);
        cqtc.customs = csts5.length > 0 ? csts5.split(',').map(v => Number(v)) : [];

        // 特殊模式盤面清除掉落
        cstc.sequenceRight = Boolean(Number(r6));
        cstc.sequence0Sec = Number(s0s6);
        cstc.sequenceSec = Number(ss6);
        cstc.dropDuration = Number(dd6);
        cstc.sinkSec = Number(ss16);
        cstc.clearSec = Number(cs6);
        cstc.timeScale = Number(ts6);
        cstc.symbolDelaySec = Number(sds6);
        cstc.miDelaySec = Number(mdys6);
        cstc.miDuration = Number(mds6);
        cstc.customs = csts6.length > 0 ? csts6.split(',').map(v => Number(v)) : [];

        puzzle.timeConfig = tc;
        puzzle.quickTimeConfig = qtc;
        puzzle.specialTimeConfig = stc;

        puzzle.clearTimeConfig = ctc;
        puzzle.clearQuickTimeConfig = cqtc;
        puzzle.clearSpecialTimeConfig = cstc;
    });
}

export function puzzleDrop1DurDelay(yy: number[], config: { sequenceRight: boolean, sequence0Sec: number, sequenceSec: number, dropDuration: number, sinkSec: number, clearSec: number, timeScale: number }, md: PuzzleMoveData): { dur: number, delay: number } {
    const dur = config.dropDuration * (yy[0] - yy[1] + 1);
    const delay = config.sequence0Sec + config.sequenceSec * (config.sequenceRight ? (md.maxi - md.i) : md.i);
    return {
        dur,
        delay,
    };
}

export interface IPuzzle extends ISlotPuzzle {
    // timeConfig: PuzzleTimeConfig;
}

/**
 * 转轴基础
 * 1. 遮照自行处理，或许是可共用的遮照，不需要每个轴都做
 */
@ccclass
export default abstract class PuzzleBase<T = any> extends Component implements IPuzzle {

    @property(Node)
    parentNode: Node = null;

    @property([Node])
    parentNodes: Node[] = [];

    @property(SlotReelPxConfig)
    pxConfig: SlotReelPxConfig = null;

    @property(PuzzleTimeConfig)
    timeConfig: PuzzleTimeConfig = null;

    @property(PuzzleTimeConfig)
    quickTimeConfig: PuzzleTimeConfig = null;

    @property(PuzzleTimeConfig)
    specialTimeConfig: PuzzleTimeConfig = null;

    @property(PuzzleTimeConfig)
    clearTimeConfig: PuzzleTimeConfig = null;

    @property(PuzzleTimeConfig)
    clearQuickTimeConfig: PuzzleTimeConfig = null;

    @property(PuzzleTimeConfig)
    clearSpecialTimeConfig: PuzzleTimeConfig = null;

    get config() {
        let sequenceRight = false;
        let sequence0Sec = 0;
        let sequenceSec = 0;
        let dropDuration = 0;
        let sinkSec = 0;
        let clearSec = 0;
        let timeScale = 0;
        let symbolDelaySec = 0;
        let miDelaySec = 0;
        let miDuration = 0;
        let customs = [];

        let tc = this.dropType === DROP_TYPE.CLEAR ? this.clearTimeConfig : this.timeConfig;
        if (this.spinMode !== SLOT_SPIN_MODE.NORMAL) {
            tc = this.dropType === DROP_TYPE.CLEAR ? this.clearSpecialTimeConfig : this.specialTimeConfig;
        }
        if (this.boostMode && this.quickTimeConfig) {
            tc = this.dropType === DROP_TYPE.CLEAR  ? this.clearQuickTimeConfig : this.quickTimeConfig;
        }
        sequenceRight = tc.sequenceRight;
        sequence0Sec = tc.sequence0Sec;
        sequenceSec = tc.sequenceSec;
        dropDuration = tc.dropDuration;
        sinkSec = tc.sinkSec;
        clearSec = tc.clearSec;
        timeScale = tc.timeScale;
        symbolDelaySec = tc.symbolDelaySec;
        miDelaySec = tc.miDelaySec;
        miDuration = tc.miDuration;
        customs = tc.customs;
        if (timeScale === 0) {
            timeScale = 1;
        }
        return {
            sequenceRight,
            sequence0Sec,
            sequenceSec,
            dropDuration,
            sinkSec,
            clearSec,
            timeScale,
            symbolDelaySec,
            miDelaySec,
            miDuration,
            customs,
        };
    }

    @property(Node)
    skeletonTemplate: Node = null;

    @property(Node)
    symbolTemplate: Node = null;

    @property({
        tooltip: '從較接近盤面的地方落下，未勾會加上 y size 的長度',
    })
    dropNear: boolean = false;

    @property(CCBoolean)
    debugMode: boolean = false;

    private puzzleSymbols: PuzzleSymbolBase[] = [];

    // private puzzleNodes: cc.Node[] = [];

    protected idle: boolean = true;

    protected boostMode: boolean = false;

    private dropType:DROP_TYPE = null;

    private spinMode:SLOT_SPIN_MODE | string = null;

    private promise: Promise<any> = null;

    private resolve: Function = null;

    protected data: PuzzleData<T> = null;

    private delta: number = -1;

    private pool: NodePool = new NodePool();

    onLoad() {
        const uiTransform = this.symbolTemplate.getComponent(UITransform);
        this.pxConfig.symbolHeight = uiTransform.height + this.pxConfig.symbolPadding;
        this.pxConfig.symbolWidth = uiTransform.width + this.pxConfig.symbolPadding;
        // this.node.height = calHeight(this.length, this.symbolTemplate.height, this.pxConfig.symbolPadding);

        globalDebugNNN(this);
    }

    public reset() {
        this.puzzleSymbols.length = 0;
        while (this.node.children.length) {
            this.recycleSymbolNode(this.node.children[0]);
        }
    }

    abstract doDrop1(symbol: PuzzleSymbolBase, x: number, yy: [number, number], type: DROP_TYPE, moveData: PuzzleMoveData):  Tween<any>;

    /**
     * 可在此調整 node scale，例如 4x4 變成 5x5 盤面時
     */
    doDrop?(type: DROP_TYPE): void;

    /**
     *
     */
    doDropped?(type: DROP_TYPE): void;

    /**
     * 盤面落出+結果落下
     * 左下為 (0, 0)
     */
    public async clearDrop(data: Partial<PuzzleData<T>>): Promise<any> {
        this.applyBoostMode(data);
        this.applySpinMode(data);
        this.applyDropType(DROP_TYPE.CLEAR);
        const tc = this.config;
        const ps = [
            this.clear(data),
            schedulePromise(tc.clearSec).then(() => this.drop(data, DROP_TYPE.CLEAR)),
        ];
        return Promise.all(ps);
    }

    /**
     * 左下為 (0, 0)
     * @param data 要再 drop 的 data
     * @param delay delay 秒數
     */
    public sinkDrop(data: Partial<PuzzleData<T>>): Promise<any> {
        this.applyBoostMode(data);
        this.applySpinMode(data);
        this.applyDropType(DROP_TYPE.SINK);
        const tc = this.config;
        const ps = [
            this.sink(data),
            schedulePromise(tc.sinkSec).then(() => this.drop(data, DROP_TYPE.SINK)),
        ];
        return Promise.all(ps);
    }

    /**
     * 結果掉出
     * 左下為 (0, 0)
     * @param data 預設與 spin 資料一致
     */
    public clear(data0: Partial<PuzzleData<T>> = null): Promise<void> {
        // if (!this.isIdle()) {
        //     warn('not idle');
        //     return this.promise.then(() => this.clear());
        // }
        let d = data0;
        if (!d) {
            d = this.data;
            d.mode = SLOT_SPIN_MODE.NORMAL;
            d.feature = false;
        }
        const data = new PuzzleData(this.puzzleSymbols.reduce(typeReducer, []), d.mode, d.size, d.each, d.custom, d.feature);
        this.applyBoostMode(data);
        this.applySpinMode(data);
        this.applyDropType(DROP_TYPE.CLEAR);
        return this.move(DROP_TYPE.CLEAR, data);
    }

    /**
     * 結果落下
     * 左下為 (0, 0)
     */
    public drop(data: Partial<PuzzleData<T>> , type:DROP_TYPE = DROP_TYPE.CLEAR): Promise<void> {
        // if (!this.isIdle()) {
        //     warn('not idle');
        //     return this.promise.then(() => this.drop(data));
        // }
        this.applyBoostMode(data);
        this.applySpinMode(data);
        this.applyDropType(type);
        return this.move(DROP_TYPE.DROP, data);
    }

    /**
     *
     */
    public sink(data0: Partial<PuzzleData<T>>): Promise<void> {
        // if (!this.isIdle()) {
        //     warn('not idle');
        //     return this.promise.then(() => this.sink());
        // }
        const d = data0;
        const data = new PuzzleData(this.puzzleSymbols.reduce(typeReducer, []), d.mode, d.size, d.each, d.custom, d.feature);
        this.applyBoostMode(data);
        this.applySpinMode(data);
        this.applyDropType(DROP_TYPE.SINK);
        return this.move(DROP_TYPE.SINK, data);
    }

    /**
     * sink 後的 map
     * 不會實際做 sink
     * 左下為 (0, 0)
     */
    public getSinkedMap(): string[][] {
        const prevSymbolMap = this.puzzleSymbols.reduce(typeReducer, []);
        if (!this.data.size[0]) {
            warn('no size');
        }
        return fillMap<string>(
            prevSymbolMap.map((ys, x) => {
                const sink = [];
                ys.forEach((t, y) => {
                    if (isNone(t)) {
                        return;
                    }
                    sink.push(t);
                });
                return sink;
            }),
            this.data.size,
            this.data.each,
        );
    }

    private move(type: DROP_TYPE, data: Partial<PuzzleData<T>>) {
        // 重设资料
        const d = this.fixData(data);
        // this.delta = d.delta;
        this.data = d;
        if (!this.data.size[0]) {
            warn('no size');
        }
        this.idle = false;
        // this.showSymbols();

        // const h = this.pxConfig.symbolHeight;

        this.doDrop?.(type);
        const size = d.size;
        const each = d.each;

        const prevSymbolMap = this.puzzleSymbols.reduce(typeReducer, []);
        const puzzleSymbolMap = this.puzzleSymbols.reduce(puzzleSymbolReducer, []);

        const symbolMap = d.symbols.map((ys, x) => {
            const sink = [];
            const drop = prevSymbolMap[x] ? prevSymbolMap[x].slice(0) : [];
            ys.forEach((t, y) => {
                if (isNone(t)) {
                    return;
                }
                drop[y] = t;
                sink.push(t);
            });
            if (type === DROP_TYPE.CLEAR) {
                return [];
            } else if (type === DROP_TYPE.DROP) {
                return drop;
            } else if (type === DROP_TYPE.SINK) {
                return sink;
            }
        });

        if (DEBUG && this.debugMode) {
            log('Puzzle#move', type, prevSymbolMap, symbolMap);
        }

        const arr: [Node, PuzzleSymbolBase, number, [number, number], DROP_TYPE, number, number, number][] = [];
        let midx = -1; //
        let maxi = -1; // move i
        const mjs: number[] = [];
        d.symbols.forEach((ys, x) => {
            const sink = [];
            const l2 = ys.filter(identity).length;
            let mj = -1; // move j
            let fj = true; // first j
            const ly = each[x] ? each[x] : size[1];
            ys.forEach((t, y) => {
                if (isNone(t)) {
                    return;
                }
                let starty = y;
                let endy = y;
                let node: Node;
                let symbol: PuzzleSymbolBase;
                if (type === DROP_TYPE.CLEAR) { // 清除全部
                    starty = y;
                    endy = y - ly;

                    symbol = puzzleSymbolMap[x][y];
                    node = symbol.node;
                } else if (type === DROP_TYPE.DROP) { // 增加
                    if (this.dropNear) {
                        starty = l2 + y;
                    } else {
                        starty = ly + y;
                    }

                    endy = y;
                    if (DEBUG && puzzleSymbolMap[x] && puzzleSymbolMap[x][endy]) {
                        warn('Puzzle#drop', x, endy, 'already exists', prevSymbolMap, d.symbols, symbolMap);
                    }
                    node = this.getSymbolNode(x, starty, t, SLOT_SYMBOL_STATUS.NORMAL);
                    symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;

                    // 增加
                    this.puzzleSymbols.push(symbol);
                } else if (type === DROP_TYPE.SINK) { // 部分移動
                    sink.push(y);
                    starty = y;
                    endy = sink.length - 1;

                    symbol = puzzleSymbolMap[x][y];
                    node = symbol.node;
                }

                symbol.x = x;
                symbol.y = endy;
                // node.setPosition(this.getPositionReverse(x, starty));
                stopAllActions(node);
                if (starty !== endy) {
                    mj += 1;
                    if (fj) {
                        maxi += 1;
                    }
                    fj = false;
                    mjs[maxi] = mj;
                    midx += 1;
                }
                arr.push([node, symbol, x, [starty, endy], type, maxi, mj, midx]);
                // if (DEBUG && this.debugMode) {
                //     log('Puzzle#move1', x, y, [starty, endy], node.x, node.y);
                // }
            });
        });

        const ps = arr.map(([node, symbol, x, [starty, endy], type, mi, mj, midx]) => {
            const action = this.doDrop1(symbol, x, [starty, endy], type, {
                maxi,
                prevSymbolMap,
                symbolMap,
                maxj: mjs,
                move: starty !== endy,
                idx: midx,
                i: mi,
                j: mj,
            });
            return nodeTweenToPromise({
                node,
                action,
            });
        });
        let symbolTemp: Node[];
        if (type === DROP_TYPE.CLEAR) {
            symbolTemp = this.puzzleSymbols.map(n => n.node);
            this.puzzleSymbols.length = 0;
        }

        const p = Promise.all(ps).then(() => {
            this.idle = true;
            this.doDropped?.(type);

            if (type === DROP_TYPE.CLEAR) {
                symbolTemp.forEach((node) => {
                    this.recycleSymbolNode(node);
                });
            }
        });
        this.promise = p;

        return p;
    }

    public stopAll(): Promise<any> {
        if (!this.idle) {
            return this.promise;
        }
        return Promise.resolve(1);
    }

    /** 收到錯誤回應時的停軸：puzzle 無 quick2 停軸問題，直接委派 stopAll */
    public stopSpinFail(): Promise<any> {
        return this.stopAll();
    }

    public refreshPositions() {
        this.puzzleSymbols.forEach((s) => {
            const pos = this.getPositionReverse(s.x, s.y);
            s.node.setPosition(vecXToVec3(pos));
        });
    }

    /**
     * 一般回傳 this.parentNode
     */
    protected getParentNode(x: number, y: number): Node {
        return this.parentNode || this.node;
    }

    protected getPuzzleSymbol(x: number, y: number) : PuzzleSymbolBase {
        return this.puzzleSymbols.find(p => p.x === x && p.y === y);
    }

    /**
     * 左上為 (0, 0)
     */
    public getPosition(x: number, y: number, w: number = this.pxConfig.symbolWidth, h:number = this.pxConfig.symbolHeight , size: [number, number] = this.data.size, each: number[] = this.data.each): Vec2 {
        const pos = new Vec2(0, 0);
        if (!size[0]) {
            warn('no size');
        }
        const ly = each[x] || size[1];
        const lx = size[0];
        pos.x = calculate(lx, lx - x - 1, w);
        pos.y = calculate(ly, y, h);
        return pos;
    }

    /**
     * 左下為 (0, 0)
     */
    public getPositionReverse(x: number, y: number, w: number = this.pxConfig.symbolWidth, h:number = this.pxConfig.symbolHeight , size: [number, number] = this.data.size, each: number[] = this.data.each): Vec2 {
        // y 是反的
        // y 减掉 this.lengthY
        const ly = each[x] || size[1];
        if (!size[0]) {
            warn('no size');
        }
        return this.getPosition(x, ly - 1 - y, w, h, size, each);
    }

    /**
     * 左上為 (0, 0)
     */
    public getWorldPosition(x: number, y: number): Vec2 {
        const pos = this.getPosition(x, y);
        const p = this.getParentNode(x, y);
        return vecXToVec2(getWorldPosition(p, pos));
    }

    /**
     * 左下為 (0, 0)
     */
    public getWorldPositionReverse(x: number, y: number): Vec2 {
        const pos = this.getPositionReverse(x, y);
        const p = this.getParentNode(x, y);
        return vecXToVec2(getWorldPosition(p, pos));
    }

    /**
     * 时间点：建立 PuzzleSymbol 后
     * 用于：增加图标赢分呈现外框(可参考3008)
     */
    doGenNode?(symbol: PuzzleSymbolBase, reelSymbol: SlotReelSymbol, x: number, y: number): void;

    doRecycleNode?(node: Node): void;

    /**
     * @private 你可能需要用的是 puzzleResult#getSymbolNode
     * @param type default=0
     * @param status default=SLOT_SYMBOL_STATUS.WIN
     * @param parentNode 如有傳 左上為 (0, 0)，否則 左下為 (0, 0)
     */
    public getSymbolNode(x: number, y: number, type: SlotReelSymbol = '', status: SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.WIN, ctrl: boolean= true, parentNode: Node = null) {
        // const ctrl = parentNode === this.parentNode;
        const pos = ctrl ? this.getPositionReverse(x, y) : this.getPosition(x, y);
        const node = this.getSkeletonNode();
        if (!parentNode) {
            parentNode = this.getParentNode(x, y);
        }
        parentNode.addChild(node);
        node.setPosition(vecXToVec3(pos));
        node.active = true;
        const symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;
        symbol.skeletonNode.active = true;
        symbol.skeleton.node.active = true;
        setNodeOpacity(node, 255);

        if (ctrl) {
            symbol.node.setSiblingIndex(x);
            symbol.node.setSiblingIndex(0);
        } else {
            symbol.node.setSiblingIndex(0);
        }
        symbol.change(type, status, true);
        // 添加在底層控制的 parentNode 才做
        if (ctrl) {
            this.doGenNode?.(symbol, type, x , y);
        }

        return node;
    }

    /**
     *
     * @deprecated 應使用 recycleSymbolNode 較為明確
     */
    public recycleNode(node: Node) {
        stopAllActions(node);
        const symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;
        // symbol.change(SLOT_REEL_SYMBOL_EMPTY, SLOT_SYMBOL_STATUS.NORMAL, true);
        this.pool.put(node);
    }

    public recycleSymbolNode(node: Node) {
        this.doRecycleNode?.(node);
        this.recycleNode(node);
    }

    private getSkeletonNode(): Node {
        let node: Node = null;
        let symbol: PuzzleSymbolBase = null;
        if (this.pool.size() === 0) {
            node = instantiate(this.symbolTemplate);
            const skeletonNode = instantiate(this.skeletonTemplate);
            symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;
            symbol.skeletonNode.addChild(skeletonNode);
            symbol.skeleton = skeletonNode.getComponent(sp.Skeleton);
            skeletonNode.active = true;
        } else {
            node = this.pool.get();
            symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;
            // TODO: cache spine 時，symbol.change() 會消失或是設成錯誤的 symbol
            // workaround: sp.skeleton set to REALTIME
            node.active = true;
            symbol.skeletonNode.active = true;
            symbol.skeleton.node.active = true;
        }
        setNodeOpacity(node, 255);
        return node;
    }

    public isIdle() {
        return this.idle;
    }

    public getQuickspin() {
        return this.quickspin;
    }

    public setQuickspin(quickspin: number) {
        this.quickspin = quickspin;
    }

    public getMode() {
        return this.data && this.data.mode;
    }

    public getCustom() {
        return this.data && this.data.custom;
    }

    private applyBoostMode(data: Partial<PuzzleData<T>>): void {
        // #TODO
        debugger;
        this.quickspin = data.feature ? 0 : this.timeConfig.stopSequenceSpeedUp;
    }

    private applyDropType(type:DROP_TYPE) {
        this.dropType = type;
    }

    private applySpinMode(data: Partial<PuzzleData<T>>) {
        this.spinMode = data.mode;
    }

    private fixData(data: Partial<PuzzleData<T>>, defaultValue?: Partial<PuzzleData<T>>): PuzzleData<T> {
        return new PuzzleData(
            data.symbols || (defaultValue && defaultValue.symbols) || [],
            data.mode || (defaultValue && defaultValue.mode) || SLOT_SPIN_MODE.NORMAL,
            data.size || (defaultValue && defaultValue.size) || [0, 0],
            data.each || (defaultValue && defaultValue.each) || [],
            data.custom || (defaultValue && defaultValue.custom) || null,
            typeof data.feature !== 'undefined' ? data.feature : (defaultValue ? defaultValue.feature : false),
        );
    }

    /**
     * 左上為 (0, 0)
     * @param marks
     */
    public removeSymbols(marks: number[][]) {
        marks.forEach((idxs, x) => {
            idxs.forEach((val, y) => {
                if (isNone(val)) {
                    return;
                }
                this.removeSymbol(x, y);
            });
        });
    }

    /**
     * 左上為 (0, 0)
     * @param marks
     */
    public removeSymbol(x: number, y: number) {
        if (!this.data.size[0]) {
            warn('no size');
        }
        const ly = this.data.each[x] || this.data.size[1];
        this.removeSymbolReverse(x, ly - 1 - y);
    }

    /**
     * 左下為 (0, 0)
     * @param marks
     */
    private removeSymbolReverse(x: number, y: number) {
        const symbol = this.puzzleSymbols.find(s => s.x === x && s.y === y);
        if (!symbol) {
            // if (DEBUG) {
            //     // warn('symbol not found', x, y);
            // }
            return;
        }
        arraySplice(this.puzzleSymbols, symbol);
        this.recycleSymbolNode(symbol.node);
    }

    /**
     * 左上為 (0, 0)
     */
    public getCache() {
        if (!this.data.size[0]) {
            warn('no size');
        }
        return fillMapReverse(this.puzzleSymbols.reduce(typeReducer, []), this.data.size, this.data.each);
    }

    /**
     * 左上為 (0, 0)
     */
    public setCache2(map: string[][], force: boolean = false) {
        const d = this.fixData({ symbols: map }, this.data);
        if (!this.data.size[0]) {
            warn('no size');
        }
        return this.setCache(d, force);
    }

    /**
     * 左上為 (0, 0)
     * @param symbols
     * @param force 如為 true 將刪除 symbols 參數內不存在的
     */
    public setCache(data: Partial<PuzzleData<T>>, force: boolean = false) {
        const d = this.fixData(data, this.data).cloneReverse();
        this.data = d;
        if (!this.data.size[0]) {
            warn('no size');
        }
        const m = this.puzzleSymbols.reduce(puzzleSymbolReducer, []);
        d.symbols.forEach((idxs, x) => {
            idxs.forEach((val, y) => {
                let s = m[x] && m[x][y];
                // 要被刪除
                if (isNone(val)) {
                    if (force && s) {
                        this.removeSymbolReverse(x, y);
                    }
                    return;
                }

                if (!s) {
                    const node = this.getSymbolNode(x, y, val, SLOT_SYMBOL_STATUS.NORMAL);
                    s = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase;
                    s.x = x;
                    s.y = y;
                    // 增加
                    this.puzzleSymbols.push(s);
                } else {
                    s.change(val, SLOT_SYMBOL_STATUS.NORMAL);
                }
            });
        });
    }

    /**
     * 左上為 (0, 0)
     */
    public hideSymbols(marks: number[][]) {
        if (!this.data.size[0]) {
            warn('no size');
        }
        const map = this.puzzleSymbols.reduce(puzzleSymbolReducer, []);
        marks.forEach((idxs, x) => {
            const ly = this.data.each[x] || this.data.size[1];
            idxs.forEach((val, y) => {
                const s = map[x][ly - 1 - y];
                if (isNone(val)) {
                    return;
                }
                if (!s) {
                    return;
                }
                setNodeOpacity(s.node, 0);
            });
        });
    }

    /**
     * 左上為 (0, 0)
     */
    public hideSymbol(x: number, y: number) {
        const m = [];
        m[x] = [];
        m[x][y] = true;
        this.hideSymbols(m);
    }

    /**
     * 左上為 (0, 0)
     * @param marks 不傳為全部呈現
     */
    public showSymbols(marks: number[][] = []) {
        if (!this.data.size[0]) {
            warn('no size');
        }
        if (marks.length) {
            const map = this.puzzleSymbols.reduce(puzzleSymbolReducer, []);
            marks.forEach((idxs, x) => {
                const ly = this.data.each[x] || this.data.size[1];
                idxs.forEach((val, y) => {
                    const s = map[x][ly - 1 - y];
                    if (isNone(val)) {
                        return;
                    }
                    if (!s) {
                        return;
                    }
                    setNodeOpacity(s.node, 255);
                });
            });
        } else {
            this.puzzleSymbols.map(s => s.node).forEach(nodeOpacity(255));
        }
    }

    public showSymbol(x: number, y: number) {
        const m = [];
        m[x] = [];
        m[x][y] = true;
        this.showSymbols(m);
    }

    /**
     * 左上為 (0, 0)
     */
    public getSymbolMap() {
        if (!this.data.size[0]) {
            warn('no size');
        }
        return fillMapReverse(this.puzzleSymbols.reduce(puzzleSymbolReducer, []), this.data.size, this.data.each);
    }

    /**
     *
     * @param x 如果 type 是 IN、OUT、END 為 size，是 IN_ACTION、OUT_ACTION 為 xy
     * @param y
     * @returns 如果沒有要更改預設 action 的話 return null
     */
    doTransform?(type: TRANSFORM_TYPE, x: number, y: number): Tween<any>;

    /**
     * 彈出縮小、放大彈出 轉場
     * 一般左下為 (0, 0)
     * @param reverse 設 true 左上為 (0, 0)
     * @param time 圖標出現或消失的時間，會除2 default .9
     * @param delay 出現後等待時間
     */
    public async transform(data: Partial<PuzzleData<T>>, reverse: boolean = false, time: number = .9, delay: number = 0) {
        const d = this.fixData(data);
        if (!d.size[0] || !this.data.size[0]) {
            warn('no size');
        }
        if (reverse) {
            d.symbols = fillMapReverse(d.symbols, this.data.size, this.data.each);
        }

        const t = time / 2;

        let action = this.doTransform?.(TRANSFORM_TYPE.IN, this.data.size[0], this.data.size[1]);
        if (action) {
            await nodeTweenToPromise({
                action,
                node: this.node,
            });
        }

        const ss = this.puzzleSymbols;
        this.puzzleSymbols = [];
        // 彈出縮小
        await Promise.all(ss.map(async (s) => {
            const x = s.x;
            const y = s.y;
            const node = s.node;
            const action = this.doTransform?.(TRANSFORM_TYPE.IN_ACTION, x, y) || spawn(
                scaleTo(t, 0, 0, easing.backIn),
                moveTo(t, v2(0, 0), easing.backIn),
            );

            await nodeTweenToPromise({
                node,
                // @ts-ignore
                action,
            });
            this.recycleSymbolNode(s.node);
        }));
        // 在上面取完位置之後再設
        this.data = d;

        if (delay) {
            await nodeTweenToPromise({
                node: this.node,
                action: delayTime(delay),
            });
        }

        action = this.doTransform?.(TRANSFORM_TYPE.OUT, this.data.size[0], this.data.size[1]);
        if (action) {
            await nodeTweenToPromise({
                action,
                node: this.node,
            });
        }

        const symbolMap = d.symbols;
        // 彈出回正
        await Promise.all(symbolMap.map(async (ys, x) => {
            await Promise.all(ys.map(async (type, y) => {
                const node = this.getSymbolNode(x, y, type, SLOT_SYMBOL_STATUS.NORMAL);
                const symbol = node.getComponent('PuzzleSymbolBase') as PuzzleSymbolBase ;
                symbol.x = x;
                symbol.y = y;
                const pos0 = node.getPosition();
                this.puzzleSymbols.push(symbol);

                setNodeScale(node, 0);
                node.setPosition(0, 0);

                const action = this.doTransform?.(TRANSFORM_TYPE.OUT_ACTION, x, y) || spawn(
                    scaleTo(t, 1, 1, easing.backOut),
                    moveTo(t, pos0, easing.backOut),
                );

                await nodeTweenToPromise({
                    node,
                    // @ts-ignore
                    action,
                });
            }));
        }));
        this.refreshPositions();
        action = this.doTransform?.(TRANSFORM_TYPE.END, this.data.size[0], this.data.size[1]);
        if (action) {
            await nodeTweenToPromise({
                action,
                node: this.node,
            });
        }
    }

}

/**
 *
 * @param total 總共幾行/列
 * @param idx index，從 0 開始
 * @param len 高/寬度
 */
function calculate(total: number, idx: number, len: number) {
    if (total === 0) {
        return 0;
    }
    const isOdd = total % 2;
    const half = (total - 1) / 2;
    const evenFix = isOdd ? 0 : -.5;
    let val: number;
    if (idx < half) { // 在上
        val = (Math.ceil(half) - idx + evenFix) * len;
    } else if (idx > half) { // 在下
        val = -(idx - Math.floor(half) + evenFix) * len;
    } else { // 在中间
        val = 0;
    }
    return val;
}

/**
 * @todo 非正方型
 * @param size
 * @param symbols
 * @param count
 * @returns
 */
export function randomPuzzle(size: [number, number], symbols: number[], count: number = 2):string[][] {

    const map: string[][] = range2(size[0]).map(_ => []);
    for (let i = 0; i < size[0]; i += 1) {
        for (let j = 0; j < size[1]; j += 1) {
            const list = symbols.map(a => a);
            while (list.length > 0) {
                map[i][j] = '' + list.splice(random(list.length), 1)[0];
                if (count <= 1) {
                    break;
                }
                const flag: boolean[] = range2(size[0] * size[1]).map(_ => false);
                const find = (x: number, y: number, symbol: string) => {
                    const i = x * size[1] + y;
                    const s = map[x][y];
                    if (s !== symbol || flag[i]) {
                        return 0;
                    }
                    flag[i] = true;
                    let l = 1;
                    if (x > 0) {
                        l += find(x - 1, y, symbol);
                    }
                    if (x < size[0] - 1) {
                        l += find(x + 1, y, symbol);
                    }
                    if (y > 0) {
                        l += find(x, y - 1, symbol);
                    }
                    if (y < size[1] - 1) {
                        l += find(x, y + 1, symbol);
                    }
                    return l;
                };
                if (find(i, j, map[i][j]) < count) {
                    break;
                }
            }
        }
    }
    return map;
}
