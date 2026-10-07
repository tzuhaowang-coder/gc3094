import { _decorator, CCInteger, instantiate, Node, sp } from 'cc';
import { DEBUG } from 'cc/env';
import { spSkeletonEmpty, spSkeletonSetAnimation } from '../../game-client-lib/script/PromiseManager';
import { setNodeOpacity, setNodeY, warn } from '../../game-client-lib/utils/Utils';
import { PREV_SLOT_SYMBOL_STATUS, SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import SlotReel, { SlotReelSymbol } from '../slot/SlotReel';
import SlotBase from './SlotBase';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

/**
 * 預設 skeleton
 */
@ccclass
export default abstract class SkeletonSymbolBase extends SymbolBase {

    @property(Node)
    skeletonNode: Node = null;

    @property(Node)
    skeletonTemplate: Node = null;

    skeleton: sp.Skeleton = null;

    @property(CCInteger)
    blurOpacity: number = 0;

    public str() {
        return this.skeleton.animation;
    }

    /**
     * XXXX
     * @param symbol
     * @param status
     */
    doChange?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS, reelIndex: number, index: number): void;

    toStr?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS, reelIndex: number, index: number): string | string[];

    public change(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS | PREV_SLOT_SYMBOL_STATUS, force: boolean = false) {
        const nextStatus = (status === PREV_SLOT_SYMBOL_STATUS) ? this.status : (status as SLOT_SYMBOL_STATUS);
        const same = this.status === nextStatus && this.symbol === symbol;
        if (!force && same) {
            this.blur(symbol, nextStatus);
            this.doChange?.(symbol, nextStatus, this.reelIndex, this.index);
            return;
        }

        if (this.toStr) {
            const str = this.toStr(symbol, nextStatus, this.reelIndex, this.index);
            const ske = this.skeleton;
            if (DEBUG && symbol && !str) {
                warn('Empty symbol anim: ', symbol, nextStatus);
            }
            if (str) {
                spSkeletonSetAnimation(ske, str, true);
            } else {
                spSkeletonEmpty(ske);
            }
        }

        this.blur(symbol, nextStatus);
        this.doChange?.(symbol, nextStatus, this.reelIndex, this.index);
        this.symbol = symbol;
        this.status = nextStatus;
    }

    private generated: boolean = false;

    public generate(reel?: SlotReel) {
        if (this.generated) {
            return;
        }
        this.generated = true;
        const tpl = this.skeletonTemplate || reel.symbolSkeletonTemplate;
        if (!tpl) {
            if (DEBUG) {
                warn('No template');
            }
            return;
        }
        const skeletonNode = instantiate(tpl);
        this.skeletonNode.addChild(skeletonNode);
        this.skeleton = skeletonNode.getComponent(sp.Skeleton);
    }

    public blur(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS | PREV_SLOT_SYMBOL_STATUS, str: string = '', skeletonData: sp.SkeletonData = null) {
        const reel = this.reel;
        if (!reel) {
            return;
        }
        const node = this.skeletonNode;
        const ske = this.skeleton;
        const tpl = this.skeletonTemplate || reel.symbolSkeletonTemplate;
        const blur = this.blurOpacity !== 255;
        if (!blur) {
            return;
        }
        // if (reel.index === 0 && this.index === 0) {
        //     warn('SkeletonSymbolBase blur', symbol, status, str, skeletonData);
        // }
        const slot = reel.slot as SlotBase;
        if (slot.data.quick === 2 && status === SLOT_SYMBOL_STATUS.BLUR) {
            let ske1: sp.Skeleton;
            let ske2: sp.Skeleton;
            if (node.children.length === 1) {
                const t1 = instantiate(tpl);
                const t2 = instantiate(tpl);
                setNodeY(t1, -50);
                setNodeY(t2, 50);

                ske1 = t1.getComponent(sp.Skeleton);
                ske2 = t2.getComponent(sp.Skeleton);

                node.addChild(t1);
                node.addChild(t2);

                setNodeOpacity(t1, this.blurOpacity || 60);
                setNodeOpacity(t2, this.blurOpacity || 60);
                setNodeOpacity(ske.node, this.blurOpacity || 60);
            } else {
                ske1 = node.children[1].getComponent(sp.Skeleton);
                ske2 = node.children[2].getComponent(sp.Skeleton);
            }
            const s = str || this.toStr?.(symbol, status) || '';
            if (DEBUG && Array.isArray(s)) {
                debugger;
            }
            if (skeletonData) {
                if (ske1.skeletonData !== skeletonData) {
                    ske1.skeletonData = skeletonData;
                }
                if (ske2.skeletonData !== skeletonData) {
                    ske2.skeletonData = skeletonData;
                }
            }
            spSkeletonSetAnimation(ske1, s);
            spSkeletonSetAnimation(ske2, s);
        } else {
            if (node.children.length !== 1) {
                node.children[1].destroy();
                node.children[2].destroy();
                setNodeOpacity(ske.node, 255);
            }
        }
    }
}
