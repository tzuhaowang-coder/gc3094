import { _decorator, CCInteger, Component, instantiate, Node, NodePool, sp, v3, Vec2 } from 'cc';
import { stopAllActions } from '../../game-client-lib/utils/Tween';
import { arraySplice, error, getNodeHeight, getNodeWidth, range, setNodeOpacity } from '../../game-client-lib/utils/Utils';
import { SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import PuzzleBase2 from './PuzzleBase2';
import { DROP_STATUS, PUZZLE_SIBLINGINDEX_STATUS, PuzzleMoveData, PuzzleTimeConfig2 } from './PuzzleData';
import PuzzleSymbolBase2 from './PuzzleSymbolBase2';
const { ccclass, property } = _decorator;

@ccclass('PuzzleReelBase')
export default abstract class PuzzleReelBase extends Component {

    @property(Node)
    targetNode: Node = null;

    @property(CCInteger)
    length: number = 1;

    @property(Node)
    symbolSkeletonTemplate: Node = null;

    @property(Node)
    symbolTemplate: Node = null;

    public puzzle: PuzzleBase2 = null;
    public index: number;
    public puzzleTimeConfigs: PuzzleTimeConfig2[] = [];

    protected symbolHeight: number = 0;
    protected symbolWidth: number = 0;

    private pool: NodePool = new NodePool();
    private puzzleSymbols: PuzzleSymbolBase2[] = [];
    private loaded: boolean = false;

    private symbols: string[] = [];

    protected onLoad(): void {
        this.pre();
    }

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.targetNode = this.targetNode || this.node;
        this.symbolWidth = getNodeWidth(this.symbolTemplate);
        this.symbolHeight = getNodeHeight(this.symbolTemplate);
        this.symbols = range(this.length).map(() => '');
    }

    /**
     * 上到下/右到左
     * @param index
     * @returns Vec2
     */
    abstract getPosition(index: number): Vec2;

    /**
     * 取得父節點
     * 可處理單個圖標放置別的節點，解決圖層問題
     * 別的節點Position要跟Reel的Position一樣
     */
    public getParent(puzzleSymbol:PuzzleSymbolBase2): Node {
        return this.doGetParent ? this.doGetParent(puzzleSymbol) : this.targetNode;
    }

    doGetParent?(puzzleSymbol:PuzzleSymbolBase2): Node;

    /**
     * 初始化盤面 or attachSlotToPuzzle
     * @param symbols
     * @param status
     */
    public setSymbols(symbols: string[], status: SLOT_SYMBOL_STATUS) {
        for (let i = 0; i < symbols.length; i += 1) {
            let puzzleSymbol = this.getPuzzleSymbol(i);
            if (!puzzleSymbol) {
                puzzleSymbol = this.genPuzzleSymbol();
                this.puzzleSymbols.push(puzzleSymbol);
            }

            const idx = this.length - i - 1;
            puzzleSymbol.index = idx;
            const symbol = symbols[i];
            puzzleSymbol.symbol = symbol;
            puzzleSymbol.status = status;
            puzzleSymbol.reel = this;
            puzzleSymbol.reelIndex = this.index;
            puzzleSymbol.node.parent = this.getParent(puzzleSymbol);
            puzzleSymbol.node.position = v3(0, (this.symbolHeight * idx));
            puzzleSymbol.node.active = true;
            puzzleSymbol.change(symbol, status);
        }
        this.symbols = symbols.slice();
        this.updateSiblingIndex(PUZZLE_SIBLINGINDEX_STATUS.SET_SYMBOLS);
    }

    /**
     * 設定單一顆Symbol
     * @param y 上到下
     * @param symbol
     * @param status
     */
    public setSymbol(y: number, symbol: string, status: SLOT_SYMBOL_STATUS) {
        // 取PuzzleSymbol
        const puzzleSymbol = this.getPuzzleSymbol(y);
        if (!puzzleSymbol) {
            error('not find puzzle', y, symbol);
            return;
        }
        // 轉成下到上
        const idx = this.length - y - 1;
        puzzleSymbol.index = idx;
        puzzleSymbol.symbol = symbol;
        puzzleSymbol.reel = this;
        puzzleSymbol.node.parent = this.getParent(puzzleSymbol);
        puzzleSymbol.change(symbol, status);

        this.symbols[y] = symbol;
    }

    /**
     * 取得所有的symbols上到下(包含空)
     * @returns string[]
     */
    public getSymbols(): string[] {
        return this.symbols.slice();
    }

    /**
     * 回傳由上到下 puzzleSymbols (包含空)
     */
    public getPuzzleSymbols(): PuzzleSymbolBase2[] {
        const arr = [];
        for (let y = 0; y < this.length; y += 1) {
            const p = this.getPuzzleSymbol(y);
            arr.push(p);
        }
        return arr;
    }

    /**
     * 取單一顆Symbol
     * @param y 上到下
     * @returns string
     */
    public getSymbol(y: number): string {
        return this.symbols[y];
    }

    /**
     * 取單一顆Symbol
     * @param y 上到下
     * @returns PuzzleSymbol
     */
    public getPuzzleSymbol(y: number): PuzzleSymbolBase2 {
        const idx = this.length - y - 1;
        const puzzleSymbol = this.puzzleSymbols.find(r => r.index === idx);
        if (!puzzleSymbol) {
            return null;
        }
        return puzzleSymbol;
    }

    /**
     * 生成PuzzleSymbol
     * @returns PuzzleSymbol
     */
    private genPuzzleSymbol(): PuzzleSymbolBase2 {
        let node: Node = null;
        let symbol: PuzzleSymbolBase2 = null;
        if (this.pool.size() === 0) {
            node = instantiate(this.symbolTemplate);
            symbol = node.getComponent(PuzzleSymbolBase2);
            if (this.symbolSkeletonTemplate) {
                const skeletonNode = instantiate(this.symbolSkeletonTemplate);
                symbol.skeletonNode.addChild(skeletonNode);
                symbol.skeleton = skeletonNode.getComponent(sp.Skeleton);
            }
        } else {
            node = this.pool.get();
            symbol = node.getComponent(PuzzleSymbolBase2);
        }
        node.active = true;

        if (this.symbolSkeletonTemplate) {
            symbol.skeletonNode.active = true;
            symbol.skeleton.node.active = true;
        }
        setNodeOpacity(node, 255);
        return symbol;
    }

    /**
     * 指定index回收Symbol
     * @param y 上到下
     */
    public recycleSymbol(y: number) {
        const puzzleSymbol = this.getPuzzleSymbol(y);
        this.recyclePuzzleSymbol(puzzleSymbol);
    }

    /**
     * 回收Symbol
     * @param y 上到下
     */
    public recyclePuzzleSymbol(puzzleSymbol: PuzzleSymbolBase2) {
        if (!puzzleSymbol) {
            debugger;
        }
        const y = this.length - puzzleSymbol.index - 1;
        this.symbols[y] = '';
        this.recycleSymbolNode(puzzleSymbol.node);
        arraySplice(this.puzzleSymbols, puzzleSymbol);
    }

    /**
     * 回收節點
     * @param node
     */
    private recycleSymbolNode(node: Node) {
        this.recycleNode(node);
    }

    /**
     * 回收節點
     * @param node
     */
    private recycleNode(node: Node) {
        stopAllActions(node);
        this.pool.put(node);
    }

    /**
     * 清除全部，移出場外，產出資料
     * @param reelIndex 前面有幾軸需要掉落
     * @param clearIndex 清除到第幾顆
     * @returns [clearReelIndex, clearIndex, PuzzleMoveData[]]
     */
    public clearData(reelIndex: number, clearIndex: number): [number, number, PuzzleMoveData[]] {
        // this.puzzleSymbols 的陣列順序會隨掉落/回收變動，不等於盤面位置順序，而 clearIndex 依迭代順序遞增，決定每顆的展演延遲（delayOneClear * sinkIndex），故先依 index 由小到大排序（畫面由下往上），確保清除動畫照盤面順序依序掉落。
        const puzzleSymbols = this.puzzleSymbols.slice().sort((a, b) => a.index - b.index);
        const clearMoveDatas = puzzleSymbols.map((puzzleSymbol) => {
            const startIndex = this.length - puzzleSymbol.index - 1;
            const endIndex = this.length - puzzleSymbol.index - 1 + this.length;
            const puzzleMoveData = new PuzzleMoveData(puzzleSymbol.symbol, startIndex, endIndex, reelIndex, clearIndex);
            clearIndex += 1;
            return puzzleMoveData;
        });
        if (clearMoveDatas.length) {
            reelIndex += 1;
        }
        return [reelIndex, clearIndex, clearMoveDatas];
    }

    /**
     * 清除全部，移出場外
     * @param quickSpin 0,1,2
     * @param clearPuzzleMoveDatas PuzzleMoveData[]
     * @returns Promise<any>
     */
    public clear(quickSpin: number, clearPuzzleMoveDatas: PuzzleMoveData[]): Promise<any> {
        const ps = clearPuzzleMoveDatas.map((puzzleMoveData) => {
            const puzzleSymbol = this.getPuzzleSymbol(puzzleMoveData.startIndex);
            return this.doClear(puzzleSymbol, puzzleMoveData, quickSpin).then(() => {
                this.recyclePuzzleSymbol(puzzleSymbol);
            });
        });
        this.symbols = range(this.length).map(() => '');
        return Promise.all(ps);
    }

    /**
     * 全部掉新的，產出資料
     * @param next string[]
     * @param reelIndex 前面有幾軸需要掉落
     * @param dropIndex 掉到第幾顆
     * @returns [dropReelIndex, dropIndex, PuzzleMoveData[]]
     */
    public dropData(next: string[], reelIndex: number, dropIndex: number): [number, number, PuzzleMoveData[]] {
        const prev = this.symbols.slice();

        const dropPuzzleMoveDatas: PuzzleMoveData[] = [];
        let originY = -1;
        const nextReverse = next.slice().reverse();
        nextReverse.forEach((symbol, y) => {
            const idx = this.length - y - 1;
            if (!prev[idx]) {
                dropPuzzleMoveDatas.push(new PuzzleMoveData(symbol, originY, idx, reelIndex, dropIndex));
                prev[idx] = symbol;
                originY -= 1;
                dropIndex += 1;
            } else {
                if (symbol !== prev[idx]) {
                    error('symbol not same', symbol, prev[idx]);
                    debugger;
                }
            }
        });

        if (dropPuzzleMoveDatas.length) {
            reelIndex += 1;
        }

        return [reelIndex, dropIndex, dropPuzzleMoveDatas];
    }

    /**
     * 全部掉新的
     * @param next: string[]
     * @param quickSpin 0,1,2
     * @param dropPuzzleMoveDatas PuzzleMoveData[]
     * @returns Promise<any>
     */
    public drop(next: string[], quickSpin: number, dropPuzzleMoveDatas: PuzzleMoveData[], status: DROP_STATUS): Promise<any> {
        const ps = dropPuzzleMoveDatas.map((puzzleMoveData) => {

            // getPool
            const puzzleSymbol = this.genPuzzleSymbol();
            this.puzzleSymbols.push(puzzleSymbol);
            const pos = this.getPosition(puzzleMoveData.startIndex);
            // 轉成下到上的，結束的
            const idx = this.length - puzzleMoveData.endIndex - 1;
            // 先修改index
            puzzleSymbol.index = idx;
            puzzleSymbol.symbol = puzzleMoveData.symbol;
            puzzleSymbol.status = SLOT_SYMBOL_STATUS.NORMAL;
            puzzleSymbol.reel = this;
            puzzleSymbol.reelIndex = this.index;
            puzzleSymbol.node.parent = this.getParent(puzzleSymbol);
            puzzleSymbol.node.setPosition(pos.x, pos.y);
            puzzleSymbol.node.active = true;

            puzzleSymbol.change(puzzleMoveData.symbol, SLOT_SYMBOL_STATUS.NORMAL);
            return this.doDrop(puzzleSymbol, puzzleMoveData, quickSpin, status);
        });

        this.updateSiblingIndex(PUZZLE_SIBLINGINDEX_STATUS.DROP);

        // 更新Symbols
        this.symbols = next.slice();
        return Promise.all(ps);
    }

    /**
     * 往下填補,產出資料
     * @param reelIndex 前面有幾軸需要掉落
     * @param sinkIndex 落到第幾顆
     * @returns [sinkIndex, dropIndex, lastSymbols, Promise<any>]
     */
    public sinkData(reelIndex: number, sinkIndex: number): [number, number, string[], PuzzleMoveData[]] {
        const prev = this.symbols.slice();
        const lastSymbols: string[] = [];
        const sinkPuzzleMoveDatas: PuzzleMoveData[] = [];
        let emptyY = 0;
        const prevReverse = prev.slice().reverse();
        prevReverse.forEach((symbol, y) => {
            if (symbol) {
                const oldSymbolY = this.length - y - 1;
                const newSymbolY = this.length - emptyY - 1;
                if (y === 0) {
                    lastSymbols[newSymbolY] = symbol;
                } else {
                    if (oldSymbolY !== newSymbolY) {
                        sinkPuzzleMoveDatas.push(new PuzzleMoveData(symbol, oldSymbolY, newSymbolY, reelIndex, sinkIndex));
                        sinkIndex += 1;
                    }
                    lastSymbols[newSymbolY] = symbol;
                }
                emptyY += 1;
            }
        });

        // 此軸最新 lastSymbols 內有 undefined (表示有被消除)，此軸之後一定會做 drop
        // drop.puzzleMoveData.reelIndex 與 sink.puzzleMoveData.reelIndex 才會一致
        if (lastSymbols.findIndex(symbol => symbol === undefined) !== -1) {
            reelIndex += 1;
        }

        return [reelIndex, sinkIndex, lastSymbols, sinkPuzzleMoveDatas];
    }

    /**
     * 往下填補
     * @param  next string[]
     * @param quickSpin 0,1,2
     * @param sinkPuzzleMoveDatas PuzzleMoveData[]
     * @returns Promise<any>
     */
    public sink(next: string[], quickSpin: number, sinkPuzzleMoveDatas: PuzzleMoveData[]): Promise<any> {
        // 往下補
        const ps = sinkPuzzleMoveDatas.map((puzzleMoveData) => {
            const puzzleSymbol = this.getPuzzleSymbol(puzzleMoveData.startIndex);
            // index轉成下到上
            const idx = this.length - puzzleMoveData.endIndex - 1;
            // 先修改index
            puzzleSymbol.index = idx;
            // 移動
            return this.doSink(puzzleSymbol, puzzleMoveData, quickSpin);
        });

        // 更新Symbols
        this.symbols = next.slice();
        this.updateSiblingIndex(PUZZLE_SIBLINGINDEX_STATUS.SINK);
        return Promise.all(ps);
    }

    /**
     * 取的config設定
     * @param quickSpin 0,1,2
     * @returns
     */
    protected getPuzzleTimeConfig(quickSpin: number): PuzzleTimeConfig2 {
        return this.puzzleTimeConfigs[quickSpin];
    }

    /**
     * 三個地方更新，更新圖標節點的 SiblingIndex
     *   PuzzleReelBase.setSymbols
     *   PuzzleReelBase.drop
     *   PuzzleReelBase.sink
     * @param status
     */
    protected updateSiblingIndex(status: PUZZLE_SIBLINGINDEX_STATUS) {
        const puzzleSymbols = this.getPuzzleSymbols();
        puzzleSymbols.forEach((puzzleSymbol, idx) => puzzleSymbol && puzzleSymbol.node.setSiblingIndex(idx));
        this.doSibling?.(status, puzzleSymbols);
    }

    /**
     * 三個地方更新，更新圖標節點的 SiblingIndex
     *   PuzzleReelBase.setSymbols
     *   PuzzleReelBase.drop
     *   PuzzleReelBase.sink
     *
     * 可客製化處理 SiblingIndex
     * @param status
     */
    public doSibling?(status: PUZZLE_SIBLINGINDEX_STATUS, puzzleSymbols: PuzzleSymbolBase2[]);

    /**
     * 清空，移出場外
     * @param puzzleSymbol
     * @param puzzleMoveData
     * @param quickSpin
     */
    protected abstract doClear(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number): Promise<any>;

    /**
     * 往下補齊
     * @param puzzleSymbol
     * @param puzzleMoveData
     * @param quickSpin
     */
    protected abstract doSink(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number): Promise<any>;

    /**
     * 落下新的，補齊空的
     * 需自行加上額外的Delay
     * @param puzzleSymbol
     * @param puzzleMoveData
     * @param quickSpin
     * @param dropStatus
     */
    protected abstract doDrop(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number, dropStatus: DROP_STATUS): Promise<any>;
}
