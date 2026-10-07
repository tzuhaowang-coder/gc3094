import { _decorator, CCBoolean, Component } from 'cc';

const { ccclass, property } = _decorator;
@ccclass
export default class CommonUIStyleAccept extends Component {

    @property(CCBoolean)
    width: boolean = false;

    @property(CCBoolean)
    position: boolean = false;

    @property(CCBoolean)
    color: boolean = false;

    @property(CCBoolean)
    scale: boolean = false;

    @property(CCBoolean)
    labelOutlineColor: boolean = false;

    @property(CCBoolean)
    labelOutlineWidth: boolean = false;

    @property(CCBoolean)
    labelFont: boolean = false;

}
