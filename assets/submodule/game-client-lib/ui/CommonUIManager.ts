import { _decorator, CCBoolean, Component, instantiate, Layout, Node, Size, Widget } from 'cc';
import { gameAlert } from '../component/Alert';
import { I18nLabel } from '../component/I18nLabel';
import ColBase from '../data/ColBase';
import { getNodesByKey, KeyNode } from '../data/KeyNode';
import { KeyStr } from '../data/KeyStr';
import { translateError } from '../I18nGlobal';
import { DownloadAlertError } from '../IframeGlobal';
import { ALERT_LEVEL, ccIsMobile, setUiIsMobile, uiIsMobile } from '../LibGlobal';
import { BTN_EXIT, BTN_RECORD } from '../ParamsGlobal';
import { setHorizontalOnly, setVerticalOnly, UI_LAYOUT } from '../ResizeGlobal';
import { scheduleOnce2 } from '../script/PromiseManager';
import ResourcesLoader from '../script/ResourcesLoader';
import ResourcesSprite from '../script/ResourcesSprite';
import { copyLabelProperty, flattenDeep, identity, nodeActive, setNodeContentSize } from '../utils/Utils';
import { AutoRoundHandler, LevelHandler, QuickspinClickHandler } from './CommonUI';
import CommonUIData from './CommonUIData';
import CommonUIReplace from './CommonUIReplace';
import CommonUISlot from './CommonUISlot';
import CommonUIStyle from './CommonUIStyle';
import CommonUIStyleCopy from './CommonUIStyleCopy';

const { ccclass, property } = _decorator;
@ccclass
export default class CommonUIManager extends Component {

    protected layout: UI_LAYOUT = UI_LAYOUT.UNKNOWN;

    @property(CCBoolean)
    mobileLayoutOnly: boolean = false;

    @property(CCBoolean)
    mobileVerticalLayoutOnly: boolean = false;

    @property(CCBoolean)
    mobileHorizontalLayoutOnly: boolean = false;

    @property([KeyStr])
    keyStr: KeyStr[] = [];

    @property([Node])
    commonUINodes: Node[] = [];

    @property(Node)
    spinAnimationNode: Node = null;

    @property([KeyNode])
    labelKeyNodes: KeyNode[] = [];

    @property(Node)
    labelStyleNode: Node = null;

    @property(Node)
    replacerNode: Node = null;

    public spinHandler: Function = null;

    public stopHandler: Function = null;

    public stopAutoHandler: Function = null;

    public lobbyHandler: Function = null;

    public recordHandler: Function = null;

    public infoHandler: Function = null;

    public levelHandler: LevelHandler = null;

    public autoHandler: AutoRoundHandler = null;

    public startPageHandler: Function = null;

    public textChangeHandler: Function = null;

    public autoOptionClickHandler: Function = null;

    public featurebuyClickHandler: Function = null;
    public quickspinClickHandler: QuickspinClickHandler = null;

    public commonUI: CommonUISlot = null;

    public data: CommonUIData = new CommonUIData();

    private loaded: boolean = false;

    onLoad(): void {
        this.pre();
    }

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        if (this.mobileLayoutOnly) {
            setUiIsMobile(true);
        }
        if (this.mobileVerticalLayoutOnly) {
            setUiIsMobile(true);
            setVerticalOnly();
        }
        if (this.mobileHorizontalLayoutOnly) {
            setUiIsMobile(true);
            setHorizontalOnly();
        }
        const cuiNodes = this.commonUINodes;
        const eachDestroy = (nodes: Node[], idx: number) => {
            const node = nodes[idx];
            if (node) {
                node.destroy();
            }
            delete nodes[idx];
        };
        if (uiIsMobile) {
            eachDestroy(cuiNodes, 0);
        } else {
            eachDestroy(cuiNodes, 1);
            eachDestroy(cuiNodes, 2);
        }
        cuiNodes.forEach((node, layout) => {
            if (!node) {
                return;
            }
            const layoutStr = layout === 0 ? 'pch' : (layout === 1 ? 'mh' : 'mv');
            node.getComponentsInChildren(I18nLabel).forEach((label) => {
                label.layout = layoutStr;
            });
        });
        this.replaceNode();
        cuiNodes.forEach((node) => {
            if (!node) {
                return;
            }
            const cui = node.getComponent(CommonUISlot);

            // cui.canvasWidget.forEach(nodeProperty('target', this.canvasNode));
            cui.lobbyHandler = this.lobbyHandler;
            cui.recordHandler = this.recordHandler;
            cui.infoHandler = this.infoHandler;
            cui.spinHandler = this.spinHandler;
            cui.stopHandler = this.stopHandler;
            cui.levelHandler = this.levelHandler;
            cui.autoHandler = this.autoHandler;
            cui.stopAutoHandler = this.stopAutoHandler;
            // cui.startPageHandler = this.startPageHandler;
            cui.textChangeHandler = this.textChangeHandler;
            cui.autoOptionClickHandler = this.autoOptionClickHandler;
            cui.quickspinClickHandler = this.quickspinClickHandler;
            cui.featurebuyClickHandler = this.featurebuyClickHandler;
            cui.bonusEventUI.getBalance = this.getRawBalance.bind(this);
        });

        if (this.labelStyleNode && this.labelStyleNode.children.length) {
            const kns = this.labelStyleNode.children.map((node) => {
                return {
                    node,
                    key: node.name,
                };
            });
            this.labelKeyNodes.push.apply(this.labelKeyNodes, kns);
        }
        const culs = this.getComponentsInChildren(CommonUIStyle);
        // const arr = [];
        culs.forEach(this.styleNode, this);

        const gidks = this.keyStr.find(ks => ks.key === 'gid');
        if (gidks.key) {
            const replace = (str: string) => {
                return str.replace('{gid}', gidks.str);
            };
            this.getComponentsInChildren(ResourcesSprite).forEach((rls) => {
                rls.keys = rls.keys.map(replace);
            });
        }

    }

    private replaceNode() {
        if (!this.replacerNode) {
            return;
        }
        const replace = (targetNodes: Node[], rn: Node, r: CommonUIReplace, cui: CommonUISlot) => {
            if (targetNodes.length === 0) {
                return;
            }
            targetNodes.forEach((node) => {
                // if (clone) {
                //     const idx = node.getSiblingIndex();
                //     targetNode = instantiate(node);
                //     const parent = node.parent;
                //     parent.addChild(targetNode);
                //     targetNode.setSiblingIndex(idx);
                // }
                if (r.unregisterCol) {
                    const col = node.getComponent('ColBase') as ColBase<any>;
                    if (col) {
                        cui.unregister(col);
                        col.destroy();
                        // node.removeComponent(col);
                    }
                }
                if (r.parentLayers) {
                    let i = r.parentLayers;
                    do  {
                        node = node.parent;
                    } while (i -= 1);
                }
                if (r.removeAllChildren) {
                    node.removeAllChildren();
                }
                if (r.removeNode) {
                    node.parent.removeChild(node);
                    // node.destroy();
                } else {
                    rn.children.forEach((cloneNode) => {
                        if (r.setParent) {
                            cloneNode.setParent(node);
                        } else {
                            node.addChild(instantiate(cloneNode));
                        }
                    });
                }
            });
        };
        const layoutCond = (type: number, r: CommonUIReplace) => {
            if (type === UI_LAYOUT.PC_HORIZONTAL && r.pcHorizontal) {
                return true;
            }
            if (type === UI_LAYOUT.MOBILE_HORIZONTAL && r.mobileHorizontal) {
                return true;
            }
            if (type === UI_LAYOUT.MOBILE_VERTICAL && r.mobileVertical) {
                return true;
            }
            return false;
        };
        this.commonUINodes.forEach((node, type) => {
            if (!node) {
                return;
            }
            const cui = node.getComponent(CommonUISlot);
            this.replacerNode.children.forEach((rn) => {
                const r = rn.getComponent(CommonUIReplace);
                if (!r || !layoutCond(type, r)) {
                    return;
                }
                if (r.path) {
                    replace([cui.getNodeByPath(r.path)], rn, r, cui);
                }
                if (r.colKey) {
                    replace(cui.getNodesByColKey(r.colKey), rn, r, cui);
                }
                if (r.i18nKey) {
                    replace(cui.getNodesByI18nKey(r.i18nKey), rn, r, cui);
                }
                if (r.resSpriteKey) {
                    replace(cui.getNodesByResSpriteKey(r.resSpriteKey), rn, r, cui);
                }
                if (r.styleKey) {
                    replace(cui.getNodesByUIStyleKey(r.styleKey), rn, r, cui);
                }
            });
        });
    }

    private styleNode(cul: CommonUIStyle) {
        const ks = flattenDeep([cul.keys]).filter(identity);
        const tn = cul.node;
        ks.forEach((k) => {
            const sns = getNodesByKey(this.labelKeyNodes, k);
            sns.forEach((sn) => {
                if (!sn) {
                    // if (DEBUG) {
                    //         log('No', arr.filter(onlyUnique).sort(), 'in', this.labelKeyNodes.map(kn => kn.key));
                    //     }
                    return;
                }
                const copy = sn.getComponent(CommonUIStyleCopy);
                if (copy) {
                    copy.copyTo(tn);
                } else {
                    copyLabelProperty(sn, tn);
                }
            });
        });
    }

    public getLayoutUI(layout: UI_LAYOUT) {
        return this.commonUINodes[layout].getComponent(CommonUISlot);
    }

    public toggleLayout(layout: UI_LAYOUT, size: Size): CommonUISlot {
        // log('CommonUIManager#toggleLayout', layout, size);
        if (this.layout !== layout) {
            this.commonUINodes.forEach(nodeActive(false));
            const l = this.commonUINodes[layout];
            if (l) {
                l.active = true;
            }
        }
        this.layout = layout;
        const node = this.commonUINodes[layout];
        if (!node) {
            return;
        }

        setNodeContentSize(node, size.x, size.y);
        // 更新 widgets
        scheduleOnce2(
            () => {
                node.getComponentsInChildren(Widget).forEach(w => w.updateAlignment());
                scheduleOnce2(
                    () => {
                        node.getComponentsInChildren(Layout).forEach(l => l.updateLayout());
                    },
                );
            },
        );
        const cui = node.getComponent(CommonUISlot);
        // 设资料
        this.data.bindItem(cui);
        if (!BTN_EXIT) {
            this.data.set('displayBack', false);
        }
        if (!BTN_RECORD) {
            this.data.set('displayRecord', false);
        }
        this.data.set('displaySpaceSpin', !ccIsMobile, false);
        cui.reset(this.data, true);
        this.commonUI = cui;

        // 强制结束动画，播放最後格
        // cui.getComponentsInChildren(ColAnimation).forEach((ca) => {
        //     if (ca.state && ca.state.isPlaying) {
        //         const dur = ca.state.clip.duration;
        //         ca.animation.setCurrentTime(dur);
        //     }
        // });
        // if (cui.slotFeatureBuy) {
        //     cui.slotFeatureBuy.reset();
        //     cui.slotFeatureBuy.bindBuyClickFunc(cui.onFeatureBuyClick.bind(cui));
        //     cui.slotFeatureBuy.pageView.content.getComponentsInChildren(CommonUIStyle).forEach(this.styleNode, this);
        // }
        return cui;
    }

    public closePanel() {
        if (this.commonUI) {
            this.commonUI.closePanel();
        }
    }

    public loadResourceFail(code: DownloadAlertError) {
        this.closePanel();
        gameAlert(translateError('GAME.download_error', code), '', ALERT_LEVEL.DEFAULT, () => { });
    }

    public getLayoutFeatureBuys() {
        return this.commonUINodes.map((node) => {
            if (node) {
                // return node.getComponent(CommonUISlot).slotFeatureBuy;
            }
        });
    }

    public async updateCustomSpriteFrame(resourcesLoader: ResourcesLoader, spriteFrameNames: string[]) {
        const keyAtlass = resourcesLoader.keyAtlass;
        const rsArr = this.getComponentsInChildren(ResourcesSprite);
        const rss = rsArr.filter(rs => rs.keys.find(ks => spriteFrameNames.find(s => ks.str === s)));

        spriteFrameNames.forEach((sfName) => {
            const altas = keyAtlass.find(ka => ka.atlas.getSpriteFrames().find(sf => sf.name === sfName));
            if (altas) {
                rss.forEach((rs) => {
                    if (rs.keys.find(ks => ks.str === sfName)) {
                        const keyStr = { key: altas.key, str: sfName };
                        rs.keys = [keyStr]; rs.reset(resourcesLoader);
                    }
                });
            }
        });
    }

    public updateFeatureBuyLevels(datas: FeatureBuyData[], displayCurrencySymbol: boolean) {
        this.commonUINodes.forEach((node) => {
            if (node) {
                const commonUI = node.getComponent(CommonUISlot);
                // if (commonUI.slotFeatureBuy) {
                //     commonUI.slotFeatureBuy.updateDatas(datas, displayCurrencySymbol);
                //     commonUI.slotFeatureBuy.bindBuyClickFunc(commonUI.onFeatureBuyClick.bind(commonUI));
                //     commonUI.slotFeatureBuy.pageView.content.getComponentsInChildren(CommonUIStyle).forEach(this.styleNode, this);
                // }
            }
        });
    }

    public getRawBalance() {
        return Number(this.data.rawBalance);
    }
}
