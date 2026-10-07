import { _decorator, CCFloat, Component, Node, v2, Vec2 } from 'cc';
import { radiansToDegrees, vecXToVec2 } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class Rotation extends Component {

    @property(CCFloat)
    paddingAngle: number = 0;

    @property(Node)
    refNode: Node = null;

    @property(CCFloat)
    updateDelta: number = 0;

    public lastPos: Vec2 = null;

    private zeroPoint: Vec2 = new Vec2(0, 1);

    // 停止旋轉
    public stopRotation: boolean = false;

    private delta: number = 0;

    public prevPaddingAngle: number = 0;

    onLoad() {
        this.refNode = this.refNode || this.node;
    }

    lateUpdate(dt: number) {
        if (this.updateDelta) {
            this.delta += dt;
            if (this.delta < this.updateDelta) {
                return;
            }
            this.delta -= this.updateDelta;
        }
        this.rotate(true);
    }

    public rotate(updateLast: boolean = false) {
        if (!this.stopRotation && this.lastPos && this.lastPos.sub(this.refNode.getPosition()).mag() !== 0) {
            const angle = v2(this.refNode.getPosition().subtract(this.lastPos)).signAngle(this.zeroPoint);
            const degrees = radiansToDegrees(-angle);
            this.node.angle = degrees + this.paddingAngle;
            this.prevPaddingAngle = this.paddingAngle;
        }
        if (updateLast) {
            this.updateLastPos(vecXToVec2(this.refNode.getPosition()));
        }
    }

    public updateLastPos(lastPos: Vec2) {
        this.lastPos = lastPos;
    }

    public clear() {
        this.lastPos = null;
    }
}
