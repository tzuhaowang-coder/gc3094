
import { htmlControlShowToast } from '../game-client-lib/HtmlControlGlobal';
import { translateError } from '../game-client-lib/I18nGlobal';
import { ALERT_LEVEL } from '../game-client-lib/LibGlobal';
import { LoginState } from '../game-client-lib/data/LoginState';
import User from '../game-client-lib/data/User';
import { AuthRes, HeartbeatRes, KickRes, MsgCode, Result } from '../game-client-lib/protobuf/ProtobufWarp';
import CommunicationBase from '../game-client-lib/script/CommunicationBase';
import { balance } from '../game-client-lib/utils/Balance';
import { commonKickCodeToMsgKey, commonMsgCodeToMsgKey, resultHasError } from '../game-client-lib/utils/HandleError';
import { ccFindCreator } from '../game-client-lib/utils/Utils';
import { InMachineRes, Symbol, SymbolType } from './protobuf/ProtobufWarp';
import Communication3XXX from './script/Communication3XXX';
import MainBase from './script/MainBase';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_SYMBOL_STATUS } from './slot/SlotData';
import { SlotReelSymbol } from './slot/SlotReel';

export let getMain = ccFindCreator<MainBase>('Game', 'MainBase');

export let getComm = ccFindCreator<Communication3XXX>('Game', 'Communication3XXX');

export let autoTable = ['10', '30', '50', '80', '100', '200', '500', '∞'];

export function forceKickGame(comm: CommunicationBase, user: User, updateUserInfo: (user: User) => void) {
    if (comm) {
        comm.getGameService().finishSendWebSocket();
    }

    if (user) {
        // 重设使用者讯息
        user.setName('Guest');
        user.setBalance(balance(0));
    }

    if (updateUserInfo && user) {
        updateUserInfo(user);
    }
}

export function handleError(result: Result, main: MainBase, comm: CommunicationBase, resp: any): boolean {
    // 有错误
    if (resultHasError(result)) {
        const code = result.getCode();
        const key = msgCodeToMsgKey(code);
        const msg = translateError(key, code);
        if (code === MsgCode.DUPLICATE_LOGIN || code === MsgCode.MATH_VALIDATION_FAILED) {
            // 弹窗结束游戏
            main.offline(msg, code);
        } else if (resp instanceof HeartbeatRes || resp instanceof AuthRes || resp instanceof InMachineRes) {
            main.offline(msg, code);
        } else {
            htmlControlShowToast(msg);
        }
        return true;
    }
    return false;
}

export function msgCodeToMsgKey(code: MsgCode): string {
    switch (code) {
    default:
        return commonMsgCodeToMsgKey(code);
    }
}

export function handleKick(kick: KickRes) {
    const code = kick.getCode();
    const main = getMain();
    const comm = getComm();
    const str = kick.getMsg() === '' ? translateError(commonKickCodeToMsgKey(code), code) : kick.getMsg() + '(' + code + ')';
    if (code === MsgCode.GAME_NOTIFY_DUPLICATE_LOGIN) {
        main.getAlert().alert(str, '', ALERT_LEVEL.DEFAULT, () => { });
        return;
    }
    comm.loginState = LoginState.KICKOUT;
    comm.requestBetOk = false;
    main.offline(str, code);
}

export interface ISlotPuzzle {
    /**
     *
     * @param manual 是否為手動點擊觸發
     */
    stopAll(manual: boolean): Promise<any>;
    /**
     * 收到錯誤回應時的停軸；quick2 的 stopAll 會被 guard 擋下不停軸，
     * 需改走 spin() 既有資料停軸。無 quick2 問題的實作者直接委派 stopAll。
     */
    stopSpinFail(): Promise<any>;
    isIdle(): boolean;
}

export interface ISlot extends ISlotPuzzle {
    getSymbolPriority?(): SymbolType[];
    isSpinning(): boolean;
    isStopping(): boolean;
    isAllReelHasLooped():boolean;
    spin(data: any): Promise<any>;
    setCacheSymbol(symbols: SlotReelSymbol[][], status?: SLOT_SYMBOL_STATUS | PREV_SLOT_SYMBOL_STATUS, force?: boolean): void;
    getCacheSymbol(): SlotReelSymbol[][];
    getScreenReels(): { result: SlotReelSymbol[], prev: SlotReelSymbol, last: SlotReelSymbol }[];
    isFeature(): boolean;
    reverseReducer: (map: SlotReelSymbol[][], s: Symbol) => SlotReelSymbol[][];
}

/**
 *
* @param priority index 越小越優先
 * @returns
 */
export function symbolPrioritySort(priority: SymbolType[] = []) {
    return (a: SymbolType, b: SymbolType) => {
        const ia = priority.indexOf(a);
        const ib = priority.indexOf(b);
        const pa = ia !== -1;
        const pb = ib !== -1;
        if (pa && pb) {
            return ia - ib;
        } else if (pa) {
            return -1;
        } else if (pb) {
            return 1;
        } else {
            return a - b;
        }
    };
}
