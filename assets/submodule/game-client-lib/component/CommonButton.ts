
import { _decorator, Button, CCFloat, Color, Component, EventHandler, Node, sys, UIRenderer } from 'cc';
import { stopAllActions } from '../utils/Tween';
import { nodeActive, setNodeOpacity } from '../utils/Utils';

const { ccclass, property, menu } = _decorator;

export enum TYPE {
    NORMAL,
    DARK,
    BRIGHT,
}

@ccclass
@menu('Button/CommonButton')
export default class CommonButton extends Component {

    @property({
        type: Node,
        tooltip: '亮暗按鈕',
    })
    targetNode: Node = null;

    @property({
        type: Node,
        tooltip: '主按鈕，會被縮放的',
    })
    scaleNode: Node = null;

    @property({
        type: Node,
        tooltip: '',
    })
    hoverNode: Node = null;

    @property([Component.EventHandler])
    onClickHandlers: EventHandler[] = [];

    @property(CCFloat)
    zoomScale: number = 0.9;

    @property(Color)
    darkColor: Color = new Color(0, 0, 0, 180);

    @property([Node])
    checkmarks: Node[] = [];

    @property([Node])
    notCheckmarks: Node[] = [];

    // tslint:disable-next-line:variable-name
    private _interactable: boolean = true;

    // tslint:disable-next-line:variable-name
    private _isChecked: boolean = false;

    private isHover: boolean = false;

    private loaded: boolean = false;

    onLoad() {
        this.pre();
    }

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        // {sprite, button}
        //   - textNode {sprite}
        //   - darkNode {sprite}
        //   - brightNode {sprite}

        this.targetNode = this.targetNode || this.node;
        this.scaleNode = this.scaleNode || this.node;
        this.hoverNode = this.hoverNode || this.targetNode || this.node;

        // applyColor(this.targetNode, TYPE.NORMAL);

        // 主按钮
        this.scaleButton = this.scaleNode.addComponent(Button);
        this.scaleButton.target = this.scaleNode;
        this.scaleButton.transition = Button.Transition.SCALE;

        const handler = new Component.EventHandler();
        handler.component = 'CommonButton';
        handler.target = this.node;
        handler.handler = 'toggleChecked';

        this.scaleButton.clickEvents.push(
            handler,
            ...this.onClickHandlers,
        );
        this.scaleButton.zoomScale = this.zoomScale;

        this.loopDarkNodes(false, true);
        this.apply();
    }

    onClick() {
        this.toggleChecked();
        [...this.onClickHandlers].forEach(h => h && h.emit([]));
    }

    private dark: boolean = false;

    private loopDarkNodes(able: boolean, force: boolean = false) {
        if (this.dark === able && !force) {
            return;
        }
        this.dark = able;

        const to = able ? this.darkColor.a : 255;
        const node = this.node;
        if (!node) {
            debugger;
        }
        stopAllActions(node);
        setNodeOpacity(node, to);
        node.getComponentsInChildren(UIRenderer).forEach(r => setNodeOpacity(r.node, to));
        // applyNodeTween({
        //     node,
        //     action: tintTo(.1, to, to, to),
        // });
    }

    private mouseEnter: Function;

    public bindMouseEnter(fn: Function) {
        this.mouseEnter = fn;
    }

    private mouseLeave: Function;

    public bindMouseLeave(fn: Function) {
        this.mouseLeave = fn;
    }

    onMouseEnter() {
        this.mouseEnter && this.mouseEnter();
        this.isHover = true;
        if (this.interactable) {
            // do nothing
        }
    }

    onMouseLeave() {
        this.mouseLeave && this.mouseLeave();
        this.isHover = false;
        if (this.interactable) {
            // do nothing
        }
    }

    onEnable() {
        if (sys.isMobile) {
            this.hoverNode.on(Node.EventType.TOUCH_START, this.onMouseEnter, this);
            this.hoverNode.on(Node.EventType.TOUCH_END, this.onMouseLeave, this);
            this.hoverNode.on(Node.EventType.TOUCH_CANCEL, this.onMouseLeave, this);
        } else {
            this.hoverNode.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.hoverNode.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        }
        this.apply();
    }

    onDisable() {
        if (sys.isMobile) {
            this.hoverNode.off(Node.EventType.TOUCH_START, this.onMouseEnter, this);
            this.hoverNode.off(Node.EventType.TOUCH_END, this.onMouseLeave, this);
            this.hoverNode.off(Node.EventType.TOUCH_CANCEL, this.onMouseLeave, this);
        } else {
            this.hoverNode.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.hoverNode.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        }
        this.isHover = false;
    }

    // 控制缩放的按钮、点击事件绑在此
    private scaleButton: Button = null;

    public set interactable(value: boolean) {
        this._interactable = value;
        this.apply();
    }

    public get interactable(): boolean {
        return this._interactable;
    }

    public set isChecked(value: boolean) {
        this.checkmarks.forEach(nodeActive(value));
        this.notCheckmarks.forEach(nodeActive(!value));
        this._isChecked = value;
    }

    public get isChecked(): boolean {
        return this._isChecked;
    }

    public isHovered() {
        return this.isHover;
    }

    toggleChecked() {
        this.isChecked = !this.isChecked;
    }

    private apply() {
        this.pre();
        const interactable = this.interactable;

        this.scaleButton.interactable = interactable;
        const dark = !interactable;
        this.loopDarkNodes(dark);
    }
}
