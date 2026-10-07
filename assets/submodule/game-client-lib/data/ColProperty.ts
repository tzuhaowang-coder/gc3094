import { _decorator, CCBoolean, CCString, Node } from 'cc';
import { nodeProperty } from '../utils/Utils';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColProperty')
export class ColProperty extends ColBase<any> {

    @property(CCBoolean)
    reverse: boolean = false;

    @property(CCString)
    property: keyof Node = 'active';

    @property([Node])
    nodes: Node[] = [];

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
        let val = value;
        if (this.reverse) {
            val = !value;
        }
        this.nodes.forEach(nodeProperty(this.property, val));
    }
}
