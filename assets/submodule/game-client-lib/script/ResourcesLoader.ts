import { _decorator, Asset, AudioClip, BitmapFont, Component, JsonAsset, resources, sp, SpriteAtlas, SpriteFrame } from 'cc';
import { DEBUG } from 'cc/env';
import { LANG, OPER } from '../ParamsGlobal';
import { getStartPage } from '../StorageGlobal';
import { DEFAULT_LANG, setLang } from '../component/I18nManager';
import { KeyAtlas } from '../data/KeyAtlas';
import { KeyAudioClip } from '../data/KeyAudioClip';
import { KeyBitmapFont } from '../data/KeyBitmapFont';
import { KeyFrame } from '../data/KeyFrame';
import { KeyJsonAsset } from '../data/KeyJsonAsset';
import { flattenDeep, identity, isVIVO, log } from '../utils/Utils';

const { ccclass, property, menu } = _decorator;

export const DEFAULT_OPER = '99dd7845';
export const DEFAULT_AUDIO_TYPE = 'mp3';
export enum RESOURCES_URL {
    START_PAGE = 'start_page',
    START_PAGE_LANG = 'start_page_lang/{lang}',
    INFO_PAGE = 'info_page',
    INFO_PAGE_LANG = 'info_page_lang/{lang}',
}

export function langNeedEnUsUrl(lang: string, str: string, subUrl: string = '') {
    const plist = str.replace('{lang}', lang) + subUrl;
    const enPlist = str.replace('{lang}', 'en_us') + subUrl;
    const has = resources.getDirWithPath(plist).length;
    const enHas = resources.getDirWithPath(enPlist).length;
    if (!has && enHas) {
        return enPlist;
    }
    return '';
}

let loader: ResourcesLoader = null;

export function getResourcesLoader() {
    return loader;
}

export function setResourcesLoader(l: ResourcesLoader) {
    loader = l;
}

export function loadResAudioClipPromise(url: string): Promise<AudioClip> {
    return new Promise((resolve) => {
        // @ts-ignore
        resources.load(url, AudioClip, (err, clip: AudioClip) => {
            if (err) {
                resolve(null);
            }
            resolve(clip);
        });
    });
}

@ccclass
@menu('ResourcesLoad/ResourcesLoader')
export default class ResourcesLoader extends Component {

    public keyJsonAssets: KeyJsonAsset[] = [];

    public keyAtlass: KeyAtlas[] = [];

    public keyBitmapFonts: KeyBitmapFont[] = [];

    public keyAudioClips: KeyAudioClip[] = [];

    public keyFrames: KeyFrame[] = [];

    public skeletonDatas: sp.SkeletonData[] = [];

    private cache: { [s: string]: Promise<Asset[]> } = {};
    public lang: string = '';
    public oper: string = '';
    public audioType: string = '';
    public varLoaded: boolean = false;

    onLoad() {
        setResourcesLoader(this);
    }

    /**
     * 載入 resources/data.json 設定的 url，變數 lang, oper 的來源為 href
     */
    public async load() {
        const data: { dirs: string[], langs: string[], opers: string[] } = await new Promise((res, rej) => {
            resources.load('data', JsonAsset, (err, jsonAsset: JsonAsset) => {
                if (err) {
                    log('load data.json error', err);
                    rej(err);
                    return;
                }
                // @ts-ignore
                res(jsonAsset.json);
            });
        });

        let lang = LANG.replace('drive_', '') || DEFAULT_LANG;
        let oper = OPER || DEFAULT_OPER;
        if (data.langs.indexOf(lang) === -1) {
            lang = DEFAULT_LANG;
        }
        if (data.opers.indexOf(oper) === -1) {
            oper = DEFAULT_OPER;
        }
        const audioType = isVIVO() ? 'ogg' : 'mp3';

        setLang(lang);
        this.lang = lang;
        this.oper = oper;
        this.audioType = audioType;

        const urls: string[] = data.dirs;
        urls.unshift('meta');

        if (getStartPage()) {
            urls.push(RESOURCES_URL.START_PAGE);
            urls.push(RESOURCES_URL.START_PAGE_LANG);
        }
        this.varLoaded = true;
        return this.loadUrls(urls);
    }

    public async loadUrls(urls: string[]): Promise<Asset[]> {
        const key = urls.slice(0).sort().join(';');
        if (this.cache[key]) {
            return this.cache[key];
        }
        const appends = flattenDeep(urls.map((str) => {
            if (str.indexOf('{lang}') !== -1 && this.lang !== 'en_us') {
                return [langNeedEnUsUrl(this.lang, str, ''), langNeedEnUsUrl(this.lang, str, '/plist')];
            }
        })).filter(identity);

        urls = urls.map(str => str.replace('{lang}', this.lang).replace('{oper}', this.oper).replace('{audio}', this.audioType));

        if (appends.length) {
            log('loadUrls appends', appends);
            urls.push(...appends);
        }
        // 載資源
        const reject = () => {
            if (this.cache[key] === p) {
                this.cache[key] = null;
            }
        };
        const p = Promise.all(urls.map((url) => {
            return new Promise((res: (o: Asset[]) => void, rej) => {
                resources.loadDir(url, (err: any, assets: Asset[]) => {
                    if (err) {
                        reject();
                        rej(err);
                    } else {
                        res(assets);
                    }
                });
            });
        })).then(a => flattenDeep(a));
        this.cache[key] = p;
        const assets: Asset[] = await p;
        if (DEBUG) {
            log('lang assets', urls, assets);
        }
        this.loaded(assets);
        return assets;
    }

    public async loadRes<T extends typeof Asset>(urls: string[], type: T) {
        const key = urls.sort().join(';');
        if (this.cache[key]) {
            return this.cache[key];
        }
        const p = Promise.all(urls.map((url) => {
            return new Promise((res: (o: Asset) => void, rej) => {
                resources.load(url, type, (err: any, asset: Asset) => {
                    if (err) {
                        rej(err);
                        return;
                    }
                    res(asset);
                });
            });
        }));
        this.cache[key] = p;
        const assets: Asset[] = await p;
        if (DEBUG) {
            log('lang assets', urls, assets);
        }
        this.loaded(assets);
        return assets;
    }

    public loaded(assets: Asset[]) {

        assets.forEach((asset) => {
            // 去除附檔名
            const key = asset.name.split('.')[0];
            if (asset instanceof BitmapFont) {
                this.keyBitmapFonts.push({
                    key,
                    bitmapFont: asset,
                });
            } else if (asset instanceof SpriteAtlas) {
                this.keyAtlass.push({
                    key,
                    atlas: asset,
                });
            } else if (asset instanceof JsonAsset) {
                this.keyJsonAssets.push({
                    key,
                    xpath: '',
                    jsonAsset: asset,
                });
            } else if (asset instanceof AudioClip) {
                this.keyAudioClips.push({
                    key,
                    audioClip: asset,
                });
            } else if (asset instanceof SpriteFrame) {
                this.keyFrames.push({
                    key,
                    frame: asset,
                });
            } else if (asset instanceof sp.SkeletonData) {
                this.skeletonDatas.push(asset);
            }
        });
    }
}
