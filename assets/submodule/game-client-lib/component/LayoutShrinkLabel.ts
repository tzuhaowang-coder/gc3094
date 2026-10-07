
import { _decorator, CCBoolean, CCFloat, Component, HorizontalTextAlignment, Label, Layout, RichText, v2, Vec2 } from 'cc';
import { getNodeAnchor, getNodeHeight, getNodeWidth, identity, lowerThen, nodeOpacity, setNodeAnchor, setNodeAnchorX, setNodeAnchorY, setNodeContentSize, setNodeScale, setNodeWidth, warn } from '../utils/Utils';

const MAX_TRY: number = 11;

const wm = new WeakMap<Label, LayoutShrinkLabel>();
export function getRefLayoutShrinkLabel(label: Label) {
    return wm.get(label);
}

const { ccclass, property, menu, executionOrder, requireComponent } = _decorator;
@ccclass
@executionOrder(1)
@menu('LayoutShrink/LayoutShrinkLabel')
export default class LayoutShrinkLabel extends Component {

    @property({
        tooltip: 'x,y 都要設',
    })
    wh: Vec2 = new Vec2();

    @property(CCFloat)
    maxScale: number = 1;

    @property([Label])
    labels: Label[] = [];

    @property([RichText])
    richTexts: RichText[] = [];
    private maxWidth: number = 0;
    private currentMaxScale: number = 0;

    private try: number = 0;

    private resized: boolean = false;

    @property(CCBoolean)
    delay: boolean = false;

    private pred: boolean = false;
    public pre() {
        if (this.pred) {
            return;
        }
        this.pred = true;
        this.setTextOpacity(1);

        this.labels.forEach(l => wm.set(l, this));
        let layout = this.getComponent(Layout);
        const node = this.node;
        if (!layout) {
            const w = getNodeWidth(node);
            const h = getNodeHeight(node);
            this.wh = v2(this.wh.x || w, this.wh.y || h);
            layout = this.addComponent(Layout);
            layout.type = Layout.Type.VERTICAL;
            layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
            layout.resizeMode = Layout.ResizeMode.CONTAINER;
            layout.affectedByScale = true;

            if (!(this.richTexts.length || this.labels.length)) {
                this.labels = node.children.map(n => n.getComponent(Label)).filter(identity);
                this.richTexts = node.children.map(n => n.getComponent(RichText)).filter(identity);
            }
            const anchor = getNodeAnchor(node);
            const nax =  anchor.anchorX;
            const nay = anchor.anchorY;
            this.labels.forEach((l) => {
                setNodeWidth(l.node, w);
                setNodeAnchorX(l.node, nax);
                setNodeAnchorY(l.node, nay);
                l.overflow = Label.Overflow.RESIZE_HEIGHT;
            });
            this.richTexts.forEach((r) => {
                setNodeWidth(r.node, w);
                r.maxWidth = w;
                setNodeAnchor(r.node, nax, nay);
                r.horizontalAlign = HorizontalTextAlignment.LEFT;
            });
            layout.updateLayout();
        } else {
            layout.resizeMode = Layout.ResizeMode.CONTAINER;
            layout.affectedByScale = true;
        }

        this.richTexts = this.richTexts.filter(identity);
        this.labels = this.labels.filter(identity);

        if (!(this.richTexts.length || this.labels.length)) {
            this.richTexts = this.node.getComponentsInChildren(RichText);
            this.labels = this.node.getComponentsInChildren(Label);
        }

        const arr = [];
        arr.push(...this.richTexts.map(r => r.maxWidth));
        arr.push(...this.labels.map(r => getNodeWidth(r.node)));
        if (!arr.length) {
            return;
        }

        if (this.wh.x === 0 || this.wh.y === 0) {
            warn('wh can\'t is zero');
            return;
        }

        const mw = Math.max.apply(null, arr);
        this.maxScale = Math.max(mw / this.wh.x, this.maxScale);
        this.currentMaxScale = this.maxScale;
        setNodeScale(this.node, this.maxScale);
        this.maxWidth = this.wh.x;
    }

    start() {
        if (!this.delay) {
            this.resize();
        }
    }

    onEnable() {
        if (!this.resized && !this.delay) {
            this.resize();
        }
    }

    public reset() {
        this.pre();
        this.setTextOpacity(1);
        this.resized = false;
        this.currentMaxScale = this.maxScale;
        setNodeScale(this.node, this.maxScale);
        this.try = 0;
        const mw = this.maxWidth;
        this.labels.forEach((r) => {
            setNodeWidth(r.node, mw);
        });
        this.richTexts.forEach((r) => {
            r.maxWidth = mw;
        });
        setNodeContentSize(this.node, this.wh.x, 0);
    }

    public resize() {
        if (!this.node.activeInHierarchy) {
            this.delay = false;
            return;
        }
        this.pre();
        this.unscheduleAllCallbacks();
        this.richTexts = this.richTexts.filter(r => r.isValid && r.node).filter(identity);
        this.labels = this.labels.filter(r => r.isValid && r.node).filter(identity);

        this.reset();
        this.scheduleOnce(this.resizeLoop.bind(this));
    }

    private resizeLoop(): void {
        const layout = this.getComponent(Layout);
        layout.updateLayout();

        const node = this.node;
        const nw = getNodeWidth(node) * node.getScale().x;
        const nh = getNodeHeight(node) * node.getScale().y;
        const h = this.wh.y;
        if (nw < 0 || nh < 0) {
            node.getComponentsInChildren(Layout).forEach((l) => {
                l.updateLayout();
            });
            this.scheduleOnce(this.resizeLoop.bind(this));
            return;
        }

        this.try += 1;
        if (this.try >= MAX_TRY) {
            this.setTextOpacity(255);
            this.resized = true;
            return;
        }

        const arr = [1];
        if (nh && h) {
            arr.push(h / nh);
        }
        const min: number = lowerThen(this.maxScale, Math.min.apply(null, arr));
        if (this.richTexts.length > 0 || this.labels.length > 0) {
            const s = ((this.currentMaxScale * min) + this.currentMaxScale) / 2;
            if (s < this.maxScale) {
                const mw = 1 / s * this.maxWidth;
                setNodeWidth(node, mw);
                this.labels.forEach((r) => {
                    if (r.isValid && r.node) {
                        setNodeWidth(r.node, mw);
                    }
                });
                this.richTexts.forEach((r) => {
                    if (r.isValid && r.node) {
                        r.maxWidth = mw;
                    }
                });
                node.getComponentsInChildren(Layout).forEach((l) => {
                    l.updateLayout();
                });
                if (Math.abs(this.currentMaxScale - s) <= 0.05) {
                    this.currentMaxScale = s;
                    setNodeScale(node, s);
                    this.setTextOpacity(255);
                    this.resized = true;
                    return;
                } else {
                    this.currentMaxScale = s;
                    setNodeScale(node, s);
                    this.scheduleOnce(this.resizeLoop.bind(this));
                    return;
                }
            }
        }
        this.resized = true;
        this.setTextOpacity(255);
        setNodeScale(node, min);
    }

    private setTextOpacity(value: number) {
        this.richTexts.map(r => r.node).forEach(nodeOpacity(value));
        this.labels.map(r => r.node).forEach(nodeOpacity(value));
    }
}
