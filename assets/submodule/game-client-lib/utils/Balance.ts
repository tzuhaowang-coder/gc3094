
// tslint:disable-next-line:import-name
import Big from 'big';
import { globalDebugNNN } from '../LibGlobal';
import { padEnd } from './Utils';

/**
 * 處理 餘額 及 贏分
 */
export class Balance {

    /**
     *
     * 從 server 收到的 *10000 後的值
     */
    public big: Big;
    public raw: number = 0;

    /**
     *
     * @param balance 從 server 收到的 *10000 後的值
     */
    constructor(
        balance: Big | string | number = 0,
    ) {
        this.big = Big(balance);
        this.raw = this.rawNumber();
    }

    public add(balance: BalanceType) {
        if (balance instanceof Balance) {
            this.big = this.big.add(balance.big);
        } else {
            this.big = this.big.add(balance);
        }
        this.raw = this.rawNumber();
        return this;
    }

    public sub(balance: BalanceType) {
        if (balance instanceof Balance) {
            this.big = this.big.sub(balance.big);
        } else {
            this.big = this.big.sub(balance);
        }
        this.raw = this.rawNumber();
        return this;
    }

    public mul(balance: BalanceType) {
        if (balance instanceof Balance) {
            this.big = this.big.mul(balance.big);
        } else {
            this.big = this.big.mul(balance);
        }
        this.raw = this.rawNumber();
        return this;
    }

    public div(balance: BalanceType) {
        if (balance instanceof Balance) {
            this.big = this.big.div(balance.big);
        } else {
            this.big = this.big.div(balance);
        }
        this.raw = this.rawNumber();
        return this;
    }

    public clone(): Balance {
        return new Balance(this.big);
    }

    private fixed(decimal:number): string {
        let big = Big(this.big);
        big = big.times(BALANCE_DECIMAL2).div(BIG_10000);
        if (big.gt(0)) {
            big = big.round(0, Big.roundDown);
        } else {
            big = big.round(0, Big.roundUp);
        }
        big = big.div(BALANCE_DECIMAL2);
        if (TRIM_RIGHT_ZERO) {
            return big.toString();
        } else {
            return big.toFixed(decimal, Big.roundDown);
        }
    }

    /**
     *
     * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
     */
    public toNumber(decimal: number = BALANCE_DECIMAL): number {
        return Number(this.fixed(decimal));
    }

    public toString(thousandth: boolean = false, mk: boolean = false, decimal:number= BALANCE_DECIMAL): string {
        const str = this.fixed(decimal);
        if (thousandth) {
            if (mk) {
                return fixThousandthK(str);
            } else {
                return fixThousandth(str);
            }
        } else {
            if (mk) {
                return fixK(str);
            } else {
                return str;
            }
        }
    }

    public rawString() {
        return this.big.toString();
    }

    public rawNumber() {
        return this.big.toNumber();
    }

}

let BALANCE_DECIMAL: 2 | 3 = 2;
// should be 10**BALANCE_DECIMAL
let BALANCE_DECIMAL2 = 1e2;
let TRIM_RIGHT_ZERO: boolean = false;
let REPLACE_BY_MK: boolean = true;
const BIG_10000 = new Big(1e4);
const MAX_SAFE_BALANCE = balanceMul(Number.MAX_SAFE_INTEGER, 1e4);

export function maxSafeBalanceNumber(balance: Balance): number {
    if (balanceGt(balance, MAX_SAFE_BALANCE)) {
        return Number.MAX_SAFE_INTEGER;
    } else {
        return balance.toNumber();
    }
}

export function setBalanceDecimal(decimal: 2 | 3) {
    BALANCE_DECIMAL = decimal;
    if (decimal === 2) {
        BALANCE_DECIMAL2 = 1e2;
    } else {
        BALANCE_DECIMAL2 = 1e3;
    }
}

export function setTrimRightZero(able: boolean) {
    TRIM_RIGHT_ZERO = able;
}

export function setReplaceByMK(able: boolean) {
    REPLACE_BY_MK = able;
}

export type BalanceType = Balance | string | number;

export function balance(balance: BalanceType): Balance {
    return balanceAdd(balance);
}

export function balanceNumber(balance: BalanceType): number {
    return balanceAddNumber(balance);
}

export function balanceString(balance: BalanceType): string {
    return balanceAddString(balance);
}

export function balanceThousandth(balance: BalanceType): string {
    return balanceAdd(balance).toString(true);
}

export function balanceThousandthK(balance: BalanceType): string {
    return balanceAdd(balance).toString(true, true);
}

/**
 * 與 balanceThousandth 差異在 TRIM_RIGHT_ZERO 的處理方式
 * balanceThousandth 會保留小數
 * amountThousandth 不會保留小數
 */
export function amountString(amount: number) {
    return balanceString(amount);
}

export function amountThousandth(amount: number) {
    return fixThousandth3('' + balance(amount).toNumber());
}

export function amountThousandthK(amount: number) {
    return fixThousandth3(fixK('' + balance(amount).toNumber()));
}

export function chipString(amount: number) {
    return balanceString(amount);
}

/**
 * 不要小數
 * @param amount
 * @returns
 */
export function chipThousandth(amount: number) {
    return fixThousandth('' + balance(amount).toNumber());
}

/**
 * 完全不要小數
 * @param amount
 * @returns
 */
export function chipThousandthK(amount: number) {
    return fixThousandth(fixK('' + balance(amount).toNumber()));
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function balanceAddNumber(...balances: BalanceType[]): number {
    return balanceAdd(...balances).toNumber();
}

export function balanceAddString(...balances: BalanceType[]): string {
    return balanceAdd(...balances).toString();
}

// /**
//  *
//  * @param numbers
//  * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
//  */
export function balanceSubNumber(...balances: BalanceType[]): number {
    return balanceSub(...balances).toNumber();
}

export function balanceSubString(...balances: BalanceType[]): string {
    return balanceSub(...balances).toString();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function balanceMulNumber(...balances: BalanceType[]): number {
    return balanceMul(...balances).toNumber();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function balanceMulString(...balances: BalanceType[]): string {
    return balanceMul(...balances).toString();
}

// /**
//  *
//  * @param numbers
//  * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
//  */
export function balanceDivNumber(...balances: BalanceType[]): number {
    return balanceDiv(...balances).toNumber();
}

export function balanceDivString(...balances: BalanceType[]): string {
    return balanceDiv(...balances).toString();
}

function balanceOp(op: 'add' | 'sub' | 'mul' | 'div', balances: BalanceType[]): Balance {
    if (balances.length === 0) {
        return new Balance(0);
    }
    let balance: Balance;
    if (balances[0] instanceof Balance) {
        balance = balances[0].clone();
    } else {
        balance = new Balance(balances[0]);
    }
    for (let i = 1; i < balances.length; i += 1) {
        const b = balances[i];
        if (!b) {
            continue;
        }
        balance = balance[op](b);
    }
    return balance;
}

export function balanceAdd(...balances: BalanceType[]): Balance {
    return balanceOp('add', balances);
}

export function balanceSub(...balances: BalanceType[]): Balance {
    return balanceOp('sub', balances);
}

export function balanceMul(...balances: BalanceType[]): Balance {
    return balanceOp('mul', balances);
}

export function balanceDiv(...balances: BalanceType[]): Balance {
    return balanceOp('div', balances);
}

/**
 * balance greater than or equal to the value of balance2
 */
export function balanceGte(balance: BalanceType, balance2: BalanceType): boolean {
    return balanceAdd(balance).big.gte(balanceAdd(balance2).big);
}

/**
 * balance less than or equal to the value of balance2
 */
export function balanceLte(balance: BalanceType, balance2: BalanceType): boolean {
    return balanceAdd(balance).big.lte(balanceAdd(balance2).big);
}

/**
 * balance greater than the value of balance2
 */
export function balanceGt(balance: BalanceType, balance2: BalanceType): boolean {
    return balanceAdd(balance).big.gt(balanceAdd(balance2).big);
}

/**
 * balance less than the value of balance2
 */
export function balanceLt(balance: BalanceType, balance2: BalanceType): boolean {
    return balanceAdd(balance).big.lt(balanceAdd(balance2).big);
}

export function balanceLowerThen(max: Balance, balance: Balance):Balance {
    if (balance.big.lte(max.big)) {
        return balance;
    }
    return max;
}

export function balanceBiggerThen(min: Balance, balance: Balance):Balance {
    if (balance.big.gte(min.big)) {
        return balance;
    }
    return min;
}

export function balanceEq(balance: Balance, balance2: Balance):boolean {
    return balance.big.eq(balance2.big);
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function safeAdd(...numbers: number[]) {
    return balanceAdd(...numbers).big.toNumber();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function safeSub(...numbers: number[]) {
    return balanceSub(...numbers).big.toNumber();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function safeMul(...numbers: number[]) {
    return balanceMul(...numbers).big.toNumber();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function safeDiv(...numbers: number[]) {
    return balanceDiv(...numbers).big.toNumber();
}

/**
 *
 * @param numbers
 * @returns 如超過 Number.MAX_SAFE_INTEGER 會錯
 */
export function fixAmountNumber(num: number): number {
    return new Big(num).times(BIG_10000).toNumber();
}

// ============== 分隔線 ==============
// 下方為非餘額系列

/**
 * 有 extra=1010 時，完全不要小數點
 * @param str
 * @returns
 */
export function fixThousandth3(str: string): string {
    if (TRIM_RIGHT_ZERO) {
        return fixThousandth2(str, 0);
    }
    return fixThousandth2(str);
}

/**
 * 加千分位及小数点两/三位
 * 未處理 e
 */
export function fixThousandth2(str: string, decimal: number = BALANCE_DECIMAL): string {
    const ss = str.split('.');
    let ss1 = ss[1] || '';
    if (decimal === 0) {
        return fixThousandth(ss[0]);
    }
    if (decimal === 0 && TRIM_RIGHT_ZERO) {
        ss1 = '';
    } else if (ss1.length < decimal) {
        if (TRIM_RIGHT_ZERO) {
            ss1 = trimRightZero(ss1);
        } else {
            ss1 = padEnd(ss1, decimal, '0');
        }
    } else if (ss1.length > decimal) {
        ss1 = ss1.substr(0, decimal);
    }
    return fixThousandth(`${ss[0]}${ss1 ? '.' + ss1 : ''}`);
}

/**
 * 加千分位，跑分用
 */
// https://dotblogs.com.tw/alenwu_coding_blog/2017/08/11/js_number_to_currency_comma
export function fixThousandth(str: string): string {
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * 加千分位 加K，1000000 -> 1,000K
 */
export function fixThousandthK(str: string): string {
    return fixThousandth(fixK(str));
}

/**
 *
 * @param i 整數
 * @param d 小數
 * @param l K 為 3， M 為 6
 * @returns [整數, 小數]
 */
function shiftDot(i: string, d:string, l: number) {
    const il = i.length;
    if (l <= 0 || il < l + 1) {
        return [i, d];
    }
    d = i.substr(il - l) + d;
    // trim right 0
    d = d.replace(/0+$/, '');
    i = i.substr(0, il - l);
    return [i, d];
}

const K = 3;
const M = 6;
/**
 * 加 K，10000 -> 10K
 *
 */
function fixMK(str: string, million: boolean = false): string {

    if (!REPLACE_BY_MK) {
        return str;
    }

    const strs = str.split('.');
    const i = strs[0] || '0';
    const d = strs[1] || '0';
    let [iOut , dOut] = ['', ''];
    const il = i.length;

    if (million) {
        if (il >= M + 1) {
            [iOut, dOut] = shiftDot(i, d, M);
            const dl = dOut.length;
            if (dl < 3) {// Ｍ小數點2位以下才顯示
                return  iOut + (dOut ? '.' + dOut : '') + 'M';
            }
        }
    }
    if (il >= K + 2) {
        [iOut, dOut] = shiftDot(i, d, K);
        const dl = dOut.length;
        if (dl < 3) {// Ｋ小數點2位以下才顯示
            return iOut + (dOut ? '.' + dOut : '') + 'K';
        }
    }
    return str;
}

export function fixK(str: string): string {
    return fixMK(str, true);
}

export function roundDown(num: number, dp: number): number {
    let big = Big(num);
    if (big.gt(0)) {
        big = big.round(dp, Big.roundDown);
    } else {
        big = big.round(dp, Big.roundUp);
    }
    return big.toNumber();
}

function trimRightZero(str: string) {
    return str.replace(/0+$/, '');
}

globalDebugNNN(Balance, 'Balance', false);
