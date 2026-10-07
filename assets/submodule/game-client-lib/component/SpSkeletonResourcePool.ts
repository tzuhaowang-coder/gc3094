import { _decorator, Node, sp, SpriteAtlas } from 'cc';
import { warn } from '../utils/Utils';
import SpSkeletonData from './SpSkeletonData';
import { TemplateGenerator } from './TemplateGenerator';
const { ccclass, property } = _decorator;

@ccclass('SpSkeletonResourcePool')
export class SpSkeletonResourcePool extends TemplateGenerator {

    @property([SpriteAtlas])
    atlass:SpriteAtlas[] = [];

    @property([sp.SkeletonData])
    skeletonDatas:sp.SkeletonData[] = [];

    /**
     * 依 spine 檔名當作 Key 來去對應 NodePool 的 Index。
     */
    private skeletonTempIndexMap: Map<string, number> = new Map();

    onLoad(): void {

        const spSKDatas = this.getComponent(SpSkeletonData);
        if (spSKDatas) {
            this.skeletonDatas = this.skeletonDatas.concat(spSKDatas.data);
        }

        this.skeletonDatas.forEach((skData) => {
            const key = skData.name;

            const node = new Node();
            node.name = key;
            // node.layer = Layers.Enum.UI_2D;
            // node.addComponent(UITransform);
            node.setParent(this.node);

            const sk = node.addComponent(sp.Skeleton);
            sk.loop = true;
            sk.premultipliedAlpha = false;
            sk.skeletonData = skData;
            this.templates.push(node);

            const tempIndex = this.skeletonTempIndexMap.get(key);
            if (!tempIndex) {
                this.skeletonTempIndexMap.set(key, this.skeletonTempIndexMap.size);
            }
        });

        super.onLoad();
    }

    public getSpriteFrame(frameName:string) {
        if (!frameName.length) {
            return;
        }

        for (const atlas of this.atlass) {
            const frame = atlas.getSpriteFrame(frameName);
            if (frame) return frame;
        }
        warn(`[SpSkeletonResourcePool] SpriteFrame "${frameName}" not found.`);
    }

    public getSkeletonNode(skeletonDataName:string) {
        if (!skeletonDataName.length) {
            return;
        }

        const poolIndex = this.skeletonTempIndexMap.get(skeletonDataName);
        if (poolIndex !== undefined) {
            return this.getNode(poolIndex);
        }

        warn(`[SpSkeletonResourcePool] SkeletonDataNode "${skeletonDataName}" not found.`);
        return null;
    }

    public recycleSkeletonNode(node:Node) {
        const poolIndex = this.skeletonTempIndexMap.get(node.name);
        if (poolIndex !== undefined) {
            this.recycleNode(node, poolIndex);
            return;
        }
        warn(`[SpSkeletonResourcePool] SkeletonData "${node.name}" not found for recycle.`);
    }
}
