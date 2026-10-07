export interface AuthData {
    startTime: number;
    endTime: number;
}

export interface ClickData {
    clickType: ClickType;
    clickTime: number;
}

export interface FishAutoData {
    tableLevel: number;
    auto: number;
    autoTime: number;
}

export interface BetHit {
    weaponType: number;
    bet: number;
    fishType: number;
    count: number;
}

export interface FishBetData {
    tableLevel: number;
    betHits: BetHit[];
    tide: boolean;
    boss: boolean;
    auto: boolean;
    lock: boolean;
    ai: boolean;
    startTime: number;
    endTime: number;
}

export interface SpinData {
    betId: string;
    bet: number;
    win: number;
    afterBalance: string;
    feature: string;
    selection: number;
    fgSelection: number;
    autoCount: number;
    autoTotal: number;
    audio: boolean;
    quick: number;
    vertical: boolean;
    startTime: number;
    endTime: number;
}

export interface ShowData {
    betId: string;
    winType: number;
    totalRound: number;
    fastNG: boolean;
    fastFG: boolean;
    startTime: number;
    endTime: number;
}

export interface DisconnectData {
    code: number;
    disconnectTime: number;
}

export interface ExceptionData {
    msg: string;
    exceptionTime: number;
}

export interface PingData {
    ping: number;
    pingTime: number;
}

export enum AnalyticsAction {
  AUTH_START = 'auth_start',
  AUTH_END = 'auth_end',
  CLICK = 'click',
  FISH_AUTO = 'fish_auto',
  FISH_BET = 'fish_bet',
  SPIN = 'spin',
  SHOW = 'show',
  DISCONNECT = 'disconnect',
  EXCEPTION = 'exception',
  PING = 'ping',
}

export enum ClickType {
  START_PAGE = 'start_page', // 在 0003 送出
  FIRST_SPIN = 'first_spin', // 在 cocos 送出
  HOME = 'home', // 在 cocos 送出
  INFO = 'info', // 在 0003 送出
  RECORD = 'record', // 在 0003 送出
  IN_TABLE = 'in_table',
  OUT_TABLE = 'out_table',
  ENTER_LOBBY = 'enter_lobby',
  ENTER_TABLE = 'enter_table',
  FIRST_BET = 'first_bet',
  AWARD = 'award',
}

export type AnalyticsData = AuthData | ClickData | SpinData | ShowData | DisconnectData | ExceptionData | FishAutoData | FishBetData | PingData;

export const GidPattern = /^[134][0-9]{3,5}$/; // 必須是 1,3,4 開頭後接3-5位數字
export const ValidClicks: string[] = Object.values(ClickType) as string[];

export interface Analytics {
    owner: string;
    member: string;
    gid: string;
    currency: string;
    session: string;
    token: string;
    userAgent: string;
    action: string;
    data: AnalyticsData;
}
