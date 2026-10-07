import { _decorator, CCInteger, Component } from 'cc';
import { getWorldAngle } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class RotationFixed extends Component {

    @property(CCInteger)
    angle: number = 0;

    // 停止旋轉
    public stopRotation: boolean = false;

    lateUpdate() {

        if (!this.stopRotation) {
            const node = this.node;
            const worldAngle = getWorldAngle(node);
            // this.angle = angle - this.node.angle + x
            const x = this.node.angle - worldAngle + this.angle;
            this.node.angle = x;
        }
    }
}
