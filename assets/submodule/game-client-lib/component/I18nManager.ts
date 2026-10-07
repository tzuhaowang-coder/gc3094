import { _decorator, Component, JsonAsset } from 'cc';
import { extendPolyglot, setDocumentTitle, translate } from '../I18nGlobal';
import { changeTitle } from '../IframeGlobal';
import { getResourcesLoader } from '../script/ResourcesLoader';

const { ccclass, property, menu } = _decorator;

export const DEFAULT_LANG = 'en_us';

let l = DEFAULT_LANG;

export function getLang(): string {
    return l;
}

export function setLang(lang: string) {
    l = lang;
}
// 功能: 载入多个 textAssets 合并后 init polyglot
@ccclass
@menu('I18n/I18nManager')
export default class I18nManager extends Component {

    @property([JsonAsset])
    langJsonAssets: JsonAsset[] = [];

    onLoad() {
        const l = getResourcesLoader();
        this.load(this.langJsonAssets.concat(l.keyJsonAssets.map(kja => kja.jsonAsset)));
    }

    public load(jsonAssets?: JsonAsset[]) {
        if (!jsonAssets.length) {
            return;
        }
        jsonAssets.map(jsonAsset => jsonAsset.json).forEach(extendPolyglot);

        const webTitle = translate('WEB.title');
        setDocumentTitle(webTitle);
        changeTitle(webTitle);
    }
}
