import { _decorator, Component, Label, Node, Widget } from 'cc';
import ToastData from '../data/ToastData';
import { translate } from '../I18nGlobal';
import { getNodeOpacity, log, setNodeOpacity } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export class Toast extends Component {

    private toastQueue: ToastData[] = [];

    @property(Node)
    private background: Node = null;

    @property([Widget])
    canvasWidget: Widget[] = [];

    // 訊息內容
    @property(Label)
    private label: Label = null;

    // 最後訊息
    private lastToastData: ToastData = null;

    private loaded: boolean = false;

    private pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        this.background = this.background || (this.node.children && this.node.children[0]);
        this.label = this.label || this.getComponentInChildren(Label);
    }

    public show(msg: string, sec: number = 2, skipRepeat: boolean = true) {
        this.pre();
        const txt = translate(msg);
        this.toastQueue.push(new ToastData(txt, sec, skipRepeat));

        if (!getNodeOpacity(this.node)) {
            this.showNext();
        }
    }

    // 顯示下一個
    private showNext() {
        while (this.toastQueue.length > 0) {
            const toastMsg: ToastData = this.toastQueue.shift();

            if (this.lastToastData && toastMsg.skipRepeat && this.lastToastData.msg === toastMsg.msg) {
                continue;
            }

            log('toastMsg', toastMsg.msg);
            this.label.string = toastMsg.msg;
            this.lastToastData = toastMsg;
            setNodeOpacity(this.node, 255);

            this.unscheduleAllCallbacks();
            this.scheduleOnce(this.showNext.bind(this), toastMsg.time);
            return;
        }
        this.lastToastData = null;
        setNodeOpacity(this.node, 0);
    }

    public clear() {
        this.toastQueue.length = 0;
        this.lastToastData = null;
        setNodeOpacity(this.node, 0);
    }

}
