
import { _decorator, find } from 'cc';
import { I18nLabel } from '../component/I18nLabel';
import ColItemBase from '../data/ColItemBase';
import { getNodeByKey, KeyNode } from '../data/KeyNode';
import ResSprite from '../script/ResSprite';
import CommonUIData from './CommonUIData';
import CommonUIStyle from './CommonUIStyle';

const { ccclass, property } = _decorator;

export enum BET_LEVEL_ACTION {
    MORE = 'more',
    LESS = 'less',
}

export type LevelHandler = (action: BET_LEVEL_ACTION) => void;
export type AutoRoundHandler = (round: string) => void;
export type QuickspinClickHandler = (prev: number, value: number) => void;
export type FeatureBuyHandler = (featureBuy: string, level: number, powerBet:string) => void;

export interface PanelCloseOpt {
    featureBuy?: boolean;
    powerBet?: boolean;
}

@ccclass
export default class CommonUI extends ColItemBase<CommonUIData> {

    @property([KeyNode])
    keyNodes: KeyNode[] = [];

    public getNodeByKey(key: string) {
        return getNodeByKey(this.keyNodes, key);
    }

    public getNodesByColKey(key: string) {
        return this.getComponentsInChildren('ColBase').filter((col) => {
            // @ts-ignore
            return col.colKey === key;
        }).map(c => c.node);
    }

    public getNodesByResSpriteKey(key: string) {
        return this.getComponentsInChildren(ResSprite).filter((col) => {
            return col.keys.some(k => k === key);
        }).map(las => las.node);
    }

    public getNodeByPath(path: string) {
        return find(path, this.node);
    }

    public getNodesByUIStyleKey(key: string) {
        return this.getComponentsInChildren(CommonUIStyle).filter((col) => {
            return col.keys.some(k => k === key);
        }).map(s => s.node);
    }

    public getNodesByI18nKey(key: string) {
        return this.getComponentsInChildren(I18nLabel).filter((l) => {
            return l.dataID === key;
        }).map(s => s.node);
    }
}
