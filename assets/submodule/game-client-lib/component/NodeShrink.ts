import { _decorator, CCFloat, Component, Enum, Vec2 } from 'cc';
import { getNodeHeight, getNodeWidth, setNodeScale, setNodeScaleX, setNodeScaleY } from '../utils/Utils';

const { ccclass, property, executionOrder, menu, requireComponent } = _decorator;

export enum MODE {
    scale = 0,
    scaleX = 1,
    scaleY = 2,
}

@ccclass
@executionOrder(2)
@menu('LayoutShrink/NodeShrink')
export default class NodeShrink extends Component {

    @property(Vec2)
    wh: Vec2 = new Vec2();

    @property(CCFloat)
    maxScale: number = 1;

    @property({
        type: Enum(MODE),
    })
    mode: MODE = MODE.scale;

    onEnable() {
        this.resize();
        // globalDebugNNN(this.node);
    }

    resize() {
        const node = this.node;

        const nw = getNodeWidth(node);
        const nh = getNodeHeight(node);
        const w = this.wh.x;
        const h = this.wh.y;

        const arr = [];
        if (this.maxScale > 0) {
            arr.push(this.maxScale);
        }
        if ((this.mode === MODE.scale || this.mode === MODE.scaleX) && w && nw) {
            arr.push(w / nw);
        }
        if ((this.mode === MODE.scale || this.mode === MODE.scaleY) && h && nh) {
            arr.push(h / nh);
        }
        if (arr.length === 0) {
            return;
        }
        const scale = Math.min.apply(null, arr);
        if (this.mode === MODE.scale) {
            setNodeScale(node, scale);
        } else if (this.mode === MODE.scaleX) {
            setNodeScaleX(node, scale);
        } else if (this.mode === MODE.scaleY) {
            setNodeScaleY(node, scale);
        }
    }
}
