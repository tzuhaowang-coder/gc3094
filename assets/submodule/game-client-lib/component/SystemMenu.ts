
import { _decorator, Button, CCFloat, Component, EventHandler, EventTouch, Label, Node, Tween } from 'cc';
import CommonButton from '../component/CommonButton';
import { animationPlayToPromise } from '../script/PromiseManager';
import { getAudioEnable } from '../StorageGlobal';
import { arraySplice, nodeActive } from '../utils/Utils';
import ButtonInteractable from './ButtonInteractable';

const { ccclass, property } = _decorator;

@ccclass
export default class SystemMenu extends Component {

    @property(Animation)
    animation: Animation = null;

    @property(CommonButton)
    audioToggle: CommonButton = null;

    @property(CommonButton)
    menuButton:CommonButton = null;

    @property(Button)
    menuCCButton: Button = null;

    @property(Label)
    label:Label = null;

    @property([Node])
    buttonNode: Node[] = [];

    @property([Node])
    optionNodes: Node[] = [];

    @property(CCFloat)
    closeTimeout: number = 0;

    public optionHandlers: EventHandler[] = [];

    public able: boolean = false;

    @property(Node)
    tweenNode:Node = null;
    public backHandler: EventHandler = null;
    public helpHandler: EventHandler = null;
    public audioHandler: EventHandler = null;
    public recordHandler: EventHandler = null;

    @property(Tween)
    inTween: Tween<Node> = null;

    @property(Tween)
    outTween: Tween<Node>  = null;
    private tween: Tween<Node>  = null;

    start() {
        if (this.menuButton) {
            this.menuCCButton = this.menuButton.getComponent(Button);
        }
        this.audioToggle.isChecked = getAudioEnable();
        this.optionNodes.forEach(nodeActive(false));
        this.applyButtonAble();

        if (this.closeTimeout) {
            this.scheduleOnce(() => this.toggleMenu(false), this.closeTimeout);
        }
    }

    onBackClick() {
        this.backHandler.emit([]);
    }

    onHelpClick() {
        this.helpHandler.emit([]);
    }

    onRecordClick() {
        this.recordHandler.emit([]);
    }

    public toggleAudio() {
        const btn = this.audioToggle.getComponent(CommonButton);
        this.audioHandler.emit([btn.isChecked]);
    }

    onAudioToggleClick() {
        this.toggleAudio();
    }

    public addButtonNodeFromOthers(index: number) {
        const node = this.optionNodes[index];
        if (!node) {
            return;
        }
        if (this.buttonNode.indexOf(node) !== -1) {
            return;
        }
        this.buttonNode.push(node);
        this.applyButtonAble();
    }

    public removeButtonNodeFromOthers(index: number) {
        const node = this.optionNodes[index];
        if (!node) {
            return;
        }
        if (this.buttonNode.indexOf(node) === -1) {
            return;
        }
        arraySplice(this.buttonNode, node);
        this.applyButtonAble();
    }

    public applyButtonAble() {
        this.buttonNode.forEach(nodeActive(this.able));
    }

    public toggleMenu(able: boolean = !this.able, force: boolean = false) {

        if (!force && able === this.able) {
            return;
        }
        this.able = able;
        const bi = this.getComponent(ButtonInteractable);
        if (bi) {
            bi.triggerExclusive(this.able);
        }
        const anim = this.animation;
        if (this.menuCCButton) {
            this.menuCCButton.enabled = false;
        }
        if (able) {
            if (this.closeTimeout) {
                this.unscheduleAllCallbacks();
                this.scheduleOnce(() => this.toggleMenu(false), this.closeTimeout);
            }
            animationPlayToPromise(anim, 0).then(() => {
                if (this.menuCCButton) {
                    this.menuCCButton.enabled = true;
                }
            });
            if (this.inTween) {
                if (this.tween) {
                    this.tween.removeSelf();
                }
                this.tween = this.inTween.clone(this.tweenNode).start();
            }
            this.applyButtonAble();
        } else {
            animationPlayToPromise(anim, 1).then(() => {
                if (this.menuCCButton) {
                    this.menuCCButton.enabled = true;
                }
                this.applyButtonAble();
            });
            if (this.outTween) {
                if (this.tween) {
                    this.tween.removeSelf();
                }
                this.tween = this.outTween.clone(this.tweenNode).start();
            }
        }

    }

    public setNetQualityPing(ping: number) {
        // this.netQuality.setPing(ping);
    }

    onToggleClick() {
        this.toggleMenu();
    }

    onOptionClick(event: EventTouch) {
        const node = event.target;
        const i = this.optionNodes.indexOf(node);
        if (i !== -1) {
            this.optionHandlers[i].emit([]);
        }
    }
}
