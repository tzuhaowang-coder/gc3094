import { _decorator, CCString } from 'cc';
import ColItemBase from '../data/ColItemBase';
import FeatureBuyData from './FeatureBuyData';

const { ccclass, property } = _decorator;

@ccclass
export default class FeatureBuyItem extends ColItemBase<FeatureBuyData> {

    @property(CCString)
    key: string = '';

    @property(CCString)
    powerBet: string = '';

}
