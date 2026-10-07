import { _decorator, Label } from 'cc';
import { ColSprite } from '../../game-client-lib/data/ColSprite';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_SYMBOL_STATUS } from './SlotData';
import SlotReel, { SlotReelSymbol } from './SlotReel';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

@ccclass
export default class SpriteSymbol extends SymbolBase {

    @property(Label)
    debugLabel: Label = null;

    @property(ColSprite)
    colSprite: ColSprite = null;

    str() {
        return this.symbol;
    }

    doChange?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS): void;

    toStr?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS): string;

    change(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS, force: boolean = false) {
        const nextStatus = (status === PREV_SLOT_SYMBOL_STATUS) ? this.status : (status as SLOT_SYMBOL_STATUS);
        const same = this.status === nextStatus && this.symbol === symbol;
        if (!force && same) {
            this.doChange?.(symbol, nextStatus);
            return;
        }

        if (this.toStr) {
            const str = this.toStr(symbol, nextStatus);
            this.colSprite.reset(str);
            const found = this.colSprite.sprite.spriteFrame;
            if (this.debugLabel) {
                this.debugLabel.string = found ? ' ' : str;
            }
        }

        this.doChange?.(symbol, status);
        this.symbol = symbol;
        this.status = status;
    }

    generate(reel: SlotReel): void {
        // do nothing
    }

}
