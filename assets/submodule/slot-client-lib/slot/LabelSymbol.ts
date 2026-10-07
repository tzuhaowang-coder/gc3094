import { _decorator, Label } from 'cc';
import { SLOT_SYMBOL_STATUS } from './SlotData';
import SlotReel, { SlotReelSymbol } from './SlotReel';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

/**
 * label
 */
@ccclass
export default class LabelSymbol extends SymbolBase {

    @property(Label)
    label: Label = null;

    str() {
        return this.label.string;
    }

    doChange?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS): void;

    change(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS, force: boolean = false) {
        const same = this.status === status && this.symbol === symbol;
        if (!force && same) {
            this.doChange?.(symbol, status);
            return;
        }

        if (!this.skip) {
            this.label.string = symbol;
        }

        this.doChange?.(symbol, status);
        this.symbol = symbol;
        this.status = status;
    }

    generate(reel: SlotReel): void {
        // do nothing
    }

}
