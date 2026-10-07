import { _decorator, CCBoolean, CCFloat, Component } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 時間                 |   await data   |     await promise     |    await data2      |
 * node.active 屬性     mn.active        true                    config.enactive       mn.active2
 */

@ccclass
export default class MarkNumber extends Component {

    @property(CCBoolean)
    active: boolean = false;

    @property(CCFloat)
    data: number = 0;

    @property(CCFloat)
    data2: number = 0;

    @property(CCBoolean)
    active2: boolean = false;
}
