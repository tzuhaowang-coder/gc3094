import { _decorator, Camera, Component, Node, Sprite, SpriteFrame } from 'cc';
import Screenshot from '../../game-client-lib/component/Screenshot';
import { setNodeScaleY } from '../utils/Utils';

const { ccclass, property } = _decorator;

/**
 * 預計替代 Shadow.ts
 */
@ccclass
export default class ScreenshotRenderToSprite extends Component {

    @property(Camera)
    camera: Camera = null;

    @property(Node)
    root: Node = null;

    @property([Sprite])
    sprites: Sprite[] = [];

    start() {
        let screenshot: Screenshot = this.camera.node.getComponent(Screenshot);

        if (!screenshot) {
            screenshot = this.camera.node.addComponent(Screenshot);
        }
        // 截圖
        const renderTexture = screenshot.renderToTexture(undefined, this.root, this.camera.node);

        const frame = new SpriteFrame();
        frame.texture = renderTexture;

        const each = (sprite: Sprite) => {
            sprite.spriteFrame = frame;
            // 修正上下顛倒
            setNodeScaleY(sprite.node, -1);
        };
        this.sprites.forEach(each);
    }
}
