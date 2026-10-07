import { _decorator, Camera, Component, EventHandler, EventMouse, Node, NodeEventType, v2, Vec2, view } from 'cc';
import { vecXToVec3 } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class DragControl extends Component {

    @property(Camera)
    camera: Camera = null;

    @property(EventHandler)
    onDragMoveHandler: EventHandler = null;

    private dragNode: Node = null;
    private enable: boolean = false;

    onLoad() {
        // @ts-ignore
        const id = this._id;
        this.node.on(NodeEventType.MOUSE_MOVE, this.mouseMove, this);

    }

    mouseDown(event: EventMouse, moveTarget: Node) {
        this.enable = true;
        this.dragNode = moveTarget || event.getCurrentTarget();
    }

    mouseUp() {
        this.enable = false;
        this.dragNode = null;

    }

    mouseMove(event: EventMouse) {
        if (this.enable) {

            const loc = event.getLocation();
            const tmp = new Vec2();
            this.camera.screenToWorld(vecXToVec3(loc), vecXToVec3(tmp));
            const node = this.dragNode;

            const size = view.getVisibleSize();

            const pos = tmp.subtract(v2(size.width / 2, size.height / 2));

            pos.x = Math.round(pos.x);
            pos.y = Math.round(pos.y);
            node.setPosition(vecXToVec3(pos));

            if (this.onDragMoveHandler) {
                this.onDragMoveHandler.emit([pos]);
            }
        }
    }

}
