
import { _decorator, CCBoolean, CCFloat, Node, Tween } from 'cc';
import { callFunc, fadeTo, sequence, stopAllActions } from '../utils/Tween';
import { nodeActive, nodeOpacity } from '../utils/Utils';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;

@ccclass
@menu('Col/ColFadeActive')
export default class ColFadeActive extends ColBase<any> {

    @property([Node])
    nodes: Node[] = [];

    @property(CCBoolean)
    reverse: boolean = false;

    @property(CCBoolean)
    hasActive: boolean = true;

    @property(CCBoolean)
    hasFade: boolean = false;

    @property(CCFloat)
    fadeTime: number = 0;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        if (!this.nodes.length) {
            this.nodes.push(this.node);
        }
    }

    /**
     * 使用cocos creator 2.0.9以下版本時需注意
     * 底下物件有Label時,不可使用此功能
     */
    reset(value: any) {
        this.pre();
        let able = value;
        if (this.reverse) {
            able = !value;
        }
        const next = () => {
            if (this.hasActive) {
                this.nodes.forEach(nodeActive(able));
            }
        };
        if (this.hasFade) {
            const fadeTime = this.fadeTime;
            if (fadeTime === 0) {
                this.nodes.forEach(nodeOpacity(able ? 255 : 0));
                next();
            } else {
                let action:  Tween<Node>;
                if (able) {
                    this.nodes.forEach(nodeActive(true));
                }
                action = fadeTo(fadeTime, able ? 255 : 0);
                if (this.hasActive) {
                    action = sequence(
                        action,
                        callFunc(next),
                    );
                }
                this.nodes.forEach((node) => {
                    stopAllActions(node);
                    action.clone(node).start();
                });
            }
        } else {
            next();
        }
    }
}
