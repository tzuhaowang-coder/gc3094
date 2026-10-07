import { _decorator, CCBoolean, Component, EventMouse, EventTouch, Node, Sprite, SpriteFrame, v2, Vec2, Widget } from 'cc';
import { getNodeHeight, getNodeWidth, NODE_LAYER_UI_2D, setNodeAnchor, setNodeContentSize, vecXToVec3 } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class Cursor extends Component {

    public cursorNode: Node = null;

    private widget: Widget = null;

    @property(SpriteFrame)
    cursorSpriteFrame: SpriteFrame = null;

    @property(v2)
    anchor: Vec2 = v2();

    @property(CCBoolean)
    keepWhenMobile = false;

    private hide: boolean = false;

    private mouseEventTrigged: boolean = false;

    public haveMouseEvent: boolean = false;

    onLoad() {
        // if (sys.isMobile) {
        //     return;
        // }

        const node = this.node;

        if (node.children.length) {
            this.cursorNode = node.children[0];
        } else if (this.cursorSpriteFrame) {
            const node = new Node('Cursor');
            node.layer = NODE_LAYER_UI_2D;
            node.setParent(this.node);
            setNodeAnchor(node, this.anchor.x, this.anchor.y);
            const size = this.cursorSpriteFrame.originalSize;
            setNodeContentSize(node, size.x, size.y);

            const cs = node.addComponent(Sprite);
            cs.sizeMode = Sprite.SizeMode.RAW;
            cs.trim = false;
            cs.spriteFrame = this.cursorSpriteFrame;
            this.cursorNode = node;
        } else { // 假的，只是要事件
            const node = new Node();
            this.node.addChild(node);
            this.cursorNode = node;
            this.hide = true;
        }

        const w = this.getComponent(Widget) || this.addComponent(Widget);
        w.top = 0;
        w.bottom = 0;
        w.left = 0;
        w.right = 0;
        w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        w.updateAlignment();
        this.widget = w;

        node.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        node.on(Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        node.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);

        this.cursorNode.active = false;
        const touch = () => {
            // @ts-ignore
            node._touchListener.setSwallowTouches(false);
            node.off(Node.EventType.TOUCH_START, touch);
            this.haveMouseEvent = this.mouseEventTrigged;
            if (this.hide) {
                return;
            }
            // 不是假的，而且沒有 mouse event
            if (!this.haveMouseEvent) {
                if (this.keepWhenMobile) {
                    return;
                }
                node.destroy();
            }
        };
        node.on(Node.EventType.TOUCH_START, touch);
        node.setSiblingIndex(999);

    }

    private touch: (event: EventTouch) => void = null;

    private move: (event: EventMouse) => void = null;

    public bindTouch(touch: (event: EventTouch) => void) {
        const node = this.node;
        if (this.touch) {
            node.off(Node.EventType.TOUCH_END, this.touch, this);
            node.off(Node.EventType.TOUCH_START, this.touch, this);
            node.off(Node.EventType.TOUCH_MOVE, this.touch, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.touch, this);
        }
        if (touch) {
            node.on(Node.EventType.TOUCH_END, touch, this);
            node.on(Node.EventType.TOUCH_START, touch, this);
            node.on(Node.EventType.TOUCH_MOVE, touch, this);
            node.on(Node.EventType.TOUCH_CANCEL, touch, this);
        }
        this.touch = touch;
    }

    public bindMove(move: (event: EventMouse) => void) {
        this.move = move;
    }

    onMouseEnter(event: EventMouse) {
        this.mouseEventTrigged = true;
        if (!this.hide) {
            document.body.style.cursor = 'none';
        }

        const x = event.getLocationX();
        const y = event.getLocationY();
        const pos = v2(x - getNodeWidth(this.widget.node) / 2, y - getNodeHeight(this.widget.node) / 2);

        this.cursorNode.setPosition(vecXToVec3(pos));
        this.cursorNode.active = true;
        if (this.move) {
            this.move(event);
        }
    }

    onMouseMove(event: EventMouse) {
        this.mouseEventTrigged = true;
        const x = event.getLocationX();
        const y = event.getLocationY();
        const pos = v2(x -  getNodeWidth(this.widget.node) / 2, y - getNodeHeight(this.widget.node) / 2);

        this.cursorNode.setPosition(vecXToVec3(pos));
        if (this.move) {
            this.move(event);
        }
    }

    onMouseLeave(event: EventMouse) {
        this.mouseEventTrigged = true;
        if (!this.hide) {
            document.body.style.cursor = 'auto';
        }

        this.cursorNode.active = false;
        if (this.move) {
            this.move(event);
        }
    }
}
