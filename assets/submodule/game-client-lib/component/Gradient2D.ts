/*******************************************************************************
 * 创建: 2024年08月28日
 * 作者: 水煮肉片饭(27185709@qq.com)
 * 描述: 调色板，实现Sprite或Label颜色渐变
 * https://forum.cocos.org/t/topic/161589
*******************************************************************************/
import { _decorator, Color, Component, director, Director, Node, UIRenderer } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent, menu } = _decorator;
@ccclass
@executeInEditMode
@requireComponent(UIRenderer)
@menu('Public/Palette')
export class Gradient2D extends Component {

    @property([Color])
    colors:Color[] = [];

    private ur: UIRenderer = null;
    private hue: number[] = [1, 1, 1];      // 色相分量
    private lastWorldOpacity = -1;

    protected onLoad() {
        this.ur = this.node.getComponent(UIRenderer);

        // 启用顶点透明度（否则透明度只受color.a影响），但父節點更新透明度後，此透明度會不受影響。
        // 解決：取得 getNodeWorldOpacity（此節點的世界透明度），updateColor 把透明度顏色乘給漸層。
        this.ur['_useVertexOpacity'] = true;
        director.on(Director.EVENT_AFTER_DRAW, this.updateColor, this);
    }

    protected onDisable() {
        this.lastWorldOpacity = -1;
        if (!this.ur || !this.ur['_renderData']) return;
        const vb = this.ur['_renderData'].chunk.vb;
        const color = this.ur.color;
        vb[5] = vb[14] = vb[23] = vb[32] = color.r / 255;
        vb[6] = vb[15] = vb[24] = vb[33] = color.g / 255;
        vb[7] = vb[16] = vb[25] = vb[34] = color.b / 255;
        vb[8] = vb[17] = vb[26] = vb[35] = color.a / 255;
    }

    protected onDestroy(): void {
        director.off(Director.EVENT_AFTER_DRAW, this.updateColor, this);
    }

    private updateColor() {

        if (!this.ur || !this.ur['_renderData']) return;

        const worldOpacity = this.getNodeWorldOpacity(this.node);
        if (this.lastWorldOpacity === worldOpacity) {
            return;
        }
        this.lastWorldOpacity = worldOpacity;

        const vb = this.ur['_renderData'].chunk.vb;
        const lb = this.colors[0], rb = this.colors[1], lt = this.colors[2], rt = this.colors[3];
        const d = 1 / 255, h = this.hue, r = h[0] * d, g = h[1] * d, b = h[2] * d;
        vb[5] = lb.r * r; vb[6] = lb.g * g; vb[7] = lb.b * b; vb[8] = lb.a * worldOpacity / 255;
        vb[14] = rb.r * r; vb[15] = rb.g * g; vb[16] = rb.b * b; vb[17] = rb.a * worldOpacity / 255;
        vb[23] = lt.r * r; vb[24] = lt.g * g; vb[25] = lt.b * b; vb[26] = lt.a * worldOpacity / 255;
        vb[32] = rt.r * r; vb[33] = rt.g * g; vb[34] = rt.b * b; vb[35] = rt.a * worldOpacity / 255;
    }

    /**
     *
     * @param lb 左下
     * @param rb 右下
     * @param lt 左上
     * @param rt 右上
     */
    public setGradientColor(lb:Color, rb:Color, lt:Color, rt:Color) {
        this.colors = [lb, rb, lt, rt];
    }

    /**
     *  this.ur['_useVertexOpacity'] = true; 启用顶点透明度（否则透明度只受color.a影响），但父節點更新透明度後，此透明度會不受影響。
     *  解決：取得 getNodeWorldOpacity（此節點的世界透明度），updateColor 把透明度顏色乘給漸層。
     */
    private getNodeWorldOpacity(node: Node): number {
        // @ts-ignore
        return node['_uiProps']?._opacity ?? 1.0;
    }
}
