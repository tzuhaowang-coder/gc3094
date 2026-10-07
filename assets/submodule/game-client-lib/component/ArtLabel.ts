import { _decorator, CCBoolean, CCFloat, CCString, Component, gfx, HorizontalTextAlignment, instantiate, Label, LabelOutline, Layers, macro, Node, Size, v2, VerticalTextAlignment } from 'cc';
import { DEBUG, EDITOR } from 'cc/env';
import { getNodeContentSize, getNodeWidth, nodePath, setNodeContentSize, setNodeOpacity, warn } from '../utils/Utils';
import ArtLabelStyle, { ArtLabelStyleData } from './ArtLabelStyle';
import ArtLabelStyleString from './ArtLabelStyleString';
import { Gradient2D } from './Gradient2D';
import NodeShrink from './NodeShrink';

const { ccclass, property, executionOrder, disallowMultiple, executeInEditMode } = _decorator;

const KH_LABEL_PARENT = 'KH_LABEL_PARENT';
export const KH_LABEL = 'KH_LABEL';
const t = .03;

export type ArtLabelData = {
    ha?: HorizontalTextAlignment;
    va?: VerticalTextAlignment;
    ff?: string;
    sbf?: gfx.BlendFactor;
    fs: number;
    lh: number;
    eb: number;
    ei: number;
    ss: ArtLabelStyleData[];
};

@ccclass
@executionOrder(-1)
@disallowMultiple()
@executeInEditMode()
export default class ArtLabel extends Component {

    @property({ editorOnly: true })
    preview: boolean = false;

    @property(CCBoolean)
    trim: boolean = true;

    @property({ multiline: true })
    get string(): string {
        return this._string;
    }

    set string(str: string) {
        this._string = str;
        this.ccLabels.forEach(l => l.string = str);
        this.scheduleAlign();
    }

    @property({ serializable: true })
    // tslint:disable-next-line:variable-name
    private _string: string = '';

    @property({ type: HorizontalTextAlignment })
    horizontalAlign: HorizontalTextAlignment = HorizontalTextAlignment.CENTER;

    @property({ type: VerticalTextAlignment })
    verticalAlign: VerticalTextAlignment = VerticalTextAlignment.CENTER;

    @property(CCFloat)
    fontSize: number = 40;

    @property(CCFloat)
    lineHeight: number = 48;

    @property(CCString)
    fontFamily: string = 'Microsoft JhengHei';

    @property(CCBoolean)
    enableBold: boolean = false;

    @property(CCBoolean)
    enableItalic: boolean = false;

    @property({ type: gfx.BlendFactor })
    srcBlendFactor = gfx.BlendFactor.SRC_ALPHA;

    @property(Node)
    styleRefNode: Node = null;

    private labelParent: Node = null;
    private ccLabels: Label[] = [];
    private nodeShrink: NodeShrink = null;
    private initialized: boolean = false;
    private registered: boolean = false;
    private registeredNode: Node = null;
    private firstSize: Size = null;

    onLoad() {

        if (DEBUG) {
            if (EDITOR) {
                if (!this.preview) {
                    return;
                }
            }
        }
        this.pre();
    }

    onEnable() {
        this.scheduleAlign();
    }

    private pre() {
        if (!this.firstSize) {
            this.firstSize = getNodeContentSize(this.node);
        }
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.node.children.forEach((node) => {
            if (node.name === KH_LABEL_PARENT) {
                node.removeFromParent();
                node.destroy();

            }
        });
        this.labelParent = null;
        const styleRefNode = this.styleRefNode || this.node;
        const isRef = this.node === styleRefNode;
        if (!isRef) {
            this.node.children.forEach(n => n.active = false);
        }

        const labelParent = new Node(KH_LABEL_PARENT);
        labelParent.layer = Layers.Enum.UI_2D;

        const size = this.firstSize;
        setNodeContentSize(labelParent, size.x, size.y);
        setNodeOpacity(labelParent, 1);

        if (size.width || size.height) {
            const nodeShrink = labelParent.addComponent(NodeShrink);
            nodeShrink.wh = v2(size.width, size.height);
            this.nodeShrink = nodeShrink;
        }

        this.labelParent = labelParent;

        let flag = false;
        const each = (style: ArtLabelStyle) => {
            if (!style) {
                return;
            }
            flag = true;
            const n = new Node(KH_LABEL);
            n.layer = Layers.Enum.UI_2D;
            n.setPosition(style.position.x * scale, style.position.y * scale);

            const l = n.addComponent(Label);
            l.color = style.labelColor;
            l.horizontalAlign = this.horizontalAlign;
            l.verticalAlign = this.verticalAlign;
            l.fontFamily = this.fontFamily;

            l.fontSize = fontSize;
            l.lineHeight = lineHeight;

            l.overflow = Label.Overflow.NONE;
            l.enableWrapText = false;
            l.isBold = this.enableBold;
            l.isItalic = this.enableItalic;
            l.cacheMode = Label.CacheMode.BITMAP;
            // @ts-ignore
            l.srcBlendFactor = this.srcBlendFactor;
            this.ccLabels.push(l);

            // add outline
            if (style.outlineWidth > 0) {
                l.enableOutline = true;
                l.outlineColor = style.useOutlineColor ? style.outlineColor : style.labelColor;
                l.outlineWidth = style.outlineWidth * scale;
            }

            // add shadow
            if (style.shadow) {
                const sn = instantiate(n);
                sn.layer = Layers.Enum.UI_2D;
                sn.setPosition(style.shadowOffset.x * scale , style.shadowOffset.y * scale);

                const sl = sn.getComponent(Label);
                sl.enableShadow = true;
                sl.color = style.shadowColor;
                sl.shadowColor = style.shadowColor;

                sn.setParent(labelParent);
                this.ccLabels.push(sl);
            }

            // add gradient
            if (style.gradient) {
                const g = l.addComponent(Gradient2D);
                g.setGradientColor(style.gradColorLB, style.gradColorRB, style.gradColorLT, style.gradColorRT);
            }

            n.setParent(labelParent);
        };

        const refArtLabel = styleRefNode.getComponent(ArtLabel);
        const refArtString = styleRefNode.getComponent(ArtLabelStyleString);
        let fontSize = this.fontSize;
        let lineHeight = this.lineHeight;
        let scale = 1;
        if (refArtLabel && refArtLabel.node.children.length) {
            scale = fontSize / refArtLabel.fontSize;
            styleRefNode.children.forEach(node => each(node.getComponent(ArtLabelStyle)));
        } else if (refArtString) {
            const data: ArtLabelData = JSON.parse(refArtString.string);
            if (refArtString.full) {
                this.fontSize = data.fs;
                this.lineHeight = data.lh;
                this.enableBold = Boolean(data.eb);
                this.enableItalic = Boolean(data.ei);
                fontSize = data.fs;
                lineHeight = data.lh;
            }
            scale = fontSize / data.fs;
            data.ss.forEach((d) => {
                const style = new ArtLabelStyle();
                style.loadJson(d);
                each(style);
            });
        } else {
            warn('ArtLabel reference missing', nodePath(this.node));
            return;
        }
        labelParent.setParent(this.node);

        if (!flag) {
            warn(`ArtLabel no style`, nodePath(this.node));
        }
        this.string = this._string;
    }

    public registerChildSizeChanged() {
        if (this.registered) {
            return;
        }
        const l = this.ccLabels[0];
        if (!l || !l._isOnLoadCalled) {
            return;
        }
        this.registered = true;

        let tl: Label;
        const los = this.ccLabels.filter(l => l.getComponent(LabelOutline));
        if (!los.length) {
            tl = l;
        } else {
            tl = los.sort((a, b) => {
                const aw = a.getComponent(LabelOutline).width;
                const bw = b.getComponent(LabelOutline).width;
                return bw - aw;
            })[0];
        }
        tl.node.on(Node.EventType.SIZE_CHANGED, () => {
            const ps =  getNodeContentSize(this.labelParent);
            const ls = getNodeContentSize(tl.node);
            if (ps.width !== 0 && ps.width !== ls.width) {
                this.resize(ls);
            }
        });
        this.registeredNode = tl.node;
    }

    public scheduleAlign() {
        this.unscheduleAllCallbacks();
        this.registerChildSizeChanged();
        if (!this.ccLabels.length) {
            return;
        }
        if (!this.string) {
            setNodeContentSize(this.labelParent, 0, 0);
            return;
        }

        this.schedule(
            () => {
                const size = getNodeContentSize(this.ccLabels.sort((a, b) => getNodeWidth(b.node) - getNodeWidth(a.node))[0].node);
                if (size.width !== 0) {
                    this.resize(size);
                }
            },
            t,
            macro.REPEAT_FOREVER,
            t,
        );
    }

    public resize(size: Size) {
        this.unscheduleAllCallbacks();
        const p = this.labelParent;
        setNodeContentSize(p, size.x , size.y);
        this.nodeShrink?.resize();

        const ns = this.nodeShrink;
        if (ns) {
            ns.resize();
            const pSize = getNodeContentSize(p);
            if (this.trim) {
                setNodeContentSize(this.node, pSize.width * p.getScale().x, pSize.height * p.getScale().y);
            } else {
                const size = (Math.max(ns.wh.x, pSize.width * p.getScale().x), Math.max(ns.wh.y, pSize.height * p.getScale().y));
                setNodeContentSize(this.node , size, size);
            }
        } else {
            const pSize =  getNodeContentSize(p);
            setNodeContentSize(this.node, pSize.x * p.getScale().x, pSize.y * p.getScale().y);
        }
        this.align();
        setNodeOpacity(p, 255);
    }

    public align() {
        let dirX = 0;
        let dirY = 0;
        switch (this.horizontalAlign) {
        case Label.HorizontalAlign.LEFT:
            dirX = -1;
            break;
        case Label.HorizontalAlign.RIGHT:
            dirX = 1;
            break;
        }

        switch (this.verticalAlign) {
        case Label.VerticalAlign.BOTTOM:
            dirY = -1;
            break;
        case Label.VerticalAlign.TOP:
            dirY = 1;
            break;
        }
        const parent = this.labelParent;
        const node = this.node;
        // const anchorX = node.anchorX;
        // const anchorY = node.anchorY;

        const each = (dir: number, anchor: number, a: number, b: number) => {
            let z: number;
            if (dir === -1) {
                z = 0;
            } else if (dir === 0) {
                z = .5;
            } else { // dir == 1
                z = 1;
            }
            return a * (z - anchor) - b / 2 * dir;
            // dirX=0
            // aw * (.5-anchorX) - bw / 2 * dirX
            // dirX=1
            // aw * (1-anchorX) - bw / 2 * dirX
        };
        // const x = each(dirX, anchorX, node.width, (parent.width) * parent.scale);
        // const y = each(dirY, anchorY, node.height, (parent.height) * parent.scale);
        // parent.x = x;
        // parent.y = y;

        // dirX
        // anchorX
        // aw
        // bw

        // dirX=-1
        // anchorX=1
        // -aw + bw/2
        // anchorX=.5
        // -aw/2+ bw/2
        // anchorX=0
        //       bw / 2

        // dirX=0
        // anchorX=1
        // -aw / 2
        // anchorX=.5
        // directionX=0
        // 0
        // anchorX=0
        // aw / 2

        // dirX=1
        // anchorX=1
        //       -bw/2
        // anchorX=.5
        // aw/2   -bw/2
        // anchorX=0
        // aw     -bw/2
    }

    update() {
        if (DEBUG && EDITOR) {
            if (!this.preview) {
                const n = this.node.getChildByName(KH_LABEL_PARENT);
                if (n) {
                    n.destroy();
                    this.labelParent = null;
                    this.ccLabels = [];
                }
                this.initialized = false;
            } else {

                if (!this.initialized) {
                    this.pre();
                }

                // const size = this.ccLabels.sort((a, b) => { return b.node.width - a.node.width; })[0].node.getContentSize();
                // if (size.width !== this.labelParent.width) {
                //     if (size.width !== 0) {
                //         this.resize(size);
                //     }
                // }
            }
        }
    }

    public refresh() {
        this.unscheduleAllCallbacks();
        this.initialized = false;
        this.labelParent = null;
        this.ccLabels.length = 0;
        this.nodeShrink = null;
        this.initialized = false;
        if (this.registered) {
            this.registeredNode.off(Node.EventType.SIZE_CHANGED);
        }
        this.registeredNode = null;
        this.registered = false;
        this.pre();
        this.scheduleAlign();
    }

    public toJson(): ArtLabelData {

        return {
            // ha :this.horizontalAlign,
            // va : this.verticalAlign,
            fs: this.fontSize,
            lh: this.lineHeight,
            // ff: this.fontFamily,
            eb: Number(this.enableBold),
            ei: Number(this.enableItalic),
            // sbf: this.srcBlendFactor,
            ss: (this.styleRefNode || this.node).children.map((node) => {
                const s = node.getComponent(ArtLabelStyle);
                if (s) {
                    return s.toJson();
                }
            }).filter(k => k),
        };
    }
}
