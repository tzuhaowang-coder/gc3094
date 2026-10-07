import ColItemBase from './ColItemBase';

const computedPrefix = 'anonymous';
let computedIndex = 0;

export default abstract class ColDataBase {

    public dirty: string[] = [];

    private item: ColItemBase<any> = null;

    public pauseRefresh: boolean = false;

    // 复合值
    // c = a + b
    // refs: {
    //     a: [c],
    //     b: [c],
    // }
    // fns: {
    //     c: ()=>any
    // }
    private refs: { [s: string]: string[] } = {};
    private computeds: { [s: string]: (that: any) => any } = {};

    protected loaded: boolean = false;

    protected doPre?(): void;

    private pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        this.doPre?.();
    }

    public set(col: string, val: any, force: boolean = false) {
        this.pre();

        const old = this[col];
        if (force || old !== val) {
            this.dirty.push(col);
        }
        this[col] = val;

        if (this.item && !this.pauseRefresh) {
            this.item.refresh();
        }

        if (this.refs[col]) {
            this.refs[col].forEach((refCol) => {
                this.set(refCol, this.computeds[refCol].call(null, this), force);
            });
        }
    }

    /**
     *
     * 當 refCols 中任一欄改變 → 自動呼叫 fn → 將回傳值設給 col
     *
     * @param col     要被更新的目標欄位
     * @param refCols 觸發來源欄位
     * @param fn      計算邏輯，當來源改變時用來計算目標的新值
     */
    public registerComputed(col: string| string[], refCols: string[] | string, fn: () => any) {
        let cols = [].concat(col);
        if (col === '') {
            cols = [computedPrefix + '_' + (computedIndex += 1)];
        }
        [].concat(refCols).forEach((refCol: string) => {
            if (!this.refs[refCol]) {
                this.refs[refCol] = [];
            }
            cols.forEach((c) => {
                this.refs[refCol].push(c);
            });
        });
        cols.forEach((c) => {
            this.computeds[c] = fn;
        });
    }

    public unregisterComputed(col: string| string[]) {
        const cols = [].concat(col);
        cols.forEach((c) => {
            this.computeds[c] = null;
        });
    }

    public bindItem(item: ColItemBase<any>) {
        if (this.item === item) {
            return;
        }
        this.item = item;
        this.item.bindData(this);
    }
}
