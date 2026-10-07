import { _decorator, CCBoolean, CCInteger, CCString, Component, Node, tween } from 'cc';
import { DEBUG } from 'cc/env';

const { ccclass, property } = _decorator;

class AngleData{
    public leftAngle:number = 0;
    public rightAngle:number = 0;
    public option:string = '';
}

@ccclass
export default class Wheel extends Component {

    @property(Node)
    targetNode:Node = null;

    @property(CCBoolean)
    turnRight:boolean = false;

    /**
     * 轉幾秒
     */
    @property(CCInteger)
    turnTime:number = 0;

    /**
     * 轉幾圈
     */
    @property(CCInteger)
    turnCount:number = 0;

    /**
     * 回彈
     */
    @property(CCInteger)
    offsetAngle:number = 0;

    /**
     * 請找個倍率為原點,順時鐘輸入倍率
     */
    @property([CCString])
    options: string[] = [];

    private dataMap: {[s:string]:AngleData} = {};
    private datas: AngleData[] = [];

    start () {
        let angleBase = this.targetNode.angle;
        const partAngle = 360 / this.options.length; // 圓切等份
        for (let i = 0 ; i < this.options.length ; i += 1) {
            const data = new AngleData();
            data.leftAngle = angleBase % 360;
            data.rightAngle = (i === 0) ? (angleBase - 360) : (-720 + angleBase % 360);
            angleBase += partAngle;
            this.dataMap[this.options[i]] = data;
            this.datas.push(data);
        }

        const data = this.datas[0];
        this.targetNode.angle = (!this.turnRight) ? data.leftAngle : data.rightAngle;
    }

    public play(option:string):Promise<any> {
        const promise = new Promise<void>((resolve) => {
            const data = this.dataMap[option];
            if (DEBUG && !data) {
                debugger;
            }
            const turnCount = (!this.turnRight) ? this.turnCount : this.turnCount * -1;
            const offsetAngle = (!this.turnRight) ? this.offsetAngle : this.offsetAngle * -1 ;
            const resultAngle = (!this.turnRight) ? data.leftAngle : data.rightAngle;
            let targetAngle = (360 * turnCount) + resultAngle + offsetAngle; // 停止後會加上一點位移量,來做回彈動作 回到正確角度

            if (!this.turnRight) { // 邊界處理
                if (resultAngle - this.targetNode.angle < 0) {
                    targetAngle += 360;
                }
            }else {
                if (resultAngle - this.targetNode.angle > 0) {
                    targetAngle -= 360;
                }
            }

            const t = tween(this.targetNode);
            t
            .to(this.turnTime, { angle: targetAngle }, { easing: 'fade' })
            .to(this.turnTime / 4, { angle:targetAngle - offsetAngle })
            .call(() => {
                this.targetNode.angle = resultAngle;
                resolve();
            })
            .start();
        });
        return promise;
    }
}
