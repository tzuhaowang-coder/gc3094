import { MsgCode, Result } from '../protobuf/ProtobufWarp';

export function resultCode(result: Result): number {
    return result ? result.getCode() : 0;
}

export function resultHasError(result: Result) {
    return result && result.getCode() !== 1;
}

export function commonMsgCodeToMsgKey(code: MsgCode): string {
    switch (code) {
    case MsgCode.DUPLICATE_LOGIN:
        return 'GAME.sysm_another_login';
    case MsgCode.VALIDATION_FAILED:
    case MsgCode.GAME_CANT_IN_ROOM:
        return 'GAME.sysm_verify_fail';
    case MsgCode.GAME_NOT_ENOUGH_IN_GAME:
    case MsgCode.GAME_AMOUNT_NOT_ENOUGH:
        return 'GAME.sysm_if_bal';
    case MsgCode.GAME_NOT_LOGIN:
        return 'GAME.sysm_login_nyet';
    case MsgCode.GAME_QUERY_FAIL:
        return 'GAME.sysm_inquiry_fail';
    case MsgCode.TRANSFER_NOT_FINISH:
        return 'GAME.sysm_transfer_not_finish';
    case MsgCode.WALLET_NOT_FOUND:
        return 'GAME.sysm_wallet_not_found';
    case MsgCode.GAME_NOT_IN_TABLE:  // 未進入遊戲桌
        return 'GAME.sysm_ingame_nyet'; // 未
    case MsgCode.GAME_ALREADY_IN_TABLE:  // 已在遊戲桌內
        return 'GAME.sysm_ingame_yet'; // 未
    case MsgCode.GAME_OVER_LIMIT_BET:  // 超過下注限紅
        return 'GAME.sysm_bet_fail_exceed';
    case MsgCode.GAME_NOT_BET_TIME:  // 非下注時間
        return 'GAME.sysm_wait_bet';
    case MsgCode.SINGLE_BET_LIMIT_EXCEEDED:
        return 'GAME.sysm_bet_limit_exceeded';
    default:
        return 'GAME.sysm_error_unknown';
    }
}

export function commonKickCodeToMsgKey(code: MsgCode): string {
    switch (code) {
    case MsgCode.GAME_NOTIFY_DUPLICATE_LOGIN:
    case MsgCode.GAME_KICK_DUPLICATE_LOGIN:
        return 'GAME.sysm_another_login';
    case MsgCode.GAME_KICK_IDLE:
        return 'GAME.sysm_game_kick_idle';
    case MsgCode.GAME_KICK_BLOCK_MONEY_ERROR:
        return 'GAME.sysm_transfer_not_finish';
    case MsgCode.GAME_KICK_WALLET_NOT_FOUND:
        return 'GAME.sysm_wallet_not_found';
    case MsgCode.SINGLE_BET_LIMIT_EXCEEDED:
        return 'GAME.sysm_bet_limit_exceeded';
    default:
        return 'NETWORK.sys_net_disconnect';
    }
}
