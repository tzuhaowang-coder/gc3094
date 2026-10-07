import { _decorator, CCString, Component, PageViewIndicator } from 'cc';
import { DEBUG } from 'cc/env';
import { KeyAtlas } from '../data/KeyAtlas';
import { findFrame, KeyStr } from '../data/KeyStr';
import { getResLoader } from './ResLoader';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
export default class ResPageViewIndicator extends Component {

    @property(CCString)
    atlasKey: string = '';

    @property(CCString)
    key: string = '';

    @property([KeyStr])
    keyStrs: KeyStr[] = [];

    loadFrame(keyAtlass: KeyAtlas[] = []) {
        const indicator = this.node.getComponent(PageViewIndicator);

        const keyStrs = [{
            key: this.atlasKey,
            str: this.key,
        }].concat(this.keyStrs);

        const arr = [];
        keyStrs.forEach((ks) => {
            if (ks.str) {
                arr.push(...keyAtlass.map(ka => ({ key: ka.key, str: ks.str })));
            }
        });

        const d = findFrame(arr, keyAtlass);

        if (!d.frame) {
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.log('Not found', [{ atlasKey: this.atlasKey, key: this.key }], 'in', keyAtlass);
            }
        }
        indicator.spriteFrame = d.frame;
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

        const la = getResLoader();
        this.loadFrame(la.keyAtlass);
    }
}
