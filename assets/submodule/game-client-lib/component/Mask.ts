import { _decorator, Component, Node, tween, Tween } from 'cc';
import { applyNodeTween } from '../data/NodeTween';
import { callFunc, fadeIn, fadeOut, sequence } from '../utils/Tween';
import { getNodeOpacity, setNodeOpacity } from '../utils/Utils';

const { ccclass } = _decorator;
/**
 * Mask物件 必須吃掉所有事件
 */
@ccclass
export default class Mask extends Component {
    /**
     * 是否在變 灰 的過程中
     */
    private toGray: boolean = false;
    /**
     * 是否在變 透明 的過程中
     */
    private toTransparent: boolean = false;
    /**
     * 變灰或變透明的 Action
     */
    private action: Tween<Node> = null;

    fade(able: boolean = true, callback: () => void = () => { }) {
        // warn("fade", fadein)
        if (able) {
            this.toTransparent = false;
            // 如果正在變灰過程中不再變灰
            if (this.toGray) {
                return;
            } else if (getNodeOpacity(this.node) !== 255) {
                Tween.stopAllByTarget(this.node);
                this.action = sequence(
                    callFunc(() => {
                        // log("mask", "toGray", true)
                        this.toGray = true;
                    }),
                    fadeIn(0.3),
                    callFunc(() => {
                        // 設為 255，沒設有時會有閃爍情況
                        setNodeOpacity(this.node, 255);
                        // log("mask", "toGray", false)
                        this.toGray = false;
                    }),
                    callFunc(callback),
                    callFunc(() => {
                        this.action = null;
                    }),
                );
                applyNodeTween({
                    node: this.node,
                    action: this.action,
                });
                tween(this.node).then(this.action).start();
            }
        } else { // fadeout
            this.toGray = false;
            // 如果正在變透明過程中不再變透明
            if (this.toTransparent) {
                return;
            } else {
                Tween.stopAllByTarget(this.node);
                this.action = sequence(
                    callFunc(() => {
                        // log("mask", "toTransparent", true)
                        this.toTransparent = true;
                    }),
                    fadeOut(0.3),
                    callFunc(() => {
                        // 設為 0，沒設有時會有閃爍情況
                        setNodeOpacity(this.node, 0);
                        // log("mask", "toTransparent", false)
                        this.toTransparent = false;
                    }),
                    callFunc(callback),
                    callFunc(() => {
                        this.action = null;
                    }),
                );
                tween(this.node).then(this.action).start();
            }
        }
    }
    onEnable() {
        // 在場景切換時 node 會被 disable 再 enable，disable 時 action 就被停住了
        // 所以判斷如果還沒做完就再做一次
        if (this.action) {
            tween(this.node).then(this.action).start();
        }
        // warn('mask', 'onEnable');
    }
    onDisable() {
        // warn('mask', 'onDisable');
    }
    toggle(able: boolean, hasGrayMask?: boolean) {
        if (able) {
            this.on(hasGrayMask);
        } else {
            this.off();
        }
    }
    on(gray: boolean = true) {
        // log("mask", "node.active", true)
        this.node.active = true;
        this.fade(gray);
    }
    off() {
        const next = function () {
            // log("mask", "node.active", false)
            // 在 action 結束後才能 disable
            this.node.active = false;
        }.bind(this);
        this.fade(false, next);
    }
}
