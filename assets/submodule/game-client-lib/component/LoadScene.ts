import { _decorator, Asset, AudioClip, CCBoolean, CCString, Component, director, JsonAsset, Label, Node, sp, VERSION } from 'cc';
import { DEBUG } from 'cc/env';
import { KeyAudioClip } from '../data/KeyAudioClip';
import { downloadAlert, DownloadAlertError } from '../IframeGlobal';
import { getResourcesLoader } from '../script/ResourcesLoader';
import { error, fetchPing, nodeActive, warn } from '../utils/Utils';
import { audioAppend, getAudioComponent } from './Audio';
import SpSkeletonHack, { DEFAULT_WORKER, genSkeleton } from './SpSkeletonHack';

const { ccclass, property } = _decorator;

export function handleResourcesLoaded(assets: Asset[])  {
    const l = getResourcesLoader();
    // read spine/cache/data.json
    // {
    //    "worker": 3
    // }
    const jsonAsset = assets.filter(a => a instanceof JsonAsset).find(a => a.name === 'data') as  JsonAsset;
    const worker = jsonAsset ? (jsonAsset.json.worker || DEFAULT_WORKER) : DEFAULT_WORKER;
    // is spine assets
    assets.filter(a => a instanceof sp.SkeletonData).forEach((asset) => {
        const hack = l.node.addComponent(SpSkeletonHack);
        const skeleton = genSkeleton(asset as sp.SkeletonData);
        switch (String(VERSION)){
        case '2.4.5':
        case '2.4.4':
            hack.hack_2_4_4(skeleton.node);
            hack.cache(skeleton.node, l.node, worker);
            break;
        case '2.2.2':
            hack.hack_2_2_2(skeleton.node);
            hack.cache(skeleton.node, l.node, worker);
            break;
        case '2.0.10':
            hack.hack_2_0_10(skeleton.node);
            hack.cache(skeleton.node, l.node, worker);
            break;
        case '2.0.9':
        default:
            hack.cache2(skeleton.node);
            break;
        }
    });
    if (getAudioComponent()) {
        const kacs: KeyAudioClip[] = assets.filter(a => a instanceof AudioClip).map((a: AudioClip) => {
            return {
                key: a.name,
                audioClip: a,
            };
        });
        audioAppend(kacs);
    }
}

let loaderScene: LoadScene = null;
export function loadScene(sceneName: string, onLaunched: () => void) {
    loaderScene.load(sceneName, onLaunched);
}
export function loadWithResources(urls: string[], sceneName: string, onLaunched?: () => void) {
    loaderScene.loadWithResources(urls, sceneName, handleResourcesLoaded, onLaunched);
}

@ccclass
export default class LoadScene extends Component {

    @property([Node])
    nodes: Node[] = [];

    @property(CCString)
    sceneName: string = '';

    @property(Label)
    progressLabel: Label = null;

    @property(CCBoolean)
    loadOnStart: boolean = false;

    @property({
        tooltip: '給 game-client-lib 用',
    })
    loadResources: boolean = false;

    private showLoading: () => void;

    private cocosHandleError (err) {}

    onLoad() {
        loaderScene = this;
        this.showLoading = window['setLoadingDisplay'] || this.setActive.bind(this, true);
        this.setProgress = window['setProgress'] || this.setProgress.bind(this);
        this.cocosHandleError = window['cocosHandleError'] || this.cocosHandleError.bind(this);

        if (DEBUG && !this.sceneName) {
            warn('no sceneName');
        }
    }

    start() {
        if (this.loadOnStart) {
            if (this.loadResources) {
                const l = getResourcesLoader();
                const next = () => {
                    // 多等 1 個 tick，避免載入錯誤
                    this.scheduleOnce(
                        () => {
                            const urls = [
                                'spine/cache',
                            ];
                            this.loadWithResources(urls, this.sceneName, handleResourcesLoaded, (err) => {
                                if (err) {
                                    error(err);
                                    this.cocosHandleError(err);
                                }
                            });
                        },
                        0,
                    );
                };
                const reject = () => {
                    loadFail(DownloadAlertError.RESOURCE);
                };
                l.load().then(next, reject);
            } else {
                this.load(this.sceneName);
            }
        }
    }

    private loadedResourcesKeys: string[] = [];

    /**
     * 載入場景，有 loadResources，需先整理完 urls
     * @param urls 將用 ```urls.join(';')``` 當 key 來判斷是否有載入過
     * @param onResourcesLoad assets 此次載入到的素材，第二次不會有
     */
    public loadWithResources(urls: string[], sceneName: string, onResourcesLoad?: (assets: Asset[]) => void, onLaunched?: (err?: any) => void) {
        const reject = () => {
            loadFail(DownloadAlertError.RESOURCE);
        };
        this.showLoading();
        const key = urls.sort().join(';');
        const l = getResourcesLoader();
        const next = () => {
            this.setActive(false);
            this.load(sceneName, onLaunched);
        };
        if (DEBUG) {
            // tslint:disable-next-line:no-console
            console.time('load resources');
        }
        const lNext = (assets: Asset[]) => {
            this.loadedResourcesKeys.push(key);
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.timeEnd('load resources');
            }
            onResourcesLoad && onResourcesLoad(assets);
            // 多等 1 個 tick，避免載入錯誤
            this.scheduleOnce(
                () => {
                    this.load(sceneName, onLaunched);
                },
                0,
            );
        };
        if (this.loadedResourcesKeys.indexOf(key) === -1) {
            l.loadUrls(urls).then(lNext, reject);
        } else {
            next();
        }
    }

    /**
     * 載入場景
     */
    public load(sceneName: string, onLaunched?: () => void) {
        if (!sceneName) {
            sceneName = this.sceneName;
        }
        const next = (err?: any) => {
            if (err) {
                loadFail(DownloadAlertError.SCENE);
                return;
            }
            this.setActive(false);
            this.setProgress(2, 2, null);
            director.loadScene(sceneName, onLaunched);
        };
        this.showLoading();
        director.preloadScene(sceneName, this.setProgress, next);
    }

    private setActive(able: boolean) {
        this.nodes.map(nodeActive(able));
    }

    private setProgress(completed: number, total: number, item: any) {
        this.progressLabel.string = (completed / total * 100).toFixed(0) + '%';
    }

    onLoadClick() {
        this.load(this.sceneName);
    }
}

function loadFail(downloadFail: DownloadAlertError) {
    const args = `downloadFail=${downloadFail}`;
    fetchPing(args);
    downloadAlert(downloadFail);
}
