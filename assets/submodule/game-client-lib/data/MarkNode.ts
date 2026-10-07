import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class MarkNode extends Component {

    @property(Node)
    refNode: Node = null;

    @property([Node])
    refNodes: Node[] = [];
}
