import { _decorator, Component, EventHandler, EventKeyboard, Input, input } from 'cc';
import { KeyHandler } from '../data/KeyHandler';
import { toObjectReducer } from '../utils/Utils';

const { ccclass, property } = _decorator;

const b = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

@ccclass
export default class KeyDownCtrl extends Component {

    private flag = 0;

    @property([KeyHandler])
    keyHandlers: KeyHandler[] = [];

    private keyHandlerMap: { [s:string]: EventHandler } = {};

    private keyHandlerArray: string[] = [];

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.keyHandlerMap = this.keyHandlers.map((kh) => {
            if (isNaN(Number(kh.key))) {
                return { key:kh.key.toUpperCase(), handler:kh.handler };
            }
            return { key:String.fromCharCode(Number(kh.key)), handler:kh.handler };
        }).reduce(toObjectReducer('key', 'handler'), {});
        this.keyHandlerArray = Object.keys(this.keyHandlerMap);
    }

    onKeyDown(event: EventKeyboard) {
        const code = String.fromCharCode(event.keyCode);
        const idx = this.keyHandlerArray.indexOf(code);
        if (this.keyHandlerMap[code] && idx !== -1) {
            this.flag |= b[idx];
            this.keyHandlerMap[code].emit([]);
        }
    }

    onKeyUp(event: EventKeyboard) {
        const code = String.fromCharCode(event.keyCode);
        const idx = this.keyHandlerArray.indexOf(code);
        if (this.keyHandlerMap[code] && idx !== -1) {
            this.flag &= ~b[idx];
        }
    }
}
