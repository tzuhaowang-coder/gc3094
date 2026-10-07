import { _decorator, Component, instantiate, Node, NodePool } from 'cc';
import { DEBUG } from 'cc/env';
import { warn } from '../utils/Utils';

const { ccclass, property } = _decorator;

const G_SYMBOL = Symbol('TEMPLATE_GENERATOR_SYMBOL');

@ccclass
export class TemplateGenerator extends Component {

    @property([Node])
    templates: Node[] = [];

    private pools: NodePool[] = [];

    /**
     * 還有多少沒還
     */
    private borrows: number[] = [];

    onLoad() {
        this.templates.forEach((node, i) => {
            if (!node) {
                return;
            }
            node.removeFromParent();
            this.pools[i] = new NodePool();
            this.borrows[i] = 0;
        });
    }

    public getNode(index: number = 0): Node {
        const pool = this.pools[index];
        if (!pool) {
            return;
        }
        if (!pool.size()) {
            const tpl = this.templates[index];
            const n = instantiate(tpl);
            n[G_SYMBOL] = tpl.name + '_' + index;
            pool.put(n);
        }
        const node = pool.get();
        this.borrows[index] += 1;
        return node;
    }

    /**
     *
     * @param index 預設 0，如果是 -1，會嘗試用 node.name 取到對應的 pool
     */
    public recycleNode(node: Node, index: number = 0) {
        if (!this.isValid) {
            return;
        }
        if (index === -1) {
            index = this.templates.findIndex((tpl, index) => tpl && (tpl.name + '_' + index === node[G_SYMBOL]));
        }
        const pool = this.pools[index];
        if (DEBUG) {
            const tpl = this.templates[index];
            if (!tpl) {
                debugger;
            }
            const tplGSymbol = tpl.name + '_' + index;
            const nodeGSymbol = node[G_SYMBOL];
            if (tpl && tplGSymbol !== nodeGSymbol) {
                warn('template node name not match: ', tplGSymbol, nodeGSymbol, node.name);
            }
            if (!node.parent) {
                warn('no parent, may recycle twice', node.name);
            }
        }
        if (!pool) {
            warn('pool not exists');
            return;
        }
        this.borrows[index] -= 1;
        // node.stopAllActions();
        pool.put(node);
    }

}
