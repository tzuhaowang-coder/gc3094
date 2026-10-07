import { _decorator, Label, sp, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
import { MarqueeData } from '../submodule/game-client-lib/component/SlotMarquee';
import { translate } from '../submodule/game-client-lib/I18nGlobal';
import { spSkeletonSetAnimation } from '../submodule/game-client-lib/script/PromiseManager';
import MessageMarqueeBase, { MessageData, MessageSlotLv, MessageSlotType, MessageSlotTypeEnum } from '../submodule/game-client-lib/ui/MessageMarqueeBase';
import { balanceNumber, fixThousandth2, safeDiv } from '../submodule/game-client-lib/utils/Balance';
import { stopAllActions } from '../submodule/game-client-lib/utils/Tween';
import { setNodeScale } from '../submodule/game-client-lib/utils/Utils';

/**
 * 贏分前綴字串
 */
export enum MessageWinPrefixType {
    SHOW_NONE, // 顯示空字串
    SHOW_WIN, // 贏得
    SHOW_TOTAL_WIN, // 共贏得
}

// 跑馬燈為圖片美術字：resources/lang/<語系>/plist 的 tx_mar1~5，ResourcesSprite 依語系自動換圖
enum MarqueeTemplate {
    MARQUEE_TEMP_MAR_1, // 跑馬燈1(在框中贏獎獎勵[百搭])
    MARQUEE_TEMP_MAR_2, // 跑馬燈2(3胡 觸發10次免費旋轉)
    MARQUEE_TEMP_MAR_3, // 跑馬燈3(4胡 觸發15次免費旋轉)
    MARQUEE_TEMP_MAR_4, // 跑馬燈4(5個或更多胡 觸發20次免費旋轉)
    MARQUEE_TEMP_MAR_5, // 跑馬燈5(每次贏獎都會增加獎金倍數)
}

enum MessageTemplate {
    MESSAGE_TEMP_FONT,                  // Font (XXX)
    MESSAGE_TEMP_SPRITE_FONT_WIN,       // Sprite＋Font (贏得XXX)
    MESSAGE_TEMP_SPRITE_FONT_TOTAL_WIN, // Sprite＋Font (共贏得XXX)

    // 咪牌訊息為圖片美術字（tx_mar6~7）
    MESSAGE_TEMP_MAR_6,                 // 再來1個胡！
    MESSAGE_TEMP_MAR_7,                 // 贏得免費遊戲！
}

const { ccclass, property } = _decorator;

class MsgMarqueeData {
    public key: string;
    public templateIndex: number;
    constructor(key: string, templateIndex: number) {
        this.key = key;
        this.templateIndex = templateIndex;
    }
}

const MARQUEE_MSG = [
    new MsgMarqueeData('', MarqueeTemplate.MARQUEE_TEMP_MAR_1), // 在框中贏獎獎勵[百搭]
    new MsgMarqueeData('', MarqueeTemplate.MARQUEE_TEMP_MAR_2), // 3胡 觸發10次免費旋轉
    new MsgMarqueeData('', MarqueeTemplate.MARQUEE_TEMP_MAR_3), // 4胡 觸發15次免費旋轉
    new MsgMarqueeData('', MarqueeTemplate.MARQUEE_TEMP_MAR_4), // 5個或更多胡 觸發20次免費旋轉
    new MsgMarqueeData('', MarqueeTemplate.MARQUEE_TEMP_MAR_5), // 每次贏獎都會增加獎金倍數
];

const MESSAGE_MI_MSG = [
    new MsgMarqueeData('', MessageTemplate.MESSAGE_TEMP_MAR_6), // 再來1個胡！
    new MsgMarqueeData('', MessageTemplate.MESSAGE_TEMP_MAR_7), // 贏得免費遊戲！
];

@ccclass
export default class MessageMarquee extends MessageMarqueeBase {

    /** 強調字（贏得）：編輯器預建的隱藏複本，播放大淡出用，不動原本跑馬燈的字。金額 Label 與根節點的 UIOpacity 都在編輯器綁好 */
    @property(Label)
    emphasisWinLabel: Label = null;

    @property(UIOpacity)
    emphasisWinOpacity: UIOpacity = null;

    /** 強調字（共贏得）：同上 */
    @property(Label)
    emphasisTotalWinLabel: Label = null;

    @property(UIOpacity)
    emphasisTotalWinOpacity: UIOpacity = null;

    /** 殘影交叉淡化用：編輯器預建的常駐殘影骨骼節點，預設關閉，跟 skeleton 疊在同一位置 */
    @property(sp.Skeleton)
    ghostSkeleton: sp.Skeleton = null;

    /** 目前骨骼是不是正在播動畫（loop 或進場動畫），只有動畫要接回靜止畫面 ani_mar_lv{lv} 前才需要淡化 */
    private skeletonAnimated: boolean = false;

    doOnLoad(): void {
        this.messageAnimation = null;
    }

    /**
     * 咪牌使用的 Message
     */
    public playMIMessage(miMsgIdx: number) {
        const data = MESSAGE_MI_MSG[miMsgIdx];
        const str = translate(data.key);
        const tmpIdx = data.templateIndex;
        return this.play(1, MessageSlotTypeEnum.MESSAGE, new MessageData(str, tmpIdx, true, false));
    }

    /**
     * 中獎動畫播完接著播 loop，不跳回待機。
     * 贏分 5~10 倍時，跑分結束後要再補播一次 loop；其他倍率不用補。
     */
    public async play(lv: MessageSlotLv, type: MessageSlotType | MessageSlotTypeEnum, messageData: MessageData | MessageData[], staysAnimated: boolean = false) {
        // MARQUEE、MESSAGE 這次呼叫結束後會落回靜止畫面 ani_mar_lv{lv}；
        // staysAnimated 給呼叫端事後會覆蓋成動畫的情況（例如純數字接 _1）用，代表這次結束後其實還是動畫
        const endsAnimated = staysAnimated || (type !== MessageSlotTypeEnum.MARQUEE && type !== MessageSlotTypeEnum.MESSAGE);
        if (this.v2 && this.skeletonAnimated && !endsAnimated) {
            this.playGhostFade(this.lv);
        }
        this.skeletonAnimated = endsAnimated;

        if (this.v2 && type === MessageSlotTypeEnum.MESSAGE_WIN) {
            const p = super.play(lv, MessageSlotTypeEnum.MESSAGE, messageData);
            this.type = MessageSlotTypeEnum.MESSAGE_WIN;
            spSkeletonSetAnimation(this.skeleton, [`ani_mar_win_lv${lv}`, `ani_mar_lv${lv}_1`], true);

            const md = Array.isArray(messageData) ? messageData[0] : messageData;
            const score = md.score;
            const times = (score && score.wins && score.totalBet) ? safeDiv(score.wins, score.totalBet) : 0;
            if (times >= 5 && times < 10 && !score.setNumEndNotPlayBoardWin) {
                p.then(() => spSkeletonSetAnimation(this.skeleton, `ani_mar_lv${lv}_1`, true));
            }
            return p;
        }

        return super.play(lv, type, messageData);
    }

    /**
     * 骨骼即將從動畫狀態接回靜止畫面前，播放編輯器預建的常駐殘影骨骼節點，維持原動畫並淡出，
     * 讓下層即將切換的靜止畫面透出來，做出交叉淡化效果，不影響原本節點的動畫切換。
     */
    private playGhostFade(fromLv: MessageSlotLv) {
        if (!this.ghostSkeleton) {
            return;
        }
        const ghostNode = this.ghostSkeleton.node;
        const ghostOpacity = ghostNode.getComponent(UIOpacity) || ghostNode.addComponent(UIOpacity);

        Tween.stopAllByTarget(ghostOpacity);
        ghostNode.active = true;
        ghostOpacity.opacity = 255;
        spSkeletonSetAnimation(this.ghostSkeleton, `ani_mar_lv${fromLv}_1`, true);

        tween(ghostOpacity)
            .to(0.6, { opacity: 0 })
            .call(() => ghostNode.active = false)
            .start();
    }

    /**
     * 贏分使用的 Message
     */
    public async playMessageWins(prefixType: MessageWinPrefixType, wins: number, totalBet: number, sumCurrentRoundWins: number = null, isChainWin?: boolean) {

        const baseWin = sumCurrentRoundWins ?? wins;
        let lv: MessageSlotLv = 1;
        const times = safeDiv(balanceNumber(baseWin), balanceNumber(totalBet));
        if (times) {
            if (times >= 5) {
                lv = 3;
            } else if (times >= 3 && times < 5) {
                lv = 2;
            } else {
                lv = 1;
            }
        }

        const winsStr = fixThousandth2('' + balanceNumber(wins));
        switch (prefixType) {
            case MessageWinPrefixType.SHOW_NONE: {                                                 // XXX,XXX
                audioPlay('S309804_win_frame');
                this.playWinEmphasis(prefixType, wins, true); // 純數字只做本體縮放，不疊殘影
                const p = this.play(lv, MessageSlotTypeEnum.MESSAGE, new MessageData(winsStr, MessageTemplate.MESSAGE_TEMP_FONT), true); // staysAnimated：接著會覆蓋成 _1，不是真的靜止
                spSkeletonSetAnimation(this.skeleton, `ani_mar_lv${lv}_1`, true);
                return p;
            }
            case MessageWinPrefixType.SHOW_WIN:                                                    // 贏得 XXX,XXX
                if (!isChainWin) {
                    audioPlay('S309804_win_frame');
                }
                this.playWinEmphasis(prefixType, wins);
                return this.play(lv, MessageSlotTypeEnum.MESSAGE_WIN, new MessageData(winsStr, MessageTemplate.MESSAGE_TEMP_SPRITE_FONT_WIN));
            case MessageWinPrefixType.SHOW_TOTAL_WIN: {                                            // 共贏得 XXX,XXX
                // 跑馬燈結算(共贏得)音效
                audioPlay('S309812_marquee_win_settlement');
                const hasRunScore = times >= 5 && times < 10; // 有跑分時只做本體縮放，不疊殘影
                this.playWinEmphasis(prefixType, wins, hasRunScore);

                return this.play(lv, MessageSlotTypeEnum.MESSAGE_WIN, new MessageData(winsStr, MessageTemplate.MESSAGE_TEMP_SPRITE_FONT_TOTAL_WIN, true, true, {
                    wins,
                    totalBet,
                    setNumStartCallBack: () => {
                        // 跑馬燈跑分音效
                    audioPlay('S309810_marquee_score');
                },
                setNumEndCallBack: () => {
                        // 跑馬燈跑分音效_尾音
                    audioPlay('S309811_marquee_score_end');
                    if (hasRunScore) { // 跑分期間縮小(見 playWinEmphasis)，確定跑完後彈跳回 1 倍
                        tween(this.messageNode)
                                .to(0.2, { scale: new Vec3(1.2, 1.2, 1.2) }, { easing: 'quadOut' })
                                .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
                                .start();
                    }
                },
            }));
            }
        }
    }

    /**
     * 強調字演出：編輯器預建的隱藏複本（贏得／共贏得各一組）塞入最終金額，放大淡出後藏回去。
     * 與訊息文字同時播，原本跑馬燈的字不動；金額直接塞最終值，不受跑分中間值影響
     */
    private playWinEmphasis(prefixType: MessageWinPrefixType, wins: number, skipGhost: boolean = false) {
        if (!skipGhost) {
            const isTotal = prefixType === MessageWinPrefixType.SHOW_TOTAL_WIN;
            const label = isTotal ? this.emphasisTotalWinLabel : this.emphasisWinLabel;
            const ghostOpacity = isTotal ? this.emphasisTotalWinOpacity : this.emphasisWinOpacity;
            if (label && ghostOpacity) { // 編輯器沒綁就不播，不能讓演出把流程炸死
                const ghost = ghostOpacity.node;
                label.string = fixThousandth2('' + balanceNumber(wins));
                stopAllActions(ghost);
                setNodeScale(ghost, 1.4);
                ghostOpacity.opacity = 85;
                ghost.active = true;
                tween(ghost)
                    .parallel(
                        tween().to(0.6, { scale: new Vec3(1.8, 1.8, 1.8) }, { easing: 'quadOut' }),
                        tween(ghostOpacity).to(0.6, { opacity: 0 }),
                    )
                    .call(() => ghost.active = false)
                    .start();
            }
        }

        const scaleDur = prefixType === MessageWinPrefixType.SHOW_NONE ? 0.4 : 0.6; // 純數字縮短，其餘維持原本秒數
        setNodeScale(this.messageNode, 1.4);
        tween(this.messageNode)
            .parallel(
                tween().to(scaleDur, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' }),
            )
            .start();
    }

    /**
     * 一般跑馬燈使播放
     */
    public playMarquee() {
        const marqueeDatas = MARQUEE_MSG.map(mm => new MarqueeData(translate(mm.key), mm.templateIndex));
        this.play(1, MessageSlotTypeEnum.MARQUEE, marqueeDatas);
    }

    /**
     * 播放心跳動畫
     */
    public playMessageHeart(toggle: boolean) {

        const targetNode = this.messageNode;
        stopAllActions(targetNode);
        setNodeScale(targetNode, 1);
        if (toggle) {
            tween(targetNode)
                .delay(0.1)
                .sequence(
                    tween().to(0.15, { scale: new Vec3(1.2, 1.2, 1.2) }),
                    tween().to(0.45, { scale: new Vec3(1, 1, 1) }),
                    tween().delay(0.3),
                )
                .repeatForever()
                .start();
        }
    }
}
