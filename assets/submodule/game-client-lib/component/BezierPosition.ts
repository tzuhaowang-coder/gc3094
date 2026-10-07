import { _decorator, CCBoolean, Color, Component, Graphics, Node, tween, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { bezierTo, callFunc, sequence } from '../utils/Tween';
import { calculateControlPoints, pointOnCubicBezier, vecXToVec3, warn } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class BezierPosition extends Component {

    @property([Vec2])
    points: Vec2[] = [];

    @property(Node)
    targetNode: Node = null;

    @property(CCBoolean)
    playOnStart: boolean = false;

    @property(CCBoolean)
    loop: boolean = false;

    private sec: number = 0;
    private delay: number = 0;

    private delta: number = -1;

    private calculatedPoints: Vec2[] = [];

    private resolve: Function = null;

    private graphics: Graphics = null;

    start() {
        const next = () => {
            this.play().then(next);
        };
        if (this.playOnStart) {
            next();
        }
    }

    public play(points: Vec2[] = [], sec: number = .5, delay: number= .5, targetNode: Node = null): Promise<any> {
        const node = targetNode || this.targetNode || this.node;
        const pts = points.length ? points : this.points;
        if (!node) {
            return;
        }
        if (pts.length < 3) {
            if (DEBUG) {
                warn('points less then 3');
            }
            return;
        }
        node.active = true;
        this.targetNode = node;
        this.sec = sec;
        this.delta = 0;
        this.delay = delay;
        this.calculatedPoints = calculateControlPoints(pts);

        const p = new Promise((resolve, reject) => {
            this.resolve = resolve;
        });
        return p;
    }

    update(dt: number) {
        if (this.delta === -1) {
            return;
        }
        const delta = this.delta + dt;
        const node = this.targetNode;
        const total = this.sec;
        const delay = this.delay;
        if (delta >= total) {
            if (delta >= total + delay) {
                this.delta = -1;
                node.active = false;
                this.resolve && this.resolve();
                this.resolve = null;
            } else {
                this.delta = delta;
                node.setPosition(vecXToVec3(this.calculatedPoints[this.calculatedPoints.length - 1]));
            }
        } else {
            this.delta = delta;
            const pts = this.calculatedPoints;
            // 有幾段
            const l = (this.calculatedPoints.length - 1) / 3;
            const i = Math.floor(delta / total * l) * 3;
            const t = (delta / total * l) % 1;
            const pos = pointOnCubicBezier(t, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);

            node.setPosition(vecXToVec3(pos));
        }
    }

    /**
     * 使用 cocos creator 內建 action bezier 曲線路徑 , 限定三個貝茲的點
     * @param time 持續時間
     * @param firstPos 第一個位置
     * @param secondPos 第二個位置
     * @param endPos 最後一個位置
     * @param drawTrack 畫出軌跡(已限定DEBUG)
     */
    public playCCBezier(time: number, firstPos: Vec2, secondPos: Vec2, endPos: Vec2, drawTrack: boolean = false, enactive: boolean = true): Promise<any> {
        // 畫線
        if (DEBUG && drawTrack) {
            this.drawBezierCurve(firstPos, secondPos, endPos);
        }

        // 使用Action貝茲曲線
        const promise = new Promise((resolve) => {
            const node = this.targetNode || this.node;
            const endCallback = callFunc(() => {
                if (enactive) {
                    node.active = false;
                }
                resolve(1);
            });

            node.active = true;
            node.setPosition(vecXToVec3(firstPos));
            const bezierPos = [firstPos, secondPos, endPos];
            const bez = bezierTo(time, bezierPos);
            const seq = sequence(bez, endCallback);
            tween(node).then(seq).start();
        });

        return promise;
    }

    private drawBezierCurve(firstPos: Vec2, secondPos: Vec2, endPos: Vec2) {
        if (!this.graphics) {
            this.graphics = this.node.addComponent(Graphics);
        }
        this.graphics.clear();
        this.graphics.lineWidth = 5;
        this.graphics.strokeColor = Color.BLUE;
        this.graphics.moveTo(firstPos.x, firstPos.y);
        this.graphics.bezierCurveTo(firstPos.x, firstPos.y, secondPos.x, secondPos.y, endPos.x, endPos.y);
        this.graphics.stroke();
    }
}
