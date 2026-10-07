import { _decorator, Node, sp, Sprite } from 'cc';
import { SpSkeletonResourcePool } from '../../game-client-lib/component/SpSkeletonResourcePool';
import { spSkeletonSetAnimation } from '../../game-client-lib/script/PromiseManager';
import { log } from '../../game-client-lib/utils/Utils';
import { SLOT_SYMBOL_STATUS } from './SlotData';
import SlotReel, { SlotReelSymbol } from './SlotReel';
import SymbolBase from './SymbolBase';
const { ccclass, property } = _decorator;

@ccclass('SpriteSkeletonSymbolBase')
export class SpriteSkeletonSymbolBase extends SymbolBase {

    @property(SpSkeletonResourcePool)
    spSkeletonResourcePool:SpSkeletonResourcePool = null;

    @property(Sprite)
    symbolSprite:Sprite = null;

    @property(Node)
    symbolNode:Node = null;

    public symbolSkeleton: sp.Skeleton = null;

    /**
     * slotResult.scatter 會在這拿想播放的動畫名稱。
     */
    str() {
        return this.symbolSkeleton.animation;
    }

    doChange?(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS): void;

    change(symbol: SlotReelSymbol, status: SLOT_SYMBOL_STATUS, force: boolean = false) {
        this.recycleSymbolResource();
        this.doChange?.(symbol, status);
        this.symbol = symbol;
        this.status = status;
    }

    generate(reel: SlotReel): void {
        // do nothing
    }

    /**
     * 顯示 sprite 靜態圖標
     * @param anim sprite 要顯示的圖標名稱
     */
    public setSymbolSpriteFrame(anim:string) {
        const frame = this.spSkeletonResourcePool.getSpriteFrame(anim);
        this.symbolSprite.spriteFrame = frame;
    }

    /**
     * 展演 skeleton 動態圖標
     * @param skeletonDataName 此動態圖標的 skeletonData 名稱
     * @param anim skeleton 要展演的動畫名稱。
     * @param parent skeleton 要生在哪個節點底下。
     * @returns 回傳當前
     */
    public setSymbolSkeletonAnim(skeletonDataName:string, anim: string | string[], loop:boolean = true , skin:string = 'default', parent:Node = this.symbolNode) {
        const n = this.spSkeletonResourcePool.getSkeletonNode(skeletonDataName);
        if (!n) {
            log('setSymbolSkeletonAnim', anim);
            return;
        }
        n.setParent(parent);
        const sk = n.getComponent(sp.Skeleton);
        spSkeletonSetAnimation(sk, anim, loop);
        sk.setSkin(skin);
        this.symbolSkeleton = sk;
        return sk;
    }

    /**
     * 回收 symbolSkeletonNode 與 清空 spriteFrame
     */
    private recycleSymbolResource() {
        if (this.symbolSkeleton) {
            this.spSkeletonResourcePool.recycleSkeletonNode(this.symbolSkeleton.node);
            this.symbolSkeleton = null;
        }
        if (this.symbolSprite) {
            this.symbolSprite.spriteFrame = null;
        }
    }
}
