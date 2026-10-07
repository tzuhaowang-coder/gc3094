import { _decorator, CCString, Node } from 'cc';
import { setNodeScale } from '../submodule/game-client-lib/utils/Utils';
import { SymbolType } from '../submodule/slot-client-lib/protobuf/ProtobufWarp';
import { SlotReelSymbol } from '../submodule/slot-client-lib/slot/SlotReel';
import SlotResultBase, { lineSymbol, SlotResultLineData } from '../submodule/slot-client-lib/slot/SlotResultBase';
import SymbolBase from '../submodule/slot-client-lib/slot/SymbolBase';
import { slotBgSymbolScale } from './GameGlobal';

const { ccclass, property } = _decorator;

@ccclass
export default class SlotResult extends SlotResultBase {

    @property(CCString)
    type: string = '';

    doGenNode(symbol: SymbolBase, reelSymbol: SlotReelSymbol, index: number): void {
        const scale = this.type === 'bg' ? slotBgSymbolScale : 1;
        setNodeScale(symbol.node, scale);
    }

    doTweenX(x: number) {
    }

    doLoop1(line: SlotResultLineData, index: number, lineNodes: Node[]): void {

        // 播音效
        const symbol = lineSymbol(line);
        switch (symbol) {
            case SymbolType.SA: // 火7
                break;
            case SymbolType.WD: // 21
                break;
            default: // 其他
                break;
        }

        this.replay([SymbolType.SA, SymbolType.WD, SymbolType.FG], lineNodes);
    }

    doScatter(line: SlotResultLineData, nodes: Node[]): void {

    }
}
