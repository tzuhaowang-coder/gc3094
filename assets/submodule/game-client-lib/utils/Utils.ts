import { BoxCollider2D, CircleCollider2D, Collider2D, Color, Component, director, EPhysics2DDrawFlags, find, game, Intersection2D, LabelOutline, macro, Mat4, Node, PhysicsSystem2D, PolygonCollider2D, Quat, Rect, Size, UIOpacity, UIRenderer, UITransform, v2, Vec2, Vec3 } from 'cc';
import { DEBUG } from 'cc/env';
import { getAuth, HOST } from '../ParamsGlobal';

// tslint:disable-next-line:no-console
export let log = DEBUG ? console.log.bind(console) : noop;

// tslint:disable-next-line:no-console
export let warn = DEBUG ? console.warn.bind(console) : noop;

// tslint:disable-next-line:no-console
export let error = DEBUG ? console.error.bind(console) : noop;

// server時間轉client時間 (時間差)
const SERVER_TIME_PRECISION = 1000000;
// if (!window.cc) {
//     // @ts-ignore
//     window.cc = {};
//     // @ts-ignore
//     window.DEBUG = true;
// }

export function serverTime2ClientTimeDiff(time: number, diffTime: number): number {
    return Number((time / SERVER_TIME_PRECISION).toFixed(0)) + diffTime;
}

// server時間跟client時間時間差
export function clientTimeDifferenceServerTime(clientTime: number, serverTime: number): number {
    return clientTime - serverTime2ClientTime(serverTime);
}

// server時間轉client時間
export function serverTime2ClientTime(time: number): number {
    return Number((time / SERVER_TIME_PRECISION).toFixed(0));
}

// server時間轉client時間
export function clientTime2ServerTime(time: number): number {
    return time * SERVER_TIME_PRECISION;
}

export function diffNowSec(time: number, decimal: number = 0): number {
    return Number(((time - Date.now()) / 1e3).toFixed(decimal));
}

/**
 * client時間秒數
 */
export function clientTimeSecend(time: number): number {
    return Number((time / 1000).toFixed(0));
}

export function replaceParamVal(oUrl: string, paramName: string, replaceWith: string): string {
    if (oUrl.indexOf('?') === -1) return oUrl + '?' + paramName + '=' + replaceWith;
    if (oUrl.indexOf('?' + paramName + '=') === -1 && oUrl.indexOf('&' + paramName + '=') === -1) return oUrl + '&' + paramName + '=' + replaceWith;

    const re = new RegExp('(' + paramName + '=)([^&]*)', 'gi');
    return oUrl.replace(re, paramName + '=' + replaceWith);
}
// /**
//  * 伺服的時間(奈秒) 轉 回本地時間(毫秒)
//  * 並同步 時差 與 PING值
//  * @param sTime
//  */
// function tran2cTime(sTime: number, point: number = 0) {
//     return ((sTime + (this.standardTime * 1000000) - (this.ping * 1000000)) / 1000000).toFixed(point).toNumber()
// }
//
// /**
//  * 回本地時間(毫秒) 轉 伺服的時間(奈秒)
//  * 並同步 時差 與 PING值
//  * @param cTime
//  */
// function tran2sTime(cTime: number, point: number = 0) {
//     return (cTime - (this.standardTime) - (this.ping)) * 1000000
// }

/**
 * 預載場景
 * (底層抄來的 engine/cocos2d/core/CCDirector.js)
 * */
// export function preloadScene(sceneName: string, progressCallback: (completedCount: number, totalCount: number, item: any) => void, completeCallback: Function | null) {
//     const director: any = director;

//     const info = this.getSceneUuid(sceneName);
//     if (info) {
//         director.emit(Director.EVENT_BEFORE_SCENE_LOADING, sceneName);
//         loader.load({ uuid: info.uuid, type: 'uuid' }, progressCallback, (error, asset) => {
//             if (error) {
//                 // errorID(1210, sceneName, error.message);

//             }
//             if (completeCallback) {
//                 completeCallback(error, asset);
//             }
//         });
//     } else {
//         const error = 'Can not preload the scene "' + sceneName + '" because it is not in the build settings.';
//         completeCallback(new Error(error));
//         // tslint:disable-next-line:no-console
//         console.error('preloadScene: ' + error);
//     }
// }

// export function getSceneUuid(sceneName: string): any {
//     const director: any = director;
//     return director._getSceneUuid(sceneName);

// }

/**
 * converts degrees to radians
 * @param {Number} rotation
 * @return {Number}
 * @method degreesToRadians
 */
export function degreesToRadians(rotation: number): number {
    return rotation * macro.RAD;
}
/**
 * converts radians to degrees
 * @param {Number} rotation
 * @return {Number}
 * @method radiansToDegrees
 */
export function radiansToDegrees(rotation: number): number {
    return rotation * macro.DEG;
}

/*
 * !#en smallest such that 1.0+FLT_EPSILON != 1.0.
 * !#zh 它是满足 1.0+FLT_EPSILON != 1.0 的最小的正数。
 * @property POINT_EPSILON
 * @type {Number}
 * @function
 */
const POINT_EPSILON = parseFloat('1.192092896e-07F');

export function nodeActive(active: boolean) {
    return nodeProperty<Node, 'active'>('active', active);
}

export function getOpacityComponent(node: Node) {
    const render = node.getComponent(UIRenderer);
    if (render) {
        return render;
    }
    const uio = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
    return uio;
}

/**
 * 以 UIOpacity 優先
 * 如果有 UIOpacity 就不使用 UIRenderer
 * @param node
 * @returns
 */
export function getNodeOpacity(node: Node): number {
    const render = node.getComponent(UIRenderer);
    const uio = node.getComponent(UIOpacity);
    if (render && uio) {
        return uio.opacity;
    } else if (uio) {
        return uio.opacity;
    } else if (render) {
        return render.color.a;
    } else {
        // debugger;
        return 0;
    }
}

/**
 * 以 UIOpacity 優先
 * 如果有 UIOpacity 就不使用 UIRenderer
 * @param node
 * @returns
 */
export function setNodeOpacity(node: Node, opacity: number) {
    const uio = node.getComponent(UIOpacity);
    const render = node.getComponent(UIRenderer);
    if (uio && render) {
        const c = render.color;
        render.color = new Color(c.r, c.g, c.b, 255);
        uio.opacity = opacity;
    } else if (uio) {
        uio.opacity = opacity;
    } else if (render) {
        const c = render.color;
        render.color = new Color(c.r, c.g, c.b, opacity);
    } else {
        node.addComponent(UIOpacity).opacity = opacity;
    }
}

export function setNodeOpacityDeep(node: Node, opacity: number) {
    setNodeOpacity(node, opacity);
    node.walk(nodeOpacity(opacity));
}
export function nodeOpacityDeep(opacity: number) {
    return (node: Node) => {
        return setNodeOpacityDeep(node, opacity);
    };
}

export function nodeOpacity(opacity: number) {
    return (node: Node) => {
        return setNodeOpacity(node, opacity);
    };
}

export function getNodeColor(node: Node): Color | null {
    const render = node.getComponent(UIRenderer);
    if (render) {
        return render.color.clone();
    } else {
        return null;
    }

}

export function setNodeColor(node: Node, colorOrR: Color | number, g: number = 255, b: number = 255) {
    const render = node.getComponent(UIRenderer);
    if (render) {
        let color: Color;
        if (colorOrR instanceof Color) {
            const c = colorOrR;
            color = new Color(c.r, c.g, c.b, render.color.a);
        } else {
            color = new Color(colorOrR, g, b, render.color.a);
        }
        render.color = color;
    }
}

export function nodeColor(colorOrR: Color | number, g: number = 255, b: number = 255) {
    return (node: Node) => {
        return setNodeColor(node, colorOrR, g, b);
    };
}

export function lazy<T extends (...args: any[]) => any>(fn: T) {
    return (...args: Parameters<T>) => (): ReturnType<T> => fn(...args);
}

export function nodeProperty<T, K extends keyof T>(property: K, value: T[K]) {
    return (node: T) => {
        if (node && node[property] !== value) {
            node[property] = value;
        }
    };
}
export function copyProperty<T>(source: T, target: T, properties: (keyof T)[]) {
    properties.forEach((key) => {
        target[key] = source[key];
    });
}

export function copyLabelProperty(source: Node, target: Node) {

    copyNodeXY(source, target, true);
    copyNodeColor(source, target, true);
    if (source.scale.x !== 1) {
        target.scale = source.scale.clone();
    }
    // const sl = source.getComponent(Label);
    // const tl = target.getComponent(Label);
    // if (sl && tl) {
    //     copyProperty(sl, tl, ['overflow']);
    // }
    const slo = source.getComponent(LabelOutline);
    const tlo = target.getComponent(LabelOutline);
    if (slo && tlo) {
        copyProperty(slo, tlo, ['color', 'width']);
    }
}

export function copyNodeProperty(source: Node, target: Node, properties: (keyof Node)[] = []) {
    copyProperty(source, target, properties);
}

export function copyNodeWidth(source: Node, target: Node) {
    setNodeWidth(source, getNodeWidth(target));
}
export function copyNodeXY(source: Node, target: Node, escapeZero: boolean = false) {
    const pos = source.position;
    if (escapeZero && (pos.x === 0 && pos.y === 0)) {
        return;
    }
    setNodePosition(target, pos.x, pos.y);
}
export function copyNodeColor(source: Node, target: Node, escapeZero: boolean = false) {
    const color = getNodeColor(source);
    if (!color) {
        warn('copyNodeColor');
        return;
    }
    if (escapeZero && (color.r === 255 && color.g === 255 && color.b === 255)) {
        return;
    }
    setNodeColor(target, color);
}

/**
 * 設定座標
 * @description 取得 refNode 世界座標後轉為 node 的相對座標
 * @param setNode 將被設定的座標
 * @param refNode 參考的節點
 */
export function setPosition(setNode: Node, refNode: Node) {
    if (setNode.parent && refNode.parent) {
        const pos = getPosition(refNode, setNode.parent);
        setNode.setPosition(pos);
    } else {
        // TODO:
    }
}

/**
 * 取得座標
 * @description 取得 refNode 世界座標後轉為 node 的相對座標
 */
export function getPosition(node: Node, parentNode: Node) {
    const worldPos = getWorldPosition(node);
    const uit = parentNode.getComponent(UITransform) || parentNode.addComponent(UITransform);
    return uit.convertToNodeSpaceAR(worldPos);
}

/**
 * 待驗證
 * @param parent
 * @param pos
 * @param parentNode
 * @returns
 */
export function getPosition2(parent: Node, pos: Vec2, parentNode: Node) {
    const worldPos = getWorldPosition(parent, pos);
    const uit = parentNode.getComponent(UITransform) || parentNode.addComponent(UITransform);
    return uit.convertToNodeSpaceAR(worldPos);
}

export function getWorldPosition(node: Node, pos?: Vec2) {
    if (pos) {
        const uit = node.parent.getComponent(UITransform) || node.addComponent(UITransform);
        const p = node.getPosition().add(vecXToVec3(pos));
        return uit.convertToWorldSpaceAR(p);
    } else {
        return node.getWorldPosition();
    }
}

export function getWorldAngle(node: Node):number {
    const mat4 = new Mat4();
    const q = new Quat();
    node.getWorldMatrix(mat4).getRotation(q);
    const v3 = new Vec3();
    q.getEulerAngles(v3);
    let angle = v3.z;
    if (v3.x === 180) {
        if (v3.z > 0) {
            angle = 180 - v3.z;
        } else {
            angle = -180 - (v3.z);
        }
    }
    return angle;
}

export function polygonColliderToWorldPoints(collier: PolygonCollider2D): Vec2[] {
    // @ts-ignore
    const world = collier.world;
    return world.points;
}

export function randomInPolygonCollider(collider: PolygonCollider2D, [w, h]: [number, number] = [0, 0]): Vec2 {

    const points = collider.points.map((p) => {
        return new Vec2(
            p.x > 0 ? biggerThen(0, p.x - w) : lowerThen(0, p.x + w),
            p.y > 0 ? biggerThen(0, p.y - h) : lowerThen(0, p.y + h),
        );
    });

    const box = points.reduce(
        (o, p) => {
            if (p.x < o.xMin) {
                o.xMin = p.x;
            }
            if (p.x > o.xMax) {
                o.xMax = p.x;
            }
            if (p.y < o.yMin) {
                o.yMin = p.y;
            }
            if (p.y > o.yMax) {
                o.yMax = p.y;
            }
            return o;
        },
        {
            xMin: Infinity,
            xMax: -Infinity,
            yMin: Infinity,
            yMax: -Infinity,
        },
    );

    const vec2: Vec2 = new Vec2(
        random(box.xMin, box.xMax),
        random(box.yMin, box.yMax),
    );

    while (!Intersection2D.pointInPolygon(vec2, points)) {
        vec2.x = random(box.xMin, box.xMax);
        vec2.y = random(box.yMin, box.yMax);
    }

    return vec2;
}

export function mathMax(nums: number[]) {
    return Math.max(...nums);
}

export function mathMin(nums: number[]) {
    return Math.min(...nums);
}

export function colliderBox(collider: Collider2D): Size {
    if (collider instanceof CircleCollider2D) {
        // collider.offset
        return new Size(collider.radius, collider.radius);
    } else if (collider instanceof PolygonCollider2D) {
        // collider.offset
        const xs = collider.points.map(p => p.x);
        const ys = collider.points.map(p => p.y);
        return new Size(mathMax(xs) - mathMin(xs), mathMax(ys) - mathMin(ys));
    } else if (collider instanceof BoxCollider2D) {
        // collider.offset
        return collider.size;
    } else {
        warn('Can\'t get collider', collider);
    }
}

export function randomInCollider(collider: Collider2D, [w, h]: [number, number] = [0, 0]): Vec2 {
    if (collider instanceof PolygonCollider2D) {
        return randomInPolygonCollider(collider, [w, h]);
    } else {
        throw new Error('not implement');
    }
}

/**
 * 左上, 右上, 右下, 左下
 * 0 --> 1
 * |     |
 * 3 <-- 2
 * @param rect
 * @returns
 */
export function rectToVec2s(rect: Rect, shift: Vec2 = new Vec2()): Vec2[] {
    return [
        new Vec2(rect.xMin + shift.x, rect.yMax + shift.y), // 左上
        new Vec2(rect.xMax + shift.x, rect.yMax + shift.y), // 右上
        new Vec2(rect.xMax + shift.x, rect.yMin + shift.y), // 右下
        new Vec2(rect.xMin + shift.x, rect.yMin + shift.y), // 左下
    ];
}

export function boxColliderToWorldPoints(collier: BoxCollider2D): Vec2[] {
    // @ts-ignore
    const world = collier.world;
    return world.points;
}

export function circleColliderToWorldCircle(collier: CircleCollider2D): { position: Vec2, radius: number } {
    // @ts-ignore
    const world = collier.world;
    return {
        position: world.position,
        radius: world.radius,
    };
}

export type worldX = Vec2[] | { position: Vec2, radius: number };

export function colliderToWorldX(collider: Collider2D) {
    if (collider instanceof CircleCollider2D) {
        return circleColliderToWorldCircle(collider);
    } else if (collider instanceof PolygonCollider2D) {
        return polygonColliderToWorldPoints(collider);
    } else if (collider instanceof BoxCollider2D) {
        return boxColliderToWorldPoints(collider);
    } else {
        warn('Can\'t get collider', collider);
    }
}

export function isCollision(aa: Vec2[] | { position: Vec2, radius: number }, bb: Vec2[] | { position: Vec2, radius: number }) {
    // @ts-ignore
    const ll = (aa.radius ? '1' : '0') + (bb.radius ? '1' : '0');
    let tag = false;
    switch (ll) {
    case '11':
            // @ts-ignore
        tag = Intersection.circleCircle(aa, bb);
        break;
    case '10':
            // @ts-ignore
        tag = Intersection.polygonCircle(bb, aa);
        break;
    case '01':
            // @ts-ignore
        tag = Intersection.polygonCircle(aa, bb);
        break;
    case '00':
            // @ts-ignore
        tag = Intersection.polygonPolygon(aa, bb);
        break;
    }
    return tag;
}

export function downloadBlob(blob, name) {
    this.downloadUrl(URL.createObjectURL(blob), name);
}
// 下載文字
export function downloadText(text, name, type) {
    this.downloadBlob(new Blob([text], { type }), name);
}
// 下載圖片
export function downloadUrl(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();

    setTimeout(
        () => {  // fixes firefox html removal bug
            window.URL.revokeObjectURL(a.href);
            a.remove();
        },
        500,
    );
}

export function dataURIToBlob(dataURI) {
    const binStr = atob(dataURI.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);

    for (let i = 0; i < len; i += 1) {
        arr[i] = binStr.charCodeAt(i);
    }

    return new Blob([arr]);
}

export function onlyUnique<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
}

export type Nested<T> = T | (T | T[] | T[][])[];

export function flattenDeep<T>(nestedArray: Nested<T>): T[] {
    return [].concat(nestedArray).reduce(
        (accu: T[], val: T | T[] | T[][]) => {
            return Array.isArray(val) ? accu.concat(flattenDeep(val)) : accu.concat(val);
        },
        [],
    );
}

/**
 *
 * @param l 左邊界
 * @param r 右邊界
 * @example
 * ```
 * l=1, r=3 // [1, 2, 3]
 * l=1, r=1 // [1]
 * l=3, r=1 // [3, 2, 1]
 *
 * l=-1,r=1 // [-1, 0, 1]
 * l=1      // [0]
 * l=3      // [0, 1, 2]
 * ```
 */
export function range2(l: number, r?: number): number[] {
    if (isNone(r)) {
        return range(l);
    }
    const len = Math.abs(l - r) + 1;
    const min = Math.min(l, r);
    const arr = range(len).map(i => i + min);
    if (l > r) {
        return arr.reverse();
    }
    return arr;
}

export function range(num: number): number[] {
    if (num <= 0) {
        return [];
    }
    return Array.apply(null, Array(num)).map((_, i) => i);
}
export function random(from: number, to?: number): number {
    if (!to) {
        to = from - 1;
        from = 0;
    }
    return Math.floor((Math.random() * (to - from + 1)) + from);
}

export function randomItem<T>(items: T[]): T {
    const idx = random(items.length);
    return items[idx];
}

export function toObjectReducer<T>(keyOrFn: (((obj: T) => string) | string), value?: string) {
    // @ts-ignore
    const key: string = isFunction(keyOrFn) ? '' : keyOrFn;
    return (obj, item) => {
        let k = key;
        if (!k) {
            // @ts-ignore
            k = keyOrFn(item);
        } else {
            k = item[key];
        }
        obj[k] = value ? item[value] : item;
        return obj;
    };
}

export function toObjectAccumulateReducer<T, K extends keyof T>(keyOrFn: (((obj: T) => string) | string), valueKey?: K) {
    // @ts-ignore
    const key: string = isFunction(keyOrFn) ? '' : keyOrFn;
    return (obj: { [s: string]: (T[K] | T)[] }, item: T) => {
        let k = key;
        if (!k) {
            // @ts-ignore
            k = keyOrFn(item);
        } else {
            k = item[key];
        }
        if (!obj[k]) {
            obj[k] = [];
        }
        let val: T[K] | T = item;
        if (valueKey) {
            val = item[valueKey];
        }
        obj[k].push(val);
        return obj;
    };
}

export function sumReducer(accu: number, a: number) {
    accu += a;
    return accu;
}

export function toNaturalNumber(idx: number): number {
    return idx >= 0 ? idx : 0;
}

export function identity<T>(value: T): T {
    return value;
}

export function noop() {
    // do nothing
}

export function lowerThen(max: number, num: number): number {
    return num >= max ? max : num;
}

export function biggerThen(min: number, num: number): number {
    return num <= min ? min : num;
}

export function arraySplice<T>(array: T[], any: T) {
    const idx = array.indexOf(any);
    if (idx !== -1) {
        array.splice(idx, 1);
    }
}

export function loop2ArrayWithMaxLength<T, K, Y, Z>(arr1: T[], arr2: K[], callback: (a: T, b: K, index: number, opts?: Y) => Z, opts?: Y): Z[] {
    const len1 = arr1.length;
    const len2 = arr2.length;
    const ret = [];
    for (let i = 0; i < len1 || i < len2; i += 1) {
        const a = arr1[i];
        const b = arr2[i];
        ret.push(callback(a, b, i, opts));
    }
    return ret;
}

export function loop2ArrayWithMinLength<T, K, Y, Z>(arr1: T[], arr2: K[], callback: (a: T, b: K, index: number, opts?: Y) => Z, opts?: Y): Z[] {
    const len1 = arr1.length;
    const len2 = arr2.length;
    const ret = [];
    for (let i = 0; i < len1 && i < len2; i += 1) {
        const a = arr1[i];
        const b = arr2[i];
        ret.push(callback(a, b, i, opts));
    }
    return ret;
}

const catchObj: Map<string, any> = new Map();

function setCacheObj(key: string, any: any) {
    catchObj[key] = any;
}
function getCacheObj<T extends Component>(key: string): T {
    return catchObj[key];
}
export function cacheObjContainskey(key: string): boolean {
    return catchObj.has(key);
}

export function ccFindCreator<T extends Component>(path: string, component: string) {
    return (): T => {
        const key = path + component;
        if (cacheObjContainskey(key)) {
            return getCacheObj(key);
        }
        const node = find(path);
        if (node) {
            const comp = node.getComponent(component);
            if (comp) {
                setCacheObj(key, comp);
                // @ts-ignore
                return comp;
            }
            return null;
        }
        return null;
    };
}

export function isFunction(fn: any) {
    return typeof fn === 'function';
}

export function isUndefined(input: any): boolean {
    return (typeof input === 'undefined');
}

export function isNone(input: any): boolean {
    return (typeof input === 'undefined') || (input === null);
}

export function isString(input: any) {
    return typeof input === 'string';
}

/**
 * 取得注單的網址 (暫時的)
 * @param {string} url
 * @returns {string}
 */
export function getHistoryUrl(url: string): string {
    url = window.location.host;
    let newUrl: string = '';
    const hosts = url.split('.');
    if (hosts.length > 2) {
        hosts.shift();
    }
    hosts.unshift('https://record');

    hosts.forEach((part: string) => {
        newUrl = newUrl + part + '.';
    });
    newUrl = newUrl.substring(0, newUrl.length - 1);
    return newUrl;
}

function killLast(str: string, last: string = '0') {
    const strLast = str[str.length - 1];
    if (strLast === last) {
        return str.substring(0, str.length - 1);
    } else {
        return str;
    }
}

/**
 * 洗牌
 */
export function shuffle<T>(arr: T[]): T[] {
    let i: number;
    let j: number;
    let temp: T;
    for (i = arr.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

// 計算n皆貝茲曲線
export function pointOnCubicBezier(t: number, ...points: Vec2[]): Vec2 {
    try {
        const result: Vec2 = new Vec2();
        const n: number = points.length - 1;
        let rx: number = 0;
        let ry: number = 0;

        for (let i: number = 0; i < points.length; i += 1) {
            let px: number = n;
            if (i === 0 || i === n) {
                px = 1;
            }
            const dd0: number = Math.pow(1 - t, n - i);
            const dd1: number = Math.pow(t, i);
            rx += px * dd0 * dd1 * points[i].x;
            ry += px * dd0 * dd1 * points[i].y;
        }

        result.x = rx;
        result.y = ry;

        return result;
    } catch (error) {
        log(t, points);
    }
}

export function calculateControlPoints(pos: Vec2[]) {
    const ctrlPoints: Vec2[][] = computeControlPoints(pos);
    return flattenDeep(pos.map((vec2, i) => {
        if (i < pos.length - 1) {
            return [vec2, ctrlPoints[0][i], ctrlPoints[1][i]];
        } else {
            return [vec2];
        }
    }));
}

// 計算控制點
export function computeControlPoints(pos: Vec2[]): Vec2[][] {
    // let p1 = new Array();
    // let p2 = new Array();
    const rtn: Vec2[][] = [];
    rtn[0] = [];
    rtn[1] = [];

    const n = pos.length - 1;

    /*rhs vector*/
    const a: number[] = [];
    const b: number[] = [];
    const c: number[] = [];
    const r: Vec2[] = [];

    /*left most segment*/
    a[0] = 0;
    b[0] = 2;
    c[0] = 1;
    r[0] = new Vec2();
    r[0].x = pos[0].x + 2 * pos[1].x;
    r[0].y = pos[0].y + 2 * pos[1].y;

    /*internal segments*/
    for (let i: number = 1; i < n - 1; i += 1) {
        a[i] = 1;
        b[i] = 4;
        c[i] = 1;
        r[i] = new Vec2();
        r[i].x = 4 * pos[i].x + 2 * pos[i + 1].x;
        r[i].y = 4 * pos[i].y + 2 * pos[i + 1].y;
    }

    /*right segment*/
    a[n - 1] = 2;
    b[n - 1] = 7;
    c[n - 1] = 0;
    r[n - 1] = new Vec2();
    r[n - 1].x = 8 * pos[n - 1].x + pos[n].x;
    r[n - 1].y = 8 * pos[n - 1].y + pos[n].y;

    /*solves Ax=b with the Thomas algorithm (from Wikipedia)*/
    for (let i: number = 1; i < n; i += 1) {
        const m = a[i] / b[i - 1];
        b[i] = b[i] - m * c[i - 1];
        r[i].x = r[i].x - m * r[i - 1].x;
        r[i].y = r[i].y - m * r[i - 1].y;
    }

    rtn[0][n - 1] = new Vec2();
    rtn[0][n - 1].x = r[n - 1].x / b[n - 1];
    rtn[0][n - 1].y = r[n - 1].y / b[n - 1];
    for (let i: number = n - 2; i >= 0; i -= 1) {
        rtn[0][i] = new Vec2();
        rtn[0][i].x = (r[i].x - c[i] * rtn[0][i + 1].x) / b[i];
        rtn[0][i].y = (r[i].y - c[i] * rtn[0][i + 1].y) / b[i];
    }

    /*we have p1, now compute p2*/
    for (let i: number = 0; i < n - 1; i += 1) {
        rtn[1][i] = new Vec2();
        rtn[1][i].x = 2 * pos[i + 1].x - rtn[0][i + 1].x;
        rtn[1][i].y = 2 * pos[i + 1].y - rtn[0][i + 1].y;
    }

    rtn[1][n - 1] = new Vec2;
    rtn[1][n - 1].x = 0.5 * (pos[n].x + rtn[0][n - 1].x);
    rtn[1][n - 1].y = 0.5 * (pos[n].y + rtn[0][n - 1].y);

    return rtn;
}

export function stringToUint8Array(str: string): Uint8Array {
    const arr = [];
    for (let i = 0, j = str.length; i < j; i += 1) {
        arr.push(str.charCodeAt(i));
    }

    const tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}

export function uint8ArrayToString(fileData: Uint8Array): string {
    let dataString = '';
    for (let i = 0; i < fileData.length; i += 1) {
        dataString += String.fromCharCode(fileData[i]);
    }

    return dataString;
}

/**
 * 桌机上 work
 * 在手机上不 work
 * 再研究
 */
export function ccGameRemovePause() {
    // 让 cosos 用 setTimeout
    game.setFrameRate(59);
    // 不做暂停
    game.pause = () => { };
    game.resume = () => { };
}

export function setFrameRate(frameRate:number) {
    game.frameRate = frameRate;
}

/**
 * 控制遊戲整體速度
 */
let directorTickFunc:Function = null;
let tickRate:number = 1;
export function setTickSpeed(rate:number) {
    tickRate = rate;
    if (!directorTickFunc) {
        directorTickFunc = director.tick;
        director.tick = (dt) => {
            dt *= tickRate;
            directorTickFunc.call(director, dt);
        };
    }
}

export function colliderDebugDraw(able: boolean = true) {
    let flag: EPhysics2DDrawFlags;
    flag = (able) ? EPhysics2DDrawFlags.Aabb : EPhysics2DDrawFlags.None;
    PhysicsSystem2D.instance.debugDrawFlags = flag;
    // EPhysics2DDrawFlags.Pair |
    // EPhysics2DDrawFlags.CenterOfMass |
    // EPhysics2DDrawFlags.Joint |
    // EPhysics2DDrawFlags.Shape;
}
export function isVIVO() {
    if (window.navigator.userAgent.toLowerCase().indexOf('vivo') !== -1) {
        log('vivo');
        return true;
    } else {
        log('not vivo');
        return false;
    }
}

export function debugDeltaScale(speed: number) {
    // @ts-ignore
    const old = Director.prototype.calculateDeltaTime;
    // @ts-ignore
    Director.prototype.calculateDeltaTime = function (now) {
        old.call(this, now);
        this._deltaTime *= speed;
    };
}

export function padStart(str: string, maxLength: number, fillString: string): string {
    maxLength = Math.floor(maxLength) || 0;
    if (maxLength < str.length) return String(str);

    fillString = fillString ? String(fillString) : ' ';

    let pad = '';
    const len = maxLength - str.length;
    let i = 0;
    while (pad.length < len) {
        if (!fillString[i]) {
            i = 0;
        }
        pad += fillString[i];
        i += 1;
    }

    return pad + String(str).slice(0);
}

export function padEnd(str: string, maxLength: number, fillString: string): string {
    maxLength = Math.floor(maxLength) || 0;
    if (maxLength < str.length) return String(str);

    fillString = fillString ? String(fillString) : ' ';

    let pad = '';
    const len = maxLength - str.length;
    let i = 0;
    while (pad.length < len) {
        if (!fillString[i]) {
            i = 0;
        }
        pad += fillString[i];
        i += 1;
    }

    return String(str).slice(0) + pad;
}

export function getUuid() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxx'.replace(
        /[xy]/g,
        // tslint:disable-next-line:ter-prefer-arrow-callback
        function (c) {
            // tslint:disable-next-line:one-variable-per-declaration
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        },
    );
}

export function getFetch(url) {
    // Default options are marked with *
    return fetch(url, {
        credentials: 'same-origin', // include, same-origin, *omit
        headers: {
            'content-type': 'application/json',
        },
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, cors, *same-origin
        redirect: 'follow', // manual, *follow, error
    });
}

export function fetchPing(args: string) {
    const host = HOST;
    if (!host) {
        return;
    }
    const auth = getAuth();
    if (!auth) {
        return;
    }
    let uuid = '';
    const tokens = auth.split('.');
    if (tokens.length === 3 &&
        tokens[1].length >= 56 &&
        tokens[2].length >= 8) {
        uuid = tokens[1].slice(40, 56) + tokens[2].slice(0, 8);
    } else {
        uuid = getUuid();
    }

    const ur1 = `https://asia-east2-prod-game-226507.cloudfunctions.net/report?host=${host}&uuid=${uuid}` + (args ? `&${args}` : '');
    log('ping', ur1);
    try {
        getFetch(ur1);
    } catch (e) {

    }
}

export function vecXToVec2(vec: Vec2 | Vec3): Vec2 {
    return new Vec2(vec.x, vec.y);
}

export function vecXToVec3(vec: Vec2 | Vec3): Vec3 {
    const z = (vec instanceof Vec3) ? vec.z : 0;
    return new Vec3(vec.x, vec.y, z);
}

export function vec3ToVec2(vec3: Vec3): Vec2 {
    return v2(vec3.x, vec3.y);
}

export function nodePath(node: Node): string {
    const arr = [];
    do {
        arr.push(node.name);
        node = node.parent;
    } while (node);
    return arr.reverse().join('/');
}

export function setNodePosition(node: Node, x: number, y: number) {
    return node.setPosition(x, y);
}

export function getNodeAnchor(node: Node) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    return { anchorX: uit.anchorX , anchorY:uit.anchorY };
}

export function setNodeAnchor(node: Node, anchorX: number, anchorY: number) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    uit.anchorX = anchorX;
    uit.anchorY = anchorY;
}

export function setNodeAnchorX(node: Node, anchorX: number) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    uit.anchorX = anchorX;
}

export function setNodeAnchorY(node: Node, anchorY: number) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    uit.anchorY = anchorY;
}

export function setNodeScaleX(node: Node, x: number) {
    const s = node.getScale();
    return node.setScale(x, s.y, s.z);
}

export function setNodeScaleY(node: Node, y: number) {
    const s = node.getScale();
    return node.setScale(s.x, y, s.z);
}

export function nodeScale(scale: number) {
    return (node: Node) => {
        setNodeScale(node, scale);
    };
}

export function setNodeScale(node: Node, scaleOrX: number, y?: number) {
    if (isNone(y)) {
        y = scaleOrX;
    }
    if (DEBUG) {
        if (isNaN(scaleOrX)) {
            debugger;
        }
    }
    return node.setScale(scaleOrX, y, 1);
}

export function setNodeWidth(node: Node, width: number) {
    return nodeWidth(width)(node);
}

export function setNodeHeight(node: Node, height: number) {
    return nodeHeight(height)(node);
}

export function setNodeContentSize(node: Node, width: number, height: number) {
    return nodeContentSize(new Size(width, height))(node);
}

export function getNodeWidth(node: Node) {
    const uit = node.getComponent(UITransform);
    if (uit) {
        return uit.width;
    }
    return 0;
}

export function getNodeHeight(node: Node) {
    const uit = node.getComponent(UITransform);
    if (uit) {
        return uit.height;
    }
    return 0;
}

export function getNodeContentSize(node: Node) {
    const uit = node.getComponent(UITransform);
    if (uit) {
        return uit.contentSize.clone();
    }
    return;
}

export function nodeWidth(width: number) {
    return nodeUITransform({ width });
}

export function nodeHeight(height: number) {
    return nodeUITransform({ height });
}

export function nodeContentSize(size: Size) {
    return nodeUITransform({ size });
}
export function getBoundingBox(node: Node): Rect {
    const uit = node.getComponent(UITransform);
    if (uit) {
        return uit.getBoundingBox();
    }
}

export function nodeUITransform({ size, width, height }: { size?: Size; width?: number; height?: number; } = {}) {
    return (node: Node) => {
        const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
        if (uit) {
            if (size) {
                uit.setContentSize(size);
            }
            if (!isNone(width)) {
                uit.width = width;
            }
            if (!isNone(height)) {
                uit.height = height;
            }
        }
    };
}

export function setNodeX(node: Node, x: number) {
    return node.setPosition(x, node.position.y);
}

export function setNodeY(node: Node, y: number) {
    return node.setPosition(node.position.x, y);
}

export function nodeY(y: number) {
    return (node: Node) => {
        setNodeY(node, y);
    };
}

export function nodeX(x: number) {
    return (node: Node) => {
        setNodeX(node, x);
    };
}

export function convertToNodeSpaceAR(node: Node, worldPos: Vec2 | Vec3) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    return uit.convertToNodeSpaceAR(vecXToVec3(worldPos));
}

export function convertToNodeSpaceARVec2(node: Node, worldPos: Vec2 | Vec3) {
    const uit = node.getComponent(UITransform) || node.addComponent(UITransform);
    return vecXToVec2(uit.convertToNodeSpaceAR(vecXToVec3(worldPos)));
}

export let NODE_LAYER_UI_2D = 1 << 25;

export let INFINITY_MARK = '∞';
