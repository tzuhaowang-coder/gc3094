import { _decorator, Component, Font, Label, sp, tween, Tween, UIOpacity, v3 } from 'cc';
import { spSkeletonSetAnimation } from '../submodule/game-client-lib/script/PromiseManager';
import { setNodeScale } from '../submodule/game-client-lib/utils/Utils';
const { ccclass, property } = _decorator;

@ccclass('MultiRingUnit')
export class MultiRingUnit extends Component {

    @property(Label)
    label: Label = null;

    /** label 節點的 UIOpacity，編輯器手動掛上再拉進來 */
    @property(UIOpacity)
    labelOpacity: UIOpacity = null;

    @property(sp.Skeleton)
    backgroundLightSk: sp.Skeleton = null;

    @property(UIOpacity)
    backgroundLightOpacity: UIOpacity = null;

    @property([Font])
    fonts: Font[] = [];

    public multi: number = 0;

    /** 焦點切換交叉淡化的時長，要跟 MultiRing 環滑動 tween 對齊、同時結束 */
    public static readonly FOCUS_TWEEN_DURATION = 0.28;

    /** 這格當焦點時最終該有的大小，給外部（例如飛落動畫）取用，不受目前 scale 動畫播放進度影響 */
    public getFocusScale(): number {
        return focusScale(this.multi);
    }

    /**
     * 切換這格是不是焦點：焦點格數字放大變亮開光暈，非焦點格縮小變暗。
     * animated=true（預設）：新舊焦點交叉淡化，縮放跟透明度同時、同時長變化；
     * animated=false：直接定值不播動畫（初始化建格子、瞬間歸位用）
     */
    public playFocus(toggle: boolean, showLight: boolean = true, animated: boolean = true) {
        // 防呆：上一次的漸變還沒播完就被再呼叫一次時，先中斷舊動畫，避免兩個動畫搶著改同一數值造成畫面抖動
        Tween.stopAllByTarget(this.label.node);
        Tween.stopAllByTarget(this.labelOpacity);
        Tween.stopAllByTarget(this.backgroundLightSk.node);
        Tween.stopAllByTarget(this.backgroundLightOpacity);

        // 算出這一格最終該長怎樣：焦點格放大變亮開光暈，非焦點格縮小變暗關光暈
        const scale = toggle ? focusScale(this.multi) : nonFocusScale(this.multi);
        const opacity = toggle ? 255 : 150;
        const lightOn = toggle && showLight;

        if (lightOn) {
            // 光暈動畫內容先播著（循環），實際看不看得到由下面的 opacity 決定，兩者分開控制
            spSkeletonSetAnimation(this.backgroundLightSk, 'ani_number_light', true);
        }

        if (!animated) {
            // 瞬間定裝：直接套用目標值，不經過程，初始化建格子/瞬間歸位用
            setNodeScale(this.label.node, scale);
            this.labelOpacity.opacity = opacity;
            this.backgroundLightOpacity.opacity = lightOn ? 255 : 0;
            if (lightOn) {
                setNodeScale(this.backgroundLightSk.node, 1);
            }
            return;
        }

        // 漸變：數字縮放／數字透明度／光暈透明度三條各自獨立的 tween，時長一致，同時開始同時結束
        tween(this.label.node).to(MultiRingUnit.FOCUS_TWEEN_DURATION, { scale: v3(scale, scale, 1) }).start();
        tween(this.labelOpacity).to(MultiRingUnit.FOCUS_TWEEN_DURATION, { opacity }).start();
        tween(this.backgroundLightOpacity).to(MultiRingUnit.FOCUS_TWEEN_DURATION, { opacity: lightOn ? 255 : 0 }).start();
        if (lightOn) {
            // 光暈額外加一個「從中心長大」的效果：跟透明度淡入同時進行，不是直接彈出全尺寸
            setNodeScale(this.backgroundLightSk.node, 0);
            tween(this.backgroundLightSk.node)
                .to(MultiRingUnit.FOCUS_TWEEN_DURATION, { scale: v3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 把倍數顯示在這格。數字多大都行，字型固定用 fonts[0]
     */
    public setDisplayMulti(multi: number) {
        this.multi = multi;
        this.label.string = 'x' + multi;
        this.label.font = this.fonts[0];
        this.label.spacingX = horizontalSpacing(multi);
    }

}

/** 倍數是幾位數 */
function getDigitCount(multi: number): number {
    return multi.toString().length;
}

function focusScale(multi: number): number {
    const digit = getDigitCount(multi);
    switch (digit) {
        case 1: return 2.05; // e.g., x1, x2, x8
        case 2: return 1.9;  // e.g., x16, x32, x64
        case 3: return 1.7;  // e.g., x128, x256, x512
        case 4: return 1.55; // 4 位數字寬較大，需縮得更小
        default: return 2.05;
    }
}

function nonFocusScale(multi: number): number {
    const digit = getDigitCount(multi);
    switch (digit) {
        case 1: return 1.05;
        case 2: return 0.9;
        case 3: return 0.75;
        case 4: return 0.65;
        default: return 0.8;
    }
}

function horizontalSpacing(multi: number): number {
    const digit = getDigitCount(multi);
    // 數字位數越多，間距越緊湊，防止寬度過大
    if (digit >= 3) {
        return -4;
    }
    if (digit === 2) {
        return -2;
    }
    return 0;
}
