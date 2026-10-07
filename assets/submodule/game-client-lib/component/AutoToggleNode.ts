import { _decorator, CCInteger, Component, Node } from 'cc';
import { nodeActive } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class AutoToggleNode extends Component {

    @property(CCInteger)
    perNode: number = 0;

    @property([Node])
    nodes: Node[] = [];

    @property(CCInteger)
    firstIndex: number = 0;

    private delta: number = 0;

    private activeNode(index: number) {
        this.nodes.forEach(nodeActive(false));
        this.nodes[index].active = true;
    }

    onLoad() {
        this.activeNode(this.firstIndex);
    }

    update(dt: number) {
        if (!this.perNode) {
            return;
        }
        this.delta += dt;
        if (this.delta >= this.perNode) {
            this.delta -= this.perNode;

            this.firstIndex += 1;
            if (this.firstIndex >= this.nodes.length) {
                this.firstIndex = 0;
            }
            this.activeNode(this.firstIndex);

        }
    }
}
