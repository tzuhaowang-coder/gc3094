import { _decorator, BitmapFont, CCString, JsonAsset, SpriteFrame } from 'cc';
import { KeyAtlas } from './KeyAtlas';
import { KeyBitmapFont } from './KeyBitmapFont';
import { KeyJsonAsset } from './KeyJsonAsset';

const { ccclass, property } = _decorator;

@ccclass('KeyStr')
export class KeyStr {

    @property(CCString)
    public key: string = '';

    @property(CCString)
    public str: string = '';
}

@ccclass('KeyStr2')
export class KeyStr2 extends KeyStr {

    @property(CCString)
    public str2: string = '';
}

const delimiter = '.';

export function str2KeyStr(str: string): KeyStr {
    const arr = str.split(delimiter);
    return {
        key: arr[0],
        str: arr[1] || '',
    };
}

export function keyStr2Str(keyStr: KeyStr): string {
    return keyStr.key + delimiter + keyStr.str;
}

/**
 *
 * @param keyStrs {key: 1001_text, str: tx_logo}
 * @param keyAtlass
 * @returns
 */
export function findFrame(keys: string[] = [], keyAtlass: KeyAtlas[] = []): { atlasKey: string, key: string, frame: SpriteFrame } {
    let frame: SpriteFrame = null;
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        for (let j = 0; j < keyAtlass.length; j += 1) {
            const ka = keyAtlass[j];
            frame = ka.atlas.getSpriteFrame(key);
            if (frame) {
                return {
                    frame,
                    key,
                    atlasKey: ka.atlas.name,
                };
            }
        }
    }
    return {
        frame: null,
        key: '',
        atlasKey: '',
    };
}

/**
 * findFrame 的簡化版
 * @param strs tx_logo
 * @param keyAtlass
 * @returns
 */
export function findFrame2(strs: string[] = [], keyAtlass: KeyAtlas[] = []): { atlasKey: string, key: string, frame: SpriteFrame } {
    let frame: SpriteFrame = null;
    for (let j = 0; j < strs.length; j += 1) {
        const str = strs[j];
        for (let i = 0; i < keyAtlass.length; i += 1) {
            const ka = keyAtlass[i];
            frame = ka.atlas.getSpriteFrame(str);
            if (frame) {
                return {
                    frame,
                    atlasKey: ka.key,
                    key: str,
                };
            }
        }
    }
    return null;
}

export function findBitmapFont(keyStrs: KeyStr[], keyBitmapFont: KeyBitmapFont[]): { key: string, bitmapFont: BitmapFont } {
    let kb: KeyBitmapFont = null;
    let bitmapFont: BitmapFont = null;
    let key: string = '';
    for (let i = 0; i < keyStrs.length; i += 1) {
        const ks = keyStrs[i];
        const atlasKey2 = ks.key;
        kb = keyBitmapFont.find(ka => ka.key === atlasKey2);

        if (kb) {
            bitmapFont = kb.bitmapFont;
            key = kb.key;
        }
    }
    return {
        key,
        bitmapFont,
    };
}

export function findJsonAssets(keyStrs: KeyStr[], keyJsonAsset: KeyJsonAsset[]): { key: string, jsonAsset: JsonAsset } {
    let kj: KeyJsonAsset = null;
    let jsonAsset: JsonAsset = null;
    let key: string = '';
    for (let i = 0; i < keyStrs.length; i += 1) {
        const ks = keyStrs[i];
        const atlasKey2 = ks.key;
        kj = keyJsonAsset.find(ka => ka.key === atlasKey2);

        if (kj) {
            jsonAsset = kj.jsonAsset;
            key = kj.key;
        }
    }
    return {
        key,
        jsonAsset,
    };
}
