import { _decorator, CCString, Component } from 'cc';
import { activeButtonExclusive, bindExclusiveButtonInteractable, disableButtonExclusive, unbindExclusiveButtonInteractable } from '../LibGlobal';
import { nodeProperty } from '../utils/Utils';
import CommonButton from './CommonButton';

const { ccclass, property } = _decorator;

@ccclass
export default class ButtonInteractable extends Component {

    @property(CCString)
    zone: string = '';

    onLoad() {
        bindExclusiveButtonInteractable(this.zone, this);
    }

    onDestroy() {
        unbindExclusiveButtonInteractable(this.zone, this);
    }

    public triggerExclusive(able: boolean) {
        if (able) {
            activeButtonExclusive(this.zone, this);
        } else {
            disableButtonExclusive(this.zone);
        }
    }

    public interactable(able: boolean) {
        const buttons = this.node.getComponentsInChildren(CommonButton);
        buttons.forEach(nodeProperty('interactable', able));
    }
}
