
import { _decorator, Label, Node } from 'cc';
import { getCurrencyISO } from '../CurrencyGlobal';
import FeatureBuy from '../featurebuy/FeatureBuy';
import { AutoOpt, BalanceOpt, htmlControlOpen, LevelOpt } from '../HtmlControlGlobal';
import { translate } from '../I18nGlobal';
import { EXTRA_1180, IS_GUEST } from '../ParamsGlobal';
import BonusEventUI from '../script/BonusEventUI';
import { fixThousandth, safeMul } from '../utils/Balance';
import { INFINITY_MARK } from '../utils/Utils';
import CommonUI, { AutoRoundHandler, BET_LEVEL_ACTION, LevelHandler, PanelCloseOpt } from './CommonUI';

const { ccclass, property } = _decorator;

@ccclass
export default class CommonUISlot extends CommonUI {

    public featureBuy: FeatureBuy = null;

    @property(BonusEventUI)
    bonusEventUI: BonusEventUI = null;

    @property(Node)
    bottomCustomNode: Node = null;

    @property(Node)
    powerBetNode: Node = null;

    @property(Node)
    featurebuyNode: Node = null;

    public lobbyHandler: Function = null;

    public recordHandler: Function = null;

    public infoHandler: Function = null;

    public spinHandler: Function = null;

    public stopHandler: Function = null;

    public stopAutoHandler: Function = null;

    public levelHandler: LevelHandler = null;

    public autoHandler:AutoRoundHandler = null;

    public featurebuyClickHandler:Function = null;

    public textChangeHandler: Function = null;

    public autoOptionClickHandler: Function = null;
    public quickspinClickHandler: Function = null;

    public iconColor:string = '';

    public txtColor:string = '';

    public btnColor:string = '';

    public getBetBase: () => number = null ;

    // public startPageHandler: Function = null;

    public toggleSound(able: boolean = !this.data.playSound) {
        this.data.set('playEffect', able);
        this.data.set('playMusic', able);
        this.data.set('playSound', able);
    }

    public toggleMusic(able: boolean = !this.data.playMusic) {
        this.data.set('playMusic', able);
        if (able) {
            if (!this.data.playSound) {
                this.data.set('playSound', true);
            }
        } else {
            if (!this.data.playEffect) {
                this.data.set('playSound', false);
            }
        }
    }

    public toggleEffect(able: boolean = !this.data.playEffect) {
        this.data.set('playEffect', able);
        if (able) {
            if (!this.data.playSound) {
                this.data.set('playSound', true);
            }
        } else {
            if (!this.data.playMusic) {
                this.data.set('playSound', false);
            }
        }
    }

    public toggleMenu(able: boolean = !this.data.displayMenu): boolean {
        this.data.set('displayMenu', able);
        return able;
    }

    public rotateQuickspin(quickspin: number = this.data.quickspin + 1): number {
        if (quickspin > 2 || quickspin < 0) {
            quickspin = 0;
        }
        this.data.set('quickspin', quickspin);
        return quickspin;
    }

    public closePanel(opt: PanelCloseOpt = { featureBuy: false }) {
        this.toggleMenu(false);
        if (!opt.featureBuy) {
            // this.toggleFeatureBuyPanel(false);
        }
    }

    autoRoundViewCallback(value: string, label: Label) {
        if (value !== INFINITY_MARK) {
            label.string = value;
        } else {
            label.string = '';
        }
    }

    onLobbyClick() {
        this.lobbyHandler?.();
    }

    onRecordClick() {
        this.recordHandler?.();
    }

    onInfoClick() {
        this.infoHandler?.();
    }

    onSpinClick() {
        this.spinHandler?.();
    }

    onSpinStopStopAutoClick() {
        if (this.data.autoRound) {
            this.stopAutoHandler?.();
        } else {
            if (this.data.displaySpin) {
                this.spinHandler?.();
            } else {
                this.stopHandler?.();
            }
        }
    }

    onStopClick() {
        this.stopHandler?.();
    }

    onStopAutoClick() {
        this.stopAutoHandler?.();
    }

    onAutoStopAutoClick() {
        if (this.data.displayAuto) {
            // this.onAutoPanelToggleClick();
        } else {
            this.stopAutoHandler?.();
        }
    }

    onLevelClick(levelString: BET_LEVEL_ACTION) {
        this.levelHandler?.(levelString);
        // this.onLevelPanelCloseClick();
    }

    onLevelMoreClick() {
        this.levelHandler?.(BET_LEVEL_ACTION.MORE);
    }

    onLevelLessClick() {
        this.levelHandler?.(BET_LEVEL_ACTION.LESS);
    }

    onAutoClick(autoString: string) {
        this.autoHandler?.(autoString);
    }

    onMenuCloseClick() {
        this.toggleMenu(false);
    }

    onMenuOpenClick() {
        this.toggleMenu(true);
    }

    onMenuToggleClick() {
        this.toggleMenu();
    }

    onSoundOffClick() {
        this.toggleSound(false);
    }

    onSoundOnClick() {
        this.toggleSound(true);
    }

    onSoundToggleClick() {
        this.toggleSound();
    }

    onEffectOnClick() {
        this.toggleEffect(true);
    }

    onEffectOffClick() {
        this.toggleEffect(false);
    }

    onEffectToggleClick() {
        this.toggleEffect();
    }

    onMusicOnClick() {
        this.toggleMusic(true);
    }

    onMusicOffClick() {
        this.toggleMusic(false);
    }

    onMusicToggleClick() {
        this.toggleMusic();
    }

    onLevelOpenClick() {
        const levelOpt:LevelOpt = {
            levelOptions: this.data.levels.map(level => this.data.appendCurrencySymbol(fixThousandth('' + safeMul(this.getBetBase(), level)))),
            balance: this.data.balanceView,
            win: this.data.winsView,
            totalBet: this.data.totalBetView,
            btnColor: this.btnColor,
            iconColor: this.iconColor,
            txtColor: this.txtColor,
            title: translate('COMMONUI.total_bet'),
            subTxt: this.data.displayCurrencySymbol ? `(${translate('LOBBY.currency_string')}${getCurrencyISO()})` : '',
            isGuest: IS_GUEST,
            currLevel: this.data.appendCurrencySymbol(fixThousandth('' + safeMul(this.getBetBase(), this.data.level))),
        };
        htmlControlOpen('level', levelOpt);
    }

    onAutoOpenClick() {
        const autoOpt:AutoOpt = {
            autoSpinOptions: this.data.autoPanelAutos,
            balance: this.data.balanceView,
            win: this.data.winsView,
            totalBet: this.data.totalBetView,
            btnColor: this.btnColor,
            iconColor: this.iconColor,
            txtColor: this.txtColor,
            title: translate('COMMONUI.auto_spin'),
            subTxt: translate('COMMONUI.auto_rounds'),
            turboTxt:translate('COMMONUI.turbo'),
            turboInfoTxt:`${translate('COMMONUI.turbo_info_msg_1')}#${translate('COMMONUI.turbo_info_msg_2')}#${translate('COMMONUI.turbo_info_msg_3_cocos3')}#${translate('COMMONUI.turbo_info_msg_4')}`,
            isGuest: IS_GUEST,
            extra1180:EXTRA_1180,
        };
        htmlControlOpen('auto', autoOpt);
    }

    onBalanceOpenClick() {
        const balanceOpt:BalanceOpt = {
            balance: this.data.balanceView,
            iconColor: this.iconColor,
            txtColor: this.txtColor,
            title: translate('COMMONUI.balance'),
            subTxt: getCurrencyISO(),

            isGuest: IS_GUEST,
        };
        htmlControlOpen('balance', balanceOpt);
    }

    public toggleFeatureBuyPanel(able: boolean = !this.data.displayFeatureBuyPanel): boolean {
        this.data.set('displayFeatureBuyPanel', able);
        if (able) {
            this.featureBuy.updateLevel(this.data.level);
        }
        return able;
    }

    onFeatureBuyToggleClick() {
        const settingAble = this.toggleFeatureBuyPanel();
        if (settingAble) {
            this.closePanel({ powerBet: true });
            this.toggleMenu(false);
        }
    }

    onPowerBetToggleClick() {
        this.data.set('powerBet', !this.data.powerBet);
    }

    onQuickspinClick() {
        if (this.data.allowTurbo) {// 啟用 turbo 時，不可以更換 quickspin
            return;
        }
        const prev = this.data.quickspin;
        const value = this.rotateQuickspin();
        this.quickspinClickHandler?.(prev, value);
    }

}
