import { _decorator, Animation, CCBoolean, CCInteger, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class AnimationConfig extends Component {

    @property(Animation)
    animation: Animation = null;

    @property(CCInteger)
    index: number = 0;

    @property(CCBoolean)
    enactive: boolean = false;

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.animation = this.animation || this.node.getComponent(Animation);
    }

    onLoad() {
        this.pre();
    }

}
