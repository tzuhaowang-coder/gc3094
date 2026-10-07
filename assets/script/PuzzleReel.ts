import { _decorator, Node, tween, TweenEasing, v2, Vec2 } from 'cc';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
import { NodeTween, nodeTweenToPromise } from '../submodule/game-client-lib/data/NodeTween';
import { schedulePromise } from '../submodule/game-client-lib/script/PromiseManager';
import { moveBy, moveTo, sequence } from '../submodule/game-client-lib/utils/Tween';
import { DROP_STATUS, PuzzleMoveData } from '../submodule/slot-client-lib/puzzle2/PuzzleData';
import PuzzleReelBase from '../submodule/slot-client-lib/puzzle2/PuzzleReelBase';
import PuzzleSymbolBase2 from '../submodule/slot-client-lib/puzzle2/PuzzleSymbolBase2';
import { isFG, isWD } from '../submodule/slot-client-lib/slot/SlotBase';
import Lobby from './Lobby';
import PuzzleResult from './PuzzleResult';
import { DEBUG } from 'cc/env';
import { getDebugParams } from '../submodule/game-client-lib/ParamsGlobal';
import { vecXToVec3 } from '../submodule/game-client-lib/utils/Utils';

const { ccclass, property } = _decorator;

const SKIN_DROP_TWEEN_EASING = 'quadIn';

@ccclass
export default class PuzzleReel extends PuzzleReelBase {

    @property(Node)
    wdSymbolParent: Node = null;

    @property(Node)
    fgSymbolParent: Node = null;

    @property(PuzzleResult)
    puzzleResult: PuzzleResult = null;

    public doGetParent(puzzleSymbol: PuzzleSymbolBase2): Node {
        if (isFG(puzzleSymbol.symbol)) {
            return this.fgSymbolParent;
        } else if (isWD(puzzleSymbol.symbol)) {
            return this.wdSymbolParent;
        }
        return this.targetNode;
    }

    lobby: Lobby = null;

    public getPosition(index: number): Vec2 {
        const idx = this.length - index - 1;
        return v2(0, (this.symbolHeight * idx));
    }

    async doClear(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number): Promise<any> {
        const config = this.getPuzzleTimeConfig(quickSpin);

        // 每一軸延遲掉落
        const delayClearReelDur = puzzleMoveData.reelIndex * config.delayClearReel;
        await schedulePromise(delayClearReelDur);

        // 每一顆填滿的間隔
        const delayOneClearDur = config.delayOneClear * puzzleMoveData.sinkIndex;
        await schedulePromise(delayOneClearDur);

        // 清空
        const clearDur = config.clearSpeed * (puzzleMoveData.endIndex - puzzleMoveData.startIndex + config.clearOffset);
        const moveTween = moveTo(clearDur, this.getPosition(puzzleMoveData.endIndex + config.clearOffset));
        const nt = new NodeTween(puzzleSymbol.node, moveTween);
        await nodeTweenToPromise(nt);
    }

    async doSink(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number): Promise<any> {
        const config = this.getPuzzleTimeConfig(quickSpin);

        // 每一軸延遲掉落
        const delaySinkReelDur = puzzleMoveData.reelIndex * config.delaySinkReel;
        await schedulePromise(delaySinkReelDur);

        // 每一顆填滿的間隔
        const delayOneSinkDur = config.delayOneSink * puzzleMoveData.sinkIndex;
        await schedulePromise(delayOneSinkDur);

        // 填滿
        audioPlay('S309808_symbol_dropping', { throttle: 10 });

        // const sinkDur = config.sinkSpeed * (puzzleMoveData.endIndex - puzzleMoveData.startIndex);
        // const moveTween = moveTo(sinkDur, this.getPosition(puzzleMoveData.endIndex));
        // const tween = sequence(
        //     moveTween,
        //     this.sinkBounce(),
        // );
        // await nodeTweenToPromise(new NodeTween(puzzleSymbol.node, tween));

        let easingStr: TweenEasing = SKIN_DROP_TWEEN_EASING;
        if (DEBUG) {
            const debug = getDebugParams('custom_02') as TweenEasing;
            if (debug) {
                easingStr = debug;
            }
        }

        const sinkDur = config.sinkSpeed;
        const endPos = vecXToVec3(this.getPosition(puzzleMoveData.endIndex));
        const node = puzzleSymbol.node;
        await new Promise<void>((resolve) => {
            tween(node)
                .sequence(
                    tween().to(sinkDur, { position: endPos }, { easing: easingStr }),
                    this.sinkBounce(),
                )
                .call(() => {
                    if (isFG(puzzleSymbol.symbol)) {
                        puzzleSymbol.change(puzzleSymbol.symbol, puzzleSymbol.status || 0);
                    }
                    resolve();
                })
                .start();
        });
    }

    async doDrop(puzzleSymbol: PuzzleSymbolBase2, puzzleMoveData: PuzzleMoveData, quickSpin: number, dropStatus: DROP_STATUS): Promise<any> {
        const config = this.getPuzzleTimeConfig(quickSpin);

        // 會露餡所以往上一格
        const startPos = this.getPosition(puzzleMoveData.startIndex - config.dropOffset);
        puzzleSymbol.node.setPosition(startPos.x, startPos.y);

        // 每一軸延遲掉落
        const delayDropReelDur = puzzleMoveData.reelIndex * config.delayDropReel;
        await schedulePromise(delayDropReelDur);

        // 每一顆掉落的間隔
        const delayOneDropDur = config.delayOneDrop * puzzleMoveData.sinkIndex;
        await schedulePromise(delayOneDropDur);

        // 掉落
        if (!this.lobby.puzzleMI) {
            audioPlay('S309808_symbol_dropping', { throttle: 70 });
        }

        // const dropDur = config.dropSpeed * (puzzleMoveData.endIndex - puzzleMoveData.startIndex + config.dropOffset);
        // const moveTween = moveTo(dropDur, this.getPosition(puzzleMoveData.endIndex));
        // const tween = sequence(
        //     moveTween,
        //     this.dropBounce(),
        // );
        // await nodeTweenToPromise(new NodeTween(puzzleSymbol.node, tween));

        let easingStr: TweenEasing = SKIN_DROP_TWEEN_EASING;
        if (DEBUG) {
            const debug = getDebugParams('custom_02') as TweenEasing;
            if (debug) {
                easingStr = debug;
            }
        }

        const dropDur = config.dropSpeed;
        const endPos = vecXToVec3(this.getPosition(puzzleMoveData.endIndex));
        const node = puzzleSymbol.node;
        await new Promise<void>((resolve) => {
            tween(node)
                .sequence(
                    tween().to(dropDur, { position: endPos }, { easing: easingStr }),
                    tween().call(() => {
                        if (this.lobby.puzzleMI) {
                            audioPlay('S309808_symbol_dropping');
                        }
                    }),
                    this.dropBounce(),
                )
                .call(() => {
                    if (isFG(puzzleSymbol.symbol)) {
                        puzzleSymbol.change(puzzleSymbol.symbol, puzzleSymbol.status || 0);
                    }
                    resolve();
                })
                .start();
        });
    }

    public dropBounce() {
        return sequence(
            moveBy(0.1, v2(0, 15)),
            moveBy(0.1, v2(0, -15)),
        );
    }

    public sinkBounce() {
        return sequence(
            moveBy(0.1, v2(0, 15)),
            moveBy(0.1, v2(0, -15)),
        );
    }
}
