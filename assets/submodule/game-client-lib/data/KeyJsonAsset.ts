import { _decorator, CCString, JsonAsset } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyJsonAsset')
export class KeyJsonAsset {

    @property(CCString)
    key: string = '';

    @property(CCString)
    xpath: string = '';

    @property(JsonAsset)
    jsonAsset: JsonAsset = null;
}
