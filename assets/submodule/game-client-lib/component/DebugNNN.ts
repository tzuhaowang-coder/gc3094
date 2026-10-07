import { _decorator, CCBoolean, Component, Node } from 'cc';
import { DEBUG } from 'cc/env';
import { globalDebugNNN } from '../LibGlobal';
import { nodePath, warn } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class DebugNNN extends Component {

    @property({
        displayName: 'Name',
    })
    debugName: string = '';

    @property(CCBoolean)
    push: boolean = false;

    @property(CCBoolean)
    debugFirstComponent: boolean = false;

    @property(CCBoolean)
    debugPreviousComponent: boolean = false;

    onLoad() {
        if (!DEBUG) {
            return;
        }
        let target: Node | Component;
        if (this.debugFirstComponent) {
            const comps = this.getComponents(Component);
            for (let i = 0; i < comps.length; i += 1) {
                const comp = comps[i];
                if (comp !== this) {
                    target = comp;
                    break;
                }
            }
            if (!target) {
                warn('DebugNNN can\'t find first component', nodePath(this.node));
            }
        } else if (this.debugPreviousComponent) {
            const comps = this.getComponents(Component);
            const idx = comps.findIndex(c => c === this);
            target = comps[idx - 1];
            if (!target) {
                warn('DebugNNN can\'t find previous component', nodePath(this.node));
            }
        } else {
            target = this.node;
        }
        globalDebugNNN(target, this.debugName, this.push);
        warn('DebugNNN should be remove after debug.', nodePath(this.node));
    }

}
