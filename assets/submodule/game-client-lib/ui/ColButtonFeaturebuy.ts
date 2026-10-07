import { _decorator, Color } from 'cc';
import CommonButton from '../component/CommonButton';
import ColBase from '../data/ColBase';

const { ccclass, property } = _decorator;

const COLOR_GRAY = new Color(100, 100, 100, 255);
const COLOR_WHITE = new Color(255, 255, 255, 255);

export enum FeaturebuyButtonState {
    NONE = 0,
    DISABLE = 1,
    IDLE = 2,
}

@ccclass
export default class ColButtonFeaturebuy extends ColBase<FeaturebuyButtonState> {

    @property({
        override: true,
        visible: false,
    })
    colKey: string = '';

    @property(CommonButton)
    button: CommonButton = null;

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
    }

    public reset(value: FeaturebuyButtonState): void {
        this.pre();
        switch (value){
        case FeaturebuyButtonState.NONE:
            this.button.interactable = false;
            this.button.node.active = false;
            break;
        case FeaturebuyButtonState.DISABLE:
            this.button.interactable = false;
            this.button.node.active = true;
            break;
        case FeaturebuyButtonState.IDLE:
            this.button.interactable = true;
            this.button.node.active = true;
            break;
        }
        this.prev = value;
    }

}
