
import { _decorator, instantiate, Label, Node, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';
import { nodeTweenToPromise } from '../../game-client-lib/data/NodeTween';
import { fadeTo, stopAllActions } from '../../game-client-lib/utils/Tween';
import { getNodeWidth, nodeActive, setNodeScale, setNodeWidth, setNodeX, setNodeY } from '../../game-client-lib/utils/Utils';
import { SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import { SLOT_REEL_SYMBOL_EMPTY, SlotReelSymbol } from '../slot/SlotReel';
import { IResult } from '../slot/SlotResultBase';
import PuzzleBase from './PuzzleBase';

const { ccclass, property } = _decorator;

export class PuzzleResultData {
    constructor(
        public wins: string = '',
        /**
         * 倍数
         */
        public level: string = '',
        /**
         * 自订资料，用于画面呈现
         */
        public custom: any = null,
    ) {

    }
}

enum LineType {
    LU = 0,
    L = 1,
    LD = 2,
    U = 3,
    // C,
    D = 4,
    RU = 5 ,
    R= 6,
    RD= 7,
    LDV= 8,
    RUH= 9,
    RDV= 10,
    RDH= 11,
}

@ccclass
export default abstract class PuzzleResultBase extends TemplateGenerator implements IResult {

    @property(Node)
    layerSymbol: Node = null;

    @property(Label)
    winsLabel: Label = null;

    @property(Label)
    multipleLabel: Label = null;

    @property(PuzzleBase)
    puzzle: PuzzleBase = null;

    @property({
        type:PuzzleBase,
        tooltip: '給 drawLine 取得 symbol 寬高使用，沒有設定就使用 puzzle',
    })
    puzzleLine: PuzzleBase = null;

    // 自行实作
    @property([Node])
    maskNodes: Node[] = [];

    data: PuzzleResultData = null;

    protected skeletonMap: Node[][] = [];

    protected loopIndex: number = 0;

    public getSymbolNode(x: number, y: number, type: SlotReelSymbol = SLOT_REEL_SYMBOL_EMPTY, status: SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.WIN) {
        return this.puzzle.getSymbolNode(x, y, type, status, false, this.layerSymbol);
    }

    public recycleSymbolNode(node: Node) {
        this.puzzle.recycleSymbolNode(node);
    }

    /**
     * 时间点：呼叫 reset()、scatter()、clearAll() 时
     */
    doClearAll?(): void;

    public clearAll() {
        // this.clear(true);
        // let len = this.layerSymbol.childrenCount;
        // while (len) {
        //     this.recycleNode(this.layerSymbol.children[len - 1]);
        //     len -= 1;
        // }
        this.doClearAll?.();
    }

    @property(Node)
    layerLine: Node = null;

    @property({
        type: [Node],
        tooltip: '0 直線(橫置，中心點在線上)、1 角內有包含、2 角內無包含(角在右下角，中心點在兩線中心交點)',
    })
    paylines: Node[] = [];

    private genLineNode(type: LineType, v2: Vec2, parent: Node, opt: number = 0, debug: boolean = false) {
        const paylines = this.paylines;
        if (!paylines.length) {
            return;
        }
        const pl0 = this.paylines[0];
        const pl1 = this.paylines[1];
        const pl2 = this.paylines[2];

        const pz = this.puzzleLine || this.puzzle;

        const sh = pz.pxConfig.symbolHeight;
        const sw = pz.pxConfig.symbolWidth;
        const pl1w = getNodeWidth(pl1);
        const spl1w = sw - pl1w;
        // const pl1h = sh - pl1.height;

        let n: Node = null;
        const pl = (i: number) => {
            if (i === 2 && !pl2) {
                i = 1;
            }
            return instantiate(this.paylines[i]);
        };
        const ns = (w: number, x: number, y: number, a: number = 0) => {
            setNodeWidth(n, w);
            setNodeX(n, x);
            setNodeY(n, y);
            n.angle = a;
        };
        const ns2 = (x: number, y: number, sx: number, sy: number) => {
            setNodeX(n, x);
            setNodeY(n, y);
            setNodeScale(n, sx, sy);
        };

        if (type === LineType.U) {
            n = pl(0);
            ns(spl1w, v2.x, v2.y + sh / 2);
        } else if (type === LineType.D) {
            n = pl(0);
            ns(spl1w, v2.x, v2.y - sh / 2, 180);
        } else if (type === LineType.L) {
            n = pl(0);
            ns(spl1w, v2.x - sw / 2, v2.y, 90);
        } else if (type === LineType.R) {
            n = pl(0);
            ns(spl1w, v2.x + sw / 2, v2.y, 270);
        } else if (type === LineType.LU) {
            n = pl(opt || 1);
            ns2(v2.x - sw / 2, v2.y + sh / 2, -1, -1);
        } else if (type === LineType.RU) {
            n = pl(opt || 1);
            ns2(v2.x + sw / 2, v2.y + sh / 2, 1, -1);
        } else if (type === LineType.LD) {
            n = pl(opt || 1);
            ns2(v2.x - sw / 2, v2.y - sh / 2, -1, 1);
        } else if (type === LineType.RD) {
            n = pl(opt || 1);
            ns2(v2.x + sw / 2, v2.y - sh / 2, 1, 1);
        } else if (type === LineType.RUH) {
            n = pl(0);
            ns(pl1w, v2.x + sw / 2, v2.y + sh / 2);
        } else if (type === LineType.RDH) {
            n = pl(0);
            ns(pl1w, v2.x + sw / 2, v2.y - sh / 2, 180);
        } else if (type === LineType.LDV) {
            n = pl(0);
            ns(pl1w, v2.x - sw / 2, v2.y - sh / 2, 90);
        } else if (type === LineType.RDV) {
            n = pl(0);
            ns(pl1w, v2.x + sw / 2, v2.y - sh / 2, 270);
        }

        // debug lineType
        if (DEBUG && debug) {
            const dn = new Node();
            dn.setPosition(n.position);
            const l = dn.addComponent(Label);
            l.string = '' + type;
            dn.setParent(parent);
        }
        n.setParent(parent);
    }

    public clearLine() {
        this.layerLine.removeAllChildren();
    }

    public drawLine(data: any[][], debug: boolean = false) : Node {

        const pz = this.puzzleLine || this.puzzle;
        const parent = new Node();
        // parent.setParent(this.lineNode);
        // parent.opacity = 0;
        // tween(parent).sequence(
        //     fadeIn(0.2),
        //     delayTime(0.3),
        //     fadeOut(0.1),
        // );
        const n = (t: LineType, pos: Vec2, opt: number= 0) => {
            this.genLineNode(t, pos, parent, opt, debug);
        };

        const sizeX = data.length;
        const sizeY = Math.max(...data.map(d => d.length));
        for (let i = 0; i < sizeX; i += 1) {
            for (let j = 0; j < sizeY; j += 1) {
                const sl = [[false, false, false], [false, false, false], [false, false, false]];
                for (let m = 0; m <= 2 ; m += 1) {
                    for (let n = 0; n <= 2 ; n += 1) {
                        if (i + m - 1 < 0 || i + m - 1 >= sizeX || j + n - 1 < 0 || j + n - 1 >= sizeY) {
                            sl[m][n] = false;
                        } else if (data[i + m - 1][j + n - 1]) {
                            sl[m][n] = true;
                        }
                    }
                }
                const lu = sl[0][0];
                const l = sl[0][1];
                const ld = sl[0][2];
                const u = sl[1][0];
                const c = sl[1][1];
                const d = sl[1][2];
                const ru = sl[2][0];
                const r = sl[2][1];
                const rd = sl[2][2];

                const pos = pz.getPosition(i, j);

                if (c) {
                    if (!u) {
                        n(LineType.U, pos);
                    }
                    if (!l) {
                        n(LineType.L, pos);
                    }
                    if (!r) {
                        n(LineType.R, pos);
                    }
                    if (!d) {
                        n(LineType.D, pos);
                    }
                    if (!l && !u) {
                        n(LineType.LU, pos);
                    }
                    if (!r && !u) {
                        n(LineType.RU, pos);
                    }
                    if (!l && !d) {
                        n(LineType.LD, pos);
                    }
                    if (!r && !d) {
                        n(LineType.RD, pos);
                    }
                    if (!r && d && !rd) {
                        // ? ? ?
                        // ? v x
                        // ? v x
                        n(LineType.RDV, pos);
                    }
                    if (!l && !ld && d) {
                        // ? ? ?
                        // x v ?
                        // x v ?
                        n(LineType.LDV, pos);
                    }
                    if (r && !d && !rd) {
                        // ? ? ?
                        // ? v v
                        // ? x x
                        n(LineType.RDH, pos);
                    }
                    if (!u && !ru && r) {
                        // ? x x
                        // ? v v
                        // ? ? ?
                        n(LineType.RUH, pos);
                    }
                } else { // !c
                    if (lu && l && u) {
                        n(LineType.LU, pos, 2);
                    }
                    if (ru && r && u) {
                        n(LineType.RU, pos, 2);
                    }
                    if (ld && l && d) {
                        n(LineType.LD, pos, 2);
                    }
                    if (rd && r && d) {
                        n(LineType.RD, pos, 2);
                    }
                }
            }
        }

        this.layerLine.addChild(parent);
        return parent;
    }

    public activeMask(able: boolean) {
        this.maskNodes.forEach(nodeActive(able));
    }

    /**
     *
     * @param able
     * @param time sec
     * @param opacity
     */
    public fadeMask(able: boolean, time: number= .1, opacity: number = 180) : Promise<any> {
        return Promise.all(this.maskNodes.map((node) => {
            const to = able ? opacity : 0;
            stopAllActions(node);
            return nodeTweenToPromise({
                node,
                action: fadeTo(time, to),
            });
        }));
    }

}
