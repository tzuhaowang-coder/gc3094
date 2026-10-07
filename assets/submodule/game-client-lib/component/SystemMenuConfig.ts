import { _decorator, CCBoolean, CCInteger, Component, EventHandler, Node } from 'cc';
import SystemMenu from './SystemMenu';

const { ccclass, property } = _decorator;

@ccclass
export default class SystemMenuConfig extends Component {

    @property(CCInteger)
    zIndex: number = 0;

    @property(Node)
    systemMenuNode: Node = null;

    @property(CCBoolean)
    able: boolean = false;

    @property(EventHandler)
    backHandler: EventHandler = null;

    @property(EventHandler)
    helpHandler: EventHandler = null;

    @property(EventHandler)
    audioHandler: EventHandler = null;

    @property(EventHandler)
    recordHandler: EventHandler = null;

    @property([EventHandler])
    optionHandlers: EventHandler[] = [];

    public systemMenu: SystemMenu = null;

    onLoad() {
        this.systemMenu = this.systemMenuNode.getComponent(SystemMenu);

        const sm = this.systemMenu;
        sm.able = this.able;
        sm.backHandler = this.backHandler;
        sm.helpHandler = this.helpHandler;
        sm.audioHandler = this.audioHandler;
        sm.recordHandler = this.recordHandler;
        sm.optionHandlers = this.optionHandlers;
        sm.node.setSiblingIndex(this.zIndex);
    }

    // public getNetQuality() :NetQuality {
    //     return this.systemMenu.netQuality;
    // }
}
