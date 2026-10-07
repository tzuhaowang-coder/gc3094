import { _decorator, CCFloat, Component, Node, v2, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

// FOR FISH
@ccclass
export default class BonusEventConfig extends Component {
    @property(Node)
    bonusNode: Node = null;

    @property(CCFloat)
    bonusScale: number = 1;

    @property(Vec2)
    infoPos: Vec2 = v2(120, 0);

    // private bonusEventUI: BonusEventUI;

    start() {
        // this.bonusEventUI = this.bonusNode.getComponent(BonusEventUI);
        // setNodeScale(this.bonusNode, this.bonusScale);
        // this.bonusEventUI.flyNode.children.forEach(c => c.scale = this.bonusScale);
        // this.bonusEventUI.autoRedSkeleton.node.parent.scale = this.bonusScale;
        // this.bonusEventUI.updateInfoBtnPos(this.infoPos.x, this.infoPos.y);
    }
}
