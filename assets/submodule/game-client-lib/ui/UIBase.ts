import { _decorator, Node, Size, Vec2, Vec3 } from 'cc';
import ColDataBase from '../data/ColDataBase';
import ColItemBase from '../data/ColItemBase';
import { getLayoutType, UI_LAYOUT } from '../ResizeGlobal';
import { nodeProperty, setNodeScale, setNodeX, setNodeY } from '../utils/Utils';
import CommonUIManager from './CommonUIManager';

const { ccclass, property } = _decorator;
@ccclass
export default abstract class UIBase<T extends ColDataBase> extends ColItemBase<T> {

    private layout: UI_LAYOUT = UI_LAYOUT.UNKNOWN;
    private size: Size = null;

    @property(CommonUIManager)
    commonUIManager: CommonUIManager = null;

    public abstract doLayout(layout: UI_LAYOUT, size: Size): void;

    onResized(size: Size) {
        const layout = getLayoutType();
        this.size = size;
        this.doLayout(layout, size);
        this.layout = layout;
    }

    public updateLayout() {
        this.doLayout(this.layout, this.size);
    }

}

export function doLayoutNodePosition(layout: UI_LAYOUT, node: Node, poss: (Vec2 | Vec3)[]) {
    return doLayoutNodeProperty<Node, 'position'>(layout, node, 'position', poss.map(pos => new Vec3(pos.x, pos.y)));
}

export function doLayoutNodeY(layout: UI_LAYOUT, node: Node, ys: number[]) {
    setNodeY(node, ys[layout]);
}

export function doLayoutNodeX(layout: UI_LAYOUT, node: Node, xs: number[]) {
    setNodeX(node, xs[layout]);
}

export function doLayoutNodeScale(layout: UI_LAYOUT, node: Node, scales: number[]) {
    setNodeScale(node, scales[layout]);
}

export function doLayoutNodeProperty<T, K extends keyof T>(layout: UI_LAYOUT, node: T, property: K, values: T[K][]) {
    const value = values[layout];
    const np = nodeProperty<T, K>(property, value);
    return doLayoutFn<T>(layout, node, [np, np, np]);
}

export function doLayoutFn<T>(layout: UI_LAYOUT, target: T, fns: [(t: T) => void, (t: T) => void, (t: T) => void]) {
    // @ts-ignore
    const fn = fns[layout];
    fn(target);
}
