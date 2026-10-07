import { _decorator, CCBoolean, CCInteger, Component, Graphics, Rect, v2, Vec2 } from 'cc';
import { range2, sumReducer } from '../utils/Utils';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass
@executeInEditMode
export default class GraphicsTable extends Component {

    @property(Graphics)
    graphics: Graphics = null;

    @property(CCBoolean)
    fill: boolean = false;

    @property({
        type: [CCInteger],
        tooltip: '',
    })
    xs: number[] = [];

    @property([CCInteger])
    ys: number[] = [];

    @property(Rect)
    rect: Rect = null;

    onLoad() {
        this.graphics = this.graphics || this.getComponent(Graphics);
        this.onLoadDraw();
    }

    onFocusInEditor() {
        this.onLoadDraw();
    }

    onLostFocusInEditor() {
        this.onLoadDraw();
    }

    public onLoadDraw() {
        const rect = this.rect;
        let xs = this.xs.slice(0);
        let ys = this.ys.slice(0);
        if (rect && !xs.length && !ys.length) {
            xs = range2(rect.x).map(x => rect.width);
            ys = range2(rect.y).map(y => rect.height);
        }
        this.clear();
        if (xs.length && ys.length) {
            this.draw(xs, ys);
        }
    }

    public draw(xs: number[], ys: number[], offset: Vec2 = v2(0, 0)) {

        const g = this.graphics;
        // g.clear();
        xs = xs || this.xs;
        ys = ys || this.ys;

        if (!xs.length || !ys.length) {
            return;
        }

        const lx = xs.reduce(sumReducer, 0);
        const ly = ys.reduce(sumReducer, 0);
        const ox = offset.x;
        const oy = offset.y;

        // 內線
        let x = 0;
        let y = 0;
        for (let i = 0; i < xs.length - 1; i += 1) {
            x += xs[i];
            g.moveTo(ox + x, -oy);
            g.lineTo(ox + x, -(oy + ly));
        }
        for (let i = 0; i < ys.length - 1; i += 1) {
            y += ys[i];
            g.moveTo(ox, -(oy + y));
            g.lineTo(ox + lx, -(oy + y));
        }

        // 外線
        g.moveTo(ox, -oy);
        g.lineTo(ox + lx, -oy);
        g.lineTo(ox + lx, -(ox + ly));
        g.lineTo(ox, -(ox + ly));
        g.lineTo(ox, -oy);

        if (this.fill) {
            g.fill();
        }
        g.stroke();

    }

    public clear() {
        const g = this.graphics;
        g.clear();
    }
}
