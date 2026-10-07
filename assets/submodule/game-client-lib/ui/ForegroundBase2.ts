
import { _decorator, Node } from 'cc';
import { DEBUG } from 'cc/env';
import ColBase from '../data/ColBase';
import Announcement from '../script/Announcement';
import { nodeChildrenComponentToPromise3 } from '../script/PromiseManager';
import { log, warn } from '../utils/Utils';
import { calculate, defaultBigWinConfig } from './BigWinBase';
import ForegroundBase from './ForegroundBase';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class ForegroundBase2 extends ForegroundBase {

    /**
     *
     * @param idxOrName eg. {3, "ani_fg_trans"}
     * @param args
     * @override
     */
    public async play(idxOrName: number | string, ...args: any[]) {
        this.pre();
        this.done(false);
        let node: Node;
        if (typeof idxOrName === 'string') {
            node = this.nodes.find(n => n.name === idxOrName);
        } else {
            node = this.nodes[idxOrName];
        }
        if (!node) {
            warn('foreground can\'t find', idxOrName);
            return;
        }
        const ann = node.getComponent(Announcement);
        let p: Promise<any>;
        if (ann) {
            node.getComponentsInChildren(ColBase).forEach((col, i) => {
                const ii = col.colKey ? Number(col.colKey) : i;
                const value = args[ii];
                col.reset(value);
                if (DEBUG) {
                    log('nodeChildrenComponentToPromise3', col, ii, value);
                }
            });
            if (ann.bigWin) {
                if (args.length < 2) {
                    debugger;
                    warn('ForegroundBase2.play', 'ann.bigWin, but args.length< 2');
                }
                const [bet, wins, config] = args;
                ann.bigWinPlayData = calculate(bet, wins, config || defaultBigWinConfig);
            }
            p = await ann.play();
        } else {
            p = await nodeChildrenComponentToPromise3(node, ...args);
        }
        this.done(true);
        return p;
    }

    public get(idxOrName: number | string) {
        this.pre();
        let node: Node;
        if (typeof idxOrName === 'string') {
            node = this.nodes.find(n => n.name === idxOrName);
        } else {
            node = this.nodes[idxOrName];
        }
        return node;
    }

}
