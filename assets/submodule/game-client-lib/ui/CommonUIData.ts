import { _decorator } from 'cc';
import { postBonusEvent } from '../BonusEventGlobal';
import { getCurrencyPrefix, getCurrencySuffix } from '../CurrencyGlobal';
import ColDataBase from '../data/ColDataBase';
import { UI_LAYOUT } from '../ResizeGlobal';
import { balanceThousandth, fixThousandth } from '../utils/Balance';
import { INFINITY_MARK } from '../utils/Utils';
import { FeaturebuyButtonState } from './ColButtonFeaturebuy';
import { createSpinStateString, SpinButtonState } from './ColButtonSpin';

const { ccclass, property } = _decorator;

type CommonUIDataKey =
    'layout' |
    'currencyCode' |
    'currencySymbol' |
    'currencySymbol2' |
    'currencyTail' |
    'betable' |
    'animation' |
    'isSpecialMode' |
    'skip' |
    'skippable' |
    'spinState' |
    'spinEffect'|
    'autoRound' |
    'displaySettingOption' |
    'displaySettingCurrencySymbol' |
    'displaySpaceSpin' |
    'displayStopWhenSpecialMode' |
    'quickspin' |
    'allowSpin' |
    'allowStop' |
    'allowStopAuto' |
    'allowAutoStopAuto' |
    'levels' |
    'featureBuy' |
    'displayFeatureBuy' |
    'allowFeatureBuy' |
    'powerBet' |
    'displayPowerBet' |
    'allowPowerBet' |
    'displayFeatureBuyPanel' |
    'displayMenu' |
    'displayInfoPanel'|
    'spinSpeed' |
    'displayStartPage' |
    'startPage' |
    'displayCurrencySymbol' |
    'playEffect' |
    'playMusic' |
    'playSound' |
    'soundRatio' |
    'rawBalance' |
    'rawTotalBet' |
    'wins' |
    'level' |
    'now' |
    'version' |
    'displayBack'|
    'displayRecord'|
    'displaySetting'|
    'displayInfo'|
    'displayTotalBet' |
    'displayLevelCtrl' |
    'currencyRatio' |
    'displayDemo'|
    'bottomCustom'|
    'autoPanelAutos'|
    'gameId' |
    'displayTurbo' |
    'allowTurbo' |
    'skillCardLock' |
    'requestPending';

/**
 * @public 屬性有刻意加 public 的是 computed
 */
@ccclass
export default class CommonUIData extends ColDataBase {
    gameId: string = '';

    layout: UI_LAYOUT = UI_LAYOUT.UNKNOWN;

    currencyCode: string = '';
    /**
     * 給贏分框使用
     */
    currencySymbol: string = '';
    /**
     * 給設定頁使用
     */
    currencySymbol2: string = '';
    currencyTail: string = '';

    // 是否可下注
    betable: boolean = true;
    // 技能卡佔用中（使用確認/使用中卡/逐局領取）：鎖定 倍率/自動/FeatureBuy/PowerBet（SPIN 與選單不鎖）
    skillCardLock: boolean = false;
    // 四種核心請求（spin/draw/use/betBonus）之一在途：連 SPIN 一起鎖，
    // 由閘門單向驅動（回應/錯誤/resume 解鎖後自動恢復），不與 betable 互相覆寫
    requestPending: boolean = false;
    animation: boolean = false;

    isSpecialMode: boolean = false;
    skip: boolean = false;
    /**
     * promiseManager 是否可 skip
     */
    skippable: boolean = false;
    autoRound: number = 0;
    public autoRoundView: string = '0';

    // 停止自动系列
    stopWhenWins: boolean = false;
    stopWins: number = 0;
    stopWhenSpecialMode: boolean = false;
    stopWhenBalanceIncrease: boolean = false;
    stopBalanceIncrease: number = 0;
    stopWhenBalanceLose: boolean = false;
    stopBalacneLose: number = 0;

    public displaySettingOption: boolean = true;
    displaySettingCurrencySymbol: boolean = true;
    displayStartPage: boolean = true;
    displaySpaceSpin: boolean = true;
    displayStopWhenSpecialMode: boolean = true;

    quickspin: number = 0;

    // 按钮系列
    public displaySpin: boolean = true;
    public displaySpinAuto: boolean = false;
    public displayStop: boolean = false;
    public displayStopAuto: boolean = false;
    public displayAuto: boolean = true;
    public displayLevel: boolean = true;
    public displaySpeedUp: boolean = true;
    public displayCtrl: boolean = true;
    public displayLevelCtrl: boolean = true;

    customCtrl: boolean = false;
    customLevel: boolean = false;

    displayDemo: boolean = false;
    displayTotalBet: boolean = true;
    displayBack: boolean = true;
    displayRecord: boolean = true;
    displaySetting: boolean = true;
    displayInfo: boolean = true;

    spinState: string = `${SpinButtonState.SPIN}`;
    spinEffect: boolean = false;
    allowSpin: boolean = true;
    public allowSpinAuto: boolean = false;
    allowStop: boolean = true;
    public allowStopAuto: boolean = true;
    public allowSpinStopSpinAuto: boolean = true;
    public allowAutoStopAuto: boolean = true;
    public allowAuto: boolean = true;
    public allowLevel: boolean = true;
    public allowLessLevel: boolean = true;
    public allowMoreLevel: boolean = true;

    // panel们
    // 自动
    displayAutoPanel: boolean = false;
    autoPanelAutos: string[] = [];
    autoPanelAuto: string = '';

    // 下注等级
    displayLevelPanel: boolean = false;

    public allowMenu: boolean = true;
    displayMenu: boolean = false;
    displayInfoPanel: boolean = false;

    featureBuy: boolean = false;
    displayFeatureBuy: boolean = false;
    allowFeatureBuy: boolean = false;
    featureBuyState: number = 0;
    displayFeatureBuyPanel: boolean = false;

    powerBet: boolean = false;
    displayPowerBet: boolean = false;
    allowPowerBet: boolean = false;
    powerBetState: number = 0;

    // 设定
    displaySettingPanel: boolean = false;

    // 设定内项目
    // 停轴速度
    spinSpeed: number = 1;
    startPage: boolean = true;
    displayCurrencySymbol: boolean = false;
    spaceSpin: boolean = false;

    // 是否播放音效
    playEffect: boolean = false;
    // 是否播放音乐
    playMusic: boolean = false;
    // 是否播放声音
    playSound: boolean = false;
    // 0-1，1 为最大声
    soundRatio: number = 1;

    /**
     * 餘額 1 塊，值為 "10000"
     */
    rawBalance: string = '0';
    /**
     * 餘額 1 塊，值為 "1"
     */
    public balance: string = '0.00';
    public balanceView: string = '0.00';

    wins: string = '0.00';
    public winsView: string = '0.00';

    levels: number[] = [];
    level: number = 0;
    public levelView: string = '';

    rawTotalBet: string = '0';
    public totalBet: string = '0.00';
    public totalBetView: string = '0.00';

    now: string = '00:00';

    version: string = 'v0';
    currencyRatio: string = '';
    bottomCustom: boolean = false;

    displayTurbo:boolean = false;
    allowTurbo:boolean = false;

    public set<T extends CommonUIDataKey>(key: T, val: CommonUIData[T], force: boolean = false) {
        return super.set('' + key, val, force);
    }

    public registerComputed<T extends keyof CommonUIData, K extends keyof CommonUIData>(col: T | T[], refCols: K[] | K, fn: () => CommonUIData[T]) {
        return super.registerComputed(col, refCols, fn);
    }

    public registerCallback<K extends keyof CommonUIData>(refCols: K[] | K, fn: () => void) {
        return super.registerComputed('', refCols, fn);
    }

    protected doPre(): void {

        // 控制按钮是否出现
        this.registerComputed('displayCtrl', ['customCtrl', 'betable', 'layout', 'displayInfoPanel', 'animation', 'displayAutoPanel', 'displayLevelPanel', 'displaySettingPanel', 'displayFeatureBuyPanel'], () => {
            if (this.customCtrl) {
                return false;
            }
            // 在 手机版 及 呈现说明页时 不要出现
            if (this.layout === UI_LAYOUT.MOBILE_VERTICAL || this.layout === UI_LAYOUT.MOBILE_HORIZONTAL) {
                if (this.displayInfoPanel) {
                    return false;
                }
                if (this.animation) {
                    if (this.displayAutoPanel || this.displayLevelPanel || this.displaySettingPanel) {
                        // do nothing
                    } else {
                        return false;
                    }
                }
            }
            return true;
        });

        this.registerComputed('spinState',  ['betable', 'autoRoundView', 'skip', 'skippable', 'spinEffect', 'requestPending'], () => {
            const state = this.autoRound ?  SpinButtonState.AUTO : SpinButtonState.SPIN;
            const able = (this.betable || this.skip || this.skippable) && !this.requestPending;
            const round = this.autoRoundView;
            const effect = this.spinEffect;
            // if (effect) {
            //     this.spinEffect = false;
            // }
            return createSpinStateString({ state, able, round , effect });
        });

        // spin 可下注时出现
        this.registerComputed('displaySpin', ['betable', 'autoRound'], () => {
            return this.betable;
        });
        // 點下去是做 stop 動作
        this.registerComputed('displaySpinAuto', ['betable', 'autoRound'], () => {
            return !this.betable && this.autoRound !== 0;
        });
        // stop （不可下注 且 非自动局） 或 免费局时 出现
        this.registerComputed('displayStop', ['betable', 'autoRound', 'isSpecialMode'], () => {
            return !this.betable && this.autoRound === 0;
        });
        this.registerComputed('displayAuto', ['betable', 'autoRound', 'isSpecialMode'], () => {
            return this.autoRound === 0;
        });
        this.registerComputed(['displayStopAuto', 'allowStopAuto'], ['betable', 'autoRound', 'isSpecialMode'], () => {
            return this.autoRound !== 0;
        });
        this.registerComputed('allowSpinStopSpinAuto', ['allowSpin', 'allowAuto', 'allowSpinAuto'], () => {
            return this.allowSpin || this.allowAuto || this.allowSpinAuto;
        });
        this.registerComputed('allowAutoStopAuto', ['allowAuto', 'allowStopAuto'], () => {
            return this.allowAuto || this.allowStopAuto;
        });
        // 停止按钮，在有 自动局 及 正在转 的时候允许
        this.registerComputed(['allowStop', 'allowSpinAuto'], ['autoRound', 'skip', 'skippable', 'isSpecialMode'], () => {
            return (this.skip || this.skippable);
        });

        // level 及 auto 的调整，在可下注时允许
        // 技能卡佔用期間倍率/自動變灰；選單維持可用
        this.registerComputed(['allowLevel', 'allowAuto'], ['betable', 'skillCardLock', 'requestPending'], () => {
            return this.betable && !this.skillCardLock && !this.requestPending;
        });
        this.registerComputed('allowMenu', ['betable'], () => {
            return this.betable;
        });
        this.registerComputed('allowLessLevel', ['allowLevel', 'level'], () => {
            if (!this.allowLevel) {
                return false;
            }
            return this.levels.indexOf(this.level) !== 0;
        });
        this.registerComputed('allowMoreLevel', ['allowLevel', 'level'], () => {
            if (!this.allowLevel) {
                return false;
            }
            return this.levels.indexOf(this.level) !== this.levels.length - 1;
        });

        // balance 用 balanceNumber 算，balance 用作呈现
        this.registerComputed('balance', ['rawBalance'], () => {
            return balanceThousandth(this.rawBalance);
        });

        this.registerComputed('levelView', ['level'], () => {
            return '' + this.level;
        });

        this.registerComputed('autoRoundView', ['autoRound'], () => {
            if (this.autoRound === Infinity) {
                return INFINITY_MARK;
            }
            return '' + this.autoRound;
        });

        // 是否加上货币符号
        this.registerComputed('balanceView', ['balance', 'displayCurrencySymbol', 'currencySymbol'], () => {
            if (this.displayCurrencySymbol) {
                return getCurrencyPrefix() + this.balance + getCurrencySuffix();
            }
            return this.balance;
        });
        this.registerComputed('winsView', ['wins', 'displayCurrencySymbol', 'currencySymbol'], () => {
            if (this.displayCurrencySymbol) {
                return getCurrencyPrefix() + this.wins + getCurrencySuffix();
            }
            return this.wins;
        });
        this.registerComputed('totalBet', ['rawTotalBet'], () => {
            return fixThousandth(this.rawTotalBet);
        });
        this.registerComputed('totalBetView', ['totalBet', 'displayCurrencySymbol', 'currencySymbol'], () => {
            if (this.displayCurrencySymbol) {
                return getCurrencyPrefix() + this.totalBet + getCurrencySuffix();
            }
            return this.totalBet;
        });

        this.registerComputed('featureBuyState', ['displayFeatureBuy', 'allowFeatureBuy'], () => {
            if (!this.featureBuy) {
                return FeaturebuyButtonState.NONE;
            }
            if (this.displayFeatureBuy) {
                if (this.allowFeatureBuy) {
                    return FeaturebuyButtonState.IDLE;
                } else {
                    return FeaturebuyButtonState.DISABLE;
                }
            } else {
                return FeaturebuyButtonState.NONE;
            }
        });
        this.registerComputed('allowFeatureBuy', ['allowSpin', 'skillCardLock', 'requestPending'], () => {
            if (!this.allowSpin || this.skillCardLock || this.requestPending) {
                return false;
            }
            return true;
        });

        this.registerComputed('powerBetState', ['displayPowerBet', 'allowPowerBet'], () => {
            if (this.displayPowerBet) {
                if (this.allowPowerBet) {
                    return FeaturebuyButtonState.IDLE;
                } else {
                    return FeaturebuyButtonState.DISABLE;
                }
            } else {
                return FeaturebuyButtonState.NONE;
            }
        });
        this.registerComputed('allowPowerBet', ['allowSpin', 'skillCardLock', 'requestPending'], () => {
            if (!this.allowSpin || this.skillCardLock || this.requestPending) {
                return false;
            }
            return true;
        });

        this.registerComputed('displaySettingOption', ['displaySettingCurrencySymbol', 'displaySpaceSpin'], () => {
            return this.displaySettingCurrencySymbol || this.displaySpaceSpin;
        });

        // 控制按钮是否出现
        this.registerCallback(['layout', 'displayAutoPanel', 'displayLevelPanel', 'displayFeatureBuyPanel', 'displayMenu', 'displayInfoPanel', 'displaySettingPanel'], () => {
            let isUIOpen = false;
            if (this.layout === UI_LAYOUT.MOBILE_VERTICAL || this.layout === UI_LAYOUT.MOBILE_HORIZONTAL) {
                if (this.displayMenu) {
                    isUIOpen = true;
                }
            }
            if (isUIOpen || this.displayAutoPanel || this.displayLevelPanel || this.displayFeatureBuyPanel || this.displayInfoPanel || this.displaySettingPanel) {
                isUIOpen = true;
            }
            postBonusEvent('uiTrigger', { isUIOpen });
        });

        this.registerComputed(['displayTurbo'], ['allowTurbo'], () => {
            return this.allowTurbo;
        });
    }

    public appendCurrencySymbol(str: string):string {
        if (this.displayCurrencySymbol) {
            return getCurrencyPrefix() + str + getCurrencySuffix();
        }
        return str;
    }
}

// export function featureBuyNextLevel(commonUIData: CommonUIData, offset: number, betBase: number = 0): boolean {
//     const idx = commonUIData.levels.indexOf(commonUIData.level);
//     const nextLevel = commonUIData.levels[idx + offset];
//     if (!nextLevel) {
//         return false;
//     }
//     const fls = commonUIData.featureBuyLevels;
//     if (fls.length) {
//         return fls.some((f) => {
//             const fd = f.clone();
//             fd.updateLevel(Number(nextLevel));
//             if (betBase) {
//                 fd.updateBetBase(betBase);
//             }
//             return !fd.overFeatureBuyMax();
//         });
//     }
//     return true;
// }
