import { _decorator, Component, instantiate, Node, sp, Texture2D } from 'cc';
import { DEBUG } from 'cc/env';
import { spSkeletonSetAnimationToPromise } from '../script/PromiseManager';
import { log, range, setNodeOpacity, warn } from '../utils/Utils';
import { spSkeletonNameDuration } from './SpSkeletonStatus';

const { ccclass, property, requireComponent } = _decorator;

// tslint:disable-next-line:variable-name
const FrameTime = 1 / 60;

// tslint:disable-next-line:variable-name
const TrackEntryListeners = function () {
    this.start = null;
    this.end = null;
    this.complete = null;
    this.event = null;
    this.interrupt = null;
    this.dispose = null;
};

let hacked: boolean = false;

export const DEFAULT_WORKER: number = 1;

@ccclass
export default class SpSkeletonHack extends Component {

    onLoad() {
        // this.hack_2_0_10(this.skeletonNode);
    }

    start() {
        // this.cache(this.skeletonNode);
    }

    /**
     * 同步 cache
     */
    public cache2(skeletonNode: Node) {
        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        const ns = Object.keys(skeleton.skeletonData.getRuntimeData().animations);
        if (DEBUG) {
            log('caching spine');
            // tslint:disable-next-line:no-console
            console.time('cached spine');
        }
        // @ts-ignore
        const uuid = skeleton.skeletonData._uuid;
        ns.map((n, i) => {
            // @ts-ignore
            const c = skeleton._skeletonCache.getAnimationCache(uuid, n);
            if (!c) {
                if (DEBUG) {
                    log('caching ' + n);
                    // tslint:disable-next-line:no-console
                    console.time('cached ' + n);
                }
                // @ts-ignore
                skeleton._skeletonCache.updateAnimationCache(uuid, n);
                if (DEBUG) {
                    // tslint:disable-next-line:no-console
                    console.timeEnd('cached ' + n);
                }
            }
        });
        if (DEBUG) {
            // tslint:disable-next-line:no-console
            console.timeEnd('cached spine');
        }
    }

    /**
     * 非同步 cache
     */
    public async cache(skeletonNode: Node, parentNode?: Node, worker: number = DEFAULT_WORKER) {
        parentNode = parentNode || this.node;

        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        const ns = Object.keys(skeleton.skeletonData.getRuntimeData().animations);
        log('skeleton cache', skeleton);

        // @ts-ignore
        if (!skeleton.isAnimationCached()) {
            warn('skeleton not cache mode');
            return;
        }

        const is = ns.map(n => spSkeletonNameDuration(skeleton, n));
        // 從短的開始 cache
        is.sort((a, b) => a.duration - b.duration);
        const lens: number[] = range(worker).map(() => 0);
        const arr: string[][] = range(worker).map(() => []);
        const findMinIdx = (): number => {
            const min = Math.min.apply(null, lens);
            return lens.indexOf(min);
        };
        for (let i = 0; i < is.length; i += 1) {
            const info = is[i];
            const duration = info.duration + .05;
            const idx = findMinIdx();
            const d = lens[idx];
            lens[idx] += duration;
            arr[idx].push(info.name);
        }

        if (DEBUG) {
            log(is, lens, arr);
            log('caching spine');
            // tslint:disable-next-line:no-console
            console.time('cached spine ' + skeleton.skeletonData.name);
        }

        const ps = arr.map((ar, i) => {
            return ar.reduce(
                (p, n) => {
                    return p.then(() => {
                        // @ts-ignore
                        const cache = skeleton._skeletonCache.getAnimationCache(skeleton.skeletonData._uuid, n);
                        if (cache && cache.isCompleted) {
                            log(i + ' already cached ' + n);
                            return;
                        }
                        const node = instantiate(skeletonNode);
                        setNodeOpacity(node, 0);
                        const ske = node.getComponent(sp.Skeleton);
                        parentNode.addChild(node);
                        if (DEBUG) {
                            log(i + ' caching ' + n);
                            // tslint:disable-next-line:no-console
                            console.time(i + ' cached ' + n);
                        }
                        return spSkeletonSetAnimationToPromise(ske, n).then(() => {
                            if (DEBUG) {
                                // tslint:disable-next-line:no-console
                                console.timeEnd(i + ' cached ' + n);
                            }
                            node.removeFromParent();
                        });
                    });
                },
                Promise.resolve(),
            );
        });
        // log('caching', ps);

        await Promise.all(ps);

        if (DEBUG) {
            // tslint:disable-next-line:no-console
            console.timeEnd('cached spine ' + skeleton.skeletonData.name);
        }
    }

    public hack_2_0_9(skeletonNode: Node) {
        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        // @ts-ignore
        const uuid = skeleton.skeletonData._uuid;
        // skeleton._skeletonCache.initAnimationCache(uuid, 'empty');
        // @ts-ignore
        const cache = skeleton._skeletonCache.updateAnimationCache(uuid, 'empty');
        // 無法
        // 2.0.9 只有一次做完 cache 的方式
    }

    /**
     * 改 cocos 底層讓 AnimationCache#begin 時 cache 有自己的 skeleton 實體
     * 讓多個 animation 可同時 cache
     */
    public hack_2_4_4(skeletonNode: Node) {
        if (hacked) {
            return;
        }
        hacked = true;

        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        // @ts-ignore
        const uuid = skeleton.skeletonData._uuid;
        // @ts-ignore
        const cache = skeleton._skeletonCache.initAnimationCache(uuid, 'empty');

        if (1) { // AnimationCache#begin
            // tslint:disable-next-line:variable-name
            cache.constructor.prototype.begin = function (_skeleton) {
                if (!this._invalid) return;

                // const skeletonInfo = this._skeletonInfo;
                // const preAnimationCache = skeletonInfo.curAnimationCache;

                // if (preAnimationCache && preAnimationCache !== this) {
                //     if (this._privateMode) {
                //         // Private cache mode just invalid pre animation frame.
                //         preAnimationCache.invalidAllFrame();
                //     } else {
                //         // If pre animation not finished, play it to the end.
                //         // preAnimationCache.updateToFrame();
                //     }
                // }
                // @ts-ignore
                const skeleton = new sp.spine.Skeleton(_skeleton.data);
                // @ts-ignore
                const clipper = new sp.spine.SkeletonClipping();
                // @ts-ignore
                const stateData = new sp.spine.AnimationStateData(skeleton.data);
                // @ts-ignore
                const state = new sp.spine.AnimationState(stateData);
                const listener = new TrackEntryListeners();
                state.addListener(listener);

                this._skeleton = skeleton;
                this._clipper = clipper;
                this._state = state;

                // const skeleton = skeletonInfo.skeleton;
                // const listener = skeletonInfo.listener;
                // const state = skeletonInfo.state;

                const animation = skeleton.data.findAnimation(this._animationName);
                state.setAnimationWith(0, animation, false);
                this.bind(listener);

                // record cur animation cache
                // skeletonInfo.curAnimationCache = this;
                this._frameIdx = -1;
                this.isCompleted = false;
                this.totalTime = 0;
                this._invalid = false;
            };
        }

        if (0) { // AnimationCache#bind
            // cache.constructor.prototype.bind = function (listener) {
            //     const completeHandle = function (entry) {
            //         warn('completed', entry && entry.animation.name);
            //         if (entry && entry.animation.name === this._animationName) {
            //             warn('completed match', this._animationName);
            //             this.isCompleted = true;
            //         }
            //     }.bind(this);
            //     warn('bind', this._animationName);
            //     listener.complete = completeHandle;
            // };
        }

        if (1) { // AnimationCache#updateToFrame
            cache.constructor.prototype.updateToFrame = function (toFrameIdx) {
                if (!this._inited) return;

                this.begin(this._skeletonInfo.skeleton);

                if (!this._needToUpdate(toFrameIdx)) return;

                // const skeletonInfo = this._skeletonInfo;
                const skeleton = this._skeleton;
                if (!skeleton) {
                    debugger;
                    return;
                }
                const clipper = this._clipper;
                const state = this._state;

                do {
                    // Solid update frame rate 1/60.
                    skeleton.update(FrameTime);
                    state.update(FrameTime);
                    state.apply(skeleton);
                    skeleton.updateWorldTransform();
                    this._frameIdx += 1;
                    this._updateFrame(skeleton, clipper, this._frameIdx);
                    this.totalTime += FrameTime;
                } while (this._needToUpdate(toFrameIdx));

                this.end();
            };
        }

        if (0) { // SkeletonCache#getSkeletonCache
            // cache.constructor.prototype.initAnimationCache = function (uuid, animationName) {
            //     if (!animationName) return null;
            //     const skeletonInfo = this._skeletonCache[uuid];
            //     const skeleton = skeletonInfo && skeletonInfo.skeleton;
            //     if (!skeleton) return null;

            //     const animation = skeleton.data.findAnimation(animationName);
            //     if (!animation) {
            //         return null;
            //     }

            //     const animationsCache = skeletonInfo.animationsCache;
            //     let animationCache = animationsCache[animationName];
            //     if (!animationCache) {
            //         // If cache exist in pool, then just use it.
            //         const poolKey = uuid + '#' + animationName;
            //         animationCache = this._animationPool[poolKey];
            //         if (animationCache) {
            //             delete this._animationPool[poolKey];
            //         } else {
            //             animationCache = new AnimationCache();
            //             animationCache._privateMode = this._privateMode;
            //         }
            //         animationCache.init(skeletonInfo, animationName);
            //         animationsCache[animationName] = animationCache;
            //     }
            //     return animationCache;
            // };
        }

        if (1) { // sp.Skeleton#setAnimation
            /**
            * !#en Set the current animation. Any queued animations are cleared.<br>
            * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry object.
            * !#zh 设置当前动画。队列中的任何的动画将被清除。<br>
            * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry 对象。
            * @method setAnimation
            * @param {Number} trackIndex
            * @param {String} name
            * @param {Boolean} loop
            * @return {sp.spine.TrackEntry}
            */
            sp.Skeleton.prototype.setAnimation = function (trackIndex, name, loop) {

                this._playTimes = loop ? 0 : 1;
                this._animationName = name;

                if (this.isAnimationCached()) {
                    if (trackIndex !== 0) {
                        warn('Track index can not greater than 0 in cached mode.');
                    }
                    if (!this._skeletonCache) return null;
                    let cache = this._skeletonCache.getAnimationCache(this.skeletonData._uuid, name);
                    if (!cache) {
                        cache = this._skeletonCache.initAnimationCache(this.skeletonData._uuid, name);
                        if (DEBUG && !cache) {
                            warn('SpSkeletonHack#setAnimation', 'no', name);
                        }
                        cache.begin(this._skeleton);
                    }
                    if (cache) {
                        this._isAniComplete = false;
                        this._accTime = 0;
                        this._playCount = 0;
                        this._frameCache = cache;
                        if (this.attachUtil._hasAttachedNode()) {
                            this._frameCache.enableCacheAttachedInfo();
                        }
                        this._frameCache.updateToFrame(0);
                        this._curFrame = this._frameCache.frames[0];
                    }
                } else {
                    if (this._skeleton) {
                        const animation = this._skeleton.data.findAnimation(name);
                        if (!animation) {
                            // @ts-ignore
                            logID(7509, name);
                            return null;
                        }
                        const res = this._state.setAnimationWith(trackIndex, animation, loop);
                        this._state.apply(this._skeleton);
                        return res;
                    }
                }
                return null;
            };
        }
        // this.schedule(
        //     () => {
        //         const name = randomItem(names);
        //         log('setAnimation', name);
        //         ske.setAnimation(0, name, true);
        //     },
        //     1,
        // );
        // this.scheduleOnce(
        //     () => {
        //         this.unscheduleAllCallbacks();
        //         this.schedule(
        //             () => {
        //                 const name = randomItem(names);
        //                 log('setAnimation', name);
        //                 ske.setAnimation(0, name, true);
        //             },
        //             5,
        //         );
        //     },
        //     10,
        // );
    }

    /**
     * 改 cocos 底層讓 AnimationCache#begin 時 cache 有自己的 skeleton 實體
     * 讓多個 animation 可同時 cache
     */
    public hack_2_2_2(skeletonNode: Node) {
        if (hacked) {
            return;
        }
        hacked = true;

        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        // @ts-ignore
        const uuid = skeleton.skeletonData._uuid;
        // @ts-ignore
        const cache = skeleton._skeletonCache.initAnimationCache(uuid, 'empty');

        if (1) { // AnimationCache#begin
            cache.constructor.prototype.begin = function (spSkeleton) {
                if (!this._invalid) return;

                // const skeletonInfo = this._skeletonInfo;
                // const preAnimationCache = skeletonInfo.curAnimationCache;
                // If pre animation not finished, play it to the end.
                // if (preAnimationCache && preAnimationCache !== this) {
                //     preAnimationCache.updateToFrame();
                // }
                // @ts-ignore
                const skeleton = new sp.spine.Skeleton(spSkeleton._skeleton.data);
                // @ts-ignore
                const clipper = new sp.spine.SkeletonClipping();
                // @ts-ignore
                const stateData = new sp.spine.AnimationStateData(skeleton.data);
                // @ts-ignore
                const state = new sp.spine.AnimationState(stateData);
                const listener = new TrackEntryListeners();
                state.addListener(listener);

                this._skeleton = skeleton;
                this._clipper = clipper;
                this._state = state;

                const animation = skeleton.data.findAnimation(this._animationName);
                state.setAnimationWith(0, animation, false);
                this.bind(listener);

                // record cur animation cache
                // skeletonInfo.curAnimationCache = this;
                this._frameIdx = -1;
                this.isCompleted = false;
                this.totalTime = 0;
                this._invalid = false;
            };
        }

        if (0) { // AnimationCache#bind
            // cache.constructor.prototype.bind = function (listener) {
            //     const completeHandle = function (entry) {
            //         warn('completed', entry && entry.animation.name);
            //         if (entry && entry.animation.name === this._animationName) {
            //             warn('completed match', this._animationName);
            //             this.isCompleted = true;
            //         }
            //     }.bind(this);
            //     warn('bind', this._animationName);
            //     listener.complete = completeHandle;
            // };
        }

        if (1) { // AnimationCache#updateToFrame
            cache.constructor.prototype.updateToFrame = function (toFrameIdx) {
                if (!this._inited) return;

                if (!this._needToUpdate(toFrameIdx)) return;

                // const skeletonInfo = this._skeletonInfo;
                const skeleton = this._skeleton;
                if (!skeleton) {
                    return;
                }
                const clipper = this._clipper;
                const state = this._state;

                // if (this._frameIdx !== -1) {
                //     if (this._animationName !== state.tracks[0].animation.name) {
                //         log('updateToFrame setAnimationWith', this._animationName);
                //         const animation = skeleton.data.findAnimation(this._animationName);
                //         state.setAnimationWith(0, animation, false);

                //         skeleton.update(FrameTime * this._frameIdx);
                //         state.update(FrameTime * this._frameIdx);
                //         state.apply(skeleton);
                //         skeleton.updateWorldTransform();
                //     }
                // }

                do {
                    // Solid update frame rate 1/60.
                    skeleton.update(FrameTime);
                    state.update(FrameTime);
                    state.apply(skeleton);
                    skeleton.updateWorldTransform();
                    this._frameIdx += 1;
                    this._updateFrame(skeleton, clipper, this._frameIdx);
                    this.totalTime += FrameTime;
                } while (this._needToUpdate(toFrameIdx));

                this.end();
            };
        }

        if (0) { // SkeletonCache#getSkeletonCache
            // skeleton._skeletonCache.constructor.prototype.getSkeletonCache = function (uuid, skeletonData) {
            //     let skeletonInfo = this._skeletonCache[uuid];
            //     if (!skeletonInfo) {
            //         const skeleton = new spine.Skeleton(skeletonData);
            //         const clipper = new spine.SkeletonClipping();
            //         const stateData = new spine.AnimationStateData(skeleton.data);
            //         const state = new spine.AnimationState(stateData);
            //         const listener = new TrackEntryListeners();
            //         state.addListener(listener);

            //         this._skeletonCache[uuid] = skeletonInfo = {
            //             skeleton,
            //             clipper,
            //             state,
            //             listener,
            //             // Cache all kinds of animation frame.
            //             // When skeleton is dispose, clear all animation cache.
            //             animationsCache : {},
            //             curAnimationCache: null,
            //         };
            //     }
            //     return skeletonInfo;
            // };
        }

        if (1) { // sp.Skeleton#setAnimation
            sp.Skeleton.prototype.setAnimation = function (trackIndex, name, loop) {

                this._playTimes = loop ? 0 : 1;
                this._animationName = name;

                if (this.isAnimationCached()) {
                    if (trackIndex !== 0) {
                        warn('Track index can not greater than 0 in cached mode.');
                    }
                    if (!this._skeletonCache) return null;
                    let cache = this._skeletonCache.getAnimationCache(this.skeletonData._uuid, name);
                    if (!cache) {
                        cache = this._skeletonCache.initAnimationCache(this.skeletonData._uuid, name);
                        if (DEBUG && !cache) {
                            warn('SpSkeletonHack#setAnimation', 'no', name);
                        }
                        cache.begin(this);
                    }
                    if (cache) {
                        this._isAniComplete = false;
                        this._accTime = 0;
                        this._playCount = 0;
                        this._frameCache = cache;
                        // this._frameCache.updateToFrame(0);
                        this._curFrame = this._frameCache.frames[0];
                    }
                } else {
                    if (this._skeleton) {
                        const animation = this._skeleton.data.findAnimation(name);
                        if (!animation) {
                            // @ts-ignore
                            logID(7509, name);
                            return null;
                        }
                        const res = this._state.setAnimationWith(trackIndex, animation, loop);
                        this._state.apply(this._skeleton);
                        return res;
                    }
                }
                return null;
            };
        }
        // this.schedule(
        //     () => {
        //         const name = randomItem(names);
        //         log('setAnimation', name);
        //         ske.setAnimation(0, name, true);
        //     },
        //     1,
        // );
        // this.scheduleOnce(
        //     () => {
        //         this.unscheduleAllCallbacks();
        //         this.schedule(
        //             () => {
        //                 const name = randomItem(names);
        //                 log('setAnimation', name);
        //                 ske.setAnimation(0, name, true);
        //             },
        //             5,
        //         );
        //     },
        //     10,
        // );
    }

    public hack_2_0_10(skeletonNode: Node) {
        if (hacked) {
            return;
        }
        hacked = true;

        const skeleton = skeletonNode.getComponent(sp.Skeleton);
        // @ts-ignore
        const uuid = skeleton.skeletonData._uuid;
        // skeleton._skeletonCache.initAnimationCache(uuid, 'empty');
        // @ts-ignore
        const cache = skeleton._skeletonCache.updateAnimationCache(uuid, 'empty');

        if (1) { // AnimationCache#begin
            cache.constructor.prototype.begin = function (spSkeleton) {
                // const skeletonInfo = this._skeletonInfo;
                // If pre animation not finished, play it to the end.
                // if (skeletonInfo.curAnimationCache) {
                //     // skeletonInfo.curAnimationCache.updateToFrame();
                // }
                // const skeleton = spSkeleton._skeleton;
                // @ts-ignore
                const skeleton = new sp.spine.Skeleton(spSkeleton._skeleton.data);
                // @ts-ignore
                const clipper = new sp.spine.SkeletonClipping();
                // @ts-ignore
                const stateData = new sp.spine.AnimationStateData(skeleton.data);
                // @ts-ignore
                const state = new sp.spine.AnimationState(stateData);
                const listener = new TrackEntryListeners();
                state.addListener(listener);

                this._skeleton = skeleton;
                this._clipper = clipper;
                this._state = state;

                const animation = skeleton.data.findAnimation(this._animationName);
                state.setAnimationWith(0, animation, false);
                this.bind(listener);

                // record cur animation cache
                // skeletonInfo.curAnimationCache = this;
                this._frameIdx = -1;
                this.isCompleted = false;
                this.totalTime = 0;
            };
        }

        if (0) { // AnimationCache#bind
            // cache.constructor.prototype.bind = function (listener) {
            //     const completeHandle = function (entry) {
            //         warn('completed', entry && entry.animation.name);
            //         if (entry && entry.animation.name === this._animationName) {
            //             warn('completed match', this._animationName);
            //             this.isCompleted = true;
            //         }
            //     }.bind(this);
            //     warn('bind', this._animationName);
            //     listener.complete = completeHandle;
            // };
        }

        if (1) { // AnimationCache#updateToFrame
            cache.constructor.prototype.updateToFrame = function (toFrameIdx) {
                if (!this._needToUpdate(toFrameIdx)) return;

                // const skeletonInfo = this._skeletonInfo;
                const skeleton = this._skeleton;
                if (!skeleton) {
                    return;
                }
                const clipper = this._clipper;
                const state = this._state;

                // if (this._frameIdx !== -1) {
                //     if (this._animationName !== state.tracks[0].animation.name) {
                //         log('updateToFrame setAnimationWith', this._animationName);
                //         const animation = skeleton.data.findAnimation(this._animationName);
                //         state.setAnimationWith(0, animation, false);

                //         skeleton.update(FrameTime * this._frameIdx);
                //         state.update(FrameTime * this._frameIdx);
                //         state.apply(skeleton);
                //         skeleton.updateWorldTransform();
                //     }
                // }

                do {
                    // Solid update frame rate 1/60.
                    skeleton.update(FrameTime);
                    state.update(FrameTime);
                    state.apply(skeleton);
                    skeleton.updateWorldTransform();
                    this._frameIdx += 1;
                    // log('_updateFrame', this._animationName, this._frameIdx);
                    this._updateFrame(skeleton, clipper, this._frameIdx);
                    this.totalTime += FrameTime;
                } while (this._needToUpdate(toFrameIdx));

                this.end();
            };
        }

        if (0) { // SkeletonCache#getSkeletonCache
            // skeleton._skeletonCache.constructor.prototype.getSkeletonCache = function (uuid, skeletonData) {
            //     let skeletonInfo = this._skeletonCache[uuid];
            //     if (!skeletonInfo) {
            //         const skeleton = new spine.Skeleton(skeletonData);
            //         const clipper = new spine.SkeletonClipping();
            //         const stateData = new spine.AnimationStateData(skeleton.data);
            //         const state = new spine.AnimationState(stateData);
            //         const listener = new TrackEntryListeners();
            //         state.addListener(listener);

            //         this._skeletonCache[uuid] = skeletonInfo = {
            //             skeleton,
            //             clipper,
            //             state,
            //             listener,
            //             // Cache all kinds of animation frame.
            //             // When skeleton is dispose, clear all animation cache.
            //             animationsCache : {},
            //             curAnimationCache: null,
            //         };
            //     }
            //     return skeletonInfo;
            // };
        }

        if (1) { // sp.Skeleton#setAnimation
            sp.Skeleton.prototype.setAnimation = function (trackIndex, name, loop) {

                this._playTimes = loop ? 0 : 1;
                this._animationName = name;

                if (this.isAnimationCached()) {
                    if (trackIndex !== 0) {
                        warn('Track index can not greater than 0 in cached mode.');
                    }

                    let cache = this._skeletonCache.getAnimationCache(this.skeletonData._uuid, name);
                    // if (cache && !cache.isCompleted) {
                    //     cache.bind(cache._skeletonInfo.listener);

                    // const animation = this.findAnimation(this._animationName);
                    // const skeletonInfo = cache._skeletonInfo;
                    // const skeleton = skeletonInfo.skeleton;
                    // const state = skeletonInfo.state;
                    // skeleton.setToSetupPose();
                    // skeleton.time = 0;
                    // state.clearTracks();
                    // state.update(0);

                    // state.setAnimationWith(0, animation, false);

                    // }
                    if (!cache) {
                        cache = this._skeletonCache.initAnimationCache(this.skeletonData._uuid, name);
                        if (DEBUG && !cache) {
                            warn('SpSkeletonHack#setAnimation', 'no', name);
                        }
                        cache.begin(this);
                    }
                    if (cache) {
                        this._isAniComplete = false;
                        this._accTime = 0;
                        this._playCount = 0;
                        this._frameCache = cache;
                        this._curFrame = this._frameCache.frames[0];
                    }
                } else {
                    if (this._skeleton) {
                        const animation = this._skeleton.data.findAnimation(name);
                        if (!animation) {
                            // @ts-ignore
                            logID(7509, name);
                            return null;
                        }
                        const res = this._state.setAnimationWith(trackIndex, animation, loop);
                        this._state.apply(this._skeleton);
                        return res;
                    }
                }
                return null;
            };
        }
        // this.schedule(
        //     () => {
        //         const name = randomItem(names);
        //         log('setAnimation', name);
        //         ske.setAnimation(0, name, true);
        //     },
        //     1,
        // );
        // this.scheduleOnce(
        //     () => {
        //         this.unscheduleAllCallbacks();
        //         this.schedule(
        //             () => {
        //                 const name = randomItem(names);
        //                 log('setAnimation', name);
        //                 ske.setAnimation(0, name, true);
        //             },
        //             5,
        //         );
        //     },
        //     10,
        // );
    }
}

export function genSkeletonData(skeletonJson: any, atlasText: string, textureNames: string[], textures: Texture2D[]): sp.SkeletonData {
    // const getTexture = function (line) {
    //     const names = textureNames;
    //     for (let i = 0; i < names.length; i += 1) {
    //         if (names[i] === line) {
    //             const texture = textures[i];
    //             const tex = new sp.SkeletonTexture({ width: texture.width, height: texture.height });
    //             tex.setRealTexture(texture);
    //             return tex;
    //         }
    //     }
    //     return null;
    // };

    // const atlas = new sp.spine.TextureAtlas(atlasText, getTexture);
    // const attachmentLoader = new sp.spine.AtlasAttachmentLoader(atlas);
    // const jsonReader = new sp.spine.SkeletonJson(attachmentLoader);
    // jsonReader.scale = 1;
    // // atlas.dispose(jsonReader);

    // const skeletonData = jsonReader.readSkeletonData(skeletonJson);

    const skeletonData = new sp.SkeletonData();
    // @ts-ignore
    skeletonData.textureNames = textureNames;
    skeletonData.textures = textures;
    skeletonData.atlasText = atlasText;
    skeletonData.skeletonJson = JSON.parse(skeletonJson);

    return skeletonData;
}

export function genSkeleton(data: sp.SkeletonData, cacheMode: number = 1, defaultAnimation: string = '', node: Node= null) {
    if (!node) {
        node = new Node();
    }
    const skeleton = node.addComponent(sp.Skeleton);
    skeleton.skeletonData = data;
    if (cacheMode) {
        // @ts-ignore
        skeleton.setAnimationCacheMode(cacheMode);  // sp.Skeleton.AnimationCacheMode.SHARED_CACHE = 1
    }
    skeleton.defaultAnimation = defaultAnimation || 'empty';
    // @ts-ignore
    skeleton._updateSkeletonData();
    return skeleton;
}
