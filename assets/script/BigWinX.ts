import { _decorator } from 'cc';
import { audioPlay, audioStop, audioStopLoop } from '../submodule/game-client-lib/component/Audio';
import BigWin from '../submodule/game-client-lib/script/BigWin';
import { BIG_WIN_LEVEL } from '../submodule/game-client-lib/ui/BigWinBase';
const { ccclass } = _decorator;

@ccclass('BigWinX')
export class BigWinX extends BigWin {

    public isDone: boolean = true;

    private awardBgmId: string = '';
    private awardSoundIds: string[] = [];

    protected doLevelUp(level: BIG_WIN_LEVEL): void {
        switch (level) {
            case BIG_WIN_LEVEL.BIG:
                this.awardBgmId = audioPlay('M309803_award_bgm_enter'); // 大獎動畫音樂開頭
                this.awardSoundIds.push(audioPlay('S309826_award_BIG'));
                break;
            case BIG_WIN_LEVEL.SUPER:
                this.awardSoundIds.push(audioPlay('S309827_award_SUPER'));
                break;
            case BIG_WIN_LEVEL.EPIC:
                this.awardSoundIds.push(audioPlay('S309828_award_EPIC'));
                break;
            case BIG_WIN_LEVEL.MEGA:
                this.awardSoundIds.push(audioPlay('S309829_award_MEGA'));
                break;
        }
    }

    doDone(): void {
        this.isDone = true;
        audioStopLoop('M309804_award_bgm_loop'); // 大獎動畫音樂進入後循環音樂
        if (this.awardBgmId) {
            audioStop(this.awardBgmId);
            this.awardBgmId = '';
        }

        this.awardSoundIds.forEach(id => audioStop(id));
        this.awardSoundIds = [];

        audioPlay('M309805_award_bgm_end'); // 於大獎音樂播放完畢時緊接著播放；或手動停止大獎宣告階段時直接進行插播
    }
}
