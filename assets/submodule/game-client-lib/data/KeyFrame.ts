import { _decorator, CCString, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyFrame')
export class KeyFrame {

    @property(CCString)
    public key: string = '';

    @property(SpriteFrame)
    public frame: SpriteFrame = null;
}

@ccclass('KeyFrames')
export class KeyFrames {

    @property(CCString)
    public key: string = '';

    @property([SpriteFrame])
    public frames: SpriteFrame[] = [];
}
