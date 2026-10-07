import { _decorator, CCBoolean, CCString, Node } from 'cc';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColComponentProperty')
export class ColComponentProperty extends ColBase<any> {

    @property(CCString)
    component: string = 'CommonButton';

    @property(CCString)
    property: string = 'isChecked';

    @property(CCBoolean)
    isMethod: boolean = false;

    @property(CCBoolean)
    reverse: boolean = false;

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

        const comp = this.component;
        const prop = this.property;
        let val = value;
        if (this.reverse) {
            val = !value;
        }
        this.nodes.forEach((node) => {
            if (this.isMethod) {
                node.getComponent(comp)[prop](val);
            } else {
                node.getComponent(comp)[prop] = val;
            }
        });
    }
}
