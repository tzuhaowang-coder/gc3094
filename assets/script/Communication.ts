import { _decorator } from 'cc';
import Communication3XXX from '../submodule/slot-client-lib/script/Communication3XXX';
import { GAME_SERVER } from './Server';

const { ccclass } = _decorator;

@ccclass
export default class Communication extends Communication3XXX {

    getGameServer(): string {
        return GAME_SERVER;
    }

}
