import { Label, LabelOutline, Layout, Node, RichText, v2 } from 'cc';
import ArtLabel from './component/ArtLabel';
import { I18nLabel } from './component/I18nLabel';
import { getLang } from './component/I18nManager';
import NodeShrink from './component/NodeShrink';

import { getRefLayoutShrinkLabel } from './component/LayoutShrinkLabel';
import MarkNotRichText from './data/MarkNotRichText';
import CommonUIStyle from './ui/CommonUIStyle';
import { getNodeColor, getNodeContentSize, getNodeHeight, getNodeWidth, setNodeColor, setNodeContentSize, setNodeOpacity } from './utils/Utils';

const wm = new WeakMap<Label, RichText>();
export function getRichText(label: Label) {
    return wm.get(label);
}

const fontFamily = {
    ['vi_vn']:'Arial',
    ['xvi_vn']:'Arial',
    // ['ar_ae']:'Segoe UI',
};

export function applyLabel(node:Node) {
    applyFontFamily(node);
}

function applyFontFamily(node: Node) {
    const lang = getLang();
    const ff = fontFamily[lang];
    if (!ff) {
        return;
    }
    eachLabel(node, l => l.fontFamily = ff);
}

function eachLabel(node: Node, each: (label: Label | RichText | ArtLabel) => void) {
    const eachNode = (node: Node) => {
        node.getComponentsInChildren(Label).forEach(each);
        node.getComponentsInChildren(RichText).forEach(each);
        node.getComponentsInChildren(ArtLabel).forEach(each);
    };
    eachNode(node);
}
