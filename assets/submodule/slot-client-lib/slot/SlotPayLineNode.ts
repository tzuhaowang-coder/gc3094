import { _decorator, Node } from 'cc';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';

const { ccclass, property } = _decorator;

@ccclass
export default class SlotPayLineNode extends TemplateGenerator {

    @property(Node)
    leftNode: Node = null;

    @property(Node)
    rightNode: Node = null;

    @property(Node)
    layoutNode: Node = null;

    @property(Node)
    touchNode: Node = null;

}
