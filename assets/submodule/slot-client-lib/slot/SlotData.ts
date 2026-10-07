import { _decorator, CCBoolean, CCFloat, CCInteger } from 'cc';

const { ccclass, property } = _decorator;

// 如果有調整此，記得要改 slotBase#stopAll 方法內的 switch case
export enum SLOT_REEL_STATUS {
    IDLE = 0,
    STARTING = 1,
    LOOPING = 2,
    BEFORE_STOP = 3, // 瞇牌
    CHECK_STOP_CONDITION = 4,
    SQUEEZING = 5, // 瞇牌
    STOPPING = 6,
    STOP_BOUNCE = 7,
    STOPPED = 8,
}

export enum SLOT_SYMBOL_STATUS {
    NORMAL = 0,
    BLUR = 1,
    WIN = 2,
}

export type PREV_SLOT_SYMBOL_STATUS = 101;
export let PREV_SLOT_SYMBOL_STATUS = 101;

@ccclass('SlotReelsTimeConfig')
export class SlotReelsTimeConfig {

    @property({
        type: CCFloat,
        tooltip: '開始轉後過多久開始停第一軸',
    })
    firstStopSec: number = 0;

    @property({
        type: CCFloat,
        tooltip: '每軸間隔多久才開始轉動，第 1 軸停止時間為 0，第二軸為 sec*1，第三軸為 sec*2',
    })
    startSequenceDuration: number = 0;

    @property({
        type: [CCFloat],
        tooltip: '每軸個別間隔多久才開始轉動',
    })
    startSequenceFix: number[] = [];

    @property({
        type: CCFloat,
        tooltip: '第 1 軸停止時間為 0，第二軸為 sec*1，第三軸為 sec*2',
    })
    stopSequenceDuration: number = 0;

    @property({
        type: [CCFloat],
        tooltip: '用 stopSequenceSec 計算後用此進行修正\n例如 3019 有高低\n用 loopDuration*格數 計算\neg. 第三軸 sec*(3-1) + secs[2] - secs[0]',
    })
    stopSequenceFix: number[] = [];

    @property({
        type: [CCInteger],
        tooltip: '屬於哪個停軸時間 index',
    })
    stopSequenceGroup: number[] = [];

    @property({
        type: [CCInteger],
        tooltip: '第一軸開始停(s)後，每軸轉多久後停開始停止[(s)] (不支援瞇牌)',
    })
    afterFirstStopSecStopTimes:number[] = [];
}

@ccclass('SlotReelTimeConfig')
export class SlotReelTimeConfig {

    @property(CCFloat)
    startDuration: number = 0;

    @property(CCInteger)
    startPx: number = 0;

    @property(CCFloat)
    loopDuration: number = 0;

    @property(CCFloat)
    stopDuration: number = 0;

    @property(CCInteger)
    stopPx: number = 0;

    public clone() {
        const tc = new SlotReelTimeConfig();
        tc.loopDuration = this.loopDuration;
        tc.startDuration = this.startDuration;
        tc.startPx = this.startPx;
        tc.stopDuration = this.stopDuration;
        tc.stopPx = this.stopPx;

        return tc;
    }
}

@ccclass('PuzzleTimeConfig')
export class PuzzleTimeConfig {

    stopSequenceSpeedUp: boolean = false;

    @property(CCBoolean)
    sequenceRight: boolean = false;

    @property(CCFloat)
    sequence0Sec: number = 0;

    @property(CCFloat)
    sequenceSec: number = 0;

    @property(CCFloat)
    dropDuration: number = 0;

    @property(CCFloat)
    sinkSec: number = 0;

    @property(CCFloat)
    clearSec: number = 0;

    @property(CCFloat)
    timeScale: number = 0;

    @property(CCFloat)
    symbolDelaySec: number = 0;

    @property(CCFloat)
    miDelaySec: number = 0;

    @property(CCFloat)
    miDuration: number = 0;

    @property([CCFloat])
    customs: number[] = [];

    public clone() {
        const tc = new PuzzleTimeConfig();
        tc.sequenceRight = this.sequenceRight;
        tc.sequence0Sec = this.sequence0Sec;
        tc.sequenceSec = this.sequenceSec;
        tc.dropDuration = this.dropDuration;
        tc.sinkSec = this.sinkSec;
        tc.clearSec = this.clearSec;
        tc.timeScale = this.timeScale;
        tc.symbolDelaySec = this.symbolDelaySec;
        tc.miDelaySec = this.miDelaySec;
        tc.miDuration = this.miDuration;
        tc.customs = this.customs;
        return tc;
    }
}

@ccclass('SlotReelPxConfig')
export class SlotReelPxConfig {

    @property(CCInteger)
    symbolPadding: number = 0;

    @property(CCInteger)
    top: number = 0;

    @property(CCInteger)
    bottom: number = 0;

    @property(CCInteger)
    width: number = 0;

    symbolHeight: number = 0;

    symbolWidth: number = 0;
}

@ccclass('SlotTimeConfig')
export class SlotTimeConfig {

    @property(SlotReelsTimeConfig)
    timeConfig: SlotReelsTimeConfig = null;

    @property(SlotReelTimeConfig)
    reelTimeConfig: SlotReelTimeConfig = null;

    @property(SlotReelTimeConfig)
    squeezeReelTimeConfig:SlotReelTimeConfig = null;
}

@ccclass('SlotReelTimeConfig2')
export class SlotReelTimeConfig2 {

    @property(SlotReelTimeConfig)
    reelTimeConfig: SlotReelTimeConfig = null;

    @property(SlotReelTimeConfig)
    squeezeReelTimeConfig:SlotReelTimeConfig = null;
}
