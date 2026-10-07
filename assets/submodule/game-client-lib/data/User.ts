import { getName as userNameGetName } from '../UserNameGlobal';
import { Balance } from '../utils/Balance';

export default class User {

    constructor(
        // 使用者名称
        protected name: string = 'Guest',
        // 使用者头像
        protected imgsrc: string = '',
        // 大錢包餘額
        protected balance: Balance = new Balance(0), // 系统值没有小数点
    ) {

    }

    // 系统比值 10000 / 除数

    // 设定餘額(系统)
    public setBalance(balance: Balance) {
        this.balance = balance;
    }

    // 取餘額(正常)
    public getBalance(): Balance {
        return this.balance;
    }

    public getName(): string {
        return userNameGetName(true, this.name);
    }

    public setName(name: string) {
        this.name = name;
    }

    public getImgsrc(): string {
        return this.imgsrc;
    }

    public setImgsrc(imgsrc: string) {
        this.imgsrc = imgsrc;
    }

}
