import { _decorator, CCFloat, Node, v2, Vec2 } from 'cc';
import { UI_LAYOUT } from '../ResizeGlobal';
import { nodeProperty, setNodeScale, vecXToVec3 } from '../utils/Utils';
import { ColProperty } from './ColProperty';

const { ccclass, property, menu } = _decorator;

@ccclass
@menu('Col/ColLayout')
export default class ColLayout extends ColProperty {

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    reverse: boolean = false;

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    property: keyof Node = 'position.x'; // 不使用

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    nodes: Node[] = [];

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    colKey: string = 'layout';

    @property(Vec2)
    positionPC: Vec2 = new Vec2();

    @property(Vec2)
    positionMH: Vec2 = new Vec2();

    @property(Vec2)
    positionMV: Vec2 = new Vec2();

    @property(CCFloat)
    scalePC: number = 1;

    @property(CCFloat)
    scaleMH: number = 1;

    @property(CCFloat)
    scaleMV: number = 1;

    reset(value: UI_LAYOUT) {
        this.pre();

        const scales = [this.scalePC, this.scaleMH, this.scaleMV, 1];
        const positions = [this.positionPC, this.positionMH, this.positionMV, v2()];
        const scale: number = scales[value];
        const pos: Vec2 = positions[value];

        this.nodes.forEach(n => setNodeScale(n, scale));
        this.nodes.forEach(nodeProperty('position', vecXToVec3(pos)));
    }
}
