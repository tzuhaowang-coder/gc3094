import { _decorator, Component, Graphics, Label, Node, v2 } from 'cc';
import { getNodeWidth, vecXToVec3 } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class GraphicsProfile extends Component {

    @property(Graphics)
    graphics: Graphics = null;

    private label: Label = null;

    private data = [];

    onLoad() {
        this.graphics = this.graphics || this.getComponent(Graphics);
    }

    start () {
        const node = new Node();

        const label = node.addComponent(Label);
        label.fontSize = 16;

        this.label = label;
        this.label.string = '0.0';

        this.node.addChild(node);
    }

    public pushData(num:number) {
        this.data.push(num);
        const nodeWidth = getNodeWidth(this.node);
        this.data.splice(0, this.data.length - nodeWidth);
        this.graphics.clear();
        this.graphics.moveTo(-nodeWidth / 2, 0);

        for (let i = 0; i < this.data.length - 1; i += 1) {
            this.graphics.lineTo(i * 1 - nodeWidth / 2, this.data[i]);
        }
        this.graphics.stroke();

        const max = Math.max(...this.data);
        const index = this.data.lastIndexOf(max);
        this.label.node.setPosition(vecXToVec3(v2(index - nodeWidth / 2, max)));
        this.label.string = max.toFixed(0);
    }
}
