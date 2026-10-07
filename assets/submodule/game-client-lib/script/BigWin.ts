import { _decorator, Button, CCString, clamp, EventKeyboard, Input, input, KeyCode, Label, lerp, Node, sp, Tween, v2 } from 'cc';
import { audioPlay, audioPlayBGM, audioPreload, audioStopLoop } from '../component/Audio';
import { getLang } from '../component/I18nManager';
import { applyNodeTween, nodeTweenToPromise } from '../data/NodeTween';
import { globalDebugNNN } from '../LibGlobal';
import BigWinBase, { BIG_WIN_LEVEL, BigWinConfig, BigWinData, calculate, nextLevel } from '../ui/BigWinBase';
import { balanceThousandth, fixThousandth3 } from '../utils/Balance';
import { callFunc, delayTime, fadeIn, fadeOut, moveTo, place, sequence, stopAllActions } from '../utils/Tween';
import { log, setNodeOpacity, setNodeScale } from '../utils/Utils';
import { spSkeletonApply } from './PromiseManager';

const { ccclass, property } = _decorator;

const MAX_SCALE: number = 1.1;

enum audioKey {
    bgm = 0,
    count = 1,
    big = 2,
    super = 3,
    epic = 4,
    mega = 5,
    finish = 6,
}

@ccclass
export default class BigWin extends BigWinBase {

    async preload(): Promise<void> {
        audioPreload(this.audioNames);
    }

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    private resolve: Function;

    private updateWins: boolean = false;

    @property(Label)
    winsLabel: Label = null;

    @property(Button)
    closeButton: Button = null;

    @property(CCString)
    bigWinSkins:string = '';

    @property([CCString])
    audioNames: string[] = [];

    @property
    bigWinLevelsV2: boolean = false;

    private fakeNode: Node = new Node();

    private level: BIG_WIN_LEVEL = BIG_WIN_LEVEL.NONE;
    private levelUpAt: number = 0;

    private delta: number = 0;

    onLoad() {
        globalDebugNNN(this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            log('space');
            if (this.resolve && this.closeButton.node.active) {
                this.onCloseClick();
            }
        }
    }

    /**
     * 结束 及 按下 mask 强制结束时
     */
    public done(byClick: boolean = false)  {
        this.doDone?.();
        setNodeOpacity(this.node, 255);
        stopAllActions(this.fakeNode);
        this.setUpdateWins(false);
        // 跑到结尾
        this.winsLabel.string = balanceThousandth(this.data.wins);
        // setNodeScale(this.skeleton.node, this.maxScaleXWin);

        this.closeButton.interactable = false;
        this.closeButton.node.active = false;

        const level = this.data.level;
        // 补跑，如果 level 还不是最后
        if (this.level !== level) {
            this.levelUp(level);
        }

        // audioStopLoop('S300001_award_count');
        this.audioPlay2(audioKey.finish);
        this.audioPlay2(audioKey.count, false);
        let delay = 0;
        if (byClick) {
            delay = 1;
        }

        audioPlayBGM('silent');
        return applyNodeTween({
            node: this.node,
            action: sequence(
                delayTime(2 + delay), // 停顿
                fadeOut(.5), // fade out
                callFunc(() => {
                    this.resolve && this.resolve();
                    this.reset();
                    this.node.active = false;
                }),
            ),
        });
    }
    protected doDone?():void;

    private reset(all:boolean= false) {
        this.closeButton.node.active = true;
        if (all) {
            this.closeButton.interactable = true;
        }
        this.resolve = null;
        this.delta = 0;
        stopAllActions(this.fakeNode);
        this.setUpdateWins(false);
        setNodeScale(this.winsLabel.node, 1);
    }

    onCloseClick() {
        this.done(true);
    }

    public play(totalBet: number, totalWins: number, config?: BigWinConfig): Promise<any> {
        this.reset(true);

        const data = new BigWinData(totalBet, totalWins, config);
        const p = new Promise((resolve) => {
            this.resolve = resolve;
        });

        applyNodeTween({
            node: this.node,
            action: fadeIn(1), // fade in
        });
        // 先自己用 总投 及 赢分 换算
        this.level = BIG_WIN_LEVEL.NONE;
        this.levelUpAt = 0;

        this.data = calculate(data.totalBet, data.totalWins, data.config, this.bigWinLevelsV2);

        const arr: Tween<Node>[] = [];
        arr.push(
            place(0, 0),
            callFunc(this.setUpdateWins.bind(this, true)),
        );
        this.data.each.forEach((x) => {
            // 之间做 levelUp
            if (x.levelUp) {
                arr.push(
                    callFunc(this.levelUp.bind(this, '')),
                );
            }
            arr.push(
                moveTo(x.sec, v2(x.wins, 0)),
            );
        });
        arr.push(
            callFunc(this.done.bind(this, false), this),
        );

        this.audioPlay2(audioKey.bgm);
        this.audioPlay2(audioKey.count);

        nodeTweenToPromise({
            node: this.fakeNode,
            action: sequence(...arr),
        });

        return p;
    }

    private levelUp(level: BIG_WIN_LEVEL) {
        level = level || nextLevel(this.level, this.bigWinLevelsV2);
        if (!level) {
            return;
        }

        this.doLevelUp?.(level);
        const key = `ani_ann_${level}win_enter`;
        const keyLoop = `ani_ann_${level}win_loop`;
        log('bw', key, keyLoop);

        this.level = level;
        this.levelUpAt = Date.now();
        // 背景
        this.skeleton.setAnimation(0, key, false);
        spSkeletonApply(this.skeleton);
        this.skeleton.addAnimation(0, keyLoop, true);
        this.setSkin(this.skeleton);

        const ak = {
            [BIG_WIN_LEVEL.BIG]: audioKey.big,
            [BIG_WIN_LEVEL.EPIC]:audioKey.epic,
            [BIG_WIN_LEVEL.MEGA]:  audioKey.mega,
            [BIG_WIN_LEVEL.SUPER]: audioKey.super,
        }[level];
        this.audioPlay2(ak);
    }
    protected doLevelUp?(level: BIG_WIN_LEVEL):void;

    public setUpdateWins(able: boolean) {
        this.updateWins = able;
    }

    update(dt: number) {
        if (this.updateWins) {
            this.delta += dt;
            const wins = this.fakeNode.position.x;
            this.winsLabel.string = fixThousandth3('' + wins);

            const at = this.levelUpAt;
            const d = Date.now() - at;
            const scale = lerp(1, MAX_SCALE, clamp((d / 1e3) / 5, 0, 1));
            setNodeScale(this.skeleton.node, scale);
        }
    }

    private audioPlay2(key: audioKey, able: boolean = true) {
        const name = this.audioNames[key];
        if (key === audioKey.bgm) {
            audioPlayBGM(name, 1, false);
        } else if (key === audioKey.count) {
            if (able) {
                audioPlay(name, { loop: true });
            } else {
                audioStopLoop(name);
            }
        } else {
            audioPlay(name);
        }
    }

    private setSkin(sk:sp.Skeleton) {
        if (this.bigWinSkins) {
            const lang = getLang();
            const arr = this.bigWinSkins.split(',');
            let skin = arr[0];
            if (arr.indexOf(lang) !== -1) {
                skin = lang;
            }
            sk.setSkin(skin);
        }
    }
}
