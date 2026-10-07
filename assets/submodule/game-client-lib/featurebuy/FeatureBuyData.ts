import ColDataBase from '../data/ColDataBase';
import { fixThousandthK, safeMul } from '../utils/Balance';

type FeatureBuyDataKey =
    'level'|
    'betBase'|
    'key'|
    'odds'|
    'limit'|
    'displayCurrencySymbol'
;

export default class FeatureBuyData extends ColDataBase {

    level: number = 0;
    betBase: number = 0;
    key: string = ''; // FG
    odds: number = 0;
    limit: number = 0;
    public powerBet: string = '';
    displayCurrencySymbol: boolean = false;
    public string: string; // FG#odds // FG#10000
    public totalBet: number = 0;
    public totalBetView: string = '';
    public overLimit: boolean = false;

    protected doPre(): void {
        this.registerComputed('string', ['key', 'odds'], () => {
            return `${this.key}#${this.odds}`;
        });
        this.registerComputed('totalBet', ['betBase', 'level', 'odds'], () => {
            return safeMul(this.betBase, this.level, this.odds);
        });
        this.registerComputed('totalBetView', ['betBase', 'level', 'odds'], () => {
            return fixThousandthK('' + this.totalBet);
        });
        this.registerComputed('overLimit', ['totalBet', 'limit'], () => {
            return this.limit ? safeMul(this.totalBet, 1e4) > this.limit : false;
        });
    }

    public set(col: FeatureBuyDataKey, val: any, force?: boolean): void {
        super.set(col, val, force);
    }
}

export class FeatureBuyInfo2 {
    constructor(
        public featureBuy: string,
        public featureBuyLevel: number,
        public powerBet: string,
    ) {

    }
}
