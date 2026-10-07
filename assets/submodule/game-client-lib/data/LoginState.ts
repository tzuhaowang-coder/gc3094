export enum LoginState {
    BEFORE_LOGIN = 0,
    LOGIN = 1,
    BEFORE_LOGIN_OFFLINE = 10,
    OFFLINE = 11,
    KICKOUT = 12,
    TRY_RESUME = 21,
    OFFLINE_SHOWED = 31,
}

export function isBeforeLogin(state: LoginState): boolean {
    return state === LoginState.BEFORE_LOGIN;
}

export function isBeforeLoginOffline(state: LoginState): boolean {
    return state === LoginState.BEFORE_LOGIN_OFFLINE;
}

export function isLogin(state: LoginState): boolean {
    return state === LoginState.LOGIN;
}

export function isOffline(state: LoginState, completely: boolean): boolean {
    if (completely) {
        return state === LoginState.OFFLINE_SHOWED || state === LoginState.BEFORE_LOGIN_OFFLINE || state === LoginState.OFFLINE || state === LoginState.KICKOUT;
    }
    return state === LoginState.OFFLINE_SHOWED || state === LoginState.BEFORE_LOGIN_OFFLINE || state === LoginState.OFFLINE || state === LoginState.KICKOUT || state === LoginState.TRY_RESUME;
}

export function isOfflineShowed(state: LoginState): boolean {
    return state === LoginState.OFFLINE_SHOWED;
}

export function isTryResume(state: LoginState): boolean {
    return state === LoginState.TRY_RESUME;
}

export function isKickout(state: LoginState): boolean {
    return state === LoginState.KICKOUT;
}

// BEFORE_LOGIN -> LOGIN -> OFFLINE
// BEFORE_LOGIN -> LOGIN -> KICKOUT
// BEFORE_LOGIN -> LOGIN -> TRY_RESUME -> LOGIN
// BEFORE_LOGIN -> LOGIN -> TRY_RESUME -> TRY_RESUME -> OFFLINE
