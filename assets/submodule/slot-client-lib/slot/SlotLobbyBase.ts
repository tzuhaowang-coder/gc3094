
import { _decorator } from 'cc';
import { DEBUG } from 'cc/env';
import { setBonusHangOnAutoPrize } from '../../game-client-lib/BonusEventGlobal';
import { LoginState } from '../../game-client-lib/data/LoginState';
import { htmlControlShowToast } from '../../game-client-lib/HtmlControlGlobal';
import { translateError } from '../../game-client-lib/I18nGlobal';
import { MsgCode } from '../../game-client-lib/protobuf/ProtobufWarp';
import { getSkillCardManager, SKILL_CARD_LOG, skillCardLog } from '../../game-client-lib/SkillCardGlobal';
import { balanceNumber, balanceSubNumber, balanceThousandth, safeMul } from '../../game-client-lib/utils/Balance';
import { log } from '../../game-client-lib/utils/Utils';
import { LineInfo, MachineInfo, RoundInfo, SpinResult, Symbol, SymbolType, WinType } from '../protobuf/ProtobufWarp';
import { analyticsShow, setAnalyticsShowDataClick } from '../script/Analytics';
import LobbyBase, { DO_SPIN_STAT, DO_STOP_STAT, symbolSort } from '../script/LobbyBase';
import { ISlot } from '../SlotGlobal';
import { isFG, SLOT_SPIN_MODE, SlotSpinData, symbolReducer } from './SlotBase';
import { SlotReelSymbol } from './SlotReel';
import { SlotResult1LineData } from './SlotResult1LineBase';
import { ISlotResult, MULTIPLE_MARK, SlotResultData, SlotResultLineData } from './SlotResultBase';

const { ccclass, property } = _decorator;

export function transformLines(lis: LineInfo[], symbols: Symbol[] | string[][], lines: number[][], doLevel: boolean = false, filter?: (li: LineInfo) => boolean): SlotResultLineData[] {

    let symbolMap: string[][];
    if (symbols[0] instanceof Symbol) {
        // @ts-ignore
        symbolMap = symbols.reduce(symbolReducer, []);
    } else {
        symbolMap = symbols;
    }

    return lis.filter((li) => {
        if (filter && !filter(li)) {
            return false;
        }
        return li.getWin();
    }).map((li) => {
        const id = li.getId();
        const idxs: number[][] = li.getSymbolsList().sort(symbolSort).reduce(
            (arr, a) => {
                const x = a.getX();
                if (!arr[x]) {
                    arr[x] = [];
                }
                arr[x].push(a.getY());
                return arr;
            },
            [],
        );
        // scatter 的 line id 为 0
        // 有 line id 就用 lines
        const indexs: (number[] | number)[] = !id ? idxs : lines[id];
        const symbolIndexs: SlotReelSymbol[][] = [];
        idxs.forEach((ys, x) => {
            ys.forEach((y) => {
                if (!symbolIndexs[x]) {
                    symbolIndexs[x] = [];
                }
                symbolIndexs[x][y] = symbolMap[x][y];
            });
        });
        return {
            indexs,
            symbolIndexs,
            // id 传 '' 就不会画线
            id: li.getId() ? '' + li.getId() : '',
            wins: balanceThousandth(li.getWin()),
            level: doLevel ? '' + li.getLevel() : '',
            num: li.getNum(),
        };
    });
}

/**
 * 大於一倍才顯示倍數
 * @param slotResultLineData
 */
export function transformLineShowLevel(lineData: SlotResultLineData): SlotResultLineData {
    // 原本是 空 就不用處理
    if (!lineData.level) {
        return lineData;
    }
    if (lineData.level === '1') {
        lineData.level = '';
    } else {
        lineData.level = MULTIPLE_MARK + lineData.level;
    }
    return lineData;
}

export function fixLineLevel(level: string): number {
    const l = level[0] === MULTIPLE_MARK ? level.slice(1) : level;
    return Number(l);
}

export function getFreeLine(lineInfos: LineInfo[], symbols: Symbol[] = []): SlotResultLineData {
    return getLine(lineInfos, symbols, WinType.WIN_FREE);
}

export function getBonusLine(lineInfos: LineInfo[], symbols: Symbol[] = []): SlotResultLineData {
    return getLine(lineInfos, symbols, WinType.WIN_BONUS);
}

export function getLine(lineInfos: LineInfo[], symbols: Symbol[] = [], type: WinType): SlotResultLineData {
    const lineInfo = lineInfos.find(line => line.getType() === type);
    if (!lineInfo) {
        return null;
    }
    const indexs: number[][] = [];
    const symbolIndexs: SlotReelSymbol[][] = [];
    const array = lineInfo.getSymbolsList().sort(symbolSort);
    for (let i = 0; i < array.length; i += 1) {
        const x = array[i].getX();
        if (!indexs[x]) {
            indexs[x] = [];
            symbolIndexs[x] = [];
        }
        indexs[x].push(array[i].getY());

        let symbolType: SymbolType = array[i].getSymbolType();
        if (symbols.length > 0) {
            symbolType = symbols.find((r: Symbol) => {
                if (r.getX() === x && r.getY() === array[i].getY()) {
                    return true;
                }
                return false;
            }).getSymbolType();
        }
        const y = array[i].getY();
        symbolIndexs[x][y] = '' + symbolType;
    }

    return {
        indexs,
        symbolIndexs,
        id: '',
        wins: '',
        level: '',
        num: 0,
    };
}

@ccclass
export default abstract class SlotLobbyBase extends LobbyBase {

    abstract slot: ISlot;

    slotResult: ISlotResult;

    onLoad() {
        super.onLoad();
        this.cacheBackNgSymbolResultf = this.cacheBackNgSymbolResultf.bind(this);

    }

    onSpin(featureBuyData: string = '', powerBet: string = '') {
        // 守門在狀態變更之前：spinData/spinRes 一旦改動，requesting 就會與「請求沒送出」不一致
        if (this.comm.isRequestPending()) {
            return;
        }
        const spinData = this.createSpinData(featureBuyData, powerBet);
        let totalBet = spinData.getTotalbet();
        if (featureBuyData) {
            const datas = featureBuyData.split('#');
            const odds = Number(datas[1]);
            totalBet = safeMul(totalBet, odds);
        }
        // 余额不足提示
        if (balanceSubNumber(this.commonUIData.rawBalance, totalBet) < 0) {
            htmlControlShowToast(translateError('GAME.sysm_if_bal', -MsgCode.GAME_AMOUNT_NOT_ENOUGH));
            // 清 autoRound
            this.updateAutoRound(0);
            this.setTurbo(false);
            this.uiBetable(true);
            this.doSpin(DO_SPIN_STAT.FAIL_IF_BALANCE);
            return;
        }
        this.spinEffect(true);
        this.doSpin(DO_SPIN_STAT.BUTTON_AUDIO);
        this.spinData = spinData;
        this.spinRes = null;
        this.comm.requestSpin(spinData);
        this.lastSpinAt = Date.now();
        if (this.spinResult) {
            this.lastSpinResultRoundId = this.spinResult.getRoundId();
        }

        // 开始转
        this.reset();
        // 清贏分
        this.updateWins(0);
        this.uiBetable(false);
        this.updateSkip(false); // 先不给停
        this.clearStopFuncSchedule(); // 上一局殘留的急停排程不可跨局，避免誤停新局

        const slots = this.activeSlots as ISlot[];
        if (slots.length) {
            // each 所有 active slots，為每個 slot 產生各自的 spin data
            slots.forEach((s, i) => {
                const data = this.lastSpinData ? this.lastSpinData(this.spinResult, i) : lastScreenBoard(s);
                data.delta = -1; // -1 不会开始计算停轴
                data.quick = this.commonUIData.quickspin;
                data.firstStopSecOffset = this.calFirstStopSecOffset();
                s.spin(data);
            });
        }
        this.doSpin(DO_SPIN_STAT.REQUEST);
    }

    /**
     * 技能卡起轉：同 onSpin 的視覺流程，但送 SkillCardDrawReq、不檢查餘額（注單 0 元）
     * 由 SkillCardSlotPlayer 呼叫；盤面回來後合成 SpinRes 走既有演出管線
     */
    spinBySkillCard(cardId: string) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：起轉並送出領取 card=', cardId);
            }
        }
        if (this.comm.isRequestPending()) {
            return;
        }
        const spinData = this.createSpinData();
        spinData.setTotalbet(0); // 技能卡注單 0 元；實際 display_bet 由 DrawRes 回填（顯示用）
        this.spinEffect(true);
        this.spinData = spinData;
        this.spinRes = null;
        this.comm.requestSkillCardDraw(cardId);
        this.lastSpinAt = Date.now();
        if (this.spinResult) {
            this.lastSpinResultRoundId = this.spinResult.getRoundId();
        }

        // 开始转
        this.reset();
        // 清贏分
        this.updateWins(0);
        this.uiBetable(false);
        this.updateSkip(false); // 先不给停
        this.clearStopFuncSchedule(); // 上一局殘留的急停排程不可跨局，避免誤停新局

        const slots = this.activeSlots as ISlot[];
        if (slots.length) {
            slots.forEach((s, i) => {
                const data = this.lastSpinData ? this.lastSpinData(this.spinResult, i) : lastScreenBoard(s);
                data.delta = -1; // -1 不会开始计算停轴
                data.quick = this.commonUIData.quickspin;
                data.firstStopSecOffset = this.calFirstStopSecOffset();
                s.spin(data);
            });
        }
        this.doSpin(DO_SPIN_STAT.REQUEST);
    }

    /**
     * 技能卡中止復原：停輪重置並恢復可投注（比照 SpinRes 錯誤處理路徑）
     */
    skillCardAbort() {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：中止復原（停輪、恢復可投注）');
            }
        }
        this.updateMessage('');
        this.spinData = null;
        this.reset(() => {
            this.spinEffect(false);
            this.uiBetable(true);
            this.updateAutoRound(0);
            this.setTurbo(false);
            this.doSpin(DO_SPIN_STAT.FAIL);
        });
    }

    /**
     * 產生上一局的 SlotSpinData
     * 如果第一局就得到錯誤盤面，這個就沒有效果
     * @param spinResult 上一局的 SpinResult
     * @param slotIndex 目前正在處理的 slot index (用於多 slot 區分資料)
     */
    lastSpinData?(spinResult: SpinResult, slotIndex?: number): Partial<SlotSpinData>;

    onStop() {
        this.sampleContaminated = true;
        if (this.commonUIData.skip) { // 再停 spin
            if (this.skipFunc) {
                this.skipFunc();
            } else if ((this.activeSlots as ISlot[]).every(s => s.isSpinning() && !s.isStopping())) {
                if (this.stopFuncSchedule) {
                    return;
                }
                this.stopFuncSchedule = this.stopFunc.bind(this);
                this.schedule(this.stopFuncSchedule, 0.1);
            }
            setAnalyticsShowDataClick(this.roundInfos, this.roundIndex);
        } else if (this.promiseManager && this.promiseManager.skippable && this.promiseManager.skippable()) {
            this.promiseManager.skip();
        }
    }

    /**
     * 因 0 ~ 1階 需要所有滾輪必須滾動後才能停止，然而玩家可以提早點擊停止
     * 利用 schedule 嘗試一直觸發停止
     * 直到所有滾輪都滾動後就可以停止。
     */
    private stopFuncSchedule:Function = null;
    private stopFunc() {
        if (!this.stopFuncSchedule) {
            return;
        }
        if (this.comm.loginState !== LoginState.LOGIN) {
            this.clearStopFuncSchedule();
            return;
        }
        const slots = this.activeSlots as ISlot[];
        if (slots.some(s => !s.isAllReelHasLooped())) {
            return;
        }
        this.updateSkip(false);
        slots.forEach(s => s.stopAll(true));
        this.doStop(DO_STOP_STAT.BUTTON_AUDIO);
        this.clearStopFuncSchedule();
    }

    private clearStopFuncSchedule() {
        if (!this.stopFuncSchedule) {
            return;
        }
        this.unschedule(this.stopFuncSchedule);
        this.stopFuncSchedule = null;
    }

    /**
     *
     * @param resolve
     * @override LobbyBase#finalRoundf
     */
    protected finalRoundf(resolve: Function) {
        const totalWins = this.sumTotalWins();
        this.updateInNormalGame();
        this.updateWins(balanceNumber(totalWins));
        this.balanceManager.finishBalanceData(this.spinResBalanceData);
        this.updateMessage('');
        const autoNext = this.isAutoNextRound();
        this.spinEffect(false);
        this.recordQuick0Win0();

        if (autoNext) {
            // 如果要繼續轉就沒有 loop
            this.doFinalRound?.(false);
            this.main.ga.setIsAutoSpin(true);
            this.updateAutoRound(this.commonUIData.autoRound - 1);
            this.onSpin();
        } else {
            // 技能卡逐局領取局：保持不可投注，續抽/收尾交給 SkillCardSlotPlayer（與 LobbyBase#finalRoundf 分支一致）
            const skillCardRound = getSkillCardManager().isDrawing();
            this.updateAutoRound(0);
            this.setTurbo(false);
            if (!skillCardRound) {
                this.uiBetable(true);
            }
            const activeResults = this.activeSlotResults as ISlotResult[];
            activeResults.forEach(r => r.loop?.());
            this.doFinalRound?.(true);
            this.main.ga.setIsAutoSpin(false);
            if (skillCardRound) {
                if (DEBUG) {
                    if (SKILL_CARD_LOG) {
                        skillCardLog('背包演出：finalRound 完成（技能卡局）通知 Player');
                    }
                }
                this.skillCardRoundComplete?.();
            }
        }
        setBonusHangOnAutoPrize(false);
        analyticsShow();

        if (DEBUG) {
            const now = Date.now();
            log(`
🎮🎮🎮 SpinClick-Final：${now - this.lastSpinAt}ms
🎮🎮🎮 Receive-Final：${now - this.lastSpinOkAt}ms
`);
        }
        resolve(1);
    }

    /**
     * 緩存 NG 結果資料 (多 slot)
     */
    protected ngResultCaches: (Partial<SlotResultData | SlotResult1LineData>)[] = [];
    protected cacheNgSymbolResult(resultData: Partial<SlotResultData | SlotResult1LineData> | Partial<SlotResultData | SlotResult1LineData>[]) {
        const slots = this.activeSlots as ISlot[];
        this.ngSymbolCaches = slots.map(s => s.getCacheSymbol());
        if (Array.isArray(resultData)) {
            this.ngResultCaches = resultData;
        } else {
            this.ngResultCaches = [resultData];
        }
    }

    protected cacheNgSymbolResultf(resultData: Partial<SlotResultData | SlotResult1LineData>) {
        return (resolve: Function) => {
            this.cacheNgSymbolResult(resultData);
            resolve(1);
        };
    }

    protected cacheBackNgSymbolResultf(resolve: Function) {
        this.cacheBackNgSymbolResult();
        resolve(1);
    }

    protected cacheBackNgSymbolResult() {
        this.updateInNormalGame();
        const slots = this.activeSlots as ISlot[];
        slots.forEach((s, i) => {
            if (this.ngSymbolCaches && this.ngSymbolCaches[i]) {
                s.setCacheSymbol(this.ngSymbolCaches[i]);
            }
        });
        const activeResults = this.activeSlotResults as ISlotResult[];
        activeResults.forEach((r, i) => {
            // @ts-ignore
            if (this.ngResultCaches && this.ngResultCaches[i]) {
                // @ts-ignore
                r.reset(this.ngResultCaches[i]);
            }
        });
    }

    /**
     *
     * @override
     */
    public updateMachineInfo(mi: MachineInfo) {
        super.updateMachineInfo(mi);
        const emptyResult = {
            lines: [],
            wins: '',
            level: '',
            custom: null,
        };
        const slots = this.activeSlots;
        this.cacheNgSymbolResult(slots.map(() => emptyResult));
    }

    doCCGameEventShow(): void {
        this.sampleContaminated = true;
    }

    private onSpinToFinalRoundIntervals:number [] = [];
    private firstStopSecOffset:number = 0;
    private sampleContaminated = false; // 避免採樣受到污染的統計行為，(1)即停、(2)切換分頁或縮到背景後回來，就不採樣此次樣本
    /**
     * 動態調滾輪節奏，五局平均兩秒
        玩家剛進遊戲玩 預設滾輪節奏
        玩家每完五局 (Speed 0 + Win 0) 更新一次第一軸停軸時間，最低到0
        更新方式：五局平均值若大於 2s 則第一軸停軸時間扣除
        ex1.
        調整前 第一軸停軸時間 0.46、五局平均遊戲時長 2.26
        調整後 第一軸停軸時間 0.46-0.26 = 0.2
        ex2.
        調整前 第一軸停軸時間 0.46、五局平均遊戲時長 1.85
        調整後 第一軸停軸時間 0.46+0.15 = 0.61
     */
    private recordQuick0Win0() {
        const roundInfos = this.roundInfos;
        const roundInfo0 = roundInfos[0];
        const fgLessThan2 = roundInfo0.getSymbolsList().filter(s => isFG(s.getSymbolType() + '')).length < 2;
        const commonUIData = this.commonUIData;

        // 只收集取樣：NG沒贏分、閃電0階、沒有NG咪牌(預期盤面 FG 最多只有一顆)、無Turbo、沒有切分頁與縮到背景(因為會讓 interval 形成巨大的數值而污染了樣本 )
        const sampling = roundInfos.length === 1 && roundInfo0.getTotalwin() === 0 && commonUIData.quickspin === 0 && fgLessThan2 && !this.commonUIData.allowAuto && !this.sampleContaminated;
        if (sampling) {
            const interval = Date.now() - this.lastSpinAt;
            this.onSpinToFinalRoundIntervals.push(interval);
            // log('@@xx recordQuick0Win0 interval', interval);
        }
        this.sampleContaminated = false;
    }
    /**
     * 只有 SlotLobbyBase.onSpin 才會帶入此參數
     * 在 Lobby.doRound 時，slot.spin2 開始停時
     * 會對 slot 的 firstStopSec 做動態調整
     * 規則在 recordQuick0Win0() 有描述。
     */
    private calFirstStopSecOffset():number {
        const intervalSampleSize = 5;
        const intervals = this.onSpinToFinalRoundIntervals;
        if (intervals.length < intervalSampleSize) { // 不滿累積局數，繼續拿上次浮動值。
            return this.firstStopSecOffset;
        }
        const standardMillisecond = 2000; // 標準兩秒
        const samplesToTake = intervals.splice(0, intervalSampleSize);
        if (samplesToTake.length === 0) {
            return this.firstStopSecOffset;
        }
        const sum = samplesToTake.reduce((acc, val) => acc + val, 0);
        const averageSec = ((standardMillisecond - (sum / samplesToTake.length)) / 1000); // 算出這次浮動秒數，單位秒。
        this.firstStopSecOffset = this.firstStopSecOffset + averageSec; // onSpin 到 finalRound 的 interval 會累積已浮動過的值，因此每次浮動是去微小修正 firstStopSecOffset
        // log('@@xx calFirstStopSecOffset averageSec', averageSec, ', firstStopSecOffset' , this.firstStopSecOffset);
        return this.firstStopSecOffset;
    }

}

type reducer = (acc: string[][], a:Symbol) => string[][];
type transformer = (symbols: Symbol[]) => string[][];

/**
 * spin 失敗回轉用：以畫面上目前的盤面作為各軸停止結果。
 * onSpin 呼叫此函式時轉輪尚未起轉，畫面即最後停下的盤面；
 * 消除類遊戲在收尾時會把 puzzle 盤面同步回 slot，故同樣適用。
 * @param slot 目前處理中的 slot（多盤面時各自取自己的畫面）
 */
export function lastScreenBoard(slot: ISlot): Partial<SlotSpinData> {
    return {
        reels: slot.getScreenReels(),
        mode: SLOT_SPIN_MODE.NORMAL,
    };
}

/**
 * 將 RoundInfo 或 SpinResult 轉換為 SlotSpinData
 * 用於在 NG (Normal Game) 模式下，產生用於 Slot 元件顯示初始盤面的資料
 * @param ngOrSpinResult RoundInfo 或 SpinResult
 * @param symbolReducerOrTransformer 將扁平 list 圖標轉換為二維盤面的函數 (reverseReducer)
 * @returns SlotSpinData 的格式
 */
export function lastModeNg(ngOrSpinResult: RoundInfo | SpinResult, symbolReducerOrTransformer: reducer | transformer): Partial<SlotSpinData> {

    if (!ngOrSpinResult) {
        return {
            mode: SLOT_SPIN_MODE.NORMAL,
        };
    }
    let ng: RoundInfo;
    if (ngOrSpinResult instanceof RoundInfo) {
        ng = ngOrSpinResult;
    } else {
        ng = ngOrSpinResult.getRoundInfosList()[0];
    }
    let res: string[][];
    if (symbolReducerOrTransformer.length === 2) {
        // @ts-ignore
        res = ng.getSymbolsList().reduce(symbolReducerOrTransformer, []);
    } else {
        // @ts-ignore
        res = symbolReducerOrTransformer(ng.getSymbolsList());
    }
    const reels = res.map((result) => {
        return {
            result,
        };
    });
    return {
        reels,
        mode: SLOT_SPIN_MODE.NORMAL,
    };
}
