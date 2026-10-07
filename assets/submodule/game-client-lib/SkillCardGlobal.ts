// 【資料層】SkillCardGlobal：技能卡資料核心＋0003 資料橋＋登入 bootstrap（單檔＝資料側全部）
//
// 職責邊界（spec 2026-08-25-skillcard-databridge-refactor）：
// - 只管「與 server 的背包資料互動」：查卡/使用/輪詢/快取/事件/0003 postMessage——
//   所有遊戲型別（魚機/老虎機/街機）皆適用、零 lobby 依賴
// - 逐局領取（draw）/ phase / UI 鎖定等效果側屬 slot-client-lib/skillcard/SkillCardSlot（optional，
//   無效果遊戲不安裝），經 setPresentation() 注入孔回看；未注入時 isDrawing() 恆 false
// - 生命週期為「登入驅動」（skillCardOnAuth 掛在 CommunicationBase.requestAuth）：
//   init 支援 rebind-on-different-comm（魚機 Lobby↔Table 換場景重建 comm）；
//   輪詢不需要任何人 stop——tick 以 comm.loginState 自檢（沒有人負責 stop＝沒有人會忘記 stop）
import { DEBUG } from 'cc/env'; // cocos2 移植唯一差異行：改讀全域 CC_DEBUG
import { LoginState, isLogin } from './data/LoginState';
import { hasWindowParent } from './IframeGlobal';
import { IS_GUEST } from './ParamsGlobal';
import {
    SkillCardCheckRes,
    SkillCardEventInfo,
    SkillCardInfo,
    SkillCardKey,
    SkillCardState,
    SkillCardUseRes,
} from './protobuf/SkillCardProto';
import CommListener from './utils/CommListener';

/** 背包除錯 log 總開關：預設開；要看 log 改成 true 重編（deploy 版另有 DEBUG 為 false 保險） */
export const SKILL_CARD_LOG = true;

/** 背包除錯 log：統一 '@@xx ' 前綴、繁中說明；僅 DEBUG build 且開關開啟才輸出，deploy 版不印 */
export function skillCardLog(...args: any[]) {
    if (DEBUG) {
        if (SKILL_CARD_LOG) {
            // tslint:disable-next-line:no-console
            console.log('[skillcard]', ...args);
        }
    }
}

/** result.code 語義（見 doc/後端前端協定 §6）：1=成功 6=卡不存在 1003=不可用 0=系統錯誤(可重試同一局) */
const CODE_SUCCESS = 1;

/** 定時查卡間隔（比照紅包 BonusEventUI 每 5 秒 checkBonus）：獲得新卡即時通知 */
const POLL_INTERVAL_MS = 5000;
/** 查卡防重入逾時：回包遺失時自動解除，避免輪詢卡死 */
const CHECK_PENDING_TIMEOUT_MS = 15000;

/**
 * 下行給 0003 的展演層遮罩（資料橋用）：最後一局 server 已標 FINISHED 但遊戲演出未完，
 * 領取中那張卡以 IN_USE 下行，待演出收尾後才讓 0003 轉「已完成」。
 * 吃 toObject 後的 plain object，回傳新陣列、不改動輸入；drawingCardId 為 null 時原樣返回。
 */
export function maskDrawingCardFinished<T extends { cardId: string, state: number }>(
    cards: T[],
    drawingCardId: string | null,
): T[] {
    if (!drawingCardId) {
        return cards;
    }
    return cards.map(c => c.cardId === drawingCardId && c.state === SkillCardState.SKILL_CARD_FINISHED
        ? { ...c, state: SkillCardState.SKILL_CARD_IN_USE }
        : c);
}

/**
 * 下行給 0003 的展演層正規化（資料橋用）：已使用（use_time>0）但尚未領取任一局的卡，
 * server state 可能仍為 UNUSED，一律以 IN_USE 下行（與 0003 mapCard 的 useTime 推導同語意，源頭先對齊）。
 * 吃 toObject 後的 plain object，回傳新陣列、不改動輸入。
 */
export function normalizeUsedCardState<T extends { state: number, useTime: number }>(cards: T[]): T[] {
    return cards.map(c => c.state === SkillCardState.SKILL_CARD_UNUSED && c.useTime > 0
        ? { ...c, state: SkillCardState.SKILL_CARD_IN_USE }
        : c);
}

export interface SkillCardCardsUpdated {
    cards: SkillCardInfo[];
    events: SkillCardEventInfo[];
}

export interface SkillCardUseResult {
    card: SkillCardInfo;
}

export interface SkillCardError {
    source: 'check' | 'use' | 'draw';
    code: number;
    /** true：該局未結算可重試（code 0）；false：不可用，快取已自動重查 */
    retryable: boolean;
    cardId?: string;
    /** 原始 gamebase.Result 與回應物件：供 Coordinator 轉交注入的共用錯誤處理器 */
    result?: any;
    resp?: any;
}

/**
 * 錯誤提示去重簽名：「同 source+code 只提示一次」（查卡成功後由呼叫端重置）。
 * 訊息內容交由呼叫端注入的共用錯誤處理器決定（slot＝SlotGlobal.handleError），本層不選 key。
 */
export function skillCardErrorSignature(e: Pick<SkillCardError, 'source' | 'code'>): string {
    return `${e.source}:${e.code}`;
}

export interface SkillCardCoreEvents {
    cardsUpdated: SkillCardCardsUpdated;
    /** 新獲得的卡（查卡 diff；首次查卡只記名單不算獲得）。展演/通知由訂閱端決定 */
    cardsGained: { cards: SkillCardInfo[] };
    useResult: SkillCardUseResult;
    /** UI 鎖定依據可能變化（使用送出/回包、查卡、主控制層領取開始/結束）；訂閱者自行查詢鎖定狀態 */
    lockChanged: {};
    /** check/use 由本層發出；draw 錯誤由主控制層經 raiseError 併入同一通道（0003 與 Coordinator 單一訂閱點） */
    error: SkillCardError;
}

/** Core 對連線層的最小依賴（CommunicationBase 已符合此介面；draw 屬主控制層 ISkillCardDrawComm） */
export interface ISkillCardComm {
    registListener(keys: string[], listener: CommListener<any>): void;
    unregistListener(keys: string[], listener: CommListener<any>): void;
    requestSkillCardCheck(): void;
    requestSkillCardUse(cardId: string): void;
    /** 四種核心請求序列化閘門；未提供時視為不在途 */
    isRequestPending?(): boolean;
    /** 輪詢 tick 自檢用；未提供時視為永遠已登入 */
    loginState?: LoginState;
}

/** 效果側注入孔：slot-client-lib/skillcard/SkillCardSlot 的 Manager attach 時實作並注入；無效果遊戲恆 null */
export interface ISkillCardPresentation {
    isDrawing(): boolean;
    getDrawingCardId(): string | null;
}

const LISTEN_KEYS: string[] = [
    SkillCardKey.SkillCardCheckRes,
    SkillCardKey.SkillCardUseRes,
];

export class SkillCardManager implements CommListener<any> {

    private comm: ISkillCardComm | null = null;
    private enabled: boolean = true;
    private cards: SkillCardInfo[] = [];
    private events: SkillCardEventInfo[] = [];
    private pendingUseCardId: string = '';
    private pollTimer: any = null;
    private checkSentAt: number = 0;
    private handlers: { [key: string]: ((payload: any) => void)[] } = {};
    /** 獲得 diff 名單：非首次查卡出現的新 cardId 才算「獲得」（cardsGained） */
    private knownCardIds: { [cardId: string]: boolean } = {};
    private firstCheck: boolean = true;
    private presentation: ISkillCardPresentation | null = null;

    // --- 生命週期 ---

    /**
     * 綁定連線層（SkillCardBootstrap 於 AuthRes 成功時呼叫）。
     * rebind-on-different-comm：魚機 Lobby↔Table 換場景會重建 comm component，
     * 同實例冪等、不同實例解除舊註冊改綁新的（快取/名單保留——同一連線身分）。
     * @param enabled false（如 guest 試玩）：check()/startPolling() 直接略過
     */
    public init(comm: ISkillCardComm, enabled: boolean = true) {
        if (this.comm === comm) {
            return;
        }
        if (this.comm) {
            this.comm.unregistListener(LISTEN_KEYS, this);
        }
        this.enabled = enabled;
        this.comm = comm;
        comm.registListener(LISTEN_KEYS, this);
    }

    /** 完整重置（單元測試/除錯用；正式流程不需要——頁面/iframe 切換即整個 context 消滅） */
    public destroy() {
        if (this.comm) {
            this.comm.unregistListener(LISTEN_KEYS, this);
            this.comm = null;
        }
        this.enabled = true;
        this.cards = [];
        this.events = [];
        this.handlers = {};
        this.pendingUseCardId = '';
        this.stopPolling();
        this.checkSentAt = 0;
        this.knownCardIds = {};
        this.firstCheck = true;
        this.presentation = null;
    }

    // --- 主控制層注入孔 ---

    public setPresentation(p: ISkillCardPresentation | null) {
        this.presentation = p;
    }

    public hasPresentation(): boolean {
        return this.presentation !== null;
    }

    /** 主控制層領取中？（資料橋遮罩與投注 gating 查詢；無效果遊戲恆 false） */
    public isDrawing(): boolean {
        return this.presentation ? this.presentation.isDrawing() : false;
    }

    public getDrawingCardId(): string | null {
        return this.presentation ? this.presentation.getDrawingCardId() : null;
    }

    /** 主控制層（begin/endDraw）通知鎖定依據變化；核心內部也用 */
    public notifyLockChanged() {
        this.emit('lockChanged', {});
    }

    /** 主控制層（draw 錯誤）併入單一 error 通道（0003 資料橋與 Coordinator 都只訂這裡） */
    public raiseError(e: SkillCardError) {
        this.emit('error', e);
    }

    // --- 輪詢 ---

    /** 定時查卡（登入後由 Bootstrap 啟動；冪等）。tick 自檢見 onPollTick。 */
    public startPolling() {
        if (!this.enabled || this.pollTimer) {
            return;
        }
        this.pollTimer = setInterval(() => this.onPollTick(), POLL_INTERVAL_MS);
    }

    public stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /** tick 自檢：未綁 comm / 離線（loginState 非 LOGIN）/ 使用確認中 / 查卡未回 → 該 tick 跳過。
     *  離線不清 timer——重登後自然恢復，無需任何人負責 stop/restart。 */
    private onPollTick() {
        if (!this.comm || this.isUsePending() || this.isCheckPending()) {
            return;
        }
        if (this.comm.loginState !== undefined && !isLogin(this.comm.loginState)) {
            return;
        }
        this.check();
    }

    private isCheckPending(): boolean {
        return this.checkSentAt > 0 && Date.now() - this.checkSentAt < CHECK_PENDING_TIMEOUT_MS;
    }

    // --- 型別化事件 ---

    public on<K extends keyof SkillCardCoreEvents>(event: K, cb: (payload: SkillCardCoreEvents[K]) => void) {
        (this.handlers[event] = this.handlers[event] || []).push(cb);
    }

    public off<K extends keyof SkillCardCoreEvents>(event: K, cb: (payload: SkillCardCoreEvents[K]) => void) {
        const list = this.handlers[event];
        if (!list) {
            return;
        }
        const i = list.indexOf(cb);
        if (i !== -1) {
            list.splice(i, 1);
        }
    }

    private emit<K extends keyof SkillCardCoreEvents>(event: K, payload: SkillCardCoreEvents[K]) {
        const list = this.handlers[event];
        if (!list) {
            return;
        }
        // 複製後迭代，避免 callback 內 on/off 影響本輪
        list.slice().forEach(cb => cb(payload));
    }

    // --- 請求（結果經 onMessage 以事件回報） ---

    /** 查卡：進遊戲、開背包、斷線重連、收到 6/1003 後刷新、定時輪詢 */
    public check() {
        if (!this.enabled) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：已停用（guest），略過查卡');
                }
            }
            return;
        }
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包送出：SkillCardCheckReq 完整內容=', JSON.stringify({}));
            }
        }
        this.checkSentAt = Date.now();
        this.comm?.requestSkillCardCheck();
    }

    /** 使用卡片（GameBag 情境二）：標記啟用，未使用不可領 */
    public use(cardId: string) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包送出：SkillCardUseReq 完整內容=', JSON.stringify({ cardId }));
            }
        }
        if (this.comm?.isRequestPending?.()) {
            // 守門在 pendingUseCardId 之前：先設旗標而請求沒送出，isUsePending() 會永久為 true 鎖住起轉。
            // 必須回報而非靜默 return：0003 收到 source='use' 才會回滾樂觀標記並關掉領取中遮罩，
            // 沒有這個訊號它會一直等一個永遠不會來的 UseRes。code 0 = 未結算可重試。
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：其他請求在途 不送 SkillCardUseReq card=', cardId);
                }
            }
            this.raiseError({ cardId, source: 'use', code: 0, retryable: true });
            return;
        }
        this.pendingUseCardId = cardId;
        this.notifyLockChanged();
        this.comm?.requestSkillCardUse(cardId);
    }

    /** 使用確認中（UseReq 已送、UseRes 未回）：期間鎖起轉，避免搶在啟用前開出正常投注局 */
    public isUsePending(): boolean {
        return this.pendingUseCardId !== '';
    }

    // --- 快取查詢 ---

    /** 玩家可見卡；帶 gameId 時過濾當前遊戲（協定：回全部卡，由前端 filter） */
    public getCards(gameId?: string): SkillCardInfo[] {
        if (!gameId) {
            return this.cards.slice();
        }
        return this.cards.filter(c => c.getGameId() === gameId);
    }

    /** 符合資格的活動（可能尚未發卡） */
    public getEvents(gameId?: string): SkillCardEventInfo[] {
        if (!gameId) {
            return this.events.slice();
        }
        return this.events.filter(e => e.getGameId() === gameId);
    }

    public getCard(cardId: string): SkillCardInfo | null {
        return this.cards.find(c => c.getCardId() === cardId) || null;
    }

    // --- 收包（CommunicationBase listener bus 進入點） ---

    public onMessage(obj: any) {
        if (obj instanceof SkillCardCheckRes) {
            this.onCheckRes(obj);
        } else if (obj instanceof SkillCardUseRes) {
            this.onUseRes(obj);
        }
    }

    private onCheckRes(res: SkillCardCheckRes) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包收包：SkillCardCheckRes 完整內容=', JSON.stringify(res.toObject()));
            }
        }
        this.checkSentAt = 0; // 回包已到（不論成敗），解除輪詢防重入
        const code = res.getResult()?.getCode();
        if (code !== CODE_SUCCESS) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：查卡失敗 code=', code);
                }
            }
            this.emit('error', { code, source: 'check', retryable: false, result: res.getResult(), resp: res });
            return;
        }
        // 查卡回包即權威狀態：清除殘留的使用確認鎖（防 UseRes 因斷線遺失導致永久鎖起轉）
        this.pendingUseCardId = '';
        this.cards = res.getCardsList();
        this.events = res.getEventsList();
        // 獲得 diff：非首次查卡出現的新 cardId 才算「獲得」
        const fresh = this.firstCheck ? [] : this.cards.filter(c => !this.knownCardIds[c.getCardId()]);
        this.cards.forEach((c) => { this.knownCardIds[c.getCardId()] = true; });
        this.firstCheck = false;
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包：查卡成功 卡片=', this.cards.length, '張 活動=', this.events.length, '個 新獲得=', fresh.length, '張');
            }
        }
        this.emit('cardsUpdated', { cards: this.getCards(), events: this.getEvents() });
        this.notifyLockChanged();
        if (fresh.length) {
            this.emit('cardsGained', { cards: fresh });
        }
    }

    private onUseRes(res: SkillCardUseRes) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包收包：SkillCardUseRes 完整內容=', JSON.stringify(res.toObject()));
            }
        }
        const code = res.getResult()?.getCode();
        if (code !== CODE_SUCCESS) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：使用失敗 code=', code, res.getResult()?.getMsg?.());
                }
            }
            // 帶 cardId 讓 0003 回滾樂觀標記的使用中狀態
            this.emit('error', { code, source: 'use', retryable: false, cardId: this.pendingUseCardId || undefined, result: res.getResult(), resp: res });
            this.pendingUseCardId = '';
            this.notifyLockChanged();
            this.check(); // 狀態不明，重查刷新
            return;
        }
        this.pendingUseCardId = '';
        const card = res.getCard();
        if (card) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包：使用成功 card=', card.getCardId(), 'useTime=', card.getUseTime());
                }
            }
            this.replaceCard(card);
            this.emit('useResult', { card });
        }
        this.notifyLockChanged();
    }

    private replaceCard(card: SkillCardInfo) {
        const i = this.cards.findIndex(c => c.getCardId() === card.getCardId());
        if (i === -1) {
            this.cards.push(card);
        } else {
            this.cards[i] = card;
        }
    }
}

let instance: SkillCardManager | null = null;

/** 全域單例（lazy：首呼建立、跨層共用；測試請自行 new SkillCardManager()） */
export function getSkillCardManager(): SkillCardManager {
    if (!instance) {
        instance = new SkillCardManager();
    }
    return instance;
}

// ============ 0003 資料橋：gameIframe（本遊戲）⇄ 系統前端（gc0003）postMessage ============
//
// 只做「背包資料互動」：
//   下行：卡片清單(+caps)/獲得通知/使用成功/錯誤（訂閱上方資料核心事件）
//   上行：0003 查卡要求、背包「使用」（模組頂層 window listener，comm 未備時 no-op）
// 效果側訊息（啟用視窗 ACTIVATE、逐局進度 DRAW_PROGRESS）在 slot-client-lib/skillcard/SkillCardSlot。
// gc0003 為純 UI 展演層，所有技能卡資料一律由本橋供給。

export interface SkillCardEnvelopeMeta {
    m: string;
    s: string;
}

let envelopeMetaProvider: (() => SkillCardEnvelopeMeta) | null = null;

/** 注入信封 m/s 來源（slot＝BonusEventGlobal.getMusicSoundData 的封裝；由主控制層或遊戲端設定）。
 *  未注入時以 {m:'1',s:'1'} 下行——0003 只用 s 同步背包 UI 音效開關；切斷對紅包模組的靜態依賴。 */
export function setSkillCardEnvelopeMeta(provider: (() => SkillCardEnvelopeMeta) | null) {
    envelopeMetaProvider = provider;
}

/** 下行通道（資料橋與主控制層共用）：信封完全比照紅包 bonusEvent */
export function skillCardPost(method: string, data: any = null) {
    if (DEBUG) {
        if (SKILL_CARD_LOG) {
            skillCardLog('背包橋：下行推送給 0003', method);
        }
    }
    if (!hasWindowParent()) {
        return;
    }
    const { m, s } = envelopeMetaProvider ? envelopeMetaProvider() : { m: '1', s: '1' };
    window.parent.postMessage(JSON.stringify({ data: { method, data, m, s }, method: 'skillCardEvent' }), '*');
}

/** 0003 → 遊戲（上行操作）；主控制層另有 skillCardActivateConfirm（EffectBridge 處理） */
export const SKILL_CARD_ENUM = {
    /** 0003 背包開啟，要求刷新查卡 */
    SKILL_CARD_CHECK: 'skillCardCheck',
    /** 0003 背包點「使用」（GameBag） */
    SKILL_CARD_USE: 'skillCardUse',
    /** 0003 啟用視窗玩家點「使用」或 15 秒自動確認（no_bag/vendor；EffectBridge 處理） */
    SKILL_CARD_ACTIVATE_CONFIRM: 'skillCardActivateConfirm',
};

/** 遊戲 → 0003（下行資料）；DRAW_PROGRESS/ACTIVATE 由 EffectBridge 發送 */
export const SKILL_CARD_POST = {
    /** 卡片與活動清單 + 遊戲端能力宣告 caps（每次快取更新） */
    CARDS: 'skillCardCards',
    /** 新獲得卡片（查卡 diff，首次查卡不算獲得） */
    GAIN: 'skillCardGain',
    /** 使用成功 */
    USE_RESULT: 'skillCardUseResult',
    /** 逐局領取進度（EffectBridge） */
    DRAW_PROGRESS: 'skillCardDrawProgress',
    /** 錯誤（source/code/retryable） */
    ERROR: 'skillCardError',
    /** 請 0003 顯示啟用視窗（EffectBridge；no_bag/vendor，時機由 Coordinator 判斷） */
    ACTIVATE: 'skillCardActivate',
};

/**
 * 遊戲端能力宣告（隨 CARDS 下行）：0003 據此決定本遊戲卡是否顯示「使用」鈕、
 * crossPending 落地是否彈啟用窗。未宣告（資料橋預設）＝只做背包資料互動。
 */
export interface SkillCardCapability {
    /** 本遊戲是否實作技能卡效果（逐局領取演出） */
    effect: boolean;
    /** 展演型別（0003 文案/按鈕差異用） */
    kind: 'slot' | 'fish' | 'arcade' | 'none';
    /** 是否支援 0003 啟用視窗（no_bag/vendor 情境） */
    activateWindow: boolean;
}

const DEFAULT_CAPS: SkillCardCapability = { effect: false, kind: 'none', activateWindow: false };

let capability: SkillCardCapability = DEFAULT_CAPS;

/** 主控制層（如 slot 的 attachSlotSkillCard）宣告能力；傳 null 還原預設 */
export function setSkillCardCapability(caps: SkillCardCapability | null) {
    capability = caps || DEFAULT_CAPS;
    lastCardsSnapshot = ''; // 能力變更需重新下行（caps 併入 CARDS payload）
}

let attached = false;
let lastCardsSnapshot = '';

const cardsHandler = (p: SkillCardCardsUpdated) => {
    // 領取演出中（主控制層）：該卡 server 可能已標 FINISHED（最後一局先結算），對 0003 遮罩成 IN_USE，
    // 待演出收尾後下一次查卡下行才帶真實 FINISHED；無效果遊戲 drawingCardId 恆 null＝不遮罩
    const drawingCardId = getSkillCardManager().isDrawing() ? getSkillCardManager().getDrawingCardId() : null;
    const payload = {
        // 已使用未領 → IN_USE 正規化；領取演出中已 FINISHED → IN_USE 遮罩
        cards: maskDrawingCardFinished(normalizeUsedCardState(p.cards.map(c => c.toObject())), drawingCardId),
        events: p.events.map(e => e.toObject()),
        caps: capability,
    };
    const snapshot = JSON.stringify(payload);
    // 定時輪詢高頻觸發：內容未變不下行，避免 0003 背包每 5 秒重繪（捲動位置重置）。
    // 此去重是「下行節流」策略，只能放本橋：主控制層 Coordinator 依賴每一次 cardsUpdated。
    if (snapshot !== lastCardsSnapshot) {
        lastCardsSnapshot = snapshot;
        skillCardPost(SKILL_CARD_POST.CARDS, payload);
    }
};

/** 新獲得卡片（資料核心查卡 diff）→ 逐張下行獲得通知 */
const gainedHandler = (p: { cards: SkillCardInfo[] }) => {
    p.cards.forEach(c => skillCardPost(SKILL_CARD_POST.GAIN, { card: c.toObject() }));
};

const useHandler = (p: SkillCardUseResult) => {
    // 使用成功當下尚未領任一局：state 正規化為 IN_USE 再下行
    skillCardPost(SKILL_CARD_POST.USE_RESULT, { card: normalizeUsedCardState([p.card.toObject()])[0] });
};

const errorHandler = (p: SkillCardError) => {
    skillCardPost(SKILL_CARD_POST.ERROR, { source: p.source, code: p.code, retryable: p.retryable, cardId: p.cardId });
};

/**
 * 掛上資料橋（SkillCardBootstrap 於登入成功時呼叫；冪等）。
 * 訂閱 core 事件——上行 window listener 為模組頂層常駐（見檔尾），不在此控制。
 */
export function attachSkillCardBridge() {
    if (attached) {
        return;
    }
    attached = true;
    getSkillCardManager().on('cardsUpdated', cardsHandler);
    getSkillCardManager().on('cardsGained', gainedHandler);
    getSkillCardManager().on('useResult', useHandler);
    getSkillCardManager().on('error', errorHandler);
}

/** 單元測試用：解除訂閱並清節流快照（正式流程不需要） */
export function detachSkillCardBridge() {
    if (!attached) {
        return;
    }
    attached = false;
    getSkillCardManager().off('cardsUpdated', cardsHandler);
    getSkillCardManager().off('cardsGained', gainedHandler);
    getSkillCardManager().off('useResult', useHandler);
    getSkillCardManager().off('error', errorHandler);
    lastCardsSnapshot = '';
}

// --- 上行（0003 → 遊戲）：模組頂層常駐 listener（比照紅包 BonusEventGlobal 模式） ---
// comm 未 init 時 getSkillCardManager().check()/use() 內部 no-op；非 JSON 或非本協定訊息一律忽略。
function onWindowMessage(e: MessageEvent) {
    let param: any = null;
    try {
        param = JSON.parse(e.data);
    } catch (err) {
        return; // 非 JSON 訊息（其他系統的 message），忽略
    }
    if (!param || !param.method) {
        return;
    }
    switch (param.method) {
    case SKILL_CARD_ENUM.SKILL_CARD_CHECK:
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包橋：收到 0003 查卡要求');
            }
        }
        getSkillCardManager().check();
        break;
    case SKILL_CARD_ENUM.SKILL_CARD_USE:
        if (param.data && param.data.cardId) {
            if (DEBUG) {
                if (SKILL_CARD_LOG) {
                    skillCardLog('背包橋：收到 0003 使用要求 card=', param.data.cardId);
                }
            }
            getSkillCardManager().use(String(param.data.cardId));
        }
        break;
    default:
        break;
    }
}

window.addEventListener('message', onWindowMessage, false);

// --- Bootstrap：登入驅動的統一接線點（三型別遊戲共用，型別 lib 零接線） ---
// 掛載處：CommunicationBase.requestAuth 的 pipe tap（登入成功與 comm 實例同時到手；
// AuthRes 重連會再經過一次，全程冪等）。刻意不用紅包 getCommBase 的 find('Game') 模式——
// 魚機 GameTable 場景沒有 'Game' 節點，且模組級 loaded 旗標在換場景後不重註冊是已知 bug 形。

/**
 * AuthRes 到達：登入成功且非 guest → 掛資料橋 + 綁定 comm（rebind 支援換場景）+ 立即查卡 + 輪詢。
 * 輪詢啟動條件：在 0003 iframe 內（背包要資料）或本遊戲有主控制層（Coordinator 靠輪詢恢復）；
 * 無效果且單獨開的遊戲只查一次，不做無意義的 5 秒輪詢。
 */
export function skillCardOnAuth(comm: ISkillCardComm, res: { getResult(): { getCode(): number } | undefined }) {
    if (res.getResult()?.getCode() !== CODE_SUCCESS) {
        return;
    }
    if (IS_GUEST) {
        if (DEBUG) {
            if (SKILL_CARD_LOG) {
                skillCardLog('背包：guest 試玩，不啟動技能卡資料橋');
            }
        }
        return;
    }
    attachSkillCardBridge();
    getSkillCardManager().init(comm);
    getSkillCardManager().check();
    if (hasWindowParent() || getSkillCardManager().hasPresentation()) {
        getSkillCardManager().startPolling();
    }
}
