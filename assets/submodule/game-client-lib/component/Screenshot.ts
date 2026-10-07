import { _decorator, Camera, color, Component, Node, RenderTexture, SpriteFrame, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { range, setNodeScaleY, warn } from '../utils/Utils';

const { ccclass } = _decorator;
export enum CaptureType {
    DataUrl,
    Uint8Array,
    Base64,
    RenderTexture,
}

interface IBound {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

const textureMap = new Map<string, SpriteFrame>();

/**
 * 不知如何計算
 */
export function cullingMaskNumber(num: number | string): number {
    let str: string;
    if (typeof num === 'string') {
        str = num;
    } else {
        if (num > 0) {
            str = '1' + range(num - 1).map(_ => '0').join('');
        } else {
            return -1;
        }
    }
    return parseInt(str, 2);
}

/**
 *
 * @param key 用於判斷是否已經產生，已產生就從 cache 拿
 * @param root 此節點 scaleY 要設 -1，不然畫出來會上下顛倒
 * @param genNode 產生 render 節點，會被放在 root 下，截圖完後會被刪除
 */
export function getCaptureSpriteFrame(key: string, root: Node, genNode: () => Node = () => null, cullingMask: number = 2): SpriteFrame {
    if (textureMap.has(key)) {
        return textureMap.get(key);
    }
    const node = genNode();
    if (node) {
        root.addChild(node);
    } else {
        if (DEBUG) {
            warn('getCaptureSpriteFrame genNode() get null');
        }
    }

    let screenshot: Screenshot = root.getComponent(Screenshot);
    // 修正上下顛倒
    const prevScaleY = root.getScale().y;
    setNodeScaleY(root, -1);

    if (!screenshot) {
        screenshot = root.addComponent(Screenshot);
    }
    // 截圖
    const renderTexture = screenshot.capture(undefined, CaptureType.RenderTexture, root, cullingMask) as RenderTexture;

    setNodeScaleY(root, prevScaleY);
    if (node) {
        node.removeFromParent();
    }

    const frame = new SpriteFrame();
    frame.texture = renderTexture;

    textureMap.set(key, frame);
    return frame;
}

// export function base64ToSpriteFrame(base64: string): Promise<SpriteFrame> {
//     const texture = new Texture2D();
//     return new Promise((res, rej) => {
//         const img = new Image();
//         img.src = base64;
//         img.onload = function () {
//             texture.initWithElement(img);
//             texture.handleLoadedTexture();
//             const newframe = new SpriteFrame(texture);
//             res(newframe);
//         };
//     });
// }

@ccclass
export default class Screenshot extends Component {
    capture(bound: IBound = { maxX: 0, minX: 0, maxY: 0, minY: 0 }, type: CaptureType = CaptureType.DataUrl, node?: Node, cullingMask: number = 2): string | Uint8Array | RenderTexture {

        const camera = this.node.addComponent(Camera);
        camera.clearColor = color(0, 0, 0, 0);
        // 设置你想要的截图内容的 cullingMask
        // TODO: 用法尚不明
        // 先固定使用 groupIndex = 1
        // 及 cullingMask = 2
        camera.cullingMask = cullingMask;

        // 新建一个 RenderTexture，并且设置 camera 的 targetTexture 为新建的 RenderTexture，这样 camera 的内容将会渲染到新建的 RenderTexture 中。
        const texture = new RenderTexture();
        texture.setPremultiplyAlpha(true);

        // @ts-ignore
        const vrw = node ? node.width * Math.abs(node.scaleX) : visibleRect.width;
        // @ts-ignore
        const vrh = node ? node.height * Math.abs(node.scaleY) : visibleRect.height;

        const moreX = Math.max(bound.maxX, Math.abs(bound.minX));
        const moreY = Math.max(bound.maxY, Math.abs(bound.minY));
        const w = vrw + (moreX ? moreX * 2 + 100 : 0);
        const h = vrh + (moreY ? moreY * 2 + 100 : 0);
        // var h = Math.max(visibleRect.height,bound.maxY - bound.minY)
        // var h = visibleRect.height
        // log(vrw, vrh, "bound", bound, "wh", w, h);
        texture.initWithSize(w, h);
        camera.targetTexture = texture;

        // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
        // @ts-ignore
        camera.render();
        // 畫完後砍了，避免一直更新 texture
        camera.destroy();

        if (type === CaptureType.RenderTexture) {
            return texture;
        }
        // 这样我们就能从 RenderTexture 中获取到数据了
        const data = texture.readPixels();

        if (type === CaptureType.Uint8Array) {
            return data;
        }

        // 接下来就可以对这些数据进行操作了
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = texture.width;
        canvas.height = texture.height;
        const width = canvas.width;
        const height = canvas.height;

        const rowBytes = width * 4;
        for (let row = 0; row < height; row += 1) {
            const srow = height - 1 - row;
            const imageData = ctx.createImageData(width, 1);
            const start = srow * width * 4;
            for (let i = 0; i < rowBytes; i += 1) {
                imageData.data[i] = data[start + i];
            }

            ctx.putImageData(imageData, 0, row);
        }

        const dataURL = canvas.toDataURL('image/png');
        if (type === CaptureType.DataUrl) {
            return dataURL;
        }

        if (type === CaptureType.Base64) {
            return dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        }
        return '';
    }

    public renderToTexture(more?: Vec2, node?: Node, cameraNode?: Node, cullingMask: number = 2): RenderTexture {

        let n = cameraNode;
        if (!n) {
            n = this.node;
        }
        let camera = n.getComponent(Camera);
        if (!camera) {
            camera = n.addComponent(Camera);
            camera.cullingMask = cullingMask;
        }
        camera.clearColor = color(0, 0, 0, 0);
        // 设置你想要的截图内容的 cullingMask
        // TODO: 用法尚不明
        // 先固定使用 groupIndex = 1
        // 及 cullingMask = 2

        // 新建一个 RenderTexture，并且设置 camera 的 targetTexture 为新建的 RenderTexture，这样 camera 的内容将会渲染到新建的 RenderTexture 中。
        const texture = new RenderTexture();
        texture.setPremultiplyAlpha(true);

        // @ts-ignore
        const vrw = node ? node.width * Math.abs(node.scaleX) : visibleRect.width;
        // @ts-ignore
        const vrh = node ? node.height * Math.abs(node.scaleY) : visibleRect.height;

        const w = vrw + (more ? more.x : 0);
        const h = vrh + (more ? more.y : 0);
        // var h = Math.max(visibleRect.height,bound.maxY - bound.minY)
        // var h = visibleRect.height
        // log(vrw, vrh, "bound", bound, "wh", w, h);
        texture.initWithSize(w, h);
        camera.targetTexture = texture;

        // 渲染一次摄像机，即更新一次内容到 RenderTexture 中
        camera.clearFlags = 1;
        camera.render(node);

        return texture;
    }
}
