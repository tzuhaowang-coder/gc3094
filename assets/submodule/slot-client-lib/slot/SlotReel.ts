import { _decorator, CCBoolean, CCInteger, Component, instantiate, Node, v2, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { getDebugParams } from '../../game-client-lib/ParamsGlobal';
import { flattenDeep, getNodeHeight, getWorldPosition, log, lowerThen, nodeOpacity, nodeProperty, range, setNodeOpacity, setNodePosition, setNodeY, vecXToVec2 } from '../../game-client-lib/utils/Utils';
import { SymbolType } from '../protobuf/ProtobufWarp';
import { ISlot, symbolPrioritySort } from '../SlotGlobal';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_REEL_STATUS, SLOT_SYMBOL_STATUS, SlotReelPxConfig, SlotReelTimeConfig } from './SlotData';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

// [0,1,2] [4,5,6]
// [4,5,6,0,1,2]
// pop [4,5,6]
// [0,1,2]
// 1. [0,1,2]
// 2. [0,1,2,3,4,5,6,7,8,9,0,1,2,3,"4","5","6"]
// stop ["1,2,3"]
// ["4","5","6", "1","2","3","x"]
// spin -> loop -> loop -> stop -> doStop -> stopped

export let SLOT_REEL_SYMBOL_SPLITTER = '_';
/**
 * "{SymbolType}" or "{SymbolType}_{custom}"
 * @param SymbolType should be number
 * @param custom any string
 */
export type SlotReelSymbol = string;

export function extractSymbolType(str: SlotReelSymbol | number) : SymbolType {
    if (!str) {
        return SymbolType.XX;
    }
    return Number(('' + str).split(SLOT_REEL_SYMBOL_SPLITTER)[0]);
}

export function extractSymbol(str: string| number) : [SymbolType, ...string[]] {
    if (!str) {
        return [SymbolType.XX];
    }
    const arr = ('' + str).split(SLOT_REEL_SYMBOL_SPLITTER);
    const t = arr.shift();
    return [Number(('' + t)), ...arr];
}

export function createReelSymbol(type: SymbolType, ...data: (string | number)[]) : SlotReelSymbol {
    if (data.length === 0) {
        return '' + type;
    }

    return ([type] as any[]).concat(...data).join(SLOT_REEL_SYMBOL_SPLITTER);
}

export let SLOT_REEL_SYMBOL_EMPTY = '';

export function getY(total: number, symbolHeight: number, idx: number) {
    const isOdd = total % 2;
    const half = (total - 1) / 2;
    const evenFix = isOdd ? 0 : -.5;
    if (idx < half) { // 在上
        return (Math.ceil(half) - idx + evenFix) * symbolHeight;
    } else if (idx > half) { // 在下
        return -(idx - Math.floor(half) + evenFix) * symbolHeight;
    } else { // 在中间
        return 0;
    }
}

let QUICK_FIX = 1;
if (DEBUG) {
    const q = getDebugParams('quick_wait');
    if (q && !isNaN(Number(q))) {
        QUICK_FIX = Number(q);
    }
}

export type SlotReelHandler = (index: number) => void;

@ccclass
export default class SlotReel extends Component {

    @property(Node)
    parent: Node = null;

    @property(Node)
    targetNode: Node = null;

    @property(CCInteger)
    length: number = 1;

    @property(Node)
    symbolSkeletonTemplate: Node = null;

    @property(Node)
    symbolTemplate: Node = null;

    @property(SlotReelPxConfig)
    pxConfig: SlotReelPxConfig = new SlotReelPxConfig();

    @property(CCBoolean)
    debugMode: boolean = false;

    public timeConfig: SlotReelTimeConfig = null;

    public squeezeTimeConfig: SlotReelTimeConfig = null;

    public stoppedHandler: SlotReelHandler = null;
    public almostStopHandler: SlotReelHandler = null;
    public stopHandler: SlotReelHandler = null;

    // 应由 SlotReels instance 传入
    public index: number = -1;

    public stripIndex: number = -1;

    public slot: ISlot = null;

    private total: number = 0;

    public status: SLOT_REEL_STATUS = SLOT_REEL_STATUS.IDLE;

    public slotSymbols: SymbolBase[] = [];

    public nodes: Node[] = [];

    private slotSymbolNodes: Node[] = [];

    private symbols: SlotReelSymbol[] = [];

    private symbolIndex: number = 0;

    // tslint:disable-next-line:variable-name
    private _squeeze: boolean = false;
    public get squeeze(): boolean {
        return this._squeeze;
    }
    public set squeeze(value: boolean) {
        this._squeeze = value;
        this.refreshSymbols(SLOT_SYMBOL_STATUS.NORMAL);
    }

    public loopDuration: number = 0;
    public startDuration: number = null;
    public stopDuration: number = null;

    private quick: boolean = false;

    public addSymbolIndex(i: number) {
        this.symbolIndex += i;
    }

    public getSymbolNode(index: number) {
        return this.slotSymbolNodes[index];
    }

    public getSymbol(index: number) {
        return this.slotSymbols[index];
    }

    public stopMark: boolean = false;

    private privateStatus: SLOT_REEL_STATUS = SLOT_REEL_STATUS.IDLE;

    private shift: number = 0;

    private shifted: boolean = false;

    public delta: number = 0;

    /**
     * 2019.12.31
     * 修正Slot 中間二三四軸還在咪牌中,slot即停
     * 會導致全部停軸順序錯亂
     *
     * @param reel
     */
    public copyDeltaTo(reel: SlotReel) {
        reel.delta = this.delta;
    }

    public promise: Promise<any> = null;

    private resolve: Function = null;

    private loaded: boolean = false;

    /**
     * 判斷滾輪是否執行過 SLOT_REEL_STATUS.LOOPING
     */
    private hasLooped:boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.targetNode = this.targetNode || this.node;
        this.total = this.length + 2;
        // 上下个加 1，2
        const total = this.length + 2;
        this.pxConfig.symbolHeight = getNodeHeight(this.symbolTemplate) + this.pxConfig.symbolPadding;
        const symbolHeight = this.pxConfig.symbolHeight;
        const x = this.getX();
        this.slotSymbolNodes = range(total).map((idx) => {
            const y = getY(total, symbolHeight, idx);
            const root = new Node();
            const node = this.genSymbolNode(total - idx - 1);
            setNodePosition(root, x, y);
            root.addChild(node);
            this.nodes[idx] = root;
            this.targetNode.addChild(root);
            return node;
        });

        // this.node.height = calHeight(this.length, this.symbolTemplate.height, this.pxConfig.symbolPadding);

        this.slotSymbols = this.slotSymbolNodes.map(node => node.getComponent(SymbolBase));

        // globalDebugNNN(this);
    }

    public mx() {
        let mx = false;
        if (this.targetNode !== this.node) {
            // #TODO
            // if (this.targetNode.parent) {

            // }
            mx = true;
        }
        return mx;
    }

    private getX() {
        const mx = this.mx();
        let x = 0;
        if (mx) {
            const p = this.node.getPosition();
            x = p.x;
        }
        return x;
    }

    public enable(able: boolean) {
        const node = this.targetNode;
        node.children.forEach(n => n.active = able);
    }

    public updateIndex(index: number) {
        this.index = index;
        this.slotSymbols.forEach(nodeProperty('reelIndex', index));
    }
    public updateStripIndex(stripIndex:number) {
        this.stripIndex = stripIndex;
    }

    public genSymbolNode(idx: number = -1) {
        const node = instantiate(this.symbolTemplate);

        const symbol = node.getComponent(SymbolBase);
        symbol.reel = this;
        symbol.reelIndex = this.index;
        symbol.index = idx;
        symbol.generate(this);
        return node;
    }

    public getPosition(idx: number, world: boolean= true): Vec2 {
        const total = this.length + 2;
        const symbolHeight = this.pxConfig.symbolHeight;
        const x = this.getX();
        const y = getY(total, symbolHeight, idx);
        if (world) {
            return vecXToVec2(getWorldPosition(this.targetNode, v2(x, y)));
        } else {
            return v2(x, y);
        }
    }

    public getTotal() {
        return this.total;
    }

    /**
     *
     * @tutorial symbols 與 customs 的數量要一致
     */
    public spin(symbols: SlotReelSymbol[],  shift: number= 0, delta: number = 0, quick: boolean= false): Promise<any> {

        this.symbols = this.getAllSymbols().concat(symbols);
        this.symbolIndex = 0;

        // log('reel spin', this.index, this.symbols, symbols.slice(0, this.total));
        this.stopMark = false;
        this.status = SLOT_REEL_STATUS.STARTING;
        this.privateStatus = SLOT_REEL_STATUS.STARTING;
        this.shift = shift;
        this.shifted = false;
        this.delta = delta;
        this.squeeze = false;
        this.quick = quick;

        const p = new Promise((resolve) => {
            this.resolve = resolve;
        });
        this.promise = p;
        return p;
    }

    /**
     * 軸正在停,就不能改loop
     */
    public updateLoop(symbols: SlotReelSymbol[]) {
        if (this.privateStatus >= SLOT_REEL_STATUS.STOPPING) {
            return;
        }
        this.symbols = this.getAllSymbols().concat(symbols);
        this.symbolIndex = 0;
    }

    public getMovedIndex() {
        return this.symbolIndex;
    }

    public getLoopSymbols(full: boolean = false) {
        const total = this.total;
        const first = this.symbolIndex;
        const ss = this.symbols;
        if (full) {
            return ss.slice(first).concat(ss.slice(0, first));
        }
        const arr = ss.slice(first, first + total);
        if (arr.length < total) {
            return arr.concat(ss.slice(0, total - arr.length));
        }
        return arr;
    }

    /**
     * @private 非 lib 不要直接用
     * 從目前 strip 上取一格 symbol，作為 stop() 組合 prev / last buffer 的 fallback。
     */
    public getLast(shift: number = 0) {
        if (!this.symbols.length) {
            // 第一次 spin 失敗時 reel.spin() 還沒被 scheduleOnce 執行到，
            // this.symbols 仍是初始 []，% 0 會得到 NaN 進而回傳 undefined。
            // 此時改從目前畫面上的 symbol 隨機取一格，避免污染 stop() 後的 strip。
            return this.getAllSymbols()[0] ?? SLOT_REEL_SYMBOL_EMPTY;
        }
        const i = (this.symbolIndex + this.total + shift) % this.symbols.length;
        return this.symbols[i];
    }

    // stop ["1,2,3"] x
    // ["4","5","6", "1","2","3","x"]
    public stop(symbols: SlotReelSymbol[], last: SlotReelSymbol, prev: SlotReelSymbol, shift: number , appends: SlotReelSymbol[], quick: boolean): Promise<any> {

        this.status = SLOT_REEL_STATUS.STOPPING;
        this.privateStatus = SLOT_REEL_STATUS.LOOPING;
        this.setHasLooped(true);
        this.shifted = true;
        const ss = this.getAllSymbols();

        if (prev === '') {
            prev = this.getLast(shift);
            shift += 1;
        }
        if (last === '') {
            last = this.getLast(shift);
            shift += 1;
        }
        this.symbolIndex += shift;
        if (this.stopHandler) {
            this.stopHandler(this.index);
        }
        // log('reel stop', this.symbolIndex, shift, ss, prev, symbols, last);
        if (this.promise) {
            this.resolve?.();
        }
        const p = new Promise((resolve) => {
            this.resolve = resolve;
        });
        this.promise = p;
        this.quick = quick;

        this.symbols = flattenDeep( // 10
            [
                ss, // 5
                appends,
                prev, // 1
                symbols, // 3
                last,  // 1
            ],
        );
        // this.symbolIndex = quick ? this.symbols.length - (this.length + 2)  : 0 ;

        // this.symbolIndex = quick ? this.symbols.length - (this.length + 2) - fix : 0 ;
        this.symbolIndex = 0;
        return p;
    }

    /**
     *
     * @param delta
     */
    private doStart(delta: number) {
        this.setSymbols(this.symbols, SLOT_SYMBOL_STATUS.NORMAL);
        const total = this.config.startDuration;
        const px = this.config.startPx;
        const pct = lowerThen(1, delta / total);

        const x = lowerThen(1, pct * pct);
        if (x > .7) {
            this.setSymbols(this.symbols, SLOT_SYMBOL_STATUS.BLUR);
        }
        // 曲線從 -1 到 0 到 1
        // const x2m1 = (2 * x - 1);
        // 曲線從 0 到 px 到 0
        // const xx = (-1 * x2m1 * x2m1 + 1);
        const xx = -4 * x * x * x * x + 4 * x * x;
        const y = xx * px;

        if (DEBUG && this.debugMode) {
            log('x', x, 'xx', xx, 'updateY', y);
        }
        this.updateY(y);
    }

    private doStopBounce(delta: number) {

        const total = this.config.stopDuration;
        const px = this.config.stopPx;
        const pct = lowerThen(1, delta / total);

        // const ratio = lowerThen(1, (pct >= .5 ? (pct - .5) * 2 : pct * 2));
        // const y = pct <= .5 ? misc.lerp(0, -px, ratio) : misc.lerp(-px, 0, ratio);

        const x = pct;
        // 曲線從 -1 到 0 到 1
        // const x2m1 = 2 * (1 - (x - 1) * (x - 1)) - 1;
        // 曲線從 0 到 -px 到 0
        // const xx = (1 * x2m1 * x2m1 - 1);
        const xx = (2 * x - 1) * (2 * x - 1) - 1;
        const y = xx * px;
        if (DEBUG && this.debugMode) {
            log('x', x, 'xx', xx, 'updateY', y);
        }
        this.updateY(y);

    }

    public get config() {
        let tc = this.timeConfig;
        const stc = this.squeezeTimeConfig;
        const squeeze = this.squeeze;
        let loopDuration = 0;
        let startDuration = 0;
        let stopDuration = 0;
        let startPx = 0;
        let stopPx = 0;
        if (squeeze && stc) {
            tc = stc;
        }
        loopDuration = tc.loopDuration;
        startDuration = tc.startDuration;
        stopDuration = tc.stopDuration;
        startPx = tc.startPx;
        stopPx = tc.stopPx;
        if (this.loopDuration) {
            loopDuration = this.loopDuration;
        }
        if (this.startDuration !== null) {
            startDuration = this.startDuration;
        }
        if (this.stopDuration !== null) {
            stopDuration = this.stopDuration;
        }

        return {
            loopDuration,
            startDuration,
            stopDuration,
            startPx,
            stopPx,
        };
    }

    /**
     * 取得當前這格要走的距離。
     */
    public getLoopY(delta:number) {
        const timePerSymbol = this.config.loopDuration;  // 一格需要的時間
        const symbolHeight = this.pxConfig.symbolHeight; // 一格的高度
        const progress = delta / timePerSymbol;          // 目前進度（0~1 代表轉了幾分之幾格），若走超過一格時間，delta 在 handleLoop 被更新。
        const offset = -(progress * symbolHeight);       // 位移方向與距離
        return offset;
    }
    private doLoop(delta: number, updateSymbol: boolean = false) {

        const y = this.getLoopY(delta);
        if (updateSymbol) {
            const symbols = this.getLoopSymbols();

            if (DEBUG && this.debugMode) {
                log(symbols, this.symbolIndex);
            }

            // log('SlotReel#lateUpdate#step', step, symbols);
            let s = SLOT_SYMBOL_STATUS.BLUR;
            if (this.squeeze) {
                s = SLOT_SYMBOL_STATUS.NORMAL;
            }
            // 切換圖標
            this.setSymbols(symbols, s);
        }
        this.updateY(y);
    }

    private handleStart() {
        const startDelta = this.config.startDuration;
        if (this.delta >= startDelta) { // 已累積到開始 delta
            this.delta -= startDelta;
            if (this.privateStatus === SLOT_REEL_STATUS.STARTING) {
                this.resolve?.();
                this.resolve = null;
            } else {
                debugger;
            }
            this.privateStatus = SLOT_REEL_STATUS.LOOPING;
            this.setHasLooped(true);
            this.handleLoop();
        } else {
            this.doStart(this.delta);
        }
    }

    public getLoopStep(delta:number = -1) {
        if (delta === -1) {
            delta = this.delta;
        }
        const step = Math.floor(delta / this.config.loopDuration);
        return step;
    }
    private handleLoop() {
        const step = this.getLoopStep(this.delta);
        this.delta %= this.config.loopDuration; // 讓 delta 的值永遠落在 0 ~ loopDuration 的時間內。
        if (step) {
            this.symbolIndex += step;
            this.symbolIndex %= this.symbols.length;

            const arr = this.symbols;
            const al = arr.length;
            const ll = this.total + this.shift;
            if (!this.shifted && this.symbolIndex >= ll) {
                for (let i = 0; i < ll; i += 1) {
                    arr[i] = arr[al - ll + i];
                }
                this.symbols.length = al - ll;
                this.shifted = true;
            }
        }
        if (this.status === SLOT_REEL_STATUS.STOPPING && this.quick && this.symbolIndex >= QUICK_FIX) {
            this.symbolIndex = this.symbols.length - (this.length + 2);
        }
        if (this.status === SLOT_REEL_STATUS.STOPPING && this.symbolIndex >= this.symbols.length - (this.length + 2)) { // 已超過 loop，可開始回彈
            // TODO: 如 delta 超過太多時，可能會有閃爍情形
            if (this.privateStatus === SLOT_REEL_STATUS.LOOPING) {
                this.resolve?.();
                this.resolve = null;
            } else {
                debugger;
            }
            if (this.quick) {
                // 快速模式直接切換圖標時，如果圖標也有移動，視覺上會改動太多有點突兀
                // 多等一幀
                this.delta = 0;
            }
            this.privateStatus = SLOT_REEL_STATUS.STOP_BOUNCE;
            // 切換圖標
            this.setStopSymbols();
            this.almostStop();
            this.handleStopBounce();
        } else {
            this.doLoop(this.delta, step > 0);
        }
    }

    public setStopSymbols() {
        this.setSymbols(this.symbols.slice(this.symbols.length - (this.length + 2)), SLOT_SYMBOL_STATUS.NORMAL);
    }

    public handleStop() {
        this.symbolIndex = this.symbols.length - (this.length + 2);
        this.privateStatus = SLOT_REEL_STATUS.IDLE;
        this.status = SLOT_REEL_STATUS.STOPPED;
        this.resolve?.();
        this.resolve = null;
        this.updateY(0);
        this.stopped();
    }

    private handleStopBounce() {
        if (this.delta >= this.config.stopDuration) { // 已累積到停止 delta
            // 已停下
            this.handleStop();
        } else {
            this.doStopBounce(this.delta);
        }
    }

    private almostStop() {
        if (this.almostStopHandler) {
            this.almostStopHandler(this.index);
        }
    }

    private stopped() {
        if (this.stoppedHandler) {
            this.stoppedHandler(this.index);
        }
    }

    /**
     * 順序由下到上
     */
    public setSymbols(symbols: SlotReelSymbol[], status: SLOT_SYMBOL_STATUS| PREV_SLOT_SYMBOL_STATUS, force: boolean = false) {
        const arr = this.slotSymbols.slice(0).reverse();
        const l = arr.length;
        const ss = symbols.slice(0, l);
        const priority = this.slot?.getSymbolPriority?.() || [];

        const sorted = ss.map(extractSymbolType).sort(symbolPrioritySort(priority)).reverse();
        for (let i = 0; i < l; i += 1) {
            const s = ss[i];
            const t = extractSymbolType(s);
            const slotSymbol = arr[i];
            const node = slotSymbol.node;
            slotSymbol.change(s, status, force);

            if (priority.length) {
                const siblingIndex = sorted.indexOf(t);
                node.parent.setSiblingIndex(siblingIndex);
            }
        }
    }

    public refreshSymbols(status: SLOT_SYMBOL_STATUS) {
        this.setSymbols(this.getLoopSymbols(), status);
    }

    /**
     *
     * 若軸上可見 symbol 長度為 3 且 畫面呈現為
     * ```
     *   S5 // 不可見
     *   S4
     *   S3
     *   S2
     *   S1 // 不可見
     * ```
     * 會得到 [S2, S3, S4, S5]
     */
    public getSymbols(): SlotReelSymbol[] {
        const symbols = this.slotSymbols.slice(0).reverse().map(ssb => ssb.symbol);
        symbols.shift();
        return symbols;
    }

    /**
     * ```
     *   S5 // 不可見
     *   S4
     *   S3
     *   S2
     *   S1 // 不可見
     * ```
     * @example
     * 會得到 [S1, S2, S3, S4, S5]
     */
    public getAllSymbols(): SlotReelSymbol[] {
        return this.slotSymbols.slice(0).reverse().map((ssb) => {
            return ssb.symbol;
        });
    }

    public getAllSymbolsReverse(): SlotReelSymbol[] {
        return this.slotSymbols.slice(0).map((ssb) => {
            return ssb.symbol;
        });
    }

    lateUpdate(dt: number) {
        if (this.privateStatus !== SLOT_REEL_STATUS.IDLE) {
            this.delta += dt;
            // log('reel delta', this.index, this.delta, dt);
            if (this.privateStatus === SLOT_REEL_STATUS.STARTING) {
                this.handleStart();
            } else if (this.privateStatus === SLOT_REEL_STATUS.LOOPING) {
                this.handleLoop();
            } else if (this.privateStatus === SLOT_REEL_STATUS.STOP_BOUNCE) {
                this.handleStopBounce();
            } else {
                // 其他狀況不處理
            }
        }

        if (this.doLateUpdate) {
            const y = this.slotSymbolNodes[0].getPosition().y;
            const percent = -y / this.pxConfig.symbolHeight;
            this.doLateUpdate(this.index, this.slotSymbolNodes, percent);
        }
    }

    private updateY(y: number) {
        this.slotSymbolNodes.forEach((node, index) => {
            setNodeY(node, y);
        });
    }

    /**
     * 正常將從 slotBase 帶入
     */
    public doLateUpdate: (index: number, nodes: Node[], percent: number) => void = null;

    public hideSymbol(index: number) {
        setNodeOpacity(this.slotSymbolNodes[index], 0);
    }

    public showSymbol(index: number) {
        setNodeOpacity(this.slotSymbolNodes[index], 255);
    }

    public showSymbols() {
        this.slotSymbolNodes.forEach(nodeOpacity(255));
    }

    public isStoped() {
        return this.privateStatus === SLOT_REEL_STATUS.IDLE && this.status === SLOT_REEL_STATUS.STOPPED;
    }

    /**
     * 判斷是否已經開轉動過
     */
    public isHasLooped() {
        return this.hasLooped;
    }

    /**
     * unschedule 需要同一個函式 reference 才能取消，故抽成成員方法。
     */
    private markHasLooped = () => {
        this.hasLooped = true;
    }

    /**
     *  true : delay 移動一格時間後，在標示為已轉動。
     *
     * false : 執行 slot.spin 或 slot.spin2 時，需改為 false
     *         SlotReel.spin 會晚一幀被執行，hasLooped 需要立即設定為 false。
     *         需同時取消倒數中的排程，避免上一次 setHasLooped(true) 把 flag 翻回 true。
     */
    public setHasLooped(able:boolean) {
        this.unschedule(this.markHasLooped);
        if (able) {
            this.scheduleOnce(this.markHasLooped, this.config.loopDuration);
        }else {
            this.hasLooped = false;
        }
    }
}
