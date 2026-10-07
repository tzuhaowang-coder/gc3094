import { _decorator, CCBoolean, CCInteger, Layout, Mask, Node } from 'cc';
import { ColSprite } from '../data/ColSprite';
import { amountThousandth } from '../utils/Balance';
import { arraySplice, biggerThen, getNodeHeight, lowerThen, setNodeScaleX, setNodeY } from '../utils/Utils';
import { TemplateGenerator } from './TemplateGenerator';

const { ccclass, property } = _decorator;

type Data = { cur: string, next: string, place: number, node: Node, node2: Node, node3: Node, dot: boolean, appear: boolean, over: boolean, stop: boolean };

// place
// 6543210-1-2

const wm = new WeakMap<Node, Data>();
const TICK = 1 / 60;

@ccclass
export default class JackpotNumber extends TemplateGenerator {

    @property(CCInteger)
    delta: number = 0;

    @property(CCBoolean)
    compact: boolean = false;

    private amount: number = 0;

    private curs: Data[] = [];

    onLoad(): void {
        super.onLoad();
        this.addComponent(Mask);
        const l = this.addComponent(Layout);
        l.type = Layout.Type.HORIZONTAL;
        l.resizeMode = Layout.ResizeMode.CONTAINER;
        l.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        l.affectedByScale = true;
    }

    public getAmount(): number {
        return this.amount;
    }

    /**
     *
     * @param amount 有 *10000 的
     */
    public updateAmount(amount: number) {
        if (this.amount === amount) {
            return;
        }
        this.amount = amount;

        const str = amountThousandth(amount);

        const len = str.length;
        const parent = this.node;
        const h = getNodeHeight(this.templates[0]);

        const curs = this.curs;
        const arr: Data[] = [];
        // let di = 0
        // let ni = -2
        for (let place = 0; place < len; place += 1) {
            const next = str[len - place - 1];
            const dot = next === '.' || next === ',';
            let data = curs.find(d => d.dot === dot && d.place === place);
            arraySplice(curs, data);
            if (!data) {
                const node = this.getNode();
                let node2: Node;
                let node3: Node;
                setNodeY(node, -h);
                parent.addChild(node);
                const cs = node.getComponent(ColSprite);
                cs.reset(next, '');
                if (this.compact && !dot) {
                    node2 = this.getNode();
                    setNodeY(node2, h);
                    node3 = this.getNode();
                    setNodeY(node3, -h);
                    setNumberString(node2, '');
                    setNumberString(node3, getNextNumberString(next, 1));
                    node.addChild(node2);
                    node.addChild(node3);
                }
                setNodeScaleX(node, 0);
                data = {
                    next,
                    place,
                    node,
                    dot,
                    node2,
                    node3,
                    over: false,
                    stop: true,
                    appear: true,
                    cur: next,
                };
                wm.set(node, data);
            } else {
                if (data.cur === next && data.next === next) {
                    // do nothing
                } else {
                    data.next = next;
                    data.stop = false;
                }
            }
            arr.push(data);
        }
        curs.forEach((data) => {
            data.over = true;
            data.stop = false;
            arr.push(data);
        });
        this.node.children.sort((a, b) => {
            const da = wm.get(a);
            const db = wm.get(b);
            return db.place - da.place;
        });
        this.curs = arr;
        // log(arr);
    }

    private dt: number = 0;

    update(dt: number) {

        this.dt += dt;
        if (this.dt < TICK) {
            return;
        }
        this.dt -= TICK;

        const h = getNodeHeight(this.templates[0]);

        this.curs.forEach((d, idx) => {
            const { node, next, cur, appear, stop, over, place, node2, node3 } = d;
            const ny =  node.position.y;
            const dy = this.delta * TICK * biggerThen(.5 , 1 - place * .1);
            let y = ny + dy;

            if (appear) {
                let sx = node.getScale().x;
                if (sx < 1) {
                    sx = lowerThen(1, sx + .1);
                    setNodeScaleX(node, sx);
                    if (sx === 1) {
                        d.appear = false;
                    }
                }
            }
            if (over) {
                let sx = node.getScale().x;
                if (sx >= 1) {
                    sx = biggerThen(0, sx - .1);
                    setNodeScaleX(node, sx);
                }
            }
            if (stop) {
                if (y > 0) {
                    y = 0;
                }
            }

            if (y === 0 && cur === next) {
                //
                // d.stop = false;
            } else if (ny >= h) {
                if (over) {
                    wm.delete(node);
                    if (node2) {
                        this.recycleNode(node2);
                    }
                    if (node3) {
                        this.recycleNode(node3);
                    }
                    this.recycleNode(node);
                    arraySplice(this.curs, d);
                } else {
                    y = -h;
                    if (node2) {
                        const prev = getNumberString(node);
                        const next2 = getNextNumberString(prev, 1);
                        setNumberString(node2, next2);
                        setNumberString(node3, getNextNumberString(next, 1));
                        if (next === next2) {
                            y = 0;
                        }
                    }
                    setNumberString(node, next);
                    d.cur = next;
                    d.stop = true;
                }
            }
            // if (idx === 0) {
            //     log(next, cur, appear, stop, y);
            // }
            setNodeY(node, y);
        });
    }
}

function getNextNumberString(str: string, offset: -1 | 1): string {
    const num = Number(str) + offset;
    if (num >= 10) {
        return '0';
    } else if (num < 0) {
        return '9';
    } else {
        return '' + num;
    }
}

function setNumberString(node: Node, str: string) {
    node.getComponent(ColSprite).reset(str, '');
}

function getNumberString(node: Node): string {
    return node.getComponent(ColSprite).prev;
}
