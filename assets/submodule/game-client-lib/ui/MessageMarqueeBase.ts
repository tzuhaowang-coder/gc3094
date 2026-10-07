
import { _decorator, Animation, CCBoolean, CCString, Label, Node, sp, Tween, UIOpacity } from 'cc';
import SlotMarquee, { getMarqueeDataString, MarqueeData, setMessage } from '../component/SlotMarquee';
import { TemplateGenerator } from '../component/TemplateGenerator';
import { applyNodeTween } from '../data/NodeTween';
import { animationPlay, animationPlayToPromise, resolveWrapper, spSkeletonSetAnimation, spSkeletonSetAnimationToPromise, tweenNumberToPromise } from '../script/PromiseManager';
import { balanceNumber, fixThousandth3, safeDiv } from '../utils/Balance';
import { repeat, scaleTo, sequence } from '../utils/Tween';
import { setNodeScale } from '../utils/Utils';

const { ccclass, property } = _decorator;

export type MessageSlotType = 'marquee' | 'message' | 'message_win';

export enum MessageSlotTypeEnum {
    MARQUEE = 'marquee',
    MESSAGE = 'message',
    MESSAGE_WIN = 'message_win',
}

export type MessageData = MarqueeData;
// tslint:disable-next-line:variable-name
export let MessageData = MarqueeData;

export type MessageSlotLv = 1 | 2 | 3;

@ccclass
export default abstract class MessageMarqueeBase extends TemplateGenerator {

    @property(CCBoolean)
    v2:boolean = false;

    @property(CCString)
    prefix: string = '';

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(sp.Skeleton)
    skeletonWin: sp.Skeleton = null;

    @property(SlotMarquee)
    marquee: SlotMarquee = null;

    @property(Node)
    messageNode: Node = null;

    @property(Animation)
    messageAnimation: Animation = null;

    protected message: string = '';
    protected lv: MessageSlotLv = 1;
    protected type: MessageSlotType = null;
    protected tween: Tween = null;
    private msgNodeUIOpa:UIOpacity = null;

    /**
     * message 最後哪個 msg 的 template，讓我可以判斷要回收到哪個 pool
     */
    private lastMessageTemplateIdx:number = -1;

    onLoad() {
        super.onLoad();
        this.pre();
    }

    doOnLoad?(): void;

    private loaded: boolean = false;

    protected pre(): void {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.msgNodeUIOpa = this.messageNode.getComponent(UIOpacity);
        if (!this.msgNodeUIOpa) {
            this.msgNodeUIOpa = this.messageNode.addComponent(UIOpacity);
        }

        this.play(1, MessageSlotTypeEnum.MARQUEE, []);
        this.doOnLoad?.();
    }

    private async board(lv: MessageSlotLv, type: MessageSlotType): Promise<any> {
        const ske = this.skeleton;
        if (this.v2) {
            const messageOnly = (type === MessageSlotTypeEnum.MESSAGE);                              // 訊息文字
            const forceWin = (type === MessageSlotTypeEnum.MESSAGE_WIN) && this.lv >= lv;            // 贏分強制播放
            const upgradeWin = (type === MessageSlotTypeEnum.MESSAGE_WIN) && this.lv < lv;           // 贏分升級
            const downgrade =  (type === MessageSlotTypeEnum.MARQUEE) && (this.lv > lv || lv === 1); // 降級播放回一般跑馬燈

            const normalAnimName = `ani_mar_lv${lv}`;
            if (messageOnly) {
                spSkeletonSetAnimation(ske, normalAnimName, true);
            }else if (forceWin) {
                spSkeletonSetAnimation(ske, [`ani_mar_win_lv${lv}`, normalAnimName], true);
            }else if (upgradeWin) {
                spSkeletonSetAnimation(ske, [`ani_mar_win_lv${this.lv}_lv${lv}`, normalAnimName], true);
            }else if (downgrade) {
                spSkeletonSetAnimation(ske, [`ani_mar_lv${this.lv}_lv${lv}`, normalAnimName], true);
            }

        }else {
            const prefix = this.prefix || 'ani_mar';
            const mar = `${prefix}_lv${lv}`;
            if (this.lv !== lv) {
                const mar2 = `${prefix}_lv${this.lv}to_lv${lv}`;
                const a = ske.findAnimation(mar2);
                if (a && a.duration) {
                    spSkeletonSetAnimation(ske, [mar2, mar], true);
                } else {
                    spSkeletonSetAnimation(ske, mar, true);
                }
            } else {
                spSkeletonSetAnimation(ske, mar, true);
            }
        }
    }

    public async play(lv: MessageSlotLv, type: MessageSlotType | MessageSlotTypeEnum, messageData: MarqueeData | MarqueeData[]) {
        if ([1, 2, 3].indexOf(lv) === -1) {
            return;
        }

        this.showMsgOrMar(type);
        this.board(lv, type);
        this.lv = lv;
        if (type === MessageSlotTypeEnum.MESSAGE || type === MessageSlotTypeEnum.MESSAGE_WIN) {
            const md = ([] as MarqueeData[]).concat(messageData)[0];
            this.type = type;
            const message = md.toString();
            const eq = this.message === md.toString();
            this.message = message;

            if (this.v2) {
                if (this.messageNode.children.length) {
                    this.recycleNode(this.messageNode.children[0], this.lastMessageTemplateIdx);
                }
                this.lastMessageTemplateIdx = md.tpl;
                const node = this.getNode(md.tpl);
                const score = md.score;
                this.messageNode.addChild(node);
                setMessage(node, md.message);
                if (score && score.wins && score.totalBet) { // 執行跑分
                    const times = safeDiv(score.wins, score.totalBet);
                    if (this.messageAnimation) {
                        animationPlay(this.messageAnimation, 0);
                    }
                    if (times >= 5 && times < 10) {
                        score.setNumStartCallBack && score.setNumStartCallBack();
                        await this.playRunScore(score.wins, score.setNumRunningCallBack);
                        score.setNumEndCallBack && score.setNumEndCallBack();
                    }
                    if (!score.setNumEndNotPlayBoardWin) {
                        this.board(lv, type); // 在播放一次贏分動畫
                    }
                }else if (md.animation) {
                    let p = Promise.resolve();
                    if (md.message && this.messageAnimation) {
                        p = animationPlayToPromise(this.messageAnimation, 0);
                    }
                    await resolveWrapper(p);
                }
                return node;
            }else {
                const skew = this.skeletonWin;
                const prefix = this.prefix || 'ani_mar';

                if (!eq) {
                    if (this.messageNode.children.length) {
                        this.recycleNode(this.messageNode.children[0], -1);
                    }
                    const node = this.getNode(md.tpl);
                    this.messageNode.addChild(node);
                    setMessage(node, md.message);
                    if (md.animation) {
                        const p = spSkeletonSetAnimationToPromise(skew, `${prefix}_win_lv${lv}`, 0, md.animationEnactive);
                        let p2 = Promise.resolve();
                        if (md.message && this.messageAnimation) {
                            p2 = animationPlayToPromise(this.messageAnimation, 0);
                        }
                        await resolveWrapper(Promise.all([p, p2]));
                        return node;
                    } else {
                        spSkeletonSetAnimation(skew, [`${prefix}_win_lv${lv}`, `${prefix}_lv${lv}`]);
                        return node;
                    }
                } else {
                    const node = this.messageNode.children[0];
                    return node;
                }
            }
        } else { // marquee
            const mds = ([] as MarqueeData[]).concat(messageData);
            if (this.type === MessageSlotTypeEnum.MARQUEE) {
                const str = this.marquee.getString();
                const str2 = getMarqueeDataString(mds);
                if (str === str2) {
                    return;
                }
            }
            this.type = type;
            this.marquee.play(mds);
        }
    }

    public beat(able: boolean) {
        if (able) {
            if (!this.tween) {
                this.tween = applyNodeTween({
                    node: this.messageNode,
                    action: repeat(
                        sequence(
                            scaleTo(.2, 1.1, 1.1),
                            scaleTo(.2, 1, 1),
                        ),
                        1000000,
                    ),
                });
            }
        } else {
            setNodeScale(this.messageNode, 1);
            this.tween?.stop();
            this.tween = null;
        }
    }

    /**
     * message、marquee 互斥顯示。用透明度開關顯示。
     * 因 marquee 底下有過多節點（主因為ArtLabel），active 開關顯示造成性能問題。
     */
    public showMsgOrMar(target:MessageSlotType) {
        if (target === MessageSlotTypeEnum.MESSAGE || target === MessageSlotTypeEnum.MESSAGE_WIN) {
            this.msgNodeUIOpa.opacity = 255;
            if (this.marquee.marParentUIOpa) {
                this.marquee.marParentUIOpa.opacity = 0;
            }
        }else {
            this.msgNodeUIOpa.opacity = 0;
            if (this.marquee.marParentUIOpa) {
                this.marquee.marParentUIOpa.opacity = 255;
            }
        }
    }

    /**
     *
     * @param wins
     * @param setNumCallBack 執行跑分時 callback
     */
    private async playRunScore(wins:number, setNumCallBack:Function):Promise<any> {
        const node = this.messageNode.children[0];
        const label = node.getComponentInChildren(Label);
        const balanceWin = balanceNumber(wins);
        const setNum = (n: number) => {
            setNumCallBack && setNumCallBack();
            label.string = fixThousandth3('' + n);
        };
        setNum(0);
        return tweenNumberToPromise(0, balanceWin, 1.3, setNum);
    }
}
