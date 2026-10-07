
import { _decorator, CCFloat, CCInteger, Node, Tween, v2 } from 'cc';
import { TemplateGenerator } from '../component/TemplateGenerator';
import { nodeTweenToPromise } from '../data/NodeTween';
import { timeoutPromise } from '../script/PromiseManager';
import { callFunc, moveTo, sequence } from '../utils/Tween';
import { getNodeHeight, setNodeOpacity, setNodeY, vecXToVec3 } from '../utils/Utils';
import SlotSimpleSymbolBase from './SlotSimpleSymbolBase';

const { ccclass, property } = _decorator;

export interface SlotSimpleBaseOptions {
    // beforeSpin?(reelIndex: number) : void;
    // beforeStop?(reelIndex: number) : void;
    almostStop?(reelIndex: number) : void;
    // afterStop?(reelIndex: number) : void;
}

/**
 * #TODO: 完成多線
 * 目前只有處理一線老虎機
 */
@ccclass
export default abstract class SlotSimpleBase extends TemplateGenerator {

    @property(CCFloat)
    reelDelay: number = .2;

    @property([Node])
    reelNodes: Node[] = [];

    @property({
        type: CCInteger,
        tooltip: '一線的至少要有 6 個',
    })
    count: number = 6;

    /**
     * 彈跳的距離
     */
    @property(CCInteger)
    bouncePx: number = 10;

    /**
     * 彈跳的時間(秒)
     */
    @property(CCFloat)
    bounceDur: number = .1;

    @property(CCInteger)
    speed: number = 300;

    private reelSymbols: SlotSimpleSymbolBase[][] = [];

    protected options: SlotSimpleBaseOptions;

    onLoad() {

        super.onLoad();
        const tpl = this.templates[0];
        const h = getNodeHeight(tpl);
        if (this.count < 6) {
            this.count = 6;
        }
        const ey = -(this.count - 3) * h;
        this.reelNodes.forEach((reelNode, idx) => {
            this.reelSymbols[idx] = [];
            setNodeY(reelNode, ey);

            for (let i = 0; i < this.count; i += 1) {
                const node = this.getNode();
                const sym = node.getComponent('SlotSimpleSymbolBase') as SlotSimpleSymbolBase;

                this.reelSymbols[idx].push(sym);
                sym.reset(this.random(idx, i, true));
                const y = (i - 1) * h;
                node.setPosition(vecXToVec3(v2(0, y)));
                reelNode.addChild(node);
            }

        });
    }

    abstract random(reelIdx: number, idx: number, init: boolean): string;

    public async spin(result: string[], mi: boolean= false): Promise<any> {

        const delay = this.reelDelay;
        const count = this.count;
        const bpx = this.bouncePx;
        const bd = this.bounceDur;
        const speed = this.speed;
        const tpl = this.templates[0];
        const h = getNodeHeight(tpl);
        const l = this.count - 3;
        const rl = this.reelNodes.length;

        await Promise.all(this.reelNodes.map(async (node, idx) => {

            const x = node.position.x;
            const vy = (y: number) => v2(x, y);
            const dur = (y: number) => Math.abs(y) / speed;
            const last = idx === rl - 1;

            // 延遲
            await timeoutPromise(idx * delay);

            // 移動盤面
            // 後3 放到 前3
            const symbols = this.reelSymbols[idx];
            for (let i = 0; i < this.count; i += 1) {
                let sym: string;
                if (i < 3) {
                    sym = symbols[l + i].val;
                } else if (i === this.count - 2) {
                    sym = result[idx];
                } else {
                    sym = this.random(idx, i, false);
                }
                symbols[i].reset(sym);
            }

            const ey = -(count - 3) * h;
            // [
            //     0,
            //            // 往上
            //     bpx,
            //            // 往下
            //     0,
            //            // loop
            //          +h
            //          +0.3h
            //     ey,
            //            // 往下
            //     ey - bpx,
            //            // 往上
            //     ey,
            // ]
            setNodeY(node, 0);
            let action: Tween<Node>;
            const opt = this.options;
            if (last && mi) {
                const m1y = ey + 1 * h;
                const m03y = ey + .3 * h;
                action = sequence(
                    moveTo(bd, vy(bpx)), // 往上
                    moveTo(dur(bpx - m1y), vy(m1y)), // 往下
                    moveTo(.5, vy(m03y)), // 往下
                    moveTo(.2, vy(ey)), // 往下
                    opt && opt.almostStop && callFunc(() => opt.almostStop(idx)),
                    moveTo(.1, vy(ey - bpx)), // 往下
                    moveTo(bd, vy(ey)), // 結束
                );
            } else {
                action = sequence(
                    moveTo(bd, vy(bpx)), // 往上
                    moveTo(dur(bpx - ey), vy(ey)), // 往下
                    opt && opt.almostStop && callFunc(() => opt.almostStop(idx)),
                    moveTo(dur(bpx), vy(ey - bpx)), // 往下
                    moveTo(bd, vy(ey)), // 結束
                );
            }
            await nodeTweenToPromise({
                node,
                action,
            });
        }));
    }

    public hideReels() {
        this.reelNodes.forEach(n => setNodeOpacity(n, 0));
    }

    public showReels() {
        this.reelNodes.forEach(n => setNodeOpacity(n, 255));
    }
}
