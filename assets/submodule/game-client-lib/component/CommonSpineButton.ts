import { _decorator, Button, CCString, Color, Component, EventHandler, Node, Size, sp, sys } from 'cc';
import { globalDebugNNN } from '../LibGlobal';
import { spSkeletonSetAnimation } from '../script/PromiseManager';
import { getNodeContentSize, nodeActive, setNodeContentSize, setNodeOpacity } from '../utils/Utils';

const { ccclass, property, menu } = _decorator;

enum SPINE_BUTTON_STATE {
    NONE = 0,
    NORMAL = 10,
    DOWN = 21,
    PRESS = 22,
    UP = 23,
    BRIGHT = 31,
    DARK = 32,
}

const STATE_STR_MAP = {
    [SPINE_BUTTON_STATE.BRIGHT]: 'bright',
    [SPINE_BUTTON_STATE.DARK]: 'dark',

    [SPINE_BUTTON_STATE.NORMAL]: 'normal',
    [SPINE_BUTTON_STATE.DOWN]: 'down',
    [SPINE_BUTTON_STATE.PRESS]: 'press',
    [SPINE_BUTTON_STATE.UP]: 'up',
};

function getButtonAnimationType(prefix: string, strs: string[]): number {
    if (strs.indexOf(getAnimationName(prefix, SPINE_BUTTON_STATE.PRESS)) !== -1) {
        return 1;
    } else {
        return 2;
    }
}

function getAnimationName(prefix: string, state: SPINE_BUTTON_STATE): string {
    if (state === SPINE_BUTTON_STATE.NONE) {
        return 'empty';
    }
    return `${prefix}_${STATE_STR_MAP[state]}`;
}

@ccclass
@menu('Button/CommonSpineButton')
export default class CommonSpineButton extends Component {

    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    @property(CCString)
    prefix: string = '';

    @property(Color)
    darkColor: Color = new Color(0, 0, 0, 180);

    @property([Node])
    checkmarks: Node[] = [];

    @property([Node])
    notCheckmarks: Node[] = [];

    @property(Component.EventHandler)
    onClickHandler: EventHandler = null;

    @property([Component.EventHandler])
    onClickHandlers: EventHandler[] = [];

    private brightNode: Node = null;
    private darkNode: Node = null;

    // 点击事件绑在此
    private button: Button = null;

    // tslint:disable-next-line:variable-name
    private _interactable: boolean = true;

    // tslint:disable-next-line:variable-name
    private _isChecked: boolean = false;

    public set interactable(able: boolean) {
        this._interactable = able;
        this.button.interactable = able;
        this.apply();
        if (this.isPress) {
            this.isPress = false;
            this.refreshPress(false);
        }
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

    // private mouseEnter: Function;
    // private mouseLeave: Function;

    // private mouseDown: Function;
    // private mouseUp: Function;

    private isHover: boolean = false;

    private isPress: boolean = false;

    private type: number = 0;

    onLoad () {

        globalDebugNNN(this, 'csb');

        // 主按钮
        this.button = this.node.addComponent(Button);
        this.button.transition = Button.Transition.NONE;
        try {
            this.button.target = this.node;
        } catch {

        }

        this.button.clickEvents.push(
            this.onClickHandler,
            ...this.onClickHandlers,
        );
        // @ts-ignore
        const mode: sp.Skeleton.AnimationCacheMode = this.skeleton._cacheMode;
        const skeletonData = this.skeleton.skeletonData;
        const scale = this.skeleton.node.scale;
        const size = getNodeContentSize(this.node);
        const skeletonSize = new Size(size.width / scale.x, size.height / scale.y);

        // brightNode
        const brightNode = new Node('brightNode');
        setNodeContentSize(brightNode, skeletonSize.x , skeletonSize.y);
        brightNode.scale = scale;
        brightNode.setParent(this.node);
        setNodeOpacity(brightNode, 0);
        this.brightNode = brightNode;

         // brightSkeleton
        const brightSkeleton = brightNode.addComponent(sp.Skeleton);
        brightSkeleton.skeletonData = skeletonData;
        brightSkeleton.setAnimationCacheMode(mode);
        spSkeletonSetAnimation(brightSkeleton, getAnimationName(this.prefix, SPINE_BUTTON_STATE.BRIGHT), false);
        spSkeletonSetAnimation(this.skeleton, getAnimationName(this.prefix, SPINE_BUTTON_STATE.NORMAL), true);
        const strs = Object.keys(skeletonData.getRuntimeData().animations).filter(s => s.startsWith(this.prefix));
        this.type = getButtonAnimationType(this.prefix, strs);

        // darkNode
        const darkNode = new Node('darkNode');
        this.darkNode = darkNode;
        darkNode.scale = scale;
        darkNode.setParent(this.node);
        setNodeOpacity(darkNode, this.darkColor.a);
        const darkSkeleton = darkNode.addComponent(sp.Skeleton);
        darkSkeleton.setAnimationCacheMode(mode);
        darkSkeleton.skeletonData = skeletonData;
        spSkeletonSetAnimation(darkSkeleton, getAnimationName(this.prefix, SPINE_BUTTON_STATE.DARK), false);
        this.apply();
        // if (DEBUG) {
        //     const node = new Node();
        //     const sprite = node.addComponent(Sprite);
        //     sprite.spriteFrame = getSpriteFrame('pic_popup_line');
        //     sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        //     node.setContentSize(size);
        //     node.setParent(this.node);
        // }
    }

    onMouseEnter() {
        // warn('csb onMouseEnter');
        // this.mouseEnter && this.mouseEnter();
        this.isHover = true;
        if (this.interactable) {
            this.refreshBright(true);
        }
    }

    onMouseLeave() {
        // warn('csb onMouseLeave');
        // this.mouseLeave && this.mouseLeave();
        this.isHover = false;
        if (this.interactable) {
            this.refreshBright(false);
            if (this.isPress) {
                this.isPress = false;
                this.refreshPress(false);
            }
        }
    }

    private apply() {
        this.refreshBright(this.isHover);
        this.refreshDark(this.interactable);
    }

    private refreshBright(able: boolean) {
        setNodeOpacity(this.brightNode, able ? 255 : 0);
    }

    private refreshDark(able: boolean) {
        setNodeOpacity(this.darkNode, able ? 0 :255);
    }

    public press() {
        if (this.isPress) {
            return;
        }
        let arr: SPINE_BUTTON_STATE[] = [];
        if (this.type === 1) {
            arr = [
                SPINE_BUTTON_STATE.DOWN,
                SPINE_BUTTON_STATE.UP,
                SPINE_BUTTON_STATE.NORMAL,
            ];
        } else if (this.type === 2) {
            arr = [
                SPINE_BUTTON_STATE.DOWN,
                SPINE_BUTTON_STATE.NORMAL,
            ];
        }
        if (arr.length) {
            const strs = arr.map(s => getAnimationName(this.prefix, s));
            spSkeletonSetAnimation(this.skeleton, strs, true);
        }
    }

    private refreshPress(press: boolean) {
        let arr: SPINE_BUTTON_STATE[] = [];
        let loop = false;
        if (press) {
            if (this.type === 1) {
                arr = [
                    SPINE_BUTTON_STATE.DOWN,
                    SPINE_BUTTON_STATE.PRESS,
                ];
                loop = false;
            } else if (this.type === 2) {
                arr = [
                    SPINE_BUTTON_STATE.DOWN,
                    SPINE_BUTTON_STATE.NORMAL,
                ];
                loop = true;
            } else {
                debugger;
            }
        } else {
            if (this.type === 1) {
                arr = [
                    SPINE_BUTTON_STATE.UP,
                    SPINE_BUTTON_STATE.NORMAL,
                ];
                loop = true;
            }
        }
        if (arr.length) {
            const strs = arr.map(s => getAnimationName(this.prefix, s));
            spSkeletonSetAnimation(this.skeleton, strs, loop);
        }
    }

    onMouseDown() {
        // this.mouseDown && this.mouseDown();
        if (this.interactable) {
            this.isPress = true;
            this.refreshPress(true);
        }
    }

    onMouseUp() {
        // this.mouseUp && this.mouseUp();
        if (this.interactable) {
            if (this.isPress) {
                this.isPress = false;
                this.refreshPress(false);
            }
        }
    }

    onEnable() {
        if (sys.isMobile) {
            this.node.on(Node.EventType.TOUCH_START, this.onMouseDown, this);
            this.node.on(Node.EventType.TOUCH_END, this.onMouseUp, this);
        } else {
            this.brightNode.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.brightNode.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
            this.node.on(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
            this.node.on(Node.EventType.MOUSE_UP, this.onMouseUp, this);
        }
    }

    onDisable() {
        if (sys.isMobile) {
            this.node.off(Node.EventType.TOUCH_START, this.onMouseDown, this);
            this.node.off(Node.EventType.TOUCH_END, this.onMouseUp, this);
        } else {
            this.brightNode.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
            this.brightNode.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
            this.node.off(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
            this.node.off(Node.EventType.MOUSE_UP, this.onMouseUp, this);
        }
    }

}
