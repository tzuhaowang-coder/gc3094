import { _decorator, Button, Label, Node, NodeEventType, sp, sys } from 'cc';
import ColBase from '../submodule/game-client-lib/data/ColBase';
import { schedulePromise, spSkeletonSetAnimation } from '../submodule/game-client-lib/script/PromiseManager';
import { setNodeOpacity } from '../submodule/game-client-lib/utils/Utils';

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
}

export function extractSpinState(stateStr: string): SpinState {
    const [state, able, round] = stateStr.split('_');
    return {
        state: Number(state),
        able: able ? Boolean(Number(able)) : false,
        round: round ? round : '0',
    };
}

export function createSpinStateString(state: SpinState): string {
    return [
        state.state,
        Number(state.able),
        state.round,
    ].join('_');
}

@ccclass
export default class ColButtonSpinX extends ColBase<string> {

    @property(Node)
    stayNode: Node = null;

    @property(Node)
    greyNode: Node = null;

    @property(sp.Skeleton)
    arrowSkeleton: sp.Skeleton = null;

    @property(sp.Skeleton)
    hoverSkeleton: sp.Skeleton = null;

    @property(sp.Skeleton)
    clickSkeleton: sp.Skeleton = null;

    @property(Button)
    button: Button = null;

    @property(Node)
    labelNode: Node = null;

    @property(Node)
    normalBoardNode: Node = null;

    @property(Node)
    autoBoardNode: Node = null;

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    private isHover: boolean = false;
    private isAuto: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.clickSkeleton.setStartListener(async () => { // 配合 col spinEffect

            if (this.isAuto) {
                return;
            }

            setNodeOpacity(this.clickSkeleton.node, 255);
            setNodeOpacity(this.greyNode, 255);

            // 因為 clickSkeleton 動畫會縮小一下，這個在後面會露餡，先暫時隱藏
            setNodeOpacity(this.stayNode, 0);
            await schedulePromise(0.1);
            setNodeOpacity(this.stayNode, 255);
        });

        this.clickSkeleton.setCompleteListener(() => {
            this.clickSkeleton.node.active = false; // 隱藏 ani_spin_click 動畫 node
            spSkeletonSetAnimation(this.arrowSkeleton, 'ani_spin_stay', true); // 顯示 normal 箭頭動畫 配合 col allowSpin
        });

        this.clickSkeleton.node.active = false;
        this.greyNode.on(NodeEventType.ACTIVE_CHANGED, () => {
            if (this.greyNode.active) {
                spSkeletonSetAnimation(this.arrowSkeleton, 'ani_spin_stay', true);
            }
        });
    }

    public reset(value: string): void {
        this.pre();

        const { state, able, round } = extractSpinState(value);
        let anim = '';
        let arrowOrLabel: 'arrow' | 'label' = 'arrow';
        let arrowRot = 0;
        if (state === SpinButtonState.SPIN) { // 待機
            if (this.isHover) {
                anim = 'ani_spin_touch';
            } else {
                anim = 'empty';
            }
            arrowRot = 1;
        } else { // SpinButtonState.AUTO
            arrowOrLabel = 'label';
            anim = 'empty';
        }

        if (anim !== this.hoverSkeleton.animation) {
            this.hoverSkeleton.node.active = true;
            spSkeletonSetAnimation(this.hoverSkeleton, anim, this.isHover);
        }

        const hasAuto = arrowOrLabel === 'label';
        this.button.interactable = able || hasAuto;

        if (hasAuto && !this.isAuto) { // 切換成 auto
            setNodeOpacity(this.clickSkeleton.node, 0); // 隱藏 ani_spin_click 爆炸冒煙的 click 動畫
            setNodeOpacity(this.greyNode, 0); // 隱藏 灰階箭頭
        } else if (!hasAuto && this.isAuto) {// 切換成 spin
            setNodeOpacity(this.greyNode, 255); // 顯示 灰階箭頭
        }

        this.isAuto = hasAuto;
        this.labelNode.active = hasAuto;
        this.labelNode.getComponentInChildren(Label).string = round;

        this.autoBoardNode.active = hasAuto;
        this.normalBoardNode.active = !hasAuto;

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
}
