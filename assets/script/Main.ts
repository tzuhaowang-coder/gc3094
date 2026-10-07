import { _decorator } from 'cc';
import MainBase from '../submodule/slot-client-lib/script/MainBase';
import { GAME_ID } from './GameId';
/**
 * 主選單
 */
const { ccclass, property } = _decorator;

@ccclass
export default class Main extends MainBase {

    getGameId(): string {
        return GAME_ID;
    }

}
