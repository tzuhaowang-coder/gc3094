import { _decorator, Component } from 'cc';
import { DEBUG } from 'cc/env';
import { identity, warn } from '../utils/Utils';
import { KeyJsonAsset } from './KeyJsonAsset';

const { ccclass, property, menu } = _decorator;

@ccclass
export class JsonAssetLoader extends Component {

    @property([KeyJsonAsset])
    keyJsonAssets: KeyJsonAsset[] = [];

    public getData(key: string, xpath: string = ''): any {

        const keyJsonAsset = this.keyJsonAssets.find(kj => kj.key === key);
        if (!keyJsonAsset) {
            return null;
        }
        const json = keyJsonAsset.jsonAsset.json;
        const paths = xpath.split('.').filter(identity);
        let root = json;

        try {
            for (let i = 0; i < paths.length; i += 1) {
                const path = paths[i];
                root = root[path];
            }
            return root;
        } catch (e) {
            if (DEBUG) {
                warn('xpath not math:', key, xpath, json);
            }
        }

    }
}
