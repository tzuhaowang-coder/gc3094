import { _decorator } from 'cc';
import PuzzleSymbolBase2 from '../submodule/slot-client-lib/puzzle2/PuzzleSymbolBase2';
import { SLOT_SYMBOL_STATUS } from '../submodule/slot-client-lib/slot/SlotData';
import { extractSymbolType } from '../submodule/slot-client-lib/slot/SlotReel';
import { symbolAnimName, setSymbolScale } from './GameGlobal';
import { changeSymbol } from './Lobby';

const { ccclass } = _decorator;

@ccclass
export default class PuzzleSymbol extends PuzzleSymbolBase2 {

    doChange(symbol: string, status: SLOT_SYMBOL_STATUS, force?: boolean): void {
        changeSymbol(this, symbol, status, force);
    }

    toStr(symbol: string, status: SLOT_SYMBOL_STATUS): string {
        return symbolAnimName(extractSymbolType(symbol), status);
    }

    initExplode(symbol: string) {
        this.symbol = symbol;
        setSymbolScale(this.skeleton.node, symbol);
    }
}
