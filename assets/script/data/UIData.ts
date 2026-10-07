import { _decorator } from 'cc';
import UIDataBase from '../../submodule/game-client-lib/ui/UIDataBase';

const { ccclass, property } = _decorator;
@ccclass
export default class UIData extends UIDataBase {

    left: number = 0;

    public set<T extends keyof UIData>(key: T, val: UIData[T], force: boolean= false) {
        return super.set('' + key, val, force);
    }
}
