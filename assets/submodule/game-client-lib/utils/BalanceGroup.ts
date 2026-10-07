import { _decorator, Component, Label } from 'cc';
import { balanceThousandth } from './Balance';
import BalanceData from './BalanceData';
import BalanceManager from './BalanceManager';

const { ccclass, property } = _decorator;

const DELAY_RELEASE_TIME = 1500;

@ccclass
export default class BalanceGroup extends Component {

    @property(Label)
    temporaryLabel: Label = null;

    protected groups: Map<string, boolean> = new Map();

    public refBalanceManager: BalanceManager = null;

    protected bm: BalanceManager = new BalanceManager(true);

    onLoad() {
        this.bm.doUpdateBalance = (b) => {
            this.temporaryLabel.string = balanceThousandth(b);
        };
    }

    public startGroup(group: number | string) {
        this.groups.set('' + group, true);
    }

    public hasGroup(group: number | string): boolean {
        return this.groups.has('' + group);
    }

    public pushGroup(group: number | string, arr: BalanceData | BalanceData[]) {
        arr = [].concat(arr);
        const ref = this.refBalanceManager;
        if (!this.groups.has('' + group)) {
            if (ref) {
                arr.forEach((bd) => {
                    if (!ref.getBalanceData(bd.serial)) {
                        ref.pushUpdateBalanceData(bd);
                    }
                    ref.finishBalanceData(bd);
                });
            }
            return;
        }
        const bm = this.bm;
        arr.forEach((bd) => {
            bd.group = '' + group;
            bm.pushUpdateBalanceData(bd);
            ref && ref.pushUpdateBalanceData(bd);
        });
    }

    public finishGroup(group: number | string) {
        this.groups.delete('' + group);
        const bm = this.bm;
        const ref = this.refBalanceManager;
        const next = () => {
            const arr = bm.filter(bd => bd.group === '' + group);
            const last = arr[arr.length - 1];
            arr.forEach((bd) => {
                bd.finish();
                bm.remove(bd);
            });
            if (last) {
                bm.finishBalanceData(last);
                ref && ref.finishBalanceData(last);
            }
            bm.refreshBalance();
            ref && ref.refreshBalance();
        };
        this.scheduleOnce(next, DELAY_RELEASE_TIME / 1e3);
    }

    public getBalance() {
        return this.bm.getBalance();
    }

}
