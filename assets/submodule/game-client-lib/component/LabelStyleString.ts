import { _decorator, CCBoolean, CCString, color, Component, Label } from 'cc';
import { setNodeColor, setNodeOpacity } from '../utils/Utils';
import { ArtLabelData } from './ArtLabel';
import ArtLabelStyle from './ArtLabelStyle';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
@requireComponent(Label)
export default class LabelStyleString extends Component {

    @property(CCString)
    string: string = '';

    @property(CCBoolean)
    full: boolean = false;

    protected onLoad(): void {

        const l = this.getComponent(Label);
        const n = this.node;
        const data: ArtLabelData = JSON.parse(this.string);
        let fontSize = l.fontSize;
        let lineHeight = l.lineHeight;
        let enableBold = l.isBold;
        let enableItalic = l.isItalic;
        if (this.full) {
            enableBold = Boolean(data.eb);
            enableItalic = Boolean(data.ei);
            fontSize = data.fs;
            lineHeight = data.lh;
        }
        const scale = fontSize / data.fs;
        const style = new ArtLabelStyle();
        style.loadJson(data.ss[0]);

        const slc = style.labelColor;
        setNodeColor(n, color(slc.r, slc.g, slc.b));
        setNodeOpacity(n, slc.a);
        // n.setPosition(style.position.x * scale, style.position.y * scale);

        l.fontSize = fontSize;
        l.lineHeight = lineHeight;

        l.isBold = enableBold;
        l.isItalic = enableItalic;
        l.cacheMode = Label.CacheMode.BITMAP;
        // l.srcBlendFactor = this.srcBlendFactor;

        // add outline
        const enableOutline = style.outlineWidth > 0;
        l.enableOutline = enableOutline;
        if (enableOutline) {
            l.outlineColor = style.useOutlineColor ? style.outlineColor : style.labelColor;
            l.outlineWidth = style.outlineWidth * scale;
        }

        l.enableShadow = style.shadow;
        if (style.shadow) {
            l.shadowColor = color(style.shadowColor.r, style.shadowColor.g, style.shadowColor.b, style.shadowColor.a);
            l.shadowOffset = style.shadowOffset;
        }
    }
}
