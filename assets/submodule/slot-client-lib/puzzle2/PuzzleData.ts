import { _decorator, CCFloat, CCInteger } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PuzzleTimeConfig2')
export class PuzzleTimeConfig2 {

    @property([CCInteger])
    // 從右側開始移動([清除、填滿、掉落]，0為左側開始，1為右側開始)
    isRightSideBegins:number[] = [0, 0, 0];

    @property(CCFloat)
    // 清空每一顆的間距(s)
    delayOneClear: number = 0.03;

    @property(CCFloat)
    // 清空的速度(s)
    clearSpeed: number = 0.05;

    @property(CCFloat)
    // 每軸清空間隔時間(s)
    delayClearReel: number = 0.1;

    @property(CCFloat)
    // 填滿每一顆的間距(s)
    delayOneSink: number = 0.03;

    @property(CCFloat)
    // 填滿的速度(s)
    sinkSpeed: number = 0.05;

    @property(CCFloat)
    // 每軸填滿間隔時間(s)
    delaySinkReel: number = 0.1;

    @property(CCFloat)
    // 掉落每一顆的間距(s)
    delayOneDrop: number = 0.03;

    @property(CCFloat)
    // 掉落的速度(s)
    dropSpeed: number = 0.05;

    @property(CCFloat)
    // 執行drop前，delay掉落(s)
    delayDrop: number = 0.1;

    @property(CCFloat)
    // 每軸掉落間隔時間(s)
    delayDropReel: number = 0.1;

    @property(CCFloat)
    // 清空與掉落的間距(s)
    delayClearDrop: number = 0.1;

    @property(CCFloat)
    // 填滿與掉落的間距(s)
    delaySinkDrop: number = 0.1;

    @property(CCInteger)
    // 清空的結束位置額外往下幾格
    clearOffset: number = 1;

    @property(CCInteger)
    // 掉落的初始位置額外往上幾格
    dropOffset: number = 1;

    // 自定義
    @property([CCFloat])
    custom: number[] = [];
}

/**
 * Puzzle資料
 */
export class PuzzleData {
    constructor(
        /**
         * 左上為 (0, 0)
         */
        public symbols: string[][] = null,
        public mode: string = '',
    ) {

    }
    public clone(): PuzzleData {
        return new PuzzleData(this.symbols.map(symbols => symbols.slice()), this.mode);
    }
}

/**
 * Puzzle移動的資料
 */
export class PuzzleMoveData {
    constructor(
        /**
         * 圖標
         */
        public symbol: string,
        /**
         * 開始位置
         */
        public startIndex: number,
        /**
         * 結束位置
         */
        public endIndex: number,
        /**
         * 第幾軸掉落(展演的第幾軸)
         ** ex:
         ** 0 1 2 3  <- puzzleReelIndex
         ** 0 X 1 2  <- reelIndex，X為此軸不掉落
         */
        public reelIndex:number,
        /**
         * 第幾顆掉落
         */
        public sinkIndex: number,
    ) {

    }
}

/**
 * 掉落的狀態
 */
export enum DROP_STATUS {
    // 掉落
    DROP,
    // 清除後的掉落
    CLEAR_DROP,
    // 補齊後的掉落
    SINK_DROP,
}

export enum PUZZLE_STATUS {
    CLEAR,
    SINK,
    DROP,
}

export enum PUZZLE_SIBLINGINDEX_STATUS {
    SET_SYMBOLS,
    SINK,
    DROP,
}
