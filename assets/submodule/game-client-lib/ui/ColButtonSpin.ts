import { _decorator, Button, CCFloat, CCInteger, Label, Node, sp, sys } from 'cc';
import { audioPlay, audioStopLoop } from '../component/Audio';
import ColBase from '../data/ColBase';
import { globalDebugNNN } from '../LibGlobal';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import { INFINITY_MARK } from '../utils/Utils';

const { ccclass, property } = _decorator;

// 一般常態按鈕-按鈕外框 pic_spin_frame
// 一般常態按鈕-按鈕底版 pic_spin_btn
// 待機按鈕動畫 ani_spin_stay
// 觸碰按鈕動畫 ani_spin_touch
// 點擊按鈕動畫 ani_spin_click
// ani_spin_auto
// 箭頭-一般 pic_spin_arrow
// 箭頭-模糊 pic_spin_arrow_blu

export enum SpinButtonState {
    SPIN = 0,
    AUTO = 1,
}

interface SpinState {
    state: SpinButtonState;
    able: boolean;
    round: string;
    effect: boolean;
}

export function extractSpinState(stateStr: string): SpinState {
    const [state, able, round, effect] = (stateStr || '').split('_');
    return {
        state: Number(state),
        able: able ? Boolean(Number(able)) : false,
        round: round ? round : '0',
        effect: Boolean(Number(effect)),
    };
}

export function createSpinStateString(state: SpinState):string {
    return [
        state.state,
        Number(state.able),
        state.round,
        Number(state.effect),
    ].join('_');
}

export enum audioKey {
    spin_button = 0,
    spin_button_hover = 1,
}

@ccclass
export default class ColButtonSpin extends ColBase<string> {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(Button)
    button: Button = null;

    @property(Node)
    arrowNode: Node = null;

    @property(Node)
    labelNode: Node = null;

    @property(CCFloat)
    arrowVar: number = 0; // -30

    @property(CCInteger)
    arrowEffectVar: number = 0; // -1000

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    // tslint:disable-next-line:variable-name
    private _isHover: boolean = false;
    public get isHover(): boolean {
        return this._isHover;
    }
    public set isHover(value: boolean) {
        this._isHover = value;
        this.audioPlay2(audioKey.spin_button_hover, value);
    }

    private arrowRot: boolean = false;
    private arrowRotVar: number = 0;

    public audioNames: string[] = [];

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        globalDebugNNN(this, 'ColSpinButton', false);
    }

    update(dt: number): void {
        // if (this.arrowRotVar) {
        //     const arv = this.arrowRotVar * dt * 3;
        //     this.arrowNode.angle += arv;
        //     const sign = Math.sign(arv);
        //     this.arrowRotVar -= arv;
        //     const sign2 = Math.sign(this.arrowRotVar);
        //     if (sign !== sign2 || Math.abs(this.arrowRotVar) < 1) {
        //         this.arrowRotVar = 0;
        //     }
        //     // const blurArrow = Math.abs(this.arrowRotVar) > 100;
        //     // this.arrowNode.children[0].active = blurArrow;
        //     // this.arrowNode.children[1].active = !blurArrow;
        // }
        if (this.arrowRot) {
            const { state, able, round, effect } = extractSpinState(this.prev);
            let r = this.arrowVar;
            if (effect) {
                r = this.arrowVar + this.arrowEffectVar;
            }
            this.arrowNode.angle += r * dt;
        }
    }

    public reset(value: string): void {
        this.pre();

        const { effect: ep } = extractSpinState(this.prev);
        const { state, able, round, effect } = extractSpinState(value);
        let anim = '';
        let arrowOrLabel: 'arrow' | 'label';
        let arrowRot: boolean;
        if (ep !== effect && effect) {
            this.audioPlay2(audioKey.spin_button, true);
        }
        if (effect) {
            this.arrowRotVar = this.arrowEffectVar;
        }
        if (state === SpinButtonState.SPIN) { // 待機
            if (this.isHover) {
                anim = 'ani_spin_touch';
            } else {
                anim = 'ani_spin_stay';
            }
            arrowOrLabel = 'arrow';
            arrowRot = true;
        } else { // SpinButtonState.AUTO
            arrowOrLabel = 'label';
            anim = 'ani_spin_auto';
            arrowRot = false;
            this.arrowRotVar = 0;
        }
        this.arrowRot = arrowRot;

        // const color = able ? COLOR_WHITE : COLOR_GRAY;
        // setNodeColor(this.button.node, color);
        if (anim !== this.skeleton.animation) {
            spSkeletonSetAnimation(this.skeleton, anim, true);
        }

        const hasAuto = arrowOrLabel === 'label';
        this.button.interactable = able || hasAuto;
        this.arrowNode.active = arrowOrLabel === 'arrow';
        this.labelNode.active = arrowOrLabel === 'label';

        const infinity = round === INFINITY_MARK;
        const str = round === INFINITY_MARK ? '' : round;
        const l0 = this.labelNode.children[0];
        const s0 = this.labelNode.children[1];
        l0.active = !infinity;
        s0.active = infinity;
        this.labelNode.getComponentInChildren(Label).string = str;

        this.prev = value;
    }

    onMouseEnter() {
        this.isHover = true;
        if (this.prev) {
            const type = Number(this.prev[0]);
            if (type === SpinButtonState.SPIN) {
                this.reset(this.prev);
            }
        }
    }

    onMouseLeave() {
        this.isHover = false;
        if (this.prev) {
            const type = Number(this.prev[0]);
            if (type === SpinButtonState.SPIN) {
                this.reset(this.prev);
            }
        }
    }

    onEnable() {
        if (sys.isMobile) {
            this.button.node.on(Node.EventType.TOUCH_START, this.onMouseEnter, this);
            this.button.node.on(Node.EventType.TOUCH_END, this.onMouseLeave, this);
            this.button.node.on(Node.EventType.TOUCH_CANCEL, this.onMouseLeave, this);
        } else {
            this.button.node.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.button.node.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        }
    }

    onDisable() {
        if (sys.isMobile) {
            this.button.node.off(Node.EventType.TOUCH_START, this.onMouseEnter, this);
            this.button.node.off(Node.EventType.TOUCH_END, this.onMouseLeave, this);
            this.button.node.off(Node.EventType.TOUCH_CANCEL, this.onMouseLeave, this);
        } else {
            this.button.node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.button.node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        }
        this.isHover = false;
    }

    public isHovered() {
        return this.isHover;
    }

    private audioPlay2(key: audioKey, able: boolean = true) {
        const name = this.audioNames[key];
        if (!name) {
            return;
        }
        if (key === audioKey.spin_button_hover) {
            if (able) {
                audioPlay(name, { loop: true });
            } else {
                audioStopLoop(name);
            }
        } else {
            audioPlay(name);
        }
    }
}
