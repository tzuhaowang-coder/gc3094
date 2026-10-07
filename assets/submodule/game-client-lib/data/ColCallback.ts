import { _decorator, CCBoolean, CCString, Component, EventHandler, Node } from 'cc';
import ColBase from './ColBase';

const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Col/ColCallback')
export class ColCallback extends ColBase<any> {

    @property(CCString)
    component: string = '';

    @property(EventHandler)
    handler: EventHandler = null;

    @property(CCBoolean)
    onlyPassFirstNode: boolean = false;

    @property([Node])
    nodes: Node[] = [];

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        if (!this.nodes.length) {
            this.nodes.push(this.node);
        }
    }

    reset(value: any, col: string) {
        this.pre();

        const pass = this.component ?
            (this.onlyPassFirstNode ? this.nodes[0].getComponent(this.component) : this.nodes.map(n => n.getComponent(this.component))) :
            (this.onlyPassFirstNode ? this.nodes[0] : this.nodes)
        ;
        this.handler.emit([value, pass, this.prev, col]);
        this.prev = value;
    }
}

export interface IColCallbackFn<T> {
    (value: T, nodes: Node | Node[] | Component | Component[], prev: T, col: string);
}
