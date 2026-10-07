
import { _decorator, Node, PageViewIndicator, Sprite } from 'cc';
import { DEBUG } from 'cc/env';
import { findFrame } from '../data/KeyStr';
import ResourcesCol from './ResourcesCol';
import ResourcesLoader, { getResourcesLoader } from './ResourcesLoader';

const { ccclass, property, menu  } = _decorator;

@ccclass
@menu('ResourcesLoad/ResourcesIndicator')
export default class ResourcesIndicator extends ResourcesCol {

    onLoad() {
        if (this.delay) {
            const l = getResourcesLoader();
            this.reset(l);
        }
    }

    reset(loader: ResourcesLoader) {
        const indicator = this.node.getComponent(PageViewIndicator);

        const d = findFrame(this.keys, loader.keyAtlass);

        if (!d.frame) {
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.log('Not found', this.keys, 'in', loader.keyAtlass);
            }
        }
        indicator.spriteFrame = d.frame;
        // @ts-ignore
        indicator._indicators.forEach((node: Node) => {
            const s = node.getComponent(Sprite);
            s.sizeMode = Sprite.SizeMode.CUSTOM;
            s.spriteFrame = d.frame;
        });

    }
}
