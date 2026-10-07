import { _decorator, Label, Node, sp, tween, Tween, UIOpacity, v3, Vec3 } from 'cc';
import { TemplateGenerator } from '../submodule/game-client-lib/component/TemplateGenerator';
import { resolveWrapper, spSkeletonSetAnimation, spSkeletonSetAnimationToPromise } from '../submodule/game-client-lib/script/PromiseManager';
import { setNodeX, warn } from '../submodule/game-client-lib/utils/Utils';
import { MultiRingUnit } from './MultiRingUnit';
import { audioPlay } from '../submodule/game-client-lib/component/Audio';
const { ccclass, property } = _decorator;

@ccclass('MultiRing')
export class MultiRing extends TemplateGenerator {

    @property(Node)
    ringNode: Node = null;

    /** 數字變動特效。放遮罩外、固定視窗中央（焦點格滑完必停在這），兩側裝飾才不會被 mask 切掉 */
    @property(sp.Skeleton)
    aniNumberChange1: sp.Skeleton = null;

    @property(sp.Skeleton)
    aniNumberChange2: sp.Skeleton = null;

    @property(sp.Skeleton)
    aniNumberChange3: sp.Skeleton = null;

    /** 格子間距（px）。132 是照舊版圓形排列的視覺密度換算來的 */
    @property
    stepWidth: number = 132;

    /** 飛落演出的倍數字：編輯器預建、平時 opacity 0 停在焦點格上，飛完歸位繼續躲 */
    @property(Label)
    flyLabel: Label = null;

    @property(UIOpacity)
    flyOpacity: UIOpacity = null;

    /** 落點在停駐點下方多遠（px）。焦點格與跑馬燈都是固定位置，距離直接寫死 */
    private static readonly FLY_DROP_DISTANCE = 100;

    /** 逐格退回的門檻：目前倍數 < 此值才逐格播放，否則維持一次性滑到底 */
    private static readonly GRADUAL_RESET_LEVEL_THRESHOLD = 7;

    /** 升倍音效改隨機挑的門檻：倍數 >= 此值時從 MULTIPLE_ADD_RANDOM_AUDIOS 隨機挑 */
    private static readonly MULTIPLE_ADD_RANDOM_THRESHOLD = 7;

    /** 升倍音效：x2~x6 各自固定，x7 以上從一組音效裡隨機挑 */
    private static readonly MULTIPLE_ADD_AUDIOS: Record<number, string> = {
        2: 'S309835_multiple_x2',
        3: 'S309836_multiple_x3',
        4: 'S309837_multiple_x4',
        5: 'S309838_multiple_x5',
        6: 'S309839_multiple_x6',
    };

    private static readonly MULTIPLE_ADD_RANDOM_AUDIOS = [
        'S309840_multiple_x01',
        'S309841_multiple_x02',
        'S309842_multiple_x03',
        'S309843_multiple_x04',
        'S309844_multiple_x05',
        'S309845_multiple_x06',
        'S309846_multiple_x07',
    ];

    /** x7 以上隨機挑到的最後一句，供下一回合開場重播用（不重新隨機） */
    private lastRandomAddAudio: string = null;

    /** 依升到的倍數挑對應音效，x7 以上隨機挑一個（可連續重複） */
    private getMultipleAddAudio(level: number): string {
        if (level >= MultiRing.MULTIPLE_ADD_RANDOM_THRESHOLD) {
            const idx = Math.floor(Math.random() * MultiRing.MULTIPLE_ADD_RANDOM_AUDIOS.length);
            this.lastRandomAddAudio = MultiRing.MULTIPLE_ADD_RANDOM_AUDIOS[idx];
            return this.lastRandomAddAudio;
        }
        return MultiRing.MULTIPLE_ADD_AUDIOS[level];
    }

    /** 下一回合開場重播當下倍率音效：x7 以上沿用上次隨機到的那句，不重新隨機 */
    public getCurrentLevelEchoAudio(): string {
        const level = this.baseLevel + this.focusUnitIndex * this.stepValue;
        if (level >= MultiRing.MULTIPLE_ADD_RANDOM_THRESHOLD) {
            return this.lastRandomAddAudio;
        }
        return MultiRing.MULTIPLE_ADD_AUDIOS[level];
    }

    /** 飛落數字的停駐點（編輯器擺的位置），start 時記一次，飛完歸位用 */
    private flyHome: Vec3 = null;

    private multiRingUnits: MultiRingUnit[] = [];
    /** 目前焦點格在 multiRingUnits 的 index，決定哪一格放大變亮、環要滑到哪個位置 */
    private focusUnitIndex: number = 0;
    public isFGRing: boolean = false;

    /**
     * 初始化倍率條：先生幾個格子，排成一條水平直線
     */
    start() {
        // 每格數字照公式算（NG：x1,x2,x3…／FG：x2,x4,x6…），先生 4 格，不夠再補，沒有上限
        this.ensureUnits(4);

        this.focusUnitIndex = 0;
        this.playFocusUnit(this.focusUnitIndex, false); // 初始化直接定值，不播交叉淡化

        if (this.flyLabel) { // 記住飛落數字在編輯器擺的停駐點（焦點格位置）
            this.flyHome = this.flyLabel.node.position.clone();
        }
    }

    /** 起始倍數：NG 從 x1 開始、FG 從 x2 開始 */
    private get baseLevel(): number {
        return this.isFGRing ? 2 : 1;
    }

    /** 每格加多少：NG 一次 +1、FG 一次 +2 */
    private get stepValue(): number {
        return this.isFGRing ? 2 : 1;
    }

    /**
     * 格子不夠就補生到指定數量。因為是用到才生，倍率才能沒有上限
     */
    private ensureUnits(count: number) {
        while (this.multiRingUnits.length < count) {
            const i = this.multiRingUnits.length;
            const node = this.getNode();
            const unit = node.getComponent(MultiRingUnit);
            node.setParent(this.ringNode);
            node.setPosition(i * this.stepWidth, 0);
            node.eulerAngles = v3();
            unit.setDisplayMulti(this.baseLevel + i * this.stepValue);
            unit.playFocus(false, false, false); // 新格子直接定值成暗態，不播動畫
            this.multiRingUnits.push(unit);
        }
    }

    /**
     * 滑回起始格（位置用絕對值歸位，重複呼叫不會愈滑愈歪）
     * @param force true = 瞬間歸位，不播滑回動畫（進 FG 清殘留閃粉用）
     * @param skipGradual true = 不逐格退回，一律一次滑到底（閃電模式用，逐格節奏來不及跟上）
     */
    public reset(force: boolean = false, skipGradual: boolean = false) {
        if (this.focusUnitIndex === 0 && !force) { // 已經在起始格（或正在滑回去），不用再跑一次
            return;
        }
        this.stopChange(); // 新一輪歸位開始前，強制收掉上一次還沒播完的 change
        Tween.stopAllByTarget(this.ringNode); // 先停掉還在跑的滑動，避免兩個動畫打架
        const fromIndex = this.focusUnitIndex;
        this.focusUnitIndex = 0; // 先歸零，滑回期間再被呼叫就會直接 return

        if (force) {
            setNodeX(this.ringNode, 0);
            this.playFocusUnit(this.focusUnitIndex, false); // 瞬間歸位不播交叉淡化
            return;
        }

        const currentLevel = this.baseLevel + fromIndex * this.stepValue;
        if (currentLevel < MultiRing.GRADUAL_RESET_LEVEL_THRESHOLD && !skipGradual) {
            this.gradualResetFrom(fromIndex); // 低倍率逐格退回，跟升倍同一套交叉淡化節奏
        } else {
            tween(this.ringNode)
                .to(MultiRingUnit.FOCUS_TWEEN_DURATION, { position: v3(0, this.ringNode.position.y, 0) })
                .start();
            this.playFocusUnit(this.focusUnitIndex); // 交叉淡化跟環滑動同時開始，同時結束
        }
    }

    /**
     * 逐格退回：從 fromIndex 一路往回退到 0，每退一格都重新播一次交叉淡化，
     * 每步時長沿用 FOCUS_TWEEN_DURATION（跟升倍同一顆），串成一條 tween 鏈依序播放
     */
    private gradualResetFrom(fromIndex: number) {
        let t = tween(this.ringNode);
        for (let idx = fromIndex - 1; idx >= 0; idx -= 1) {
            t = t
                .call(() => this.playFocusUnit(idx)) // 交叉淡化跟這一步的滑動同時開始
                .to(MultiRingUnit.FOCUS_TWEEN_DURATION, { position: v3(-this.stepWidth * idx, this.ringNode.position.y, 0) });
        }
        t.start();
    }

    /**
     * 更新每個格子的亮暗：焦點格放大變亮，其他格縮小變暗
     * @param animated 是否播交叉淡化（預設 true）；初始化/瞬間歸位時傳 false 跳過動畫
     */
    public playFocusUnit(focusIndex: number, animated: boolean = true) {
        this.multiRingUnits.forEach((unit, idx) => {
            unit.playFocus(idx === focusIndex, true, animated);
        });
    }

    /** 播「數字變動中」動畫，播完自己收尾關掉，不受滑動 tween 的 0.15 秒綁死 */
    private async playChange() {
        if (!this.aniNumberChange1 || !this.aniNumberChange2 || !this.aniNumberChange3) { // scene 綁定掉了就跳過，不要讓倍率盤卡死
            return;
        }
        this.aniNumberChange1.node.active = true;
        this.aniNumberChange2.node.active = true;
        this.aniNumberChange3.node.active = true;
        await Promise.all([
            resolveWrapper(spSkeletonSetAnimationToPromise(this.aniNumberChange1, 'ani_number_change1')),
            resolveWrapper(spSkeletonSetAnimationToPromise(this.aniNumberChange2, 'ani_number_change2')),
            resolveWrapper(spSkeletonSetAnimationToPromise(this.aniNumberChange3, 'ani_number_change3')),
        ]);
        this.stopChange();
    }

    private stopChange() {
        if (!this.aniNumberChange1 || !this.aniNumberChange2 || !this.aniNumberChange3) {
            return;
        }
        this.aniNumberChange1.node.active = false;
        this.aniNumberChange2.node.active = false;
        this.aniNumberChange3.node.active = false;
    }

    /** 播「數字變動中」動畫（左右屋簷金光），呼叫時機交給外部對齊圖標消除 */
    public playEliminationLight() {
        this.playChange();
    }

    /** 瞇牌期間左右龍的呼吸效果：跟 playChange/stopChange 分開控制，不互相影響 */
    public startDragonBreath() {
        if (!this.aniNumberChange3) {
            return;
        }
        this.aniNumberChange3.node.active = true;
        spSkeletonSetAnimation(this.aniNumberChange3, 'ani_number_change3', true);
    }

    public stopDragonBreath() {
        if (!this.aniNumberChange3) {
            return;
        }
        this.aniNumberChange3.node.active = false;
    }

    /**
     * 依後端給的倍數，把倍率條滑到對應的格子
     * @param level 後端 RoundInfo.level（NG 從 x1、FG 從 x2 起跳，沒有上限）
     */
    public showLevel(level: number) {
        if (!Number.isFinite(level)) { // level 不是數字就擋掉，不然 NaN 會讓倍率盤從此卡死
            warn('MultiRing.showLevel 收到非數值 level:', level);
            return;
        }
        // 倍數反推回陣列 index（i = (level - baseLevel) / stepValue），round 防浮點誤差、max(0,) 防負值
        const targetIdx = Math.max(0, Math.round((level - this.baseLevel) / this.stepValue));
        if (targetIdx === this.focusUnitIndex) { // 倍數沒變就不動
            return;
        }
        if (targetIdx === 0) { // 回到起始倍數 → 播滑回動畫（會順便關閃粉）
            this.reset();
            return;
        }
        this.slideToIndex(targetIdx); // 升級 → 往左滑
    }

    /**
     * 一口氣滑到目標格（位置用絕對值算，連續呼叫不會錯位）
     */
    private slideToIndex(targetIdx: number) {
        this.ensureUnits(targetIdx + 3); // 格子備到目標格再加 2 格，因為畫面上焦點右邊還看得到 2 格
        this.stopChange(); // 新一輪滑動開始前，強制收掉上一次還沒播完的 change
        Tween.stopAllByTarget(this.ringNode); // 先停掉還在跑的動畫，避免兩個動畫打架
        this.focusUnitIndex = targetIdx;
        const level = this.baseLevel + targetIdx * this.stepValue;
        audioPlay(this.getMultipleAddAudio(level)); // 依升到的倍數播對應音效
        tween(this.ringNode)
            .to(MultiRingUnit.FOCUS_TWEEN_DURATION, { position: v3(-this.stepWidth * targetIdx, this.ringNode.position.y, 0) })
            .start();
        this.playFocusUnit(this.focusUnitIndex); // 交叉淡化跟環滑動同時開始，同時結束
    }

    /**
     * 升倍演出：平時停在焦點格上的隱形倍數字（opacity 0），塞入焦點格倍數後
     * 往上微彈、落下碰到跑馬燈（落點寫死在停駐點下方 FLY_DROP_DISTANCE px，被跑馬燈蓋住是刻意的）、
     * 放大淡出，結束後歸位隱藏等下次循環
     * @returns 「碰到跑馬燈」那一刻就 resolve，淡出在背景跑完不擋流程
     */
    public playBounceToMarquee(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.flyLabel || !this.flyOpacity || !this.flyHome) { // 編輯器沒綁就跳過，不能卡住流程
                resolve();
                return;
            }
            const focusUnit = this.multiRingUnits[this.focusUnitIndex];
            const focusLabel = focusUnit.label;
            const fly = this.flyLabel.node;
            this.flyLabel.string = focusLabel.string;
            this.flyLabel.spacingX = focusLabel.spacingX; // 沒同步字距的話飛出去的數字字元會擠在一起，看起來比環上小
            Tween.stopAllByTarget(fly);
            Tween.stopAllByTarget(this.flyOpacity);
            fly.setPosition(this.flyHome);
            // 直接算焦點格「應該有」的最終大小，不讀當下 scale：連續消除時焦點格的放大動畫可能還沒播完，讀當下值會偏小
            const baseScale = focusUnit.getFocusScale();
            fly.setScale(baseScale, baseScale, 1);
            this.flyOpacity.opacity = 255;

            tween(fly)
                .by(0.06, { position: v3(0, 15, 0) }, { easing: 'quadOut' })                     // 往上微彈
                .delay(0.15)                                                                     // 停在頂點稍作停頓再落下
                .call(() => { // 微彈結束、開始落下的同時提早淡出，不等落地才淡（結束時間點跟放大對齊，一起在落地後 0.5s 完成）；曲線用 quadOut 讓前段掉更快，看起來更快變透
                    tween(this.flyOpacity).to(0.65, { opacity: 0 }, { easing: 'quadOut' }).start();
                })
                .to(0.15, { position: v3(this.flyHome.x, this.flyHome.y - MultiRing.FLY_DROP_DISTANCE, 0) }, { easing: 'quadIn' }) // 落下碰跑馬燈
                .call(() => {
                    audioPlay('S309830_multiplier_add'); // 倍數飛落音
                    resolve();
                })
                .to(0.5, { scale: v3(baseScale * 4, baseScale * 4, 1) }) // 落地後原地放大
                .call(() => { // 歸位隱藏，等下次循環
                    this.flyOpacity.opacity = 0;
                    fly.setPosition(this.flyHome);
                })
                .start();
        });
    }

    /**
     * NG／FG 模式切換：所有格子的數字重算一遍（NG：x1,x2,x3…／FG：x2,x4,x6…）
     */
    public switchFGMulti(isFG: boolean) {
        this.isFGRing = isFG;
        this.multiRingUnits.forEach((u, i) => u.setDisplayMulti(this.baseLevel + i * this.stepValue));
        this.playFocusUnit(this.focusUnitIndex);
    }

    /**
     * 進 FG：倍率盤直接切成 FG 狀態並歸零，不播過場動畫（舊版一整串過場演出已移除）
     */
    public playNGToFG() {
        this.switchFGMulti(true); // 切成 FG 的數字
        this.reset(true);         // 瞬間歸零、清掉殘留閃粉
    }
}
