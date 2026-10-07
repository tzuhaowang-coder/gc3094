import { _decorator } from 'cc';
import CommonButton from '../component/CommonButton';
import ColBase from '../data/ColBase';

const { ccclass, property } = _decorator;

export enum PowerBetButtonState {
    NONE = 0,
    DISABLE = 1,
    IDLE = 2,
}

@ccclass
export default class ColButtonPowerBet extends ColBase<PowerBetButtonState> {

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

    public reset(value: PowerBetButtonState): void {
        this.pre();
        switch (value){
        case PowerBetButtonState.NONE:
            this.button.interactable = false;
            this.button.node.active = false;
            break;
        case PowerBetButtonState.DISABLE:
            this.button.interactable = false;
            this.button.node.active = true;
            break;
        case PowerBetButtonState.IDLE:
            this.button.interactable = true;
            this.button.node.active = true;
            break;
        }
        this.prev = value;
    }

}
