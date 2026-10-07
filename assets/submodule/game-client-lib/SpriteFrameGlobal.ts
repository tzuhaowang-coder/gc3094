import { SpriteFrame } from 'cc';
import { findFrame2 } from './data/KeyStr';
import { getResSpriteFrame } from './script/ResLoader';
import { getResourcesLoader } from './script/ResourcesLoader';

const frameCache: Map<string, SpriteFrame> = new Map();

export function getSpriteFrame(key: string) {
    if (!key) {
        return null;
    }

    if (frameCache.has(key)) {
        return frameCache.get(key);
    }
    // 先從 resLoader 找看看，有就回傳
    // resLoader 有 cache
    let frame = getResSpriteFrame(key);
    if (frame) {
        return frame;
    }

    // 沒有再找 ResourcesLoader
    const l = getResourcesLoader();
    const d = findFrame2([key], l.keyAtlass);
    frame = d ? d.frame : null;
    frameCache.set(key, frame);
    return frame;
}
