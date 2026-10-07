import { _decorator, Node, Sprite } from 'cc';
import ResSprite from './ResSprite';

const { ccclass, property, menu, requireComponent } = _decorator;

@ccclass
@menu('ResourcesLoad/ResourcesSprite2')
@requireComponent(Sprite)
export default class ResSpriteToggle extends ResSprite {

    @property([Node])
    toggles: Node[] = [];

    /**
     * @override
     */
    pre() {
        super.pre();
        const frame = this.getComponent(Sprite).spriteFrame;
        if (frame) {
            this.toggles.forEach((node) => {
                node.active = false;
            });
            this.toggles.length = 0;
        } else {
            this.node.active = false;
            return;
        }
    }
}
