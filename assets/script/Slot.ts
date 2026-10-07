import { _decorator, Node, sp, Tween, tween, UIOpacity } from 'cc';
import { audioPlay, audioStop, audioStopLoop } from '../submodule/game-client-lib/component/Audio';
import { spSkeletonSetAnimation } from '../submodule/game-client-lib/script/PromiseManager';
import { sumReducer } from '../submodule/game-client-lib/utils/Utils';
import { SymbolType } from '../submodule/slot-client-lib/protobuf/ProtobufWarp';
import SlotBase, { beforeSpinOnly1, beforeStopPrevLastShiftOnly1, isFG, SlotBeforeSpinReturnObject, SlotBeforeStopReturnObject, SlotSqueezeCheckReturnObject } from '../submodule/slot-client-lib/slot/SlotBase';
import SlotReel, { SlotReelSymbol } from '../submodule/slot-client-lib/slot/SlotReel';
import { COLOR_GRAY, COLOR_WHITE, SLOT_SYMBOL_STATUS_3098 } from './GameGlobal';
import MessageMarquee from './MessageMarquee';
import { SlotSymbol } from './SlotSymbol';
import Lobby from './Lobby';

const { ccclass, property } = _decorator;

const SPIN_LINE_FADE_SEC = 0.5;    // 軸底滾動特效淡入/淡出秒數
const SPIN_LINE_OPACITY = 127.5;   // 特效最亮只到半透明，避免蓋過圖標

@ccclass
export default class Slot extends SlotBase {

    public messageMarquee: MessageMarquee = null;

    @property(Node)
    lobbyNode: Node = null;

    @property([UIOpacity])
    miUIOpacityArr: UIOpacity[] = [];

    @property([sp.Skeleton])
    spinLineSks: sp.Skeleton[] = []; // 每軸底部的滾動特效（spine_line），index 0 = 最左軸

    @property(Node)
    fgWdTopNode: Node = null; // 轉動中 FG/WD 跨軸共用容器，讓 setSiblingIndex 跨得出同一軸的限制

    private lobbyX: Lobby = null;
    public fgAppearCount: number = 0; // 統計 fg 符號的出現次數
    private delayTweenNodes: Node[] = [];

    start(): void {
        this.lobbyX = this.lobbyNode.getComponent(Lobby);

        for (let i = 0; i < this.reels.length; i += 1) {
            const n = new Node();
            this.delayTweenNodes.push(n);
        }
    }

    // result 陣列是反過來存的（index 0 = 最下排，最後一個 index = 最上排，每軸多一顆新增的裝飾列）。
    // 後端邊排 FG 仍要跟後端一致算入，但最上面新增那格不算
    private fgCountExcludingTopRow(result: string[]): number {
        return result.slice(0, result.length - 1).filter(r => isFG(r)).length;
    }

    squeezeCheck(reelIndex: number): SlotSqueezeCheckReturnObject {
        let squeeze = '';
        if (reelIndex >= 2) {
            const count = this.data.reels
                .slice(0, reelIndex)
                .map(t => this.fgCountExcludingTopRow(t.result))
                .reduce(sumReducer, 0);
            if (count >= 2) {
                squeeze = `mi_${count}`;
            }
        }

        return {
            squeeze,
            length: 0,
        };
    }

    private fgCount: number = 0;
    private stoppedReels: Set<number> = new Set(); // 本局已停輪(almostStop)的軸，供 fgCount 順序無關累計
    private hasMI: boolean = false;
    private miAudioIDs: string[] = [];
    squeeze(reelIndex: number): void {
        const reel = this.reels[reelIndex];

        // 开瞇牌框特效
        const miUIOpacity = this.miUIOpacityArr[reelIndex];
        if (miUIOpacity) {

            miUIOpacity.node.active = true;
            Tween.stopAllByTarget(miUIOpacity);
            tween(miUIOpacity)
                .delay(0.2)
                .call(() => {
                    const id = audioPlay('S309823_expect_reel');
                    this.miAudioIDs.push(id);
                })
                .to(0.3, { opacity: 255 })
                .start();

            if (!this.hasMI) {
                this.messageMarquee.playMessageHeart(true);
                const lobby = this.lobbyX;
                lobby.playReelBGDark(true);
                lobby.multiRing.startDragonBreath();

                this.hasMI = true;
            }
        }

        if (this.fgCount < 3) {
            this.messageMarquee.playMIMessage(0); // 再來一個SC ,
        }

        this.scheduleOnce(() => {
            this.reels.forEach((reel, reelIdx) => {
                if (reelIdx < reelIndex) {
                    this.playDarkenFadeOtherWithoutFG(reel, true);
                }
            });
        });
        reel.squeeze = true;
    }

    beforeSpin(reel: SlotReel, loop: string[]): SlotBeforeSpinReturnObject {
        this.tailHandled = false; // 每局滾動前重置收尾旗標
        this.stoppedReels.clear();
        const reelIndex = reel.index;
        const symbols = reel.getSymbols();
        const skip = beforeSpinOnly1(SymbolType.FG, reel.length, symbols, loop);

        const tweenNode = this.delayTweenNodes[reelIndex];
        Tween.stopAllByTarget(tweenNode);

        // 這一軸開始轉動：軸底的滾動特效淡入
        const lineSk = this.spinLineSks[reelIndex];
        if (lineSk) {
            lineSk.node.active = true;
            spSkeletonSetAnimation(lineSk, 'effect_line', true);

            const lineOpacity = lineSk.getComponent(UIOpacity);
            if (lineOpacity) {
                lineOpacity.opacity = 0;
                Tween.stopAllByTarget(lineOpacity);
                tween(lineOpacity)
                    .to(SPIN_LINE_FADE_SEC, { opacity: SPIN_LINE_OPACITY })
                    .start();
            }
        }

        return {
            skip,
            appends: [],
            loop: [],
        };
    }

    beforeStop(reelIndex: number, symbols: SlotReelSymbol[], loop: SlotReelSymbol[], squeeze: string): SlotBeforeStopReturnObject {
        this.fgAppearCount = 0; // 重置統計 fg 符號次數
        const only1Arr = [SymbolType.FG];
        const { prev, last, shift } = beforeStopPrevLastShiftOnly1(only1Arr, loop);
        const appends = [];

        return {
            symbols,
            appends,
            prev,
            last,
            shift,
        };
    }

    almostStop(reelIndex: number): void {
        // 這一軸停了：軸底的滾動特效淡出後關閉
        const lineSk = this.spinLineSks[reelIndex];
        if (lineSk) {
            const lineOpacity = lineSk.getComponent(UIOpacity);
            if (lineOpacity) {
                Tween.stopAllByTarget(lineOpacity);
                tween(lineOpacity)
                    .to(SPIN_LINE_FADE_SEC, { opacity: 0 })
                    .call(() => {
                        lineSk.node.active = false;
                    })
                    .start();
            } else {
                lineSk.node.active = false;
            }
        }

        this.stoppedReels.add(reelIndex);
        this.fgCount = this.data.reels.reduce(
            (acc, reel, index) => {
                if (this.stoppedReels.has(index)) {
                    return acc + this.fgCountExcludingTopRow(reel.result);
                }
                return acc;
            },
            0,
        );

        if (this.fgCountExcludingTopRow(this.data.reels[reelIndex].result) > 0) {
            if (this.isValid) {
                audioPlay('S309847_fg_appear_2', { throttle: 10 });
            }
            this.fgAppearCount += 1;
        }

        let skipReelStop = false;
        // 瞇牌結束後，fg 圖標超過 3 個以上
        // 閃電模式 almostStop 亂序，reel5 不一定最後；改用「已停軸數 >= 總軸數」判斷最後一軸
        const isLastAlmostStop = this.stoppedReels.size >= this.reels.length;
        if (isLastAlmostStop) {
            // 轉軸音效改 loop 播放，最後一軸停了才停，閃電模式提早停軸時音效不再拖過頭；NG/FG 用不同音效，兩個都停一次確保不會漏
            audioStopLoop('S309831_reel_spin');
            audioStopLoop('S309834_fg_spin');
        }
        if (isLastAlmostStop && this.fgCount >= 3) {
            this.miAudioIDs.forEach(id => audioStop(id));
            this.miAudioIDs = [];
            skipReelStop = true;
        }

        Tween.stopAllByTarget(this.delayTweenNodes[reelIndex]);
        if (!skipReelStop) {
            audioPlay('S309833_reel_stop', { throttle: 50 });
        }
    }

    private isAfterStopReel: boolean[] = [];
    private tailHandled: boolean = false; // 本局收尾是否已執行（閃電模式 afterStop 亂序，防重複）
    async afterStop(reelIndex: number, next: Function): Promise<void> {
        if (this.isAfterStopReel[reelIndex]) {
            return;
        }

        this.isAfterStopReel[reelIndex] = true;
        // const reel = this.reels[reelIndex];
        const miUIOpacity = this.miUIOpacityArr[reelIndex];
        if (miUIOpacity && miUIOpacity.opacity === 255) {
            tween(miUIOpacity)
                .to(0.1, { opacity: 0 })
                .call(() => {
                    miUIOpacity.node.active = false;
                })
                .start();
        }

        if (this.fgCount >= 3) {
            this.messageMarquee.playMIMessage(1);
        }

        // 停軸後，對該軸上可見的 FG 圖標觸發 appear 動畫，同時對底下的 puzzle 對應圖標也觸發同一個動畫
        // slotSymbols[0] 和 slotSymbols[last] 是緩衝區（不可見），跳過
        // visibleSymbols 由上到下，跟 puzzleReel.getPuzzleSymbol(y) 的 y（上到下）一一對應
        const reel = this.reels[reelIndex];
        const visibleSymbols = reel.slotSymbols.slice(1, reel.slotSymbols.length - 1);
        visibleSymbols.forEach((slotSymbol, y) => {
            if (isFG(slotSymbol.symbol)) {
                slotSymbol.change(slotSymbol.symbol, SLOT_SYMBOL_STATUS_3098.APPEAR as any);

                this.lobbyX.puzzle.setSymbol(reelIndex, y, slotSymbol.symbol, SLOT_SYMBOL_STATUS_3098.APPEAR as any);
            }
        });

        // 如果目前處於瞇牌狀態（FG >= 2），立即對當前軸觸發 ex 檢查
        // 確保第 3, 4, 5 顆 FG 能在 appear 之後立刻接 ex
        if (this.fgCount >= 2) {
            this.playDarkenFadeOtherWithoutFG(reel, true);
        }

        // 閃電模式下各軸 afterStop 為亂序非同步觸發，reel5 不一定最後完成；
        // 改用「所有軸皆已停」判斷真正最後一軸，tailHandled 確保只收尾一次。
        const isLastReel = this.reels.every(r => r.isStoped());
        if (isLastReel && !this.tailHandled) {
            this.tailHandled = true;

            if (this.fgCount < 3) {
                this.messageMarquee.playMarquee();
            }

            this.hasMI = false;

            const lobby = this.lobbyX;
            lobby.playReelBGDark(false);
            lobby.multiRing.stopDragonBreath();
            this.messageMarquee.playMessageHeart(false);

            this.miAudioIDs.forEach(id => audioStop(id));
            this.miAudioIDs = [];

            this.reels.forEach(r => this.playDarkenFadeOtherWithoutFG(r, false));
            this.fgCount = 0;

            this.miUIOpacityArr.forEach((o, idx) => {
                if (o && idx < 6) {
                    o.node.active = false;
                }
            });
        }

        this.isAfterStopReel[reelIndex] = false;
        next();
    }

    doStopAll(): void {

    }

    /**
     * 單軸圖標變黑，除了FG圖標以外
     */
    public playDarkenFadeOtherWithoutFG(reel: SlotReel, toggle: boolean) {
        reel.slotSymbols.forEach((slotSymbol, y) => {
            const isFg = isFG(slotSymbol.symbol);
            const isDecorativeTopRow = y === 1; // 每軸多一顆新增的頂部裝飾列，不是後端真實資料，不參與期待特效

            if (isFg) {
                if (isDecorativeTopRow) {
                    const slotSym = slotSymbol as SlotSymbol;
                    const sprite = slotSym.symbolSprite;
                    if (sprite) {
                        Tween.stopAllByTarget(sprite);
                        tween(sprite)
                            .to(0.3, { color: toggle ? COLOR_GRAY : COLOR_WHITE })
                            .start();
                    }
                    return;
                }

                const slotSym = slotSymbol as SlotSymbol;
                const sk = slotSym.symbolSkeleton;
                if (!sk) {
                    slotSymbol.change(slotSymbol.symbol, toggle ? SLOT_SYMBOL_STATUS_3098.EXPECTATION as any : SLOT_SYMBOL_STATUS_3098.NORMAL as any);
                    return;
                }
                const currentAnim = sk.getCurrent(0)?.animation?.name;

                // 安全起見，先移除舊的監聽器
                sk.setCompleteListener(null);

                if (toggle) {
                    if (currentAnim === 'ani_fg_ex') {
                        // 已在期待狀態，不重複觸發
                    } else if (currentAnim === 'ani_fg_appear') {
                        // 如果正在播 appear，等它播完自動切換 ex
                        sk.setCompleteListener((te) => {
                            if (te.animation.name === 'ani_fg_appear') {
                                sk.setCompleteListener(null);
                                slotSymbol.change(slotSymbol.symbol, SLOT_SYMBOL_STATUS_3098.EXPECTATION as any);
                            }
                        });
                    } else {
                        // 若在 stay 狀態被捲入瞇牌，直接切換為 ex
                        slotSymbol.change(slotSymbol.symbol, SLOT_SYMBOL_STATUS_3098.EXPECTATION as any);
                    }
                } else if (currentAnim === 'ani_fg_appear') {
                    // 正在播 appear：不要打斷，appear 播完本來就會自動接 stay（跟 NORMAL 視覺一樣）
                } else {
                    // 瞇牌結束或取消，全部切回 NORMAL (stay)
                    slotSymbol.change(slotSymbol.symbol, SLOT_SYMBOL_STATUS_3098.NORMAL as any);
                }
                return;
            }

            const sk = (slotSymbol as SlotSymbol).symbolSprite;
            if (sk) {
                Tween.stopAllByTarget(sk);
                tween(sk)
                    .to(0.3, { color: toggle ? COLOR_GRAY : COLOR_WHITE })
                    .start();
            }
        });
    }
}
