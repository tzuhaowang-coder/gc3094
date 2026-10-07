import { _decorator, AudioClip, CCString } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyAudioClip')
export class KeyAudioClip {

    @property(CCString)
    key: string = '';

    @property({
        type: AudioClip,
    })
    audioClip: AudioClip = null;
}
