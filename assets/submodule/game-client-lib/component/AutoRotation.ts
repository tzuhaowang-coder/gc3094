import { _decorator, CCFloat, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class AutoRotation extends Component {

    @property(CCFloat)
    perUpdate: number = 0;

    rot: number = 0;

    onLoad() {
        this.rot = this.node.angle;
    }

    update() {
        if (!this.perUpdate) {
            return;
        }
        this.rot += this.perUpdate;
        if (this.rot >= 360) {
            this.rot = 0;
        }
        this.node.angle = this.rot;
    }
}
