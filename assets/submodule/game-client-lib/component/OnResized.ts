import { _decorator, Component, EventHandler } from 'cc';
import { getOnResizeComponent } from '../ResizeGlobal';
import OnResizeManager from './OnResizeManager';

const { ccclass, property } = _decorator;
@ccclass
export default class OnResized extends Component {

    @property(EventHandler)
    handler: EventHandler = null;

    private onResizeManager: OnResizeManager = null;

    onEnable() {
        this.onResizeManager = getOnResizeComponent();
        this.onResizeManager.registHandler(this.handler);
    }

    onDisable() {
        this.onResizeManager.unregistHandler(this.handler);
    }

}
