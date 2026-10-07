import { _decorator, Component, find, instantiate, Node } from 'cc';
import { I18nLabel } from '../component/I18nLabel';
import { I18nSprite } from '../component/I18nSprite';
import ColBase from '../data/ColBase';
import ResSprite from '../script/ResSprite';
import { warn } from '../utils/Utils';
import CommonUIReplace from './CommonUIReplace';
import CommonUIStyle from './CommonUIStyle';

const { ccclass, property } = _decorator;
@ccclass
export default class CommonUIReplacer extends Component {

    @property([Node])
    nodes: Node[] = [];

    @property(Node)
    replacerNode: Node = null;

    private loaded: boolean = false;

    onLoad(): void {
        this.pre();
    }

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.replacerNode = this.replacerNode || this.node;
        this.replaceNode();
    }

    private replaceNode() {
        if (!this.replacerNode) {
            return;
        }
        const replace = (targetNodes: Node[], rn: Node, r: CommonUIReplace) => {
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
                    warn('Not implemented');
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
        this.nodes.forEach((node) => {
            if (!node) {
                return;
            }
            this.replacerNode.children.forEach((rn) => {
                const r = rn.getComponent(CommonUIReplace);
                if (!r) {
                    return;
                }
                if (r.path) {
                    replace([getNodeByPath(node, r.path)], rn, r);
                }
                if (r.colKey) {
                    replace(getNodesByColKey(node, r.colKey), rn, r);
                }
                if (r.i18nKey) {
                    replace(getNodesByI18nKey(node, r.i18nKey), rn, r);
                }
                if (r.resSpriteKey) {
                    replace(getNodesByResSpriteKey(node, r.resSpriteKey), rn, r);
                }
                if (r.styleKey) {
                    replace(getNodesByUIStyleKey(node, r.styleKey), rn, r);
                }
            });
        });
    }

}

function getNodesByColKey(node: Node, key: string) {
    return (node.getComponentsInChildren('ColBase') as ColBase<any>[]).filter((col) => {
        return col.colKey === key;
    }).map(c => c.node);
}

function getNodesByResSpriteKey(node: Node, key: string) {
    return node.getComponentsInChildren(ResSprite).filter((col) => {
        return col.keys.some(k => k === key);
    }).map(las => las.node);
}

function getNodeByPath(node: Node, path: string) {
    return find(path, node);
}

function getNodesByUIStyleKey(node: Node, key: string) {
    return node.getComponentsInChildren(CommonUIStyle).filter((col) => {
        return col.keys.some(k => k === key);
    }).map(s => s.node);
}

function getNodesByI18nKey(node: Node, key: string) {
    return [
        ...node.getComponentsInChildren(I18nLabel),
        ...node.getComponentsInChildren(I18nSprite),
    ].filter((l) => {
        return l.dataID === key;
    }).map(s => s.node);
}
