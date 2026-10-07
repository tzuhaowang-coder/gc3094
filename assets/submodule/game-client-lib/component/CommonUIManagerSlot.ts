import { _decorator, size } from 'cc';
import { UI_LAYOUT } from '../ResizeGlobal';
import CommonUIManager from '../ui/CommonUIManager';

const { ccclass, property } = _decorator;

@ccclass
export default class CommonUIManagerSlot extends CommonUIManager {

    onLoad(): void {
        super.onLoad();
        this.toggleLayout(UI_LAYOUT.MOBILE_VERTICAL, size(720, 1280));
    }
}
