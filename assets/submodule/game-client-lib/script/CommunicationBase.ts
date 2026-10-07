import { Component, _decorator } from 'cc';
import { DEBUG } from 'cc/env';
import { getReferUrl } from '../IframeGlobal';
import { IMain, MAX_LATENCY, globalDebugNNN } from '../LibGlobal';
import { LoginState, isLogin, isOffline } from '../data/LoginState';
import PingData from '../data/PingData';
import { Observable, Observer, create, debounceTime, map, tap } from '../protobuf/GrpcWarp';
import MemberServiceBase, { MemberServiceBaseKey } from '../protobuf/MemberServiceBase';
import { skillCardOnAuth } from '../SkillCardGlobal';
import { AuthReq, AuthRes, BaseReq, BetBonusRes, BonusInfoRes, CheckBonusRes, HeartbeatReq, HeartbeatRes, MsgCode, Result, ResumeReq, ResumeRes, SkillCardCheckRes, SkillCardDrawRes, SkillCardKey, SkillCardUseRes, UserInfoReq, UserInfoRes } from '../protobuf/ProtobufWarp';
import CommListener from '../utils/CommListener';
import { clientTime2ServerTime, clientTimeDifferenceServerTime, log, noop, serverTime2ClientTime, serverTime2ClientTimeDiff, warn } from '../utils/Utils';
const { ccclass } = _decorator;

const listenTo = [
    MemberServiceBaseKey.GameHeartbeatRes,
];

export interface IComm {
    loginState: LoginState;
    serviceOk: boolean;
    resumeTick: number;
    resumeRequesting: boolean;
    requestBetOk: boolean;
    requestResumeReq: Function;
    requestTick: number;
    closeWebsocket: Function;
    streamObserver: Observer<any>;
}

export function mapAny<T>([key, any]: [string, T]): T {
    if (!any) {
        throw new Error('not a good format');
    }
    return any;
}

export function mapAnyWarper<T>(next?: (val: T) => void) {
    if (next) {
        return function (val: [string, T]) {
            return next(mapAny(val));
        };
    }
}

@ccclass
export default abstract class CommunicationBase extends Component implements CommListener<HeartbeatRes>, IComm {

    onMessage(obj: HeartbeatRes, opts?: { [s: string]: any; isManualOperation: boolean; }) {
        if (obj instanceof HeartbeatRes) {
            if (obj.getResult().getCode() !== MsgCode.SUCCESS) {
                return;
            }
            const ping = this.updateTimeDifference(obj.getCTime(), obj.getSTime());
            this.pingValue = ping;
            this.streamHeartbeat();
            // #TODO: 暫解，網路斷線時的提示訊息
            if (ping >= MAX_LATENCY) {
                this.tryResume();
            }
        }
    }

    get serviceOk() {
        return this.getGameService().ok;
    }

    public abstract resetServerHost(host);
    protected abstract getGameServer(): string;
    // 會員服務
    protected memberService: MemberServiceBase;

    getGameService(): MemberServiceBase {
        throw new Error('Method not implemented.');
    }

    // 登入狀態
    public loginState: LoginState = LoginState.BEFORE_LOGIN;

    public resumeRequesting: boolean = false;
    public requestBetOk: boolean = false;

    // 四種請求序列化閘門：spin / skillCardDraw / skillCardUse / betBonus 不可同時在途。
    // gate key 用「對應的回應 key」，四請求對四回應天然一對一，遲到回應的配對檢查因此不需額外識別碼
    private pendingRequestKey: string = '';

    /** 閘門狀態變化（UI 禁用用；單一消費者＝LobbyBase，沿用 repo 的單槽回呼風格） */
    public onRequestPendingChanged: (pending: boolean) => void = null;

    public resumeTick: number = -1;
    public requestTick: number = 0;

    // ping值資料
    private ping: PingData[] = [];

    // 實際時間差
    private timeDifference: number = 0;

    // 最小延遲時間
    private minAvgPing: number = MAX_LATENCY;

    private listenerMap = new Map<string, {
        listener: CommListener<any>,
        priority: number,
    }[]>();

    protected abstract toggleLoading(able: boolean): void;

    protected tapHideLoading: any;

    private latencyTime: number = 0;
    private serverTime: number = 0;

    // private timeDiff: boolean = false;
    protected heartbeatTime: number = Date.now();
    // protected isPingInit: boolean = false;

    // --- 四種請求序列化閘門 ---

    /** 四種核心請求是否有一個在途；UI 入口與呼叫端據此早退 */
    public isRequestPending(): boolean {
        return this.pendingRequestKey !== '';
    }

    /**
     * 佔用閘門。回傳 false 時呼叫端必須直接 return 不送出請求，
     * 且不可在此之前改動自己的狀態，否則狀態會與「請求沒送出」不一致。
     */
    protected beginRequest(resKey: string): boolean {
        // resKey 為空會讓 pendingRequestKey 等同空閒值，鎖形同不存在
        if (!resKey || this.pendingRequestKey) {
            warn('requestGate: 擋下', resKey, '在途=', this.pendingRequestKey);
            return false;
        }
        this.pendingRequestKey = resKey;
        this.onRequestPendingChanged?.(true);
        return true;
    }

    /**
     * 釋放閘門。省略 resKey＝無條件解（stream error / resume 等整條連線都不可信的情境）；
     * 帶入 resKey 時僅相符才解，避免已被 error 解鎖後遲到的回應解掉下一個請求的鎖。
     */
    protected endRequest(resKey?: string) {
        if (!this.pendingRequestKey || (resKey && resKey !== this.pendingRequestKey)) {
            return;
        }
        this.pendingRequestKey = '';
        this.onRequestPendingChanged?.(false);
    }

    public appendBaseReq(req: any) {
        if (req.setBaseReq) {
            const bq = new BaseReq();
            bq.setToken(this.main.token);
            bq.setGid(this.main.getGameId());

            req.setBaseReq(bq);
            return req;

        } else {
            warn('try to append non-baseReq req');
        }
        return req;
    }
    // 登入驗證
    public requestAuth(gid: string): Observable<AuthRes> {

        const req: AuthReq = new AuthReq();
        req.setGid(gid);
        req.setReferUrl(getReferUrl());
        this.appendBaseReq(req);

        this.toggleLoading(true);
        log('requestAuth', gid);
        return this.getGameService().streamAuth(req).pipe(
            tap<[string, AuthRes]>(() => this.toggleLoading(false)),
            tap<[string, AuthRes]>(this.observer),
            // 技能卡 bootstrap：登入成功即接線（三型別統一入口；guest/失敗內部自行略過）
            tap<[string, AuthRes]>(([, res]) => skillCardOnAuth(this, res)),
            map(mapAny),
        );
    }

    // 取玩家資訊
    public requestUserInfo(): Observable<UserInfoRes> {
        const req = new UserInfoReq();
        this.appendBaseReq(req);
        return this.getGameService().streamGetUserInfo(req).pipe(
            tap<[string, UserInfoRes]>(() => this.toggleLoading(false)),
            tap<[string, UserInfoRes]>(this.observer),
            map(mapAny),
        );
    }

    public requestPlatformAuthInfo() {
        return this.getGameService().streamGetPlatformAuthInfo().pipe(map(mapAny));
    }

    public requestDisconnect() {
        return this.getGameService().streamDisconnect().pipe(map(mapAny));
    }

    public requestUpdateBalance() {
        return this.getGameService().streamGetUpdateBalance().subscribe(this.streamObserver);
    }

    public requestCheckBonus() {
        return this.getGameService().streamCheckBonusReq()
            .pipe(
                tap<[string, CheckBonusRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    public requestBonusInfo() {
        this.toggleLoading(true);
        return this.getGameService().streamBonusInfoReq()
            .pipe(
                tap<[string, BonusInfoRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    public requestBetBonus(toggleLoading: boolean) {
        if (!this.beginRequest(MemberServiceBaseKey.BetBonusRes)) {
            return;
        }
        this.toggleLoading(toggleLoading);
        return this.getGameService().streamBetBonusReq()
            .pipe(
                tap<[string, BetBonusRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    /**
     * 技能卡查卡（進遊戲/開背包/重連同步）
     */
    public requestSkillCardCheck() {
        return this.getGameService().streamSkillCardCheckReq()
            .pipe(
                tap<[string, SkillCardCheckRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    /**
     * 技能卡使用（GameBag：標記啟用，未使用不可領）
     */
    public requestSkillCardUse(cardId: string) {
        if (!this.beginRequest(SkillCardKey.SkillCardUseRes)) {
            return;
        }
        return this.getGameService().streamSkillCardUseReq(cardId)
            .pipe(
                tap<[string, SkillCardUseRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    /**
     * 技能卡逐局領取（一次領一局；loading 由演出層自行控制）
     */
    public requestSkillCardDraw(cardId: string) {
        if (!this.beginRequest(SkillCardKey.SkillCardDrawRes)) {
            return;
        }
        return this.getGameService().streamSkillCardDrawReq(cardId)
            .pipe(
                tap<[string, SkillCardDrawRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    public requestResumeReq() {
        const req = new ResumeReq();
        this.appendBaseReq(req);
        return this.getGameService().streamResumeReq(req)
            .pipe(
                tap<[string, ResumeRes]>(this.streamObserver),
                map(mapAny),
            ).subscribe();
    }

    public closeWebsocket() {
        this.getGameService().closeWebSocket();
    }

    private observerNextResultError : ([key, resp]: [string, any]) => void = null;

    private observerNext([key, resp]: [string, any]) {
        // 先解閘門再交給遊戲邏輯：不可改掛 registListener，
        // emitListener 對沒有 listener 的 key 會直接 return，解鎖會因此不執行
        this.endRequest(key);
        this.emitListener(key, resp);
    }

    private observerError(error: string) {
        // spin 訂閱的是 this.observer，其錯誤不進 errorObserver 也不觸發 tryResume；
        // 閘門不設逾時，故這裡是 spin 唯一的解鎖機會
        this.endRequest();
        log('observerError: ', error);
    }

    private streamObserverError(error: string) {
        // 如果是 stream 錯誤會全錯
        this.endRequest();
        this.errorObserver.next(error);
        log('streamObserverError: ', error);
    }

    private observerComplete() {
        // do nothing
    }

    public abstract setupStream(): void;

    private tryResume() {
        // 連線已不可信，在途請求的回應不會再來：先解閘門，避免鎖殘留到重連之後
        this.endRequest();
        if (isOffline(this.loginState, false)) {
            return;
        }
        warn('tryResume');
        this.loginState = LoginState.TRY_RESUME;
        this.requestBetOk = false;
        this.heartbeatTime = Date.now();
        this.ping.length = 0;
    }

    update(dt: number): void {
        if (!isLogin(this.loginState)) {
            return;
        }

        // this.timeDiff = !this.timeDiff;
        // if (!this.timeDiff) {
        //     return;
        // }

        // if (!this.isPingInit) {
        //     this.now = Date.now();
        //     this.isPingInit = true;
        //     this.streamHeartbeat();
        // }

        if ((Date.now() - this.heartbeatTime) >= MAX_LATENCY) {
            // if (this.netQuality) {
            //     this.netQuality.setPing(MAX_LATENCY);
            // }
            if (DEBUG && this.memberService?.rpcLog) {
                log('rpc hb MAX_LATENCY', (Date.now() - this.heartbeatTime));
            }
            this.tryResume();
        }
    }

    public observer: Observer<any> = null;
    public streamObserver: Observer<any> = null;
    public streamErrorObserver: Observer<any> = null;

    /**
     *
     * @param next 做 next 前先 mapAny
     */
    public generateAnyObserver<T>(next?: (value: T) => void, error?: (err: any) => void, complete?: () => void): Observer<[string, T]> {
        // @ts-ignore
        const out: Observer<[string, T]> = {};
        Object.assign(out, this.streamObserver, {
            error,
            complete,
            next: mapAnyWarper<T>(next),
        });
        return out;
    }

    public genObserver<T extends {getResult(): Result}>(next: (error: string, any:T) => void): Observer<any> {
        return {
            next: ([s, x]: [string, T]) => {
                const code = x.getResult().getCode();
                const e = code === MsgCode.SUCCESS ? '' : '' + code;
                next(e, x);
            },
            error: () => next('error', null),
            complete: noop,
        };
    }

    private errorObserver: Observer<string> = null;

    private errorObservable: Observable<string> = null;

    public registListener(keyOrKeys: string | string[], listener: CommListener<any>, priority: number = 1) {
        if (Array.isArray(keyOrKeys)) {
            keyOrKeys.forEach(key => this.registListener(key, listener, priority));
            return;
        } else {
            if (!this.listenerMap.has(keyOrKeys)) {
                this.listenerMap.set(keyOrKeys, []);
            }
            this.listenerMap.get(keyOrKeys).push({
                listener,
                priority,
            });
            this.listenerMap.get(keyOrKeys).sort((a, b) => b.priority - a.priority);
        }
    }

    public unregistListener(keyOrKeys: string | string[], listener: CommListener<any>) {
        if (!this.listenerMap) {
            return;
        }

        if (Array.isArray(keyOrKeys)) {
            keyOrKeys.forEach(key => this.unregistListener(key, listener));
            return;
        } else {
            const ary = this.listenerMap.get(keyOrKeys);
            if (!ary || !ary.length) {
                return;
            }
            const idx = ary.findIndex(a => a.listener === listener);
            if (idx !== -1) {
                this.listenerMap.get(keyOrKeys).splice(idx, 1);
            }
        }
    }

    public emitListener(key: string, resp: any, opts?: { isManualOperation: boolean, [s: string]: any }) {
        if (!this.listenerMap.has(key)) {
            if (key !== 'game.HeartbeatRes') {
                warn('emitListener: 0', key, resp && resp.toObject ? resp.toObject() : resp, opts);
            }
            return;
        }
        // log('emitListener:', key, resp && resp.toObject ? resp.toObject() : resp, opts);
        this.listenerMap.get(key).forEach((listener) => {
            listener.listener.onMessage(resp, opts);
        });
    }

    public clearListener(key?: string) {
        if (key) {
            this.listenerMap.delete(key);
        } else {
            this.listenerMap.clear();
        }
    }

    onLoad() {
        this.pre();
        this.registListener(listenTo, this);
        globalDebugNNN(this, 'comm', false);
    }

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return true;
        }
        this.loaded = true;

        this.errorObservable = create((observer) => {
            this.errorObserver = observer;
        }).pipe(debounceTime(500)).subscribe(this.tryResume.bind(this));

        this.observerNext = this.observerNext.bind(this);
        this.observerNextResultError = ([key, resp]: [string, any]) => {
            const code = resp.getResult().getCode();
            const e = code === MsgCode.SUCCESS ? '' : '' + code;
            if (e) {
                this.observerNext([key, resp]);
            } else {
                // 吞掉
                // do nothing
            }
        };
        this.observerError = this.observerError.bind(this);
        this.streamObserverError = this.streamObserverError.bind(this);
        this.observerComplete = this.observerComplete.bind(this);
        this.observer = {
            next: this.observerNext,
            error: this.observerError,
            complete: this.observerComplete,
        };
        this.streamObserver = {
            next: this.observerNext,
            error: this.streamObserverError,
            complete: this.observerComplete,
        };
        this.streamErrorObserver = {
            next: this.observerNextResultError,
            error: this.streamObserverError,
            complete: this.observerComplete,
        };
        this.tapHideLoading = tap(() => this.toggleLoading(false), () => this.toggleLoading(false));
        return false;
    }

    public streamHeartbeat() {
        const heartbeat = new HeartbeatReq();
        heartbeat.setCTime(clientTime2ServerTime(Date.now()));
        return this.getGameService().streamHeartbeat(heartbeat).subscribe(this.streamObserver);
    }

    // 更新時間差
    public updateTimeDifference(latencyTime: number, serverTime: number): number {
        this.pre();
        this.heartbeatTime = Date.now();
        if (DEBUG && this.memberService?.rpcLog) {
            log('rpc hb update now', this.heartbeatTime);
        }
        this.latencyTime = latencyTime;
        this.serverTime = serverTime;
        const avgPing: number = this.avgPing(serverTime2ClientTime(latencyTime));
        // 取最小延遲時間 來計算時間差
        if (avgPing > 0 && avgPing < this.minAvgPing) {
            this.timeDifference = clientTimeDifferenceServerTime(Date.now(), serverTime);
            if (this.timeDifference > 0) {
                this.timeDifference = this.timeDifference - avgPing;
            } else {
                this.timeDifference = this.timeDifference + avgPing;
            }
            this.minAvgPing = avgPing;
            log('clientTime: %d serverTime: %d timeDifference: %d avgPing: %d', Date.now(), serverTime, this.timeDifference, avgPing);
        }
        return avgPing;
    }

    /**
     * 平均ping值
     * 五秒內所有封包的ping值平均
     * */
    private avgPing(latencyTime: number) {

        // const currentTime = Date.now();

        // console.log('latencyTime:', latencyTime);

        let ping: PingData;

        if (this.ping.length >= 5) {
            ping = this.ping.shift();
            ping.latencyTime = latencyTime;
        } else {
            ping = new PingData(latencyTime);
        }
        this.ping.push(ping);

        let avgTime: number = 0;
        let count: number = 0;
        this.ping.forEach((t) => {
            avgTime += t.latencyTime;
            count += 1;
        });
        if (count === 0) {
            return MAX_LATENCY + 1;
        }
        avgTime = avgTime / count;

        // if (this.netQuality) {
        //     this.netQuality.setPing(avgTime);
        // }
        return avgTime;
    }

    public fixTimeDifference(serverTime: number) {
        return serverTime2ClientTimeDiff(serverTime, this.timeDifference);
    }

    protected main: IMain;
    public bindMain(main: IMain) {
        this.main = main;
    }

    private pingValue: number = 0;
    public getPingVaule(): number {
        return this.pingValue;
    }
}
