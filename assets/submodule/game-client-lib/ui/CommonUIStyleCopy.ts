import { _decorator, CCBoolean, CCInteger, Component, Label, Node } from 'cc';
import { copyProperty, getNodeColor, setNodeColor } from '../utils/Utils';
import CommonUIStyleAccept from './CommonUIStyleAccept';

const { ccclass, property } = _decorator;
@ccclass
export default class CommonUIStyleCopy extends Component {

    @property(CCInteger)
    parentLayers: number = 0;

    @property(CCBoolean)
    width: boolean = false;

    @property(CCBoolean)
    position: boolean = false;

    @property(CCBoolean)
    color: boolean = false;

    @property(CCBoolean)
    scale: boolean = false;

    @property(CCBoolean)
    labelOutlineColor: boolean = false;

    @property(CCBoolean)
    labelOutlineWidth: boolean = false;

    @property(CCBoolean)
    labelFont: boolean = false;

    public copyTo(node: Node) {

        const source = this.node;
        let target = node;
        if (this.parentLayers) {
            let i = this.parentLayers;
            do  {
                target = target.parent;
            } while (i -= 1);
        }
        const accept = target.getComponent(CommonUIStyleAccept);
        const acceptOk = (prop: keyof CommonUIStyleAccept) => {
            return !accept || (accept && accept[prop]);
        };
        // if (this.width && acceptOk('width')) {
        //     copyProperty(source, target, ['width']);
        // }
        // if (this.position && acceptOk('position')) {
        //     copyProperty(source, target, ['x', 'y']);
        // }
        if (this.color && acceptOk('color')) {
            setNodeColor(target, getNodeColor(source));
        }
        // if (this.scale && acceptOk('scale')) {
        //     copyProperty(source, target, ['scale']);
        // }
        if (this.labelOutlineColor || this.labelOutlineWidth) {
            const sl = source.getComponent(Label);
            const tl = target.getComponent(Label);
            if (sl && tl) {
                if (this.labelOutlineColor && acceptOk('labelOutlineColor')) {
                    copyProperty(sl, tl, ['outlineColor']);
                }
                if (this.labelOutlineWidth && acceptOk('labelOutlineWidth')) {
                    copyProperty(sl, tl, ['outlineWidth']);
                    tl.enableOutline = sl.outlineWidth > 0;
                }
            }
        }
        if (this.labelFont && acceptOk('labelFont')) {
            const sLabel = source.getComponent(Label);
            const tLabel = target.getComponent(Label);
            if (sLabel) {
                copyProperty(sLabel, tLabel, ['font']);
                copyProperty(sLabel, tLabel, ['fontSize']);
                copyProperty(sLabel, tLabel, ['lineHeight']);
            }
        }
    }
}
