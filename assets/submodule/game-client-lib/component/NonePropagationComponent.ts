import { _decorator, Component, EventTouch, NodeEventType } from 'cc';

const { ccclass } = _decorator;

@ccclass
export default class NonePropagationComponent extends Component {
    onEnable() {
        this.controlHistoryTouch(true);
    }

    onDisable() {
        this.controlHistoryTouch(false);
    }

    /**
     * 控制面板觸控
     * @param {boolean} enable
     */
    private controlHistoryTouch(enable: boolean) {
        if (enable) {
            this.node.on(NodeEventType.TOUCH_MOVE, this.onTouchEvent, this);
            this.node.on(NodeEventType.TOUCH_START, this.onTouchEvent, this);
            this.node.on(NodeEventType.TOUCH_END, this.onTouchEvent, this);
            this.node.on(NodeEventType.TOUCH_CANCEL, this.onTouchEvent, this);
        } else {
            this.node.off(NodeEventType.TOUCH_MOVE, this.onTouchEvent, this);
            this.node.off(NodeEventType.TOUCH_START, this.onTouchEvent, this);
            this.node.off(NodeEventType.TOUCH_END, this.onTouchEvent, this);
            this.node.off(NodeEventType.TOUCH_CANCEL, this.onTouchEvent, this);
        }
    }

    /**
     * 停止觸控冒泡
     * @param {EventTouch} event
     */
    private onTouchEvent(event: EventTouch) {
        event.propagationImmediateStopped = true;
    }

}
