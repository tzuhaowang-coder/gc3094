import { _decorator, Button, Color, Component, Label, Material, Node, Sprite, Widget } from 'cc';
import { ColFade } from '../data/ColFade';
import { translate } from '../I18nGlobal';
import { reload } from '../IframeGlobal';
import { nodeActive, setNodeColor, setNodeHeight, setNodeOpacity } from '../utils/Utils';
import CommonButton from './CommonButton';

const { ccclass, property } = _decorator;

let al: Alert = null;

export function gameAlert(messageOrMessages: string | string[], title: string = DEFAULT_TITLE, priority: number = DEFAULT_PRIORITY, callback: AlertDataCallback = DEFAULT_CALLBACK) {
    if (!al || !al.isValid) {
        return;
    }
    const msgs = Array.isArray(messageOrMessages) ? messageOrMessages : [messageOrMessages];
    al.show({
        msgs,
        title,
        priority,
        callback,
    });
}

export function gameAlertRaw(): Alert {
    return al;
}

/**
 * 提示斷線 reload
 * 已是最後操作
 */
export function gameAlertRefresh(message: string, refreshAble: boolean = true, priority: number = DEFAULT_PRIORITY) {
    if (!al || !al.isValid) {
        return;
    }
    al.alertRefresh(message, refreshAble, priority);
}

export function gameAlertCloseAll() {
    if (!al || !al.isValid) {
        return;
    }
    al.closeAll();
}

/**
 * 提示倒數
 */
export function gameAlertTick(message: string, callback: AlertDataCallback = DEFAULT_CALLBACK, tick: string) {
    if (!al || !al.isValid) {
        return;
    }
    al.alertTick(message, callback, tick);
}

export enum AlertClickType {
    CONFIRM = 0,
    CANCEL = 1,
    CLOSE = 2,
    NONE = 3,
}

type AlertDataCallback = (clickType:AlertClickType) => void;

interface AlertData {
    msgs: string[];
    title: string;
    callback:AlertDataCallback;
    priority: number;
    tick: string;
}

function sort(a: AlertData, b: AlertData) {
    return b.priority - a.priority;
}

const DEFAULT_TITLE = '';
const DEFAULT_PRIORITY = 0;
const DEFAULT_CALLBACK = null;
export const SUPER_PRIORITY = 1000;

@ccclass
export default class Alert extends Component {

    @property(Node)
    winAlertNode: Node = null;

    @property([Widget])
    canvasWidget: Widget[] = [];

    @property(ColFade)
    colFade: ColFade = null;

    @property(Label)
    labelTitle: Label = null;

    @property(Label)
    labelMessage: Label = null;

    @property(Node)
    tickNode: Node = null;

    @property(Label)
    labelTick: Label = null;

    @property([Node])
    callbackNodes: Node[] = [];

    @property([Node])
    reloadNodes: Node[] = [];

    @property([Node])
    dialogNodes: Node[] = [];

    @property(Material)
    defaultMat: Material = null;

    @property(Material)
    grayMat: Material = null;

    onLoad() {
        this.pre();
        if (!al) {
            al = this;
        }
    }

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.node.setSiblingIndex(10);

        this.toggleActive(false);
        // //手機版放大
        // if (sys.isMobile) {
        //     this.node.setScale(1.5);
        // }

        this.labelTitle.node.active = true;
        setNodeHeight(this.node, 500);
        setNodeColor(this.node, Color.WHITE);
        setNodeOpacity(this.node, 240);

        if (this.queue.length) {
            this.doAlert(0);
        }

    }

    private loaded: boolean = false;

    private index: number = -1;

    private queue: AlertData[] = [];

    private delta: number = 0;

    private updateMessageIndex: number = 0;

    private needUpdateMessage: boolean = false;

    update(dt: number) {
        if (!this.needUpdateMessage) {
            return;
        }
        this.delta += dt;
        if (this.delta >= 1) {
            const data = this.queue[this.index];
            const txt = translate(data.msgs[this.updateMessageIndex]);
            this.labelMessage.string = txt;
            this.updateMessageIndex = this.updateMessageIndex + 1 >= data.msgs.length ? 0 : this.updateMessageIndex + 1;
            this.delta -= 1;
        }
    }

    private createAlertData(data: Partial<AlertData>): AlertData {
        return Object.assign(
            {
                msgs: [],
                title: DEFAULT_TITLE,
                priority: DEFAULT_PRIORITY,
                callback: DEFAULT_CALLBACK,
                tick: '',
            },
            data,
        );
    }

    public show(data: Partial<AlertData>) {
        if (!data.msgs || !data.msgs.length) {
            return;
        }

        const txt = data.msgs.join('###');
        const arr = this.queue.filter(el => el.msgs.join('###') === txt && el.tick === data.tick);
        // msg not in queue
        if (!arr.length) {
            this.queue.push(this.createAlertData(data));
        }
        this.queue.sort(sort);
        this.doAlert(0);
    }

    public alert(messageOrMessages: string | string[], title: string = DEFAULT_TITLE, priority: number = DEFAULT_PRIORITY, callback: AlertDataCallback = DEFAULT_CALLBACK, tick: string = '') {
        const msgs = Array.isArray(messageOrMessages) ? messageOrMessages : [messageOrMessages];
        this.show({
            msgs,
            title,
            priority,
            callback,
            tick,
        });
    }

    /**
     * 提示斷線 reload
     * 已是最後操作
     */
    public alertRefresh(message: string, refreshAble: boolean = true, priority: number = DEFAULT_PRIORITY) {
        this.queue.length = 0;
        const next = () => {
            this.reloadNodes.forEach((node) => {
                this.nodeGray(node, refreshAble);
                this.btnEnable(node, refreshAble);
            });
            reload();
        };
        this.alert(message, DEFAULT_TITLE, priority, refreshAble ? next : null);
        this.queue.push(this.createAlertData({ msgs: [message] }));
        this.callbackNodes.forEach(nodeActive(false));
        this.dialogNodes.forEach(nodeActive(false));
        this.reloadNodes.forEach(nodeActive(refreshAble));
        this.toggleTickNode(false);
    }

    public dialog(message:string , next?:AlertDataCallback) {
        this.alertDialog(message, next);
    }

    public alertDialog(message:string , next?:AlertDataCallback) {
        this.queue.length = 0;
        this.alert(message, DEFAULT_TITLE, DEFAULT_PRIORITY, next);
        this.callbackNodes.forEach(nodeActive(false));
        this.reloadNodes.forEach(nodeActive(false));
        this.dialogNodes.forEach(nodeActive(true));
        this.toggleTickNode(false);
    }

    /**
     * 提示倒數
     */
    public alertTick(message: string, next?: AlertDataCallback, tick?: string) {
        this.queue.length = 0;
        this.alert(message, DEFAULT_TITLE, DEFAULT_PRIORITY, next, tick);
        this.callbackNodes.forEach(nodeActive(false));
        this.dialogNodes.forEach(nodeActive(false));
        this.reloadNodes.forEach(nodeActive(false));
        this.toggleTickNode(true, Boolean(next));
    }

    private doAlert(index: number) {
        this.pre();

        this.index = index;
        const data = this.queue[index];

        this.labelTitle.string = data.title;
        const txt = translate(data.msgs[0]);
        this.labelMessage.string = txt;

        if (this.labelTick) {
            this.labelTick.string = translate(data.tick);
        }

        this.needUpdateMessage = data.msgs.length > 1;
        this.updateMessageIndex = 1;

        this.callbackNodes.forEach(nodeActive(Boolean(data.callback)));

        this.toggleTickNode(data.tick && Boolean(data.callback), Boolean(data.callback));
        this.toggleActive(true);
    }

    onConfirmClick() {
        this.close(AlertClickType.CONFIRM);
    }

    onCloseClick() {
        this.close(AlertClickType.CLOSE);
    }

    onCancelClick() {
        this.close(AlertClickType.CANCEL);
    }

    private close(clickType:AlertClickType= AlertClickType.NONE) {
        if (this.index !== -1) {
            const data = this.queue[this.index];
            if (clickType !== AlertClickType.NONE) {
                data && data.callback && data.callback(clickType);
            }
            this.remove(this.index);
        }
        if (this.queue.length > 0) {
            this.doAlert(0);
        } else {
            this.toggleActive(false);
        }
    }

    public closeAll() {
        this.queue.length = 0;
        this.toggleActive(false);
    }

    private remove(index: number) {
        this.queue.splice(index, 1);
    }

    public only1() {
        this.queue = [this.queue[0]];
    }

    public filter(priority: number) {
        let tag = false;
        this.queue = this.queue.filter((d, index) => {
            const keep = d.priority !== priority;
            if (this.index === index && !keep) {
                tag = true;
            }
            return keep;
        });
        if (tag) {
            this.index = -1;
            this.close(AlertClickType.CLOSE);
        }
    }

    private toggleActive(able: boolean = !this.node.active) {
        this.winAlertNode.active = able;
        if (!able) {
            this.needUpdateMessage = false;
        }
        if (this.colFade) {
            this.colFade.reset(able);
        }
    }

    private toggleTickNode(value: boolean, hasCallback: boolean = false) {
        if (!this.tickNode) {
            return;
        }
        if (value) {
            this.tickNode.active = true;
            this.nodeGray(this.tickNode, hasCallback);
            this.btnEnable(this.tickNode, hasCallback);
        } else {
            this.tickNode.active = false;
        }
    }

    private nodeGray(node: Node, isNormal: boolean = true) {
        const s = node.getComponent(Sprite);
        if (s) {
            s.setMaterial(isNormal ? this.defaultMat : this.grayMat, 0);
        }
    }

    private btnEnable(node: Node, isNormal: boolean = true) {
        const b = node.getComponent(CommonButton);
        if (b) {
            b.enabled = isNormal ? true : false;
        }
        const b2 = node.getComponent(Button);
        if (b2) {
            b2.enabled = isNormal ? true : false;
        }
    }

}
