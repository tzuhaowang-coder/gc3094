import { _decorator, CCBoolean, CCFloat, Component, Node, Tween, tween } from 'cc';
import { getNodeHeight, getNodeWidth, setNodeX, setNodeY } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export class LoopBackground extends Component {

    @property(Node)
    nodes: Node[] = [];

    @property({
        tooltip: '即 speed',
        type: CCFloat,
    })
    perSec: number = 100;

    @property({
        tooltip: '是否 直向(控制y)',
    })
    vertical: boolean = false;

    /**
     * 如果 vertical=true && loopLeft=true，代表向上走
     */
    @property(CCBoolean)
    loopLeft: boolean = false;

    @property(CCBoolean)
    loopOnLoad: boolean = false;

    private looping: boolean = false;

    private per: number = 0;

    /**
     * 全部 nodes 的 width
     */
    private width: number = 0;

    private tween: Tween<this> = null;

    onLoad() {
        const v = this.vertical;
        let w = 0;
        this.nodes.forEach((n) => {
            w += v ? getNodeHeight(n) : getNodeWidth(n);
        });
        const halfW = w / 2;
        let totalW = 0;
        this.nodes.forEach((n) => {
            const nw = v ? getNodeHeight(n) : getNodeWidth(n);
            const nx = - halfW + totalW + nw / 2;
            if (v) {
                setNodeY(n, nx);
            } else {
                setNodeX(n, nx);
            }
            totalW += nw;
        });

        this.width = w;
        if (this.loopOnLoad) {
            this.loop(true);
        }
    }

    public loop(able: boolean, tweenSec: number = 0) {
        if (this.looping === able) {
            return;
        }
        const per = able ? this.perSec : 0;
        if (this.tween) {
            this.tween.stop();
            this.tween = null;
        }
        this.looping = able;
        if (this.per !== per) {
            const t = tween(this);
            // @ts-ignore
            t.to(tweenSec, { per });
            t.start();
            this.tween = t;
        }
    }

    /**
     *
     * @param x
     * @todo x 傳太大的值會不對
     */
    public shift(x: number) {
        const v = this.vertical;
        const w = this.width;
        const halfW = w / 2;
        const getNw = (node: Node) => v ? getNodeHeight(node) :getNodeWidth(node);
        this.nodes.forEach((n) => {
            let nx = getNw(n) + x;
            // 循環點先用一半的寬
            // 之後再看要不要改可設置的可視寬
            if (!this.loopLeft && nx >= halfW) {
                nx -= w;
            }
            if (this.loopLeft && nx <= -halfW) {
                nx += w;
            }
            if (v) {
                setNodeY(n, nx);
            } else {
                setNodeX(n, nx);
            }
        });
    }

    update(dt: number) {
        if (!this.looping) {
            return;
        }
        const fix = this.loopLeft ? -1 : 1;
        const x = fix * dt * this.per;

        this.shift(x);
    }

}
