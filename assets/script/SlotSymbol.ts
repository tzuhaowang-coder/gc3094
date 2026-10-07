import { _decorator, Node } from 'cc';
import { SLOT_SYMBOL_STATUS } from '../submodule/slot-client-lib/slot/SlotData';
import { extractSymbolType } from '../submodule/slot-client-lib/slot/SlotReel';
import { symbolAnimName } from './GameGlobal';
import { SpriteSkeletonSymbolBase } from '../submodule/slot-client-lib/slot/SpriteSkeletonSymbolBase';
import { changeSymbol } from './Lobby';

const { ccclass, property } = _decorator;

@ccclass
export class SlotSymbol extends SpriteSkeletonSymbolBase {

    @property(Node)
    labelTemplate: Node = null;

    @property(Node)
    spriteTemplate: Node = null;

    toStr(symbol: string, status: SLOT_SYMBOL_STATUS): string {
        return symbolAnimName(extractSymbolType(symbol), status);
    }

    doChange(symbol: string, status: SLOT_SYMBOL_STATUS): void {
        changeSymbol(this, symbol, status);
    }
}
