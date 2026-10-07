import { _decorator, CCBoolean, Component, sp } from 'cc';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-1)
export default class SpSkeletonData extends Component {

    @property([sp.SkeletonData])
    data: sp.SkeletonData[] = [];

    @property(CCBoolean)
    cacheMode: boolean = true;
}
