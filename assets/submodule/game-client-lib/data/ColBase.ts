import { _decorator, CCBoolean, CCString, Component } from 'cc';

const { ccclass, property } = _decorator;
@ccclass
export default abstract class ColBase<T> extends Component {

    @property(CCString)
    colKey: string = '';

    @property(CCBoolean)
    passScan: boolean = false;

    public prev: T = null;

    public abstract reset(value: T): void;
}
