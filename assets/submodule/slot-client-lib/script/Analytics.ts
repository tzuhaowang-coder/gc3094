import { SpinResult } from 'slot-protobuf/ts/messages/messages_pb';
import { AnalyticsAction, AuthData, ClickData, DisconnectData, PingData, ShowData, SpinData } from '../../game-client-lib/analytics/AnalyticsTypes';
import { hasWindowParent, report, setGAPatchVersion } from '../../game-client-lib/IframeGlobal';
import { Balance, balanceAdd, balanceGte, balanceMul, balanceNumber, maxSafeBalanceNumber, safeAdd, safeMul } from '../../game-client-lib/utils/Balance';
import { flattenDeep, sumReducer } from '../../game-client-lib/utils/Utils';
import { RoundInfo, WinType } from '../protobuf/ProtobufWarp';
import { isSpecialGame } from './LobbyBase';
let IS_FIRST_SPIN = false;
const GA_TIME = 60e3;
const DEFAULT_CURRENCY = 'CNY';
const SLOT_GA_VERSION = '0';
const REPORT_ITEMS_LIMIT  = 15; // items 塞超過此限制後，立刻送出 report，因 turbo 下注累積 Item 過多。
setGAPatchVersion(SLOT_GA_VERSION);

enum BET_ID {
    GA_BET = 'bet',
    GA_FG = 'fg',
    GA_BET_10 = 'bet10', // first 10 bet
    GA_BET_100 = 'bet100', // first 100 bet
    GA_BW_20 = 'bw20',
    GA_BW_100 = 'bw100',
    GA_BW_500 = 'bw500',
}

const TRANSACTION_ID = {
    [BET_ID.GA_BET]: '100',
    [BET_ID.GA_FG]: '101',
    [BET_ID.GA_BET_10]: '102',
    [BET_ID.GA_BET_100]: '103',
    [BET_ID.GA_BW_20]: '104',
    [BET_ID.GA_BW_100]: '105',
    [BET_ID.GA_BW_500]: '106',
};

function genTransactionID(id: number, key: string): number {
    return id + TRANSACTION_ID[key];
}
class SpecialData {

    public betTimes: number = 0;
    public totalBet: number = 0;
    public totalWin: number = 0;
    public fastTimes: number = 0;
    public autoTimes: number = 0;
    public audio: number = 0;
    public vertical: number = 0;
    public setting_win: number = 0;
    public setting_incbal: number = 0;
    public setting_decbal: number = 0;
    public setting_special: number = 0;
    constructor(
        public category: string,
    ) {

    }
    public reset() {
        this.betTimes = 0;
        this.totalBet = 0;
        this.totalWin = 0;
        this.fastTimes = 0;
        this.autoTimes = 0;
        this.audio = 0;
        this.vertical = 0;
        this.setting_win = 0;
        this.setting_incbal = 0;
        this.setting_decbal = 0;
        this.setting_special = 0;
    }
}
class Item {
    public item_category2: string = '';
    public item_category3: string = '';
    public quantity: number = 0; // 下注次數
    public betTimes: number = 0;
    public fastTimes: number = 0;
    public autoTimes: number = 0;
    public totalBet: number = 0;
    public price: number = 0;
    public totalWin: number = 0;
    public lastBalanceB: Balance = new Balance(0);
    public lastBalance: number = 0;
    public sku: string = '';
    // 事件名稱 purchase 開關音效 (audio計數) 橫直版(vertical計數) 單局至少贏得(setting_win 計數)、餘額若增加(setting_incbal 計數)、餘額或減少(setting_decbal 計數)、進入特殊模式(setting_special 計數)
    public audio: number = 0;
    public vertical: number = 0;
    public setting_win: number = 0;
    public setting_incbal: number = 0;
    public setting_decbal: number = 0;
    public setting_special: number = 0;
    /**
     * @param item_id  用來製作transaction_id
     * @param item_name bet/fg/bet10/bet100/win20/win100/win500
     * @param item_category 類別
     * @param item_brand 幣別
     * @param price 下注金額
     * @param totalWin 贏分
     */
    constructor(
        public item_id: number,
        public item_name: string,
        public item_category: string, // bet/fg/bet10/bet100/win20/win100/win50 bet/0.1/fg
        public item_brand: string,
        public currency: string,
    ) {
        this.sku = item_name + item_category.split('/')[1].replace('.', '-');
        this.item_category2 = item_category;
        this.item_category3 = item_category;
    }

    public clone(): Item {
        const i = new Item(this.item_id, this.item_name, this.item_category, this.item_brand, this.currency);
        i.quantity = this.quantity;
        i.betTimes = this.betTimes;
        i.fastTimes = this.fastTimes;
        i.autoTimes = this.autoTimes;
        i.totalBet = this.totalBet;
        i.price = this.price;
        i.totalWin = this.totalWin;
        i.sku = this.sku;
        i.lastBalance = maxSafeBalanceNumber(this.lastBalanceB.clone());
        i.audio = this.audio;
        i.vertical = this.vertical;
        i.setting_win = this.setting_win;
        i.setting_incbal = this.setting_incbal;
        i.setting_decbal = this.setting_decbal;
        i.setting_special = this.setting_special;
        return i;
    }
}

interface SpinOpt {
    auto: boolean;
    audio: boolean;
    vertical: boolean;
    setting_win: boolean;
    setting_incbal: boolean;
    setting_decbal: boolean;
    setting_special: boolean;
}

let globalCurrency = 'CNY';
// GA
export default class Analytics {

    public gameId: string = '';

    // 判斷送出 spin 時，標記是否使用 auto 來 spin。
    private isAutoSpin: boolean = false;
    // 紀錄使用 auto 時的數量種類。
    private autoTotal:number = 0;
    // auto 某數量種類，使用幾次 。
    private autoCount:number = 0;

    // 預設幣別
    private currency: string = '';

    // 每分鐘回傳下注清單
    private items: Map<string, Item[]> = new Map<string, Item[]>();

    private specialDataMap: Map<BET_ID, SpecialData> = new Map<BET_ID, SpecialData>();

    private eventSpinResultCount:number = 0;

    constructor(gameId: string, currency: string = DEFAULT_CURRENCY) {
        this.gameId = gameId;
        this.currency = currency;
        globalCurrency = currency;
        this.specialDataMap.set(BET_ID.GA_FG, new SpecialData(BET_ID.GA_FG));
        this.specialDataMap.set(BET_ID.GA_BW_20, new SpecialData(BET_ID.GA_BW_20));
        this.specialDataMap.set(BET_ID.GA_BW_100, new SpecialData(BET_ID.GA_BW_100));
        this.specialDataMap.set(BET_ID.GA_BW_500, new SpecialData(BET_ID.GA_BW_500));
        this.specialDataMap.set(BET_ID.GA_BET_10, new SpecialData(BET_ID.GA_BET_10));
        this.specialDataMap.set(BET_ID.GA_BET_100, new SpecialData(BET_ID.GA_BET_100));
        setInterval(this.intervalReport.bind(this), GA_TIME);
    }

    public eventSpinResult(level: number, totalBet: number, featureBuy: string, featureBuyLevel: number, selection: number, fgSelection: number, spinRes: SpinResult, speedUp: number, opt: SpinOpt) {
        this.eventSpinResultCount += 1;
        const roundId = spinRes.getRoundId(); // 局號
        const ris = spinRes.getRoundInfosList();
        const lastRi = ris[ris.length - 1];
        const balance = new Balance(lastRi.getBalance()); // 餘額
        const realTotalBet = balanceNumber(safeMul(totalBet, featureBuyLevel));
        const realTotalWin = balanceAdd(...spinRes.getRoundInfosList().map(r => r.getTotalwin())).toNumber();
        const betLevel = realTotalBet + ''; // 注區
        // report by intervalReport
        // bet
        // 初始Items
        if (!this.items.has(betLevel)) {
            this.items.set(betLevel, []);
        }
        const datas = this.items.get(betLevel);
        const id = genTransactionID(roundId, BET_ID.GA_BET);
        const item_category = `${BET_ID.GA_BET}/${betLevel}/${featureBuy ? featureBuy : 'NG'}/${selection}/${fgSelection}/${speedUp}`;
        const item = new Item(id, BET_ID.GA_BET, item_category, this.currency, this.currency);
        item.price = realTotalBet;
        item.quantity += 1; // 加總數量
        item.totalBet = realTotalBet;
        item.totalWin = realTotalWin;
        item.lastBalanceB = balance;
        item.betTimes += 1;
        item.fastTimes += (speedUp ? 1 : 0);
        item.autoTimes += (opt.auto ? 1 : 0);
        item.audio += (opt.audio ? 1 : 0);
        item.vertical += (opt.vertical ? 1 : 0);
        item.setting_win += (opt.setting_win ? 1 : 0);
        item.setting_incbal += (opt.setting_incbal ? 1 : 0);
        item.setting_decbal += (opt.setting_decbal ? 1 : 0);
        item.setting_special += (opt.setting_special ? 1 : 0);
        datas.push(item);

        // report by specialReport
        const appendWithTotalWin = this.appendSpecialData(realTotalBet, realTotalWin, speedUp, opt);
        const append = this.appendSpecialData(realTotalBet, 0, speedUp, opt);

        const reportWithTotalBet = this.specialReport(roundId, betLevel, featureBuy, balance, realTotalBet);
        const reportSpecial = this.specialReport(roundId, betLevel, featureBuy, balance, 0);
        // bet 10
        const bet10 = this.specialDataMap.get(BET_ID.GA_BET_10);
        if (bet10 && bet10.betTimes <= 10) {
            appendWithTotalWin(BET_ID.GA_BET_10);
            if (bet10.betTimes === 10) {
                reportSpecial(BET_ID.GA_BET_10);
                this.specialDataMap.delete(BET_ID.GA_BET_10);
            }
        }
        // bet 100
        const bet100 = this.specialDataMap.get(BET_ID.GA_BET_100);
        if (bet100 && bet100.betTimes <= 100) {
            appendWithTotalWin(BET_ID.GA_BET_100);
            if (bet100.betTimes === 100) {
                reportSpecial(BET_ID.GA_BET_100);
                this.specialDataMap.delete(BET_ID.GA_BET_100);
            }
        }
        // fg
        const isFG = spinRes.getRoundInfosList().findIndex(r => isSpecialGame(r.getSpinType()) === true) !== -1;
        if (isFG) {
            appendWithTotalWin(BET_ID.GA_FG);
            reportWithTotalBet(BET_ID.GA_FG);
        } else {
            append(BET_ID.GA_FG);
        }
        // bw 20, bw 100, bw 500
        if (balanceGte(realTotalWin, balanceMul(balanceNumber(totalBet), 20))) {
            let key = BET_ID.GA_BW_20;
            if (balanceGte(realTotalWin, balanceMul(balanceNumber(totalBet), 500))) {
                key = BET_ID.GA_BW_500;
            } else if (balanceGte(realTotalWin, balanceMul(balanceNumber(totalBet), 100))) {
                key = BET_ID.GA_BW_100;
            }
            appendWithTotalWin(key);
            reportWithTotalBet(key);
        } else {
            append(BET_ID.GA_BW_500);
            append(BET_ID.GA_BW_100);
            append(BET_ID.GA_BW_20);
        }

        if (this.eventSpinResultCount === REPORT_ITEMS_LIMIT) {
            this.intervalReport();
        }
    }

    private intervalReport() {
        if (this.items.size === 0) {
            return;
        }
        const flattenItems = flattenDeep(Array.from(this.items.values()));
        const tempItems = new Map<string, Item[]>();
        flattenItems.forEach((it) => {
            const key = it.item_category;
            if (!tempItems.has(key)) {
                tempItems.set(key, []);
            }
            const data = tempItems.get(key);
            data.push(it);
        });
        const gameId = this.gameId;
        tempItems.forEach((items) => {
            const itemSort = items.sort((a, b) => b.item_id - a.item_id);
            const balance = maxSafeBalanceNumber(itemSort[0].lastBalanceB.clone());
            const args = genPurchase(itemSort[0].item_id, items, { gameId, balance });
            const tempKey = items[0].item_category;
            // log('ga', tempKey, args);
            report(`purchase`, '', tempKey, args);
        });
        this.items.clear();
        this.eventSpinResultCount = 0;
    }

    private appendSpecialData(totalBet: number, totalWin: number, speedUp: number, opt: SpinOpt) {
        return (key: BET_ID) => {
            const sd = this.specialDataMap.get(key);
            sd.betTimes += 1;
            sd.totalBet = safeAdd(sd.totalBet, totalBet);
            sd.fastTimes = (speedUp ? 1 : 0);
            sd.autoTimes += (opt.auto ? 1 : 0);
            sd.audio += (opt.audio ? 1 : 0);
            sd.vertical += (opt.vertical ? 1 : 0);
            sd.setting_win += (opt.setting_win ? 1 : 0);
            sd.setting_incbal += (opt.setting_incbal ? 1 : 0);
            sd.setting_decbal += (opt.setting_decbal ? 1 : 0);
            sd.setting_special += (opt.setting_special ? 1 : 0);
            if (totalWin) {
                sd.totalWin = safeAdd(sd.totalWin, totalWin);
            }
        };
    }

    /**
     * @param key BET_ID
     */
    private specialReport(roundId: number, betLevel: string, featureBuy, balanceB: Balance, totalBet: number) {
        return (key: BET_ID) => {
            const sd = this.specialDataMap.get(key);
            const gameId = this.gameId;
            const id = genTransactionID(roundId, key);
            const item_category = `${key}/${betLevel}/${featureBuy ? featureBuy : 'NG'}`;
            const item = new Item(id, key, item_category, this.currency, this.currency);
            item.quantity = 1;
            item.price = totalBet;
            item.totalWin = sd.totalWin;
            item.lastBalanceB = balanceB;
            item.betTimes = sd.betTimes;
            item.totalBet = sd.totalBet;
            item.fastTimes = sd.fastTimes;
            item.autoTimes = sd.autoTimes;
            item.audio = sd.audio;
            item.vertical = sd.vertical;
            item.setting_win = sd.setting_win;
            item.setting_incbal = sd.setting_incbal;
            item.setting_decbal = sd.setting_decbal;
            item.setting_special = sd.setting_special;
            const balance = maxSafeBalanceNumber(balanceB.clone());
            const args = genPurchase(item.item_id, [item], { gameId, balance });
            sd.reset();
            let tempKey: string = key;
            if (key === BET_ID.GA_BET_10 || key === BET_ID.GA_BET_100) {
                tempKey = key;
                args.content = key;
            }
            // log('ga', tempKey, args);
            report(`purchase`, '', tempKey, args);
        };
    }

    /**
     * 判斷送出 spin 時，標記是否使用 auto 來 spin。
     * 並且累積使用幾次
     */
    public setIsAutoSpin(able: boolean, autoTotal:number = null) {
        this.isAutoSpin = able;
        if (able) {
            if (autoTotal) { // 設定 auto 使用總局數
                this.autoTotal = autoTotal;
                this.autoCount = 0;
            }
            this.autoCount += 1; // 紀錄此種 auto 累積幾次
        }
    }
    public getIsAutoSpin() {
        return this.isAutoSpin;
    }
    public getAutoTotal():number {
        return this.autoTotal === Infinity  ? -1 : this.autoTotal; // 無限局就回傳 -1
    }
    public getAutoCount():number {
        return this.autoCount;
    }
}

/**
 * @param id
 * @param items 訂單
 * @param args 自定義參數
 */
function genPurchase(id: number, items: Item[], args?: any) {
    let value = items.map(r => Number(r.item_category.split('/')[1]) * r.quantity).reduce(sumReducer, 0);
    value = isNaN(value) ? 0 : value;
    items = items.map((i) => {
        const i2: Item = i.clone();
        delete i2.item_id;
        delete i2.lastBalanceB;
        return i2;
    });

    const content = items[0].item_category;
    const totalBet = balanceAdd(...items.map(a => a.totalBet)).mul(10000).toNumber();
    const totalWin = balanceAdd(...items.map(a => a.totalWin)).mul(10000).toNumber();
    const betTimes = items.map(a => a.betTimes).reduce(sumReducer, 0);
    const fastTimes = items.map(a => a.fastTimes).reduce(sumReducer, 0);
    const autoTimes = items.map(a => a.autoTimes).reduce(sumReducer, 0);
    const audio = items.map(a => a.audio).reduce(sumReducer, 0);
    const vertical = items.map(a => a.vertical).reduce(sumReducer, 0);
    const setting_win = items.map(a => a.setting_win).reduce(sumReducer, 0);
    const setting_incbal = items.map(a => a.setting_incbal).reduce(sumReducer, 0);
    const setting_decbal = items.map(a => a.setting_decbal).reduce(sumReducer, 0);
    const setting_special = items.map(a => a.setting_special).reduce(sumReducer, 0);
    return Object.assign(
        {
            content,
            value,
            items,
            totalBet,
            totalWin,
            betTimes,
            fastTimes,
            autoTimes,
            transaction_id: id,
            currency: globalCurrency,
            audio,
            vertical,
            setting_win,
            setting_incbal,
            setting_decbal,
            setting_special,
        },
        args,
    );
}

export function analyticsAuthEnd(data: AuthData) {
    postMessage(AnalyticsAction.AUTH_END, data);
}
export function analyticsClick(data: ClickData) {
    postMessage(AnalyticsAction.CLICK, data);
}
export function analyticsSpin(data: SpinData) {
    postMessage(AnalyticsAction.SPIN, data);
}
export function analyticsShow(data: ShowData = showData) {
    showData.endTime = Date.now(); // 紀錄最後時間。
    postMessage(AnalyticsAction.SHOW, data); // 送出
    showData = null; // 清空暫存資料
}
export function analyticsDisconnect(data: DisconnectData) {
    postMessage(AnalyticsAction.DISCONNECT, data);
}
export function analyticsPing(data: PingData) {
    postMessage(AnalyticsAction.PING, data);
}

function postMessage(method: AnalyticsAction, data: any = null) {
    if (hasWindowParent()) {
        window.parent.postMessage(JSON.stringify({ data: { method, data }, method: 'analytics' }), '*');
    }
}

let showData: ShowData = null;
export function setAnalyticsShowDataInit(spinResult:SpinResult) {
    const rounds = spinResult.getRoundInfosList();
    const startTime = Date.now();
    const totalRound = rounds.length;
    const betId = spinResult.getBetid();
    let winType = WinType.WIN_NONE; // winTyp : 沒bg、fg 就給ng，有的話就抓最先看到的，先進fg再進bg就是fg，先進bg再進fg就是bg
    rounds.map(r => Number(r.getType())).forEach((type) => {
        if ((winType > WinType.WIN_NORMAL) || (type < winType)) { // 已出現特殊模式 or 有NG贏分
            return;
        }
        winType = type;
    });
    showData = { startTime, totalRound, betId, winType, fastNG: false, fastFG: false, endTime: startTime };
}
export function setAnalyticsShowDataClick(roundInfos:RoundInfo[], roundIndex:number) {
    if (!showData) {
        return;
    }
    const isSpecialRound = isSpecialGame(roundInfos[roundIndex].getSpinType());
    if (isSpecialRound) {
        showData.fastFG = true;
    }else {
        showData.fastNG = true;
    }
}

export function getIsFirstSpin() {
    return IS_FIRST_SPIN;
}
export function setIsFirstSpin() {
    return IS_FIRST_SPIN = true;
}
