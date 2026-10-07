import { _decorator, CCString, Component, instantiate, Node } from 'cc';
import ColBase from '../data/ColBase';
import { KeyStr } from '../data/KeyStr';
import ResourcesCol from '../script/ResourcesCol';
import { flattenDeep, range } from '../utils/Utils';

const { ccclass, property } = _decorator;

@ccclass
export default class Repeat extends Component {

    @property(Node)
    templateNode: Node = null;

    @property(CCString)
    prefix: string = '';

    @property(CCString)
    postfix: string = '';

    @property({
        type: [CCString],
        tooltip: '设定范例 1、1-3、5-9\n\n目前有三个 colKey 可用：\nindex 由 1 开始的阵列索引、\nidx 设定的区间号码、\nname idx 加上前缀及后缀',
    })
    ranges: string[] = [];

    onLoad() {

        this.templateNode.removeFromParent();

        const arr = flattenDeep(this.ranges.map((ran) => {
            const split = ran.split('-');
            const l = Number(split[0]);
            const r = Number(split[1]);

            if (r) {
                return range(r - l + 1).map(i => i + l);
            } else {
                return l;
            }
        }));

        arr.forEach((idx, index) => {
            const name = this.prefix + idx + this.postfix;

            const data = {
                name,
                idx,
                index: index + 1,
            };
            const node = instantiate(this.templateNode);
            const cols = (node.getComponents('ColBase') as ColBase<any>[]).concat((node.getComponentsInChildren('ColBase') as ColBase<any>[]));
            cols.forEach((col) => {
                col.reset(data[col.colKey], '');
            });
            const rcols = (node.getComponents('ResourcesCol') as ResourcesCol[]).concat((node.getComponentsInChildren('ResourcesCol') as ResourcesCol[]));
            rcols.forEach((col) => {
                const ks = new KeyStr();
                const [key, str] = data.name.split('.');
                ks.key = key;
                ks.str = str;
                col.keys.push(ks);
            });
            this.node.addChild(node);
        });
    }
}
