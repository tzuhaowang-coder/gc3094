
import { _decorator, CCBoolean, Sprite } from 'cc';
import NodeShrink from '../component/NodeShrink';
import { KeyAtlas } from '../data/KeyAtlas';
import { KeyFrame } from '../data/KeyFrame';
import { findFrame } from '../data/KeyStr';
import ResourcesCol from './ResourcesCol';
import ResourcesLoader, { getResourcesLoader } from './ResourcesLoader';

const { ccclass, property, menu, requireComponent } = _decorator;

@ccclass
@menu('ResourcesLoad/ResourcesSprite')
@requireComponent(Sprite)
export default class ResourcesSprite extends ResourcesCol {

    @property(CCBoolean)
    fromFrame: boolean = false;

    onLoad() {
        if (this.delay) {
            return;
        }
        const l = getResourcesLoader();
        this.reset(l);
    }

    reset(loader: ResourcesLoader): void {
        if (this.fromFrame) {
            this.reset2(loader.keyFrames);
        } else {
            this.reset1(loader.keyAtlass);
        }
    }

    public reset1(keyAtlas: KeyAtlas[]): void {
        const f = findFrame(this.keys, keyAtlas);
        const sprite = this.getComponent(Sprite);
        sprite.spriteFrame = f ? f.frame : null;
        this.resize();
    }

    public reset2(keyFrames: KeyFrame[]): void {
        const ks = this.keys;
        let kf: KeyFrame;
        for (let i = 0; i < ks.length; i += 1) {
            const k = ks[i];
            kf = keyFrames.find(kf => kf.key === k);
            if (kf) {
                break;
            }
        }
        const sprite = this.getComponent(Sprite);
        sprite.spriteFrame = kf ? kf.frame : null;
        this.resize();
    }

    protected resize() {
        const ns = this.getComponent(NodeShrink);
        if (ns) {
            ns.resize();
        }
    }
}
