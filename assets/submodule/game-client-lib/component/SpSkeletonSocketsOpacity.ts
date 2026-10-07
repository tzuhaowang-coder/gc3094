import { _decorator, Component, sp } from 'cc';
import { setNodeOpacity } from '../utils/Utils';

const { ccclass } = _decorator;

@ccclass
export default class SpSkeletonSocketsOpacity extends Component {

    protected update(dt: number): void {

        const ske = this.getComponent(sp.Skeleton);
        if (!ske.animation) {
            return;
        }
        if (ske.paused) {
            return;
        }
        if (!ske.socketNodes.size) {
            return;
        }

        const o = ske.skeletonData.skeletonJson;
        const bs: { name: string }[] = o.bones;
        const ss: { name: string, bone: string }[] = o.slots;

        const anim = ske.findAnimation(ske.animation);
        const timelineSlots = anim.timelines.map((tl) => {
            return tl.slotIndex;
        });

        ske.socketNodes.forEach((node, idx) => {

            const bo = bs[idx];
            const so = ss.find((s, idx) => {
                if (timelineSlots.indexOf(idx) === -1) {
                    return false;
                }
                if (s.bone === bo.name) {
                    return true;
                }
                return false;
            });

            if (!so) {
                return;
            }

            const slot = ske.findSlot(so.name);

            const opacity = slot.color.a * 255;
            setNodeOpacity(node, opacity);
        });
    }
}
