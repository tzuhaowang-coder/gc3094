import { _decorator, sp } from 'cc';
import { DEBUG } from 'cc/env';
import ColBase from '../data/ColBase';
import { spSkeletonSetAnimation, spSkeletonSetMix } from '../script/PromiseManager';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@requireComponent(sp.Skeleton)
@executionOrder(-1) // 要优先于 sp.Skeleton
export default class ColButtonQuickspin extends ColBase<number> {

    private playing: boolean = false;
    private skeleton: sp.Skeleton = null;

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.skeleton = this.getComponent(sp.Skeleton);
        spSkeletonSetMix(this.skeleton);
        // this.skeleton.setCompleteListener(() => {
        //     this.playing = false;
        //     if (this.nodeActive) { // 有啟用，播完會關閉
        //         this.node.active = false;
        //     }
        // });
    }

    public reset(value: number): void {
        this.pre();

        if (this.prev === value) {
            return;
        }

        const arr = [`ani_lightning_tolv${value}`, `ani_lightning_lv${value}`];
        const ske = this.skeleton;

        if (DEBUG && [0, 1, 2].indexOf(value) === -1) {
            debugger;
        }

        spSkeletonSetAnimation(ske, arr, true);
        this.prev = value;
    }
}
