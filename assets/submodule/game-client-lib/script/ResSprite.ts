
import { _decorator, CCBoolean, CCString, Component, Sprite, SpriteFrame } from 'cc';
import { DEBUG } from 'cc/env';
import { KeyAtlas } from '../data/KeyAtlas';
import { findFrame } from '../data/KeyStr';
import { getResLoader } from './ResLoader';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
@requireComponent(Sprite)
export default class ResSprite extends Component {

    @property(CCBoolean)
    saveFrame: boolean = false;

    @property([CCString])
    keys: string[] = [];

    public frame: SpriteFrame = null;

    private loadFrame(keyAtlass: KeyAtlas[] = []) {
        const sprite = this.node.getComponent(Sprite);

        // 依照顺序往下找，找到就用
        const d = findFrame(this.keys, keyAtlass);

        if (!d.frame) {
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.log('Not found', this.keys, 'in', keyAtlass);
            }
        }
        if (this.saveFrame) {
            this.frame = d.frame;
        }
        sprite.spriteFrame = d.frame;
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
        this.loadFrame(l.keyAtlass);

    }

}
