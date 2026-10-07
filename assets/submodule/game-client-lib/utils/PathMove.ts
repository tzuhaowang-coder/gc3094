import { lerp, v2, Vec2 } from 'cc';
import { FishPathData } from '../data/PathMoveData';
import { biggerThen, pointOnCubicBezier } from './Utils';

export let DELTA_TIME: number = 0.1;
export let DELTA_TIME_TOLERANCE: number = 0.00001;
export let DISTANCE_TOLERANCE: number = 0.001;
export let FPS_60_TIME: number = (1 / 60) * 1000;
export let FPS_30_TIME: number = (1 / 30) * 1000;

// 四捨五入小數點
export function roundDecimal(val: number, precision: number): number {
    return Math.round(Math.round(val * Math.pow(10, (precision || 0) + 1)) / 10) / Math.pow(10, (precision || 0));
}

export function getFishMoveScale(scales: [number, number][], len: number, it: number) {
    scales = scales.slice(0);
    if (!scales.find(s => s[0] === 0)) {
        scales.unshift([0, 1]);
    }
    scales.push([len, 1]);
    const l = scales.find(s => s[0] >= it);
    const r = scales.slice(0).reverse().find(s => s[0] <= it);
    if (!l && !r) {
        return 1;
    } if (!l) {
        return r[1];
    } if (!r) {
        return l[1];
    } if (l[1] === r[1]) {
        return l[1];
    } else {
        return lerp(l[1], r[1], (it - l[0]) / (r[0] - l[0]));
    }
}

/**
 *
 * @returns [i, t, lastTime, lastPos, length, times]
 */

export function doFishMove(now: number, fpd: FishPathData, done: () => void): [number, number, number, Vec2, number, number] {

    const speed = fpd.escape ? biggerThen(500, fpd.speed * 3) : fpd.speed;
    const points = fpd.points;
    const scales = fpd.escape ? [] : fpd.scales;

    let pos = fpd.position;
    let lastTime = fpd.lastTime;
    let i = fpd.i;
    let t = fpd.t;

    // new Vec2(tmpPos.x + paddingX, tmpPos.y + paddingY);
    let times = 0;
    let total = 0;
    const pl = points.length;
    const plast = points[pl - 1];
    // let itemtype: ItemType = tanks ? tanks.queryUseItemType(startTime) : ItemType.NORMAL;
    // processAnimationSpeed(itemtype);

    let lastPos: Vec2 = null;
    while (true) {
        lastTime += fpd.fpsTime;
        times += 1;
        // 預計長度
        const it = Math.floor(i / 3) + t;
        const l = Math.floor(points.length / 3);
        const scale = getFishMoveScale(scales, l, it);
        const length = speed * (fpd.fpsTime / 1e3) * scale;
        total += length;
        let delta = DELTA_TIME;
        let len: number = 0;

        while (true) {
            t += delta;
            // 大於 1 移動 i
            if (t > 1) {
                i += 3;
                t %= 1;
            }
            lastPos = (i >= pl - 1) ? v2(plast) : pointOnCubicBezier(t, points[i], points[i + 1], points[i + 2], points[i + 3]);
            // 距離
            const l: number = Vec2.distance(pos, lastPos);

            const over = len + l > length;
            const allowable = !(delta > DELTA_TIME_TOLERANCE && Math.abs(length - len) > DISTANCE_TOLERANCE);

            if (over && !allowable) { // 超過預計長度 且 不在容許值內
                // 再 try 一次
                t -= delta;
                // 小於 0 移動 i
                if (roundDecimal(t, 8) < 0) {
                    i -= 3;
                    t = (t + 1) % 1;
                }
                // 切一半試試看
                delta /= 2;
            } else if (i >= pl - 1) {
                // 沒進 (over && allowable) 判斷的 t -= delta，i 沒有機會不會往下修正
                // i 又已經大於可走點的數量
                // 已經走完了
                done();

                return [i, t, lastTime, lastPos || pos, total, times];
                // return new FishPathData(PathType.BEZIER, lastTime, [], 0, 0, v2(0), );
            } else if (allowable) { // 在容許值內
                if (lastTime < now) {
                    pos = lastPos;
                    break;
                } else {
                    // 完成
                    return [i, t, lastTime, lastPos, total, times];
                }
            } else { // 未到容許值內，再找下一個長度
                delta /= 2;
                len += l;
                pos = lastPos;
            }
        }
    }
}

export function doFishLineMove(now: number, fpd: FishPathData, done: () => void): [number, number, number, Vec2, number, number] {

    const birthTime = fpd.birthTime;
    const lifecycle = fpd.lifecycle;
    const startPos = fpd.points[0];
    const endPos = fpd.points[fpd.points.length - 1];
    const percent = (now - birthTime) / (lifecycle); // 分母是總存活時間
    if (percent > 1) {
        done();
        return [0, 0, birthTime, endPos, 0, 0];
    }
    const lastPos = startPos.lerp(endPos, percent);
    return [0, 0, birthTime, lastPos, 0, 0];
}

export enum PathType {
    BEZIER,
    LINE,
    CUSTOM,
}
