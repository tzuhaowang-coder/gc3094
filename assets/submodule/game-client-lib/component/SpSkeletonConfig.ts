import { _decorator, CCBoolean, CCInteger, CCString, Component, sp } from 'cc';
import { EXTRA_1080 } from '../ParamsGlobal';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import { getLang } from './I18nManager';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
export default class SpSkeletonConfig extends Component {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(CCString)
    animation: string = '';

    @property(CCBoolean)
    loop: boolean = false;

    @property(CCInteger)
    loopTime: number = 0;

    @property(CCBoolean)
    enactive: boolean = false;

    @property(CCBoolean)
    justSetAnimation: boolean = false;

    @property([CCString])
    enableAnimations: string[] = [];

    @property([CCString])
    skins: string[] = [];

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.skeleton = this.skeleton || this.getComponent(sp.Skeleton);
        const ske = this.skeleton;
        ske.animation = this.animation || ske.animation;
        ske.loop = this.loop;

        const langs = this.skins;
        if (langs.length) {
            let lang = getLang();
            if (lang === 'zh_cn' && EXTRA_1080 && langs.indexOf('zh_cn') !== -1 && langs.indexOf('zh_hk') !== -1) {
                lang = 'zh_hk';
            }
            const langSkin = langs.indexOf(lang) !== -1 ? lang : langs[0];
            this.skeleton.setSkin(langSkin);
        }
    }

    onLoad() {
        this.pre();
    }

    onEnable() {
        if (this.enableAnimations.length) {
            spSkeletonSetAnimation(this.skeleton, this.enableAnimations, this.loop);
        }
    }
}
