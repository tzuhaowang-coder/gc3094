import { _decorator, CCString } from 'cc';
import ColBase from './ColBase';

const { ccclass, property } = _decorator;
@ccclass('KeyCol')
export class KeyCol {

    @property(CCString)
    public key: string = '';

    @property(ColBase)
    public col: ColBase<any> = null;
}
