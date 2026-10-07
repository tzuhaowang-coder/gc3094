
import { addBonusAutoPrizeDeltaTime, BONUS_ENUM, bonusEventAudioPreload, BonusInfoTimeout, bonusIsFirstSend, BonusListener, BonusMessageType, bonusReqBetBonus, bonusReqBonusInfo, bonusReqCheckBonus, GameIdleMessage, getBonusAutoPrizeDeltaTime, getBonusEventCount, getBonusEventInfoCount, getBonusEventInfoList, getBonusHangOnAutoPrize, getBonusHasFirstOpenInfo, getBonusHasFirstOpenInfoB, getBonusHasOpenPage, getBonusSending, getCommBase, getGameIdle, getIsBonusAutoPrize, getIsPlayingBonusAutoPrizeAnim, hasGame, isBEvenInfoTemplate, registerBonusMessage, setBonusAutoPrizeDeltaTime, setBonusHasOpenPage, setBonusIdle, setBonusSending, setBonusSendingTimeout, setIsPlayingBonusAutoPrizeAnim, toggleBonusAutoPrize, toggleBonusInfoFirstOpenDoNotShowAgain } from '../BonusEventGlobal';
import { audioPlay } from '../component/Audio';
import { LoginState } from '../data/LoginState';
import { BetBonusRes, BonusInfoRes, CheckBonusRes } from '../protobuf/ProtobufWarp';
import { getBonusAutoPrize, getBonusInfoFirstOpenDoNotShowAgain } from '../StorageGlobal';
import CommunicationBase from './CommunicationBase';
import { WebViewMessage } from './WebViewGlobal';

import { _decorator, Component } from 'cc';

// export enum BONUS_PARENT {
//     BOTTOM_BACK,
//     BOTTOM_FRONT,
// }

const { ccclass, property } = _decorator;

@ccclass
export default class BonusEventUI extends Component implements BonusListener {

    // @property(Label)
    // countLabel: Label = null;

    // @property(Button)
    // button: Button = null;

    // @property(CommonButton)
    // infoButton: CommonButton = null;

    // @property(sp.Skeleton)
    // bonusSpine: sp.Skeleton = null;

    // @property(Node)
    // bottomBack: Node = null;
    // @property(Node)
    // bottomFront: Node = null;

    // @property(sp.Skeleton)
    // autoRedSkeleton:sp.Skeleton = null;

    // @property(Label)
    // autoRedWinsLabel: Label = null;

    // @property(Node)
    // flyNode:Node = null;

    // public widget: Widget = null;

    private comm: CommunicationBase = null;

    // private labelOutLine: LabelOutline;

    // private oriCountLabelColor: Color;
    // private oriLabelOutLineColor: Color;
    // private darkCountLabelColor: Color;
    // private darkLabelOutLineColor: Color;

    // public flyNodeParent:Node = null; // 飛行贏分時的節點
    // public getBalancePosition:Function = null; // Balance 的位置。
    // public getRedWinsLabelPosition:Function = null; // 紅包贏分Label的位置。
    public getBalance:Function = null; // 取得當前畫面上的餘額。
    // private startFlyPosition:Vec2 = null;
    // private isPlayTotalBalanceAudio:boolean = false;

    onBonusMessage(obj: BonusMessageType) {
        if (obj instanceof CheckBonusRes) {
            this.updateButtonEnable();
        } else if (obj instanceof BetBonusRes) {
            this.updateButtonEnable();
            // if (getIsBonusAutoPrize() && obj.getBonus() && obj.getBonus().getRewardsList().length > 0) {
            //     this.playAutoOpenRedAnim(obj.getBonus().getRewardsList().reduce(sumReducer));
            // }
        } else if (obj instanceof BonusInfoRes) {
            this.updateButtonEnable();
        } else if (obj instanceof WebViewMessage) {
            if (obj.method === BONUS_ENUM.BONUS_EVENT_NEXT) {
                this.updateButtonEnable();
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_FINISH) {
                this.updateButtonEnable();
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_PAGE_CLOSE) {
                setBonusIdle(true);
                this.updateButtonEnable();
            } else if (obj.method === BONUS_ENUM.BONUS_EVENT_INFO_PAGE_CLOSE) {
                setBonusIdle(true);
                this.updateButtonEnable();
            }
        } else if (obj instanceof GameIdleMessage) {
            this.updateButtonEnable();
        } else if (obj instanceof BonusInfoTimeout) {
            this.updateButtonEnable();
        }
    }

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        registerBonusMessage(this);
        // this.labelOutLine = this.countLabel.node.getComponent(LabelOutline);
        // this.oriCountLabelColor = getNodeColor(this.countLabel.node);
        // this.oriLabelOutLineColor = this.labelOutLine.color;
        // // @ts-ignore
        // this.darkCountLabelColor = color(this.oriCountLabelColor.r * 0.6, this.oriCountLabelColor.g * 0.6, this.oriCountLabelColor.b * 0.6);
        // // @ts-ignore
        // this.darkLabelOutLineColor = color(this.oriLabelOutLineColor.r * 0.6, this.oriLabelOutLineColor.g * 0.6, this.oriLabelOutLineColor.b * 0.6);
        // this.updateButtonEnable();
        bonusEventAudioPreload();
        // const bas = this.node.getComponentsInChildren(ButtonAudio);
        // if (bas.length > 0) {
        //     bas.forEach((ba) => {
        //         ba.node.removeComponent(ButtonAudio);
        //     });
        // }
    }

    private checkComm(): boolean {
        if (!this.comm) {
            this.comm = getCommBase();
        }
        // log('rpc bonus checkComm',  this.comm.loginState, this.comm.loginState === LoginState.LOGIN);
        return this.comm.loginState === LoginState.LOGIN;
    }

    delta: number = 0;

    onLoad(): void {
        // this.widget = this.node.getComponent(Widget) || this.node.addComponent(Widget);
    }
    start() {
        this.pre();
    }

    update(dt: number): void {
        if (bonusIsFirstSend()) {
            toggleBonusAutoPrize(getBonusAutoPrize());
            toggleBonusInfoFirstOpenDoNotShowAgain(getBonusInfoFirstOpenDoNotShowAgain());
            this.checkBonus();
            return;
        }
        this.delta += dt;
        if (this.delta >= 5) {
            this.checkBonus();
            this.delta -= 5;
        }

        if (isBEvenInfoTemplate()) {
            if (hasGame() && !getBonusHangOnAutoPrize() && !getIsPlayingBonusAutoPrizeAnim()) {
                addBonusAutoPrizeDeltaTime(dt);
                if (getBonusAutoPrizeDeltaTime() >= 1) {
                    const balanceOk = this.getBalance() > 0;
                    if (!balanceOk) {
                        setBonusAutoPrizeDeltaTime(-5); // 因餘額不足無法提領紅包，延後N秒後再執行一次自動領取。
                        return;
                    }
                    this.onBonusEventAutoB();
                }
            }
        // } else {
        //     if (getIsBonusAutoPrize() && !getBonusHangOnAutoPrize() && !getIsPlayingBonusAutoPrizeAnim()) {
        //         addBonusAutoPrizeDeltaTime(dt);
        //         if (getBonusAutoPrizeDeltaTime() >= 1) {
        //             const balanceOk = this.getBalance() > 0;
        //             if (!balanceOk) {
        //                 setBonusAutoPrizeDeltaTime(-5); // 因餘額不足無法提領紅包，延後N秒後再執行一次自動領取。
        //                 return;
        //             }
        //             this.onBonusEventAuto();
        //         }
        //     }
        //     // this.lerpAutoRedAnim();
        }
    }

    private checkBonus() {
        this.pre();
        const isConnect = this.checkComm();
        if (!isConnect) {
            return;
        }
        if (getBonusSending()) {
            return;
        }
        bonusReqCheckBonus();
    }

    onBonusEventClick() {
        audioPlay('S999702_click_red_envelope');
        const isConnect = this.checkComm();
        if (!isConnect) {
            return;
        }
        if (!getGameIdle()) {
            return;
        }
        if (getBonusSending()) {
            return;
        }
        if (getIsPlayingBonusAutoPrizeAnim()) {
            return;
        }
        const count = getBonusEventCount();
        if (count === 0) {
            return;
        }
        setBonusHasOpenPage(true);
        setBonusSending(true);
        setBonusIdle(false);

        this.updateButtonEnable();
        bonusReqBetBonus();
    }

    onBonusEventInfoClick() {
        audioPlay('S999701_question_mark_button');
        const isConnect = this.checkComm();
        if (!isConnect) {
            return;
        }
        if (!getGameIdle()) {
            return;
        }
        if (getBonusSending()) {
            return;
        }
        if (getIsPlayingBonusAutoPrizeAnim()) {
            return;
        }
        const count = getBonusEventInfoCount();
        if (count === 0) {
            return;
        }
        setBonusHasOpenPage(true);
        setBonusSendingTimeout();
        setBonusSending(true);
        setBonusIdle(false);
        this.updateButtonEnable();
        bonusReqBonusInfo();
    }

    onBonusEventAutoB() {
        const isConnect = this.checkComm();
        const isBonusAutoPrize = isBEvenInfoTemplate();
        if (!isConnect) {
            return;
        }
        if (!isBonusAutoPrize) {
            return;
        }
        if (getBonusHasOpenPage()) {
            return;
        }
        if (getBonusSending()) {
            return;
        }
        if (!getBonusHasFirstOpenInfoB()) {
            return;
        }
        const count = getBonusEventCount();
        if (count === 0) {
            return;
        }
        setIsPlayingBonusAutoPrizeAnim(true);
        setBonusSending(true);
        setBonusIdle(false);
        bonusReqBetBonus(!isBonusAutoPrize);
    }

    onBonusEventAuto() {
        const isConnect = this.checkComm();
        const isBonusAutoPrize = getIsBonusAutoPrize();
        if (!isConnect) {
            return;
        }
        if (!isBonusAutoPrize) {
            return;
        }
        if (getBonusHasOpenPage()) {
            return;
        }
        if (getBonusSending()) {
            return;
        }
        if (!getBonusHasFirstOpenInfo()) {
            return;
        }
        const count = getBonusEventCount();
        if (count === 0) {
            return;
        }
        setIsPlayingBonusAutoPrizeAnim(true);
        setBonusSending(true);
        bonusReqBetBonus(!isBonusAutoPrize);
    }

    /**
     * @param xPos 左 -120 右 120
     * @param yPos 上 120  下 -120
     */
    // public updateInfoBtnPos(xPos: number = 0, yPos: number = -120) {
    //     this.infoButton.node.setPosition(xPos, yPos);
    // }

    // updateParent(isBottom: boolean) {
    //     if (isBottom) {
    //         if (this.bottomFront) {
    //             this.node.setParent(this.bottomFront);
    //         }
    //         return;
    //     }
    //     if (this.bottomBack) {
    //         this.node.setParent(this.bottomBack);
    //     }
    // }

    // private getAnimState(state:BonusEventActivityState) {
    //     const isIdle = getBonusIdle() && getGameIdle();
    //     let active = false;
    //     let spineIsAnim = false;
    //     let spineIsLight = false;
    //     let infoIsLight = false;
    //     if (!state.hasEventInfos) {
    //         // 完全不啟用
    //         return [active, spineIsAnim, spineIsLight, infoIsLight];
    //     }
    //     active = true;
    //     if (isIdle) {
    //         if (state.redCount > 0 && !getIsBonusAutoPrize()) {
    //             spineIsLight = true;
    //         }
    //         infoIsLight = true;
    //     }
    //     if (state.startActivityCount > 0) {
    //         spineIsAnim = true;
    //     }
    //     return [active, spineIsAnim, spineIsLight, infoIsLight];
    // }

    public updateButtonEnable() {
        const eventList = getBonusEventInfoList();
        if (!eventList || eventList.filter(ei => ei.getTemplate()[0] === 'B').length > 0) {
            // this.button.node.opacity = 0;
            // this.button.interactable = false;
            // this.infoButton.node.active = false;
            // this.infoButton.interactable = false;
            return;
        }
        // this.pre();

        // const state = getBonusActivityState();
        // this.countLabel.string = state.redCount + '';

        // const [active, spineIsAnim, spineIsLight, infoIsLight] = this.getAnimState(state);
        // const lastAnimState = getLastAnimStateData();
        // if (state.redCount > lastAnimState.redCount) {
        //     // audioPlay('S999705_add_red_envelope'); // 播放獲得紅包音效
        // }
        // if (spineIsAnim && !lastAnimState.spineIsAnim) {
        //     // audioPlay('S999703_enable_red_envelope'); // 紅包啟用動畫
        // }
        // setLastAnimStateData(spineIsAnim, state.redCount);

        // if (!active) {
        //     this.button.node.opacity = 0;
        //     this.button.interactable = false;
        //     this.infoButton.node.active = false;
        //     this.infoButton.interactable = false;
        //     return;
        // }
        // this.button.node.opacity = 255;
        // this.infoButton.node.active = true;
        // // 設定動畫
        // if (spineIsAnim) {
        //     spSkeletonSetAnimation(this.bonusSpine, 'redenvelope_btn_default', true);
        // } else {
        //     spSkeletonSetAnimation(this.bonusSpine, 'redenvelope_btn_dislight', true);
        // }
        // // 設定可不可以開紅包
        // if (spineIsLight) {
        //     this.button.interactable = true;
        //     this.bonusSpine.node.color = color(255, 255, 255);
        //     this.countLabel.node.color = this.oriCountLabelColor;
        //     this.labelOutLine.color = this.oriLabelOutLineColor;
        // } else {
        //     this.button.interactable = false;
        //     this.bonusSpine.node.color = color(155, 155, 155);
        //     this.countLabel.node.color = this.darkCountLabelColor;
        //     this.labelOutLine.color = this.darkLabelOutLineColor;
        // }
        // // 設定說明頁可不可以開
        // if (infoIsLight) {
        //     this.infoButton.interactable = true;
        // } else {
        //     this.infoButton.interactable = false;
        // }
    }

    // private async playAutoOpenRedAnim(wins:number) {
    //     if (isBEvenInfoTemplate()) {
    //         return;
    //     }
    //     audioPlay('S999713_open_red_envelope', { throttle:10 });
    //     const now = Date.now();
    //     setBonusAutoPrizeAnimData(now, balanceThousandthK(wins));
    //     this.autoRedSkeleton.node.opacity = 255;
    //     this.autoRedWinsLabel.node.opacity = 0;
    //     this.autoRedWinsLabel.node.scale = 3;

    //     if (this.flyNodeParent) {
    //         this.flyNode.active = true;
    //         this.flyNode.opacity = 0;
    //         this.flyNode.setParent(this.flyNodeParent);
    //     }
    //     this.flyNode.getComponentInChildren(Label).string = '';
    //     this.isPlayTotalBalanceAudio = false;
    // }

    // private lerpAutoRedAnim() {
    //     if (!getIsPlayingBonusAutoPrizeAnim()) {
    //         this.autoRedSkeleton.node.opacity = 0;
    //         this.autoRedWinsLabel.node.opacity = 0;
    //         this.infoButton.node.opacity = 255;
    //         return;
    //     }

    //     const animData = getBonusAutoPrizeAnimData();

    //     if (!animData.isPlaying) {
    //         return;
    //     }

    //     this.autoRedWinsLabel.string = animData.wins;
    //     this.infoButton.node.opacity = 0;
    //     this.button.node.opacity = 0;

    //     const now = Date.now();
    //     if (now > animData.overAt) {// 結束
    //         animData.isPlaying = false;
    //         this.button.node.opacity = 255;
    //         this.infoButton.node.opacity = 255;
    //         this.flyNode.active = false;
    //         this.flyNode.setParent(this.node);

    //         setBonusIdle(true);
    //         setIsPlayingBonusAutoPrizeAnim(false);
    //         setBonusAutoPrizeDeltaTime(0);
    //         const wObj = new WebViewMessage();
    //         wObj.method = BONUS_ENUM.BONUS_EVENT_ONE_AUTO_PRIZE_FINISH;
    //         emitBonusMessage(wObj);
    //         return;
    //     }

    //     const dur = (now - animData.startAt) / 1e3; // 單位：秒
    //     spSkeletonSetAnimationPause(this.autoRedSkeleton, 'eff_red_open', dur);

    //     // 贏分 label 彈出
    //     const start0At = 0.4;
    //     if (dur > start0At) {
    //         const duration = 0.3; // 此動畫持續時間
    //         let percent = (dur - start0At) / (duration);
    //         if (dur > start0At + duration) {
    //             percent = 1;
    //         }
    //         const node =  this.autoRedWinsLabel.node;
    //         const opacity = misc.lerp(0, 255, percent);
    //         const scale =  misc.lerp(node.scale, 1, percent);
    //         node.opacity = opacity;
    //         node.scale = scale;
    //     }

    //     // 贏分 Label彈一下 zoom in
    //     const start1At = 3;
    //     if (dur > start1At) {
    //         const duration = 0.2; // 此動畫持續時間
    //         let percent = (dur - start1At) / (duration);
    //         if (dur > start1At + duration) {
    //             percent = 1;
    //         }
    //         const node =  this.autoRedWinsLabel.node;
    //         const scale =  misc.lerp(node.scale, 2, percent);
    //         node.scale = scale;
    //     }

    //      // 贏分 Label zoom out
    //     const start2At = 3.2;
    //     if (dur > start2At) {
    //         const duration = 0.2; // 此動畫持續時間
    //         let percent = (dur - start2At) / (duration);
    //         if (dur > start2At + duration) {
    //             percent = 1;
    //         }
    //         const node =  this.autoRedWinsLabel.node;
    //         const scale =  misc.lerp(node.scale, 1, percent);
    //         node.scale = scale;
    //     }

    //     // 錢飛到餘額位置 慢
    //     const start3At = 3.2;
    //     if (dur > start3At) {
    //         const duration = 0.3; // 此動畫持續時間
    //         let percent = (dur - start3At) / (duration);
    //         if (dur > start3At + duration) {
    //             percent = 1;
    //         }

    //         const out = v2();
    //         const node = this.flyNode;
    //         node.active = true;
    //         node.scale = 2;
    //         node.opacity = 180;
    //         this.startFlyPosition = this.getRedWinsLabelPosition();

    //         const vec = (this.getBalancePosition() as Vec2).sub(this.startFlyPosition);
    //         const fixEndPos = this.startFlyPosition.add(vec.normalize().mul(vec.len() * 0.3)); // 走前半路
    //         this.startFlyPosition.lerp(fixEndPos, percent, out);
    //         node.setPosition(out);

    //         this.flyNode.getComponentInChildren(Label).string = this.autoRedWinsLabel.string;
    //     }else {
    //         this.flyNode.opacity = 0;
    //         this.flyNode.getComponentInChildren(Label).string = '';
    //     }

    //     // 錢飛到餘額位置 加快
    //     const start4At = 3.5;
    //     if (dur > start4At) {
    //         const duration = 0.2; // 此動畫持續時間
    //         let percent = (dur - start4At) / (duration);
    //         if (dur > start4At + duration) {
    //             percent = 1;
    //             if (!this.isPlayTotalBalanceAudio && dur < (start4At + duration + 100)) {
    //                 this.isPlayTotalBalanceAudio = true;
    //                 audioPlay('S999712_tobalance_red_envelope', { throttle:100 });
    //             }
    //         }

    //         const out = v2();
    //         const node = this.flyNode;
    //         node.active = true;
    //         node.scale = 2;
    //         node.opacity = 180;

    //         const vec = (this.getBalancePosition() as Vec2).sub(this.startFlyPosition);
    //         const fixStartPos = this.startFlyPosition.add(vec.normalize().mul(vec.len() * 0.3)); // 走後半路
    //         this.startFlyPosition = fixStartPos;
    //         this.startFlyPosition.lerp(this.getBalancePosition(), percent, out);
    //         node.setPosition(out);

    //         this.flyNode.getComponentInChildren(Label).string = this.autoRedWinsLabel.string;
    //     }

    //     // 紅包、錢淡出
    //     const start5At = 3.7;
    //     if (dur > start5At) {
    //         const duration = 0.5; // 此動畫持續時間
    //         let percent = (dur - start5At) / (duration);
    //         if (dur > start5At + duration) {
    //             percent = 1;
    //         }
    //         const opacity = misc.lerp(255, 0, percent);

    //         const node = this.autoRedSkeleton.node;
    //         node.opacity = opacity;

    //         const node1 = this.autoRedWinsLabel.node;
    //         node1.opacity = opacity;

    //         const node2 = this.flyNode;
    //         const scale =  misc.lerp(node.scale, 3, percent);
    //         node2.opacity = opacity;
    //         node2.scale = scale;
    //     }else {
    //         this.autoRedSkeleton.node.opacity = 255;
    //     }

    // }

    // public updateAutoRedNode(scale:number, pos:Vec2) {
    //     this.autoRedSkeleton.node.parent.scale = scale;
    //     this.autoRedSkeleton.node.parent.setPosition(pos);
    // }

    // private testEnableAuto(a) {
    //     if (DEBUG) {
    //         toggleBonusAutoPrize(a);
    //     }
    // }
}
