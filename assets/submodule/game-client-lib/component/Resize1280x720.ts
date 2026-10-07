import { _decorator, Component } from 'cc';
import { RESIZE_SCALE, resizeNode } from '../ResizeGlobal';

const { ccclass, property, executionOrder } = _decorator;

@ccclass
@executionOrder(-1)
export default class Resize1280x720 extends Component {

    onLoad() {
        resizeNode(RESIZE_SCALE, this.node);
    }

}
