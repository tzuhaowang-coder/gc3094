import { identity } from '../../game-client-lib/utils/Utils';
import { SlotReelSymbol } from '../slot/SlotReel';

/**
 * 如果回傳 array length 為 0，會走原本的 get 方法
 */
export type StripGenerator = (data: StripData) => SlotReelSymbol[];

// symbol带资料
export class StripData {
    constructor(
        public key: string = '',
        public strip: SlotReelSymbol[] = [],
        public index: number = 0,
        public generator: StripGenerator = null,
        public custom: any = null,
    ) {

    }
}

interface StripManagerGetterSetter {
    get(): number[];
    addIndex(moved: number): void;
}

export default class StripManager {

    private stripDatas: {
        [s: string]: StripData,
    } = {};

    private getData(key: string | number) {
        return this.stripDatas[key];
    }

    public set(data: StripData) {
        this.stripDatas[data.key] = data;
        return data;
    }

    public addIndex(key: string | number, moved: number) {
        const d = this.getData(key);
        d.index += moved;
    }

    public get(key: string | number): SlotReelSymbol[] {
        const d = this.getData(key);
        if (d.generator) {
            const arr = d.generator(d);
            if (arr.length !== 0) {
                return arr;
            }
        }
        let index = d.index;
        if (index < 0) {
            index += d.strip.length;
        }
        index %= d.strip.length;
        const after = d.strip.slice(index);
        const before = d.strip.slice(0, index);
        return [].concat(after, before);
    }

    private genKey(mode: string, reel: number) {
        return [mode, reel].join('_');
    }

    public get2(mode: string, reel: number) {
        return this.get(this.genKey(mode, reel));
    }

    public addIndex2(mode: string, reel: number, moved: number) {
        return this.addIndex(this.genKey(mode, reel), moved);
    }

    public genGetterSetter(key: string | number): StripManagerGetterSetter {
        const get = this.get.bind(this, key);
        const addIndex = this.addIndex.bind(this, key);
        return {
            get,
            addIndex,
        };
    }
}

export function trimArrayLeft<T>(ary: T[]): T[] {
    // @ts-ignore
    const idx = ary.findIndex(identity);
    if (idx !== -1) {
        return ary.slice(idx);
    }
    return [];
}
