import { _decorator, Component, Node } from 'cc';
import { nodeActive } from '../utils/Utils';
import CommonButton from './CommonButton';

const { ccclass, property } = _decorator;

@ccclass
export default class UIToggle extends Component {

    @property([Node])
    nodes: Node[] = [];

    @property(CommonButton)
    refCommonButton: CommonButton = null;

    public able: boolean = false;

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    private pre() {
        if (this.loaded) {
            return;
        }
        if (!this.nodes.length) {
            this.nodes.push(this.node);
        }
        this.able = this.node.active;
        this.refreshCommonButton(this.able);
    }

    private refreshCommonButton(able: boolean) {
        if (this.refCommonButton) {
            this.refCommonButton.isChecked = able;
            this.refCommonButton.keepBright = able;
        }
    }

    public toggle(able = !this.able) {
        this.pre();
        this.nodes.map(nodeActive(able));
        this.able = able;
        this.refreshCommonButton(able);
    }

    onClick() {
        this.toggle();
    }

    onCloseClick() {
        this.toggle(false);
    }

    onOpenClick() {
        this.toggle(true);
    }
}
