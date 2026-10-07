import { _decorator, CCString, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class Mark extends Component {

    @property(CCString)
    data: string = '';
}
