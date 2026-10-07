import { _decorator, Component, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class SlotSimpleSymbolBase extends Component {

    @property(Sprite)
    sprite: Sprite = null;

    public val: string = '';

    abstract doReset(val: string): void;

    public reset(val: string) {
        this.val = val;
        this.doReset(val);
    }
}
