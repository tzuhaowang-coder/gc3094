import { _decorator, Component, EventMouse, Node, NodeEventType } from 'cc';
import DragControl from './DragControl';

const { ccclass, property } = _decorator;

@ccclass
export default class DragPoint extends Component {

    @property(Node)
    dragControlNode: Node = null;

    dragControl: DragControl = null;

    @property(Node)
    moveTarget: Node = null;

    public draggable: boolean = true;
    onLoad() {
        this.dragControl = this.dragControlNode.getComponent(DragControl);
        this.node.on(NodeEventType.MOUSE_DOWN, this.mouseDown, this);
        this.node.on(NodeEventType.MOUSE_UP, this.mouseUp, this);
        this.node.on(NodeEventType.MOUSE_MOVE, this.mouseMove, this);
    }

    mouseDown(event: EventMouse) {
        if (this.draggable) {
            this.dragControl.mouseDown(event, this.moveTarget);
        }
    }

    mouseUp() {
        if (this.draggable) {
            this.dragControl.mouseUp();
        }
    }

    mouseMove(event: EventMouse) {
        if (this.draggable) {
            this.dragControl.mouseMove(event);
        }
    }

}
