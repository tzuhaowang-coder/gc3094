import { _decorator, Component, Node, sp, Sprite } from 'cc';
import { SpSkeletonResourcePool } from '../../game-client-lib/component/SpSkeletonResourcePool';
import { spSkeletonSetAnimation, spSkeletonSetAnimationToPromise } from '../../game-client-lib/script/PromiseManager';
import { log } from '../../game-client-lib/utils/Utils';
import { SLOT_SYMBOL_STATUS } from '../slot/SlotData';
import PuzzleReelBase from './PuzzleReelBase';

const { ccclass, property } = _decorator;

@ccclass('PuzzleSymbolBase2')
export default abstract class PuzzleSymbolBase2 extends Component {

    @property(Node)
    frontNode: Node = null;

    @property(Node)
    backNode: Node = null;

    @property(Node)
    skeletonNode: Node = null;

    skeleton: sp.Skeleton = null;

    // ================ 以下為新架構命名 ================
    @property(SpSkeletonResourcePool)
    spSkeletonResourcePool:SpSkeletonResourcePool = null;

    @property(Sprite)
    symbolSprite:Sprite = null;

    @property(Node)
    symbolNode:Node = null;

    public symbolSkeleton: sp.Skeleton = null;
    // ===============================================

    public status: SLOT_SYMBOL_STATUS = SLOT_SYMBOL_STATUS.NORMAL;

    public symbol: string = '';

    public reel: PuzzleReelBase = null;

    public reelIndex: number = -1;

    /**
     * 從下到上，reel 長度為 2 的話，總長度為 4；
     * 最下面的 index 為 0
     * 最上面的 index 為 3
     */
    public index: number = -1;

    doChange?(symbol: string, status: SLOT_SYMBOL_STATUS, force?: boolean): void;

    change(symbol: string, status: SLOT_SYMBOL_STATUS, force?: boolean) {
        this.recycleSymbolResource();
        this.doChange?.(symbol, status, force);
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

    public setSymbolSkeletonAnimToPromise(skeletonDataName:string, animation: string, loopTime: number= 0, skin:string = 'default', parent:Node = this.symbolNode) {
        const n = this.spSkeletonResourcePool.getSkeletonNode(skeletonDataName);
        if (!n) {
            log('setSymbolSkeletonAnim', animation);
            return;
        }
        n.setParent(parent);
        const sk = n.getComponent(sp.Skeleton);
        this.symbolSkeleton = sk;
        return spSkeletonSetAnimationToPromise(sk, { skin, animation }, loopTime);
    }

    /**
     * 回收 symbolSkeletonNode & spriteFrame 清空
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
