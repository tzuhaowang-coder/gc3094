import { _decorator, CCBoolean, CCString, Component, find, Label, Node, RichText, Scene } from 'cc';
import { DEBUG } from 'cc/env';
// tslint:disable-next-line:import-name
import Polyglot from 'polyglot/dist/polyglot.cjs.js';
import MainBase from '../../slot-client-lib/script/MainBase';
import { clearPolyglot, extendPolyglot, getLayoutMagic, translate, TranslateArg, translateArg } from '../I18nGlobal';
import { LANG } from '../ParamsGlobal';
import { getResourcesLoader } from '../script/ResourcesLoader';
import { ccFindCreator, getNodeHeight, getNodeWidth, log, nodePath, range2, setNodeHeight, setNodeWidth, warn } from '../utils/Utils';
import ArtLabel from './ArtLabel';
import LayoutShrinkLabel from './LayoutShrinkLabel';

const { ccclass, property, menu } = _decorator;

const LENGTH = 5;
const driveLangCache = {};

export function translateLayoutCreator<T>(t: (k: string, ...args: T[]) => string) {
    return (dataID: string, layout: string, ...args: T[]): string => {
        let str: string;
        // pch -> h
        // mh -> h
        // mv -> v
        layout = getLayoutMagic(layout)[0] || '';
        if (layout) {
            str = t(dataID + '$' + layout, ...args);
            if (str !== dataID + '$' + layout) {
                return str;
            }
        }
        str = t(dataID, ...args);
        if (str !== dataID) {
            return str;
        }
        return dataID;
    };
}

const translateLayout = translateLayoutCreator(translate);

@ccclass
@menu('I18n/I18nLabel')
export class I18nLabel extends Component {

    @property(CCString)
    dataID: string = '';

    @property({
        type: Label,
        tooltip: '計算 5 -\n4 -\n',
    })
    refLabel: Label = null;

    @property(Node)
    parentNode: Node = null;

    @property(CCBoolean)
    straight: boolean = false;

    @property(CCBoolean)
    oddLine: boolean = false;

    @property(CCString)
    layout: string = '';

    onLoad() {
        this.load();
    }

    async load() {
        if (DEBUG && !this.dataID) {
            warn('I18nLabel dataID is empty', nodePath(this.node));
        }
        const str = translateLayout(this.dataID, this.layout, ...this.args);

        if (str === this.dataID || str === '') {
            if (this.parentNode) {
                this.parentNode.destroy();
                const cs = this.parentNode.getComponents(Component);
                cs.forEach(c => c.destroy());
            }
            // 關掉
            this.node.active = false;
            // const cs = this.getComponents(Component);
            // cs.forEach(c => c.destroy());
            // this.node.destroy();
            if (DEBUG) {
                log('No', str, 'in lang');
            }
            return;
        }
        this.refresh();
        if (DEBUG) {
            const test = LANG === 'test';
            const drive = LANG.startsWith('drive_');
            const driveTest = drive ? LANG === 'drive_test' : '';
            const driveLang = /\w\w_\w\w/.test(LANG.replace('drive_', '')) ? LANG.replace('drive_', '') : '';
            const label = this.getComponent(Label);
            const rtext = this.getComponent(RichText);
            const artLabel = this.getComponent(ArtLabel);
            const r = getResourcesLoader();
            const loadJson = async (url: string) => {
                // @ts-ignore
                const res: JsonAsset[] = await r.loadUrls([url]);
                return res[0] ? res[0].json : {};
            };
            const gid = (find('Game').getComponent('MainBase') as MainBase).getGameId();
            const fetchJson = async (sub: string) => {
                // return loadJson(`drive/lang/${sub}/lang`);
                if (driveLangCache[sub]) {
                    return driveLangCache[sub];
                }
                const p = fetch(`${location.origin}/h5/game/lang/${sub}/lang.json`, { cache: 'no-store' }).then(o => o.json());
                driveLangCache[sub] = p;
                return p;
            };
            if (test || drive) {
                const d = await loadJson('data');
                let langs: string[] = d.langs;
                if (drive) {
                    if (driveTest) {
                        const o = await fetchJson(gid);
                        langs = Object.keys(o);
                        log('drive langs', langs);
                    } else if (driveLang) {
                        langs = [driveLang];
                        log('drive lang', driveLang);
                    }
                }
                const polyglots = await Promise.all(langs.map(async (l) => {
                    const ds = await Promise.all(d.dirs.map(async (d: string, i: number) => {
                        if (d.indexOf('{lang}') === -1) {
                            return;
                        }
                        if (drive) {
                            const sub: string = {
                                'bundle/game/lang/{lang}': 'game-client-lib',
                                'bundle/arcade/lang/{lang}': 'arcade-client-lib',
                                'bundle/fish/lang/{lang}': 'fish-client-lib',
                                'bundle/slot/lang/{lang}': 'slot-client-lib',
                                'lang/{lang}': gid,
                            }[d];
                            if (!sub) {
                                return {};
                            }
                            const o = await fetchJson(sub);
                            return o[l];
                        }
                        return loadJson(d.replace('{lang}', l) + '/lang');
                    }));
                    if (driveLang) {
                        clearPolyglot();
                        const m = ccFindCreator('Game', 'I18nManager')();
                        // @ts-ignore
                        m.langJsonAssets.forEach((lja) => {
                            extendPolyglot(lja.json);
                        });
                        const meta = await loadJson('meta');
                        extendPolyglot(meta);
                        ds.forEach((d) => {
                            extendPolyglot(d);
                        });
                    }
                    const p = new Polyglot({ phrases: { t: 't' }, allowMissing: true });
                    ds.forEach((d) => {
                        p.extend(d);
                    });
                    return p;
                }));
                let idx = 0;
                this.schedule(
                    () => {
                        const p = polyglots[idx];
                        const t = translateLayoutCreator((key: string, ...args: (string | number)[]): string => {
                            const opt: { [s: string]: string } = {};
                            args.forEach((arg, index) => {
                                opt[index] = '' + arg;
                            });
                            return p.t(key, opt);
                        });
                        let str = t(this.dataID, this.layout, ...this.args.map(a => translateArg(a, t)));
                        if (str === this.dataID) {
                            str = translateLayout(this.dataID, this.layout, ...this.args);
                        }
                        if (this.oddLine) {
                            if (str.split('\n').length % 2 !== 1) {
                                str = str + '\n';
                            }
                        }
                        if (label) {
                            label.string = str;
                        }
                        if (rtext) {
                            rtext.string = str;
                        }
                        if (artLabel) {
                            artLabel.string = str;
                        }
                        let node = this.node;
                        do {
                            const lsl = node.getComponent(LayoutShrinkLabel);
                            if (lsl) {
                                lsl.resize();
                                break;
                            }
                            node = node.parent;
                            if (node instanceof Scene) {
                                break;
                            }
                        } while (node);
                        idx += 1;
                        if (idx >= polyglots.length) {
                            idx = 0;
                        }
                        if (polyglots.length === 1) {
                            this.unscheduleAllCallbacks();
                        }
                    },
                    .5,
                );
            }
        }
    }

    private args: (string | number | TranslateArg)[] = [];

    public refresh(...args: (string | number | TranslateArg)[]) {
        if (args.length) {
            this.args = args;
        }
        let str = translateLayout(this.dataID, this.layout, ...this.args);
        const label = this.getComponent(Label);
        if (label) {
            // 如果是直的
            if (this.straight) {
                // 有中文字
                if (/[\u4e00-\u9fa5]/.test(str)) {
                    // 取代 空白 加 \n
                    str = str.replace(/\s/g, '').split('').join('\n');
                } else {
                    // 寬高互換
                    const n = label.node;
                    const w = getNodeWidth(n);
                    const h = getNodeHeight(n);
                    n.angle = 90;
                    setNodeWidth(n, h);
                    setNodeHeight(n, w);
                }
            }
            if (this.oddLine) {
                if (DEBUG && label.overflow !== Label.Overflow.NONE) {
                    warn('label overflow not NONE, maybe wrong');
                }
                if (str.split('\n').length % 2 !== 1) {
                    str = str + '\n';
                }
            }
            label.string = str;
            if (this.refLabel) {
                const i = this.refLabel.getComponent(I18nLabel);
                if (i) {
                    const str2 = translate(i.dataID, this.layout);
                    // 沒有設定的話才做
                    if (str2 === i.dataID) {
                        const len = str.split('\n').length;
                        const str3 = range2(LENGTH, LENGTH - len + 1).map(l => l + ' -').join('\n');
                        this.refLabel.node.active = true;
                        this.refLabel.string = str3;
                    }
                }
            }
        }

        const rtext = this.getComponent(RichText);
        if (rtext) {
            rtext.string = str;
        }

        const artLabel = this.getComponent(ArtLabel);
        if (artLabel) {
            if (this.oddLine) {
                if (str.split('\n').length % 2 !== 1) {
                    str = str + '\n';
                }
            }
            artLabel.string = str;
        }
    }
}
