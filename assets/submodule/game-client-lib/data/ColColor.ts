import { _decorator, CCBoolean, Color, Node } from 'cc';
import { setNodeColor } from '../utils/Utils';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;

@ccclass
@menu('Col/ColColor')
export class ColColor extends ColBase<any>{
    @property([Node])
    nodes: Node[] = [];

    @property(CCBoolean)
    reverse: boolean = false;

    @property(Color)
    trueColor: Color = null;

    @property(Color)
    falseColor: Color = null;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        if (!this.nodes.length) {
            this.nodes.push(this.node);
        }
    }

    reset(value: any) {
        this.pre();
        let val = Boolean(value);
        if (this.reverse) {
            val = !value;
        }

        this.nodes.forEach((node) => {
            setNodeColor(node , val ? this.trueColor : this.falseColor);
        });
    }
}
