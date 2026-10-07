import { _decorator, Animation, CCFloat, CCString, Graphics, Label, macro, Node, NodePool, v2, v3, Vec2, Vec3 } from 'cc';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';
import { nodeTweenToPromise } from '../../game-client-lib/data/NodeTween';
import { animationPlay, animationPlayToPromise, resolveWrapper, schedulePromise, spSkeletonSetAnimationToPromise, timeoutPromise, tweenNumberStop, tweenNumberToPromise } from '../../game-client-lib/script/PromiseManager';
import { PROMISE_EXECUTOR2_GROUP, PROMISE_EXECUTOR2_STAT, PromiseExecutor2 } from '../../game-client-lib/script/PromiseManager2';
import { fixThousandth2, fixThousandth3 } from '../../game-client-lib/utils/Balance';
import { delayTime, easeBezierAction, scaleTo, spawn, widthTo } from '../../game-client-lib/utils/Tween';
import { convertToNodeSpaceAR, flattenDeep, getNodeHeight, getNodeWidth, identity, isNone, log, nodeActive, nodeOpacity, radiansToDegrees, range, setNodeAnchor, setNodeOpacity, setNodePosition, setNodeScaleY, setNodeWidth, vecXToVec2 } from '../../game-client-lib/utils/Utils';
import { SymbolType } from '../protobuf/ProtobufWarp';
import { symbolPrioritySort } from '../SlotGlobal';
import SkeletonSymbolBase from './SkeletonSymbolBase';
import SlotBase from './SlotBase';
import { SLOT_SYMBOL_STATUS } from './SlotData';
import SlotReel, { extractSymbolType, SlotReelSymbol } from './SlotReel';
import { SpriteSkeletonSymbolBase } from './SpriteSkeletonSymbolBase';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

export interface IResult {
    clearAll(reset?: boolean): void;
}

export interface ISlotResult extends IResult, TemplateGenerator {
    loop(duration?: number, delay?: number): void;
    reset(data: any): void;
}

export class SlotResultData {
    constructor(
        /**
         * 单线
         */
        public lines: SlotResultLineData[] = [],
        /**
         * 总赢分
         */
        public wins: string = '',
        /**
         * 倍数
         */
        public level: string = '',
        /**
         * 自订资料，用于画面呈现(可参考 3010)
         */
        public custom: any = null,
    ) {

    }
}
/**
 * 乘符号
 */
export let MULTIPLE_MARK = '×';

export class SlotResultLineData {
    constructor(
        public id: string = '',
        /**
         * 应为全部轴，范例为五轴 [0, 0, 0, 0, 0]
         */
        public indexs: (number | number[])[] = [0],
        /**
         * 未设计图标会不同情况，如出现将后盖前
         * 中奖的轴，eg: [0, 0, 0]，中 0 三联线
         * scatter，eg: [0, null, 0, null, 0]
         */
        public symbolIndexs: SlotReelSymbol[][] = [],
        /**
         * 赢分
         */
        public wins: string = '',
        /**
         * 倍数
         */
        public level: string = '',
        /**
         * 連線數，用於 way game
         */
        public num: number = 0,
    ) {

    }

}

export function calLines(lines: Partial<SlotResultLineData>[]): string[][] {
    return lines.reduce(
        (accu, l) => {
            mapIndexsSymbolIndexs(l.symbolIndexs, (ri, i, si) => {
                // 不是中奖的
                if (!isNone(si)) {
                    if (!accu[ri]) {
                        accu[ri] = [];
                    }
                    accu[ri][i] = si;
                }
            });
            return accu;
        },
        [],
    );
}

/**
 *
 * @param line
 * @param priority index 越小越優先
 * @returns
 */
export function lineSymbol(line: SlotResultLineData, priority: SymbolType[] = []): SymbolType {
    const arr = flattenDeep(line.symbolIndexs).filter(identity).map((v): number => {
        const n = extractSymbolType(v);
        if (isNaN(n)) {
            debugger;
            log('lineSymbol NaN', line);
            return SymbolType.XX;
        }
        return n;
    });
    if (priority.length) {
        arr.sort(symbolPrioritySort(priority));
        return arr[0];
    } else {
        return Math.max(...arr);
    }
}

@ccclass('SlotResultDrawLineData')
export class SlotResultDrawLineData {
    // 'graphics' ｜ 'sprite'
    @property(CCString)
    type: string = '';

    // 'straight'
    @property(CCString)
    extend: string = '';

    @property(CCFloat)
    lineTplIdx: number = 5;

    @property(CCFloat)
    effectTplIdx: number = 6;

    @property(CCFloat)
    time: number = .05;

    @property(CCFloat)
    holdTime: number = .2;

    @property(CCFloat)
    widthPlus: number = 20;
}

@ccclass
export default abstract class SlotResultBase extends TemplateGenerator implements ISlotResult {

    @property(Label)
    winsLabel: Label = null;

    @property(Label)
    multipleLabel: Label = null;

    @property(SlotBase)
    slot: SlotBase = null;

    @property(SlotBase)
    slotLine: SlotBase = null;

    @property(Node)
    layerSymbol: Node = null;

    /**
     * 給 scatter 用
     */
    @property(Node)
    private layerOther: Node = null;

    // 自行实作
    @property([Node])
    maskNodes: Node[] = [];

    @property(Node)
    layerLine: Node = null;

    @property(SlotResultDrawLineData)
    drawLineData: SlotResultDrawLineData = null;

    @property(CCFloat)
    loop1Delay: number = .3;

    @property(CCFloat)
    loop1Duration: number = 1.5;

    data: SlotResultData = null;

    protected skeletonMap: Node[][] = [];

    protected loopIndex: number = 0;

    onLoad() {
        super.onLoad();
        this.slotLine = this.slotLine || this.slot;

        if (this.layerLine) {
            const gs = this.layerLine.getComponentsInChildren(Graphics);
            if (gs.length) {
                this.refGraphics = gs;
                this.layerLine.removeAllChildren();

                const node = new Node('graphic_lines');
                this.linesGraphics = node.addComponent(Graphics);
                node.setParent(this.layerLine);
            }
        }
    }

    /**
     * 时间点：呼叫 loop()、total()、clearAll() 时，all 为 true；在各线时会呼 all 为 false
     * @param all
     */

    /**
     * 时间点：呼叫 reset()、scatter()、clearAll() 时
     */
    doClearAll?(reset: boolean): void;

    private clear(unschedule: boolean = false) {
        const winsLabel = this.winsLabel;
        const mulLabel = this.multipleLabel;
        if (unschedule) {
            this.unscheduleAllCallbacks();
        }
        this.toggleMask(false);
        if (this.linesGraphics) {
            this.linesGraphics.clear();
        }
        this.layerOther.removeAllChildren();

        if (winsLabel) {
            winsLabel.string = '';
        }
        if (mulLabel) {
            mulLabel.node.active = false;
            mulLabel.string = '';
        }
        // 设为 0 还会播
        flattenDeep(this.skeletonMap).forEach(nodeOpacity(0));
        this.slot.showSymbols();
    }

    public clearAll(reset: boolean = false) {
        if (this.slot.autoTop) {
            this.slot.top(false);
        }
        this.clear(true);
        let len = this.layerSymbol.children.length;
        while (len) {
            this.recycleSymbolNode(this.layerSymbol.children[len - 1]);
            len -= 1;
        }
        this.doClearAll?.(reset);
    }

    doScatter?(line: SlotResultLineData, nodes: Node[]): void;

    /**
     * 没有 line，没有赢分，只有 mask 与 图标
     * 且从头跑 times 次
     */
    public scatter(line: Partial<SlotResultLineData>, times: number = 1, mask: boolean = true, clear: boolean = true, destroy: boolean = false): Promise<any> {
        line = this.genLineData(line);
        if (clear) {
            if (this.slot.autoTop) {
                this.slot.top(false);
            }
            this.clear(true);
        }

        const layer = this.layerOther;
        this.toggleMask(mask);

        const nodes: Node[] = [];
        // 放图标
        const ps = mapIndexsSymbolIndexs(line.symbolIndexs, async (ri, i, si) => {
            if (isNone(si)) {
                return;
            }
            const pos = this.slot.getPosition(ri, i);
            const reel = this.slot.reels[ri];
            const node = this.getSymbolNode(reel, si);
            node.setPosition(convertToNodeSpaceAR(layer, pos));

            layer.addChild(node);
            const symbol = node.getComponent('SymbolBase') as SymbolBase;

            symbol.change(si, SLOT_SYMBOL_STATUS.WIN, true);
            const name = symbol.str();
            const arr = [];
            arr[ri] = [];
            arr[ri][i] = si;
            this.slot.hideSymbols(arr);

            nodes.push(node);
            this.doGenNode?.(symbol, si, i);
            if (symbol instanceof SkeletonSymbolBase) {
                // 跑 2 次
                if (!name) {
                    debugger;
                } else {
                    await spSkeletonSetAnimationToPromise(symbol.skeleton, name, times);
                }
            }
            if (symbol instanceof SpriteSkeletonSymbolBase) {
                // 跑 2 次
                if (!name) {
                    debugger;
                } else {
                    await spSkeletonSetAnimationToPromise(symbol.symbolSkeleton, name, times);
                }
            }
            if (destroy) {
                this.slot.showSymbols(arr);
                node.destroy();
            }
        });
        this.doScatter?.(line as SlotResultLineData, nodes);
        return Promise.all(ps);
    }

    public clearScatter(mask: boolean = true, clear: boolean = true) {
        this.layerOther.removeAllChildren();
        if (mask) {
            this.toggleMask(false);
        }
        if (clear) {
            this.slot.showSymbols();
            if (this.slot.autoTop) {
                this.slot.top(false);
            }
        }
    }

    protected calLines() {
        return calLines(this.data.lines);
    }

    private genData(data: Partial<SlotResultData>): SlotResultData {
        return new SlotResultData(data.lines.map(this.genLineData), data.wins, data.level, data.custom);
    }

    private genLineData(data: Partial<SlotResultLineData>): SlotResultLineData {
        return new SlotResultLineData(data.id, data.indexs, data.symbolIndexs, data.wins, data.level, data.num);
    }

    /**
     * 時間點，呼叫 reset 後
     */
    doReset?(): void;

    /**
     * 設定 total 及 loop 時的資料，不包含 scatter
     */
    public reset(data: Partial<SlotResultData>) {
        this.data = this.genData(data);
        log(this.data);
        this.clearAll(true);

        const mark = calLines(data.lines);
        // 放全部图标
        this.skeletonMap = mark.map((reel, ri) => {
            return reel.map((t, i) => {
                if (t) {
                    return this.getSkeletonNode(ri, i, t);
                }
            });
        });

        this.doReset?.();
    }

    protected getSkeletonNode(reelIndex: number, index: number, symbolType: SlotReelSymbol = '', status: SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.WIN, root: Node = this.layerSymbol) {
        const pos = this.slot.getPosition(reelIndex, index);
        const reel = this.slot.reels[reelIndex];
        const l = reel.length;
        const node = this.getSymbolNode(reel, symbolType);
        node.setPosition(convertToNodeSpaceAR(root, pos));
        setNodeOpacity(node, 0);
        root.addChild(node);

        const symbol = node.getComponent(SymbolBase);
        symbol.reelIndex = reelIndex;
        // 補 index
        symbol.index = l - index;
        symbol.change(symbolType, status, true);

        // 若非底層控制的 layerSymbol 不做
        if (root === this.layerSymbol) {
            this.doGenNode?.(symbol, symbolType, index);
        }

        return node;
    }

    private symbolPools: Map<string, NodePool> = new Map();

    private getPoolKey(index: number , symbol: string) {
        return `${index}_${symbol}`;
    }

    private getSymbolNode(reel: SlotReel, symbol: string): Node {

        const s = reel.symbolTemplate.getComponent(SymbolBase);

        const key = this.getPoolKey(s.poolIndex, symbol);
        let pool = this.symbolPools.get(key);
        if (!pool) {
            pool = new NodePool();
            this.symbolPools.set(key, pool);
        }

        let node: Node = null;
        if (pool.size() === 0) {
            node = reel.genSymbolNode();
        } else {
            node = pool.get();
        }
        setNodeOpacity(node, 255);
        return node;
    }

    /**
     * 时间点：回收 SlotSymbol 时
     * 在 symbolCreated 有添加的要在这里回收，不然会一直叠加
     * @param node node 有 SlotSymbol component
     */
    doRecycleNode?(node: Node): void;

    protected recycleSymbolNode(node: Node) {
        this.doRecycleNode?.(node);
        const ssb = node.getComponent(SymbolBase);
        const key = this.getPoolKey(ssb.poolIndex, ssb.symbol);
        const pool = this.symbolPools.get(key);
        pool.put(node);
    }

    /**
     * 时间点：呼叫 total(true) 跑分时
     * 用于：更新跑分、播跑分音效
     */
    abstract doTweenX(x: number): void;

    onTweenX(x: number) {
        this.doTweenX(x);
        const winsLabel = this.winsLabel;
        if (winsLabel) {
            winsLabel.string = fixThousandth3('' + x);
        }
    }

    /**
     * 时间点：呼叫 total() 时
     * 通常順序為 clearAll -> reset -> total -> loop；
     * scatter 另外處理
     */
    doTotal?(playWins: boolean): void;

    private total() {
        // const mlabel = this.multipleLabel;
        if (this.slot.autoTop) {
            this.slot.top(false);
        }
        this.clear(true);

        this.toggleMask(true);

        const ary = flattenDeep(this.skeletonMap);
        // 放全部图标
        ary.forEach(nodeOpacity(255));
        const mark = calLines(this.data.lines);
        this.slot.hideSymbols(mark);

        // 放线
        const datalines = this.data.lines.filter(l => l.id).map(l => l.indexs as number[]);
        this.drawLine(datalines);
    }

    /**
     * 播放全线动画
     * 不含跑分
     * @param delay 預設 0.7 秒
     */
    public async totalLines(delay: number = .7) {
        this.total();
        this.doTotal?.(false);
        await schedulePromise(delay);
    }

    /**
     * 播放全线动画
     * 含跑分
     * @param delay 預設 0 秒
     */
    public async totalLinesWins(delay: number = 0, duration: number = .7) {
        await this.totalLinesWinsStart(delay, duration);
        this.totalLinesWinsEnd();
    }

    /**
     * 播放全线动画分段
     * 含跑分
     * 應手動呼 totalLinesWinsEnd
     * @param delay 預設 0 秒
     */
    public async totalLinesWinsStart(delay: number = 0, dur: number = .7) {
        this.total();
        this.doTotal?.(true);
        const ml = this.multipleLabel;
        if (ml) {
            ml.node.active = Boolean(this.data.level);
            ml.string = this.data.level;
        }

        return resolveWrapper(tweenNumberToPromise(0, Number(this.data.wins), dur, this.onTweenX.bind(this), {
            easing: easeBezierAction(0, .4, .75, 1),
            after: delayTime(delay),
            key: 'SlotResultBase',
        }));
    }

    public totalLinesWinsEnd() {
        const d = this.data;
        const wl = this.winsLabel;
        const ml = this.multipleLabel;

        const wins = d.wins;
        const level = d.level;

        tweenNumberStop('SlotResultBase');
        if (wl) {
            wl.string = fixThousandth2(wins);
        }
        if (ml) {
            ml.node.active = Boolean(level);
            ml.string = level;
        }
    }

    public totalLinesWinsExecuter2({ delay = 0, group = PROMISE_EXECUTOR2_GROUP.SKIPPABLE, duration = .7 }: { delay?: number, group?: PROMISE_EXECUTOR2_GROUP, duration?: number } = {}): PromiseExecutor2 {
        return [(resolve) => { // 跑分
            this.totalLinesWinsStart(delay, duration).then(resolve);
        }, (stat) => {
            // 被連帶跳過(executor[0] 從沒跑)時，total() 不會執行，
            // 盤面會停在 moveReels=true / mask=false，需在此補建立盤面
            if (stat === PROMISE_EXECUTOR2_STAT.NOT_STARTED) {
                this.total();
                this.doTotal?.(true);
            }
            this.totalLinesWinsEnd();
        }, group];
    }

    public totalLinesWinsExecuter(delay: number = 0, group: PROMISE_EXECUTOR2_GROUP = PROMISE_EXECUTOR2_GROUP.SKIPPABLE, duration: number = .7): PromiseExecutor2 {
        return [(resolve) => { // 跑分
            this.totalLinesWinsStart(delay, duration).then(resolve);
        }, (stat) => {
            // 同 totalLinesWinsExecuter2，被連帶跳過時補建立盤面
            if (stat === PROMISE_EXECUTOR2_STAT.NOT_STARTED) {
                this.total();
                this.doTotal?.(true);
            }
            this.totalLinesWinsEnd();
        }, group];
    }

    /**
     * 時間點：呼叫 loop
     */
    doLoop?(): void;

    /**
     * 播放单线动画
     * @param duration
     * @param delay 呼叫後過多久秒開始播
     */
    public loop() {
        const next = () => {
            this.clear(true);
            this.loopIndex = 0;
            this.doLoop?.();
            if (this.data && this.data.lines.length) {
                if (this.slot.autoTop) {
                    this.slot.top(false);
                }
                this.loop1(this.loopIndex);
                this.schedule(this.loop1.bind(this, undefined), this.loop1Duration, macro.REPEAT_FOREVER);
            }
        };
        this.scheduleOnce(next, this.loop1Delay);
    }

    /**
     * 时间点：跑单线时
     * 用于：播放单线音效，有些图标要与音效对应，目前是重播图标动画(可参考 3009)
     * @param line
     * @param index
     * @param ssbs
     */
    abstract doLoop1(line: SlotResultLineData, index: number, lineNodes: Node[]): void;

    /**
     * 时间点：建立 SlotSymbol 后
     * 用于：增加图标赢分呈现外框(可参考3008)
     */
    doGenNode?(symbol: SymbolBase, reelSymbol: SlotReelSymbol, index: number): void;

    private loop1(idx: number = this.loopIndex + 1) {
        const winsLabel = this.winsLabel;
        const mulLabel = this.multipleLabel;

        this.clear();

        // hide上下symbol(一定要在clear後做,因為clear會打開symbol)
        if (this.slot.autoTop) {
            this.slot.top(false);
        }

        idx = idx % this.data.lines.length;

        this.toggleMask(true);

        const line = this.data.lines[idx];
        // 放部分图标
        const ss = mapIndexsSymbolIndexs(line.symbolIndexs, (ri, i, si) => {
            if (si) {
                return this.skeletonMap[ri][i];
            }
        }).filter(identity);
        ss.forEach(nodeOpacity(255));

        const mark = calLines([line]);
        this.slot.hideSymbols(mark);
        // 放线
        if (line.id) {
            const indexs = line.indexs as number[];
            // this.drawLineGraphics2([indexs]);
            this.drawLine([indexs]);
        }
        // 放赢分
        if (winsLabel) {
            winsLabel.string = line.wins;
        }
        if (line.level && mulLabel) {
            mulLabel.string = line.level;
        }
        if (mulLabel) {
            mulLabel.node.active = Boolean(line.level);
        }
        this.doLoop1(line, idx, ss);

        this.loopIndex = idx;
    }

    public drawLine(iss: number[][]) {
        const d = this.drawLineData;
        const sprite = d.type === 'sprite';
        const graphics = d.type === 'graphics';
        if (sprite || (d && d.time)) {
            this.drawLineSprite(iss);
        } else if (graphics || (this.linesGraphics)) {
            this.drawLineGraphics(iss);
        }
    }

    public drawLineSprite(iss: number[][]) {
        log('drawLine', JSON.stringify(iss));
        if (!iss) {
            return;
        }
        const drd = this.drawLineData;
        const parent = this.layerLine;
        if (!drd || !parent) {
            return;
        }
        const lidx = drd.lineTplIdx;
        const eidx = drd.effectTplIdx;

        const nw = getNodeWidth(this.slot.reels[0].symbolTemplate);
        const time = drd.time;
        const time2 = drd.holdTime;
        const widthPlus = drd.widthPlus;
        const draw1 = (p0: Vec2, p1: Vec2) => {
            const sub = p1.clone().subtract(p0);
            const w = sub.length() + widthPlus;
            return {
                w,
                l: draw(p0, p1, 'line')[0],
                es: draw(p0, p1, 'eff'),
            };
        };
        const draw = (p0: Vec2, p1: Vec2, type: 'line' | 'eff') => {
            const sub = p1.clone().subtract(p0);
            const angle = -radiansToDegrees(sub.signAngle(v2(1, 0)));
            const nor = sub.clone().normalize();

            const line = type === 'line';
            const idx = line ? lidx : eidx;
            if (line) {
                const node = this.getNode(idx);
                const p00 = p0.clone().add(nor.clone().multiplyScalar(-widthPlus / 2));
                setNodePosition(node, p00.x, p00.y);
                setNodeAnchor(node, 0, .5);
                node.angle = angle;

                parent.addChild(node);
                return [node];
            } else {
                const width = getNodeWidth(this.templates[eidx]);
                const dw = sub.length();
                const left = dw % width;
                let count = Math.floor(dw / width);
                if (left) {
                    count += 1;
                }
                return range(count).map((i) => {
                    const node = this.getNode(idx);
                    let w: number;
                    let c: Vec2;
                    if (i === count - 1 && left) {
                        w = left;
                        c = p0.clone().add(nor.clone().multiplyScalar(width * i + w / 2));
                    } else {
                        w = width;
                        c = p0.clone().add(nor.clone().multiplyScalar(width * i + width / 2));
                    }

                    log(dw, angle, i, w, c.x, c.y);
                    setNodeWidth(node, w);
                    setNodePosition(node, c.x, c.y);
                    node.angle = angle;

                    parent.addChild(node);

                    return node;
                });
            }
        };

        iss.forEach(async (is) => {
            const nodes: { l: Node, es: Node[], w: number }[] = [];
            for (let x = 0; x < is.length; x += 1) {
                const y = is[x];
                const pos = vecXToVec2(convertToNodeSpaceAR(parent, this.slot.getPosition(x, y)));
                if (x === 0) {
                    const startPos = pos.clone().subtract(v2((nw / 2), 0));
                    nodes[x] = draw1(startPos, pos);
                } else {
                    const px = x - 1;
                    const py = is[px];
                    const pp = vecXToVec2(convertToNodeSpaceAR(parent, this.slot.getPosition(px, py)));
                    nodes[x] = draw1(pp, pos);
                    if (x === is.length - 1) {
                        const endPos = pos.clone().add(v2((nw / 2), 0));
                        nodes[x + 1] = draw1(pos, endPos);
                    }
                }
            }
            // nodes.map(async (node) => {
            //     node.l.active = false;
            //     node.es.forEach(async (e) => {
            //         e.active = true;
            //     });
            // });
            // return;
            await Promise.all(nodes.map(async (node, i) => {
                const l = node.l;
                const es = node.es;
                const w = node.w;
                l.active = false;
                es.forEach(nodeActive(false));

                await timeoutPromise(i * time);
                setNodeWidth(l, 0);
                setNodeScaleY(l, 0);
                l.active = true;
                const anim = l.getComponent(Animation);
                animationPlay(anim, 0);

                await nodeTweenToPromise({
                    node: l,
                    action: spawn(
                        scaleTo(.02, 1, 1),
                        widthTo(time, w),
                    ),
                });

                await timeoutPromise(time2);
            }));
            await Promise.all(nodes.map(async (node) => {
                node.es.forEach(async (e) => {
                    e.active = true;
                    const anim = e.getComponent(Animation);
                    await animationPlayToPromise(anim, 0);
                    this.recycleNode(e, eidx);
                });
                await nodeTweenToPromise({
                    node: node.l,
                    action: scaleTo(.02, 1, 0),
                });
                this.recycleNode(node.l, lidx);

            }));
        });
    }

    private refGraphics: Graphics[] = [];
    private linesGraphics: Graphics = null;

    public drawLineGraphics(indexss: number[][], graphics: Graphics = this.linesGraphics): void {
        if (!this.linesGraphics || !indexss) {
            return;
        }

        const lg = graphics;
        const parent = graphics.node.parent;
        const nw = getNodeWidth(this.slot.reels[0].symbolTemplate);
        const nh = getNodeHeight(this.slot.reels[0].symbolTemplate);
        const d = this.drawLineData;
        const straight = d && d.extend && d.extend === 'straight';
        lg.clear();
        this.refGraphics.forEach((g) => {
            lg.lineWidth = g.lineWidth;
            lg.strokeColor = g.strokeColor;
            lg.lineCap = g.lineCap;
            lg.lineJoin = g.lineJoin;

            indexss.forEach((indexs) => {
                indexs.forEach((y, x) => {
                    const pos = convertToNodeSpaceAR(parent, this.slot.getPosition(x, y));
                    if (x === 0) {
                        let startPos: Vec3;
                        if (straight) {
                            const ny = indexs[x + 1];
                            const nextPos = convertToNodeSpaceAR(parent, this.slot.getPosition(1, ny));
                            const nor = nextPos.clone().subtract(pos).normalize();
                            nor.multiplyScalar(nw / 2);
                            startPos = pos.clone().subtract(nor);
                        } else {
                            startPos = pos.clone().subtract(v3((nw / 2), 0, 0));
                        }
                        lg.moveTo(startPos.x, startPos.y);
                        lg.lineTo(pos.x, pos.y);
                        return;
                    }
                    if (x === indexs.length - 1) {
                        lg.lineTo(pos.x, pos.y);
                        let endPos: Vec3;
                        if (straight) {
                            const py = indexs[x - 1];
                            const nextPos = convertToNodeSpaceAR(parent, this.slot.getPosition(x - 1, py));
                            const nor = nextPos.clone().subtract(pos).normalize();
                            nor.multiplyScalar(nw / 2);
                            endPos = pos.clone().subtract(nor);
                        } else {
                            endPos = pos.add(v3((nw / 2), 0, 0));
                        }
                        lg.lineTo(endPos.x, endPos.y);
                        return;
                    }
                    lg.lineTo(pos.x, pos.y);
                });
            });
            lg.stroke();
        });
    }

    public showSymbols() {
        const ary = flattenDeep(this.skeletonMap);
        ary.forEach(nodeOpacity(255));
    }

    /**
     * 順序由上到下
     * @param mark 不隱藏要傳 null/undefined
     */
    public hideSymbols(mark: any[][]) {
        mark.forEach((idxs, ri) => {
            const ss = this.skeletonMap[ri];
            if (!ss || !ss.length) {
                return;
            }
            idxs.forEach((val, idx) => {
                if (isNone(val)) {
                    return;
                }
                const s = ss[idx];
                if (!s) {
                    return;
                }
                setNodeOpacity(s, 0);
            });
        });
    }

    public replay(symbols: SymbolType[], nodes: Node[]) {
        const arr = symbols.map(s => '' + s);
        nodes.forEach((node) => {
            const ss = node.getComponent('SymbolBase') as SymbolBase;
            if (arr.indexOf(ss.symbol) !== -1) {
                ss.change(ss.symbol, SLOT_SYMBOL_STATUS.WIN, true);
            }
        });
    }

    public toggleMask(able: boolean) {
        this.maskNodes.forEach(nodeActive(able));
    }
}

export function mapIndexsSymbolIndexs<T>(symbolMap: SlotReelSymbol[][], callback: (ri: number, i: number, si: SlotReelSymbol) => T) {
    return flattenDeep(symbolMap.map((reel, reelIdx) => {
        if (!reel) {
            return;
        }
        return reel.map((symbol, idx) => {
            if (!isNone(symbol)) {
                return callback(reelIdx, idx, symbol);
            }
        });
    })).filter(identity);
}
