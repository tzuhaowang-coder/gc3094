
import { _decorator, CCString, Component, Node } from 'cc';
import ColBase from '../data/ColBase';
import { ColProperty } from '../data/ColProperty';
import FeatureBuy from '../featurebuy/FeatureBuy';
import ColButtonFeaturebuy from './ColButtonFeaturebuy';
import ColButtonPowerBet from './ColButtonPowerBet';
import ColButtonSpin, { audioKey as ColButtonSpinAudioKey } from './ColButtonSpin';
import CommonUISlot from './CommonUISlot';

const { ccclass, property, executionOrder } = _decorator;

export type audioKey = ColButtonSpinAudioKey;

@ccclass
export default class CommonUISlotConfig extends Component {

    @property(Node)
    autoLabelNode: Node = null;

    @property(Node)
    uiNode: Node = null;

    @property(Node)
    bottomCustomNode: Node = null;

    @property(Node)
    featurebuyNode: Node = null;

    @property(Node)
    colButtonFeaturebuyNode: Node = null;

    @property(Node)
    powerBetNode: Node = null;

    @property(Node)
    colButtonPowerBetNode: Node = null;

    @property([CCString])
    audioNames: string[] = [];

    onLoad(): void {
        const uiNode = this.uiNode || this.node;
        const ui = uiNode.getComponent(CommonUISlot);
        const data = ui.getData();

        if (this.autoLabelNode) {
            const cbs = this.getComponentInChildren(ColButtonSpin);
            cbs.labelNode.children[0].removeFromParent();
            this.autoLabelNode.setParent(cbs.labelNode);
            this.autoLabelNode.setSiblingIndex(0);
            cbs.audioNames = this.audioNames;
        }

        if (this.bottomCustomNode) {
            const uin = ui.bottomCustomNode;
            const n = this.bottomCustomNode;
            n.setPosition(0, 0, 0);
            n.setParent(uin);
        }

        if (this.featurebuyNode) {
            // const uin = ui.featurebuyNode;
            const n = this.featurebuyNode;
            // n.setPosition(0, 0, 0);
            // n.setParent(uin);
            const featurebuy = n.getComponent(FeatureBuy);
            featurebuy.commonUIData = data;
            ui.featureBuy = featurebuy;
            const col = n.addComponent(ColProperty);
            ui.register(col, 'displayFeatureBuyPanel');
            featurebuy.onFeatureBuyClick = ui.featurebuyClickHandler;
        }

        if (this.colButtonFeaturebuyNode) {
            const col = this.colButtonFeaturebuyNode.getComponent(ColButtonFeaturebuy);
            ui.register(col, 'featureBuyState');
            this.colButtonFeaturebuyNode.getComponentsInChildren(ColBase).forEach((col) => {
                ui.register(col, col.colKey);
            });
        }

        if (this.powerBetNode) {
            const uin = ui.powerBetNode;
            const n = this.powerBetNode;
            n.setPosition(0, 0, 0);
            n.setParent(uin);
        }

        if (this.colButtonPowerBetNode) {
            const col = this.colButtonPowerBetNode.getComponent(ColButtonPowerBet);
            ui.register(col, 'powerBetState');
            this.colButtonPowerBetNode.getComponentsInChildren(ColBase).forEach((col) => {
                ui.register(col, col.colKey);
            });
        }

    }
}
