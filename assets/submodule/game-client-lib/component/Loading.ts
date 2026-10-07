import { _decorator, Component, Node } from 'cc';
import { ColFade } from '../data/ColFade';

const { ccclass, property } = _decorator;

@ccclass
export default class Loading extends Component {

    @property(Node)
    loadingNode: Node = null;

    @property(ColFade)
    colFade: ColFade = null;

    toggle(able: boolean) {
        if (this.loadingNode) {
            this.loadingNode.active = able;
        }
        if (this.colFade) {
            this.colFade.reset(able);
        }
    }
}
