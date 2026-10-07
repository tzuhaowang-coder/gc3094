import { _decorator, Camera, Component, EventMouse, Input, input, KeyCode, Label, NodeEventType } from 'cc';
import { setNodePosition } from '../utils/Utils';

const { ccclass, property } = _decorator;

const MOVE_LEFT: number = 1;
const MOVE_RIGHT: number = 2;
const MOVE_UP: number = 4;
const MOVE_DOWN: number = 8;
const ZOOM_IN: number = 16;
const ZOOM_OUT: number = 32;

@ccclass
export default class CameraControl extends Component {

    @property(Camera)
    camera: Camera = null;

    @property(Label)
    label: Label = null;

    private flag = 0;

    private mouseWheelZoom: boolean = false;

    onLoad() {

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.node.on(NodeEventType.MOUSE_WHEEL, this.onMouseWheel, this);

    }

    onMouseWheel(event: EventMouse) {
        if (this.mouseWheelZoom) {
            if (event.getScrollY() > 1 && this.camera.orthoHeight < 1) {
                this.camera.orthoHeight += 0.01;
            } else if (event.getScrollY() < -1 && this.camera.orthoHeight > 0.1) {
                this.camera.orthoHeight -= 0.01;
            }
        }
    }

    onKeyDown(event) {

        switch (event.keyCode) {
        case KeyCode.KEY_A:
        case KeyCode.ARROW_LEFT:
            this.flag |= MOVE_LEFT;
            break;
        case KeyCode.KEY_D:
        case KeyCode.ARROW_RIGHT:
            this.flag |= MOVE_RIGHT;
            break;
        case KeyCode.KEY_W:
        case KeyCode.ARROW_UP:
            this.flag |= MOVE_UP;
            break;
        case KeyCode.KEY_S:
        case KeyCode.ARROW_DOWN:
            this.flag |= MOVE_DOWN;
            break;
        case KeyCode.KEY_Q:
        case KeyCode.NUM_PLUS:
        case KeyCode.EQUAL:
            this.flag |= ZOOM_IN;
            break;
        case KeyCode.KEY_E:
        case KeyCode.DASH:
            this.flag |= ZOOM_OUT;
            break;
        case KeyCode.KEY_Z:
            this.mouseWheelZoom = true;
            break;
        }
    }

    onKeyUp(event) {

        switch (event.keyCode) {
        case KeyCode.KEY_A:
        case KeyCode.ARROW_LEFT:
            this.flag &= ~MOVE_LEFT;
            break;
        case KeyCode.KEY_D:
        case KeyCode.ARROW_RIGHT:
            this.flag &= ~MOVE_RIGHT;
            break;
        case KeyCode.KEY_W:
        case KeyCode.ARROW_UP:
            this.flag &= ~MOVE_UP;
            break;
        case KeyCode.KEY_S:
        case KeyCode.ARROW_DOWN:
            this.flag &= ~MOVE_DOWN;
            break;
        case KeyCode.KEY_Q:
        case KeyCode.NUM_PLUS:
        case KeyCode.EQUAL:
            this.flag &= ~ZOOM_IN;
            break;
        case KeyCode.KEY_E:
        case KeyCode.DASH:
            this.flag |= ZOOM_OUT;
            break;
            this.flag &= ~ZOOM_OUT;
            break;
        case KeyCode.SPACE:
            setNodePosition(this.camera.node , 0 , 0);
            this.camera.orthoHeight = 1;
            this.updateLabel();
            break;
        case KeyCode.KEY_Z:
            this.mouseWheelZoom = false;
            break;
        }
    }

    update() {
        if (this.flag !== 0) {
            if (this.flag & MOVE_LEFT | 0) {
                setNodePosition(this.camera.node, this.camera.node.position.x + 10, this.camera.node.position.y);
            }
            if (this.flag & MOVE_RIGHT | 0) {
                setNodePosition(this.camera.node, this.camera.node.position.x - 10, this.camera.node.position.y);
            }
            if (this.flag & MOVE_UP | 0) {
                setNodePosition(this.camera.node, this.camera.node.position.x , this.camera.node.position.y - 10);
            }
            if (this.flag & MOVE_DOWN | 0) {
                setNodePosition(this.camera.node, this.camera.node.position.x , this.camera.node.position.y + 10);
            }
            if (this.flag & ZOOM_IN | 0) {
                if (this.camera.orthoHeight < 5) {
                    this.camera.orthoHeight += 0.01;
                }
            }
            if (this.flag & ZOOM_OUT | 0) {
                if (this.camera.orthoHeight > 0.1) {
                    this.camera.orthoHeight -= 0.01;
                }
            }
            this.updateLabel();
        }
    }

    public updateCamera(camera: Camera) {
        this.camera = camera;
        this.updateLabel();
    }

    private updateLabel() {
        if (this.label) {
            const str = [
                Math.round(this.camera.node.position.x),
                Math.round(this.camera.node.position.y),
                Math.round(this.camera.orthoHeight * 1e3) / 1e3,
            ].join('/');

            this.label.string = str;
        }
    }
}
