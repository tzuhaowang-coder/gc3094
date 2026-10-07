import { _decorator, Animation, CCInteger, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class AnimationDelayPlay extends Component {

    @property(CCInteger)
    delaySec: number = 0;

    @property(Animation)
    animation: Animation = null;

    start() {

        const anim = this.animation || this.node.getComponent(Animation);
        // @ts-ignore
        const isPlaying = anim._animator && anim._animator.isPlaying;
        if (!isPlaying) {
            // @ts-ignore
            const state = anim.getAnimationState(anim._defaultClip.name);
            const next = () => {
                // @ts-ignore
                anim._animator.playState(state);
            };
            anim.scheduleOnce(next, this.delaySec);
        }
    }

}
