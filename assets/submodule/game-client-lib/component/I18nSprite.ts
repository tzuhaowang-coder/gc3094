import { _decorator, CCBoolean, CCString, Component, instantiate, Node, sp, Sprite } from 'cc';
import { findFrame, str2KeyStr } from '../data/KeyStr';
import { translate } from '../I18nGlobal';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import { getResLoader } from '../script/ResLoader';
import { getResourcesLoader } from '../script/ResourcesLoader';
import { setNodeScale, toObjectReducer, warn } from '../utils/Utils';

const { ccclass, property, menu } = _decorator;

const delimiter0 = '&';
const delimiter1 = ';';
const delimiter2 = ',';
const delimiter3 = '=';
const delimiter4 = '.';

@ccclass
@menu('I18n/I18nSprite')
export class I18nSprite extends Component {

    @property({
        tooltip: '',
    })
    dataID: string = '';

    @property(Node)
    parentNode: Node = null;

    @property(CCBoolean)
    delay: boolean = false;

    @property(CCString)
    layout: string = '';

    onLoad() {
        if (this.delay) {
            return;
        }
        this.load();
    }

    load() {

        // 'INFO.p1.m1';
        // const str = '3001_buttons_panels_popup.pic_info02;scale=.6';
        // const str = 'spine_symbol.pic_s01;scale=.6';
        const str = translate(this.dataID);

        // 相同，代表沒有設定
        if (str === this.dataID) {
            // 關掉
            this.node.active = false;
            if (this.parentNode) {
                this.parentNode.active = false;
            }
            return;
        }
        const l = getResourcesLoader();
        const la = getResLoader();
        const sprite = this.getComponent(Sprite);
        const skeleton = this.getComponent(sp.Skeleton);

        const clear = (node: Node) => {
            node.setPosition(0, 0);
            setNodeScale(node, 1);
        };

        str.split(delimiter0).forEach((s, i) => {
            const arr = s.split(delimiter1);
            const key = arr[0];
            const ks = str2KeyStr(key);

            let node: Node;
            if (sprite) {
                const kas = l.keyAtlass.concat(la.keyAtlass);

                let arr = [ks];
                if (!ks.str) {
                    arr = kas.map(ka => ({ key: ka.key, str: ks.key }));
                }

                const f = findFrame(arr, kas);
                let sp0: Sprite;
                if (i === 0) {
                    node = sprite.node;
                    sp0 = sprite;
                } else {
                    node = instantiate(sprite.node);
                    clear(node);
                    sp0 = node.getComponent(Sprite);
                    this.node.addChild(node);
                }
                sp0.spriteFrame = f.frame;
            } else if (skeleton) {
                const sds = la.skeletonDatas.concat(l.skeletonDatas);
                const ksd = sds.reduce(toObjectReducer('name'), {});

                if (!ks.str) {
                    ks.str = ks.key;
                    ks.key = 'spine_symbol';
                }

                if (!ksd[ks.key]) {
                    warn('Can\'t find', ks.key, 'in LoadAtlas#skeletonDatas', ksd);
                }

                let ske: sp.Skeleton;
                if (i === 0) {
                    node = skeleton.node;
                    ske = skeleton;
                } else {
                    node = instantiate(skeleton.node);
                    clear(node);
                    ske = node.getComponent(sp.Skeleton);
                    this.node.addChild(node);
                }
                ske.skeletonData = ksd[ks.key];
                spSkeletonSetAnimation(ske, ks.str);
            }

            if (arr[1]) {
                arr[1].split(delimiter2).map((p) => {
                    // "NodeShrink.maxScale=.3"
                    // "scale=.3"
                    const [k, v] = p.split(delimiter3);
                    if (k === 'loop') {
                        if (skeleton) {
                            spSkeletonSetAnimation(skeleton, skeleton.animation, true);
                        }
                    } else if (k.indexOf(delimiter4) !== -1) {
                        const [c, p] = k.split(delimiter4);
                        node.getComponent(c)[p] = Number(v);
                    } else {
                        node[k] = Number(v);
                    }
                });
            }
        });

    }
}
