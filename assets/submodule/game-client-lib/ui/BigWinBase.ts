
import { _decorator, Component } from 'cc';
import { balanceNumber } from '../utils/Balance';
import { biggerThen, log, loop2ArrayWithMinLength, lowerThen, sumReducer } from '../utils/Utils';

const { ccclass, property } = _decorator;

export function bigWinAudioPreload() {
    // audioPreload('M300001_award_bgm');
    // audioPreload('S300001_award_count');
    // audioPreload('S300002_award_BIG');
    // audioPreload('S300003_award_SUPER');
    // audioPreload('S300004_award_EPIC');
    // audioPreload('S300005_award_MEGA');
    // audioPreload('S300006_firework_epic2');
    // audioPreload('S300007_firework_mega2');
    // audioPreload('S300008_award_finish');
}

export enum BIG_WIN_LEVEL {
    BIG = 'big', // 10,
    SUPER = 'super', // 20,
    EPIC = 'epic', // 50,
    MEGA = 'mega', // 100,
    NONE = '',
}

export interface BigWinLevelConfig {
    sec: number;
    times: number;
}

export class BigWinData {
    constructor(
        public totalBet: number = 1,
        public totalWins: number = 1,
        public config: BigWinConfig = defaultBigWinConfig,
    ) {
    }
}

export interface BigWinPlayData {
    sec: number;
    weight: number;
    bet: number;
    wins: number;
    level: BIG_WIN_LEVEL;
    each: {
        weight: number;
        levelUp: boolean;
        sec: number;
        wins: number;
    }[];
}

export type BigWinConfig = {
    // [s: BIG_WIN_LEVEL]: BigWinLevelConfig,
    big: BigWinLevelConfig,
    super: BigWinLevelConfig,
    epic: BigWinLevelConfig,
    mega: BigWinLevelConfig,
};

const BIG_WIN_LEVELS = [
    BIG_WIN_LEVEL.BIG,
    BIG_WIN_LEVEL.SUPER,
    BIG_WIN_LEVEL.EPIC,
    BIG_WIN_LEVEL.MEGA,
];

const BIG_WIN_LEVELS_V2 = [
    BIG_WIN_LEVEL.BIG,
    BIG_WIN_LEVEL.EPIC,
    BIG_WIN_LEVEL.MEGA,
];

function getLevels(bigWinLevelsV2?: boolean): BIG_WIN_LEVEL[] {
    return bigWinLevelsV2 ? BIG_WIN_LEVELS_V2 : BIG_WIN_LEVELS;
}

export function nextLevel(level: BIG_WIN_LEVEL, bigWinLevelsV2?: boolean): BIG_WIN_LEVEL {
    const levels = getLevels(bigWinLevelsV2);
    const index = levels.indexOf(level);
    if (index === -1) {
        return levels[0];
    }
    return levels[index + 1] || BIG_WIN_LEVEL.MEGA;
}

export let defaultBigWinConfig: BigWinConfig = {
    big: {
        times: 10,
        sec: 3,
        // scaleXWin: 0.55,
    },
    super: {
        times: 20,
        sec: 3,
        // scaleXWin: 0.62,
    },
    epic: {
        times: 50,
        sec: 3,
        // scaleXWin: 0.8,
    },
    mega: {
        times: 100,
        sec: 5,
        // scaleXWin: 1,
    },
};

export let defaultBigWin5Config: BigWinConfig = {
    big: {
        times: 5,
        sec: 3,
        // scaleXWin: 0.55,
    },
    super: {
        times: 20,
        sec: 3,
        // scaleXWin: 0.62,
    },
    epic: {
        times: 50,
        sec: 3,
        // scaleXWin: 0.8,
    },
    mega: {
        times: 100,
        sec: 5,
        // scaleXWin: 1,
    },
};

function getTotalSec(lv: BIG_WIN_LEVEL, bigWinLevelsV2?: boolean): number {
    const levels = getLevels(bigWinLevelsV2);
    return levels.slice(0, levels.indexOf(lv) + 1).map(l => defaultBigWinConfig[l].sec).reduce(sumReducer, 0);
}

export function getBigWinLevelIndex(lv: BIG_WIN_LEVEL, bigWinLevelsV2?: boolean): number {
    return getLevels(bigWinLevelsV2).indexOf(lv);
}

export function getBigWinLevel(totalBet: number, totalWin: number, bigWinLevelsV2?: boolean): BIG_WIN_LEVEL {
    const ary = getLevels(bigWinLevelsV2).slice().reverse();
    const times = totalWin / totalBet;
    for (let i = 0; i < ary.length; i += 1) {
        const lv = ary[i];
        const config = defaultBigWinConfig[lv];
        if (times >= config.times) {
            return lv;
        }

    }
    return BIG_WIN_LEVEL.NONE;
}

export function calculate(bet: number, wins: number, config: BigWinConfig, bigWinLevelsV2?: boolean): BigWinPlayData {
    const level = getBigWinLevel(bet, wins, bigWinLevelsV2);
    const totalBetReal = balanceNumber(bet);
    const times = wins / bet;

    const totalSec = getTotalSec(level, bigWinLevelsV2);

    const levels = getLevels(bigWinLevelsV2);

    const weights = [1.5]; // 从 0->bigwin
    const winss = [totalBetReal * config[BIG_WIN_LEVEL.BIG].times];
    // const scales = [.7];

    // let maxScaleXWin = 0;
    // i=1，跳过 bigwin
    for (let i = 1; i <= levels.length; i += 1) {
        const lv = levels[i];
        const c = config[lv] || config[BIG_WIN_LEVEL.MEGA];
        // 是否是完整的 某 win
        if (i !== levels.length && times >= c.times) {
            // 从 某 win 到 某 win
            weights.push(c.sec);
            // scales.push(config.scaleXWin);
            winss.push(totalBetReal * c.times);
        } else {
            // maxScaleXWin = c.scaleXWin;
            // this.maxCoinCount = config.coinCount;
            const prevConfig = config[levels[i - 1]];
            // 从 某 win 到 结束
            const w = lowerThen(5, biggerThen(.1, (times - prevConfig.times) / prevConfig.times * prevConfig.sec));
            // const s = lowerThen(1, (times - config.times) / config.times / 10);
            weights.push(w);
            winss.push(balanceNumber(wins));
            break;
        }
    }

    const totalWeight = weights.reduce(sumReducer, 0);

    const arr = loop2ArrayWithMinLength(winss, weights, (wins, weight, idx) => {
        // 之间做 levelUp
        const levelUp = idx !== 1;
        const sec = weight / totalWeight * totalSec;
        log('BigWinConfig calculate', sec, wins);
        return {
            weight,
            levelUp,
            sec,
            wins,
        };
    });

    return {
        bet,
        wins,
        level,
        sec: totalSec,
        weight: totalWeight,
        each: arr,
    };
}

@ccclass
export default abstract class BigWinBase extends Component {

    public data: BigWinPlayData = null;

    abstract play(totalBet: number, totalWins: number, config?: BigWinConfig): Promise<any>;

    abstract preload(): Promise<void>;

}
