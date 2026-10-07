// 【效果側】SkillCardSlot：技能卡效果全載（slot 特化）——執行狀態＋時機協調＋0003 控制通道＋逐局演出
//
// 兩個 per-Lobby class，由 attachSlotSkillCard（檔尾）於 LobbyBase.onLoad 一次建線、onDestroy 拆線：
// - SkillCardSlotManager：DrawRes 收包/phase 狀態/UI 鎖、啟用時機（企劃規則）、
//   與 0003 的 ACTIVATE/ACTIVATE_CONFIRM/DRAW_PROGRESS 通道（含 done 延後補發）
// - SkillCardSlotPlayer：逐局領取演出——unpack 盤面合成 SpinRes 走既有演出管線
// 資料側（查卡/使用/輪詢/0003 資料橋/bootstrap）在 game-client-lib/skillcard/SkillCardGlobal（登入生命週期），
// 經 getSkillCardManager().setPresentation() 注入孔互通；無效果遊戲（魚機/街機）不 import 本檔。
//
// 企劃時機規則：
// - 該局結束才顯示啟用視窗；玩家開著自動連續進行（slot＝自動旋轉）時先暫停
// - 情境一（NoBag 發卡即用）與情境三（Vendor 廠商 /use 後）的卡自動進入啟用視窗；
//   啟用視窗由 gc0003（BagActivateManager）顯示，遊戲端只判斷時機並下行通知，
//   等 0003 回傳確認（玩家點使用或 15 秒自動）才開始領取；無 iframe parent 時直接開始
// - GameBag（遊戲背包）：背包按「使用」即為確認，遊戲內不再彈啟用視窗，
//   已使用的卡於該局結束後直接進入逐局領取；未使用的卡不在遊戲內主動彈窗
import { DEBUG } from 'cc/env';
import {
    BonusListener,
    BonusMessageType,
    GameIdleMessage,
    getBonusIdle,
    getMusicSoundData,
    registerBonusMessage,
    unregisterBonusMessage,
} from '../../game-client-lib/BonusEventGlobal';
import { htmlControlShowToast } from '../../game-client-lib/HtmlControlGlobal';
import { translateError } from '../../game-client-lib/I18nGlobal';
import { hasWindowParent } from '../../game-client-lib/IframeGlobal';
import {
    getSkillCardManager,
    ISkillCardComm,
    ISkillCardPresentation,
    setSkillCardCapability,
    setSkillCardEnvelopeMeta,
    SKILL_CARD_ENUM,
    SKILL_CARD_LOG,
    SKILL_CARD_POST,
    SkillCardError,
    skillCardErrorSignature,
    skillCardLog,
    skillCardPost,
} from '../../game-client-lib/SkillCardGlobal';
import {
    getPacketBalance,
    SkillCardBagType,
    SkillCardDrawRes,
    SkillCardInfo,
    SkillCardKey,
    SkillCardState,
    SkillCardType,
} from '../../game-client-lib/protobuf/SkillCardProto';
import { Any, MsgCode, Result } from '../../game-client-lib/protobuf/ProtobufWarp';
import { Balance, balance } from '../../game-client-lib/utils/Balance';
import BalanceData from '../../game-client-lib/utils/BalanceData';
import CommListener from '../../game-client-lib/utils/CommListener';
import { SpinData, SpinRes, SpinResult } from '../protobuf/ProtobufWarp';

/** result.code 語義：0=系統錯誤（該局未結算可重試同一局） */
const CODE_SUCCESS = 1;
const CODE_SYSTEM_ERROR = 0;

/** 等待該局收尾的重試延遲 */
const TRY_DELAY_MS = 300;

/** 0003 啟用視窗未回應的逾時保險（15 秒自動確認 + 緩衝）：逾時視同確認直接開始領取 */
const ACTIVATE_CONFIRM_TIMEOUT_MS = 20000;

const LISTEN_KEYS: string[] = [SkillCardKey.SkillCardDrawRes];

/** 效果側對連線層的完整依賴（含 draw；CommunicationBase 已符合） */
export interface ISkillCardDrawComm extends ISkillCardComm {
    requestSkillCardDraw(cardId: string): void;
}

enum SkillCardPhase {
    IDLE = 0,
    DRAWING = 1,
}

/**
 * skillCardRounds 節點（免費旋轉次數）的顯示字串：「剩餘可用/總數」遞減顯示 ——
 * 開始拿到 N/N，每用掉一次 -1，至 0/N 領完（隨後由收尾流程隱藏節點）
 * @returns total <= 0 回 ''（表示隱藏 skillCardRounds 節點）；剩餘 = total - consumed 夾在 [0, total]
 */
export function skillCardRoundsText(consumed: number, total: number): string {
    if (!total || total <= 0) {
        return '';
    }
    const remaining = Math.min(Math.max(total - consumed, 0), total);
    return `${remaining}/${total}`;
}

export interface SkillCardDrawResult {
    cardId: string;
    totalRounds: number;
    consumedRounds: number;
    /** 發卡鎖定的顯示用押注（10^-4 元 = 元×10^4，與 Balance／spinData.totalbet 同單位，原值不轉換） */
    displayBet: number;
    /** google.protobuf.Any（messages.SpinResult），由 Player unpack */
    spinResultAny: Any;
    /** 入帳後最新餘額（PacketRes.packet_info），可能為 null（異常時） */
    balance: string | null;
    /** consumed == total，該卡領完 */
    done: boolean;
}

/** 共用錯誤處理器（呼叫端注入）：接手帶 result 的協定錯誤；slot 注入 SlotGlobal.handleError 的封裝 */
export type SkillCardResultErrorHandler = (result: any, resp: any) => void;

/** 效果側對 Lobby 的依賴（LobbyBase/SlotLobbyBase 結構上已符合；Manager 與 Player 共用同一物件） */
export interface ISkillCardLobby {
    isIdle: boolean;
    main: {
        getGameId(): string;
    };
    spinData: SpinData;
    skillCardPlayer: SkillCardSlotPlayer;
    /** 技能卡起轉（SlotLobbyBase 實作：同 onSpin 但送 SkillCardDrawReq、不檢查餘額） */
    spinBySkillCard?(cardId: string): void;
    /** 技能卡中止（SlotLobbyBase 實作：停輪重置，恢復可投注） */
    skillCardAbort?(): void;
    /** 合成 SpinRes 餵入既有演出管線 */
    onMessage(obj: any): void;
    uiBetable(able: boolean, fg?: boolean, isIdle?: boolean): void;
    updateBalance(balance: Balance, difference?: number, serial?: number, finished?: boolean): BalanceData;
    /** 暫停自動連續進行（slot＝關閉自動旋轉），技能卡開始前呼叫（LobbyBase 實作） */
    skillCardPauseAutoPlay(): void;
    /** 自動連續進行中？（slot＝自動旋轉盤數未歸零；LobbyBase 實作） */
    skillCardIsAutoPlaying(): boolean;
    /** 自動旋轉中斷提示顯示/隱藏——auto 已停但該局一般下注仍在跑的期間（LobbyBase 實作：畫面中黑底橫幅） */
    skillCardShowAutoStop(show: boolean): void;
    /** 技能卡佔用期間鎖定 倍率/自動/FeatureBuy/PowerBet（LobbyBase 實作） */
    skillCardSetUiLock(locked: boolean): void;
    /** 技能卡局演出完成回呼（LobbyBase.finalRoundf 於 isDrawing 時觸發） */
    skillCardRoundComplete?: () => void;
    /** 開放 SPIN 等待玩家領取下一局（倍率/自動仍鎖定；LobbyBase 實作含提示文字） */
    skillCardArmSpin(): void;
    /** 更新 spin 按鈕上的 skillCardRounds 節點（免費旋轉「剩餘可用/總數」遞減；免費遊戲卡顯示「免費遊戲」），total<=0 隱藏（LobbyBase 實作） */
    skillCardUpdateRounds(consumed: number, total: number, cardType?: SkillCardType): void;
    /** 收尾恢復 UI 並清除提示（LobbyBase 實作） */
    skillCardFinishUi(): void;
    /** 畫面押注改顯示卡片金額（LobbyBase 實作：rawTotalBet ← displayBet） */
    skillCardShowBet(displayBet: number): void;
    /** 恢復玩家自己檔位的押注顯示（LobbyBase 實作：refreshLevel） */
    skillCardRestoreBet(): void;
    /** 把押注檔位真的切到卡上的檔位（bet_unit 單線押注，10^-4 元；LobbyBase 實作，不寫 localStorage）。
     *  不是只改顯示金額 —— 演出與 FeatureBuy 價格等讀 level 的地方才會與盤面一致。
     *  與 skillCardRestoreBet 成對，恢復時一併切回玩家原本的檔位。 */
    skillCardApplyLevel(betUnit: number): void;
    /** 切到卡片的 selection（加押選項；各遊戲實作：與目前相同則不動，動畫類切換回 Promise 讓第一局等它播完）。
     *  回 Promise 時**必須**會 resolve —— 第一局排在它之後起轉，不 resolve 等於把卡鎖死（lib 不設逾時）。 */
    skillCardApplySelection?(selection: number): void | Promise<void>;
    /** 領完/中止後切回玩家原本的 selection（各遊戲實作，與 skillCardApplySelection 成對） */
    skillCardRestoreSelection?(): void | Promise<void>;
}

/**
 * 效果側管理者（per-Lobby 實例，隨 onLoad/onDestroy 建拆；由 attachSlotSkillCard 建線）：
 * - DrawRes 收包與 IDLE/DRAWING phase（Player 以 begin/endDraw 標記；isUiLocked 為投注鎖權威）
 * - 啟用時機（企劃規則）：查卡結果 → 等該局結束 → 0003 啟用視窗 → 交給 Player 逐局領取
 * - 0003 控制通道：下行 ACTIVATE/DRAW_PROGRESS（done 延後補發）、上行 ACTIVATE_CONFIRM
 */
export class SkillCardSlotManager implements CommListener<any>, ISkillCardPresentation, BonusListener {

    /** BonusEventGlobal.emitBonusMessage 會檢查 listener.isValid，非 Component 需自行提供 */
    public isValid: boolean = true;

    /** 逐局演出回呼（attachSlotSkillCard 接線給 Player）；先演出、後下行進度，順序與舊版事件訂閱等價 */
    public onDrawResult: (d: SkillCardDrawResult) => void = () => { };

    private lobby: ISkillCardLobby;
    private comm: ISkillCardDrawComm;
    /** 帶 result 的協定錯誤處理器（呼叫端注入）；null 時退回 toast 保險 */
    private handleResultError: SkillCardResultErrorHandler | null;

    // --- 領取階段（由演出層 Player 標記，供投注 gating 查詢） ---
    private phase: SkillCardPhase = SkillCardPhase.IDLE;
    private drawingCardId: string | null = null;

    // --- 0003 控制通道 ---
    /** 最後一局 DrawRes 已到（server 已 FINISHED）但演出未完：暫存待演出收尾（endDraw）補發 done:true */
    private pendingDoneProgress: { cardId: string, consumedRounds: number, totalRounds: number } | null = null;

    // --- 啟用時機 ---
    /** 等待 0003 啟用視窗確認中的卡（等待期間不重複觸發）；null=無等待 */
    private pendingActivateCard: SkillCardInfo | null = null;
    private activateTimer: any = null;
    private activateTimeoutMs: number = ACTIVATE_CONFIRM_TIMEOUT_MS;
    private tryTimer: any = null;
    private firstCards: boolean = true;
    /** 錯誤 toast 去重：同 source+code 只提示一次，查卡成功後重置 */
    private lastErrorToastSignature: string = '';
    /** 自動旋轉中斷提示顯示中？（scheduleTry 每 300ms 重入 tryActivate，不可重複觸發淡入） */
    private autoStopShown: boolean = false;

    // 首次查卡（登入/重連後）：零延遲恢復使用中狀態，封住登入空窗；後續維持 debounce 合併
    private cardsHandler = () => {
        this.lastErrorToastSignature = ''; // 查卡成功：重置錯誤 toast 去重（再錯會再提示）
        this.syncSkillCardRounds(); // 收到查卡回包即更新 skillCardRounds 節點（免費旋轉局數），不等領取啟動
        if (this.firstCards) {
            this.firstCards = false;
            this.clearTryTimer();
            this.tryActivate();
            return;
        }
        this.scheduleTry();
    }
    // UseRes 已回：零延遲嘗試啟動（GameBag 直接開始），消除「使用→啟用」空窗
    private useHandler = () => { this.syncSkillCardRounds(); this.clearTryTimer(); this.tryActivate(); };
    private errorHandler = (e: SkillCardError) => this.onError(e);
    // 佔用狀態轉折（使用送出/回包、查卡、領取開始/結束）→ 同步按鈕鎖定
    private lockHandler = () => {
        this.lobby.skillCardSetUiLock(this.isUiLocked(this.lobby.main.getGameId()));
    }
    private windowHandler = (e: MessageEvent) => this.onWindowMessage(e);

    constructor(lobby: ISkillCardLobby, comm: ISkillCardDrawComm,
                handleResultError: SkillCardResultErrorHandler | null = null) {
        this.lobby = lobby;
        this.comm = comm;
        this.handleResultError = handleResultError;
    }

    public attach() {
        this.comm.registListener(LISTEN_KEYS, this);
        const skillCard = getSkillCardManager();
        skillCard.setPresentation(this);
        skillCard.on('cardsUpdated', this.cardsHandler);
        skillCard.on('useResult', this.useHandler);
        skillCard.on('error', this.errorHandler);
        skillCard.on('lockChanged', this.lockHandler);
        registerBonusMessage(this); // 借用 GameIdleMessage 作為「該局結束」訊號
        window.addEventListener('message', this.windowHandler, false); // 0003 啟用視窗確認
    }

    /** onDestroy 完整收尾：實例即棄，不留任何殘留狀態（per-Lobby，無跨場景 rebind 需求） */
    public detach() {
        this.isValid = false;
        this.comm.unregistListener(LISTEN_KEYS, this);
        const skillCard = getSkillCardManager();
        skillCard.off('cardsUpdated', this.cardsHandler);
        skillCard.off('useResult', this.useHandler);
        skillCard.off('error', this.errorHandler);
        skillCard.off('lockChanged', this.lockHandler);
        skillCard.setPresentation(null);
        unregisterBonusMessage(this);
        window.removeEventListener('message', this.windowHandler, false);
        this.lobby.skillCardSetUiLock(false); // 離場解鎖，避免殘留鎖定狀態
        this.setAutoStop(false); // 離場關提示，避免殘留橫幅
        this.clearActivateWait();
        this.clearTryTimer();
        this.phase = SkillCardPhase.IDLE;
        this.drawingCardId = null;
        this.pendingDoneProgress = null;
        this.onDrawResult = () => { };
    }

    public onBonusMessage(obj: BonusMessageType) {
        if (obj instanceof GameIdleMessage && obj.isIdle) {
            this.scheduleTry();
        }
    }

    // --- 領取階段 ---

    public beginDraw(cardId: string) {
        this.drawingCardId = cardId;
        this.phase = SkillCardPhase.DRAWING;
        getSkillCardManager().notifyLockChanged();
    }

    /** 演出收尾（Player finishInternal/abort）：回 IDLE 並補發暫存的最後一局完成通知 */
    public endDraw() {
        this.drawingCardId = null;
        this.phase = SkillCardPhase.IDLE;
        this.flushPendingDone();
        getSkillCardManager().notifyLockChanged();
    }

    public isDrawing(): boolean {
        return this.phase === SkillCardPhase.DRAWING;
    }

    public getDrawingCardId(): string | null {
        return this.drawingCardId;
    }

    /**
     * 本遊戲技能卡佔用中（使用確認中/有已使用未領完卡/領取中）：
     * 期間鎖定 倍率/自動/FeatureBuy/PowerBet 按鈕（lockChanged 轉發時以此查詢）
     */
    public isUiLocked(gameId: string): boolean {
        const skillCard = getSkillCardManager();
        return skillCard.isUsePending() || this.isDrawing() || skillCard.getCards(gameId).some(c =>
            c.getUseTime() > 0 && c.getState() !== SkillCardState.SKILL_CARD_FINISHED);
    }

    // --- DrawRes 收包 ---

    public onMessage(obj: any) {
        if (obj instanceof SkillCardDrawRes) {
            this.onDrawRes(obj);
        }
    }

    private onDrawRes(res: SkillCardDrawRes) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包收包：SkillCardDrawRes 完整內容=', JSON.stringify(res.toObject()));
            }
        }
        const skillCard = getSkillCardManager();
        const code = res.getResult()?.getCode();
        const cardId = res.getCardId();
        if (code !== CODE_SUCCESS) {
            const retryable = code === CODE_SYSTEM_ERROR; // 0：該局未結算，重領拿到同一局
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：領取失敗 code=', code, '可重試=', retryable, 'card=', cardId);
                }
            }
            if (!retryable) {
                skillCard.check(); // 6/1003：卡不存在或不可用，重查刷新背包
            }
            skillCard.raiseError({ code, retryable, cardId, source: 'draw', result: res.getResult(), resp: res });
            return;
        }

        // 同步資料側快取進度
        const cached = skillCard.getCard(cardId);
        const total = res.getTotalRounds();
        const consumed = res.getConsumedRounds();
        const done = consumed >= total;
        if (cached) {
            cached.setConsumedRounds(consumed);
            cached.setState(done ? SkillCardState.SKILL_CARD_FINISHED : SkillCardState.SKILL_CARD_IN_USE);
            skillCard.notifyLockChanged();
        }

        const pb = getPacketBalance(res);
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包：領取成功 局數=', consumed, '/', total, '入帳後餘額=', pb ? pb.balance : '(無 packet_info)');
            }
        }
        const result: SkillCardDrawResult = {
            cardId,
            done,
            totalRounds: total,
            consumedRounds: consumed,
            displayBet: res.getDisplayBet(), // 10^-4 元，與 spinData.totalbet 同單位（fixAmountNumber ×10^4 建構）
            spinResultAny: res.getSpinResult(),
            balance: pb ? pb.balance : null,
        };
        this.onDrawResult(result); // 先演出（Player 起演出/收尾）——順序等價舊版「Player 先訂閱」
        this.postDrawProgress(result); // 後下行進度給 0003
    }

    // --- 0003 控制通道 ---

    private postDrawProgress(d: SkillCardDrawResult) {
        if (d.done) {
            // 最後一局：server 已 FINISHED 但演出未完 —— 先以 done:false 更新進度（0003 維持「使用中」），
            // 待演出收尾（endDraw，含 abort）再補發 done:true 讓 0003 轉「已完成」
            this.pendingDoneProgress = { cardId: d.cardId, consumedRounds: d.consumedRounds, totalRounds: d.totalRounds };
            skillCardPost(SKILL_CARD_POST.DRAW_PROGRESS, { ...this.pendingDoneProgress, done: false });
            return;
        }
        skillCardPost(SKILL_CARD_POST.DRAW_PROGRESS, {
            cardId: d.cardId,
            consumedRounds: d.consumedRounds,
            totalRounds: d.totalRounds,
            done: d.done,
        });
    }

    private flushPendingDone() {
        if (!this.pendingDoneProgress) {
            return;
        }
        const d = this.pendingDoneProgress;
        this.pendingDoneProgress = null;
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包橋：演出收尾 補發完成通知 card=', d.cardId);
            }
        }
        skillCardPost(SKILL_CARD_POST.DRAW_PROGRESS, { ...d, done: true });
    }

    /**
     * 請 0003 顯示啟用視窗（no_bag/vendor，時機由 tryActivate 判斷）
     * @returns false = 無 iframe parent（遊戲單獨開），呼叫端應直接開始領取
     */
    private postActivate(card: SkillCardInfo): boolean {
        if (!hasWindowParent()) {
            return false;
        }
        skillCardPost(SKILL_CARD_POST.ACTIVATE, { card: card.toObject() });
        return true;
    }

    private onWindowMessage(e: MessageEvent) {
        if (!hasWindowParent()) {
            return;
        }
        let param: any = null;
        try {
            param = JSON.parse(e.data);
        } catch (err) {
            return; // 非 JSON 訊息（其他系統的 message），忽略
        }
        if (!param || param.method !== SKILL_CARD_ENUM.SKILL_CARD_ACTIVATE_CONFIRM) {
            return;
        }
        if (param.data && param.data.cardId) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包橋：收到 0003 啟用視窗確認 card=', param.data.cardId);
                }
            }
            this.finishActivate(String(param.data.cardId));
        }
    }

    // --- 啟用時機 ---

    /** 下一張待啟用的卡：已使用（use_time > 0）且未領完；多張時最先使用（use_time 最小）優先 */
    private nextPendingCard(): SkillCardInfo | null {
        const gameId = this.lobby.main.getGameId();
        const cards = getSkillCardManager().getCards(gameId).filter(c =>
            c.getUseTime() > 0 && c.getState() !== SkillCardState.SKILL_CARD_FINISHED);
        cards.sort((a, b) => a.getUseTime() - b.getUseTime());
        return cards[0] || null;
    }

    /**
     * skillCardRounds（免費旋轉局數）顯示時機：按過「使用」才顯示。
     * - GameBag：背包按「使用」即為確認，查卡/使用回包一到就先顯示「剩餘可用/總數」，
     *   不等 idle 條件過後的 Player.start（領取中由 Player 自行維護，這裡不介入）
     * - no_bag/vendor：等啟用視窗確認（confirm 後 Player.start 隨即接手顯示），等待期間隱藏
     */
    private syncSkillCardRounds() {
        if (this.lobby.skillCardPlayer.isActive()) {
            return;
        }
        const card = this.nextPendingCard();
        if (card && card.getBagType() === SkillCardBagType.SKILL_CARD_BAG_GAME) {
            this.lobby.skillCardUpdateRounds(card.getConsumedRounds(), card.getTotalRounds(), card.getCardType());
        } else {
            this.lobby.skillCardUpdateRounds(0, 0); // 無待領卡或等待啟用確認中：隱藏 skillCardRounds
        }
    }

    private scheduleTry() {
        this.clearTryTimer();
        this.tryTimer = setTimeout(() => this.tryActivate(), TRY_DELAY_MS);
    }

    private clearTryTimer() {
        if (this.tryTimer) {
            clearTimeout(this.tryTimer);
            this.tryTimer = null;
        }
    }

    /** 自動旋轉中斷提示開關（去重：scheduleTry 每 300ms 重入 tryActivate，同狀態不重複下達） */
    private setAutoStop(show: boolean) {
        if (this.autoStopShown === show) {
            return;
        }
        this.autoStopShown = show;
        this.lobby.skillCardShowAutoStop(show);
    }

    public tryActivate() {
        if (!this.isValid || this.pendingActivateCard || this.lobby.skillCardPlayer.isActive()) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：暫不啟用（等待啟用確認或演出進行中）');
                }
            }
            return;
        }
        // 企劃：auto 進行中使用技能卡 → 立刻停 auto，該局一般下注照常跑完。
        // 必須在下方 idle 檢查之前：finalRoundf 的 autoNext 分支不呼叫 uiBetable(true)，
        // auto 期間 isIdle 恆 false，停 auto 放在檢查之後永遠執行不到（無限 auto 會永久卡住技能卡）。
        // 停 auto 後 isAutoNextRound() 即回 false，該局結束走 else 分支開放投注，下方檢查才會過。
        if (this.nextPendingCard() && this.lobby.skillCardIsAutoPlaying()) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：auto 進行中 先停 auto 並顯示中斷提示 等該局一般下注結束');
                }
            }
            this.lobby.skillCardPauseAutoPlay();
            this.setAutoStop(true);
        }
        // 該局結束後才可啟用；紅包/活動彈窗中也不搶
        if (!this.lobby.isIdle || !getBonusIdle() || getSkillCardManager().isDrawing()) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：等待中 isIdle=', this.lobby.isIdle, 'bonusIdle=', getBonusIdle(), 'drawing=', getSkillCardManager().isDrawing());
                }
            }
            // 有待領卡（登入恢復/使用後接續）：自我重試直到條件過，不依賴 GameIdleMessage 時序
            // （gameIdle 初始即 true，登入完成可能無 idle transition 訊號可等）
            if (this.nextPendingCard()) {
                this.scheduleTry();
            }
            return;
        }
        const card = this.nextPendingCard();
        if (!card) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：無待啟用的卡（已使用且未領完才會自動彈啟用視窗）');
                }
            }
            this.setAutoStop(false); // 卡已消失（領完/過期/被撤回）：提示不可殘留
            return;
        }
        // 企劃：該局一般下注已結束（isIdle）→ 關中斷提示，接著開始進行技能卡
        this.setAutoStop(false);
        // 企劃：若玩家開著自動連續進行（slot＝自動旋轉），需暫停後開始進行技能卡
        this.lobby.skillCardPauseAutoPlay();
        // GameBag：背包已按過「使用」，免啟用視窗直接開始（idle 條件已於上方檢查）
        if (card.getBagType() === SkillCardBagType.SKILL_CARD_BAG_GAME) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：GameBag 卡免啟用視窗 直接開始 card=', card.getCardId());
                }
            }
            this.startCard(card);
            return;
        }
        // no_bag/vendor：啟用視窗由 0003（gc0003 BagActivateManager）顯示；
        // 無 iframe parent（遊戲單獨開）時不彈窗直接開始
        if (!this.postActivate(card)) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：無 0003 啟用視窗通道 直接開始 card=', card.getCardId());
                }
            }
            this.startCard(card);
            return;
        }
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包時機：條件符合 請 0003 顯示啟用視窗 card=', card.getCardId());
            }
        }
        this.pendingActivateCard = card;
        this.activateTimer = setTimeout(() => {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：啟用確認逾時保險到期 視同確認 card=', card.getCardId());
                }
            }
            this.finishActivate(card.getCardId());
        },                              this.activateTimeoutMs);
    }

    /** 結束等待（0003 確認或逾時保險）：cardId 相符才開始領取，不符忽略 */
    private finishActivate(cardId: string) {
        const card = this.pendingActivateCard;
        if (!this.isValid || !card || card.getCardId() !== cardId) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：啟用確認忽略（無等待或卡不符）card=', cardId);
                }
            }
            return;
        }
        this.clearActivateWait();
        this.startCard(card);
    }

    private startCard(card: SkillCardInfo) {
        const ok = this.lobby.skillCardPlayer.start(card, () => this.scheduleTry());
        if (!ok) {
            this.scheduleTry();
        }
    }

    private clearActivateWait() {
        if (this.activateTimer) {
            clearTimeout(this.activateTimer);
            this.activateTimer = null;
        }
        this.pendingActivateCard = null;
    }

    /** 任一 SkillCard 回應 result.code !== 1：交給注入的共用錯誤處理器——與一般遊戲錯誤
     * 同一個處理器（slot 注入 SlotGlobal.handleError：key 對照/toast/offline 分流）。
     * draw 錯誤另由 Player.onError 中止本輪展演；use/check 失敗資料側已自動重查。
     * 同 source+code 只提示一次（防輪詢連續失敗每 5 秒洗版），查卡成功後重置。 */
    private onError(e: SkillCardError) {
        const signature = skillCardErrorSignature(e);
        if (signature === this.lastErrorToastSignature) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包時機：同錯誤已提示過 略過提示', signature);
                }
            }
            return;
        }
        this.lastErrorToastSignature = signature;
        if (e.result && this.handleResultError) {
            this.handleResultError(e.result, e.resp);
        } else {
            // 保險：未注入處理器或回應缺 result 物件時仍要有畫面提示
            htmlControlShowToast(translateError('GAME.sysm_error_unknown', e.code));
        }
    }
}

// ============ 逐局演出（slot 特化） ============
// 職責：draw → unpack spin_result → 合成 SpinRes 走既有演出管線 → 局終續抽或收尾。
// 不碰 UI 細節與觸發時機（SkillCardSlotManager 負責）、不解讀協定錯誤碼（資料側負責）。

export class SkillCardSlotPlayer {

    private lobby: ISkillCardLobby;
    private mgr: SkillCardSlotManager;
    private active: boolean = false;
    private awaitingSpin: boolean = false;
    private cardId: string = '';
    private cardType: SkillCardType = SkillCardType.SKILL_CARD_TYPE_FREE_SPIN;
    private pendingDone: boolean = false;
    private lastBalance: string | null = null;
    private onFinish: (() => void) | null = null;
    /** draw 失敗過的卡（如餘額不足遭 server 拒絕）：免費遊戲卡不再自動起轉，
     *  改由玩家按 SPIN 手動重試（避免 失敗→時機重啟→自動起轉 無限輪迴）；draw 成功即移除 */
    private failedDrawCardIds: Set<string> = new Set();

    private errorHandler = (e: SkillCardError) => this.onError(e);

    constructor(lobby: ISkillCardLobby, mgr: SkillCardSlotManager) {
        this.lobby = lobby;
        this.mgr = mgr;
    }

    public attach() {
        this.mgr.onDrawResult = d => this.onDrawResult(d);
        getSkillCardManager().on('error', this.errorHandler);
        this.lobby.skillCardRoundComplete = () => this.onRoundComplete();
    }

    public detach() {
        this.mgr.onDrawResult = () => { };
        getSkillCardManager().off('error', this.errorHandler);
        this.lobby.skillCardRoundComplete = null;
        this.active = false;
    }

    public isActive(): boolean {
        return this.active;
    }

    /**
     * 開始逐局領取（啟用視窗確認後呼叫）
     * 前置：卡片已使用（use_time > 0，未使用不可領）且未領完
     */
    public start(card: SkillCardInfo, onFinish?: () => void): boolean {
        if (this.active || !this.lobby.spinBySkillCard) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：start 被拒（進行中或 Lobby 不支援）active=', this.active);
                }
            }
            return false;
        }
        if (card.getState() === SkillCardState.SKILL_CARD_FINISHED || card.getUseTime() === 0) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：start 被拒（已用完或未啟用）state=', card.getState(), 'useTime=', card.getUseTime());
                }
            }
            return false;
        }
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：開始逐局領取 card=', card.getCardId(), '進度=', card.getConsumedRounds(), '/', card.getTotalRounds());
            }
        }
        this.active = true;
        this.cardId = card.getCardId();
        this.cardType = card.getCardType();
        this.pendingDone = false;
        this.lastBalance = null;
        this.onFinish = onFinish || null;
        this.mgr.beginDraw(this.cardId);
        this.lobby.skillCardUpdateRounds(card.getConsumedRounds(), card.getTotalRounds(), this.cardType);
        // 每局盤面是以卡上快照的 selection（加押選項）算出的，玩家當下所選可能不同：
        // 第一局前先切到卡的 selection（動畫類切換等播完才起轉），領完/中止由 finishInternal 切回。
        //
        // 沒有加押選項的遊戲（未實作 skillCardApplySelection）走同步路徑直接收尾 ——
        // 繞過 Promise 才能保持與加這個功能之前完全一致：不差一個 microtask、
        // 這段丟出的例外照樣往上拋而不是變成 unhandled rejection。
        if (!this.lobby.skillCardApplySelection) {
            this.openFirstRound(card);
            return true;
        }
        this.applySelection(card).then(() => {
            if (!this.active || this.cardId !== card.getCardId()) {
                return; // 等待切換期間已中止或換卡
            }
            this.openFirstRound(card);
        });
        return true;
    }

    /** 押注顯示切成卡片金額後開始第一局。
     *  順序不可調換：各遊戲切 selection 會重算押注顯示（refreshLevel），先設會被蓋掉。 */
    private openFirstRound(card: SkillCardInfo) {
        // 押注檔位真的切到卡上的檔位（bet_unit）——只改顯示的話，演出與 FeatureBuy 價格等
        // 讀 level 的地方仍是玩家自己的檔位，與本局盤面對不上。要在 showBet 之前：
        // 切檔位會重算押注顯示，顯示以 server 的 display_bet 為準（加押倍率已算在裡面）
        if (card.getBetUnit() > 0) {
            this.lobby.skillCardApplyLevel(card.getBetUnit());
        }
        // 進入領取即把畫面押注切成卡片金額（含等待第一局；每局 DrawRes 再以 server 值校正）
        if (card.getDisplayBet() > 0) {
            this.lobby.skillCardShowBet(card.getDisplayBet());
        }
        this.beginFirstRound();
    }

    /** 切到卡的 selection（呼叫端已確認遊戲有實作）：
     *  切換失敗只記 log 照常起轉 —— selection 只影響演出，不影響入帳。 */
    private applySelection(card: SkillCardInfo): Promise<void> {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：第一局前切到卡的 selection=', card.getSelection());
            }
        }
        return Promise.resolve()
            .then(() => this.lobby.skillCardApplySelection(card.getSelection()))
            .catch((e) => {
                if (DEBUG) {
                    if (SKILL_CARD_LOG) {
                        skillCardLog('背包演出：切換 selection 失敗 照常起轉', e);
                    }
                }
            });
    }

    /** 第一局：免費遊戲卡自動起轉、免費旋轉卡等玩家按 SPIN */
    private beginFirstRound() {
        // 免費遊戲卡（feature_buy，發卡保證總次數 1）：按「使用」即視同按下 SPIN 立刻進入免費遊戲
        if (this.cardType === SkillCardType.SKILL_CARD_TYPE_FREE_GAME) {
            // 曾領取失敗（如餘額為零遭 server 拒絕）：不自動起轉，等玩家按 SPIN 手動重試
            if (this.failedDrawCardIds.has(this.cardId)) {
                if (DEBUG) {
                    if (SKILL_CARD_LOG) {
                        skillCardLog('背包演出：免費遊戲卡 曾領取失敗 改等玩家按 SPIN 重試');
                    }
                }
                this.armSpin();
                return;
            }
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：免費遊戲卡 自動開始（免按 SPIN）');
                }
            }
            this.awaitingSpin = true;
            this.onSpinPressed();
            return;
        }
        // 企劃：免費旋轉領取每一局都由玩家主動按 SPIN（含第一局），不自動起轉
        this.armSpin();
    }

    /** 領取中玩家按下 SPIN（LobbyBase.onSpinClick 轉呼叫）：領下一局 */
    public onSpinPressed() {
        if (!this.active || !this.awaitingSpin) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：SPIN 忽略（非等待領取狀態）');
                }
            }
            return;
        }
        this.awaitingSpin = false;
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：玩家按下 SPIN 領取下一局');
            }
        }
        this.drawNext();
    }

    /** 開放 SPIN 等待玩家操作（倍率/自動/購買維持鎖定） */
    private armSpin() {
        this.awaitingSpin = true;
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：等待玩家按 SPIN（倍率/自動已鎖定）');
            }
        }
        this.lobby.skillCardArmSpin();
    }

    private drawNext() {
        this.lobby.spinBySkillCard(this.cardId);
    }

    private onDrawResult(d: SkillCardDrawResult) {
        if (!this.active || d.cardId !== this.cardId) {
            return;
        }
        const anyContent: Any = d.spinResultAny;
        if (!anyContent) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：領取回包缺 spin_result 中止本輪');
                }
            }
            this.abort();
            return;
        }
        let sr: SpinResult;
        try {
            sr = anyContent.unpack(SpinResult.deserializeBinary, anyContent.getTypeName());
        } catch (e) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：spin_result 解包失敗 中止本輪', e);
                }
            }
            this.abort();
            return;
        }
        this.failedDrawCardIds.delete(this.cardId); // 領取成功：解除失敗記錄（下次可再自動起轉）
        this.pendingDone = d.done;
        this.lastBalance = d.balance;
        this.lobby.skillCardUpdateRounds(d.consumedRounds, d.totalRounds, this.cardType);
        // 發卡鎖定的顯示用押注（10^-4 元，server 原值）：spinData 供 bigwin 倍數計算，另同步畫面 totalBet 標籤
        if (d.displayBet && this.lobby.spinData) {
            this.lobby.spinData.setTotalbet(d.displayBet);
            this.lobby.skillCardShowBet(d.displayBet);
        }
        // 合成 SpinRes 餵入既有演出管線（與日常 spin 完全共用）
        const res = new SpinRes();
        const r = new Result();
        r.setCode(MsgCode.SUCCESS);
        res.setResult(r);
        res.setSpinResult(sr);
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：收到盤面 開始演出 局=', d.consumedRounds, '/', d.totalRounds);
            }
        }
        this.lobby.onMessage(res);
    }

    /** 一局演出完成（finalRoundf 回呼）：校正餘額後續抽或收尾 */
    private onRoundComplete() {
        if (!this.active) {
            return;
        }
        // 每局入帳後最新餘額以 packet_info.balance 為準（協定 §5），不自行累加
        if (this.lastBalance !== null) {
            this.lobby.updateBalance(balance(this.lastBalance));
            this.lastBalance = null;
        }
        if (this.pendingDone) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：全部領完 收尾恢復 UI');
                }
            }
            this.finish();
        } else {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包演出：該局演出完成 開放 SPIN 等待玩家領下一局');
                }
            }
            this.armSpin();
        }
    }

    private onError(e: SkillCardError) {
        if (!this.active || e.source !== 'draw') {
            return;
        }
        // code 0：該局未結算可重試；6/1003：卡不可用（資料側已自動重查）。
        // 一律中止本輪展演，訊息提示交給 SkillCardSlotManager.onError。
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包演出：領取錯誤 中止本輪 code=', e.code);
            }
        }
        this.failedDrawCardIds.add(this.cardId);
        this.abort();
    }

    /** 中止（錯誤/斷線）：停輪重置並恢復 UI */
    public abort() {
        if (!this.active) {
            return;
        }
        this.lobby.skillCardAbort?.();
        this.finishInternal();
    }

    private finish() {
        this.lobby.skillCardFinishUi();
        this.finishInternal();
    }

    private finishInternal() {
        this.lobby.skillCardUpdateRounds(0, 0); // 隱藏 skillCardRounds 節點（領完與中止皆走此）
        this.lobby.skillCardRestoreBet(); // 畫面押注恢復玩家自己的檔位
        this.lobby.skillCardRestoreSelection?.(); // 切回玩家原本的 selection（不等動畫）
        this.active = false;
        this.awaitingSpin = false;
        this.cardId = '';
        this.pendingDone = false;
        this.mgr.endDraw();
        const f = this.onFinish;
        this.onFinish = null;
        f?.();
    }
}

// --- slot 接線（LobbyBase.onLoad/onDestroy 各一行）---
// SkillCardSlotManager（狀態/時機/0003 通道）＋ SkillCardSlotPlayer（逐局演出）建線，
// 並宣告能力 caps（0003 據此顯示「使用」鈕）與信封 m/s 來源。
// 資料橋/查卡/輪詢不在此——由 game-client-lib 的 skillCardOnAuth 於登入時統一接線。

/**
 * @param lobby LobbyBase（結構上需滿足 ISkillCardLobby；
 *              spinData/isIdle 為 protected 與介面 public 可見性不合，故收 any——既知取捨）
 */
export function attachSlotSkillCard(lobby: any, handleResultError: SkillCardResultErrorHandler) {
    setSkillCardEnvelopeMeta(() => getMusicSoundData());
    // 錯誤處理注入 SlotGlobal.handleError——與一般遊戲錯誤同一個處理器
    const mgr = new SkillCardSlotManager(lobby, lobby.comm, handleResultError);
    lobby.skillCardManager = mgr;
    lobby.skillCardPlayer = new SkillCardSlotPlayer(lobby, mgr);
    mgr.attach();
    lobby.skillCardPlayer.attach();
    setSkillCardCapability({ effect: true, kind: 'slot', activateWindow: true });
}

/** LobbyBase.onDestroy 呼叫：只拆效果側；資料橋/輪詢屬登入生命週期，不在此清理 */
export function detachSlotSkillCard(lobby: any) {
    lobby.skillCardPlayer?.detach();
    lobby.skillCardManager?.detach();
    lobby.skillCardPlayer = null;
    lobby.skillCardManager = null;
}
