import { _decorator } from 'cc';
import SpSkeletonConfig from '../component/SpSkeletonConfig';
import ColBase from './ColBase';

const { ccclass, property, menu, requireComponent } = _decorator;
@ccclass
@requireComponent(SpSkeletonConfig)
@menu('Col/ColSpSkeletonConfigAnimation')
export class ColSpSkeletonConfigAnimation extends ColBase<string> {

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

    public reset(value: string): void {
        this.getComponent(SpSkeletonConfig).animation = value;
    }

}
