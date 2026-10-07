import { _decorator, CCFloat, CCInteger, Component, easing, instantiate, Node, v2 } from 'cc';
import ColBase from '../../game-client-lib/data/ColBase';
import { applyNodeTween } from '../../game-client-lib/data/NodeTween';
import { globalDebugNNN } from '../../game-client-lib/LibGlobal';
import { delayTime, easeInOut, moveTo, removeSelf, sequence, stopAllActions } from '../../game-client-lib/utils/Tween';
import { getNodeHeight, setNodeY, toObjectAccumulateReducer } from '../../game-client-lib/utils/Utils';

const { ccclass, property } = _decorator;

export class PuzzleLineData {
    constructor(
        public symbol: number,
        public count: string,
        public wins: string,
        public level: number = 1,
    ) {

    }
}

@ccclass
export default abstract class PuzzleLines extends Component {

    @property(Node)
    template: Node = null;

    @property(CCInteger)
    length: number = 0;

    @property(CCFloat)
    secPerBlock: number = 0.05;

    private nodes: Node[] = [];

    private height: number = 0;

    onLoad() {
        this.template = this.template || this.node.children[0];
        this.template.removeFromParent();

        // this.width = this.template.width;
        this.height = getNodeHeight(this.template);

        globalDebugNNN(this);
    }

    public push(data: Partial<PuzzleLineData>) {

        const node = instantiate(this.template);
        // 設定資料
        this.node.addChild(node);
        // @ts-ignore
        const cols: ColBase<any>[] = node.getComponentsInChildren(ColBase);
        const colMap = cols.reduce(toObjectAccumulateReducer('colKey'), {});
        for (const k in data) {
            if (data.hasOwnProperty(k)) {
                const d = data[k];
                const cs: ColBase<any>[] = colMap[k] || [];
                cs.forEach(c => c.reset(d, k));
            }
        }

        // 動畫
        const l = this.length;
        const nl = this.nodes.length;
        const h = this.height;

        if (nl >= l) { // 比高度高
            // 將前面的往下擠
            const fix = nl - l - 1;
            // log('PuzzleLines#push', 'fix', fix);
            this.nodes.forEach((n, i) => {
                if (!n.parent) {
                    return;
                }
                const ii = i - fix - 1;
                stopAllActions(n);
                const y1 = n.position.y;
                const y2 = (ii - 1) * h + h / 2;
                const sec = (y1 - y2) / h * this.secPerBlock;
                // log('PuzzleLines#push', i, ii, y1, y2, sec);

                let action = moveTo(sec, v2(0, y2), easeInOut(3));
                if (ii < 0) {
                    action = sequence(action, removeSelf());
                }
                applyNodeTween({
                    action,
                    node: n,
                });
            });
            setNodeY(node, l * h + h / 2);
            const y = (l - 1) * h + h / 2;
            const sec = this.secPerBlock;
            // log('PuzzleLines#push', 'n', node.y, y, sec);
            applyNodeTween({
                node,
                action: moveTo(sec, v2(0, y), easeInOut(3)),
            });
        } else {
            setNodeY(node, l * h + h / 2);
            const y = nl * h + h / 2;
            const sec = Math.sqrt((node.position.y - y) / h) * this.secPerBlock;
            // log('PuzzleLines#push', 'n', node.y, y, sec);
            applyNodeTween({
                node,
                action: sequence(
                    moveTo(sec, v2(0, y), easeInOut(3)),
                    moveTo(0.1, v2(0, y + 20), easing.quadIn),
                    moveTo(0.1, v2(0, y), easing.quadOut),
                ),
            });
        }
        this.nodes.push(node);
    }

    public clear() {
        const l = this.length;
        const nl = this.nodes.length;
        const h = this.height;
        const fix = nl - l - 1;
        let delayi = 0;
        this.nodes.forEach((n, i) => {
            if (!n.parent) {
                return;
            }
            const ii = i - fix - 1;
            stopAllActions(n);
            const y1 = n.position.y;
            const y2 = (ii - l) * h + h / 2;
            const sec = (y1 - y2) / h * this.secPerBlock;
            // log('PuzzleLines#clear', i, ii - l, y1, y2, sec);

            let action = moveTo(sec, v2(0, y2), easeInOut(3));
            action = sequence(delayTime(delayi * .1), action, removeSelf());
            delayi += 1;
            applyNodeTween({
                action,
                node: n,
            });
        });
        this.nodes.length = 0;
    }
}
