import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class ParentNode extends Component {
    @property(Node)
    parentNode: Node = null;
}
