import { _decorator, CCBoolean, CCString, sp } from 'cc';
import { spSkeletonEmpty, spSkeletonSetAnimation } from '../script/PromiseManager';
import ColBase from './ColBase';

const { ccclass, property, executionOrder } = _decorator;

@ccclass
@executionOrder(-1) // 要优先于 sp.Skeleton
export default class ColSpSkeletonMany extends ColBase<number> {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property([CCString])
    animations: string[] = [];
    @property([CCBoolean])
    animationsLoop: boolean[] = [];

    private currentValue = 0;

    onLoad() {

        this.skeleton = this.skeleton || this.getComponent(sp.Skeleton);

        if (!this.animations.length) {
            this.animations = [this.skeleton.animation];
        }
        if (!this.animationsLoop.length) {
            this.animationsLoop = [this.skeleton.loop];
        }
        this.skeleton.animation = '';
        spSkeletonEmpty(this.skeleton);

        this.skeleton.setCompleteListener(() => {
            this.currentValue = 0;
        });
    }

    public reset(value: number): void {
        const skeleton = this.skeleton;
        const able = Boolean(value);
        if (able) {
            const temp = Math.ceil(value);
            if (temp && this.currentValue !== temp) {
                this.currentValue = temp;
                const animName = this.animations[this.currentValue - 1];
                const loop = this.animationsLoop[this.currentValue - 1];
                if (skeleton.animation === animName) {
                    return;
                }
                spSkeletonSetAnimation(skeleton, animName, loop);
            }
        } else if (!able && this.currentValue) {
            this.currentValue = 0;
            spSkeletonEmpty(skeleton);
            spSkeletonSetAnimation(skeleton, '');
        }
    }
}
