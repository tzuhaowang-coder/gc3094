import { _decorator, Component, Sprite } from 'cc';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@requireComponent(Sprite)
@executionOrder(2)
export default class SpriteReload extends Component {

    onLoad() {
        const sprite = this.node.getComponent(Sprite);
        const frame = sprite.spriteFrame;
        sprite.spriteFrame = null;

        this.scheduleOnce(
            () => {
                sprite.spriteFrame = frame;
            },
            0,
        );
    }
}
