import { _decorator, CCBoolean, CCString, sp } from 'cc';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import ColBase from './ColBase';

const { ccclass, property, executionOrder } = _decorator;

@ccclass
@executionOrder(-1) // 要优先于 sp.Skeleton
export default class ColSpSkeleton extends ColBase<boolean> {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(CCString)
    animation: string = '';

    @property(CCBoolean)
    loop: boolean = false;

    @property(CCBoolean)
    playAnyway: boolean = false;

    @property(CCBoolean)
    nodeActive: boolean = false;

    private playing: boolean = false;

    onLoad() {

        this.skeleton = this.skeleton || this.getComponent(sp.Skeleton);
        this.animation = this.animation || this.skeleton.animation;
        spSkeletonSetAnimation(this.skeleton, '');

        this.skeleton.setCompleteListener(() => {
            this.playing = false;
            if (this.nodeActive) { // 有啟用，播完會關閉
                this.node.active = false;
            }
        });
    }

    public reset(able: boolean): void {
        const ske = this.skeleton;
        if (able) {
            if (this.nodeActive) {
                this.node.active = true;
            }
            if (this.playAnyway) {
                spSkeletonSetAnimation(ske, this.animation, this.loop, true);
                this.playing = true;
            } else if (!this.playing) {
                this.node.active = true;
                spSkeletonSetAnimation(ske, this.animation, this.loop);
                this.playing = true;
            }
        } else if (!able && this.playing) {
            spSkeletonSetAnimation(ske, '');
            this.playing = false;
            if (this.nodeActive) {
                this.node.active = false;
            }
        }
    }
}
