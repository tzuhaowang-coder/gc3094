import { _decorator, CCString, SpriteAtlas } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyAtlas')
export class KeyAtlas {

    @property(CCString)
    public key: string = '';

    @property(SpriteAtlas)
    public atlas: SpriteAtlas = null;
}
