import { Animation, Component, director, Node, Scheduler, sp, Tween, tween, TweenEasing } from 'cc';
import { DEBUG } from 'cc/env';
import { globalDebugNNN } from '../LibGlobal';
import AnimationConfig from '../component/AnimationConfig';
import { audioPlay } from '../component/Audio';
import ParentNode from '../component/ParentNode';
import SpSkeletonConfig from '../component/SpSkeletonConfig';
import SpSkeletonData from '../component/SpSkeletonData';
import SpSkeletonDataRef from '../component/SpSkeletonDataRef';
import ColBase from '../data/ColBase';
import ColSpSkeleton from '../data/ColSpSkeleton';
import MarkAudio from '../data/MarkAudio';
import MarkNode from '../data/MarkNode';
import MarkNumber from '../data/MarkNumber';
import { callFunc, delayTime } from '../utils/Tween';
import { identity, isNone, log, noop, onlyUnique, warn } from '../utils/Utils';
import { promiseQueueClear } from './PromiseQueue';

const m = new Map<Object, Function>();

export function schedulePromiseClearAll() {
    m.forEach((res, node) => {
        res();
    });
}

export interface PromiseExecutor {
    (resolve: (value: any | PromiseLike<any>) => void): void;
}

/**
 * 順序執行 executors
 * @description 預設為都會做完的，如為可能被劫走/中斷的，請用 promiseManager#play
 * @see https://www.kancloud.cn/kancloud/promises-book/44249
 */
export function promiseExecutorSequence(executors: (PromiseExecutor | PromiseExecutor[])[]) {
    // function recordValue(results, value) {
    //     results.push(value);
    //     return results;
    // }
    // const pushValue = recordValue.bind(null, []);
    return executors.reduce(
        (promise: Promise<any>, task: PromiseExecutor | PromiseExecutor[]) => {
            let f: PromiseExecutor;
            if (Array.isArray(task)) {
                f = () => Promise.all(task.map(t => new Promise(t)));
            } else {
                f = () => new Promise(task);
            }
            // @ts-ignore
            return promise.then(f); // .then(pushValue);
        },
        Promise.resolve(),
    );
}

export interface PromiseResolveReject {
    promise: Promise<any>;
    resolve: Function;
    reject: Function;
}

export function animationPlayToPromise2(animation: Animation, {
    index = null, bindResolve = true, doEnactive = false,
}: {
    index?: number, bindResolve?: boolean, doEnactive?: boolean,
} = {}) {
    return animationPlayToPromise(animation, index, bindResolve, doEnactive);
}

export function animationPlayToPromise(animation: Animation, index?: number, bindResolve: boolean = true, doEnactive: boolean = false) {
    if (!animation.isValid) {
        return Promise.resolve();
    }
    return animationPlayToPRR(animation, index, bindResolve, doEnactive).promise;
}

export function animationPlay(animation: Animation, index?: number) {
    let name = null;
    if (!isNone(index)) {
        name = animation.clips[index].name;
    }
    return animation.play(name);
}

export function animationGetState(animation: Animation, index?: number) {
    let name = null;
    if (!isNone(index)) {
        name = animation.clips[index].name;
    }
    return animation.getAnimationState(name);
}

export function animationStop(animation: Animation, index?: number) {
    let name = null;
    if (!isNone(index)) {
        name = animation.clips[index].name;
    }
    const state = animation.getAnimationState(name);
    if (state) {
        state.stop();
    }
}

export function animationPlayToPRR(animation: Animation, index?: number, bindResolve: boolean = true, doEnactive: boolean = false): PromiseResolveReject {

    let resolve = null;
    let reject = null;
    const clear = () => {
        if (doEnactive) {
            animation.node.active = false;
        }
    };
    const prr = wm.get(animation);
    if (prr) {
        prr.reject();
    }
    const promise = new Promise((res, rej) => {
        animation.emit(Animation.EventType.PAUSE);

        animation.unscheduleAllCallbacks();
        animation.off(Animation.EventType.FINISHED);
        animation.off(Animation.EventType.PAUSE);

        resolve = () => {
            // log('resolve', animation);
            clear();
            wm.delete(animation);
            res(animation);
        };
        reject = () => {
            if (animState && animState.isPlaying) {
                animState.stop();
            }
            clear();
            wm.delete(animation);
            rej();
        };

        animation.node.active = true;

        if (bindResolve) {
            animation.once(Animation.EventType.FINISHED, resolve);
        }
        // 如果中途被停了
        // TODO
        animation.once(Animation.EventType.PAUSE, rej);
        let name = null;
        if (!isNone(index)) {
            name = animation.clips[index].name;
        }
        animation.play(name);
        const animState = animation.getState(name);
    });
    // 异常情况被 reject
    promise.catch(() => {
        // TODO: reject 原本的 promise
        // do nothing
    });
    const o = {
        promise,
        resolve,
        reject,
    };
    wm.set(animation, o);
    return o;
}

/**
 *
 * @param skeleton
 * @param param1
 * loopTime 次数，0 为不 loop
 * 0 播一次
 * 1 播一次後呼resolved,and spine loop=true;
 * 2 播二次後呼resolved,and spine set loop=true;
 */
export function spSkeletonSetAnimationToPromise2(skeleton: sp.Skeleton, {
    animation = null, loopTime = 0, doActiveEnactive = false, empty = true,
}: {
    animation?: string, loopTime?: number, doActiveEnactive?: boolean, empty?: boolean,
} = {}) {
    return spSkeletonSetAnimationToPromise(skeleton, animation, loopTime, doActiveEnactive, empty);
}

type spSkeletonSetAnimationAnimation = string | {animation: string, skin: string};

function extractAnimationString(animation: spSkeletonSetAnimationAnimation): string {
    if (typeof animation === 'string') {
        return animation;
    }
    return animation.animation;
}

function extractAnimationSkin(animation: spSkeletonSetAnimationAnimation): string {
    if (typeof animation === 'string') {
        return '';
    }
    return animation.skin;
}

/**
 *
 * @param skeleton
 * @param animation
 * @param loopTime default 0
 * @param doActiveEnactive default false
 * @param empty default true
 */
export function spSkeletonSetAnimationToPromise(skeleton: sp.Skeleton, animation?: spSkeletonSetAnimationAnimation, loopTime: number = 0, doActiveEnactive: boolean = false, empty: boolean = true) {
    return spSkeletonSetAnimationToPRR(skeleton, animation, loopTime, doActiveEnactive, empty).promise;
}

const wm = new WeakMap<sp.Skeleton|Animation, PromiseResolveReject>();

export function animationReject(animation: Animation) {
    const prr = wm.get(animation);
    if (prr) {
        prr.reject();
        wm.delete(animation);
        return true;
    }
    return false;
}

export function spSkeletonReject(skeleton: sp.Skeleton) {
    const prr = wm.get(skeleton);
    if (prr) {
        prr.reject();
        wm.delete(skeleton);
        return true;
    }
    return false;
}
/**
 *
 * @param skeleton
 * @param str
 * @param loopTime loop 次数，0 为不 loop
 * 0 播一次
 * 1 播一次後呼resolved,and spine loop=true;
 * 2 播二次後呼resolved,and spine set loop=true;
 */
export function spSkeletonSetAnimationToPRR(skeleton: sp.Skeleton, animation: spSkeletonSetAnimationAnimation, loopTime: number = 0, doActiveEnactive: boolean = false, empty: boolean = true): PromiseResolveReject {
    let resolve = null;
    let reject = null;
    let times = 0;

    const str = extractAnimationString(animation);
    const skin = extractAnimationSkin(animation);

    if (!skeleton || !skeleton.isValid || !skeleton.node) {
        return {
            promise: Promise.resolve('!isValid'),
            resolve: noop,
            reject: noop,
        };
    }
    const clear = () => {
        if (doActiveEnactive) {
            skeleton.node.active = false;
        }
        // 覆盖 Listener
        skeleton.setCompleteListener(null);
    };

    const prr = wm.get(skeleton);
    if (prr) {
        prr.reject();
    }
    clear();
    // skeleton.setStartListener((te) => {
    //     log('start', skeleton, te.animation.name, animation, times, loopTime);
    // });

    const p = new Promise((res, rej) => {

        resolve = (te) => { // TrackEntry
            // log('resolve', skeleton, te.animation.name, animation, times, loopTime);
            if (te.animation.name !== str) {
                return;
            }
            clear();
            wm.delete(skeleton);
            res(str);
        };
        reject = () => {
            // clear();
            wm.delete(skeleton);
            rej();
        };

        if (empty) {
            spSkeletonEmpty(skeleton);
        }

        const loop = loopTime ? true : false;
        if (loopTime) {
            skeleton.setCompleteListener((te) => {
                if (te.animation.name !== str) {
                    return;
                }
                times += 1;
                if (times >= loopTime) {
                    resolve(te);
                }
            });
        } else {
            skeleton.setCompleteListener(resolve);
        }

        skeleton.node.active = true;
        spSkeletonSetData(skeleton, str);
        if (skin) {
            skeleton.setSkin(skin);
        }
        skeleton.setAnimation(0, str, loop);
        spSkeletonApply(skeleton);

        // skeleton.setEventListener((entry, event) => {
        //     const eventName = event.data.name;
        // });

    });
    const o: PromiseResolveReject = {
        reject,
        resolve,
        promise: p,
    };
    wm.set(skeleton, o);
    return o;
}

function spSkeletonFindSpSkeletonData(skeleton: sp.Skeleton) {
    let ssd = skeleton.getComponent(SpSkeletonData);
    if (!ssd) {
        const refNode = skeleton.getComponent(SpSkeletonDataRef);
        if (refNode) {
            ssd = refNode.refNode.getComponent(SpSkeletonData);
        }
    }
    return ssd;
}

export function spSkeletonFindData(skeleton: sp.Skeleton, anim: string) {
    const ssd = spSkeletonFindSpSkeletonData(skeleton);
    if (ssd) {
        const data = ssd.data.find((data) => {
            return Object.keys(data.getAnimsEnum()).indexOf(anim) !== -1;
        });
        return data;
    }
    return null;
}

export function spSkeletonSetData(skeleton: sp.Skeleton, anim: string) {
    // Node(sp.Skeleton, SpSkeletonData).scale
    const ssd = spSkeletonFindSpSkeletonData(skeleton);
    if (ssd) {
        const data = ssd.data.find((data) => {
            return Object.keys(data.getAnimsEnum()).indexOf(anim) !== -1;
        });
        if (!data) {
            // warn('spSkeletonSetData', anim, skeleton, ssd.data);
            return;
        }
        if (ssd.cacheMode && !skeleton.isAnimationCached()) {
            skeleton.setAnimationCacheMode(sp.Skeleton.AnimationCacheMode.SHARED_CACHE);
        }
        if (skeleton.skeletonData !== data) {
            skeleton.skeletonData = data;
        }
        return data;
    }
}

export function spSkeletonSetAnimation(skeleton: sp.Skeleton, anim: spSkeletonSetAnimationAnimation | spSkeletonSetAnimationAnimation[], loop: boolean = false, empty: boolean = true, delta: number = 0) {

    const prr = wm.get(skeleton);
    if (prr) {
        prr.reject();
    }

    if (empty) {
        spSkeletonEmpty(skeleton);
    }

    const names: spSkeletonSetAnimationAnimation[] = [].concat(anim);
    const len = names.length;
    if (len) {
        const data = spSkeletonFindSpSkeletonData(skeleton);
        const p = len > 1 && data && data.data.length > 1 && names.map(n => spSkeletonFindData(skeleton, extractAnimationString(n))).filter(identity).filter(onlyUnique).length !== 1;
        if (p) {
            (async () => {
                let prr: PromiseResolveReject = null;
                try {
                    for (let i = 0; i < len; i += 1) {
                        const n = names[i];
                        spSkeletonSetData(skeleton, extractAnimationString(n));
                        const skin = extractAnimationSkin(n);
                        if (skin) {
                            skeleton.setSkin(skin);
                        }
                        prr = spSkeletonSetAnimationToPRR(skeleton, n);
                        await prr.promise;
                    }
                } catch (e) {
                    prr?.reject();
                }
            })();
        } else {
            let first = true;
            for (let i = 0; i < len; i += 1) {
                const str = extractAnimationString(names[i]);
                const skin = extractAnimationSkin(names[i]);
                if (first) {
                    spSkeletonSetData(skeleton, str);
                    if (skin) {
                        skeleton.setSkin(skin);
                    }
                }
                const anim = skeleton.findAnimation(str);
                const last = i === len - 1;
                if (!anim) {
                    continue;
                }
                const dur = anim.duration;
                const l = (last && dur > 0) ? loop : false;
                if (first) {
                    first = false;
                    skeleton.setAnimation(0, str, l);
                } else {
                    skeleton.addAnimation(0, str, l);
                }
            }
        }
    }

    spSkeletonApply(skeleton, delta);
}

export function spSkeletonCopyAnimation(source: sp.Skeleton, target: sp.Skeleton) {
    if (source.isAnimationCached() !== target.isAnimationCached()) {
        warn('AnimationCache mode mismatch, May be a problem', source, target);
    }
    const dt = spSkeletonGetDelta(source);
    const anim = source.animation;
    const loop = source.loop;
    spSkeletonSetAnimation(target, anim, loop, true, dt);
    if (DEBUG) {
        const dt2 = spSkeletonGetDelta(target);
        log('spSkeletonCopyAnim', dt, dt2, source, target);
    }
}

export function spSkeletonApply(skeleton: sp.Skeleton, delta: number = 0) {
    // 做一次 apply，确保在同帧处理避免闪烁
    // @ts-ignore
    if (skeleton._state) {
        // @ts-ignore
        skeleton._state.update(delta);
        // @ts-ignore
        skeleton._state.apply(skeleton._skeleton);
        // @ts-ignore
    } else if (skeleton._animCache) {
        // @ts-ignore
        skeleton._accTime = 0;
        skeleton.updateAnimation(delta);
    }
}

export function spSkeletonGetDelta(skeleton: sp.Skeleton): number {
    if (skeleton.isAnimationCached()) {
        // @ts-ignore
        return skeleton._accTime;
    } else {
        const track0 = skeleton.getCurrent(0);
        return track0.animationLast;
    }
}

export function spSkeletonEmpty(skeleton: sp.Skeleton) {
    if (skeleton.isAnimationCached()) {
        skeleton.setAnimation(0, 'empty', false);
    } else {
        skeleton.setToSetupPose();
        skeleton.clearTracks();
    }
}

export function spSkeletonSetAnimationPause(skeleton: sp.Skeleton, animName: string, time: number) {
    if (skeleton.animation !== animName) {
        skeleton.setAnimation(0, animName, false);
        skeleton.paused = true;
    }
    if (skeleton.isAnimationCached()) {
        debugger;
        // @ts-ignore
        // const totalTime: number = skeleton._frameCache.totalTime;
        // // @ts-ignore
        // const frames: any[] = skeleton._frameCache.frames;

        // let idx = Math.floor(time * 60);
        // if (idx > frames.length - 1) {
        //     idx = frames.length - 1;
        // }
        // const accTime = idx / frames.length * totalTime;
        // const curTime = frames[idx];

        // // @ts-ignore
        // skeleton._accTime = accTime;
        // // @ts-ignore
        // skeleton._curFrame = curTime;
    } else {
        const te0 = skeleton.getCurrent(0);
        const start = te0.animationStart;
        const end = te0.animationEnd;
        const trackTime = te0.trackTime;
        if (time > end) {
            time = end;
        }
        if (time < start) {
            time = start;
        }
        const d = time - trackTime;
        // @ts-ignore
        skeleton._updateRealtime(d);
    }
}

export function spSkeletonSetMix(skeleton: sp.Skeleton, animations: string[] = [], duration: number = .1) {
    if (animations.length === 0) {
        animations = Object.keys(skeleton.skeletonData.getRuntimeData().animations).sort();
    }
    animations.forEach((from) => {
        animations.forEach((to) => {
            skeleton.setMix(from, to, duration);
        });
    });
}

export function timeoutSec(fn: Function, sec: number = 0): number {
    return setTimeout(fn, sec * 1e3);
}

export function timeoutPromise<T = any>(sec: number, resolveValue?: T): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(resolveValue), sec * 1e3);
    });
}

export function timeoutResolvef(sec: number) {
    return (resolve: any) => {
        schedulePromise(sec).then(resolve);
    };
}

export function scheduleOnce2(fn: Function, delay: number = 0) {
    if (delay === 0) {
        fn();
        return;
    }
    let t = 0;
    const frame = (dt: number) => {
        t += dt;
        if (t >= delay) {
            fn();
        } else {
            requestAnimationFrame(frame);
        }
    };
    requestAnimationFrame(frame);
}

export function requestAnimationFrameUpdate(dur: number, update: (dt: number) => void) {
    const s = Date.now();
    let pt = s;
    const frame = () => {
        const t = Date.now();
        const dt = (t - pt) / 1e3;
        update(dt);
        pt = t;
        if (t - s < dur * 1e3) {
            requestAnimationFrame(frame);
        }
    };
    requestAnimationFrame(frame);
}

export function resolveWrapper(promise: Promise<any>): Promise<void> {
    return new Promise((resolve) => {
        promise.then(resolve, resolve);
    });
}

/**
 * 要注意被包裹的 promise 是否會被完成，可能會有 memory leak 問題
 * @param dur sec
 * @param promise
 * @returns
 */
export function resolveWrapper2(dur: number, promise: Promise<any>): Promise<void> {
    return new Promise((resolve) => {
        if (dur) {
            const o = {};
            const res = () => {
                m.delete(o);
                resolve();
            };
            m.set(o, resolve);
            tween({}).sequence(delayTime(dur), callFunc(res)).start();
        }
        promise.then(resolve, resolve);
    });
}

const nodeChildrenComponentWeakMap = new WeakMap<Node, number>();

function nodeChildrenComponentIsCurrentPlayId(node: Node, playId: number): boolean {
    if (nodeChildrenComponentWeakMap.has(node)) {
        const id = nodeChildrenComponentWeakMap.get(node);
        return playId === id;
    } else {
        return true;
    }
}
function nodeChildrenComponentNextPlayId(node: Node): number {
    if (nodeChildrenComponentWeakMap.has(node)) {
        const next = nodeChildrenComponentWeakMap.get(node) + 1;
        nodeChildrenComponentWeakMap.set(node, next);
        return next;
    } else {
        nodeChildrenComponentWeakMap.set(node, 0);
        return 0;
    }
}

export function nodeChildrenAnimationStop(node: Node) {
    nodeChildrenComponentNextPlayId(node);

    node.getComponentsInChildren(Animation).forEach((anim) => {
        animationReject(anim);
        if (anim.currentClip) {
            const index = anim.clips.indexOf(anim.currentClip);
            animationStop(anim, index);
        }
    });
    node.getComponentsInChildren(sp.Skeleton).forEach((ske) => {
        spSkeletonReject(ske);
        spSkeletonEmpty(ske);
    });
    // parentNode 的動畫
    const parentNodes = node.getComponentsInChildren(ParentNode);
    if (parentNodes.length) {
        parentNodes.map((pn) => {
            // 先只處理最上層，避免階層混亂
            if (node.children.indexOf(pn.node) === -1) {
                return;
            }
            const anim = pn.parentNode.getComponent(Animation);
            if (anim) {
                animationReject(anim);
                if (anim.currentClip) {
                    const index = anim.clips.indexOf(anim.currentClip);
                    animationStop(anim, index);
                }
            }
            const ske = node.getComponent(sp.Skeleton);
            if (ske) {
                spSkeletonReject(ske);
                spSkeletonEmpty(ske);
            }
        });
    }
}

export async function nodeChildrenComponentToPromise(node: Node, ccAnimationIndex?: number | number[], debug: boolean = false) {

    // 動畫
    const eachAnimation = async(anim: Animation, i: number) => {
        const index = (typeof ccAnimationIndex === 'undefined' || typeof ccAnimationIndex === 'number') ? ccAnimationIndex : ccAnimationIndex[i];
        const mn = anim.getComponent(MarkNumber);
        if (mn) {
            anim.node.active = false;
            await schedulePromise(mn.data);
        }
        const p = resolveWrapper(animationPlayToPromise(anim, index));
        if (DEBUG && debug) {
            log('nodeChildrenComponentToPromise', anim, index, p);
        }
        return p;
    };
    const eachSkeleton = async (ske: sp.Skeleton, i: number) => {
        const config = ske.getComponent(SpSkeletonConfig);
        const col = ske.getComponent(ColSpSkeleton);
        let str = ske.animation;
        let loop = 0;
        let enactive = true;
        let justSetAnimation = false;
        if (config || col) {
            if (DEBUG) {
                if ([config, col].filter(identity).length !== 1) {
                    warn('Skeleton have config and col, this may confuse.');
                }
            }
            if (config) {
                str = config.animation;
                loop = config.loopTime ? config.loopTime : (config.loop ? 1 : 0);
                enactive = config.enactive;
                justSetAnimation = config.justSetAnimation;
            }
            if (col) {
                const index = (typeof ccAnimationIndex === 'undefined' || typeof ccAnimationIndex === 'number') ? ccAnimationIndex : ccAnimationIndex[i];
                str = col.animations[index];
                loop = 0;
                enactive = true;
            }
        }
        const mn = ske.getComponent(MarkNumber);
        if (mn) {
            ske.node.active = false;
            await schedulePromise(mn.data);
        }
        if (justSetAnimation) {
            if (DEBUG && debug) {
                log('nodeChildrenComponentToPromise', ske, str, Boolean(loop));
            }
            ske.node.active = true;
            spSkeletonSetAnimation(ske, str, Boolean(loop), true);
        } else {
            const p = resolveWrapper(spSkeletonSetAnimationToPromise(ske, str, loop, enactive));
            if (DEBUG && debug) {
                log('nodeChildrenComponentToPromise', ske, str, loop, enactive, p);
            }
            return p;
        }
    };

    const ps: Promise<any>[] = [];
    const animations = node.getComponentsInChildren(Animation);
    if (animations.length) {
        ps.push(...animations.map(eachAnimation));
    }
    // parentNode 的動畫
    const parentNodes = node.getComponentsInChildren(ParentNode);
    if (parentNodes.length) {
        ps.push(...parentNodes.map(async (pn, i) => {
            // 先只處理最上層，避免階層混亂
            if (node.children.indexOf(pn.node) === -1) {
                return;
            }
            const anim = pn.parentNode.getComponent(Animation);
            if (anim) {
                eachAnimation(anim, i);
            }
            const ske = pn.parentNode.getComponent(sp.Skeleton);
            if (ske) {
                eachSkeleton(ske, i);
            }
        }));
    }

    // 骨骼動畫
    const skeletons = node.getComponentsInChildren(sp.Skeleton);
    if (skeletons.length) {
        ps.push(...skeletons.map(eachSkeleton));
    }

    await Promise.all(ps);
}

export async function nodeChildrenComponentToPromise3(node: Node, ...args: any[]) {
    const eachAnimation = (x: AnimationConfig) => {
        x.pre();
        x.animation.node.active = false;
        return async () => {
            const a = x.animation;
            const i = x.index;
            const enactive = x.enactive;
            x.animation.node.active = true;
            if (!x.animation.node.activeInHierarchy) {
                return Promise.reject(x.animation.clips[x.index].name + '!activeInHierarchy');
            }
            const ma = x.getComponent(MarkAudio);
            if (ma) {
                (async() => {
                    if (ma.delay) {
                        await schedulePromise(ma.delay);
                    }
                    audioPlay(ma.audioName, { throttle: 100 });
                })();
            }
            const p = resolveWrapper(animationPlayToPromise(a, i, true, enactive));
            if (DEBUG) {
                log('nodeChildrenComponentToPromise3', p, x, i);
            }
            await p;
        };
    };
    const eachSkeleton = (x: SpSkeletonConfig) => {
        x.pre();
        x.skeleton.node.active = false;
        return async () => {
            let str: string;
            let loop = 0;
            let enactive = true;
            let justSetAnimation = false;
            const ske = x.skeleton;
            str = x.animation;
            loop = x.loopTime ? x.loopTime : (x.loop ? 1 : 0);
            enactive = x.enactive;
            justSetAnimation = x.justSetAnimation;
            ske.node.active = true;
            if (!ske.node.activeInHierarchy) {
                return Promise.reject(x.animation + '!activeInHierarchy');
            }
            const ma = x.getComponent(MarkAudio);
            if (ma) {
                (async() => {
                    if (ma.delay) {
                        await schedulePromise(ma.delay);
                    }
                    audioPlay(ma.audioName, { throttle: 100 });
                })();
            }
            if (justSetAnimation) {
                if (DEBUG) {
                    log('nodeChildrenComponentToPromise3', x, str, Boolean(loop));
                }
                spSkeletonSetAnimation(ske, str, Boolean(loop), true);
            } else {
                const p = resolveWrapper(spSkeletonSetAnimationToPromise(ske, str, loop, enactive));
                if (DEBUG) {
                    log('nodeChildrenComponentToPromise3', p, x, str, loop, enactive);
                }
                await p;
            }
        };
    };
    node.active = true;
    const map = new Map<Component, () => Promise<any>>();
    const append = (c: Component, f: () => Promise<any>) => {
        map.set(c, f);
    };
    const each = async (node: Node | Component) => {
        const ac = node.getComponent(AnimationConfig);
        if (ac) {
            append(ac, eachAnimation(ac));
        }
        const sc = node.getComponent(SpSkeletonConfig);
        if (sc) {
            append(sc, eachSkeleton(sc));
        }
    };
    node.getComponentsInChildren(ColBase).forEach((col, i) => {
        const ii = col.colKey ? Number(col.colKey) : i;
        const value = args[ii];
        col.reset(value);
        if (DEBUG) {
            log('nodeChildrenComponentToPromise3', col, ii, value);
        }
    });

    node.getComponentsInChildren(AnimationConfig).forEach(each);
    node.getComponentsInChildren(SpSkeletonConfig).forEach(each);
    node.getComponentsInChildren(ParentNode).forEach((pn) => {
        // 控制 node 外部的動畫，先只處理最上層，避免階層混亂
        if (node.children.indexOf(pn.node) === -1) {
            return;
        }
        each(pn.parentNode);
    });
    const p = markNodePlay(node, map);
    try {
        await p;
    } catch (e) {
        return Promise.resolve(e);
    }
    node.active = false;
    return p;
}

export function markNodePlay(node: Node, map: Map<Component, () => Promise<any>>) {
    const playId = nodeChildrenComponentNextPlayId(node);
    interface X {
        n: Component[];
        c: Component;
        w: Component[];
    }
    const arr: X[] = [];
    map.forEach((f, c) => {
        const mn = c.getComponent(MarkNode);
        const x: X = {
            c,
            w: [],
            n: [],
        };
        if (mn) {
            const waitNodes = ([] as Node[]).concat(mn.refNode, mn.refNodes);
            x.w = waitNodes.flatMap(wn => wn.getComponents(Component)).filter((c) => {
                return c instanceof SpSkeletonConfig || c instanceof AnimationConfig;
            });
        }
        arr.push(x);
    });
    const wm = new WeakMap<Component, Promise<any>>();
    const wm2 = new WeakMap<Component, [Promise<any>, Function]>();
    arr.forEach((x) => {
        x.w.forEach((wc) => {
            const wx = arr.find(wx => wx.c === wc);
            wx.n.push(x.c);
        });
        let res: Function;
        const p = new Promise((r) => {
            res = r;
        });
        wm2.set(x.c, [p, res]);
    });
    const first = arr.filter(x => x.w.length === 0);
    const exec = async (c: Component) => {
        let p = wm.get(c);
        if (p) {
            return wm2.get(c)[0];
        }
        p = map.get(c)();
        wm.set(c, p);
        await p;
        wm2.get(c)[1]();
        return p;
    };
    const getNode = (c: Component) => {
        if (c instanceof SpSkeletonConfig) {
            return c.skeleton.node;
        } else if (c instanceof AnimationConfig) {
            return c.animation.node;
        }
    };
    const str = (c: Component) => {
        if (DEBUG) {
            if (c instanceof SpSkeletonConfig) {
                return c.animation;
            } else if (c instanceof AnimationConfig) {
                return c.animation.clips[c.index].name;
            }
        }
        return '';
    };
    const check = (c: Component) => {
        if (!nodeChildrenComponentIsCurrentPlayId(node, playId)) {
            return Promise.reject(str(c) + '!playId');
        }
        if (!node.isValid) {
            return Promise.reject(str(c) + '!isValid');
        }
        return Promise.resolve();
    };
    const step = async (xOrComponent: X | Component) => {
        const x = (xOrComponent instanceof Component) ? arr.find(x => x.c === xOrComponent) : xOrComponent;
        await check(x.c);
        if (x.w.length) {
            await Promise.all(x.w.map(c => wm2.get(c)[0]));
        }
        await check(x.c);
        const mn = x.c.getComponent(MarkNumber);
        if (mn && mn.data) {
            getNode(x.c).active = mn.active;
            await schedulePromise(mn.data);
        }
        await check(x.c);
        await exec(x.c);
        if (mn && mn.data2) {
            await schedulePromise(mn.data2);
            getNode(x.c).active = mn.active2;
        }
        await check(x.c);
        if (x.n.length) {
            return Promise.all([Promise.resolve(str(x.c)), Promise.all(x.n.map(step))]);
        }
        return Promise.resolve(str(x.c));
    };
    log('nodeChildrenComponentToPromise3 play', arr);
    return Promise.all(first.map(step));
}

export function schedulePromise<T>(dur: number, resolveValue?: T):Promise<T> {
    return new Promise((resolve) => {
        const node = new Node();
        const res = () => {
            node.destroy();
            resolve(resolveValue);
        };
        const action = tween(node).sequence(delayTime(dur), callFunc(res));
        action.start();
    });
}

export function schedulePromise2(dur: number): [Promise<any>, Function] {
    let rej: Function;
    const p = new Promise((resolve, reject) => {
        rej = reject;
        const node = new Node();
        const res = () => {
            node.destroy();
            resolve(1);
        };
        const action = tween(node).sequence(delayTime(dur), callFunc(res));
        action.start();
    });
    return [p, rej];
}

const map: { [s: string]: { reject: Function, obj: TweenNumberObject } } = {};

type TweenNumberObject = { num: number };
type TweenNumberOptions = { easing?: TweenEasing | ((k: number) => number), before?: Tween, after?: Tween, key?: string };

/**
 * @param opts.easing easeBezierAction(0, .4, .75, 1) | easeIn(3.0)
 */
export function tweenNumberToPromise(from: number, to: number, dur: number, handler: (num: number) => void, opts: TweenNumberOptions = {}) {
    return new Promise((resolve: Function, reject: Function) => {
        const obj: TweenNumberObject = {
            num: from,
        };
        const key = opts?.key || '';
        map[key] = {
            obj,
            reject,
        };
        const t = tween(obj);
        const arr = [
            opts.before,
            tween().to(dur, { num: to }, {
                onUpdate: (obj: TweenNumberObject, t: number) => {
                    handler(obj.num);
                },
                // @ts-ignore
                easing: opts.easing?.easing,
            }),
            callFunc(() => {
                handler(to);
            }),
            opts.after,
            callFunc(() => {
                resolve();
            }),
        ].filter(identity);
        t.sequence(arr[0], ...arr.slice(1)).start();
    });
}

export function tweenNumberStop(key: string = '') {
    const data = map[key];
    if (!data) {
        if (DEBUG) {
            warn('tweenNumberStop key not exist', key);
        }
        return;
    }
    delete map[key];
    data.reject();
    Tween.stopAllByTarget(data.obj);
}

// const wm2: WeakMap<SkeletonAnimation, Function> = new WeakMap();

export function ccSkeletonAnimationPlay(skeletonAnimation: SkeletonAnimation, index?: number) {
    // if (wm2.has(skeletonAnimation)) {
    //     // wm.get(skeletonAnimation)();
    //     wm2.delete(skeletonAnimation);
    // }
    animationPlay(skeletonAnimation, index);
}

export function ccSkeletonAnimationPlayToPromise(skeletonAnimation: SkeletonAnimation, index?: number) {
    return new Promise((res, rej) => {
        skeletonAnimation.off(SkeletonAnimation.EventType.LASTFRAME);
        // if (wm2.has(skeletonAnimation)) {
        //     // wm.get(skeletonAnimation)();
        //     wm2.delete(skeletonAnimation);
        // }
        // skeletonAnimation.off(SkeletonAnimation.EventType.FINISHED);

        // skeletonAnimation.once(SkeletonAnimation.EventType.FINISHED, () => {
        //     debugger;
        //     res(1);
        // });
        skeletonAnimation.once(SkeletonAnimation.EventType.LASTFRAME, res);
        // wm2.set(skeletonAnimation, rej);
        animationPlay(skeletonAnimation, index);
    });
}

export function loadSceneClear(node?: Node | Component) {
    // cc.director.clear();
    director.resume();
    if (node) {
        node.getComponentsInChildren(Animation).forEach((a) => {
            a.stop();
        });
    }
    // this.getComponentsInChildren(sp.Skeleton).forEach((a) => {
    //     a.setCompleteListener(null);
    //     spSkeletonReject(a);
    //     spSkeletonEmpty(a);
    // });
    promiseQueueClear();
    schedulePromiseClearAll();
    director.getActionManager().removeAllActions();
    director.getScheduler().unscheduleAllWithMinPriority(Scheduler.PRIORITY_NON_SYSTEM);
}

globalDebugNNN(nodeChildrenComponentToPromise, 'nodeChildrenComponentToPromise', false);
globalDebugNNN(nodeChildrenAnimationStop, 'nodeChildrenAnimationStop', false);
globalDebugNNN(requestAnimationFrameUpdate, 'requestAnimationFrameUpdate', false);
globalDebugNNN(spSkeletonSetAnimation, 'spSkeletonSetAnimation', false);
globalDebugNNN(spSkeletonCopyAnimation, 'spSkeletonCopyAnimation', false);
globalDebugNNN(spSkeletonGetDelta, 'spSkeletonGetDelta', false);
