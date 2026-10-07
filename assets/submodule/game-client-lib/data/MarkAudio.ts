import { _decorator, CCFloat, CCString, Component } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 時間                 |   await data   |     await promise     |    await data2      |
 * node.active 屬性     mn.active        true                    config.enactive       mn.active2
 */

@ccclass
export default class MarkAudio extends Component {

    @property(CCString)
    audioName: string = '';

    @property(CCFloat)
    delay: number = 0;
}
