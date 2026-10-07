import { _decorator, Tween, tween, Vec3 } from 'cc';
import { Symbol } from 'slot-protobuf/ts/messages/messages_pb';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
import PuzzleBase2 from '../submodule/slot-client-lib/puzzle2/PuzzleBase2';
import { isFG } from '../submodule/slot-client-lib/slot/SlotBase';
import { COLOR_GRAY, COLOR_WHITE, QUICK_SPINE_LEVEL_3 } from './GameGlobal';
import Lobby from './Lobby';
import PuzzleSymbol from './PuzzleSymbol';

const { ccclass } = _decorator;

@ccclass
export default class Puzzle extends PuzzleBase2 {

    lobby: Lobby = null;
    private isDarkenOtherWithoutFG: boolean = false;

    doSinkEnd(quickSpin: number) {
    }

    doDropBaseEnd(quickSpin: number) {
        if (quickSpin === QUICK_SPINE_LEVEL_3) {
            this.lobby.playBackgroundShineMI2(false);
            this.lobby.playReelBGDark(false);
            this.playDarkenFadeOtherWithoutFG(false);
        }
    }

    protected doDropBaseStart2(quickSpin: number) {
        if (this.isDarkenOtherWithoutFG) {
            this.playDarkenFadeOtherWithoutFG(true);
        }
    }

    public darkenFadeOther(lineInfoSymbols: Symbol[], toggle: boolean) {
        const puzzleReels = this.puzzleReels;

        if (toggle) {
            puzzleReels.forEach((reel, x) => {
                reel.getSymbols().forEach((_, y) => {
                    const pass = lineInfoSymbols.findIndex(s => s.getX() === x && s.getY() === y) !== -1;
                    if (pass) return;

                    const puzzleSymbol = reel.getPuzzleSymbol(y) as PuzzleSymbol;
                    const sk = puzzleSymbol.symbolSprite;
                    if (sk) {
                        Tween.stopAllByTarget(sk);
                        tween(sk)
                            .to(0.3, { color: COLOR_GRAY })
                            .start();
                    }

                });
            });
        } else {
            puzzleReels.forEach((reel, x) => {
                reel.getSymbols().forEach((_, y) => {
                    const puzzleSymbol = reel.getPuzzleSymbol(y) as PuzzleSymbol;
                    if (puzzleSymbol) {
                        const sk = puzzleSymbol.symbolSprite;
                        if (sk) {
                            Tween.stopAllByTarget(sk);
                            tween(sk)
                                .to(0.3, { color: COLOR_WHITE })
                                .start();
                        }
                    }
                });
            });
        }
    }

    /**
     * 單軸圖標變黑，除了FG圖標以外
     */
    public playDarkenFadeOtherWithoutFG(toggle: boolean) {
        this.isDarkenOtherWithoutFG = toggle;
        this.puzzleReels.forEach((reel) => {
            reel.getSymbols().forEach((_, y) => {
                const puzzleSymbol = reel.getPuzzleSymbol(y) as PuzzleSymbol;
                if (!puzzleSymbol) return;

                const isDecorativeTopRow = y === 0; // 每軸多一顆新增的頂部裝飾列，不是後端真實資料，不參與 FG 保持亮判斷
                const pass = !isDecorativeTopRow && isFG(puzzleSymbol.symbol);
                if (pass && toggle) return;

                const sk = puzzleSymbol.symbolSprite;
                if (sk) {
                    Tween.stopAllByTarget(sk);
                    tween(sk)
                        .to(0.3, { color: toggle ? COLOR_GRAY : COLOR_WHITE })
                        .start();
                }
            });
        });
    }

    public playFGSymbolJumpThree() {
        this.node.getComponentsInChildren(PuzzleSymbol).forEach((puzzleSymbol) => {
            const pass = !isFG(puzzleSymbol.symbol);
            if (pass) return;

            // 每軸多一顆新增的頂部裝飾列，不是後端真實資料，不參與期待跳動特效
            const isDecorativeTopRow = puzzleSymbol.reel && puzzleSymbol.index === puzzleSymbol.reel.length - 1;
            if (isDecorativeTopRow) return;

            const node = puzzleSymbol.node;
            // 如果您擔心中途重複觸發，可以在開始前停止舊的動畫
            Tween.stopAllByTarget(node);

            tween(node)
                .sequence(
                    tween().call(() => {
                        audioPlay('S309824_expect_heartbeat');
                    }),
                    tween().to(0.2, { scale: new Vec3(1.2, 1.2, 1.2) }),
                    tween().to(0.2, { scale: new Vec3(1, 1, 1) }),
                    tween().delay(0.3),
                )
                .repeat(3)
                .start();
        });
    }
}
