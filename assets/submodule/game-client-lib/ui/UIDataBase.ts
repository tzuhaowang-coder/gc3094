import { _decorator } from 'cc';
import ColDataBase from '../data/ColDataBase';
import { UI_LAYOUT } from '../ResizeGlobal';

const { ccclass, property } = _decorator;
@ccclass
export default class UIDataBase extends ColDataBase {

    betable: boolean = true;

    layout: UI_LAYOUT = UI_LAYOUT.UNKNOWN;

    displayStartPage: boolean = false;

    inBonus: boolean = false;
    inFG: boolean = false;
    inSpecialMode3: boolean = false;
    inSpecialMode4: boolean = false;

    // 复合值
    private isPCH: boolean = false;
    private isH: boolean = false;
    private isV: boolean = false;
    private isM: boolean = false;
    private isMH: boolean = false;
    private isMV: boolean = false;

    private inNG: boolean = true;
    private inNGAndH: boolean = false;
    private inNGAndV: boolean = false;
    private inBonusAndH: boolean = false;
    private inBonusAndV: boolean = false;
    private inFGAndH: boolean = false;
    private inFGAndV: boolean = false;
    private inSpecialMode3AndH: boolean = false;
    private inSpecialMode3AndV: boolean = false;
    private inSpecialMode4AndH: boolean = false;
    private inSpecialMode4AndV: boolean = false;
    private displayStartPageH: boolean = false;
    private displayStartPageV: boolean = false;

    public registCallback<K extends keyof UIDataBase>(refCols: K[] | K, fn: () => void) {
        return this.registerComputed('', refCols, fn);
    }

    protected doPre(): void {
        this.registerComputed('isPCH', ['layout'], () => {
            return this.layout === UI_LAYOUT.PC_HORIZONTAL;
        });
        this.registerComputed('isM', ['layout'], () => {
            return this.layout === UI_LAYOUT.MOBILE_HORIZONTAL || this.layout === UI_LAYOUT.MOBILE_VERTICAL;
        });
        this.registerComputed('isMH', ['layout'], () => {
            return this.layout === UI_LAYOUT.MOBILE_HORIZONTAL;
        });
        this.registerComputed('isMV', ['layout'], () => {
            return this.layout === UI_LAYOUT.MOBILE_VERTICAL;
        });

        this.registerComputed('inNG', ['inBonus', 'inFG', 'inSpecialMode3', 'inSpecialMode4'], () => {
            return !(this.inBonus || this.inFG || this.inSpecialMode3 || this.inSpecialMode4);
        });
        this.registerComputed('inNGAndH', ['inNG', 'layout'], () => {
            return this.inNG && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('inNGAndV', ['inNG', 'layout'], () => {
            return this.inNG && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });

        this.registerComputed('inBonusAndH', ['inBonus', 'layout'], () => {
            return this.inBonus && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('inBonusAndV', ['inBonus', 'layout'], () => {
            return this.inBonus && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });

        this.registerComputed('inFGAndH', ['inFG', 'layout'], () => {
            return this.inFG && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('inFGAndV', ['inFG', 'layout'], () => {
            return this.inFG && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });

        this.registerComputed('inSpecialMode3AndH', ['inSpecialMode3', 'layout'], () => {
            return this.inSpecialMode3 && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('inSpecialMode3AndV', ['inSpecialMode3', 'layout'], () => {
            return this.inSpecialMode3 && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });

        this.registerComputed('inSpecialMode4AndH', ['inSpecialMode4', 'layout'], () => {
            return this.inSpecialMode4 && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('inSpecialMode4AndV', ['inSpecialMode4', 'layout'], () => {
            return this.inSpecialMode4 && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });

        this.registerComputed('isH', ['layout'], () => {
            return this.layout !== UI_LAYOUT.MOBILE_VERTICAL;
        });
        this.registerComputed('isV', ['layout'], () => {
            return this.layout === UI_LAYOUT.MOBILE_VERTICAL;
        });

        this.registerComputed('displayStartPageH', ['displayStartPage', 'layout'], () => {
            return this.displayStartPage && (this.layout !== UI_LAYOUT.MOBILE_VERTICAL);
        });
        this.registerComputed('displayStartPageV', ['displayStartPage', 'layout'], () => {
            return this.displayStartPage && (this.layout === UI_LAYOUT.MOBILE_VERTICAL);
        });
    }
}
