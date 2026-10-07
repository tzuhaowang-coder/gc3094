import { log, warn } from './utils/Utils';

export interface LevelOpt {
    levelOptions: string[];
    balance: string;
    win: string;
    totalBet: string;
    btnColor: string;
    iconColor: string;
    txtColor: string;
    title: string;
    subTxt: string;
    isGuest: boolean;
    currLevel: string;
}

export interface AutoOpt {
    autoSpinOptions: (number | string)[];
    balance: string;
    win: string;
    totalBet: string;
    btnColor: string;
    iconColor: string;
    txtColor: string;
    title: string;
    subTxt: string;
    turboTxt:string;
    turboInfoTxt:string;
    isGuest:boolean;
    extra1180:boolean;
}

export interface BalanceOpt {
    balance: string;
    iconColor: string;
    txtColor: string;
    title: string;
    subTxt: string;
    isGuest: boolean;
}

export interface AlertOpt {
    visible:boolean;
    keep?: boolean;
    alertMsg?:string;
    btn1Text?: string;
    btn1Visible?: boolean;
    btn1Color?:string;
    btn1Click?: () => void;
    btn2Text?: string;
    btn2Visible?: boolean;
    btn2Color?:string;
    btn2Click?: () => void;
}

type SectionType = 'level' | 'auto' | 'balance';
type ActionType = 'level' | 'auto' | 'balance' |'close' | 'startClick';

/**
 * 常駐 toast2 的識別碼與排序，集中在此以免各功能各自取名／各填數字而撞在一起。
 * priority 小的排上面；定時訊息（queue）恆在最下獨立一條。
 */
export const TOAST2_KEY = {
    /** 技能卡：auto 被中斷、等該局一般下注結束 */
    SKILL_CARD_AUTO_STOP: 'skillCardAutoStop',
    /** 已達最高贏分上限 */
    MAX_WIN: 'maxWin',
};

export const TOAST2_PRIORITY = {
    [TOAST2_KEY.SKILL_CARD_AUTO_STOP]: 0,
    [TOAST2_KEY.MAX_WIN]: 1,
};

export declare namespace ds {
    export function open(str: SectionType, opts: LevelOpt|AutoOpt|BalanceOpt): string;
    export function close(str: SectionType): string;
    export function showAlert(opts:AlertOpt);
    export function hideAlert();
    export function showToast(msg:string): string;
    export function hideToast();
    export function showToast2(msg:string, duration?:number, key?:string, priority?:number): string;
    export function hideToast2(key?:string);
    export function register(type: ActionType, callback: (value: string) => void): string;
    export function unregister(type: ActionType, callback: (value: string) => {}): string;
}

export async function htmlControlOpen(type: SectionType, opts: LevelOpt|AutoOpt|BalanceOpt): Promise<string> {
    if (typeof ds === 'undefined') {
        log('opts', opts);
    } else {
        return ds.open(type, opts);
    }
}

export async function htmlControlClose(type: SectionType): Promise<string> {
    if (typeof ds === 'undefined') {
    } else {
        return ds.close(type);
    }
}

export function htmlControlRegister(type: ActionType, callback: (str:string) => void) {
    if (typeof ds === 'undefined') {
    } else {
        return ds.register(type, callback);
    }
}

export  function htmlControlUnregister(type: SectionType, callback?: () => {}) {
    if (typeof ds === 'undefined') {
    } else {
        return ds.unregister(type, callback);
    }

}

export async function htmlControlShowToast(msg: string): Promise<string> {
    if (typeof ds === 'undefined') {
        return '';
    } else {
        return ds.showToast(msg);
    }
}

// 黑帶 toast（滿版橫帶、垂直置中）。多條同時存在時由上而下堆疊，整組維持置中。
// 常駐與定時分開管理：常駐是「狀態提示」，掛著直到該狀態結束；定時是「事件提示」，走 queue
// 輪播。兩者互不干擾——常駐不會卡住 queue，收常駐也不會把別人排隊中的訊息清掉。

/**
 * 常駐：顯示後一直掛著，直到 htmlControlHideToast2(key) 收回。
 *
 * key 與 priority 必填，漏帶會直接拋錯——沒人收得掉的常駐會一直佔著畫面。
 *
 * @param duration 固定帶 0
 * @param key 識別碼，見 TOAST2_KEY；同 key 再次呼叫視為更新內容，不會多一條
 * @param priority 排序，小的在上，見 TOAST2_PRIORITY；定時訊息恆在最下
 */
export async function htmlControlShowToast2(msg: string, duration: 0, key: string, priority: number): Promise<string>;

/**
 * 定時：進 queue 輪播，時間到自動消失，不需要 key。
 *
 * @param duration 顯示毫秒數，必填且須大於 0——0 與負數都是常駐，請用上面那個多載。
 *                 設成必填是因為「不帶」與「帶 0」語意太接近，容易誤寫成常駐卻漏了 key
 */
export async function htmlControlShowToast2(msg: string, duration: number): Promise<string>;
export async function htmlControlShowToast2(msg: string, duration: number, key?: string, priority?: number): Promise<string> {
    // 常駐沒帶 key 就沒人收得掉，會一直佔著畫面；沒帶 priority 則排序不定。
    // 判斷用 <= 0 與元件一致（Toast2.svelte 也是 customDuration <= 0 視為常駐），負數同樣算。
    // 兩者都是呼叫端寫死的常數，寫對一次就永遠對，所以直接拋錯讓它在開發階段就被發現，
    // 不要留到執行期靜默失效才發現提示怎麼關不掉。
    if (duration <= 0 && (!key || priority === undefined)) {
        throw new Error(`htmlControlShowToast2：常駐（duration <= 0）必須帶 key 與 priority，msg=${msg} key=${key} priority=${priority}`);
    }
    if (typeof ds === 'undefined') {
        return '';
    } else {
        return ds.showToast2(msg, duration, key, priority);
    }
}

/**
 * 收回常駐訊息。key 必填——常駐一律由掛上它的人自己收，不提供一次清空的捷徑，
 * 免得某個功能順手把別人的狀態提示清掉；設成必填是要讓漏帶在編譯期就擋下來，
 * 而不是執行期靜默沒反應。不影響定時訊息的 queue。
 */
export async function htmlControlHideToast2(key: string): Promise<void> {
    if (typeof ds !== 'undefined') {
        ds.hideToast2(key);
    }
}

let alerted: boolean = false;
let registered: boolean = false;

export function htmlControlAlerted(): boolean {
    return alerted;
}

export async function htmlControlShowAlert(opts: AlertOpt): Promise<void> {
    warn('showAlert', opts);
    if (typeof ds !== 'undefined') {
        if (!registered) {
            registered = true;
            ds.register('close', (type) => {
                if (type === 'alert') {
                    alerted = false;
                }
            });
        }
        if (opts.visible) {
            alerted = true;
        }
        ds.showAlert(opts);
    }
}

export async function htmlControlHideAlert(): Promise<void> {
    warn('hideAlert');
    if (typeof ds !== 'undefined') {
        ds.hideAlert();
    }
}
