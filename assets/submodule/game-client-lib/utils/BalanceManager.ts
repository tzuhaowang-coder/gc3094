import { DEBUG } from 'cc/env';
import { getDebugParams } from '../ParamsGlobal';
import { Balance, balance, balanceBiggerThen, balanceLt, balanceSub } from './Balance';
import BalanceData from './BalanceData';
import { arraySplice, range2 } from './Utils';

function balanceDataSort(a: BalanceData, b: BalanceData): number {
    return a.serial < b.serial ? -1 : 1;
}

export default class BalanceManager {

    constructor(
        public sumDifference: boolean = false,
        public sumFilter: (a: BalanceData) => boolean = null,
    ) {}

    private balance: Balance = balance(0);
    public balanceDatas: BalanceData[] = [];
    private lastUpdateBalanceAt: number = 0;

    /**
     *
     * @returns raw balance
     */
    public getBalance() {
        return this.balance;
    }

    public clearData() {
        this.balanceDatas.length = 0;
    }

    private updateBalance(balance: Balance) {
        this.balance = balance;
        this.doUpdateBalance?.(balance);
    }

    public isUpdateBalanceIdle() {
        // idle 過 3 秒
        return Date.now() - 3e3 >= this.lastUpdateBalanceAt;
    }

    public isBalanceIdle() {
        return this.balanceDatas.findIndex(b => !b.isFinished()) === -1;
    }

    public getLastBalance() {
        return this.balanceDatas[this.balanceDatas.length - 1];
    }

    public getNextBalanceSerial(): number {
        const last = this.getLastBalance();
        if (!last) {
            return 0;
        }
        return last.serial + 1;
    }

    public getNextBalanceSerials(count: number): number[] {
        const last = this.getLastBalance();
        if (!last) {
            return range2(count).map((_, i) => i + 1);
        }
        return range2(count).map((_, i) => last.serial + i + 1);
    }

    public getBalanceData(serial: number) {
        return this.balanceDatas.find(bd => bd.serial === serial);
    }

    public filter(filter:(value: BalanceData, index: number, array: BalanceData[]) => boolean) {
        return this.balanceDatas.filter(filter);
    }

    public remove(balanceData: BalanceData) {
        arraySplice(this.balanceDatas, balanceData);
    }

    // 新增更新隊列
    public pushUpdateBalanceData(data: BalanceData) {
        this.balanceDatas.push(data);
        this.balanceDatas.sort(balanceDataSort);
        this.lastUpdateBalanceAt = Date.now();
        if (data.isFinished()) {
            this.finishBalanceData(data);
        } else {
            this.refreshBalance();
        }
    }

    public doUpdateBalanceData: (data: BalanceData) => void = null;
    public doUpdateBalance: (balance: Balance) => void = null;

    public finishBalanceData(data: BalanceData) {

        data.finish();

        this.doUpdateBalanceData?.(data);

        const arr = this.balanceDatas;
        // 被移除掉就不用更新了
        if (arr.indexOf(data) === -1) {
            return;
        }

        // 檢查前面是否有沒表演完的
        if (DEBUG && getDebugParams('keepbd')) {
            this.refreshBalance();
            return;
        }

        if (this.sumDifference) {
            return this.refreshBalance();
        } else {
            const unfinished = arr.filter((a) => {
                return a.serial <= data.serial && !a.isFinished();
            });
            const i = arr.indexOf(data);
            if (unfinished.length === 0) {
                if (i > 0) {
                    arr.splice(0, i);
                }
            }
            this.refreshBalance();
        }
    }

    public refreshBalance() {
        if (this.sumDifference) {
            return this.refreshDifference();
        } else {
            return this.refreshBalance2();
        }
    }

    private refreshDifference() {
        const arr = this.balanceDatas;
        let l = arr.length;
        const b = balance(0);
        while (l) { // 取得尚未完成的贏分
            l -= 1;
            const x = arr[l];
            if (this.sumFilter) {
                if (this.sumFilter(x)) {
                    b.add(x.difference);
                }
            } else if (!x.isFinished()) {
                b.add(x.difference);
            }
        }

        this.updateBalance(b); // 顯示 總餘額扣掉尚未完成贏分
    }

    private refreshBalance2() {
        const arr = this.balanceDatas;
        if (arr.length === 0) {
            this.updateBalance(balance(0));
            return;
        }
        if (arr.length === 1) {
            this.updateBalance(balanceBiggerThen(balance(0), arr[0].lastBalance));
            return;
        }

        let l = arr.length;
        const lastBalance = arr[l - 1].lastBalance; // 取得最新的要顯示的總餘額
        const bal = balance(0);
        while (l) { // 取得尚未完成的贏分
            l -= 1;
            const x = arr[l];
            if (!x.isFinished()) {
                bal.add(x.difference);
            }
        }
        if (balanceLt(lastBalance, bal)) {
            debugger;
        }

        this.updateBalance(balanceBiggerThen(balance(0), balanceSub(lastBalance, bal))); // 顯示 總餘額扣掉尚未完成贏分
    }
}
