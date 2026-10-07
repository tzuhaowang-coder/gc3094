import { _decorator, CCString, Component, Sprite, SpriteAtlas } from 'cc';
import { EXTRA_1080 } from '../ParamsGlobal';
import { warn } from '../utils/Utils';
import { getLang } from './I18nManager';
const { ccclass, property } = _decorator;

@ccclass('SpriteConfig')
export class SpriteConfig extends Component {

    @property([SpriteAtlas])
    atlass:SpriteAtlas[] = [];

    @property(Sprite)
    sprite:Sprite = null;

    @property(CCString)
    frameName: string = '';

    @property([CCString])
    langs: string[] = [];

    private loaded: boolean = false;
    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.sprite = this.sprite || this.getComponent(Sprite);

        const sprite = this.sprite;
        const atlass = sprite.spriteAtlas ? this.atlass.concat(sprite.spriteAtlas) : this.atlass;
        const langs = this.langs;

        let frameName = this.frameName || (sprite.spriteFrame ? sprite.spriteFrame.name : '');
        if (!frameName) {
            warn(`[SpriteConfig] missing frameName.`);
            return;
        }

        if (langs.length) {
            const langSuffix = langs.find(s => frameName.includes(s)); // frameName 有 lang 後綴
            if (langSuffix) {
                frameName = frameName.replace(`_${langSuffix}`, '');
            }
            const curLang = getLang();
            let lang = langs.indexOf(curLang) !== -1 ? curLang : langs[0];
            if (lang === 'zh_cn' && EXTRA_1080 && langs.indexOf('zh_cn') !== -1 && langs.indexOf('zh_hk') !== -1) {
                lang = 'zh_hk';
            }
            frameName = `${frameName}_${lang}`;
        }

        for (const atlas of atlass) {
            const frame = atlas.getSpriteFrame(frameName);
            if (frame) {
                sprite.spriteFrame = frame;
                return ;
            }
        }
        warn(`[SpriteConfig] atlass "${frameName}" not found.`);
    }

    onLoad() {
        this.pre();
    }

}
