
import { _decorator, Label, Node } from 'cc';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';
import { resolveWrapper, tweenNumberStop, tweenNumberToPromise } from '../../game-client-lib/script/PromiseManager';
import { fixThousandth2, fixThousandth3 } from '../../game-client-lib/utils/Balance';
import { delayTime, easeBezierAction } from '../../game-client-lib/utils/Tween';
import { IResult } from '../slot/SlotResultBase';
import PuzzleBase2 from './PuzzleBase2';

const { ccclass, property } = _decorator;

export class PuzzleResultData {
    constructor(
        public wins: string = '',
        /**
         * 倍数
         */
        public level: string = '',
        /**
         * 自订资料，用于画面呈现
         */
        public custom: any = null,
    ) {

    }
}

@ccclass
export default abstract class PuzzleResultBase extends TemplateGenerator implements IResult {

    @property(Node)
    layerSymbol: Node = null;

    @property(Label)
    winsLabel: Label = null;

    @property(Label)
    multipleLabel: Label = null;

    @property(PuzzleBase2)
    puzzle: PuzzleBase2 = null;

    data: PuzzleResultData = null;

    /**
     * 設定 total 及 loop 時的資料，不包含 scatter
     */
    public reset(data: PuzzleResultData) {
        this.data = data;
    }

    /**
         * 播放全线动画
         * 含跑分
         * @param delay 預設 0 秒
         */
    public async totalLinesWins(delay: number = 0, duration: number = .7) {
        await this.totalLinesWinsStart(delay, duration);
        this.totalLinesWinsEnd();
    }

    /**
     * 播放全线动画分段
     * 含跑分
     * 應手動呼 totalLinesWinsEnd
     * @param delay 預設 0 秒
     */
    public async totalLinesWinsStart(delay: number = 0, dur: number = .7) {
        const ml = this.multipleLabel;
        if (ml) {
            ml.node.active = Boolean(this.data.level);
            ml.string = this.data.level;
        }

        return resolveWrapper(tweenNumberToPromise(0, Number(this.data.wins), dur, this.onTweenX.bind(this), {
            easing: easeBezierAction(0, .4, .75, 1),
            after: delayTime(delay),
            key: 'PuzzleResultBase',
        }));
    }

    public totalLinesWinsEnd() {
        const d = this.data;
        const wl = this.winsLabel;
        const ml = this.multipleLabel;

        const wins = d.wins;
        const level = d.level;

        tweenNumberStop('PuzzleResultBase');
        wl.string = fixThousandth2(wins);
        if (ml) {
            ml.node.active = Boolean(level);
            ml.string = level;
        }
    }

    public clearAll(): void {
        this.winsLabel.string = '';
        this.multipleLabel.string = '';
        tweenNumberStop('PuzzleResultBase');
    }

    /**
     * 时间点：呼叫 total(true) 跑分时
     * 用于：更新跑分、播跑分音效
     */
    abstract doTweenX(x: number): void;

    onTweenX(x: number) {
        this.doTweenX(x);
        this.winsLabel.string = fixThousandth3('' + x);
    }
}
