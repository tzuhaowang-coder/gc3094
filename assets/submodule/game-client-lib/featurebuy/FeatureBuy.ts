
import { _decorator, Component } from 'cc';
import CommonButton from '../component/CommonButton';
import { ColLabel } from '../data/ColLabel';
import { translate } from '../I18nGlobal';
import { FeatureBuyHandler } from '../ui/CommonUI';
import CommonUIData from '../ui/CommonUIData';
import { balanceNumber, fixThousandth, safeMul } from '../utils/Balance';
import FeatureBuyItem from './FeatureBuyItem';

const { ccclass, property } = _decorator;

@ccclass
export default class FeatureBuy extends Component {

    @property(CommonButton)
    lessButton: CommonButton = null;

    @property(CommonButton)
    moreButton: CommonButton = null;

    @property(CommonButton)
    buyButton: CommonButton = null;

    @property(CommonButton)
    cancelButton: CommonButton = null;

    @property([FeatureBuyItem])
    items: FeatureBuyItem[] = [];

    @property(ColLabel)
    totalBetLabel: ColLabel = null;

    @property(ColLabel)
    messageLabel: ColLabel = null;

    private item: FeatureBuyItem = null;

    public levels: number[] = [];

    public betBase: number = 0;

    public level: number = 0;

    public commonUIData: CommonUIData = null;

    public onFeatureBuyClick: FeatureBuyHandler = null;

    onLoad() {
        const bh = new Component.EventHandler();
        bh.target = this.node;
        bh.component = 'FeatureBuy';
        bh.handler = 'onBuyClick';
        const ch = new Component.EventHandler();
        ch.target = this.node;
        ch.component = 'FeatureBuy';
        ch.handler = 'onCancelClick';
        this.buyButton.onClickHandlers.push(bh);
        this.cancelButton.onClickHandlers.push(ch);

        this.items.forEach((item, idx) => {
            const h = new Component.EventHandler();
            h.target = this.node;
            h.component = 'FeatureBuy';
            h.handler = 'onItemClick';
            h.customEventData = '' + idx;
            const b = item.getComponent(CommonButton) || item.getComponentInChildren(CommonButton);
            b.onClickHandlers.push(h);
        });
    }

    start() {
        if (this.items.length) {
            this.onItemClick(null, '0');
        }
    }

    public updateBetBaseLevels(betBase: number, levels: number[]) {
        this.betBase = betBase;
        this.levels = levels.map(lv => balanceNumber(lv));
    }

    public updateLevel(level: number) {
        this.level = level;

        this.items.forEach((item) => {
            const d = item.getData();
            if (d) {
                d.set('level', level);
            }
        });

        let msg = '';
        let buyable = true;
        if (this.item) {
            const d = this.item.getData();
            if (!d || d.overLimit) {
                msg = translate('FEATUREBUY.bet_limit');
                buyable = false;
            }
        }

        this.totalBetLabel.reset(fixThousandth('' + safeMul(this.betBase, this.level)));
        this.messageLabel.reset(msg);

        const idx = this.levels.indexOf(this.level);
        const idx0 = idx === 0;
        const idx1 = idx === this.levels.length - 1;
        this.lessButton.interactable = !idx0;
        this.moreButton.interactable = !idx1;
        this.buyButton.interactable = buyable;
    }

    public updateDisplayCurrencySymbol() {
        const display = this.commonUIData.displayCurrencySymbol;
        this.items.forEach((item) => {
            const d = item.getData();
            if (d) {
                d.set('displayCurrencySymbol', display);
            }
        });
    }

    onLessClick() {
        let l = this.level;
        let idx = this.levels.indexOf(l);
        if (1 <= idx) {
            idx -= 1;
        }
        l = this.levels[idx];
        this.updateLevel(l);
    }

    onMoreClick() {
        let l = this.level;
        let idx = this.levels.indexOf(l);
        if (idx < this.levels.length) {
            idx += 1;
        }
        l = this.levels[idx];
        this.updateLevel(l);
    }

    onItemClick(any: any, data: string) {
        const idx = Number(data);
        this.items.forEach((item, i) => {
            const cur = idx === i;
            const b = item.getComponent(CommonButton) || item.getComponentInChildren(CommonButton);
            b.isChecked = cur;
            if (cur) {
                this.item = item;
            }
        });
        this.updateLevel(this.level);
    }

    onBuyClick() {
        if (!this.item) {
            return;
        }
        const d = this.item.getData();
        if (d.overLimit) {
            return;
        }
        this.onFeatureBuyClick(d.string, this.level, d.powerBet);
        this.commonUIData.set('displayFeatureBuyPanel', false);
    }

    onCancelClick() {
        this.commonUIData.set('displayFeatureBuyPanel', false);
    }
}
