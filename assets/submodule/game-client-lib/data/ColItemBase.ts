import { _decorator, Component, isValid, Node } from 'cc';
import { arraySplice, flattenDeep, onlyUnique, toObjectAccumulateReducer } from '../utils/Utils';
import ColBase from './ColBase';
import ColDataBase from './ColDataBase';
import { KeyCol } from './KeyCol';
import { KeyNode } from './KeyNode';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class ColItemBase<T extends ColDataBase> extends Component {

    @property([Node])
    private colScanNodes: Node[] = [];

    @property([KeyCol])
    private keyCol: KeyCol[] = [];

    @property([KeyNode])
    private keyColNode: KeyNode[] = [];

    protected mapCol: { [s: string]: ColBase<any>[] } = {};

    protected data: T;

    private loaded: boolean = false;

    pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;

        [].push.apply(this.keyCol, this.keyColNode.map(((kn) => {
            const col = kn.node.getComponent('ColBase') as ColBase<any>;
            // @ts-ignore
            col.pre && col.pre();
            return {
                key: kn.key || col.colKey,
                col: kn.node.getComponent('ColBase')as ColBase<any>,
            };
        })));

        // @ts-ignore
        this.mapCol = this.keyCol.reduce(
            toObjectAccumulateReducer(
                (obj:KeyCol) => {
                    return obj.key || obj.col.colKey;
                },
                'col'),
            {},
        );
        const each = (colBase: ColBase<any>) => {
            if (!isValid(colBase, true)) {
                return;
            }
            // @ts-ignore
            colBase.pre && colBase.pre();

            if (!colBase.passScan && colBase.colKey) {
                if (!this.mapCol[colBase.colKey]) {
                    this.mapCol[colBase.colKey] = [];
                }
                if (this.mapCol[colBase.colKey].indexOf(colBase) === -1) {
                    this.mapCol[colBase.colKey].push(colBase);
                }
            }
        };

        [this.node].concat(this.colScanNodes).forEach((node) => {
            node.getComponents('ColBase').forEach(each);
            node.getComponentsInChildren('ColBase').forEach(each);
        });
    }

    public register(colBase: ColBase<any> , colKey: string  = '') {
        // @ts-ignore
        colBase.pre && colBase.pre();

        const key = colKey || colBase.colKey;
        if (!this.mapCol[key]) {
            this.mapCol[key] = [];
        }
        if (this.mapCol[key].indexOf(colBase) === -1) {
            this.mapCol[key].push(colBase);
        }
        colBase.reset(this.data[colKey]);
    }

    public unregister(colBase: ColBase<any>, colKey: string = '') {
        if (!colBase) {
            return;
        }
        // @ts-ignore
        colBase.pre && colBase.pre();

        const key = colKey || colBase.colKey;
        if (this.mapCol[key]) {
            arraySplice(this.mapCol[key], colBase);
        }
    }

    public getCols(key: string= '') {
        if (key) {
            return this.mapCol[key];
        } else {
            return flattenDeep(Object.keys(this.mapCol).map((k) => {
                return this.mapCol[k];
            }));
        }
    }

    public refresh(force: boolean = false) {
        this.pre();
        const data = this.data;

        let arr = data.dirty;
        if (force) {
            arr = flattenDeep<string>([
                Object.keys(this.mapCol),
                data.dirty,
            ]).filter(onlyUnique);
        }
        // 更新 dirty 的資料
        arr.forEach((colKey) => {
            const cols = this.mapCol[colKey];
            if (cols) {
                let removeInvalid = false;
                cols.forEach((col) => {
                    if (!col.isValid) {
                        removeInvalid = true;
                        return;
                    }
                    col.reset(data[colKey]);
                });
                if (removeInvalid) {
                    this.mapCol[colKey] = this.mapCol[colKey].filter(col => col.isValid);
                }
            }
        });
        // clear dirty marks
        data.dirty.length = 0;
    }

    public reset(data: T, force: boolean = false) {
        this.pre();
        this.bindData(data);
        this.refresh(force);
    }

    public bindData(data: T) {
        if (this.data === data) {
            return;
        }
        this.data = data;
        this.data.bindItem(this);
    }

    public getData() {
        return this.data;
    }
}
