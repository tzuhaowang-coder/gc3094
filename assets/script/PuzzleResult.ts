import { _decorator, instantiate, Node, NodePool, sp } from 'cc';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
import { schedulePromise, spSkeletonSetAnimation } from '../submodule/game-client-lib/script/PromiseManager';
import { getPosition } from '../submodule/game-client-lib/utils/Utils';
import { Symbol, SymbolType } from '../submodule/slot-client-lib/protobuf/ProtobufWarp';
import PuzzleResultBase2 from '../submodule/slot-client-lib/puzzle2/PuzzleResultBase2';
import { extractSymbolType } from '../submodule/slot-client-lib/slot/SlotReel';
import { getSkeletonDataName, getSymbolSkin, isGoldFramePos, SLOT_SYMBOL_STATUS_3098, symbolAnimName } from './GameGlobal';
import Lobby from './Lobby';
import Puzzle from './Puzzle';
import PuzzleSymbol from './PuzzleSymbol';
import { DEBUG } from 'cc/env';
import { getDebugParams } from '../submodule/game-client-lib/ParamsGlobal';

enum EXPLODE_EFFECT_TEMPLE {
    SPINE_SKELETON,         // 骨骼節點模板（代理節點缺 skeleton 時補上）
    PUZZLE_SYMBOL_TEMPLATE, // 消除演出用的代理圖標模板
}

const { ccclass, property } = _decorator;

@ccclass
export default class PuzzleResult extends PuzzleResultBase2 {

    lobby: Lobby = null;

    puzzle: Puzzle = null;

    @property(Node)
    explodeNode: Node = null;

    @property(Node)
    explodeWDNode: Node = null;

    private explodeSymbolPools: Map<string, NodePool> = new Map();

    public async explode(linesSymbols: Symbol[], quickspin: number, isMaxWin: boolean): Promise<void> {
        const customs = this.puzzle.puzzleTimeConfigs[quickspin].custom;
        const endDelay = customs.length ? customs[0] : 0;
        this.puzzle.darkenFadeOther(linesSymbols, true);
        this.lobby.playReelBGDark(true);
        const ps = linesSymbols.map((lineSymbol) => {
            return new Promise<void>(async (resolve) => {

                const x = lineSymbol.getX();
                const y = lineSymbol.getY();
                const puzzleSymbol = this.puzzle.getPuzzleSymbol(x, y) as PuzzleSymbol;

                const symbolType = extractSymbolType(puzzleSymbol.symbol);
                const isWD = symbolType === SymbolType.WD;
                const isFG = symbolType === SymbolType.FG;

                // 金框格中獎（FG 除外）：跟一般圖標走同一套消除演出（消完呈現破洞），
                // 差別是本尊節點不挖掉只先藏起來，破洞上再播 appear(1秒)->stay 長出 WILD 並永久保持。
                const turnWild = isGoldFramePos(x, y) && !isFG;

                // 消除演出：改用池子裡的代理節點在原位置播消除動畫
                const pos = getPosition(puzzleSymbol.node, this.puzzle.node);
                const puzzleNode = this.getExplodeNode(symbolType);
                puzzleNode.setPosition(pos);
                puzzleNode.setParent(isWD ? this.explodeWDNode : this.explodeNode);

                const proxySymbol = puzzleNode.getComponent(PuzzleSymbol);
                proxySymbol.initExplode(symbolType + '');

                if (turnWild) {
                    puzzleSymbol.node.active = false; // 本尊藏住不挖掉（節點要留給待會的變身用）
                } else if (!isMaxWin) {
                    this.puzzle.removeSymbolNode(x, y);
                } // maxwin：只播代理節點的中獎動畫，本尊圖標留在畫面上不挖洞

                // skin 依語系取：WD 有語系 skin（套錯會缺「WILD/百搭」字樣），其他符號都是 default
                const skDataName = getSkeletonDataName(symbolType);
                const sk = proxySymbol.setSymbolSkeletonAnim(skDataName, symbolAnimName(symbolType, SLOT_SYMBOL_STATUS_3098.NORMAL), true, getSymbolSkin(symbolType), proxySymbol.frontNode);

                // sk 沒有值就跳過中獎動畫
                if (sk) {
                    schedulePromise(1.05).then(() => audioPlay('S309807_symbol_win', { throttle: 10 })); // 圖標消除音效
                    spSkeletonSetAnimation(sk, symbolAnimName(symbolType, SLOT_SYMBOL_STATUS_3098.WIN));
                }

                // 消除動畫：一般圖標播滿 1.5 秒；wild 變身縮到 1.1 秒接上後續 appear，播完才回收代理節點
                const playSec = turnWild ? 1.1 : 1.5;
                await schedulePromise(playSec);

                this.recycleExplodeNode(symbolType, puzzleNode);

                // 金框格：消除完在破洞上長出 WILD（已是 WILD 的也重播，讓玩家知道又變身一次），
                // appear 播完整輪流程才繼續（新圖標掉落）
                if (turnWild) {
                    puzzleSymbol.node.active = true;
                    this.puzzle.setSymbol(x, y, SymbolType.WD + '', SLOT_SYMBOL_STATUS_3098.APPEAR as any);
                    audioPlay('S309816_wild_appear', { throttle: 10 }); // 變身 WILD 音效
                    await schedulePromise(0.5);
                }
                resolve();
            });
        });

        await Promise.all(ps);

        this.puzzle.darkenFadeOther(linesSymbols, false);
        this.lobby.playReelBGDark(false);

        // 每輪消除結束後的間隔；開發時可用 ?debug=custom_01=秒數 覆蓋
        let delay = 0.26;
        if (DEBUG) {
            const debug = getDebugParams('custom_01');
            if (debug) {
                delay = Number(debug);
            }
        }
        await schedulePromise(endDelay + delay);
    }

    doTweenX(x: number): void {

    }

    /** 依符號類型從池子拿代理節點，池子空了就生一顆新的 */
    private getExplodeNode(symbolType: SymbolType) {
        const poolKey = symbolType + '';
        let pool = this.explodeSymbolPools.get(poolKey);
        if (!pool) {
            pool = new NodePool();
            this.explodeSymbolPools.set(poolKey, pool);
        }

        let node: Node = null;
        if (pool.size() === 0) {
            node = instantiate(this.templates[EXPLODE_EFFECT_TEMPLE.PUZZLE_SYMBOL_TEMPLATE]);
            const symbol = node.getComponent(PuzzleSymbol);
            if (!symbol.skeleton) {
                const skNode = instantiate(this.templates[EXPLODE_EFFECT_TEMPLE.SPINE_SKELETON]);
                const sk = skNode.getComponent(sp.Skeleton);
                skNode.setParent(symbol.skeletonNode);
                symbol.skeleton = sk;
            }
        } else {
            node = pool.get();
        }
        return node;
    }
    protected recycleExplodeNode(symbolType: SymbolType, node: Node) {
        const poolKey = symbolType + '';
        const pool = this.explodeSymbolPools.get(poolKey);
        pool.put(node);
    }
}
