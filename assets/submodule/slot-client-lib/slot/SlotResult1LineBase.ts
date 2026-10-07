import { _decorator, Animation, CCFloat, instantiate, Label, macro, Node } from 'cc';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';
import { animationPlayToPromise, resolveWrapper, schedulePromise, tweenNumberStop, tweenNumberToPromise } from '../../game-client-lib/script/PromiseManager';
import { PROMISE_EXECUTOR2_GROUP, PromiseExecutor2 } from '../../game-client-lib/script/PromiseManager2';
import { fixThousandth2, fixThousandth3 } from '../../game-client-lib/utils/Balance';
import { delayTime, easeBezierAction } from '../../game-client-lib/utils/Tween';
import { identity, loop2ArrayWithMinLength, setNodeOpacity } from '../../game-client-lib/utils/Utils';
import { SymbolType } from '../protobuf/ProtobufWarp';
import SlotBase from './SlotBase';
import { SLOT_SYMBOL_STATUS } from './SlotData';
import { extractSymbolType, SlotReelSymbol } from './SlotReel';
import { ISlotResult, MULTIPLE_MARK } from './SlotResultBase';
import { SpriteSkeletonSymbolBase } from './SpriteSkeletonSymbolBase';

const { ccclass, property } = _decorator;

export class SlotResult1LineData {
    constructor(
        public types: SlotReelSymbol[] = [],
        public wins: number = 0,
        public odds: number = 0,
        public level: number = 0,
        public custom: any = null,
    ) {

    }
}

@ccclass
export default abstract class SlotResult1LineBase extends TemplateGenerator implements ISlotResult {

    @property({
        type: Node,
        tooltip: '倍數的文字樣板，如果沒設就不做倍數',
    })
    labelTemplate: Node = null;

    @property([Node])
    symbolParentNodes: Node[] = [];

    @property([Node])
    totalParentNodes: Node[] = [];

    @property(Node)
    winsLightNode: Node = null;

    @property(Label)
    winsLabel: Label = null;

    @property(SlotBase)
    slot: SlotBase = null;

    @property(CCFloat)
    loop1Delay: number = .3;

    @property(CCFloat)
    loop1Duration: number = 1.5;

    protected data: SlotResult1LineData = null;

    private symbolNodes: Node[] = [];

    abstract doTweenX(x: number): void;

    onTweenX(x: number) {
        this.doTweenX(x);
        this.winsLabel.string = fixThousandth3('' + x);
    }

    public clear(unschedule: boolean = false) {
        if (unschedule) {
            this.unscheduleAllCallbacks();
        }

        this.totalParentNodes.forEach((node) => {
            while (node.children.length) {
                this.recycleNode(node.children[0]);
            }
        });

        this.winsLabel.string = '';
        const anim = this.winsLabel.getComponent(Animation);
        anim.stop();

        this.winsLightNode.active = false;
        this.winsLabel.node.setScale(1, 1, 1);

    }

    doClearAll?(): void;

    public clearAll() {
        this.clear(true);
        this.symbolParentNodes.forEach((node) => {
            while (node.children.length) {
                this.recycleNode(node.children[0]);
            }
        });
        this.symbolNodes.length = 0;

        this.doClearAll?.();
    }

    private fixData(data: Partial<SlotResult1LineData>): SlotResult1LineData {
        return new SlotResult1LineData(data.types, data.wins, data.odds, data.level);
    }

    public reset(data: Partial<SlotResult1LineData>) {
        this.clearAll();

        const d = this.fixData(data);
        this.data = d;

        this.symbolNodes = loop2ArrayWithMinLength(this.symbolParentNodes, d.types, (p, type) => {
            const node = this.getNode();
            p.addChild(node);
            const symbolBase = node.getComponent(SpriteSkeletonSymbolBase);

            let multiple = '';
            const t = extractSymbolType(type);
            if (t === SymbolType.W2) {
                multiple = MULTIPLE_MARK + 2;
            } else if (t === SymbolType.W3) {
                multiple = MULTIPLE_MARK + 3;
            }

            if (multiple && this.labelTemplate) {
                const labelNode = instantiate(this.labelTemplate);
                const label = labelNode.getComponent(Label);
                label.string = multiple;
                node.addChild(labelNode);
            }
            setNodeOpacity(node, 0);
            symbolBase.change(type, SLOT_SYMBOL_STATUS.WIN);
            return node;
        });
    }

    /**
     *
     * @param animDur 贏分圖標展演時間，預設一秒。
     */
    public async totalLines(animDur: number = 1) {
        this.clear(true);
        this.hideSymbol();
        this.winsLightNode.active = false;
        setNodeOpacity(this.winsLabel.node, 255);

        const d = this.data;
        const animDatas = d.types.map((type, idx) => {
            const node = this.getNode();
            setNodeOpacity(node, 255);
            const p = this.totalParentNodes[idx];
            p.addChild(node);
            const symbolBase = node.getComponent(SpriteSkeletonSymbolBase);

            let labelNode: Node = null;
            if (this.labelTemplate) {

                let multiple = '';
                const t = extractSymbolType(type);
                if (t === SymbolType.W2) {
                    multiple = MULTIPLE_MARK + 2;
                } else if (t === SymbolType.W3) {
                    multiple = MULTIPLE_MARK + 3;
                }
                if (multiple) {
                    labelNode = instantiate(this.labelTemplate);
                    const label = labelNode.getComponent(Label);
                    label.string = multiple;
                    setNodeOpacity(labelNode, 0);
                    node.addChild(labelNode);
                }
            }
            return {
                type,
                labelNode,
                symbolBase,
            };
        });

        await Promise.all(animDatas.map((animData) => {
            const type = animData.type;
            const symbolBase = animData.symbolBase;
            symbolBase.change(type, SLOT_SYMBOL_STATUS.WIN);
            return schedulePromise(animDur);
        }));

        const labelNodes = animDatas.map(x => x.labelNode).filter(identity);
        if (labelNodes.length) {
            await Promise.all(labelNodes.map((node) => { // 如果有倍数出倍数 0.13s
                const anim = node.getComponent(Animation);
                return animationPlayToPromise(anim, 1);
            }));
        }

        this.winsLightNode.active = true;
        const anim = this.winsLightNode.getComponent(Animation);
        if (anim.clips.length) {
            await animationPlayToPromise(anim);
        }
    }

    public async totalLinesWins(delay: number = 0, duration:number = .7)  {
        await this.totalLinesWinsStart(delay, duration);
        this.totalLinesWinsEnd();
    }

    public async totalLinesWinsStart(delay: number = 0, duration:number = .7) {
        await resolveWrapper(tweenNumberToPromise(0, Number(this.data.wins), duration, this.onTweenX.bind(this), {
            easing: easeBezierAction(0, .4, .75, 1),
            after: delayTime(delay),
            key: 'SlotResult1LineBase',
        }));
    }

    public totalLinesWinsEnd() {
        const d = this.data;
        const wlabel = this.winsLabel;

        const wins = d.wins;
        const level = d.level;

        tweenNumberStop('SlotResult1LineBase');
        wlabel.string = fixThousandth2('' + wins);
    }

    public totalLinesWinsExecuter(delay: number = 0, group: PROMISE_EXECUTOR2_GROUP = PROMISE_EXECUTOR2_GROUP.SKIPPABLE): PromiseExecutor2 {
        return [(resolve) => { // 跑分
            this.totalLinesWins(delay).then(resolve);
        }, () => {
            this.totalLinesWinsEnd();
        }, group];
    }

    public totalLinesWinsExecuter2({ delay = 0, group = PROMISE_EXECUTOR2_GROUP.SKIPPABLE, duration = .7 }:{ delay?:number , group?: PROMISE_EXECUTOR2_GROUP, duration?:number } = {}): PromiseExecutor2 {
        return [(resolve) => { // 跑分
            this.totalLinesWinsStart(delay, duration).then(resolve);
        }, () => {
            this.totalLinesWinsEnd();
        }, group];
    }

    /**
     * 播放单线动画
     * @param duration
     * @param delay 呼叫後過多久秒開始播
     */
    public loop() {
        const next = () => {
            this.clear(true);
            const d = this.data;
            if (!d.wins) {
                this.slot.showSymbols();
                return;
            }
            this.loop1();
            this.schedule(this.loop1.bind(this, undefined), this.loop1Duration, macro.REPEAT_FOREVER);
        };
        this.scheduleOnce(next, this.loop1Delay);
    }

    protected hideSymbol() {
        // 关转轮图标
        const mark = [];
        mark[0] = [];
        mark[1] = [];
        mark[2] = [];
        mark[0][2] = 1;
        mark[1][2] = 1;
        mark[2][2] = 1;

        this.slot.hideSymbols(mark);
    }

    abstract doLoop1(): void;

    private loop1(): void {
        this.clear();

        const d = this.data;
        this.winsLightNode.active = true;

        // 放图标 & 图标重播
        this.symbolNodes.forEach((node, index) => {
            setNodeOpacity(node, 255);

            const type = d.types[index];
            const symbolBase = node.getComponent(SpriteSkeletonSymbolBase);
            symbolBase.change(type, SLOT_SYMBOL_STATUS.WIN);
            const anim = node.getComponentInChildren(Animation);
            if (anim && anim.clips.length) {
                animationPlayToPromise(anim, 0);
            }
        });
        this.hideSymbol();

        // 放赢分
        this.winsLabel.string = fixThousandth2('' + this.data.wins);
        const anim = this.winsLabel.getComponent(Animation);
        anim.play();

        this.doLoop1();
    }

}
