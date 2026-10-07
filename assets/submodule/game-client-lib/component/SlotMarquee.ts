
import { _decorator, CCFloat, CCInteger, Layout, lerp, Node, UIOpacity } from 'cc';
import ColBase from '../data/ColBase';
import { globalDebugNNN } from '../LibGlobal';
import { getNodeWidth, log, setNodeOpacity, setNodeWidth, setNodeX, setNodeY } from '../utils/Utils';
import { TemplateGenerator } from './TemplateGenerator';

const { ccclass, property } = _decorator;

export class MarqueeData {
    constructor(
        public message: string,
        public tpl: number = 0,
        public cache: boolean = true,
        public animation: boolean = true,               // 贏分彈出效果，Only Message 使用
        public score?:{                                 // 共贏得跑分，Only Message 使用
            wins:number,                                // 贏分
            totalBet:number,                            // 總下注
            setNumStartCallBack?:Function               // 跑分執行前 callback
            setNumRunningCallBack?:Function,            // 跑分執行中 callback
            setNumEndCallBack?:Function,                // 跑分結束時 callback
            setNumEndNotPlayBoardWin?:boolean,          // 跑分結束時，是否再播放一次贏分效果
        },
        public animationEnactive:boolean = true,
    ) {

    }

    public width: number = 0;

    public toString() {
        return this.tpl + MARQUEE_MESSAGE_SEPARATOR + this.message;
    }
}

const MARQUEE_MESSAGE_SEPARATOR = '#';
const DELAY_Y = 100000;

export function createMarqueeMessage(messages: string[]) {
    return messages.join(MARQUEE_MESSAGE_SEPARATOR);
}

export function getMarqueeDataString(mds: MarqueeData[]) {
    return mds.map(d => d.toString()).join(',');
}

export function setMessage(node: Node, message: string = '') {
    const msgs = message.split(MARQUEE_MESSAGE_SEPARATOR);
    node.getComponentsInChildren(ColBase).forEach((c, i) => {
        c.reset(msgs[i] || '');
        log('setMessage', c, msgs[i]);
    });
}

@ccclass
export default class SlotMarquee extends TemplateGenerator {

    @property(Node)
    targetNode: Node = null;

    @property(CCInteger)
    maxWidth: number = 0;

    @property(CCFloat)
    eachDuration: number = 10;

    @property(CCFloat)
    delayDuration: number = 2;

    /**
     * gen 出來的 template，都放在此節點底下。
     * SlotMarquee 身上會放 cc.Mask，無法在此節點放 cc.UIOpacity，會出現畫面異常
     * this.nodes 的父節點，用增加透明度開關。
     */
    public marqueesParent:Node = null;
    public marParentUIOpa:UIOpacity = null;

    private width: number = 0;

    // 正在跑的資料
    private data: MarqueeData[] = [];

    // 正在跑的節點
    private nodes: Node[] = [];

    private cache: Map<string, [MarqueeData, Node]> = new Map();

    private idx: number = -1;

    private hanging: boolean = false;

    private loaded: boolean = false;

    private delta: number = 0;

    onLoad() {
        super.onLoad();
        this.pre();
    }

    private pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        globalDebugNNN(this, 'sm', false);
        this.width = this.maxWidth;
        this.targetNode = this.targetNode || this.node;

        this.marqueesParent = new Node();
        this.marqueesParent.setParent(this.targetNode);
        this.marParentUIOpa = this.marqueesParent.addComponent(UIOpacity);
        this.marParentUIOpa.opacity = 0;
    }

    public getString() {
        return getMarqueeDataString(this.data);
    }

    public play(data: MarqueeData[]) {
        this.pre();
        this.clear();
        this.data = data;
        if (data.length) {
            let cached = true;
            this.nodes = data.map((d, idx) => {
                let node: Node;
                if (d.cache && this.cache.has(d.toString())) {
                    const [c, n] = this.cache.get(d.toString());
                    this.data[idx] = c;
                    node = n;
                } else {
                    node = this.getNode(d.tpl);
                    setNodeWidth(node, 0);
                    setMessage(node, d.message);
                    setNodeOpacity(node, 1);
                    node.getComponentsInChildren(Layout).forEach(l => l.updateLayout());
                    cached = false;
                }
                setNodeY(node, DELAY_Y);
                node.setParent(this.marqueesParent);
                return node;
            });
            if (cached) {
                this.hanging = false;
                this.idx = 0;
                this.nodes.forEach((node, idx) => {
                    setNodeY(node, 0);
                    const d = this.data[idx];
                    if (idx === 0) {
                        this.setX(d, node);
                        setNodeOpacity(node,  255);
                    } else {
                        setNodeOpacity(node,  0);
                    }
                });
            } else {
                this.scheduleOnce(() => this.hanging = true, 0);
            }
        }
    }

    public clear() {
        const nodes = this.nodes;
        const data = this.data;

        this.data = [];
        this.nodes = [];
        this.idx = -1;
        this.hanging = false;
        this.delta = 0;

        for (let i = 0; i < data.length; i += 1) {
            const d = data[i];
            const n = nodes[i];
            if (d.cache) {
                if (!this.cache.has(d.toString())) {
                    this.cache.set(d.toString(), [d, n]);
                }
                n.removeFromParent();
            } else {
                this.recycleNode(n, -1);
            }
        }
    }

    update(delta: number) {
        const idx = this.idx;
        if (this.hanging) {
            this.nodes.forEach((n, i) => {
                const d = this.data[i];
                let w = 0;
                const l = n.getComponent(Layout);
                if (l) {
                    if (n.children.every(n => getNodeWidth(n) > 0)) {
                        w = getNodeWidth(n);
                    }
                } else {
                    w = getNodeWidth(n);
                }
                if (w) {
                    d.width = w;
                }
            });
            if (this.data.every(data => data.width > 0)) {
                // 異步算完寬度了
                this.hanging = false;
                this.idx = 0;
                this.nodes.forEach((node, idx) => {
                    const d = this.data[idx];
                    if (!d.cache) {
                        node.getComponentsInChildren(Layout).forEach(l => l.updateLayout());
                    }
                    setNodeY(node, 0);
                    if (idx === 0) {
                        this.setX(d, node);
                        setNodeOpacity(node,  255);
                    } else {
                        setNodeOpacity(node,  0);
                    }
                });
            }
            return;
        }
        if (idx === -1) {
            return;
        }

        const node = this.nodes[idx];

        if (this.delta < this.eachDuration) {
            const data = this.data[idx];
            this.setX(data, node);
        } else {
            this.delta = 0;
            if (this.data.length !== 1) {
                this.idx = (idx + 1) % this.data.length;
                const node2 = this.nodes[this.idx];
                const data2 = this.data[this.idx];
                this.setX(data2, node2);

                setNodeOpacity(node, 0);
                setNodeOpacity(node2, 255);
            }
        }

        if (this.marParentUIOpa.opacity === 0) { // 不顯示
            return;
        }
        this.delta += delta;
    }

    private setX(data: MarqueeData, node: Node) {
        const nw = this.width;
        const w = data.width;
        let x: number;
        if (w > nw) {
            const l = w / 2 - nw / 2;
            const r = -w / 2 - nw / 2;
            if (this.delta < this.delayDuration) {
                x = l;
            } else {
                const dt = (this.delta - this.delayDuration) / (this.eachDuration - this.delayDuration);
                x = lerp(l, r, dt);
            }
        } else {
            x = 0;
        }
        setNodeX(node, x);
    }

}
