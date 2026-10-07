import { _decorator, Size } from 'cc';
import { UI_LAYOUT } from '../submodule/game-client-lib/ResizeGlobal';
import UIBase from '../submodule/game-client-lib/ui/UIBase';
import UIData from './data/UIData';

const { ccclass } = _decorator;
@ccclass
export default class UI extends UIBase<UIData> {

    public doLayout(layout: UI_LAYOUT, size: Size): void {

        this.data.set('layout', layout);
        this.commonUIManager.data.set('layout', layout);

        // CommonUI
        const cui = this.commonUIManager.toggleLayout(layout, size);
        // UI
        // doLayout(layout, this, size, cui, this.commonUIManager);

        // const bigWinNode = this.foreground.bigWinNode;
        switch (layout) {
            case UI_LAYOUT.PC_HORIZONTAL: // 高度固定
            case UI_LAYOUT.MOBILE_HORIZONTAL: // 高度固定
                // bigWinNode.setScale(1, 1, 1);
                break;
            case UI_LAYOUT.MOBILE_VERTICAL: // 宽度固定
                // bigWinNode.setScale(1, 1, 1);
                break;
        }

    }
}
