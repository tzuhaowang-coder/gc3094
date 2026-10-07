import { _decorator, Component, Node, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PuzzleExplodeSymbol')
export class PuzzleExplodeSymbol extends Component {

    @property(Node)
    symbolNode: Node = null;

    @property(UIOpacity)
    symbolNodeOpacity: UIOpacity = null;
}
