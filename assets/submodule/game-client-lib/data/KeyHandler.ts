import { _decorator, CCString, EventHandler } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyHandler')
export class KeyHandler {

    @property(CCString)
    key: string = '';

    @property(EventHandler)
    handler: EventHandler = null;
}
