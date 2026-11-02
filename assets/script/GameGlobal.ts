import { color, Node, sp } from 'cc';
import { getLang } from '../submodule/game-client-lib/component/I18nManager';
import { EXTRA_1080 } from '../submodule/game-client-lib/ParamsGlobal';
import { setNodeScale, warn } from '../submodule/game-client-lib/utils/Utils';
import { RoundInfo, SymbolType } from '../submodule/slot-client-lib/protobuf/ProtobufWarp';
import { isWD } from '../submodule/slot-client-lib/slot/SlotBase';
import { SLOT_SYMBOL_STATUS } from '../submodule/slot-client-lib/slot/SlotData';

export enum SLOT_SYMBOL_STATUS_3098 {
    NORMAL = 0,
    BLUR = 1,
    WIN = 2,
    APPEAR = 3,
    EXPECTATION = 5,
}

export const btnColor = '#a7873b';
export const iconColor = '#f1d677';
export const txtColor = '#f1d677';

export let betBase = 20;
export let slotBgSymbolScale = 1.2;

export let lines: number[][] = [];

export function setLines(ls: number[][]) {
    lines.length = 0;
    lines.push.apply(lines, ls);
}

export const FG_COUNT = 3;
/** 每一輪可見的圖標顆數 */
export const REEL_LIMIT = [5, 6, 7, 7, 6, 5];

/**
 * 金框固定位置（5 欄 x 6 排；x=欄 0~4 左到右，y=列 0~5 上到下），共 3 格。
 * 規則：只有金框格內的圖標被消除時，才會「原地黏著轉成 WILD」；非金框格一律照舊移除。
 * 用來當 explode 轉 WILD 的閘門，避免把「從上方掉落的 WILD」誤判成原地黏著。
 */
export const GOLD_FRAME_POSITIONS: ReadonlyArray<{ x: number, y: number }> = [
    // { x: 2, y: 2 }, // 中欄偏上
    // { x: 1, y: 4 }, // 左欄中間（紅「中」）
    // { x: 3, y: 4 }, // 右欄中間（藍框）
];

export function isGoldFramePos(x: number, y: number): boolean {
    return GOLD_FRAME_POSITIONS.some(p => p.x === x && p.y === y);
}

export const QUICK_SPINE_LEVEL_3 = 3;
export const COLOR_WHITE = color(255, 255, 255, 255);
export const COLOR_GRAY = color(130, 130, 130, 255);
export let SLOT_SYMBOL_STATUS_APPEAR = 3;
export let SLOT_SYMBOL_STATUS_FG_NORMAL_2 = 4; // fg 圖標觀看 payline 時，換上無閃光背景的樣式

export enum SymbolBox {
    NORMAL = 'n',
    SILVER = 's',
    GOLD = 'g',
}

export let SLOT_SYMBOL_MAP = {
    [SymbolType.SA]: 'sa',
    [SymbolType.SB]: 'sb',
    [SymbolType.SD]: 'sd',
    [SymbolType.SE]: 'se',
    [SymbolType.SF]: 'sf',

    [SymbolType.S1]: 's1',
    [SymbolType.S2]: 's2',
    [SymbolType.S3]: 's3',
    [SymbolType.S4]: 's4',

    [SymbolType.MS1]: 's1_g',
    [SymbolType.MS2]: 's2_g',
    [SymbolType.MS3]: 's3_g',
    [SymbolType.MS4]: 's4_g',

    [SymbolType.MSA]: 'sa_g',
    [SymbolType.MSB]: 'sb_g',
    [SymbolType.MSD]: 'sd_g',
    [SymbolType.MSE]: 'se_g',
    [SymbolType.MSF]: 'sf_g',

    [SymbolType.WD]: 'wild',
    [SymbolType.FG]: 'fg',
};

export function symbolAnimName(type: SymbolType, status: SLOT_SYMBOL_STATUS_3098 | SLOT_SYMBOL_STATUS): string {
    const name = SLOT_SYMBOL_MAP[type];
    const dashBlu = `_blu`;

    switch (status) {
        case SLOT_SYMBOL_STATUS_3098.APPEAR:
            if (type === SymbolType.FG || type === SymbolType.WD) {
                return `ani_${name}_appear`;
            }
            return `ani_${name}`;
        case SLOT_SYMBOL_STATUS_3098.NORMAL:
        case SLOT_SYMBOL_STATUS_FG_NORMAL_2:
            if (type === SymbolType.FG || type === SymbolType.WD) {
                return `ani_${name}_stay`;
            }
            return `ani_${name}`;

        case SLOT_SYMBOL_STATUS_3098.BLUR:
            if (name) {
                if (name.endsWith('_g')) {
                    return `ani_${name.slice(0, -2)}_blu_g`;
                }
                return `ani_${name}${dashBlu}`;
            }

        case SLOT_SYMBOL_STATUS_3098.WIN:
            return `ani_${name}_win`;
        case SLOT_SYMBOL_STATUS_3098.EXPECTATION:
            if (type === SymbolType.FG) {
                return `ani_${name}_ex`;
            }
            return `ani_${name}`;
        default:
            return 'empty';
    }
}

export function getSkeletonDataName(symbolType: SymbolType) {
    const name = SLOT_SYMBOL_MAP[symbolType];
    if (name.endsWith('_g')) {
        return 'spine_symbol_' + name.slice(0, -2);
    }
    return 'spine_symbol_' + name;
}

/** 數值反查 SymbolType 的名稱，查不到就標記 UNKNOWN */
function symbolTypeName(type: SymbolType): string {
    for (const key in SymbolType) {
        if ((SymbolType as unknown as Record<string, number>)[key] === type) {
            return key;
        }
    }
    return 'UNKNOWN';
}

/** 檢查這輪的符號是否有 SLOT_SYMBOL_MAP 沒登記的代號，有的話印一次警告 */
export function warnUnregisteredSymbols(ri: RoundInfo) {
    const badSymbols = ri.getSymbolsList().filter(s => SLOT_SYMBOL_MAP[s.getSymbolType()] === undefined);
    if (badSymbols.length) {
        const desc = badSymbols
            .map(s => `${symbolTypeName(s.getSymbolType())}(type=${s.getSymbolType()}, x=${s.getX()}, y=${s.getY()})`)
            .join(', ');
        warn(`[warnUnregisteredSymbols] 本輪後端送出 SLOT_SYMBOL_MAP 沒有登記的符號：${desc}`);
    }
}

const SYMBOL_LANG = ['en_us', 'zh_cn', 'zh_hk'];
// 3098 只有 wild 分語系（ani_wild_<lang> 靜態圖 + spine 對應語系 skin），FG 與其他符號不分
export function getSymbolLang(type: SymbolType) {
    if (type !== SymbolType.WD) return '';
    const l = getLang();
    let lang = SYMBOL_LANG.indexOf(l) !== -1 ? l : SYMBOL_LANG[0];
    if (EXTRA_1080 && l === 'zh_cn') {
        lang = 'zh_hk';
    }
    return `_${lang}`;
}

export function getSymbolSkin(type: SymbolType): string {
    if (type !== SymbolType.WD) return 'default';
    const l = getLang();
    let lang = SYMBOL_LANG.indexOf(l) !== -1 ? l : SYMBOL_LANG[0];
    if (EXTRA_1080 && l === 'zh_cn') {
        lang = 'zh_hk';
    }
    return lang;
}

export function setSymbolScale(node: Node, symbol: string) {
    setNodeScale(node, isWD(symbol) ? 1.2 : 1.05);
}

let scTrackSkeleton: sp.Skeleton = null;
/**
 * 紀錄每一局出現的第一顆ＳＣ圖標
 * 它將用於同步其他後來出現圖標的時間
 */
export function bindSyncSCSkeleton(sk: sp.Skeleton) {
    scTrackSkeleton = sk;
}
export function getSyncSCSkeletonTrackTime() {
    const track = scTrackSkeleton?.getCurrent(0);
    return track ? track.trackTime : 0;
}
