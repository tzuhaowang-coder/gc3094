import { _decorator, Node, Slider } from 'cc';
import { getNodeWidth, lowerThen, setNodeWidth } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class UpdatePositionSlider extends Slider {

    @property(Node)
    backgroundNode: Node = null;

    /**
     * 更新拉霸位置
     */
    public updateHandlePosition(progress: number) {
        this.progress = progress;
        // @ts-ignore
        this._updateHandlePosition();

        if (this.backgroundNode) {
            setNodeWidth(this.backgroundNode, lowerThen(1, progress) * getNodeWidth(this.node));
        }
    }

}
