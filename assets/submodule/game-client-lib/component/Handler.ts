import { _decorator, CCString, Component, EventHandler } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class Handler extends Component {

    @property({
        type:Component.EventHandler,
        tooltip:'triggerHandler',
    })
    handler: EventHandler = null;

    @property(CCString)
    customTriggerHandlerName: string = '';

    onLoad() {
        if (this.customTriggerHandlerName) {
            this[this.customTriggerHandlerName] = this.triggerHandler;
        }
    }

    triggerHandler(...args: any[]) {
        if (!this.handler) {
            return;
        }
        this.handler.emit([...args]);
    }

    @property({
        type:[Component.EventHandler],
        tooltip:'triggerHandlers',
    })
    handlers: EventHandler[] = [];

    triggerHandlers(index: number, ...args: any[]) {
        if (!this.handlers[index]) {
            return;
        }
        this.handlers[index].emit([...args]);
    }
}
