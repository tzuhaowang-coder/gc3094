import { _decorator, UIOpacity } from 'cc';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
import { schedulePromise } from '../submodule/game-client-lib/script/PromiseManager';
import ForegroundBase2 from '../submodule/game-client-lib/ui/ForegroundBase2';
import { BigWinX } from './BigWinX';

const { ccclass, property } = _decorator;

@ccclass
export default class Foreground extends ForegroundBase2 {

    @property(BigWinX)
    bigWinX: BigWinX = null;

    @property(UIOpacity)
    backgroundBlackMask: UIOpacity = null;

    public async playBigWinX(totalBet: number, totalWins: number) {
        await schedulePromise(1); // 進大獎宣告前的停頓，避免畫面直接切入顯得太突然
        this.bigWinX.isDone = false;
        this.bigWinX.node.active = true;
        const p = this.bigWinX.play(totalBet, totalWins);
        this.backgroundBlackMask.opacity = 127.5; // 打開背景遮罩，讓背景變暗 50%
        audioPlay('M309804_award_bgm_loop', { loop: true }); // 大獎動畫音樂進入後循環音樂
        await p;
        this.done();
        this.backgroundBlackMask.opacity = 0; // 隱藏背景遮罩
    }

    public async playFGTran(left: number) {
        audioPlay('S309819_fg_announce');
        await this.play2(0, left);
    }

    public async playTotalWins(totalBet: number, wins: number) {
        await schedulePromise(1); // 進 FG 結算頁面前的停頓，避免畫面直接切入顯得太突然
        await this.play2(1, totalBet, wins);
    }

}
