import { Balance } from './Balance';

// 更新餘額
export default class BalanceData<T= any> {

    constructor(
        public serial: number,
        public difference: number,
        public lastBalance: Balance,
        // 是否已經更新完成
        private finished: boolean = false,
        public type: string = '',
        public group: string = '',
        public custom: T = null,
    ) {
    }

    public finish() {
        this.finished = true;
    }

    public isFinished(): boolean {
        return this.finished;
    }

}
