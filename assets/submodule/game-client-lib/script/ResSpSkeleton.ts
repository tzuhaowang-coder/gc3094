
import { _decorator, CCString, Component, sp } from 'cc';
import { DEBUG } from 'cc/env';
import { getResLoader } from './ResLoader';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
@executionOrder(-2)
@requireComponent(sp.Skeleton)
export default class ResSpSkeleton extends Component {

    @property([CCString])
    keys: string[] = [];

    private loadData(data: sp.SkeletonData[] = []) {
        const skeleton = this.node.getComponent(sp.Skeleton);
        // 依照顺序往下找，找到就用
        let d: sp.SkeletonData;
        const key = this.keys.forEach((key) => {
            if (d) {
                return;
            }
            d = data.find((d) => {
                return d.name === key;
            });
        });

        if (!d) {
            if (DEBUG) {
                // tslint:disable-next-line:no-console
                console.log('Not found', this.keys, 'in', data);
            }
        }
        skeleton.skeletonData = d;
    }

    onLoad() {
        this.pre();
    }

    private loaded: boolean = false;

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        const l = getResLoader();
        this.loadData(l.skeletonDatas);

    }

}
