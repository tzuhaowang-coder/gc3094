import { _decorator, AnimationClip, Component, Font, sp, SpriteAtlas, SpriteFrame } from 'cc';
import { KeyAtlas } from '../data/KeyAtlas';
import { onlyUnique } from '../utils/Utils';
import { getResourcesLoader } from './ResourcesLoader';

const { ccclass, property, inspector, executionOrder } = _decorator;

let rl: ResLoader = null;

export function getResLoader() {
    return rl;
}

export function setResLoader(resLoader: ResLoader) {
    rl = resLoader;
}

export function getResSpriteFrame(key: string): SpriteFrame {
    if (!rl) {
        return null;
    }
    return rl.getSpriteFrame(key);
}

@ccclass
@executionOrder(-10)
export default class ResLoader extends Component {

    @property([KeyAtlas])
    keyAtlass: KeyAtlas[] = [];

    @property([sp.SkeletonData])
    skeletonDatas: sp.SkeletonData[] = [];

    @property([Font])
    fonts: Font[] = [];

    @property([AnimationClip])
    animationClips: AnimationClip[] = [];

    private frameCache: Map<string, SpriteFrame> = new Map();

    onLoad() {
        setResLoader(this);
        this.keyAtlass.forEach(ka => ka.key = ka.atlas.name.split('.')[0]);

        const l = getResourcesLoader();
        if (l) {
            l.loaded(this.keyAtlass.map(ka => ka.atlas));
        }
    }

    public appendAtlas(atlass: SpriteAtlas[]) {
        if (!atlass.length) {
            return;
        }
        const kas = atlass.filter(atlas => !this.keyAtlass.find(ka => atlas === ka.atlas)).map((atlas): KeyAtlas => {
            return {
                atlas,
                key: atlas.name.split('.')[0],
            };
        });
        this.keyAtlass.push(...kas);
    }

    public appendSkeletonData(skeletonDatas: sp.SkeletonData[]) {
        if (!skeletonDatas.length) {
            return;
        }
        this.skeletonDatas.push(...skeletonDatas);
        this.skeletonDatas = this.skeletonDatas.filter(onlyUnique);
    }

    public appendAnimationClip(animationClips: AnimationClip[]) {
        if (!animationClips.length) {
            return;
        }
        this.animationClips.push(...animationClips);
        this.animationClips = this.animationClips.filter(onlyUnique);
    }

    public getSpriteFrame(key: string) {
        if (this.frameCache.has(key)) {
            return this.frameCache.get(key);
        }

        const fuzzy = key.indexOf('.') === -1;
        let atlasKey = '' ;
        if (!fuzzy) {
            [atlasKey, key] = key.split('.');
        }

        for (let i = 0; i < this.keyAtlass.length; i += 1) {
            const ka = this.keyAtlass[i];
            if (!fuzzy && ka.key !== atlasKey) {
                continue;
            }
            const frame = ka.atlas.getSpriteFrame(key);
            if (frame) {
                this.frameCache.set(key, frame);
                return frame;
            }
        }
        return null;
    }

}
