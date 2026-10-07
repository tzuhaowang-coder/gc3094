import { _decorator, AnimationClip, Component, sp, SpriteAtlas } from 'cc';
import { getResLoader } from './ResLoader';

const { ccclass, property } = _decorator;

@ccclass
export default class ResLoaderAppend extends Component {

    @property([SpriteAtlas])
    spriteAtlass: SpriteAtlas[] = [];

    @property([sp.SkeletonData])
    skeletonDatas: sp.SkeletonData[] = [];

    @property([AnimationClip])
    animationClips: AnimationClip[] = [];

    onLoad() {
        const l = getResLoader();
        l.appendAtlas(this.spriteAtlass);
        l.appendSkeletonData(this.skeletonDatas);
        l.appendAnimationClip(this.animationClips);
    }
}
