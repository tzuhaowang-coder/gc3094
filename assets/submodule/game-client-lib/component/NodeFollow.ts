import { _decorator, CCBoolean, CCString, Component, find, Mat4, Node, Vec3 } from 'cc';
import { getOnResizeComponent } from '../ResizeGlobal';
import { getNodeContentSize, getNodeHeight, getNodeWidth, getPosition, setNodeContentSize, setNodeHeight, setNodeScale, setNodeWidth, setNodeX, setNodeY } from '../utils/Utils';
import OnResizeManager from './OnResizeManager';

const { ccclass, property } = _decorator;

@ccclass
export default class NodeFollow extends Component {

    @property(CCBoolean)
    onResized: boolean = false;

    @property(CCBoolean)
    onLateUpdate: boolean = false;

    @property(CCBoolean)
    scale: boolean = false;

    @property(CCBoolean)
    size: boolean = false;

    @property(CCBoolean)
    width: boolean = false;

    @property(CCBoolean)
    height: boolean = false;

    @property(CCBoolean)
    position: boolean = false;

    @property(CCBoolean)
    positionX: boolean = false;

    @property(CCBoolean)
    positionY: boolean = false;

    @property(Node)
    followNode: Node = null;

    @property(CCString)
    followXPath: string = '';

    @property(Node)
    targetNode: Node = null;

    private onResizeManager: OnResizeManager = null;

    onLoad() {
        if (this.followNode && this.followXPath) {
            this.followNode = find(this.followXPath, this.followNode);
        }
        this.targetNode = this.targetNode || this.node;
        this.follow = this.follow.bind(this);
    }

    onEnable() {
        if (this.onResized) {
            this.onResizeManager = getOnResizeComponent();
            this.onResizeManager.registCallback(this.follow);
        }
    }

    onDisable() {
        if (this.onResized) {
            this.onResizeManager.unregistCallback(this.follow);
        }
    }

    lateUpdate() {
        if (this.onLateUpdate) {
            this.follow();
        }
    }

    private follow() {
        const f = this.followNode;
        const t = this.targetNode;

        if (!f || !t) {
            return;
        }

        if (this.position || this.positionX || this.positionY) {
            const pos = getPosition(f, t.parent);
            if (this.position || this.positionX) {
                setNodeX(t, pos.x);
            }
            if (this.position || this.positionY) {
                setNodeY(t, pos.y);
            }
        }

        if (this.scale) {
            const mat4 = new Mat4();
            const v3 = new Vec3();
            f.getWorldMatrix(mat4).getScale(v3);
            const tp = t.parent;
            const tpV3 = new Vec3();
            tp.getWorldMatrix(mat4).getScale(tpV3);
            const px = tpV3.x;
            const py = tpV3.y;
            const tx = v3.x;
            const ty = v3.y;
            const scaleX = tx / px;
            const scaleY = ty / py;
            setNodeScale(t, scaleX, scaleY);
        }

        if (this.size) {
            const fSize = getNodeContentSize(f);
            setNodeContentSize(t, fSize.x, fSize.y);
        }

        if (this.width) {
            setNodeWidth(t, getNodeWidth(f));
        }

        if (this.height) {
            setNodeHeight(t, getNodeHeight(f));
        }
    }
}
