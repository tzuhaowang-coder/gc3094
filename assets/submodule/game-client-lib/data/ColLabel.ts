import { _decorator, Label, RichText } from 'cc';
import ArtLabel from '../component/ArtLabel';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColLabel')
export class ColLabel extends ColBase<string> {

    @property(Label)
    label : Label = null;

    @property(RichText)
    richText: RichText = null;

    private artLabel: ArtLabel = null;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.label = this.label || this.node.getComponent(Label);
        this.richText = this.richText || this.node.getComponent(RichText);
        this.artLabel = this.artLabel || this.node.getComponent(ArtLabel);
    }

    reset(value: string) {
        this.pre();
        if (this.label) {
            this.label.string = value;
        }
        if (this.richText) {
            this.richText.string = value;
        }
        if (this.artLabel) {
            this.artLabel.string = value;
        }
        this.prev = value;
    }
}
