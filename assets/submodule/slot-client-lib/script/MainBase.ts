
import { Button, Component, Mask, Node, Widget, _decorator, director, find, game, profiler, sys } from 'cc';
import { DEBUG } from 'cc/env';
import { postBonusEvent } from '../../game-client-lib/BonusEventGlobal';
import { htmlControlShowAlert, htmlControlShowToast } from '../../game-client-lib/HtmlControlGlobal';
import { translate, translateError } from '../../game-client-lib/I18nGlobal';
import { SlotInfoFields, hideBonusEvent, hideDraLoading, hideInfo, loginFinished2, openInfo, openRecord, reload, setIsLoginFromLobby, toggleDOMLandscapeHint } from '../../game-client-lib/IframeGlobal';
import { IMain, addTransparentMask, removeTransparentMask } from '../../game-client-lib/LibGlobal';
import { EXTRA_2, HOST, IS_GUEST, IS_LOBBY, MUSIC, SOUND, TOKEN } from '../../game-client-lib/ParamsGlobal';
import { showAllMode } from '../../game-client-lib/ResizeGlobal';
import { setAudioEnable, setEffectEnable, setMusicEnable, supportLocalStorage } from '../../game-client-lib/StorageGlobal';
import Alert from '../../game-client-lib/component/Alert';
import { audioEnable, audioPlayBGM } from '../../game-client-lib/component/Audio';
import Loading from '../../game-client-lib/component/Loading';
import { Toast } from '../../game-client-lib/component/Toast';
import { LoginState, isBeforeLogin, isKickout, isLogin, isOfflineShowed } from '../../game-client-lib/data/LoginState';
import User from '../../game-client-lib/data/User';
import { MemberServiceBaseKey } from '../../game-client-lib/protobuf/MemberServiceBase';
import { AuthRes, BetBonusRes, CheckBonusRes, MsgCode, PlatformRes, Result, UpdateBalanceRes } from '../../game-client-lib/protobuf/ProtobufWarp';
import { WebViewMessage } from '../../game-client-lib/script/WebViewGlobal';
import CommonUIData from '../../game-client-lib/ui/CommonUIData';
import { balance } from '../../game-client-lib/utils/Balance';
import CommListener from '../../game-client-lib/utils/CommListener';
import { fetchPing, log, nodeProperty, setNodeContentSize, setNodeOpacity } from '../../game-client-lib/utils/Utils';
import { NoSleep } from '../../game-client-lib/utils/nosleep/NoSleep';
import { forceKickGame, getComm } from '../SlotGlobal';
import Analytics, { analyticsAuthEnd, analyticsDisconnect } from './Analytics';
import Communication3XXX from './Communication3XXX';

const { ccclass, property } = _decorator;

const listenTo = [
    MemberServiceBaseKey.AccountUpdateBalanceRes,
];

/**
 * main 基础
 * 1. User 资料
 * 2. 音乐/音效
 */
@ccclass
export default abstract class MainBase extends Component implements IMain, CommListener<UpdateBalanceRes | CheckBonusRes | BetBonusRes | WebViewMessage>{
    public whenOffline: Function = null;

    onMessage(obj: UpdateBalanceRes, opts?: { [s: string]: any; isManualOperation: boolean; }) {

        const result: Result = obj instanceof Result ? obj : obj.getResult && obj.getResult();
        if (result && result.getCode() !== 1) {
            return;
        }
        if (obj instanceof UpdateBalanceRes) {
            this.balance = obj.getBalance();
        }
    }

    private balance: string = '0';
    public ga :Analytics = null;
    public login(commonUIData: CommonUIData) {
        const fail = (code: number) => {
            this.offline(translateError('GAME.sysm_login_nyet', code), code);
        };
        if (this.token && !this.tokenUsed) {
            this.tokenUsed = true;
            if (HOST) {
                this.comm.resetServerHost(HOST);
            }
            try {
                const startTime = Date.now();
                this.comm.setupStream();
                const d = commonUIData;
                const loginReportOpt = {
                    //     音量、音效、環境音 setting_audio (內容 111 000)
                    setting_audio: [
                        d.playSound ? 1 : 0,
                        d.playEffect ? 1 : 0,
                        d.playMusic ? 1 : 0,
                    ].join('/'),
                    //     顯示初始頁、顯示貨幣符號、空白鍵spin setting_option (內容1111,0000)
                    setting_option: [
                        d.displayCurrencySymbol ? 1 : 0,
                        d.startPage ? 1 : 0,
                        d.spaceSpin ? 1 : 0,
                    ].join('/'),
                };
                this.comm.requestAuth(this.getGameId()).subscribe({
                    next: (resp: AuthRes) => {
                        const result: Result = resp.getResult();
                        const code = result.getCode();
                        switch (code) {
                        case MsgCode.SUCCESS:
                            log('登入！', resp.toObject());
                            this.comm.loginState = LoginState.LOGIN;
                            this.closeReq();
                            analyticsAuthEnd({ startTime, endTime:Date.now() });
                            break;
                        case MsgCode.GAME_DISABLE:
                            this.offline(translateError('GAME.server_not_run', code), code);
                            break;
                        case MsgCode.VALIDATION_FAILED:
                            this.offline(translateError('GAME.token_auth_error', code), code);
                            break;
                        case MsgCode.TRANSFER_NOT_FINISH:
                        case MsgCode.TRANSFER_IS_NOT_FINISH:
                            // @ts-ignore
                        case 1001027:
                            const args = `kickCode=${code}`;
                            fetchPing(args);
                            this.offline(translateError('GAME.sysm_transfer_not_finish', code), code, true);
                            break;
                        case MsgCode.WALLET_NOT_FOUND:
                            this.offline(translateError('GAME.sysm_wallet_not_found', code), code);
                            break;
                        default:
                            this.offline(translateError('GAME.login_error', code), code);
                            break;
                        }
                        this.balance = resp.getBalance();
                        if (code === MsgCode.SUCCESS) {
                            this.ga = new Analytics(this.getGameId(), resp.getCurrency());
                            setTimeout(() => {
                                loginFinished2(this.getGameId(), 'success', Date.now(), balance(this.balance), resp.getCurrency(), loginReportOpt);
                            },         2e3);
                        } else {
                            const msg = result.getMsg();
                            loginFinished2(this.getGameId(), `fail/${result.getCode()}/${msg ? msg : 'no-msg'}`, Date.now());
                        }
                    },
                    error: (e1) => {
                        fail(-1);
                        log('ga', this.getGameId(), `fail/-1/${e1}`, Date.now());
                        loginFinished2(this.getGameId(), `fail/-1/${e1}`, Date.now());
                    },
                });
            } catch (e2) {
                fail(-1);
                log('ga', this.getGameId(), `fail/-1/${e2}`, Date.now());
                loginFinished2(this.getGameId(), `fail/-1/${e2}` + e2, Date.now());
            }
        } else {
            fail(-1);
            log('ga', this.getGameId(), `fail/-1/token used`, Date.now());
            loginFinished2(this.getGameId(), `fail/-1/token used`, Date.now());
        }
    }
    private closeReq() {
        window.onbeforeunload = () => {
            if (isLogin(this.comm.loginState)) {
                log('自己关游戏');
                this.comm.requestDisconnect().subscribe(
                    () => {
                    },
                    () => {
                    },
                );
            }
        };
    }

    abstract getGameId(): string;

    /**
     * 開關記錄頁
     * @param able
     */
    protected requestRecord() {
        if (IS_GUEST) {
            htmlControlShowToast(translateError('GAME.sysm_trail_fail', -MsgCode.TOKEN_INVALID));
            return;
        }

        this.comm.requestPlatformAuthInfo().subscribe(
            (resp: PlatformRes) => {
                if (resp.getResult && resp.getResult().getCode() !== MsgCode.SUCCESS) {
                    htmlControlShowToast(translateError('GAME.sysm_verify_fail', -MsgCode.VALIDATION_FAILED));
                    return;
                }
                openRecord(resp.getToken(), this.getGameId());
                log(resp.getToken(), this.getGameId());
            },
            () => {
                htmlControlShowToast(translateError('GAME.sysm_verify_fail', -MsgCode.VALIDATION_FAILED));
            },
        );
    }

    public toggleRecord(able: boolean) {
        if (able) {
            this.requestRecord();
        }
    }

    /**
     * 開關說明頁
     * @param able
     */

    protected requestInfo(fields:SlotInfoFields) {
        openInfo(fields);
    }

    public toggleInfo(able: boolean, fields:SlotInfoFields) {
        if (able) {
            this.requestInfo(fields);
        }
    }

    public setIslobby(able: boolean) {
        setIsLoginFromLobby(able);
    }

    public setMusic(able: boolean) {
        setMusicEnable(able);
        postBonusEvent('musicSound');
    }

    public setSound(able: boolean) {
        setEffectEnable(able);
        postBonusEvent('musicSound');
    }

    public offlineData : {message:string, code: number, refreshAble: boolean} = null;

    public offline(message: string, code: number, refreshAble: boolean = false) {
        if (isOfflineShowed(this.comm.loginState)) {
            return;
        }
        const before = isBeforeLogin(this.comm.loginState);
        const kick = isKickout(this.comm.loginState);
        this.comm.loginState = before ? LoginState.BEFORE_LOGIN_OFFLINE : (kick ? LoginState.KICKOUT : LoginState.OFFLINE);
        this.comm.requestBetOk = false;
        this.offlineData = {
            message,
            code,
            refreshAble,
        };
        if (before || kick) {
            this.offline2();
        }
    }

    public offline2() {
        if (isOfflineShowed(this.comm.loginState)) {
            return;
        }
        const { message, code, refreshAble } = this.offlineData;
        this.comm.loginState = LoginState.OFFLINE_SHOWED;
        this.comm.requestBetOk = false;
        forceKickGame(this.comm, this.user, () => { });
        audioPlayBGM('');
        audioEnable(false);

        const refresh = (supportLocalStorage() && refreshAble);
        if (message) {
            htmlControlShowAlert({
                visible: true,
                keep: true,
                alertMsg: message,
                btn1Text: refresh ? translate('GAME.sysm_refresh') : '',
                btn1Visible: refresh,
                btn1Color: '#6e83c8',
                btn1Click: () => {
                    // gray btn
                    reload();
                },
            });
            this.toggleLoading(false);
        }
        if (refresh) {
            removeTransparentMask(director.getScene());
        } else {
            addTransparentMask(director.getScene());
        }
        hideDraLoading(true);
        hideBonusEvent();
        analyticsDisconnect({ code, disconnectTime:Date.now() });
    }

    /**
     *
     * @param idx 0: addTransparentMask, 1-3: sys_net_retry
     */
    public resume2(idx: number= 0): void {
        addTransparentMask(director.getScene());
        if (idx !== 0) {
            htmlControlShowAlert({
                visible: true,
                alertMsg: translateError({ dataID: 'NETWORK.sys_net_retry%{0}', dataIDArgs: [idx] }, -1),
            });
            this.toggleLoading(false);
        }
        hideDraLoading(false);
        hideBonusEvent();
    }

    public online() {
        this.comm.loginState = LoginState.LOGIN;
        this.comm.requestBetOk = true;
        // if (user) {
        //     // 重设使用者讯息
        //     user.setName('Guest');
        //     user.setBalance(balance(0));
        // }

        // if (updateUserInfo && user) {
        //     updateUserInfo(user);
        // }
        // audioSwitchBGM('');
        htmlControlShowAlert({ visible: false });
        this.toggleLoading(false);
        removeTransparentMask(director.getScene());
        hideDraLoading(false);
        hideInfo();
    }

    private getPing(url) {
        // Default options are marked with *
        return fetch(url, {
            credentials: 'same-origin', // include, same-origin, *omit
            headers: {
                'content-type': 'application/json',
            },
            method: 'GET', // *GET, POST, PUT, DELETE, etc.
            mode: 'no-cors', // no-cors, cors, *same-origin
            redirect: 'follow', // manual, *follow, error
        });
    }

    @property(Node)
    alertNode: Node = null;

    private alert: Alert = null;

    getAlert(): Alert {
        return this.alert;
    }

    getLoading(): Loading {
        return this.loading;
    }

    @property(Node)
    canvasNode: Node = null;

    @property(Node)
    toastNode: Node = null;

    toast: Toast = null;

    @property(Node)
    loadingNode: Node = null;

    loading: Loading = null;

    public user: User = new User();
    public token: string = '';
    public tokenUsed: boolean = false;
    // public host: string = '';
    protected comm: Communication3XXX = null;

    commonUIData: CommonUIData = null;

    public noSleep: NoSleep = null;

    protected loaded = false;

    // private href: {
    //     [s: string]: string[];
    // } = {};

    onLoad() {
        // 開啟 enableRetina 時，在手機上(iphone & oppo) 畫面會模糊
        // 非手機時才開
        if (!sys.isMobile) {
            // view.enableRetina(false);
        }

        // ios ShowAll Mode
        if (showAllMode) {
            const canvasNode = find('Canvas');
            const mask = canvasNode.getComponent(Mask);
            if (!mask) {
                canvasNode.addComponent(Mask);
            }
        }

        this.pre();
    }

    protected pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.loading = this.loadingNode.getComponent(Loading);

        this.toastNode.active = true;
        setNodeOpacity(this.toastNode, 0);
        this.toast = this.toastNode.getComponent(Toast);
        this.toast.canvasWidget.forEach(nodeProperty('target', this.canvasNode));
        this.alert = this.alertNode.getComponent(Alert);
        this.alert.canvasWidget.forEach(nodeProperty('target', this.canvasNode));

        this.setIslobby(IS_LOBBY);
        if (MUSIC) {
            this.setMusic(Boolean(Number(MUSIC)));
        }
        if (SOUND) {
            this.setSound(Boolean(Number(SOUND)));
        }
        this.token = TOKEN;

        if (sys.isMobile) {
            if (!EXTRA_2) {
                const noSleep = new NoSleep();
                this.noSleep = noSleep;
                game.canvas.addEventListener(
                    'touchstart',
                    function enableNoSleep() {
                        game.canvas.removeEventListener('touchstart', enableNoSleep, false);
                        noSleep.enable();
                    },
                    false,
                );
            }
        }
        toggleDOMLandscapeHint(false);
        hideBonusEvent();

        if (DEBUG) {
            setupProfilerToggle();
        }
    }
    start() {
        if (!this.comm) {
            this.comm = getComm();
            this.comm.bindMain(this);
        }
        this.comm.registListener(listenTo, this);
    }
    onDestroy() {
        if (this.comm) {
            this.comm.unregistListener(listenTo, this);
        }
    }

    /**
     * 開關聲音
     * @param able
     */
    public toggleAudio(able: boolean, saveLocalStorage: boolean = false) {
        if (saveLocalStorage) {
            setAudioEnable(able);
        }
        audioEnable(able);

    }

    public setMusicVolume(vol: number) {
        // audioMusicPlayerVolume(vol);
    }

    public setEffectsVolume(vol: number) {
        // audioEffectsPlayerVolume(vol);
    }

    public toggleLoading(able: boolean) {
        this.pre();
        this.loading.toggle(able);
    }

    public getToast(): Toast {
        this.pre();
        return this.toast;
    }
}

/** DEBUG 專用：在現有 Canvas 左下角建立 profiler Stats 開關按鈕 */
export function setupProfilerToggle(): void {
    if (DEBUG) {
        const canvasNode = find('Canvas');
        if (!canvasNode) {
            return;
        }

        const btnNode = new Node('BtnProfiler');
        btnNode.layer = canvasNode.layer;
        canvasNode.addChild(btnNode);

        const widget = btnNode.addComponent(Widget);
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.bottom = 0;
        widget.left = 0;

        btnNode.addComponent(Button);
        btnNode.on(Button.EventType.CLICK, () => {
            if (profiler.isShowingStats()) {
                profiler.hideStats();
            } else {
                profiler.showStats();
            }
        });
        setNodeContentSize(btnNode, 100, 30);
    }
}
