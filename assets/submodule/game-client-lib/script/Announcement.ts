import { _decorator, Button, CCBoolean, CCFloat, CCString, Component, EventKeyboard, EventTouch, Input, input, KeyCode, NodeEventType, sp, Touch, Tween, tween } from 'cc';
import { DEBUG } from 'cc/env';
import { audioPlay, audioStopLoop } from '../component/Audio';
import { getLang } from '../component/I18nManager';
import ColBase from '../data/ColBase';
import { nodeTweenToPromise } from '../data/NodeTween';
import { BigWinPlayData, defaultBigWinConfig } from '../ui/BigWinBase';
import { balanceNumber, balanceThousandth, fixThousandth3 } from '../utils/Balance';
import { delayTime, fadeTo, scaleTo, sequence } from '../utils/Tween';
import { log, setNodeOpacity, warn } from '../utils/Utils';
import { resolveWrapper2, schedulePromise, spSkeletonSetAnimation, spSkeletonSetAnimationToPromise } from './PromiseManager';

const { ccclass, property } = _decorator;

enum audioKey {
    bigwin_score = 0,
    bigwin_count = 1,
    bigwin_before_count = 2,
}

@ccclass
export default class Announcement extends Component {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    /**
     * 啟動時可播放多組spine動畫，動畫名稱在 animations。
     */
    @property([sp.Skeleton])
    skeletons: sp.Skeleton [] = [];

    @property(CCString)
    annSkins: string = '';

    @property(CCFloat)
    duration: number = 0;

    @property(CCBoolean)
    bigWin: boolean = false;

    public bigWinPlayData: BigWinPlayData = null;
    private bigWinTween: Tween = null;

    @property(CCFloat)
    fadeDuration: number = 0;

    @property(CCFloat)
    stayDuration: number = 0;

    @property(CCString)
    animation: string = '';

    /**
     * 與 skeletons 相應的動畫名稱
     * 可播放連續多組動畫 enter -> xxx -> loop
     * 動畫名稱用”逗號“隔開
     * e.g.
     * ani_totalwin_start,ani_totalwin_loop
     */
    @property([CCString])
    animations: string[] = [];

    @property(CCBoolean)
    enterLoopPostfix: boolean = false;

    @property(CCString)
    audioNames: string[] = [];

    /**
     * audioKey.bigwin_count 音效 delay 多久後才開始播放
     */
    @property(CCFloat)
    audioKeyBigwinCountDelay:number = 0;

    @property({ tooltip:'啟用Skeleton結束動畫' })
    enableEndSkeleton: boolean = false;

    @property({ type:[sp.Skeleton], visible() { return this.enableEndSkeleton; } })
    endSkeletons:sp.Skeleton[] = [];

    @property({ type:[CCString], visible() { return this.enableEndSkeleton; } })
    endAnimations: string[] = [];

    private resolve: Function = null;
    private ending: boolean = false;

    /**
     * 預設N秒後，可由 space || enter 觸發 onCloseClick
     */
    private allowSkip:boolean = false;

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            if (this.resolve && this.node.active && this.allowSkip) {
                this.simulateStartClick();
            }
        }
    }

    /**
     * 模擬開始按鈕被點擊
     */
    private simulateStartClick() {
        const buttonNode = this.getComponentInChildren(Button).node;
        const fakeTouch = new Touch(0, 0, 0);  // id 為 0

        // 模擬 TOUCH_START（啟動 pressed 狀態，觸發動畫）
        const touchStartEvent = new EventTouch([fakeTouch], true, NodeEventType.TOUCH_START, [fakeTouch]);
        buttonNode.dispatchEvent(touchStartEvent);

        // 延遲模擬 TOUCH_END（重置狀態，觸發 click 事件）
        this.scheduleOnce(() => {
            const touchEndEvent = new EventTouch([fakeTouch], true, NodeEventType.TOUCH_END, [fakeTouch]);
            buttonNode.dispatchEvent(touchEndEvent);
        },                0.15);
    }

    public async play(): Promise<any> {
        this.allowSkip = false;
        this.resolve?.();
        this.resolve = null;
        this.unscheduleAllCallbacks();
        this.node.active = true;
        this.ending = false;

        this.audioPlay2(audioKey.bigwin_before_count, true);

        const ske = this.skeleton;
        const skes = this.skeletons;
        if (this.enterLoopPostfix) {
            setNodeOpacity(this.node, 255);
            const enter = `${this.animation}_enter`;
            const loop = `${this.animation}_loop`;
            if (DEBUG) {
                if (ske) {
                    const ae = ske.findAnimation(enter);
                    const al = ske.findAnimation(loop);
                    if (!ae || !al) {
                        warn('Announcement no enter loop animation', this.skeleton, this.animation);
                    }
                }
            }
            let dur = this.duration;
            if (this.bigWin) {
                const t = tween({ wins: 0 });
                const d = this.bigWinPlayData;
                const sec = d.sec ? d.sec : defaultBigWinConfig.big.sec; // 若出現小於正常 big 的 level，則吃 big 秒數。
                log('Announcement bigWin play', d);
                const col = this.getComponentsInChildren(ColBase).find(col => col.colKey === 'wins');
                t.to(sec, { wins: balanceNumber(d.wins) }, {
                    onUpdate(target:{wins:number}) {
                        col.reset(fixThousandth3('' + target.wins));
                    },
                }).start();
                this.audioPlay2(audioKey.bigwin_count, true);
                this.bigWinTween = t;
                dur = sec;
            }
            if (ske) {
                spSkeletonSetAnimation(ske, [enter, loop], true);
                this.setSkin(ske);
            }
            if (skes.length) {
                skes.forEach((sk, idx) => {
                    const anims = this.animations[idx].split(',');
                    spSkeletonSetAnimation(sk, anims, true);
                    this.setSkin(sk);
                });
            }
            const p = new Promise((resolve) => {
                this.resolve = resolve;
            });
            const next = () => {
                this.end(false);
            };
            this.scheduleOnce(next, dur);
            this.scheduleOnce(() => this.allowSkip = true , this.stayDuration + this.fadeDuration + 0.2);
            return p;
        } else {
            setNodeOpacity(this.node, 0);
            nodeTweenToPromise({
                node: this.node,
                action: fadeTo(this.fadeDuration, 255),
            });
            this.scheduleOnce(() => this.allowSkip = true , this.stayDuration + this.fadeDuration + 0.2);
            if (ske) {
                const p = resolveWrapper2(this.duration, spSkeletonSetAnimationToPromise(ske, this.animation));
                this.setSkin(ske);
                await p;
            }
            if (skes.length) {
                skes.forEach((sk, idx) => {
                    const anims = this.animations[idx].split(',');
                    spSkeletonSetAnimation(sk, anims, true);
                    this.setSkin(sk);
                });
                await schedulePromise(this.duration);
            }
            await this.end(false);
        }
    }

    public onCloseClick() {
        if (this.ending) {
            return;
        }
        this.end(true);
    }

    private async end(byClick: boolean) {
        if (this.ending) {
            return;
        }
        this.ending = true;
        if (this.enableEndSkeleton) {
            const endSks = this.endSkeletons;
            const endAnims = this.endAnimations;
            if (endSks.length === endAnims.length) {
                endSks.forEach((sk, idx) => {
                    spSkeletonSetAnimation(sk, endAnims[idx]);
                    this.setSkin(sk);
                });
            }
        }
        if (this.bigWin) {
            const d = this.bigWinPlayData;
            this.bigWinTween.stop();
            const col = this.getComponentsInChildren(ColBase).find(col => col.colKey === 'wins');
            col.reset(balanceThousandth(d.wins));
            this.audioPlay2(audioKey.bigwin_score, true);
            this.audioPlay2(audioKey.bigwin_count, false);
            await nodeTweenToPromise({
                node: col.node,
                action: sequence(
                    scaleTo(.1, 1.1, 1.2),
                    scaleTo(.05, 1, 1),
                ),
            });
            await nodeTweenToPromise({
                node: this.node,
                action: delayTime(2 + (byClick ? 1 : 0)),
            });
        }
        await nodeTweenToPromise({
            node: this.node,
            action: fadeTo(this.fadeDuration, 0),
        });
        this.node.active = false;
        this.resolve?.();
        this.resolve = null;
        this.unscheduleAllCallbacks();
    }

    private async audioPlay2(key: audioKey, able: boolean) {
        const name = this.audioNames[key];
        if (key === audioKey.bigwin_count) {
            if (able) {
                if (this.audioKeyBigwinCountDelay > 0) {
                    await schedulePromise(this.audioKeyBigwinCountDelay);
                    if (this.ending) {
                        return;
                    }
                }
                audioPlay(name, { loop: true });
            } else {
                audioStopLoop(name);
            }
        } else {
            audioPlay(name);
        }
    }

    private setSkin(sk:sp.Skeleton) {
        if (this.annSkins) {
            const lang = getLang();
            const arr = this.annSkins.split(',');
            let skin = arr[0];
            if (arr.indexOf(lang) !== -1) {
                skin = lang;
            }
            sk.setSkin(skin);
        }
    }

    public setAllowSkip(able:boolean) {
        this.allowSkip = able;
    }

    public setResolve(resolve:Function) {
        this.resolve = resolve;
    }
}
