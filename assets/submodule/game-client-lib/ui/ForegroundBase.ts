
import { _decorator, Component, Node } from 'cc';
import ColBase from '../data/ColBase';
import { nodeChildrenComponentToPromise3 } from '../script/PromiseManager';
import { log, nodeActive, warn } from '../utils/Utils';
import BigWinBase, { bigWinAudioPreload, BigWinConfig } from './BigWinBase';
import CommonUIData from './CommonUIData';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class ForegroundBase extends Component {

    @property(Node)
    bigWinNode: Node = null;

    private bigWin: BigWinBase = null;

    public commonUIData: CommonUIData = null;

    doEnactive?(): void;

    private loaded: boolean = false;

    @property([Node])
    nodes: Node[] = [];

    protected pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        if (this.bigWinNode) {
            this.bigWin = this.bigWinNode.getComponent('BigWinBase') as BigWinBase;
        }

        this.doPre?.();
    }

    doPre?(): void;

    private bigWinPromise: Promise<void> = null;

    public preloadBigWin() {
        this.pre();
        if (!this.bigWin) {
            return;
        }
        if (this.bigWinPromise) {
            return this.bigWinPromise;
        }
        log('load start');
        bigWinAudioPreload();
        const next = () => {
            log('load ok');
        };
        const reject = () => {
            log('load fail');
            if (this.bigWinPromise === p) {
                this.bigWinPromise = null;
            }
            return Promise.reject();
        };
        const p = this.bigWin.preload().then(next, reject);
        this.bigWinPromise = p;
        return p;
    }

    public async playBigWin(totalBet: number, totalWins: number, config?: BigWinConfig) {
        this.pre();
        if (!this.bigWin) {
            return;
        }
        // 開 loading
        let p = this.bigWinPromise;
        if (!p) {
            p = this.preloadBigWin();
        }
        try {
            await p;
        } catch (e) {
            log('load fail 2');
            this.done();
            return;
        }
        log('load ok');
        this.enactive(true);
        this.bigWin.node.active = true;
        await this.bigWin.play(totalBet, totalWins, config);
        this.done();
    }

    public enactive(setAnimation: boolean = false) {
        if (setAnimation && this.commonUIData) {
            this.commonUIData.set('animation', true);
        }
        this.pre();
        this.nodes.forEach(nodeActive(false));
        [this.bigWinNode].forEach(nodeActive(false));
        this.doEnactive?.();
    }

    protected done(able: boolean = true) {
        if (this.commonUIData) {
            this.commonUIData.set('animation', !able);
        }
    }

    /**
     *
     * @param idxOrName eg. {3, "ani_fg_trans", "1_0"}，如果 為 "1_0" 格式 1 為 idx、0 為 ccAnimationIndex
     * @param values
     * @returns
     */
    public async play(idxOrName: number | string, ...values: any[]): Promise<any> {
        this.enactive(true);

        let node: Node;
        let ccAnimationIndex: number;
        if (typeof idxOrName === 'string') {
            if (idxOrName.match(/\d+_\d+/)) {
                const [idx, ai] = idxOrName.split('_');
                ccAnimationIndex = Number(ai);
                node = this.nodes[idx];
            } else {
                node = this.nodes.find(n => n.name === idxOrName);
            }
        } else {
            node = this.nodes[idxOrName];
        }
        if (!node) {
            warn('foreground can\'t find', idxOrName);
            return;
        }
        const cols = node.getComponentsInChildren('ColBase') as ColBase<any>[];
        cols.forEach((col, i) => {
            if (i >= values.length) {
                return;
            }
            const value = values[i];
            col.reset(value);
        });
        node.active = true;
        const p = await nodeChildrenComponentToPromise3(node, ccAnimationIndex);
        this.done();
        return p;
    }

    public async play2(idxOrName: string | number, ...values: any[]): Promise<void> {
        await this.play(idxOrName, ...values);
        this.enactive(false);
    }
}
