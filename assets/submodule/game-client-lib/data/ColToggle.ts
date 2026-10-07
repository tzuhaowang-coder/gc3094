import { _decorator, CCBoolean, Node } from 'cc';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;

/**
 * 多個節點找一個打開
 * 如果是要控制單個 node 的 active，用 colProperty
 */
@ccclass
@menu('Col/ColToggle')
export class ColToggle extends ColBase<string | number> {

    @property([Node])
    nodes: Node[] = [];

    @property(CCBoolean)
    byNodeName: boolean = false;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        if (!this.nodes.length) {
            this.nodes.push(...this.node.children);
        }
    }

    reset(value: string | number) {
        this.pre();
        const byNodeName = this.byNodeName;
        this.nodes.forEach((node, idx) => {
            let able: boolean;
            if (byNodeName) {
                able = node.name === '' + value;
            } else {
                able = idx === Number(value);
            }
            if (node) {
                node.active = able;
            }
        });
        this.prev = value;
    }

}
