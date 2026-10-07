
import { _decorator, CCString, Component, Font, Label } from 'cc';
import { DEBUG } from 'cc/env';
import { getResLoader } from './ResLoader';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
@requireComponent(Label)
export default class ResFont extends Component {

    @property([CCString])
    keys: string[] = [];

    private loadFont(fonts: Font[] = []) {
        const label = this.node.getComponent(Label);

        // 依照顺序往下找，找到就用
        const font = findFont(this.keys, fonts);

        if (!font) {
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.log('Not found', this.keys, 'in', fonts);
            }
        }
        label.font = font;
    }

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        const l = getResLoader();
        this.loadFont(l.fonts);

    }

}

function findFont(keys: string[], fonts: Font[] = []): Font {
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        for (let j = 0; j < fonts.length; j += 1) {
            const font = fonts[j];
            debugger;
            if (font.name === key) {
                return font;
            }
        }
    }
}
