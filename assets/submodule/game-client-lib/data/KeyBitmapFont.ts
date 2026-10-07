import { _decorator, BitmapFont, CCString } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyBitmapFont')
export class KeyBitmapFont {

    @property(CCString)
    key: string = '';

    @property(BitmapFont)
    bitmapFont: BitmapFont = null;
}
