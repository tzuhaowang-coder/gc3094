import { _decorator, Node, Size, Sprite, SpriteFrame } from 'cc';
import { DEBUG } from 'cc/env';
import ResSprite from '../script/ResSprite';
import { lowerThen, setNodeScale, warn } from '../utils/Utils';
import ColBase from './ColBase';
import { KeyFrame } from './KeyFrame';
import { KeyNode } from './KeyNode';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColSprite')
export class ColSprite extends ColBase<string> {

    @property([KeyFrame])
    keyFrames: KeyFrame[] = [];

    @property([KeyNode])
    keyNodes: KeyNode[] = [];

    @property(Node)
    framesNodeRoot: Node = null;

    @property(Sprite)
    sprite: Sprite = null;

    @property(Size)
    shrink: Size = null;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.sprite = this.sprite || this.node.getComponent(Sprite);

        if (this.keyNodes.length) {
            this.keyFrames = this.keyFrames.concat(
                this.keyNodes.map((kn) => {
                    const las = kn.node.getComponent(ResSprite);
                    las.saveFrame = true;
                    las.pre();
                    return {
                        key: kn.key,
                        frame: las.frame,
                    };
                }),
            );
        }
        if (this.framesNodeRoot) {
            this.keyFrames = this.keyFrames.concat(
                this.framesNodeRoot.getComponentsInChildren(Sprite).map((sprite) => {
                    return {
                        key:sprite.node.name,
                        frame: sprite.spriteFrame,
                    };
                }),
            );
        }
    }

    onLoad() {
        this.pre();
    }

    reset(value: string) {
        this.pre();

        // tslint:disable-next-line:triple-equals
        const kf = this.keyFrames.find(kf => kf.key == value);
        let frame: SpriteFrame;
        if (kf) {
            frame = kf.frame;
        }

        if (DEBUG && !frame) {
            warn('No frame', this, value);
        }

        if (this.shrink && frame) {
            const rect = frame.getRect();
            const sw = this.shrink.width;
            const sh = this.shrink.height;
            const rw = rect.width;
            const rh = rect.height;
            const arr = [1];
            if (sw) {
                arr.push(sw / rw);
            }
            if (sh) {
                arr.push(sh / rh);
            }
            setNodeScale(this.sprite.node, lowerThen(1, Math.min.apply(null, arr)));
        }
        this.sprite.spriteFrame = frame ? frame : null;
        this.prev = value;
    }
}
