import { _decorator, CCFloat, Component, Layout, NodeEventType, Vec2 } from 'cc';
import { getNodeHeight, getNodeWidth, lowerThen, setNodeScale } from '../utils/Utils';

const { ccclass, property, executionOrder, menu, requireComponent } = _decorator;
@ccclass
@executionOrder(1)
@requireComponent(Layout)
@menu('LayoutShrink/LayoutShrink')
export default class LayoutShrink extends Component {

    @property(Vec2)
    wh: Vec2 = new Vec2();

    @property(CCFloat)
    maxScale: number = 1;

    onLoad() {
        const layout = this.getComponent(Layout);
        layout.resizeMode === Layout.ResizeMode.CONTAINER;
        layout.affectedByScale = true;
    }

    onEnable() {
        this.resize();
        this.node.on(NodeEventType.SIZE_CHANGED, this.resize, this);
    }

    onDisable() {
        this.node.off(NodeEventType.SIZE_CHANGED, this.resize, this);
    }

    public resize() {
        const layout = this.getComponent(Layout);

        const node = this.node;

        layout.updateLayout();

        let nw = getNodeWidth(node);
        let nh = getNodeHeight(node);

        if (nw < 0 || nh < 0) {
            node.getComponentsInChildren(Layout).forEach((l) => {
                l.updateLayout();
            });
            this.scheduleOnce(this.resize.bind(this), 0);
        }

        const type = layout.type;
        if (type === Layout.Type.HORIZONTAL) {
            nh = Math.max(...this.node.children.map(n => getNodeHeight(n) * n.getScale().y));
        } else if (type === Layout.Type.VERTICAL) {
            nw = Math.max(...this.node.children.map(n => getNodeWidth(n) * n.getScale().x));
        }

        const w = this.wh.x;
        const h = this.wh.y;
        const arr = [1];

        if (nw && w) {
            arr.push(w / nw);
        }

        if (nh && h) {
            arr.push(h / nh);
        }
        setNodeScale(node, lowerThen(this.maxScale, Math.min.apply(null, arr)));
    }
}
