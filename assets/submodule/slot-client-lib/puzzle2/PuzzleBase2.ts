import { _decorator, Component, error, Vec2 } from 'cc';
import { NNN } from '../../game-client-lib/LibGlobal';
import { schedulePromise } from '../../game-client-lib/script/PromiseManager';
import { range } from '../../game-client-lib/utils/Utils';
import { SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import { ISlotPuzzle } from '../SlotGlobal';
import { DROP_STATUS, PuzzleData, PuzzleMoveData, PuzzleTimeConfig2 } from './PuzzleData';
import PuzzleReelBase from './PuzzleReelBase';
import PuzzleSymbolBase2 from './PuzzleSymbolBase2';
const { ccclass, property } = _decorator;

@ccclass('PuzzleBase2')
export default abstract class PuzzleBase2 extends Component implements ISlotPuzzle {

    idle: boolean = true;
    promise: Promise<any>;

    prevData: PuzzleData = null;
    data: PuzzleData = null;

    @property([PuzzleReelBase])
    puzzleReels: PuzzleReelBase[] = [];

    @property([PuzzleTimeConfig2])
    puzzleTimeConfigs: PuzzleTimeConfig2[] = [];

    public clearMoveDatas: PuzzleMoveData[][] = [];
    public skinMoveDatas: PuzzleMoveData[][] = [];
    public dropMoveDatas: PuzzleMoveData[][] = [];

    protected onLoad(): void {
        NNN.push(this);
        this.puzzleReels.forEach((reel, index) => {
            reel.index = index;
            reel.puzzleTimeConfigs = this.puzzleTimeConfigs;
            reel.puzzle = this;
        });
    }

    public stopAll(): Promise<any> {
        if (!this.idle) {
            return this.promise;
        }
        return Promise.resolve(1);
    }
    /** 收到錯誤回應時的停軸：puzzle 無 quick2 停軸問題，直接委派 stopAll */
    public stopSpinFail(): Promise<any> {
        return this.stopAll();
    }
    public isIdle() {
        return this.idle;
    }

    /**
     * 設定結果
     * @param puzzleData
     */
    public setResult(puzzleData: PuzzleData) {
        this.data = puzzleData;
    }

    /**
     * 初始化 or attachSlotToPuzzle
     * 左至右，上到下
     * @param puzzleData
     * @param status
     */
    public setSymbols(puzzleData: PuzzleData, status: SLOT_SYMBOL_STATUS) {
        this.prevData = puzzleData.clone();
        this.data = puzzleData.clone();
        for (let i = 0; i < this.puzzleReels.length; i++) {
            this.puzzleReels[i].setSymbols(puzzleData.symbols[i], status);
        }
    }

    /**
     * 設定PuzzleSymbol
     * 左至右，上到下
     * @param puzzleData
     * @param status
     */
    public setSymbol(x: number, y: number, symbol: string, status: SLOT_SYMBOL_STATUS) {
        this.data.symbols[x][y] = symbol;
        this.puzzleReels[x].setSymbol(y, symbol, status);
    }

    /**
     * 移除PuzzleSymbol節點
     * 左至右，上到下
     * @param x
     * @param y
     */
    public removeSymbolNode(x, y) {
        this.puzzleReels[x].recycleSymbol(y);
        this.data.symbols[x][y] = null;
    }

    /**
     * 左至右，上到下
     */
    public getSymbols(): string[][] {
        const symbols: string[][] = [];
        for (let i = 0; i < this.puzzleReels.length; i++) {
            symbols[i] = this.puzzleReels[i].getSymbols();
        }
        return symbols;
    }

    public getPuzzleSymbols(): PuzzleSymbolBase2[][] {
        return this.puzzleReels.map((r) => {
            return r.getPuzzleSymbols();
        });
    }

    /**
     * 取得Symbol
     * 左至右，上到下
     * @param x
     * @param y
     */
    public getSymbol(x: number, y: number): string {
        return this.puzzleReels[x].getSymbol(y);
    }

    /**
     * 取得PuzzleSymbol
     * 左至右，上到下
     * @param x
     * @param y
     */
    public getPuzzleSymbol(x: number, y: number): PuzzleSymbolBase2 {
        return this.puzzleReels[x].getPuzzleSymbol(y);
    }

    /**
     * 取得位置
     * @param x
     * @param y
     * @returns Vec2
     */
    public getPosition(x: number, y: number): Vec2 {
        return this.puzzleReels[x].getPosition(y);
    }

    /**
     * 清除全部，移出場外
     * @param quickSpin — 0,1,2
     * @returns
     */
    public async clear(quickSpin: number): Promise<any> {
        this.doClearStart?.(quickSpin);
        this.prevData.symbols = this.puzzleReels.map((reel) => {
            return range(reel.length).map(() => '');
        });
        let clearIndex = 0;
        let clearReelIndex = 0;
        const isClearRightSideBegin = this.puzzleTimeConfigs[quickSpin].isRightSideBegins[0];
        const puzzleReels = isClearRightSideBegin ? this.puzzleReels.slice().reverse() : this.puzzleReels;
        const allMoveDatas: PuzzleMoveData[][] = [];
        puzzleReels.forEach((reel) => {
            const [newClearReelIndex, newClearIndex, moveDatas] = reel.clearData(clearReelIndex, clearIndex);
            clearIndex = newClearIndex;
            clearReelIndex = newClearReelIndex;
            allMoveDatas.push(moveDatas);
        });
        this.clearMoveDatas = allMoveDatas;
        const ps = allMoveDatas.map((moveData, x) => {
            return puzzleReels[x].clear(quickSpin, moveData);
        });
        const p = Promise.all(ps);
        this.promise = p;
        this.doClearStart2?.(quickSpin);
        await p;
        this.doClearEnd?.(quickSpin);
    }
    protected doClearStart?(quickSpin: number);
    protected doClearStart2?(quickSpin: number);
    protected doClearEnd?(quickSpin: number);

    /**
     * 全部掉新的
     * @param quickSpin — 0,1,2
     * @returns
     */
    public drop(quickSpin: number): Promise<any> {
        const config = this.puzzleTimeConfigs[quickSpin];
        if (!config) {
            error('puzzleTimeConfig null', quickSpin);
        }
        return schedulePromise(config.delayDrop).then(() => this.dropBase(quickSpin, DROP_STATUS.DROP));
    }

    /**
     * 全部掉新的
     * @param quickSpin — 0,1,2
     * @returns
     */
    public async dropBase(quickSpin: number, status: DROP_STATUS): Promise<any> {
        this.doDropBaseStart?.(quickSpin, status);
        let dropIndex = 0;
        let dropReelIndex = 0;
        const isDropRightSideBegin = this.puzzleTimeConfigs[quickSpin].isRightSideBegins[2];
        const puzzleReels = isDropRightSideBegin ? this.puzzleReels.slice().reverse() : this.puzzleReels;
        const puzzleReelLength = this.puzzleReels.length;
        const allMoveDatas: PuzzleMoveData[][] = [];
        puzzleReels.forEach((reel, x) => {
            const idx = isDropRightSideBegin ? puzzleReelLength - 1 - x : x;
            const next = this.data.symbols[idx];
            const [newDropReelIndex, newDropIndex, moveDatas] = reel.dropData(next, dropReelIndex, dropIndex);
            dropIndex = newDropIndex;
            dropReelIndex = newDropReelIndex;
            allMoveDatas.push(moveDatas);
        });
        this.dropMoveDatas = allMoveDatas;
        const ps = allMoveDatas.map((moveDatas, x) => {
            const idx = isDropRightSideBegin ? puzzleReelLength - 1 - x : x;
            const next = this.data.symbols[idx];
            return puzzleReels[x].drop(next, quickSpin, moveDatas, status);
        });
        this.prevData = this.data.clone();
        this.doDropBaseStart2?.(quickSpin, status);
        await Promise.all(ps);
        this.doDropBaseEnd?.(quickSpin, status);
    }
    protected doDropBaseStart?(quickSpin: number, status: DROP_STATUS):void;
    protected doDropBaseStart2?(quickSpin: number, status: DROP_STATUS):void;
    protected doDropBaseEnd?(quickSpin: number, status: DROP_STATUS);

    /**
     * 往下填補
     * @param quickSpin — 0,1,2
     * @returns
     */
    public async sink(quickSpin: number): Promise<any> {
        this.doSinkStart?.(quickSpin);
        const config = this.puzzleTimeConfigs[quickSpin];
        if (!config) {
            error('puzzleTimeConfig null', quickSpin);
        }
        let sinkIndex = 0;
        let sinkReelIndex = 0;
        const symbols: string[][] = [];
        const isSinkRightSideBegin = this.puzzleTimeConfigs[quickSpin].isRightSideBegins[1];
        const puzzleReels = isSinkRightSideBegin ? this.puzzleReels.slice().reverse() : this.puzzleReels;
        const allMoveDatas: PuzzleMoveData[][] = [];
        puzzleReels.forEach((reel, x) => {
            const [newSinkReelIndex, nextSinkIndex, lastSymbols, moveDatas] = reel.sinkData(sinkReelIndex, sinkIndex);
            symbols.push(lastSymbols);
            sinkIndex = nextSinkIndex;
            sinkReelIndex = newSinkReelIndex;
            allMoveDatas.push(moveDatas);
        });
        this.skinMoveDatas = allMoveDatas;
        this.prevData.symbols = symbols;
        const ps = allMoveDatas.map((moveData, x) => {
            const lastSymbols = symbols[x];
            return puzzleReels[x].sink(lastSymbols, quickSpin, moveData);
        });
        this.doSinkStart2?.(quickSpin);
        await Promise.all(ps);
        this.doSinkEnd?.(quickSpin);
    }
    protected doSinkStart?(quickSpin: number);
    protected doSinkStart2?(quickSpin: number);
    protected doSinkEnd?(quickSpin: number);

    /**
     * 清除全部&掉落新的
     * @param quickSpin — 0,1,2
     * @returns
     */
    public clearDrop(quickSpin: number): Promise<any> {
        const config = this.puzzleTimeConfigs[quickSpin];
        if (!config) {
            error('puzzleTimeConfig null', quickSpin);
        }
        const clearPromise = this.clear(quickSpin);
        const dropPromise = config.delayClearDrop > 0 ? schedulePromise(config.delayClearDrop).then(() => this.dropBase(quickSpin, DROP_STATUS.CLEAR_DROP)) : this.dropBase(quickSpin, DROP_STATUS.CLEAR_DROP);
        const p = Promise.all([
            clearPromise,
            dropPromise,
        ]);
        this.promise = p;
        return p;
    }

    /**
     * 往下填補&掉落新的
     * @param quickSpin — 0,1,2
     * @returns
     */
    public sinkDrop(quickSpin: number): Promise<any> {
        const config = this.puzzleTimeConfigs[quickSpin];
        if (!config) {
            error('puzzleTimeConfig null', quickSpin);
        }
        const sinkPromise = this.sink(quickSpin);
        const dropPromise = config.delaySinkDrop > 0 ? schedulePromise(config.delaySinkDrop).then(() => this.dropBase(quickSpin, DROP_STATUS.SINK_DROP)) : this.dropBase(quickSpin, DROP_STATUS.SINK_DROP);
        const p = Promise.all([
            sinkPromise,
            dropPromise,
        ]);
        this.promise = p;
        return p;
    }
}

export function applyTempoStringToPuzzle2(str: string, puzzles: PuzzleBase2[]) {

    const chunkArray = (arr:string[], size:number) => {
        const result:string[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    };

    const setProps = (config:PuzzleTimeConfig2, props:string[]) => {
        config.isRightSideBegins = props[0].length > 0 ? props[0].split(',').map(v => Number(v)) : [0, 0, 0];
        config.delayOneClear     = Number(props[1]);
        config.clearSpeed        = Number(props[2]);
        config.delayClearReel    = Number(props[3]);
        config.delayOneSink      = Number(props[4]);
        config.sinkSpeed         = Number(props[5]);
        config.delaySinkReel     = Number(props[6]);
        config.delayOneDrop      = Number(props[7]);
        config.dropSpeed         = Number(props[8]);
        config.delayDrop         = Number(props[9]);
        config.delayDropReel     = Number(props[10]);
        config.delayClearDrop    = Number(props[11]);
        config.delaySinkDrop     = Number(props[12]);
        config.clearOffset       = Number(props[13]);
        config.dropOffset        = Number(props[14]);
        config.custom            = props[15].length > 0 ? props[15].split(',').map(v => Number(v)) : [];
    };

    puzzles.forEach((puzzleBase2) => {
        if (!puzzleBase2) {
            return;
        }

        const config0 = new PuzzleTimeConfig2();
        const config1 = new PuzzleTimeConfig2();
        const config2 = new PuzzleTimeConfig2();
        const config3 = new PuzzleTimeConfig2(); // MI牌

        const props = Object.keys(config0);
        const arr = str.split('!')[1].split(';'); // 過濾 gid
        const arr2 = chunkArray(arr, props.length); // 變成四組參數
        [config0, config1, config2, config3].forEach((config, idx) => setProps(config, arr2[idx]));

        puzzleBase2.puzzleTimeConfigs = [config0, config1, config2, config3];
    });
}
