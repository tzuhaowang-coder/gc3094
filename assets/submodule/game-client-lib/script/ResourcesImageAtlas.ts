import { _decorator, RichText } from 'cc';
import { DEBUG } from 'cc/env';
import { KeyAtlas } from '../data/KeyAtlas';
import { log } from '../utils/Utils';
import ResourcesCol from './ResourcesCol';
import ResourcesLoader, { getResourcesLoader } from './ResourcesLoader';

const { ccclass, property, menu, requireComponent } = _decorator;

@ccclass
@menu('ResourcesLoad/ResourcesImageAtlas')
@requireComponent(RichText)
export default class ResourcesImageAtlas extends ResourcesCol {

    start() {
        this.load();
    }

    load() {
        if (this.delay) {
            return;
        }
        const l = getResourcesLoader();
        if (l.keyAtlass.length) {
            this.reset(l);
        }
    }

    reset(loader: ResourcesLoader): void {
        const kss = this.keys;
        let keyAtlas: KeyAtlas = null;
        for (let i = 0; i < kss.length; i += 1) {
            const ks = kss[i];
            const key = ks.key;
            keyAtlas = loader.keyAtlass.find(ka => ka.key === key);
            if (keyAtlas) {
                break;
            }
        }

        if (DEBUG && !keyAtlas) {
            log('no font', this.keys, 'in', loader.keyAtlass);
        }
        // 有找到
        if (keyAtlas) {
            const rt = this.getComponent(RichText);
            rt.imageAtlas = keyAtlas.atlas;
        }
    }
}
