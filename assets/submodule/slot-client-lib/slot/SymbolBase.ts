import { _decorator, CCBoolean, CCInteger, Component, Node } from 'cc';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import SlotReel, { SlotReelSymbol } from '../slot/SlotReel';

const { ccclass, property } = _decorator;

/**
 * 預設 skeleton
 */
@ccclass
export default abstract class SymbolBase extends Component {

    @property(CCInteger)
    poolIndex : number = 0;

    @property(Node)
    frontNode: Node = null;

    @property(Node)
    backNode: Node = null;

    @property(CCBoolean)
    skip: boolean = false;

    public status: SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.NORMAL;

    public symbol: SlotReelSymbol = '';

    public reel: SlotReel = null;

    public reelIndex: number = -1;

    /**
     * 從下到上，reel 長度為 2 的話，總長度為 4；
     * 最下面的 index 為 0
     * 最上面的 index 為 3
     */
    public index: number = -1;

    abstract str() : string;

    abstract change(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS | PREV_SLOT_SYMBOL_STATUS, force?: boolean):void;

    abstract generate(reel: SlotReel): void;
}
