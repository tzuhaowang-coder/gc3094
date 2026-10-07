import { _decorator, CCBoolean, sp } from 'cc';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import ColBase from './ColBase';

const { ccclass, property, executionOrder } = _decorator;

@ccclass
@executionOrder(-1) // 要优先于 sp.Skeleton
export default class ColSpSkeletonString extends ColBase<string> {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(CCBoolean)
    loop: boolean = false;

    @property(CCBoolean)
    nodeActive: boolean = false;

    private playing: boolean = false;
    private value: string = '';

    onLoad() {

        this.skeleton = this.skeleton || this.getComponent(sp.Skeleton);
        this.reset(this.value);

        this.skeleton.setCompleteListener(() => {
            this.playing = false;
            if (this.nodeActive) { // 有啟用，播完會關閉
                this.node.active = false;
            }
        });
    }

    public reset(str: string): void {
        const ske = this.skeleton;
        this.value = str;
        const able = Boolean(str);
        if (able) {
            if (this.nodeActive) {
                this.node.active = true;
            }
            spSkeletonSetAnimation(ske, str, this.loop, true);
            this.playing = true;
        } else if (!able && this.playing) {
            spSkeletonSetAnimation(ske, '');
            this.playing = false;
            if (this.nodeActive) {
                this.node.active = false;
            }
        }
    }
}
