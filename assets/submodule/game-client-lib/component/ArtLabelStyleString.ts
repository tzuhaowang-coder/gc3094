import { _decorator, CCBoolean, CCString, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class ArtLabelStyleString extends Component {

    @property(CCString)
    string: string = '';

    @property(CCBoolean)
    full: boolean = false;
}
