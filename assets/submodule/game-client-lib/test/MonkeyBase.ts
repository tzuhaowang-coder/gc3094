import { DEBUG } from 'cc/env';
import { globalDebugNNN } from '../LibGlobal';
import { Observer } from '../protobuf/GrpcWarp';
import { Message } from '../protobuf/ProtobufWarp';
import { IComm } from '../script/CommunicationBase';
import { log, random, randomItem } from '../utils/Utils';

export type MonkeyRequest<T extends IComm = IComm> = (comm: T, ...m: any[]) => [Function, ...any[]];

export type MonkeyObserverPlaceholder = 'MonkeyObserverPlaceholder';
export let MONKEY_OBSERVER_PLACEHOLDER:MonkeyObserverPlaceholder = 'MonkeyObserverPlaceholder';

export type MonkeyNextFilter = (key: string, message: Message) => boolean;

function defaultNextFilter() {
    return false;
}

const commRequestMap: Map<Function, string> = new Map();
const commRequestIdx: Map<Function, number> = new Map();
let loaded: boolean = false;
let mindex = 0;

function getNextIndex() {
    return mindex += 1;
}

function logMap(r: any) {
    if (r && r.toObject) {
        return r.toObject();
    }
    if (typeof r === 'function') {
        return commRequestMap.get(r);
    }
    if (Array.isArray(r)) {
        return r.map(logMap);
    }
    return r;
}

// function logArr(r: any)  {
//     if (Array.isArray(r)) {
//         return r.map(logMap);
//     }
//     return logMap(r);
// }

/**
 *
 * @param requests
 * @param nextFilter filter 回傳 true，代表進入 observer next，目的是過濾掉一定成功的 response
 * @returns request 預期成功，monkeyRequest 預期失敗
 */
export function monkeyRequestGenerator(requests: MonkeyRequest[] = [], nextFilter: MonkeyNextFilter = defaultNextFilter) {
    return {
            // 預期成功
        request: monkeyRequestGenerator2([]),
            // 預期失敗
        failRequest: monkeyRequestGenerator2([], nextFilter, true),
            // 預期失敗
        monkeyRequest: monkeyRequestGenerator2(requests, nextFilter, true),
    };
}

function monkeyRequestGenerator2(requests: MonkeyRequest[] = [], nextFilter: MonkeyNextFilter = defaultNextFilter, expectFail: boolean = false) {
    return function (comm: IComm, fn?: Function, ...m: any[]): Promise<any>  {
        if (!loaded && requests.length) {
            loaded = true;
            requests.forEach((r, idx) => {
                const r0 = r.apply(null, [comm])[0];
                for (const key in comm) {
                    // @ts-ignore
                    const f: Function = comm[key];
                    if (f === r0) {
                        commRequestMap.set(f, key);
                        commRequestIdx.set(f, idx);
                        return;
                    }
                }
            });
        }
        let request: [Function, ...any[]];
        if (requests.length) {
            const arr = [comm].concat(m);
            const mr = fn ? requests[commRequestIdx.get(fn)] : randomItem(requests);
            request = mr.apply(null, arr);
            if (request.length <= 1) {
                return;
            }
        } else {
            request = [fn, ...m];
        }
        const cf = request[0];
        if (!cf) {
            return;
        }
        const i = getNextIndex();
        let str = commRequestMap.get(cf);
        return new Promise((resolve, reject) => {
            const ob: Observer<any> = {
                next: (val: [string, Message]) => {
                    // @ts-ignore
                    const result: Result = val[1] && val[1].getResult && val[1].getResult();
                    clearTimeout(timeoutId);
                    if (expectFail) { // 預期失敗
                        if (result && result.getCode() === 1) { // 預期失敗 且 結果成功
                            // 過濾掉一定會成功的
                            if (nextFilter(val[0], val[1])) {
                                mlog(i, request, val, []);
                                comm.streamObserver.next(val);
                                resolve(val[1]);
                            } else {
                                mlog(i, request, [], val);
                                comm.streamObserver.next(val);
                                reject(str + JSON.stringify(val[1].toObject()));
                            }
                        } else { // 預期失敗 且 結果失敗
                            mlog(i, request, val, []);
                            resolve(val[1]);
                        }
                    } else { // 預期成功
                        if (result && result.getCode() === 1) { // 成功
                            mlog(i, request, val);
                            comm.streamObserver.next(val);
                            resolve(val[1]);
                        } else { // 失敗
                            mlog(i, request, [], val);
                            reject(str + JSON.stringify(val[1].toObject()));
                        }
                    }
                },
                error: (err) => {
                    mlog(i, request, [], [err]);
                    reject(err);
                    clearTimeout(timeoutId);
                },
                complete: () => { },
            };
            mlog(i, request);

            if (!str) {
                for (const key in comm) {
                    // @ts-ignore
                    const f: Function = comm[key];
                    if (cf === f) {
                        commRequestMap.set(f, key);
                        str = key;
                        break;
                    }
                }
            }
            const f: Function = comm['_' + str] || cf;
            let arr = request.slice(1);
            const phi = arr.indexOf(MONKEY_OBSERVER_PLACEHOLDER);
            if (phi !== -1) {
                arr[phi] = ob;
            } else {
                arr = arr.concat(ob);
            }
            f.apply(comm, arr);

            const timeoutId = setTimeout(
                () => {
                    if (expectFail) {
                        mlog(i, request, ['timeout 1s'], []);
                        resolve('timeout 1s');
                    } else {
                        mlog(i, request, [], ['timeout 1s']);
                        reject('timeout 1s');
                    }
                },
                1e3,
            );
        });
    };
}

export function mbool() {
    return random(2) === 0;
}

const logs = [];
const logPrefix = 'monkeyRequest';

export function mlog(idx: number, req: any[], res: any[] = [], err: any[] = []) {
    if (DEBUG) {
        const now = Date.now();
        const req0 = req.map(logMap);
        const res0 = res.map(logMap);
        const err0 = err.map(logMap);
        logs.push([idx, now, req0[0], req0.slice(1), res0, err0]);
        let req0s1 = req0.slice(1);
        if (req0s1.length === 1) {
            req0s1 = req0s1[0];
        }
        if (res && res.length) {
            log(`${logPrefix}#res`, idx, now, req0[0], req0s1, res0);
        } else if (err && err.length) {
            log(`${logPrefix}#err`, idx, now, req0[0], req0s1, err0);
        } else {
            log(`${logPrefix}#req`, idx, now, req0[0], req0s1);
        }
    }
}

export function get1<T>({ gen, pred }:{gen: () => T, pred: (any: T) => boolean}) {
    while (true) {
        const d = gen();
        if (pred(d)) {
            return d;
        }
    }
}

export function dump() {
    return logs;
}

export function dumpJson() {
    return JSON.stringify(logs);
}

if (DEBUG) {
    globalDebugNNN(dump, 'monkeyDump', false);
    globalDebugNNN(dumpJson, 'monkeyDumpJson', false);
}
