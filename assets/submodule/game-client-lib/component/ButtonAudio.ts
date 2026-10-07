import { _decorator, Button, CCString, Component, NodeEventType } from 'cc';
import { audioDefaultButtonAudioName, audioGetCustomButtonAudioName, audioPlay, CUSTOM_START_WITH } from './Audio';
import CommonButton from './CommonButton';
import CommonSpineButton from './CommonSpineButton';

const { ccclass, property, menu } = _decorator;

@ccclass
@menu('Button/ButtonAudio')
export default class ButtonAudio extends Component {

    @property(CCString)
    audioName: string = '';

    private play() {
        const csb = this.getComponent(CommonSpineButton);
        if (csb && csb.interactable === false) {
            return;
        }
        const cb = this.getComponent(CommonButton);
        if (cb && cb.interactable === false) {
            return;
        }
        const b = this.getComponent(Button);
        if (b && b.interactable === false) {
            return;
        }
        const n = this.audioName;
        let str = n;
        if (n.startsWith(CUSTOM_START_WITH)) {
            str = audioGetCustomButtonAudioName(n.replace(CUSTOM_START_WITH, ''));
        } else {
            str = str || audioDefaultButtonAudioName();
        }
        audioPlay(str);
    }

    onEnable() {
        this.node.on(NodeEventType.TOUCH_START, this.play, this);
    }

    onDisable() {
        this.node.off(NodeEventType.TOUCH_START, this.play, this);
    }
}
