
import { _decorator, CCInteger, Node } from 'cc';
import ColBase from '../data/ColBase';
import { biggerThen, getNodeOpacity, getNodeWidth, log, lowerThen, setNodeOpacity, setNodeWidth, setNodeX } from '../utils/Utils';
import { TemplateGenerator } from './TemplateGenerator';

const { ccclass, property } = _decorator;

class MarqueeData {
    constructor(
        public message: string,
        public group: string = '',
        public priority: number = 0,

        // 重複此訊息幾次， -1 為無限，0 為不重複
        public loopTimes: number = 0,
        public tpl: number = 0,
    ) {

    }

    public width: number = 0;

    public clone(loopTimes: number): MarqueeData {
        const md = new MarqueeData(this.message, this.group, this.priority, loopTimes, this.tpl);
        md.width = this.width;
        return md;
    }
}

function marqueeSort(a: MarqueeData, b: MarqueeData) {
    return a.priority - b.priority;
}

const MARQUEE_MESSAGE_SEPARATOR = '#';

export function createMarqueeMessage(messages: string[]) {
    return messages.join(MARQUEE_MESSAGE_SEPARATOR);
}

@ccclass
export default class Marquee extends TemplateGenerator {

    @property(Node)
    targetNode: Node = null;

    @property(CCInteger)
    maxWidth: number = 0;

    @property(CCInteger)
    pxPerSec: number = 140;

    @property(CCInteger)
    opacityPerSec: number = 0;

    @property(Node)
    opacityNode: Node = null;

    private width: number = 0;

    // 準備跑馬的資料
    private queue: MarqueeData[] = [];

    // 正在跑的資料
    private playings: MarqueeData[] = [];

    // 正在跑的節點
    private playingNodes: Node[] = [];

    private hanging: boolean = false;
    private firstHang: boolean = false;

    private loaded: boolean = false;

    private beforeRecycleNode(node: Node) {
        this.setMessage(node);
        setNodeWidth(node, 0);
        setNodeX(node, 0);
    }

    // 對訊息做過濾，可能情境為 有系統維護訊息，要清掉原本的遊戲訊息
    // public filter(group: string) {
    //     this.queue = this.queue.filter((data) => {
    //         return data.group !== group;
    //     });
    //     this.playings.forEach((data) => {
    //         if (data.group === group) {
    //             data.loopTimes = 0;
    //         }
    //     });
    // }

    // public forEach(fn: (data: MarqueeData) => void) {
    //     this.queue.forEach(fn);
    //     this.playings.forEach(fn);
    // }

    public get0(): MarqueeData {
        if (this.playings.length) {
            return this.playings[0];
        } else if (this.queue.length) {
            return this.queue[0];
        }
    }

    public length() {
        return this.queue.length + this.playings.length;
    }

    private pushData(data: MarqueeData) {
        this.queue.push(data);
        // 優先級較高的先上
        this.queue.sort(marqueeSort);
    }

    public push(message: string, group?: string, priority?: number, loopTimes?: number, tpl?: number) {
        this.pre();
        this.pushData(new MarqueeData(message, group, priority, loopTimes, tpl));
    }

    public clear() {
        const nodes = this.playingNodes;

        this.queue = [];
        this.playings = [];
        this.playingNodes = [];
        this.hanging = false;
        this.firstHang = false;

        let node: Node;
        while (node = nodes.pop()) {
            this.beforeRecycleNode(node);
            this.recycleNode(node, -1);
        }
    }

    update(dt: number) {
        if (this.firstHang) {
            return;
        }
        // 慢慢往左動
        const px = dt * this.pxPerSec;

        this.playingNodes.forEach((node) => {
            setNodeX(node, node.position.x - px);
        });

        // 第一個已出可見範圍，回收
        if (this.playingNodes[0] && (this.playingNodes[0].position.x < -this.playings[0].width / 2 - this.width / 2)) {
            this.beforeRecycleNode(this.playingNodes[0]);
            this.recycleNode(this.playingNodes[0], -1);

            const finished = this.playings.shift();
            this.playingNodes.shift();
            if (finished.loopTimes === -1) {
                this.pushData(finished.clone(finished.loopTimes));
            } else if (finished.loopTimes > 0) {
                this.pushData(finished.clone(finished.loopTimes - 1));
            }
        }

        let lastIdx = this.playings.length - 1;
        let lastData = this.playings[lastIdx];
        let lastNode = this.playingNodes[lastIdx];

        const targetNode = this.targetNode;

        const o = this.opacityPerSec;
        if (o) {
            const l = this.length();
            const on = this.opacityNode;
            const ono = getNodeOpacity(on);
            if (l && ono < 255) {
                setNodeOpacity(on, lowerThen(255, ono + dt * o));
            }
            if (!l && ono > 0) {
                setNodeOpacity(on, biggerThen(0, ono - dt * o));
            }
        }
        // 最後一個尾巴已到 或 是空的
        if (!this.hanging && ((lastNode && lastNode.position.x < -lastData.width / 2 + this.width / 2) || lastNode == null)) {
            // 檢查是否有訊息
            if (this.queue.length) {
                lastData = this.queue.shift();
                lastNode = this.getNode(lastData.tpl);
                this.playings.push(lastData);
                this.playingNodes.push(lastNode);
                lastIdx = this.playings.length - 1;
                this.setMessage(lastNode, lastData.message);
                setNodeOpacity(lastNode, 0);
                targetNode.addChild(lastNode);
                this.hanging = true;
                return;
            }
        }

        if (this.hanging) {
            if (lastNode) {
                const lastNodeW = getNodeWidth(lastNode);
                if (lastNodeW) {
                    // 異步算完寬度了
                    lastData.width = lastNodeW;
                    setNodeOpacity(lastNode, 255);
                    const first = this.playings.indexOf(lastData) === 0;
                    this.firstHang = false;
                    if (first) {
                        if (this.queue.length === 0 && lastNodeW <= this.width) {
                            setNodeX(lastNode, 0);
                            this.firstHang = true;
                            return;
                        }
                        setNodeX(lastNode, lastData.width / 2 - this.width / 2 / 2);
                        this.firstHang = true;
                        const next = () => {
                            this.firstHang = false;
                        };
                        this.scheduleOnce(next, .5);
                    } else {
                        setNodeX(lastNode, lastData.width / 2 + this.width / 2);
                    }
                    this.hanging = false;
                }
            } else {
                this.hanging = false;
            }
        }
    }

    onLoad() {
        super.onLoad();
        this.pre();
    }

    private pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.width = this.maxWidth;
        this.targetNode = this.targetNode || this.node;
        this.opacityNode = this.opacityNode || this.node;
        if (this.opacityPerSec) {
            setNodeOpacity(this.opacityNode, 0);
        }
    }

    private setMessage(node: Node, message: string = '') {
        const msgs = message.split(MARQUEE_MESSAGE_SEPARATOR);
        node.getComponentsInChildren(ColBase).forEach((c, i) => {
            c.reset(msgs[i] || '');
            log('setMessage', c, msgs[i]);
        });
    }

    // onResized(size: Size) {
    //     this.pre();

    //     const width = lowerThen(this.maxWidth , toNaturalNumber(size.width - 428 * 2));
    //     this.width = width;
    //     setNodeWidth(this.node, width);
    //     setNodeWidth(this.bgNode, width);
    // }
}
