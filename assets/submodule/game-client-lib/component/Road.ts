import { _decorator, Enum, Node, Size, size, Vec2 } from 'cc';
import { toNaturalNumber, vecXToVec3 } from '../utils/Utils';
import { TemplateGenerator } from './TemplateGenerator';

export enum ROAD_TYPE {
    BEAD = 0,
    BIG = 1,
    BIG_EYE = 2,
    SMALL = 3,
    ROACH = 4,
}

export class RoadSize {
    tileHeight: number;
    tileWidth: number;
    limitHeight: number;
    limitWidth: number;
    paddingW:number;
    paddingH: number;
    offsetX:number;
    offsetY: number;
}

interface IJ {
    i: number;
    j: number;
}

interface Last {
    i: number;
    j: number;
    val: string;
    goRight: boolean;
}

interface XslConfig {
    beginIj: IJ[];
    sameLengthI: number[];
    compareI: number[];
}

export interface RoadData {
    fetchVal(size: RoadSize, idx: number, roads: RoadData[]): string;
}

function isBlocked(size: RoadSize, graph: Map<string, RoadData>, x, y) {
    if (y >= size.limitHeight) {
        return true;
    }
    return graph.get(x + '_' + y);
}

function findAvailableX0(graph: Map<string, RoadData>) {
    let x = 0;
    while (graph.get(x + '_0')) {
        x += 1;
    }
    return x;
}

function calculate(roads: RoadData[], size: RoadSize, hasBound:boolean) {
    const graphMap = new Map<string, RoadData>();
    const graphArr: RoadData[][] = [];
    const ijs: IJ[] = [];
    const last: Last = {
        i: -1,
        j: -1,
        val: 'xxxxx',
        goRight: false,
    };

    roads.forEach((data, idx) => {
        // 计算位置
        const ij = valueToIj(size, data.fetchVal(size, idx, roads), data, graphMap, last, hasBound);
        ijs.push(ij);
        if (!graphArr[ij.i]) {
            graphArr[ij.i] = [];
        }
        graphArr[ij.i][ij.j] = data;
    });
    return {
        graphArr,
        graphMap,
        last,
        ijs,
    };
}

function findMaxI(graphAry: RoadData[][]): number {
    return graphAry.length;
    // return Number(Array.from(graph.keys()).pop().split('_')[0]);
}

function ijToVec2(ij: IJ, size: RoadSize): Vec2 {
    let posX = 0;
    let posY = 0;
    posX = (ij.i * size.tileWidth) + (ij.i * size.paddingW) + size.offsetX;
    posY = -(ij.j * size.tileHeight) - (ij.j * size.paddingH) - size.offsetY;
    return new Vec2(posX, posY);
    // return new Vec2(ij.i * size.tileWidth, -ij.j * size.tileHeight);
}

function valueToIj(size: RoadSize, val: string, data: RoadData, graph: Map<string, RoadData>, last: Last, hasBound: boolean = true): IJ {

    let i;
    let j;
    if (val === last.val) {
        if (last.goRight) {
            i = last.i + 1;
            j = last.j;
        } else {
            i = last.i;
            j = last.j + 1;
        }
        if (hasBound && isBlocked(size, graph, i, j)) {
            i = i + 1;
            j = j - 1;
            if (j !== 0) {
                last.goRight = true;
            }
        }
    } else {
        i = findAvailableX0(graph);
        j = 0;
        last.goRight = false;
    }
    graph.set(i + '_' + j, data);
    last.i = i;
    last.j = j;
    last.val = val;

    return {
        i,
        j,
    };
}

const XSL_CONFIG = {
    // 大眼路
    [ROAD_TYPE.BIG_EYE]: {
        beginIj: [{ i: 1, j: 1 }, { i: 2, j: 0 }],
        sameLengthI: [-2, -1],
        compareI: [-1],
    },
    // 小路
    [ROAD_TYPE.SMALL]: {
        beginIj: [{ i: 2, j: 1 }, { i: 3, j: 0 }],
        sameLengthI: [-3, -1],
        compareI: [-2],
    },
    // 小強路
    [ROAD_TYPE.ROACH]: {
        beginIj: [{ i: 3, j: 1 }, { i: 4, j: 0 }],

        sameLengthI: [-4, -1],
        compareI: [-3],
    },
};

function xsl(config: XslConfig, graph: RoadData[][], ijs: IJ[]): XiasanluData[] {
    const ijBegin = config.beginIj.find((ij) => {
        return Boolean(graph[ij.i] && graph[ij.i][ij.j]);
    });
    if (!ijBegin) {
        return [];
    }
    const idx = ijs.findIndex((ij) => {
        return ijBegin.i === ij.i && ijBegin.j === ij.j;
    });
    if (idx === -1) {
        return [];
    }

    return ijs.slice(idx).map((ij) => {
        const i = ij.i;
        const j = ij.j;
        const len0 = graph[i + config.sameLengthI[0]];
        const len1 = graph[i + config.sameLengthI[1]];
        const ary1 = graph[i + config.compareI[0]];
        if (j === 0) {
            if (len0.length === len1.length) {
                return new XiasanluData('r');
            } else {
                return new XiasanluData('b');
            }
        } else {
            if (ary1[j]) {
                return new XiasanluData('r');
            } else if (!ary1[j] && !ary1[j - 1]) {
                return new XiasanluData('r');
            } else {
                return new XiasanluData('b');
            }
        }
    });
}

class XiasanluData implements RoadData {

    fetchVal(size: RoadSize, idx: number): string {
        return this.color;
    }

    constructor(
        public color: string) {

    }
    clone() {
        return new XiasanluData(this.color);
    }
}

const { ccclass, property } = _decorator;

@ccclass
export default abstract class Road<T extends RoadData = RoadData> extends TemplateGenerator {

    @property(Node)
    targetNode: Node = null;

    @property({
        type: Enum(ROAD_TYPE),
    })
    roadType: ROAD_TYPE = ROAD_TYPE.BEAD;

    @property(Size)
    size: Size = size(0, 0);

    @property(Size)
    tile: Size = size(0, 0);

    @property(Vec2)
    tilePadding: Vec2 = new Vec2();

    @property(Vec2)
    offset: Vec2 = new Vec2();

    /**
     * 產生節點
     * @param data
     * @param roadType
     * @param size
     */
    abstract drawNodes(data: T, roadType: ROAD_TYPE, size:RoadSize) : Node[];

    /**
     * 自行回收
     */
    abstract recycleEachNode(nodes: Node): void;

    private roadSize: RoadSize = null;

    private pre() {
        if (this.roadSize) {
            return;
        }
        this.roadSize = {
            tileWidth: this.tile.width,
            tileHeight: this.tile.height,
            limitWidth: this.size.width,
            limitHeight: this.size.height,
            paddingW: this.tilePadding.x,
            paddingH: this.tilePadding.y,
            offsetX: this.offset.x,
            offsetY: this.offset.y,
        };
    }

    public reset(roads: T[]) {
        this.pre();
        // 回收全部
        // todo: 是否能片段的重設，減少更新路子 loading
        const target = this.targetNode || this.node;
        let l = target.children.length;
        // tslint:disable-next-line:no-increment-decrement
        while (l--) {
            this.recycleEachNode(target.children[0]);
        }

        const paintData = calculate(roads, this.roadSize, true);

        let shiftI = 0;
        if (this.roadSize.limitWidth > 0) {
            const maxI = findMaxI(paintData.graphArr);
            shiftI =  toNaturalNumber(maxI - this.roadSize.limitWidth);
        }
        this.paint(paintData.ijs, paintData.graphArr, shiftI);
    }

    private paint(ijs: IJ[], graphArr: RoadData[][], shiftI: number) {
        // 画节点
        const target = this.targetNode || this.node;
        ijs.forEach((ij) => {
            const i = ij.i - shiftI;
            const j = ij.j;
            if (i >= 0) {
                const data = graphArr[ij.i][j];
                const arr = this.drawNodes(data as T, this.roadType, this.roadSize);
                const vec2 = ijToVec2({ i, j }, this.roadSize);
                arr.forEach((node) => {
                    node.setPosition(vecXToVec3(vec2));
                    target.addChild(node);
                });
            }
        });
    }
}
