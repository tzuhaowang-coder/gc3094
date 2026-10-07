import { _decorator, Component } from 'cc';
import { arraySplice, noop } from '../utils/Utils';
import { schedulePromise } from './PromiseManager';

const { ccclass, property, menu } = _decorator;

export enum PROMISE_EXECUTOR2_GROUP {
    NONE = 0,
    SKIPPABLE = 1,
    GROUP1 = 11,
    GROUP2 = 12,
    GROUP3 = 13,
}

export enum PROMISE_EXECUTOR2_STAT {
    /**
     * 未開始
     */
    NOT_STARTED = 0,
    /**
     * 完成
     */
    COMPLETE = 1,
    /**
     * 被中斷
     */
    INTERRUPT = -1,
}

export type PromiseManager2Array = (PromiseExecutor2 | PromiseExecutorResolver)[];

export interface PromiseExecutorResolver {
    (resolve: (value?: any | PromiseLike<any>) => void) : void;
}

/**
 * ```
 * [resolve 方法, done 方法, 群組]
 * ```
 * @field 0: resolve/有時間軸的部分，包含動畫的初始化
 * @field 1: 完成後呼叫，需包含 時間軸/動畫 被播放到一半時的清理 及 最後的狀況
 * @field 1: 如果有 stat 代表被執行完
 * @field 2: 群組預設 0，0 是不可被跳
 * @memo 如果是不可被跳的，可以不做 done 方法
 */
export type PromiseExecutor2<T extends number = PROMISE_EXECUTOR2_STAT> = [
    PromiseExecutorResolver?,
    ((stat?: T) => void)?,
    number?,
];

export interface IPromiseExecutor2Object<T extends number = PROMISE_EXECUTOR2_STAT> {
    executor?: (resolve: (stat?: T | PromiseLike<T>) => void) => void;
    done?: (stat?: T) => void;
    group?: number;
}

export function promiseExecutor2ToObject(executor: PromiseExecutor2): IPromiseExecutor2Object {
    return {
        executor: executor[0],
        done: executor[1],
        group: executor[2],
    };
}

/**
 *
 * @param sec
 * @param group 預設不可跳
 */
export function timeoutResolvefExecutor(sec: number, group: number = PROMISE_EXECUTOR2_GROUP.NONE): PromiseExecutor2 {
    return [
        (resolve) => {
            schedulePromise(sec).then(resolve);
        },
        ,
        group,
    ];
}

/*
 * 單個 exec
 */
export interface IExecuteResult<T extends number = PROMISE_EXECUTOR2_STAT> {
    skippable: boolean;
    group: number;
    promise: Promise<T>;
    reject: Function;
    done: (stat?: T) => void;
}

interface IHandler {
    (result: IExecuteResult): void;
}

@ccclass
@menu('PromiseManager/PromiseManager2')
export default class PromiseManager2 extends Component {

    private id: number = 0;

    private resolving: boolean = false;

    private executors: PromiseExecutor2[] = [];

    private result: IExecuteResult = null;

    private handlers: IHandler[] = [];

    public bindHandler(handler:IHandler) {
        if (this.handlers.indexOf(handler) === -1) {
            this.handlers.push(handler);
        }
    }

    public unbindHandler(handler:IHandler) {
        arraySplice(this.handlers, handler);
    }

    public applyHandlers(result: IExecuteResult) {
        this.handlers.forEach(h => h(result));
    }

    public clearHandler() {
        this.handlers.length = 0;
    }

    public getExecutorLength() {
        return this.executors.length;
    }

    private nextId() {
        return this.id += 1;
    }

    private clear() {
        this.nextId();
        this.result = null;
        this.resolving = false;
        this.executors = [];
        this.applyHandlers(null);
    }

    private next(id: number) {
        if (id !== this.id) {
            return;
        }
        this.result = null;

        const es = this.executors;
        if (es.length) {
            this.execs(es);
        } else {
            this.clear();
        }
    }

    private exec(executor: PromiseExecutor2, id: number): IExecuteResult {
        const o = promiseExecutor2ToObject(executor);
        let reject = noop;
        let p: Promise<PROMISE_EXECUTOR2_STAT>;
        if (o.executor) {
            p = new Promise((res, rej) => {
                reject = rej;
                o.executor(() => res(PROMISE_EXECUTOR2_STAT.COMPLETE));
            });
        } else {
            p = schedulePromise<PROMISE_EXECUTOR2_STAT>(0, PROMISE_EXECUTOR2_STAT.COMPLETE);
        }
        if (o.done) {
            // 只確保做 o.done 的時候參數是 stat
            // @ts-ignore
            p = p.then(o.done);
        }
        p = p.then(this.next.bind(this, id));
        // 把上面的錯誤一起接走
        p.catch(noop);
        return {
            reject,
            skippable: o.group ? o.group > PROMISE_EXECUTOR2_GROUP.NONE : false,
            promise: p,
            group: o.group || PROMISE_EXECUTOR2_GROUP.NONE,
            done: o.done,
        };
    }

    private fixExecutors(executors: (PromiseExecutorResolver|PromiseExecutor2)[] | PromiseExecutor2 | PromiseExecutorResolver) {
        const es: PromiseExecutor2[] = [].concat(executors).map((e) => {
            if (typeof e === 'function') {
                return [e, , PROMISE_EXECUTOR2_GROUP.NONE];
            }
            return e;
        });
        if (es.length) {
            let pgroup = es[0][2];
            for (let i = 1; i < es.length; i += 1) {
                const e = es[i];
                const group = e[2];
                if (pgroup !==  PROMISE_EXECUTOR2_GROUP.NONE && pgroup !== group && group === PROMISE_EXECUTOR2_GROUP.SKIPPABLE) {
                    e[2] = pgroup;
                }
                pgroup = e[2];
            }
        }
        return es;
    }

    private execs(executors: PromiseExecutor2[]) {
        if (!executors.length) {
            this.clear();
            return;
        }
        const executor = executors.shift();
        this.resolving = true;
        this.executors = executors;
        const r = this.exec(executor, this.nextId());
        this.result = r;
        this.applyHandlers(r);
    }

    /**
     * 清除並執行
     * @param executors
     */
    public play(executors: (PromiseExecutorResolver|PromiseExecutor2)[] | PromiseExecutor2 | PromiseExecutorResolver) {
        this.clear();
        this.resolving = true;
        this.executors = this.fixExecutors(executors);
        this.scheduleOnce(
            () => {
                this.execs(this.executors);
            },
            0,
        );
    }

    /**
     * 放入執行清單，如無正在 resolve 的會直接執行
     */
    public push(executors: (PromiseExecutorResolver|PromiseExecutor2)[] | PromiseExecutor2 | PromiseExecutorResolver) {
        if (this.resolving) {
            [].push.apply(this.executors, this.fixExecutors(executors));
        } else {
            this.play(executors);
        }
    }

    public skippable() {
        if (!this.resolving) {
            return false;
        }
        const er = this.result;
        if (!er || !er.skippable || !er.group) {
            return false;
        }
        return true;
    }

    public skip() {
        if (!this.skippable()) {
            return;
        }
        const er = this.result;
        er.reject();
        er.done?.(PROMISE_EXECUTOR2_STAT.INTERRUPT);
        let i = 0;
        for (; i < this.executors.length; i += 1) {
            const o = promiseExecutor2ToObject(this.executors[i]);
            if (er.group === o.group || o.group === PROMISE_EXECUTOR2_GROUP.SKIPPABLE) {
                o.done?.(PROMISE_EXECUTOR2_STAT.NOT_STARTED);
            } else {
                break;
            }
        }
        this.execs(this.executors.slice(i));
    }

    onSkipClick() {
        this.skip();
    }
}
