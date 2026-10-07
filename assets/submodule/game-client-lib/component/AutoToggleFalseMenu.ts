import { _decorator, Animation, CCFloat, Component } from 'cc';
import { animationPlay } from '../script/PromiseManager';

const { ccclass, property } = _decorator;

@ccclass
export default class AutoToggleFalseMenu extends Component {

    @property(CCFloat)
    timeout: number = 0;

    private able: boolean = true;

    private toggleable: boolean = true;

    onLoad(): void {
        this.close = this.close.bind(this);
        this.scheduleOnce(this.close, this.timeout);
    }

    public getAble() {
        return this.able;
    }

    public toggle(able: boolean = !this.able, toggleable: boolean= this.toggleable) {
        this.toggleable = toggleable;
        if (!this.toggleable && !able) {
            return;
        }

        this.unscheduleAllCallbacks();
        if (able && toggleable) {
            this.scheduleOnce(this.close, this.timeout);
        }
        if (able === this.able) {
            return;
        }
        this.able = able;
        const anim = this.getComponent(Animation);
        animationPlay(anim, able ? 1 : 0);
    }

    private close() {
        if (this.able) {
            this.toggle(false);
        }
    }

    onToggleClick() {
        this.toggle();
    }

    public scheduleToggleableTrue(able: boolean, delay: number) {
        const next = () => {
            this.toggle(able, true);
        };
        this.unscheduleAllCallbacks();
        this.scheduleOnce(next, delay);
    }

}
