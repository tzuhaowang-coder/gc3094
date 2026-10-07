import { _decorator, Animation, AnimationClip, AnimationState, CCBoolean } from 'cc';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColAnimation')
export class ColAnimation extends ColBase<any> {

    @property(CCBoolean)
    reverse: boolean = false;

    @property(Animation)
    animation: Animation = null;

    @property(CCBoolean)
    playAnyway: boolean = false;

    public state: AnimationState = null;

    private clips: AnimationClip[] = [];

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.animation = this.animation || this.node.getComponent(Animation);
        this.clips = this.animation.clips;
    }

    reset(value: any) {
        this.pre();
        if (!this.playAnyway && this.prev === value) {
            return;
        }
        let bool = Boolean(value);
        if (this.reverse) {
            bool = !value;
        }
        const idx = bool ? 1 : 0;

        this.animation.stop();
        this.animation.play(this.clips[idx].name);
        this.prev = value;
    }
}
