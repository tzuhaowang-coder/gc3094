import { _decorator, CCString, Component, Node } from 'cc';
import { DEBUG } from 'cc/env';
import { nodePath, warn } from '../utils/Utils';

const { ccclass, property, executionOrder } = _decorator;

@ccclass
@executionOrder(-1)
export class NodeNameComponentProperty extends Component {

    @property(CCString)
    component: string = '';

    @property(CCString)
    property: string = '';

    @property([Node])
    nodes: Node[] = [];

    onLoad() {

        const nodes = this.nodes;
        if (!nodes.length) {
            nodes.push(this.node);
        }

        const comp = this.component;
        const prop = this.property;
        const val = this.node.name;

        nodes.forEach((node) => {
            let c: Component;
            if (!comp) {
                const comps = node.getComponents(Component);
                if (comps.length === 1) {
                    return;
                } else if (comps.length === 2) {
                    c = comps.find(c => c !== this);
                } else {
                    const i = comps.findIndex(c => c === this);
                    c = comps[i - 1];
                }
            } else {
                c = node.getComponent(comp);
            }
            if (DEBUG && !(prop in c)) {
                warn('NodeNameComponentProperty not exist', nodePath(this.node), c, prop);
            }
            if (typeof c[prop] === 'function') {
                c[prop](val);
            } else {
                c[prop] = val;
            }
        });
    }
}
