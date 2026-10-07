import { _decorator, EditBox } from 'cc';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColEditBox')
export class ColEditBox extends ColBase<string> {

    @property(EditBox)
    box : EditBox = null;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.box = this.box || this.node.getComponent(EditBox);
    }

    reset(value: string) {
        this.pre();
        if (this.box) {
            this.box.string = value;
        }
        this.prev = value;
    }
}
