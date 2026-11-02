import { Node, Sprite, SpriteFrame, Tween, UIOpacity, _decorator, sp, tween } from 'cc';
import { DEBUG } from 'cc/env';
import { translate } from '../submodule/game-client-lib/I18nGlobal';
import { audioPlay, audioPlayBGM, audioPreload } from '../submodule/game-client-lib/component/Audio';
import { getDebugParams } from '../submodule/game-client-lib/ParamsGlobal';
import { schedulePromise, spSkeletonSetAnimation, timeoutResolvef } from '../submodule/game-client-lib/script/PromiseManager';
import { PromiseManager2Array } from '../submodule/game-client-lib/script/PromiseManager2';
import { getBigWinLevel } from '../submodule/game-client-lib/ui/BigWinBase';
import { balance, safeDiv } from '../submodule/game-client-lib/utils/Balance';
import { flattenDeep, log, onlyUnique, setNodeOpacity, warn } from '../submodule/game-client-lib/utils/Utils';
import { getComm, getMain } from '../submodule/slot-client-lib/SlotGlobal';
import CommonUIData from '../submodule/game-client-lib/ui/CommonUIData';
import ColButtonSpin from '../submodule/game-client-lib/ui/ColButtonSpin';
import { LineInfo, MachineInfo, RoundInfo, SpinData, SpinResult, SpinType, Symbol, SymbolType, WinType } from '../submodule/slot-client-lib/protobuf/ProtobufWarp';
import { PuzzleData } from '../submodule/slot-client-lib/puzzle2/PuzzleData';
import { getDebugConditionArray } from './DebugConditionArray';
import { DO_SPIN_STAT, DO_STOP_STAT, DebugCondition, bwDebugCondition, fgDebugCondition, fgFgDebugCondition, genLines, genStrips, hasWinLine, megaWinDebugCondition, ngBwDebugCondition } from '../submodule/slot-client-lib/script/LobbyBase';
import { SLOT_SPIN_MODE, isFG, isWD, symbolReducerCreator } from '../submodule/slot-client-lib/slot/SlotBase';
import { SLOT_SYMBOL_STATUS } from '../submodule/slot-client-lib/slot/SlotData';
import SlotLobbyBase, { getFreeLine } from '../submodule/slot-client-lib/slot/SlotLobbyBase';
import { SlotPayLineOdds } from '../submodule/slot-client-lib/slot/SlotPayLine';
import { ColLabel } from '../submodule/game-client-lib/data/ColLabel';
import { SlotReelSymbol, extractSymbolType } from '../submodule/slot-client-lib/slot/SlotReel';
import { SlotResultLineData } from '../submodule/slot-client-lib/slot/SlotResultBase';
import SymbolBase from '../submodule/slot-client-lib/slot/SymbolBase';
import Foreground from './Foreground';
import { COLOR_GRAY, COLOR_WHITE, FG_COUNT, QUICK_SPINE_LEVEL_3 as QUICK_SPINE_LEVEL_3_MI2, REEL_LIMIT, SLOT_SYMBOL_MAP, SLOT_SYMBOL_STATUS_3098, SLOT_SYMBOL_STATUS_FG_NORMAL_2, betBase, bindSyncSCSkeleton, btnColor, getSkeletonDataName, getSymbolLang, getSymbolSkin, getSyncSCSkeletonTrackTime, iconColor, lines, setLines, symbolAnimName, txtColor, warnUnregisteredSymbols } from './GameGlobal';
import MessageMarquee, { MessageWinPrefixType } from './MessageMarquee';
import { MultiRing } from './MultiRing';
import Puzzle from './Puzzle';
import PuzzleReel from './PuzzleReel';
import PuzzleResult from './PuzzleResult';
import Slot from './Slot';
import SlotResult from './SlotResult';
import { SlotSymbol } from './SlotSymbol';
import { VERSION } from './Version';
import UIData from './data/UIData';
import PuzzleSymbol from './PuzzleSymbol';
const { ccclass, property } = _decorator;

export function symbolToString(s: Symbol): string {
    const type = s.getSymbolType();
    return (type === SymbolType.SC) ? `${type}_${s.getLevel()}` : `${type}`;
}

export function symbolReducer4(arr: SlotReelSymbol[][], a: Symbol): string[][] {
    const x = a.getX();
    const y = a.getY();
    if (!arr[x]) {
        arr[x] = [];
    }
    arr[x * 8 + y + 4] = [symbolToString(a)];
    return arr;
}

export function symbolReducer3(arr: SlotReelSymbol[][], a: Symbol): string[][] {
    const x = a.getX();
    const y = a.getY();
    if (!arr[x]) {
        arr[x] = [];
    }
    arr[x * 8 + y] = [symbolToString(a)];
    return arr;
}

export function symbolReducer(accu: SlotReelSymbol[][], a: Symbol): SlotReelSymbol[][] {
    const x = a.getX();
    const y = a.getY();
    if (!accu[x]) {
        accu[x] = [];
    }
    accu[x][y] = symbolToString(a);
    return accu;
}

function getList(ri: RoundInfo): Symbol[] {
    if (ri.getNextList().length) {
        return ri.getNextList();
    }
    return ri.getSymbolsList();
}

function getBonusLine(lines: LineInfo[]): SlotResultLineData {
    const ss: string[][] = [];

    lines.filter(l => l.getType() === WinType.WIN_BONUS).forEach((l) => {
        const s = l.getSymbolsList()[0];
        const x = s.getX();
        const y = s.getY();
        let ys = ss[x];
        if (!ys) {
            ys = [];
        }
        const type = s.getSymbolType();
        ys[y] = type === SymbolType.SC ? `${type}_r${l.getWin()}` : `${type}`;
        ss[x] = ys;
    });

    return new SlotResultLineData(
        '',
        [],
        ss,
    );
}

/** 折疊後的賠率項：count 留數字給框架排序用，畫面上實際顯示的是 countLabel／winsLabel 的文字 */
interface CollapsedOdds extends SlotPayLineOdds {
    countLabel: string;
    winsLabel?: string;
}

/**
 * 賠付相同、連線數又連續的項目，合併成一列區間（例如 18~25 顆賠一樣 → 顯示「18-25」）。
 * count 保持數字讓排序正常；區間文字放 countLabel，等列表畫完由 fitPayLineLayout 蓋上去
 */
function collapseOddsRanges(odds: SlotPayLineOdds[]): CollapsedOdds[] {
    odds.sort((a, b) => a.count - b.count);
    const groups: { min: number, max: number, base: SlotPayLineOdds }[] = [];
    odds.forEach((o) => {
        const g = groups[groups.length - 1];
        if (g && g.base.odds === o.odds && o.count === g.max + 1) {
            g.max = o.count; // 連續且同賠 → 併入現有區間
        } else {
            groups.push({ min: o.count, max: o.count, base: o });
        }
    });
    return groups.map(g => ({
        betBase: g.base.betBase,
        odds: g.base.odds,
        wins: g.base.wins,
        count: g.max,
        countLabel: g.min === g.max ? `${g.max}` : `${g.min}-${g.max}`,
    }));
}

/**
 * 賠付列表太長時做摘要（照企劃稿）：超過 5 組就只留
 * 「最高一組、一列 ⋮、最低三組」共 5 列，中間全部用 ⋮ 帶過
 */
function abbreviateOdds(collapsed: CollapsedOdds[]): CollapsedOdds[] {
    if (collapsed.length <= 5) {
        return collapsed;
    }
    const asc = collapsed.sort((a, b) => a.count - b.count);
    const top = asc[asc.length - 1];
    const ellipsis: CollapsedOdds = {
        betBase: top.betBase,
        odds: 0,
        count: top.count - 0.5, // 讓這列 ⋮ 排序時剛好落在最高那組後面
        wins: '',
        countLabel: '⋮',
        winsLabel: '⋮',
    };
    return [top, ellipsis, asc[2], asc[1], asc[0]];
}

export type Type = 'ng' | 'fg' | 'bg';

// maxwin debug 條件：故意寫在專案自己的 Lobby.ts，不放進 submodule。
// 之前放在 submodule 裡（maxWinFgDebugCondition/maxWinNgDebugCondition）曾經因為 submodule commit 沒推上遠端，
// 導致 Drone 編譯時抓不到那個 commit 而失敗，後來被移除。
const maxwinNgDebugCondition: DebugCondition = { key: 'maxwin_ng', msg: 'NG MaxWin', test: (key, ng) => ng ? ng.getIsMaxWin() : false };
const maxwinFgDebugCondition: DebugCondition = { key: 'maxwin_fg', msg: 'FG MaxWin', test: (key, ng, xgs) => xgs.slice(1).some(ri => ri.getIsMaxWin()) };

// debug=keep_slot：轉停後不切換到 Puzzle 靜態盤面，讓 Slot 轉輪一直顯示，方便比對每軸多一顆後的位置
const keepSlotVisibleDebug = DEBUG && !!getDebugParams('keep_slot');

@ccclass
export default class Lobby extends SlotLobbyBase {

    getDebugConditions(): DebugCondition[] {
        if (DEBUG) {
            const isBg = (type: SpinType) => (type === SpinType.BONUSGAME || type === SpinType.BONUSGAME_2 || type === SpinType.FEATUREBUY_BONUSGAME || type === SpinType.FEATUREBUY_BONUSGAME_2);
            const isFg = (type: SpinType) => (type === SpinType.FREEGAME || type === SpinType.FEATUREBUY_FREEGAME);
            return [
                fgDebugCondition,
                bwDebugCondition,
                ngBwDebugCondition,
                fgFgDebugCondition,
                megaWinDebugCondition,
                maxwinNgDebugCondition,
                maxwinFgDebugCondition,
                ...getDebugConditionArray(),
            ];
        }
    }

    getBetBase(): number {
        return betBase;
    }

    @property({
        type: Slot,
        override: true,
    })
    slot: Slot = null;

    @property({
        type: SlotResult,
        override: true,
    })
    slotResult: SlotResult = null;

    @property(Puzzle)
    puzzle: Puzzle = null;

    @property({
        type: Foreground,
        override: true,
    })
    foreground: Foreground = null;

    @property(PuzzleResult)
    puzzleResult: PuzzleResult = null;

    @property({
        type: MessageMarquee,
        override: true,
    })
    messageMarquee: MessageMarquee = null;

    @property(MultiRing)
    multiRing: MultiRing = null;

    // @property(Bullet)
    // bullet:Bullet = null;

    public puzzleMI: boolean = false;

    @property(sp.Skeleton)
    scTrackSkeleton: sp.Skeleton = null;

    doOnLoad(): void {
        audioPreload('S309801_spin_button');
        audioPreload('S309802_button');
        audioPreload('S309803_paytable');
        audioPreload('S309831_reel_spin');
        audioPreload('S309833_reel_stop');
        audioPreload('S309834_fg_spin');
        audioPreload('S309830_multiplier_add');
        audioPreload('S309835_multiple_x2');
        audioPreload('S309836_multiple_x3');
        audioPreload('S309837_multiple_x4');
        audioPreload('S309838_multiple_x5');
        audioPreload('S309839_multiple_x6');
        audioPreload('S309840_multiple_x01');
        audioPreload('S309841_multiple_x02');
        audioPreload('S309842_multiple_x03');
        audioPreload('S309843_multiple_x04');
        audioPreload('S309844_multiple_x05');
        audioPreload('S309845_multiple_x06');
        audioPreload('S309846_multiple_x07');
        audioPreload('S309847_fg_appear_2');
        audioPreload('S309816_wild_appear');
        audioPreload('S309817_fg_announce_enter');
        audioPreload('S309819_fg_announce');
        audioPreload('S309832_fg_win');
        audioPreload('S309823_expect_reel');
        audioPreload('S309824_expect_heartbeat');
        audioPreload('S309825_lightning_enable');
        audioPreload('S309826_award_BIG');
        audioPreload('S309827_award_SUPER');
        audioPreload('S309828_award_EPIC');
        audioPreload('S309829_award_MEGA');
        audioPreload('S309830_award_score');

        audioPreload('M309801_ng_bgm');
        audioPreload('M309802_fg_bgm');
        audioPreload('M309806_background');

        this.comm = getComm();
        this.main = getMain();

        this.commonUIData = this.ui.commonUIManager.data;

        const uiData = new UIData();
        this.ui.reset(uiData, true);
        this.uiData = uiData;

        this.updateVersionVersionRound(VERSION);

        this.switchBackground(false);
        this.puzzle.puzzleReels.forEach(r => (r as PuzzleReel).lobby = this);

        bindSyncSCSkeleton(this.scTrackSkeleton);
    }

    doMachineInfo(mi: MachineInfo): void {
        const commonUI = this.ui.commonUIManager.commonUI;
        commonUI.iconColor = iconColor;
        commonUI.txtColor = txtColor;
        commonUI.btnColor = btnColor;

        setLines(genLines(mi));

        const genStrip = genStrips(mi);

        this.slot.revReducer = symbolReducerCreator(this.slot.reels.map(r => r.length), symbolToString);

        this.slot.initStrip(flattenDeep([
            genStrip(SLOT_SPIN_MODE.NORMAL, SpinType.NORMALGAME),
            genStrip(SLOT_SPIN_MODE.FREE, SpinType.FREEGAME),
        ]));
        this.slot.messageMarquee = this.messageMarquee;
        this.messageMarquee.playMarquee();

        this.puzzle.lobby = this;
        this.puzzleResult.lobby = this;

        this.updateInNormalGame();

        this.wrapPayLineOddsOnce();
        this.slotPayLine.typeToNodeTplIdx = (type) => {
            if (isFG(type)) {
                return 0;
            } else if (isWD(type)) {
                return 1;
            }
            return -1;
        };
        this.slotPayLine.xyShow = (x: number, y: number) => {
            // y=1 為每軸最頂部可見圖標，是裝飾預覽列，不開放點擊賠付表
            if (y === 1) {
                return false;
            }
            return true;
        };
        this.slotPayLine.showFinish = (slotBase: SymbolBase, type: string, x: number, y: number) => {
            if (isFG(slotBase.symbol)) {
                const slotSymbol = slotBase as SlotSymbol;
                slotSymbol.change(SymbolType.FG + '', SLOT_SYMBOL_STATUS_FG_NORMAL_2);
            }

            this.payLineShownSymbol = type;
            this.fitPayLineLayout(type);
            audioPlay('S309803_paytable', { throttle: 10 }); // 點擊滾輪區賠付視窗音效
        };
        this.slotPayLine.revetFinish = (slotBase: SymbolBase, type: string, x: number, y: number) => {
            this.payLineShownSymbol = '';
            if (isFG(slotBase.symbol)) {
                const slotSymbol = slotBase as SlotSymbol;
                slotSymbol.change(SymbolType.FG + '', SLOT_SYMBOL_STATUS.NORMAL);
            }
        };

        setNodeOpacity(this.slot.node, 255);
        setNodeOpacity(this.puzzle.node, 255);
        this.slot.setCacheSymbol([
            ['' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.SF, ''],
            ['' + SymbolType.S1, '' + SymbolType.SE, '' + SymbolType.SB, '' + SymbolType.FG, '' + SymbolType.WD, '' + SymbolType.S4, '' + SymbolType.S1],
            ['' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S2, '' + SymbolType.WD, '' + SymbolType.SA, '' + SymbolType.SD, '' + SymbolType.S3, '' + SymbolType.S1],
            ['' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.SE, '' + SymbolType.SB, '' + SymbolType.FG, '' + SymbolType.WD, '' + SymbolType.S4, '' + SymbolType.S1],
            ['' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.SF, '' + SymbolType.S1],
            ['' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.S1, '' + SymbolType.SF, ''],
        ]);
        this.attachSlotToPuzzle();
        this.switchDisplayToPuzzle();

        this.uiBetable(false);
    }

    /** 賠付彈窗目前顯示哪個圖標（換押注額時要拿它重蓋一次區間文字） */
    private payLineShownSymbol: string = '';

    /** 賠付表的加工是否已經裝過（只能裝一次） */
    private payLineHooksInstalled: boolean = false;

    /**
     * 幫賠付表資料加工：相同賠付折疊成區間 → 太長就做摘要，
     * 另外註冊「換押注額後把區間文字補蓋回去」。
     * 只能裝一次：斷線重連會再走到這裡，裝兩次資料會被加工兩次、畫面就亂掉
     */
    private wrapPayLineOddsOnce() {
        if (this.payLineHooksInstalled) {
            return;
        }
        this.payLineHooksInstalled = true;

        const func = this.slotPayLine.typeToOdds;
        this.slotPayLine.typeToOdds = (type: string) => {
            return abbreviateOdds(collapseOddsRanges(func(type)));
        };

        // 換押注額時框架會重畫列表、區間文字會被打回純數字，這裡在它之後再蓋回去一次
        this.slotPayLine.data.registerCallback('rawTotalBet', () => {
            if (this.payLineShownSymbol) {
                this.fitPayLineLayout(this.payLineShownSymbol);
            }
        });
    }

    /**
     * 賠付列表畫完後的收尾：
     * 1. 把連線數那欄換成區間文字（框架只認數字，文字要事後蓋上去）
     * 2. 列數太多時整個列表等比縮小，塞進面板高度內
     */
    private fitPayLineLayout(type: string) {
        const pln = this.slotPayLine.payLineNode;
        const ln = pln.layoutNode;
        if (!ln.parent) { // FG/WD 的彈窗是另一套模板，沒有這個列表，不用處理
            return;
        }

        // 彈窗會依點擊位置開在圖標左邊或右邊，列表加寬後會偏一側，依開的方向微調位置
        ln.setPosition(ln.parent === pln.rightNode ? -18 : 5, 0);

        const odds = this.slotPayLine.typeToOdds(type) as CollapsedOdds[];
        odds.sort((a, b) => b.count - a.count); // 照框架一樣的順序排，畫面每一列才對得上資料
        ln.children.forEach((row, i) => {
            const o = odds[i];
            if (!o) {
                return;
            }
            const cols = row.getComponentsInChildren(ColLabel);
            const countCol = cols.find(c => c.colKey === 'count') || cols[0];
            const winsCol = cols.find(c => c.colKey === 'wins') || cols[1];
            if (o.countLabel) {
                countCol?.reset(o.countLabel);
            }
            if (o.winsLabel) { // 省略列的金額欄也要蓋成 :，不蓋的話框架會填回金額
                winsCol?.reset(o.winsLabel);
            }
            // 省略列的 : 縮小一點比較好看；只縮兩欄不縮整列（縮整列會跑位跟其他列對不齊）。
            // 列節點會被重複利用，所以非省略列要記得設回 1
            const symbolScale = o.winsLabel ? 0.75 : 1;
            countCol?.node.setScale(symbolScale, symbolScale, 1);
            winsCol?.node.setScale(symbolScale, symbolScale, 1);
        });

        const rows = ln.children.length;
        const rowH = 30;
        const spacing = 8;
        const maxH = 160; // 面板高 183 扣上下邊距
        const total = rows * rowH + Math.max(0, rows - 1) * spacing;
        const s = Math.min(1, maxH / total); // 目前摘要後列數少、不會真的縮小，這行是保險
        ln.setScale(s, s, 1);
    }

    doSpin(stat: DO_SPIN_STAT): Promise<any> {
        if (stat === DO_SPIN_STAT.FAIL) {
            this.updateRound('');
        } else if (stat === DO_SPIN_STAT.OK) {
            this.updateRound('' + this.spinResult.getRoundId());
            this.updateMessage(translate('LOBBY.message.good_luck'));
        } else if (stat === DO_SPIN_STAT.BUTTON_AUDIO) {
            audioPlay('S309801_spin_button');
            audioPlay('S309831_reel_spin', { loop: true });
        } else if (stat === DO_SPIN_STAT.REQUEST) {
            this.multiRing.reset(false, this.commonUIData.quickspin > 0); // 閃電模式跳過逐格退回，一次滑到底
            setNodeOpacity(this.slot.node, 255);
            setNodeOpacity(this.puzzle.node, 0);
            this.messageMarquee.playMarquee();
            // this.scheduleOnce(() => {
            //     this.messageMarquee.playMarquee(); // TODO: 確定是它造成卡頓
            // });
        }
        return null;
    }

    doStop(stat: DO_STOP_STAT): void {
    }

    private isStartClick: boolean = false;
    private hasPlayedInitialShine: boolean = false; // 追蹤是否已播放過初始光效
    async doStartClick() {
        if (this.isStartClick) {
            return;
        }

        this.isStartClick = true;

        this.uiBetable(true);
        audioPlayBGM('M309801_ng_bgm');
        audioPlay('M309806_background', { loop: true }); // 環境音墊底，NG/FG 換 BGM 不中斷
    }

    doQuickspinClick(prev: number, value: number): void {
        audioPlay('S309825_lightning_enable'); // 閃電按鈕啟用音效
    }

    public doNextRound(ri: RoundInfo, index: number): void {
        this.multiRing.showLevel(ri.getLevel()); // 每一局（含沒中獎的）都拿後端給的倍數更新倍率盤

        const pri = this.roundInfos[index - 1];
        const spinType = ri.getSpinType();
        if (index === 0) {
            this.doRound(ri, index);
        } else if (spinType === SpinType.NORMALGAME || spinType === SpinType.NORMALGAME_2) {
            this.doRound(ri, index, true);
        } else if (spinType === SpinType.FREEGAME || spinType === SpinType.FREEGAME_2) {
            const prevCurrentRound = pri.getCurrentRound();
            const currentRound = ri.getCurrentRound();
            if (prevCurrentRound !== currentRound) {
                this.doFreeRound(ri, pri, index);
            } else {
                this.doFreeRound(ri, pri, index, true);
            }
        }
    }

    private isFreeRound: boolean = false;

    /** maxwin：後端標記該輪撞到封頂贏分時，強制本局收尾、直接結算 */
    private shouldForceFinalRound(ri: RoundInfo): boolean {
        return ri ? ri.getIsMaxWin() : false;
    }

    /**
     * maxwin 撞頂時強制停止 auto spin：後端撞頂那一局已經結束，不會再有下一輪資料
     * 沒有這個判斷，isAutoNextRound() 只看 auto 次數還沒轉完就會繼續送 spin，導致卡死等不到後端回應
     */
    reachStopAutoCondition(data: CommonUIData, spinData: SpinData, spinResult: SpinResult, balance: string): boolean {
        return spinResult.getRoundInfosList().some(ri => ri.getIsMaxWin());
    }
    private preRoundInfoSinkFGCount: number = 0;

    private spinButtonCol: ColButtonSpin = null;
    private getSpinButtonCol(): ColButtonSpin {
        if (!this.spinButtonCol) {
            const node = this.ui.commonUIManager.commonUI.getNodesByColKey('spinState')[0];
            this.spinButtonCol = node?.getComponent(ColButtonSpin);
        }
        return this.spinButtonCol;
    }

    private spinButtonOrigReset: (value: string) => void = null;

    /**
     * 中獎演出期間讓 spin 按鈕的箭頭靜止、不顯示 hover 光暈，元件本身保持開著、監聽器不斷線，
     * 所以滑鼠 hover 狀態全程正確追蹤，演出結束當下就能立刻反映滑鼠真正所在位置，不用等滑鼠再動一下
     */
    private setSpinStill(still: boolean) {
        const col = this.getSpinButtonCol();
        if (!col) {
            return;
        }
        if (still) {
            if (!this.spinButtonOrigReset) {
                this.spinButtonOrigReset = col.reset.bind(col);
                col.reset = (value: string) => {
                    this.spinButtonOrigReset(value);
                    // arrowRot 為 true 代表真正的狀態是 SPIN（會轉/會有 hover 光暈）；AUTO 狀態本來就沒有這個問題，不用蓋掉
                    if ((col as any).arrowRot) {
                        (col as any).arrowRot = false;
                        if (col.skeleton.animation !== 'ani_spin_stay') {
                            spSkeletonSetAnimation(col.skeleton, 'ani_spin_stay', true);
                        }
                    }
                };
            }
            if (col.prev) {
                col.reset(col.prev);
            }
        } else if (this.spinButtonOrigReset) {
            col.reset = this.spinButtonOrigReset;
            this.spinButtonOrigReset = null;
            if (col.prev) {
                col.reset(col.prev);
            }
        }
    }

    public doRound(ri: RoundInfo, roundIndex: number, sink: boolean = false) {
        warnUnregisteredSymbols(ri);
        this.reset();
        const totalBet = this.spinData.getTotalbet();
        const totalWin = ri.getTotalwin();

        const hasWL = hasWinLine(ri.getLinesList());
        const hasWins = totalWin > 0;
        const arr: PromiseManager2Array = [];
        const custom = '';

        const ngTotalWin = this.sumTotalWins(0, roundIndex + 1);
        const bigWin = getBigWinLevel(totalBet, ngTotalWin);

        const forceFinalRound = this.shouldForceFinalRound(ri);
        const hasNext = this.hasNextRound() && !forceFinalRound;
        const hasFG = getFGSymbol(ri) && !forceFinalRound; // 撞頂就不播 FG 宣告，直接結算（後端撞頂後不會再送 FG 輪）

        if (bigWin) {
            audioPreload('M309803_award_bgm_enter');
            audioPreload('M309804_award_bgm_loop');
            audioPreload('M309805_award_bgm_end');
        }

        arr.push(
            (resolve) => {
                this.uiBetable(false);
                resolve();
            });

        if (!sink) {
            arr.push(
                (resolve) => { // 更新余额，减掉下注
                    this.preRoundInfoSinkFGCount = 0;
                    setNodeOpacity(this.puzzle.node, 0);
                    setNodeOpacity(this.slot.node, 255);

                    this.updateWins(0);
                    resolve(1);
                },
                (resolve) => { // 转
                    const results = ri.getSymbolsList().reduce(this.slot.reverseReducer, []);
                    const reels = lines[1].map((v, index) => {
                        return {
                            result: results[index],
                            last: '',
                        };
                    });

                    this.updateSkip(true); // 给停
                    this.slot.spin2({
                        reels,
                        mode: SLOT_SPIN_MODE.NORMAL,
                        feature: false,
                        delta: 0,
                        squeezeDur: 1,
                        quick: this.commonUIData.quickspin,
                    }).then(async () => {
                        // this.updateSpinStop(false, false);
                        this.attachSlotToPuzzle(true);
                        this.switchDisplayToPuzzle();
                        resolve(1);
                    });
                },
            );
        } else {
            arr.push(
                async (resolve) => { // 落下新圖標
                    this.puzzleResult.clearAll();
                    // this.updateSpinStop(true, true); // 不给停
                    const results: string[][] = ri.getSymbolsList().reduce(symbolReducer, []);
                    this.puzzle.setResult(new PuzzleData(results));
                    const puzzleMI = this.preRoundInfoSinkFGCount >= (FG_COUNT - 1); // 二次咪牌
                    const quickspin = puzzleMI ? QUICK_SPINE_LEVEL_3_MI2 : this.commonUIData.quickspin;
                    this.puzzleMI = puzzleMI;
                    if (puzzleMI) {
                        this.playBackgroundShineMI2(true);
                        this.playReelBGDark(true);
                        this.messageMarquee.playMessageHeart(true);
                        this.messageMarquee.playMIMessage(0); // 再來一個SC
                        this.puzzle.playDarkenFadeOtherWithoutFG(true);
                        this.puzzle.playFGSymbolJumpThree();
                        await schedulePromise(1);
                    }
                    await this.puzzle.sinkDrop(quickspin);

                    this.puzzleMI = false;
                    this.messageMarquee.playMessageHeart(false);
                    resolve(1);
                },
            );
        }

        if (hasWL) {
            audioPreload('S309804_win_frame');
            audioPreload('S309807_symbol_win');
            audioPreload('S309808_symbol_dropping');
            audioPreload('S309810_marquee_score');
            audioPreload('S309811_marquee_score_end');
            audioPreload('S309812_marquee_win_settlement');

            arr.push((resolve) => {
                this.switchDisplayToPuzzle();
                resolve(1);
            });
            arr.push(async (resolve) => {
                this.setSpinStill(true);
                // 二次咪牌門檻計數：y=0 是每軸最上面新增的裝飾預覽列，內容尚未真正落定，不算數
                const preRoundFGList = ri.getSymbolsList().filter(s => isFG(s.getSymbolType() + '') && s.getY() !== 0);
                this.preRoundInfoSinkFGCount = preRoundFGList.length;

                const level = ri.getLevel();
                const hasTimes = level > 1;
                const win = hasTimes ? safeDiv(totalWin, level) : totalWin; // 純數字顯示未乘倍率的連線贏分，贏得才是乘完倍率的總分

                const linesSymbols = this.fixUniquePosLinesSymbols(ri);

                const sumCurrentRoundWins = this.sumCurrentRoundWins(ri, roundIndex);

                let marquee: Promise<unknown>;
                if (hasTimes) { // x2 起：先顯示單純數字，倍數飛落碰到跑馬燈才翻成「贏得」＋強調字
                    this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_NONE, win, totalBet, sumCurrentRoundWins);
                    // 0.63s 起飛＋0.25s 飛行 → 0.88s 撞跑馬燈，對齊圖標爆開音效的瞬間
                    marquee = schedulePromise(0.63).then(() => this.multiRing.playBounceToMarquee()).then(() => {
                        this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_WIN, totalWin, totalBet, sumCurrentRoundWins, sink);
                    });
                } else { // x1：直接「贏得」＋強調字，不飛落
                    this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_WIN, totalWin, totalBet, sumCurrentRoundWins);
                    marquee = Promise.resolve();
                }
                this.multiRing.playEliminationLight(); // 左右屋簷金光，跟圖標消除瞬間同步
                const ps = this.puzzleResult.explode(linesSymbols, this.commonUIData.quickspin, ri.getIsMaxWin());
                await Promise.all([ps, marquee]).then(resolve);
            });

            arr.push((resolve) => {
                this.updateWinsRawBalance(balance(this.sumTotalWins(0, roundIndex + 1)));
                resolve();
            });
        } else if (!(bigWin && !hasNext)) { // 這輪沒中獎：跑馬燈切回一般輪播；即將接大獎宣告時跳過，避免跑馬燈跳出無關訊息
            arr.push((resolve) => {
                this.messageMarquee.playMarquee();
                resolve();
            });
        }

        if (forceFinalRound) { // maxwin 收尾：補回消除留下的空格，避免結算盤面破洞
            arr.push((resolve) => {
                const results: string[][] = ri.getSymbolsList().reduce(symbolReducer, []);
                this.puzzle.setSymbols(new PuzzleData(results), SLOT_SYMBOL_STATUS.NORMAL);
                resolve();
            });
        }

        if (hasFG) { // 有 FG
            audioPreload('S309818_fg_announce_start');
            audioPreload('S309820_fg_bgm_Settlement_start');
            audioPreload('S309821_fg_bgm_Settlement_loop');
            audioPreload('S309822_fg_bgm_Settlement_end');

            arr.push(
                (resolve) => {
                    const d = getFreeLine(ri.getLinesList());
                    setNodeOpacity(this.slot.node, 255);
                    setNodeOpacity(this.puzzle.node, 0);
                    this.attachPuzzleToSlot();
                    this.messageMarquee.playMIMessage(1);
                    audioPlay('S309832_fg_win');
                    audioPlay('S309817_fg_announce_enter');
                    this.slotResult.scatter(d).then(() => {
                        resolve(1);
                    });
                },
                async (resolve) => { // 免費局宣告
                    // audioSwitchBGM('');
                    this.slotResult.clearScatter();
                    this.updateInFreeGame(true, true);
                    // this.updateWinsRawBalance(ngFgWins);

                    const left = ri.getRemainingRound();
                    this.uiData.set('left', left);
                    schedulePromise(1).then(() => {
                        this.messageMarquee.playMarquee();
                        this.multiRing.reset(true);
                        this.switchBackground(true);
                    });
                    audioPlayBGM('M309802_fg_bgm');
                    await this.foreground.playFGTran(left);
                    this.isFreeRound = true;
                    this.updateInFreeGame(true);
                    this.updateAnimation(false);
                    this.lastFGAccExplodeWins = 0;
                    this.lastFGSpinHadWin = false;
                    await this.multiRing.playNGToFG();
                    resolve(1);
                },
                timeoutResolvef(.05),
                this.nextRoundf,
            );
        } else {
            if (hasNext) { // 有下一局
                arr.push(
                    (resolve) => { // 更新赢分，余额
                        this.updateWinsRawBalance(balance(ngTotalWin));
                        resolve(1);
                    },
                    this.nextRoundf,
                );
            } else { // 最後局
                arr.push(
                    (resolve) => {
                        this.attachPuzzleToSlot();
                        resolve();
                    },
                );

                arr.push(
                    async (resolve) => { // 更新赢分，余额
                        this.updateWinsRawBalance(balance(ngTotalWin));
                        if (bigWin) {
                            this.setSpinStill(true);
                            await this.foreground.playBigWinX(this.spinData.getTotalbet(), ngTotalWin);
                            audioPlayBGM('M309801_ng_bgm');
                            await this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_TOTAL_WIN, ngTotalWin, totalBet); // 顯示共贏得，無跑分
                            await schedulePromise(1.1);
                        } else {
                            if (ngTotalWin > 0) {
                                const showTotal = this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_TOTAL_WIN, ngTotalWin, totalBet); // 共贏得是否展演跑分
                                await showTotal;
                                await schedulePromise(1.1);
                            }
                        }
                        resolve(1);
                    },
                    async (resolve) => {
                        await schedulePromise(0.05);
                        resolve();
                    },
                    this.finalRoundf,
                );
            }
        }
        this.promiseManager.play(arr);
    }

    doFinalRound(loop: boolean): void {
        this.isFreeRound = false;
        audioPlayBGM('M309801_ng_bgm');
        this.updateInNormalGame();
        this.showBonusEventUI(true);
        log('doFinalRound', Date.now() - this.lastSpinAt, Date.now() - this.lastSpinOkAt);
    }

    /**
     * 某局連爆累計分數
     */
    private lastFGAccExplodeWins: number = 0;

    /** 上一回合是否有贏分，供下一回合開場重播倍率音效判斷 */
    private lastFGSpinHadWin: boolean = false;
    public doFreeRound(ri: RoundInfo, prevRi: RoundInfo, roundIndex: number, sink: boolean = false) {
        warnUnregisteredSymbols(ri);

        this.reset();
        const arr: PromiseManager2Array = [];
        const totalBet = this.spinData.getTotalbet();
        const hasWL = hasWinLine(ri.getLinesList());
        const totalWin = ri.getTotalwin();
        const hasWins = totalWin > 0;
        const forceFinalRound = this.shouldForceFinalRound(ri);
        const hasNext = this.hasNextRound() && !forceFinalRound;

        const spinTypes = [SpinType.NORMALGAME, SpinType.NORMALGAME_2, SpinType.FREEGAME, SpinType.FREEGAME_2];
        const fgTotalWin = this.sumSpinTypesWins(spinTypes, 0, roundIndex + 1);

        const explodeEnd = !hasWins && this.lastFGAccExplodeWins > 0;
        const bigWin = getBigWinLevel(totalBet, this.lastFGAccExplodeWins);
        if (bigWin) {
            audioPreload('M309803_award_bgm_enter');
            audioPreload('M309804_award_bgm_loop');
            audioPreload('M309805_award_bgm_end');
        }

        if (!sink) {
            arr.push(
                (resolve) => { // 更新余额，减掉下注
                    this.preRoundInfoSinkFGCount = 0;
                    this.updateInFreeGame(true, true);

                    const left = ri.getRemainingRound();
                    // 更新标头
                    this.uiData.set('left', left);
                    audioPlay('S309834_fg_spin', { loop: true });

                    setNodeOpacity(this.puzzle.node, 0);
                    setNodeOpacity(this.slot.node, 255);
                    this.attachPuzzleToSlot();
                    resolve(1);
                },
                (resolve) => { // 转
                    const results = ri.getSymbolsList().reduce(this.slot.reverseReducer, []);
                    const reels = lines[1].map((v, index) => {
                        return {
                            result: results[index],
                            last: '',
                        };
                    });
                    // this.updateSpinStop(true, false); // 给停
                    this.lastFGAccExplodeWins = 0;
                    if (this.lastFGSpinHadWin) { // 上一回合贏分：這回合開場重播當下倍率音效
                        this.lastFGSpinHadWin = false;
                        audioPlay(this.multiRing.getCurrentLevelEchoAudio());
                    }
                    this.messageMarquee.playMarquee();

                    this.updateSkip(true); // 给停
                    this.slot.spin({
                        reels,
                        mode: SLOT_SPIN_MODE.FREE,
                        delta: 0,
                        squeezeDur: 1,
                    }).then(async () => {
                        // this.updateSpinStop(false, false);
                        this.attachSlotToPuzzle(true);
                        this.switchDisplayToPuzzle();
                        resolve(1);
                    });
                },
            );
        } else {
            arr.push(
                async (resolve) => { // 落下
                    this.puzzleResult.clearAll();
                    // this.updateSpinStop(true, true); // 不给停
                    const results: string[][] = ri.getSymbolsList().reduce(symbolReducer, []);
                    this.puzzle.setResult(new PuzzleData(results));
                    const puzzleMI = this.preRoundInfoSinkFGCount >= (FG_COUNT - 1);
                    const quickspin = puzzleMI ? QUICK_SPINE_LEVEL_3_MI2 : this.commonUIData.quickspin;
                    this.puzzleMI = puzzleMI;
                    if (puzzleMI) {
                        this.playBackgroundShineMI2(true);
                        this.playReelBGDark(true);
                        this.messageMarquee.playMessageHeart(true);
                        this.messageMarquee.playMIMessage(0); // 再來一個SC
                        this.puzzle.playDarkenFadeOtherWithoutFG(true);
                        this.puzzle.playFGSymbolJumpThree();
                        await schedulePromise(1);
                    }
                    await this.puzzle.sinkDrop(quickspin);

                    this.puzzleMI = false;
                    this.messageMarquee.playMessageHeart(false);
                    resolve(1);
                },
            );
        }

        if (hasWL) {
            audioPreload('S309804_win_frame');
            audioPreload('S309807_symbol_win');
            audioPreload('S309808_symbol_dropping');
            audioPreload('S309810_marquee_score');
            audioPreload('S309811_marquee_score_end');
            audioPreload('S309812_marquee_win_settlement');

            arr.push((resolve) => {
                this.switchDisplayToPuzzle();
                resolve(1);
            });
            arr.push(async (resolve) => {
                this.setSpinStill(true);
                // 二次咪牌門檻計數：y=0 是每軸最上面新增的裝飾預覽列，內容尚未真正落定，不算數
                const preRoundFGList = ri.getSymbolsList().filter(s => isFG(s.getSymbolType() + '') && s.getY() !== 0);
                this.preRoundInfoSinkFGCount = preRoundFGList.length;

                const level = ri.getLevel();
                const hasTimes = level > 1;
                const win = hasTimes ? safeDiv(totalWin, level) : totalWin; // 純數字顯示未乘倍率的連線贏分，贏得才是乘完倍率的總分

                const linesSymbols = this.fixUniquePosLinesSymbols(ri);

                this.lastFGAccExplodeWins = this.sumCurrentRoundWins(ri, roundIndex);

                let marquee: Promise<unknown>;
                if (hasTimes) { // FG 從 x2 起跳，跟 NG 同一套：先顯示單純數字，倍數飛落碰到跑馬燈才翻成「贏得」＋強調字
                    this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_NONE, win, totalBet, this.lastFGAccExplodeWins);
                    // 0.63s 起飛＋0.25s 飛行 → 0.88s 撞跑馬燈，對齊圖標爆開音效的瞬間
                    marquee = schedulePromise(0.63).then(() => this.multiRing.playBounceToMarquee()).then(() => {
                        this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_WIN, totalWin, totalBet, this.lastFGAccExplodeWins, sink);
                    });
                } else { // 理論上 FG 不會有 x1，防呆保留原本直接顯示「贏得」
                    this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_WIN, totalWin, totalBet, this.lastFGAccExplodeWins);
                    marquee = Promise.resolve();
                }
                this.multiRing.playEliminationLight(); // 左右屋簷金光，跟圖標消除瞬間同步
                const ps = this.puzzleResult.explode(linesSymbols, this.commonUIData.quickspin, ri.getIsMaxWin());
                await Promise.all([ps, marquee]).then(resolve);
            });
        } else if (!(bigWin && explodeEnd)) { // 這輪沒中獎：跑馬燈切回一般輪播；連爆鏈結束且即將接大獎宣告時跳過，避免跑馬燈跳出無關訊息
            arr.push((resolve) => {
                this.messageMarquee.playMarquee();
                resolve();
            });
        }

        if (forceFinalRound) { // maxwin 收尾：補回消除留下的空格，避免結算/回 NG 盤面破洞
            arr.push((resolve) => {
                const results: string[][] = ri.getSymbolsList().reduce(symbolReducer, []);
                this.puzzle.setSymbols(new PuzzleData(results), SLOT_SYMBOL_STATUS.NORMAL);
                resolve();
            });
        }

        if (explodeEnd) { // 是否到 big win // 可跳
            arr.push(
                async (resolve) => {
                    if (bigWin) {
                        this.setSpinStill(true);
                        await this.foreground.playBigWinX(totalBet, this.lastFGAccExplodeWins);
                        audioPlayBGM('M309802_fg_bgm');
                        await this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_TOTAL_WIN, this.lastFGAccExplodeWins, totalBet); // 顯示共贏得，無跑分
                        await schedulePromise(1.1);
                    } else {
                        await this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_TOTAL_WIN, this.lastFGAccExplodeWins, totalBet); // 顯示共贏得，有跑分
                        await schedulePromise(0.7);
                    }
                    this.lastFGAccExplodeWins = 0;
                    this.lastFGSpinHadWin = true;
                    resolve();
                },
            );
        }

        if (hasNext) { // 有下一局
            arr.push(
                (resolve) => { // 更新赢分，余额
                    this.updateWinsRawBalance(balance(fgTotalWin));
                    resolve(1);
                },
                // timeoutResolvef(.05),
                timeoutResolvef(hasWins ? .05 : 0.4),
                this.nextRoundf,
            );
        } else { // 最後局
            arr.push(
                timeoutResolvef(.5),
                async (resolve) => { // fg 赢分
                    // audioSwitchBGM('');

                    schedulePromise(1.3).then(() => {
                        this.switchBackground(false);
                        this.multiRing.switchFGMulti(false);
                        this.multiRing.reset(true);
                    });
                    audioPlayBGM('');
                    await this.foreground.playTotalWins(totalBet, fgTotalWin);
                    this.updateWinsRawBalance(balance(fgTotalWin));
                    resolve();
                },
                async (resolve) => {
                    if (fgTotalWin > 0) {
                        await this.messageMarquee.playMessageWins(MessageWinPrefixType.SHOW_TOTAL_WIN, fgTotalWin, totalBet);
                        await schedulePromise(2.1);
                    }
                    this.updateInNormalGame();
                    // setNodeOpacity(this.puzzle.node, 0);
                    // setNodeOpacity(this.slot.node, 255);
                    this.attachPuzzleToSlot();
                    resolve();
                },
            );
            arr.push(
                timeoutResolvef(hasWins ? .6 : .05), // 等 .3 秒后结束
                this.finalRoundf,
            );
        }
        this.promiseManager.play(arr);
    }

    private showBonusEventUI(able: boolean) {
        // this.ui.commonUIManager.commonUINodes.forEach((cn) => {
        //     if (cn) {
        //         const n = cn.getComponent(CommonUI).getNodeByPath('bonusParent');
        //         n.stopAllActions();
        //         cc.tween(n)
        //         .to(0.2, { opacity: able ? 255 : 0 })
        //         .start();
        //     }
        // });
    }

    private updateLeft(left: number) {
        warn('updateLeft', left);
        this.uiData.set('left', left);
    }

    /**
     * 切到 Puzzle 靜態盤面顯示（隱藏 Slot 轉輪）。
     * debug=keep_slot 時跳過，讓 Slot 轉輪停止後繼續顯示，方便比對位置
     */
    private switchDisplayToPuzzle() {
        if (keepSlotVisibleDebug) {
            return;
        }
        setNodeOpacity(this.slot.node, 0);
        setNodeOpacity(this.puzzle.node, 255);
    }

    /**
     * 設定 puzzle 盤面, 從 slot 盤面拿取
     */
    private attachSlotToPuzzle(skipFG: boolean = false) {
        const reelLimit = REEL_LIMIT;
        const ssArr: string[][] = [];
        this.slot.getCacheSymbol().forEach((reel, xIdx) => {
            const sArr: string[] = [];
            reel.forEach((ss, yIdx) => {
                if (yIdx > 0 && yIdx <= reelLimit[xIdx]) {
                    sArr.push(ss);
                }
            });
            ssArr.push(sArr);
        });
        if (!skipFG) {
            this.puzzle.setSymbols(new PuzzleData(ssArr), SLOT_SYMBOL_STATUS.NORMAL);
            return;
        }
        // 還在播放 appear，逐格設定時跳過 FG 圖標，避免蓋掉還在播的 appear 動畫
        ssArr.forEach((sArr, x) => {
            sArr.forEach((symbol, y) => {
                if (isFG(symbol)) return;
                this.puzzle.setSymbol(x, y, symbol, SLOT_SYMBOL_STATUS.NORMAL);
            });
        });
    }

    /**
     * 設定 slot 盤面, 從 puzzle 盤面拿取
     */
    private attachPuzzleToSlot() {
        const ssArr = [];
        const reelLimit = REEL_LIMIT;
        const slotCache = this.slot.getCacheSymbol();
        this.puzzle.getSymbols().forEach((reel, idx) => {

            const sArr = [];
            sArr.push(slotCache[idx][0]);
            reel.forEach((s) => {
                sArr.push(s);
            });
            sArr.push(slotCache[idx][reelLimit[idx] + 1]);

            ssArr.push(sArr);
        });
        this.slot.setCacheSymbol(ssArr);
    }

    /**
     * 避免有相同位置的圖標，因為他們可能都是WD
     */
    private fixUniquePosLinesSymbols(ri: RoundInfo): Symbol[] {
        const symbols = flattenDeep(ri.getLinesList().map(x => x.getSymbolsList())).filter(onlyUnique);
        const uniqueData = [];
        const seenCoordinates = {};
        for (const symbol of symbols) {
            const key = `${symbol.getX()}-${symbol.getY()}`;
            if (!seenCoordinates[key]) {
                seenCoordinates[key] = true;
                uniqueData.push(symbol);
            }
        }
        return uniqueData;
    }

    @property([Node])
    ngBackgrounds: Node[] = [];
    @property([Node])
    fgBackgrounds: Node[] = [];
    @property(SpriteFrame)
    ngInfoBg: SpriteFrame = null;   // NG 底版圖（incompressible1 的 pic_info_bg）
    @property(SpriteFrame)
    fgInfoBg: SpriteFrame = null;   // FG 底版圖（incompressible2 的 pic_info_bg）

    private switchBackground(isFreeGame: boolean) {
        // 檢查 n 是否存在，如果 n 為 null 或 undefined，則跳過
        this.ngBackgrounds.forEach((n) => {
            if (n) {
                n.active = !isFreeGame;
            }
        });

        // 檢查 n 是否存在，如果 n 為 null 或 undefined，則跳過
        this.fgBackgrounds.forEach((n) => {
            if (n) {
                n.active = isFreeGame;
            }
        });

        // 底部資訊底版 pic_info_bg：FG 用 incompressible2、NG 用 incompressible1，讓底版色跟背景一致。
        // 底版在共用 UI(CommonUISlot prefab) 內、執行時才生成，故以名稱在執行時尋找後換圖（每次切都重套 = 自癒被 reset 蓋掉的情況）。
        const infoBg = isFreeGame ? this.fgInfoBg : this.ngInfoBg;
        const cuiNode = this.ui && this.ui.commonUIManager && this.ui.commonUIManager.node;
        if (infoBg && cuiNode) {
            const sprites = cuiNode.getComponentsInChildren(Sprite).filter((s) => s.node.name === 'pic_info_bg');
            sprites.forEach((s) => { s.spriteFrame = infoBg; });
        }
    }

    @property(UIOpacity)
    mi2ShineUIOpacity: UIOpacity = null;
    public playBackgroundShineMI2(toggle: boolean) {
        Tween.stopAllByTarget(this.mi2ShineUIOpacity.node);
        if (toggle) {
            this.mi2ShineUIOpacity.node.active = true;
            tween(this.mi2ShineUIOpacity)
                .to(0.2, { opacity: 255 })
                .start();
        } else {
            tween(this.mi2ShineUIOpacity)
                .to(0.2, { opacity: 0 })
                .call(() => {
                    this.mi2ShineUIOpacity.node.active = false;
                })
                .start();
        }
    }

    @property([Sprite])
    reelBGSprites: Sprite[] = [];
    public playReelBGDark(toggle: boolean) {
        this.reelBGSprites.forEach((sprite) => {
            Tween.stopAllByTarget(sprite);
            tween(sprite)
                .to(0.2, { color: toggle ? COLOR_GRAY : COLOR_WHITE })
                .start();
        });
    }

    public hsaAutoNextRound() {
        return this.isAutoNextRound();
    }

    protected finalRoundf(resolve: Function) {
        this.setSpinStill(false);
        super.finalRoundf(resolve);
    }

    // checkSymbols(ri:RoundInfo) {
    //     let hasDiff = false;

    //     const slotSymbols = this.slot.getCacheSymbol().slice().map((v) => {
    //         v.shift();
    //         v.pop();
    //         return v;
    //     });

    //     const dataSymbols = ri.getSymbolsList();
    //     dataSymbols.forEach((symbol) => {
    //         const x = symbol.getX();
    //         const y = symbol.getY();

    //         const dataSymbolType = symbol.getSymbolType() + '';
    //         const slotSymbolType = slotSymbols[x][y];
    //         if (dataSymbolType !== slotSymbolType) {
    //             hasDiff = true;
    //             error('@@xx hasDiff', x, y , ' data:', dataSymbolType , ' slotSymbol:', slotSymbolType);
    //         }
    //     });

    //     if (hasDiff) {
    //         debugger;
    //     }
    // }
}

function getFGSymbol(ri: RoundInfo) {
    const ls = ri.getLinesList();
    const l = ls.find(l => l.getType() === WinType.WIN_FREE);
    return l ? l.getSymbolsList()[0] : null;
}

/**
 *
 * slotSymbol 與 puzzleSymbol 的 change 一同在這裡處理。
 *
 */
export function changeSymbol(symbolBase: SlotSymbol | PuzzleSymbol, symbol: string, status: SLOT_SYMBOL_STATUS_3098 | SLOT_SYMBOL_STATUS, force: boolean = false) {
    const isSlot = symbolBase instanceof SlotSymbol;
    const symbolBaseNode = symbolBase.node;
    const frontNode = symbolBase.frontNode;

    const type = extractSymbolType(symbol);
    const str = symbolAnimName(type, status);

    const isFG = type === SymbolType.FG;
    const isWD = type === SymbolType.WD;
    const isBlur = status === SLOT_SYMBOL_STATUS_3098.BLUR;

    // 識別緩衝區符號：Slot 模式下 index 0 (最底) / total-1 (最頂) 為螢幕外暫存格，用圖片
    let isBuffer = false;
    // 識別每軸最上面新增的裝飾列：不是後端真實資料，即使是 FG/WD 也強制用圖片，不播骨骼發光動畫
    let isDecorativeTopRow = false;
    if (isSlot) {
        const slotSymbol = symbolBase as SlotSymbol;
        const total = slotSymbol.reel.getTotal();
        if (slotSymbol.index === 0 || slotSymbol.index === total - 1) {
            isBuffer = true;
        }
        if (slotSymbol.index === total - 2) {
            isDecorativeTopRow = true;
        }
    } else {
        const puzzleSymbol = symbolBase as PuzzleSymbol;
        if (puzzleSymbol.reel && puzzleSymbol.index === puzzleSymbol.reel.length - 1) {
            isDecorativeTopRow = true;
        }
    }

    // 設定圖標：FG / WD 非 BLUR、非緩衝區、非裝飾列時播骨架動畫，其餘用圖片；force 為 true 時無視裝飾列限制強制播
    if ((isFG || isWD) && !isBlur && !isBuffer && (force || !isDecorativeTopRow)) {
        const skDataName = getSkeletonDataName(type);
        const skin = isWD ? getSymbolSkin(type) : 'default';
        let sk: sp.Skeleton;
        let skipSync = false;

        // APPEAR 狀態：FG 停軸後由 Slot.ts 觸發；WD 金框格轉 WILD 時由 PuzzleResult 觸發。播 appear -> stay 序列
        if ((isFG || isWD) && status === SLOT_SYMBOL_STATUS_3098.APPEAR) {
            const stayStr = symbolAnimName(type, SLOT_SYMBOL_STATUS_3098.NORMAL);
            sk = symbolBase.setSymbolSkeletonAnim(skDataName, [str, stayStr], true, skin, frontNode);
            skipSync = true; // appear 序列不同步，確保動畫完整播放
        } else {
            sk = symbolBase.setSymbolSkeletonAnim(skDataName, str, true, skin, frontNode);
        }

        // 同步動畫時間（讓場上所有 FG 的循環動畫播放進度一致）
        if (isFG && sk && !skipSync) {
            const track = sk.getCurrent(0);
            if (track) {
                track.trackTime = getSyncSCSkeletonTrackTime();
            }
        }
    } else {
        // 其他符號或 BLUR 狀態的 FG/WD 使用圖片
        let spriteName = str;
        // 如果是 FG 或 WD 且不是 BLUR 狀態，使用基礎圖標名稱 (例如 ani_fg 而不是 ani_fg_stay)
        if ((isFG || isWD) && !isBlur) {
            spriteName = `ani_${SLOT_SYMBOL_MAP[type]}${getSymbolLang(type)}`;
        }
        symbolBase.setSymbolSpriteFrame(spriteName);
    }

    // 排序 slot 圖標 zIndex
    if (isSlot) {
        const root = symbolBaseNode.parent;

        // 轉動中 FG/WD 搬到跨軸共用容器，蓋出自己欄位、蓋過鄰軸圖標
        const slotSymbol = symbolBase as SlotSymbol;
        const reel = slotSymbol.reel;
        const slot = reel.slot as Slot;
        const fgWdTopNode = slot?.fgWdTopNode;

        // 賠付表彈窗開啟時，框架會把圖標節點暫時搬出 reel、接到彈窗自己的容器上，
        // 這裡的 root 就不再是 reel 的 wrapper 節點，不能跟著做跨軸疊層搬動/排序，否則會搬到彈窗的容器
        const isInReel = reel.nodes.indexOf(root) !== -1;
        if (isInReel) {
            if (fgWdTopNode) {
                const shouldTop = (isFG || isWD) && !isBlur && !isBuffer && !isDecorativeTopRow;
                const targetParent = shouldTop ? fgWdTopNode : reel.targetNode;
                if (root.parent !== targetParent) {
                    const worldPos = root.getWorldPosition();
                    root.setParent(targetParent);
                    root.setWorldPosition(worldPos);
                }
            }

            if (isFG) {
                root.setSiblingIndex(999);
            } else if (isWD) {
                root.setSiblingIndex(900);
            } else {
                root.setSiblingIndex(0);
            }
        }
    }
}
