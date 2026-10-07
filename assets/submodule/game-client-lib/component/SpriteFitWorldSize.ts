import { _decorator, CCBoolean, CCFloat, Component, Node, Size, Sprite } from 'cc';
import { getNodeContentSize, setNodeScale } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class SpriteFitWorldSize extends Component {

    @property(Node)
    resizeNode: Node = null;

    @property(Size)
    size: Size = null;

    @property(Sprite)
    sprite: Sprite = null;

    @property(CCBoolean)
    shrink: boolean = false;

    @property({
        type: CCFloat,
        tooltip: '最多用 size 多少的寬, size.width * shrinkScale2',
    })
    shrinkScale2: number = 1;

    @property({
        type: CCFloat,
        tooltip: '最大的 scale 倍數',
    })
    shrinkMaxScale: number = 1;

    private spriteSize: Size = null;

    onLoad() {
        this.resizeNode = this.resizeNode || this.node;
        this.spriteSize = this.size || (this.sprite && getNodeContentSize(this.sprite.node) || getNodeContentSize(this.node));
    }

    fit(size: Size) {
        let scale = 1;
        const sw = this.spriteSize.width;
        const sh = this.spriteSize.height;
        const h = size.height;
        const w = size.width;

        // TODO:
        // 只先考量了寬，高部分待處理
        if (this.shrink) {
            const w2 = size.width * this.shrinkScale2;
            scale = w2 / sw;
            if (scale > this.shrinkMaxScale) {
                scale = this.shrinkMaxScale;
            }
        } else {
            scale = Math.max(w / sw, h / sh);
        }
        setNodeScale(this.resizeNode, scale);
    }
}
