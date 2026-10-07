import { _decorator, CCString, Component, Node, sp, Sprite, SpriteFrame } from 'cc';
import { applyNodeTween } from '../data/NodeTween';
import { spSkeletonEmpty, spSkeletonSetAnimation } from '../script/PromiseManager';
import { fadeOut, stopAllActions } from '../utils/Tween';
import { setNodeOpacity } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class BackgroundBase extends Component {

    @property(Node)
    node1: Node = null;

    @property(Node)
    node2: Node = null;

    @property([SpriteFrame])
    spriteFrames: SpriteFrame[] = [];

    @property([CCString])
    skeletonAnimations: string[] = [];

    @property(Node)
    refBackgroundNode: Node = null;

    private refBackground: BackgroundBase = null;

    onLoad(): void {
        this.refBackground = this.refBackgroundNode.getComponent(BackgroundBase);
    }

    public reset(idx: number) {
        if (this.spriteFrames.length) {
            const backgroundSprite = this.node1.getComponent(Sprite);
            const oldFrame = backgroundSprite.spriteFrame;
            backgroundSprite.spriteFrame = this.spriteFrames[idx];
            const bgSprite2 = this.node2.getComponent(Sprite);
            bgSprite2.spriteFrame = oldFrame;
            stopAllActions(this.node2);
            setNodeOpacity(this.node2, 255);
            applyNodeTween({
                node: this.node2,
                action: fadeOut(.3),
            });
        } else if (this.skeletonAnimations) {
            const nextStr = this.skeletonAnimations[idx];
            const old = this.node1.getComponent(sp.Skeleton);
            const next = this.node2.getComponent(sp.Skeleton);
            this.node2 = old.node;
            this.node1 = next.node;
            next.node.setSiblingIndex(0);
            old.node.setSiblingIndex(1);
            if (nextStr) {
                spSkeletonSetAnimation(next, nextStr, true);
                setNodeOpacity(next.node, 255);
            } else {
                spSkeletonEmpty(next);
                setNodeOpacity(next.node, 0);
            }
            setNodeOpacity(old.node, 255);
            applyNodeTween({
                node: old.node,
                action: fadeOut(.3),
            });
        }
        if (this.refBackground) {
            this.refBackground.reset(idx);
        }
    }

}
