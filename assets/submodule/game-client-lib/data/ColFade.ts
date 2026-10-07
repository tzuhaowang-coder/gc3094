import { _decorator, BlockInputEvents, CCBoolean, CCInteger, EventHandler, EventTouch, Node } from 'cc';
import { biggerThen, getNodeOpacity, lowerThen, nodeOpacity } from '../utils/Utils';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColFade')
export class ColFade extends ColBase<any> {

    @property(CCBoolean)
    reverse: boolean = false;

    @property(CCInteger)
    slowStartSec: number = 0;

    @property(CCInteger)
    perSec: number = 360;

    @property({
        type: CCInteger,
        slide: true,
        range: [0, 255],
    })
    maxOpacity: number = 180;

    @property({
        type: CCInteger,
        slide: true,
        range: [0, 255],
    })
    minOpacity: number = 0;

    @property(EventHandler)
    handler: EventHandler = null;

    @property([Node])
    nodes: Node[] = [];

    private loaded: boolean = false;

    private targetOpacity: number = 0;

    private opacity: number = 0;

    private skip: number = 0;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.targetOpacity = this.opacity;
        if (!this.nodes.length) {
            this.nodes.push(this.node);
        }
        this.opacity = getNodeOpacity(this.nodes[0]);
        if (this.handler) {
            this.nodes.forEach((node) => {
                node.on(
                    Node.EventType.TOUCH_START,
                    (event: EventTouch) => {
                        const clickable = this.targetOpacity === this.maxOpacity;
                        if (clickable) {
                            this.handler.emit([]);
                        }
                        // 是黑色期间才可以被点，其他就穿透

                        // node._touchListener.setSwallowTouches(clickable);
                    },
                    this,
                );
            });
        }
    }

    reset(value: any) {
        this.pre();
        let bool = Boolean(value);
        if (this.reverse) {
            bool = !bool;
        }
        this.targetOpacity = bool ? this.maxOpacity : this.minOpacity;
        this.skip = this.slowStartSec;

        const bie = this.getComponent(BlockInputEvents);
        if (bie) {
            bie.enabled = bool;
        }
    }

    update(dt: number) {
        if (this.opacity === this.targetOpacity) {
            return;
        }
        if (this.skip > 0) {
            this.skip -= dt;
            return;
        }

        if (this.opacity > this.targetOpacity) {
            this.opacity = biggerThen(this.minOpacity, this.opacity - this.perSec * dt);
        } else {
            this.opacity = lowerThen(this.maxOpacity, this.opacity + this.perSec * dt);
        }

        this.nodes.forEach(nodeOpacity(this.opacity));
    }
}
