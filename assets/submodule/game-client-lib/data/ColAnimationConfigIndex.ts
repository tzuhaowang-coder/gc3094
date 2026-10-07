import { _decorator } from 'cc';
import AnimationConfig from '../component/AnimationConfig';
import ColBase from './ColBase';

const { ccclass, property, menu, requireComponent } = _decorator;
@ccclass
@requireComponent(AnimationConfig)
@menu('Col/ColAnimationConfigIndex')
export class ColAnimationConfigIndex extends ColBase<number> {

    @property({
        override: true,
        displayName: 'Parameter Index',
    })
    colKey: string = '';

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    passScan: boolean = false;

    public reset(value: number): void {
        this.getComponent(AnimationConfig).index = value;
    }

}
