import { _decorator, Component, EventKeyboard, Input, input } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class KeyDownBinder extends Component {

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onKeyDown(event: EventKeyboard): void {
        this.doKeyDown(event);
    }

    abstract doKeyDown(event: EventKeyboard): void;
}
