import { AnimationClip, Label, Layout, macro, Node, PageViewIndicator, RichText, Size, sys, UITransform, Vec2, view, Widget } from 'cc';
import { EDITOR } from 'cc/env';
import LayoutShrink from './component/LayoutShrink';
import LayoutShrinkLabel from './component/LayoutShrinkLabel';
import NodeShrink from './component/NodeShrink';
import OnResizeManager from './component/OnResizeManager';
import PageViewIndicatorSprite from './component/PageViewIndicatorSprite';
import SpriteFitWorldSize from './component/SpriteFitWorldSize';
import { uiIsMobile } from './LibGlobal';
import { EXTRA_11, EXTRA_12, EXTRA_2, EXTRA_3 } from './ParamsGlobal';

let onResizeComponent = null;

export function setOnResizeComponent(onResize: OnResizeManager) {
    onResizeComponent = onResize;
}

export function getOnResizeComponent() {
    return onResizeComponent;
}

export enum UI_LAYOUT {
    PC_HORIZONTAL,
    MOBILE_HORIZONTAL,
    MOBILE_VERTICAL,
    UNKNOWN,
}

export let verticalOnly = EDITOR ? false : (sys.isMobile ? EXTRA_11 : false); // /?extra=2,11 只有直版
export let horizontalOnly = EDITOR ? false : (sys.isMobile ? EXTRA_12 : false); // /?extra=2,12 只有橫版
// ── showAllMode：畫面適配策略的開關 ──────────────────────────────
//
// 背景：遊戲用「設計解析度」(例如 1280x720) 製作，但每支手機的實際螢幕
//   比例都不同，引擎需要一個策略決定「怎麼把設計畫面塞進實際螢幕」。
//
// 兩種策略的差別：
//   • SHOW_ALL  = 整個設計畫面等比縮放到完全塞得進螢幕。畫面不會被裁切、
//                 所有 UI 都看得到，但螢幕比例不合時，多出來的地方會留黑邊。
//   • FIXED_*   = 固定一邊(高或寬)，另一邊跟著螢幕比例延伸填滿。不會有黑邊，
//                 但可見範圍會隨螢幕而變(寬螢幕看到更多左右、窄螢幕看到較少)。
//
// 這個flag就是「要不要改用 SHOW_ALL」的總開關：
//   為 true  → 改用 SHOW_ALL(保證完整顯示，接受黑邊)
//   為 false → 維持原本的 FIXED_HEIGHT / FIXED_WIDTH
//
// 啟用條件：只有「iOS 行動裝置」且「不是 webview(EXTRA_2)、也不是原生
//   App(EXTRA_3)」時才開啟，也就是只針對 iOS 的純瀏覽器網頁版。
//   App / webview 的視窗由容器端控制，不走這條路。
//
// 目前有兩個地方讀這個flag：
//   1. OnResizeManager：重算解析度時，依此選 SHOW_ALL 或 FIXED_* 策略。
//   2. MainBase：SHOW_ALL 下畫面可能溢出，於是替 Canvas 加一個 cc.Mask
//      把超出範圍的內容裁掉。
// ─────────────────────────────────────────────────────────────
export const showAllMode = sys.isMobile && sys.os === sys.OS.IOS && !EXTRA_2 && !EXTRA_3;

export function setVerticalOnly() {
    verticalOnly = true;
    horizontalOnly = false;
    applyOrientationMode();
}

export function setHorizontalOnly() {
    horizontalOnly = true;
    verticalOnly = false;
    applyOrientationMode();
}

export function applyOrientationMode() {
    if (verticalOnly) {
        view.setOrientation(macro.ORIENTATION_PORTRAIT);
    } else if (horizontalOnly) {
        view.setOrientation(macro.ORIENTATION_LANDSCAPE);
    } else {
        view.setOrientation(macro.ORIENTATION_AUTO);
    }
}

export function getLayoutType(): UI_LAYOUT {
    if (!uiIsMobile) {
        return UI_LAYOUT.PC_HORIZONTAL;
    } else {
        if (verticalOnly) {
            return UI_LAYOUT.MOBILE_VERTICAL;
        }
        if (horizontalOnly) {
            return UI_LAYOUT.MOBILE_HORIZONTAL;
        }
        const size = getWorldSize();
        if (size.width > size.height) {
            return UI_LAYOUT.MOBILE_HORIZONTAL;
        } else {
            return UI_LAYOUT.MOBILE_VERTICAL;
        }
    }
}

const worldSize = new Size(0, 0);
const fixVec2 = new Vec2(-worldSize.width / 2, -worldSize.height / 2);

export function setWorldSize(w: number, h: number) {
    // log('setWorldSize', w, h);
    worldSize.width = w;
    worldSize.height = h;
    fixVec2.x = -w / 2;
    fixVec2.y = -h / 2;
}

export function updateWorldSize() {
    const size = view.getVisibleSize();
    setWorldSize(size.width, size.height);
}

export function getWorldSize(): Size {
    return worldSize;
}

export function fixWorldXY(pos: Vec2): Vec2 {
    return pos.add(fixVec2);
}

// 1920x1080 => 1280x720
export let RESIZE_SCALE = .667;
/**
 *
 * @param scale
 * @param root root 的 anchor 為 .5, .5
 */
export function resizeNode(scale: number, root: Node) {
    const eachProp = eachPropCreator(scale);
    each(root);
    function each(node: Node) {

        const layout = node.getComponent(Layout);
        const uiTrans = node.getComponent(UITransform);
        eachProp(uiTrans, 'width', Boolean(layout));
        eachProp(uiTrans, 'height', Boolean(layout));
        eachProp(node.position, 'x');
        eachProp(node.position, 'y');

        if (layout) {
            eachProp(layout, 'spacingX');
            eachProp(layout, 'spacingY');
            eachProp(layout, 'paddingBottom');
            eachProp(layout, 'paddingLeft');
            eachProp(layout, 'paddingRight');
            eachProp(layout, 'paddingTop');
        }

        const w = node.getComponent(Widget);
        if (w) {
            if (w.isAlignRight && w.isAbsoluteRight) {
                eachProp(w, 'right');
            }
            if (w.isAlignBottom && w.isAbsoluteBottom) {
                eachProp(w, 'bottom');
            }
            if (w.isAlignLeft && w.isAbsoluteLeft) {
                eachProp(w, 'left');
            }
            if (w.isAlignTop && w.isAbsoluteTop) {
                eachProp(w, 'top');
            }
        }

        const l = node.getComponent(Label);
        if (l) {
            eachProp(l, 'fontSize');
            eachProp(l, 'lineHeight');
        }

        const r = node.getComponent(RichText);
        if (r) {
            eachProp(r, 'fontSize');
            eachProp(r, 'maxWidth');
            eachProp(r, 'lineHeight');
        }

        const ns = node.getComponent(NodeShrink);
        if (ns) {
            eachProp(ns.wh, 'x');
            eachProp(ns.wh, 'y');
        }

        const ls = node.getComponent(LayoutShrink);
        if (ls) {
            eachProp(ls.wh, 'x');
            eachProp(ls.wh, 'y');
        }

        const lsl = node.getComponent(LayoutShrinkLabel);
        if (lsl) {
            eachProp(lsl.wh, 'x');
            eachProp(lsl.wh, 'y');
        }

        const sws = node.getComponent(SpriteFitWorldSize);
        if (sws) {
            eachProp(sws.size, 'width');
            eachProp(sws.size, 'height');
        }

        const pvi = node.getComponent(PageViewIndicator);
        if (pvi) {
            eachProp(pvi.cellSize, 'width');
            eachProp(pvi.cellSize, 'height');
            eachProp(pvi, 'spacing');
        }

        const pvis = node.getComponent(PageViewIndicatorSprite);
        if (pvis) {
            eachProp(pvis.cellSize, 'width');
            eachProp(pvis.cellSize, 'height');
            eachProp(pvis, 'spacing');
        }

        node.children.forEach(each);
    }

}

function eachPropCreator(scale: number) {
    return function <T, K extends keyof T>(x: T, prop: K, ceil: boolean = false) {
        if (!x) {
            return;
        }
        // @ts-ignore
        x[prop] = eachValue(scale, x[prop], ceil);
    };
}

function eachValue(scale: number, value: number, ceil: boolean = false) {
    if (ceil) {
        return Math.ceil(scale * value * 1e3) / 1e3;
    } else {
        return Number((scale * value).toFixed(3));
    }
}

// *.anim
const clipKeys = [
    'Widget#left',
];
const processed = [];
export function resizeAnimationClip(scale: number, clip: AnimationClip) {
    // @ts-ignore
    const uuid: string = clip._uuid;
    if (processed.indexOf(uuid) !== -1) {
        return;
    }
    processed.push(uuid);

    const curveData: ICCAnimationClipCurveData = clip.curveData;

    each(curveData);
    Object.keys(curveData.paths).forEach((k) => {
        each(curveData.paths[k]);
    });

    function each(data: ICCAnimationClipCurveData) {
        if (data.props) {
            eachProps(data.props);
        }
        if (data.comps) {
            eachComps(data.comps);
        }
    }
    function eachComps(comps: ICCAnimationClipComps) {
        Object.keys(comps).forEach((name) => {
            const comp = comps[name];
            Object.keys(comp).forEach((key) => {
                if (clipKeys.indexOf(name + '#' + key) !== -1) {
                    comp[key].forEach(eachFrame);
                }
            });
        });
    }
    function eachProps(props: ICCAnimationClipProps) {
        if (props.x) {
            props.x.forEach(eachFrame);
        }
        if (props.y) {
            props.y.forEach(eachFrame);
        }
        if (props.width) {
            props.width.forEach(eachFrame);
        }
        if (props.height) {
            props.height.forEach(eachFrame);
        }
    }
    function eachFrame(frameValue: ICurveDataPropFrameValue) {
        frameValue.value = eachValue(scale, frameValue.value);
    }
}

// #TODO
// *.ts
// node.y/x
// action
