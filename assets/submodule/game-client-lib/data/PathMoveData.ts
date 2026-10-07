
import { PathType } from '../utils/PathMove';
import { calculateControlPoints } from '../utils/Utils';
import PathData, { getPathType } from './PathData';

export class FishPathData {
    constructor(
        public birthTime: number,
        /*
         * 貝茲控制點
         */
        public points: Vec2[],
        public speed: number,    // 速度
        public distance: number,
        public padding: Vec2,
        public lifecycle: number,
        public scales: [number, number][],
        public type: PathType = 0,
        public doCustomMove:Function = null,
    ) {
        this.position = points[0];
        // 將資料變成微秒
        // PathData 的資料是 8.4 * 100 = 840
        this.lifecycle = this.lifecycle * 10;
        this.lastTime = birthTime;
    }
    public position: Vec2;

    public lastTime: number;
    /**
    * 魚目前走到的貝茲控制點 index
    */
    public i: number = 0;
    // 目前時間
    public t: number = 0;

    public fpsTime: number = 0;
    public escape: boolean = false;
}

export function genFishPathData(pathData: PathData, birthTime: number, speed: number = 150, pathFlip: [boolean, boolean], padding: [number, number], lifetime: number, doCustomMove?: Function): FishPathData {

    if (doCustomMove) {
        return new FishPathData(birthTime, pathData.Path, speed, pathData.Distance, new Vec2(padding[0], padding[1]), lifetime, pathData.Scales, PathType.CUSTOM, doCustomMove);
    } else {
        const ps = flipPath(pathData.Path, pathFlip[0], pathFlip[1]);
        const points = calculateControlPoints(ps);
        const pathType = getPathType(pathData.Path);
        return new FishPathData(birthTime, points, speed, pathData.Distance, new Vec2(padding[0], padding[1]), lifetime, pathData.Scales, pathType);
    }
}

export function genFishPathData2(pathData: PathData, birthTime: number, speed: number = 150, pathFlip: [boolean, boolean], padding: [number, number], doCustomMove?: Function): FishPathData {
    let lifetime = doCustomMove ? 0 : pathData.Distance / speed * 1e2
    return genFishPathData(pathData, birthTime, speed, pathFlip, padding, lifetime, doCustomMove);
}

// 鏡像路徑
export function flipPath(pos: Vec2[], flipX: boolean, flipY: boolean): Vec2[] {

    const newPos: Vec2[] = [];
    pos.forEach((tmpPos: Vec2) => {

        const p: Vec2 = new Vec2();
        p.x = flipX ? tmpPos.x * -1 : tmpPos.x;
        p.y = flipY ? tmpPos.y * -1 : tmpPos.y;
        newPos.push(p);
    });

    return newPos;
}
