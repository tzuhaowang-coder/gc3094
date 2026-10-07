
import { safeMul } from '../utils/Balance';
import { PathType } from '../utils/PathMove';

export function getPathType(pos: Vec2[]): PathType {
    if (pos.length !== 3) {
        return PathType.BEZIER;
    }

    const p0 = pos[0];
    const p1 = pos[1];
    const p2 = pos[2];

    const x = p1.x - p0.x === p2.x - p1.x;
    const y = p1.y - p0.y === p2.y - p1.y;
    return (x && y) ? PathType.BEZIER : PathType.LINE;
}

/* tslint:disable:variable-name */
export default class PathData {
    public Id: number;
    public Path: Vec2[];
    public Fishs: number[];
    public Distance: number;
    public FlipX: boolean;
    public FlipY: boolean;
    public MinSpeed: number;
    public MinLifetime: number;
    public MinEnterTime: number;
    public MinLeaveTime: number;
    public MaxSpeed: number;
    public MaxLifetime: number;
    public MaxEnterTime: number;
    public MaxLeaveTime: number;
    public Scales: [number, number][];
}
/* tslint:enable:variable-name */

function clone(data: PathData): PathData {
    const pd = new PathData();
    pd.Id = data.Id;
    pd.Path = data.Path ? data.Path.map(v => v2(v.x, v.y)) : [];
    pd.Fishs = data.Fishs;
    pd.Distance = data.Distance;
    pd.FlipX = data.FlipX;
    pd.FlipY = data.FlipY;
    pd.MinSpeed = data.MinSpeed;
    pd.MinLifetime = data.MinLifetime || 0;
    pd.MinEnterTime = data.MinEnterTime || 0;
    pd.MinLeaveTime = data.MinLeaveTime || 0;
    pd.MaxSpeed = data.MaxSpeed;
    pd.MaxLifetime = data.MaxLifetime || 0;
    pd.MaxEnterTime = data.MaxEnterTime || 0;
    pd.MaxLeaveTime = data.MaxLeaveTime || 0;
    pd.Scales = data.Scales ? data.Scales.map(([it, s]) => [it, s]) : [];
    return pd;
}

export function fixPathData(data: PathData) {
    if (!data) {
        return;
    }
    const d = clone(data);
    d.Scales = d.Scales.map(([it, s]) => [safeMul(it, 1e2), safeMul(s, 1e2)]);
    d.MinLifetime = safeMul(d.MinLifetime, 1e2);
    d.MinEnterTime = safeMul(d.MinEnterTime, 1e2);
    d.MinLeaveTime = safeMul(d.MinLeaveTime, 1e2);
    d.MaxLifetime = safeMul(d.MaxLifetime, 1e2);
    d.MaxEnterTime = safeMul(d.MaxEnterTime, 1e2);
    d.MaxLeaveTime = safeMul(d.MaxLeaveTime, 1e2);
    return d;
}

export function revertPathData(data: PathData) {
    if (!data) {
        return;
    }
    const d = clone(data);
    if (d.Scales) {
        d.Scales = d.Scales.map(([it, s]) => [safeMul(it, 1e-2), safeMul(s, 1e-2)]);
    } else {
        d.Scales = [];
    }
    d.MinLifetime = safeMul(d.MinLifetime || 0, 1e-2);
    d.MinEnterTime = safeMul(d.MinEnterTime || 0, 1e-2);
    d.MinLeaveTime = safeMul(d.MinLeaveTime || 0, 1e-2);
    d.MaxLifetime = safeMul(d.MaxLifetime || 0, 1e-2);
    d.MaxEnterTime = safeMul(d.MaxEnterTime || 0, 1e-2);
    d.MaxLeaveTime = safeMul(d.MaxLeaveTime || 0, 1e-2);
    return d;
}
