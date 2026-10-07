import { _decorator, CCInteger, Node, PageViewIndicator, Sprite, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class PageViewIndicatorSprite extends PageViewIndicator {
    @property(SpriteFrame)
    selectSpriteFrame:SpriteFrame = null;
    @property(SpriteFrame)
    unSelectSpriteFrame:SpriteFrame = null;

    @property({
        type:CCInteger,
        min:0,
        max:255,
    })
    selectOpacity:number = 255;
    @property({
        type:CCInteger,
        min:0,
        max:255,
    })
    unSelectOpacity:number = 127;

    _changedState() {
        // @ts-ignore
        const indicators = this._indicators;
        if (indicators.length === 0) return;
         // @ts-ignore
        const idx = this._pageView._curPageIdx;
        if (idx >= indicators.length) return;
        for (let i = 0; i < indicators.length; i += 1) {
            const node:Node = indicators[i];
            const sp = node.getComponent(Sprite);
            sp.spriteFrame = this.unSelectSpriteFrame;
        }
        const node:Node = indicators[idx];
        const sp = node.getComponent(Sprite);
        sp.spriteFrame = this.selectSpriteFrame;
    }
}
