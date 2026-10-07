import { _decorator } from 'cc';
import { globalDebugNNN } from '../LibGlobal';
import { resolveWrapper } from './PromiseManager';

const { ccclass, property } = _decorator;

type PreFunction = () => boolean;

class QueueData {
    constructor(
        public queue: [() => Promise<any>, PreFunction, Function, Function][] = [],
        public idle: boolean = true,
    ) {

    }

}

let promiseQueue: PromiseQueue;

const defaultPre: PreFunction = () => true;

function promiseQueuePre() {
    if (!promiseQueue) {
        promiseQueue = new PromiseQueue();
        globalDebugNNN(promiseQueue, 'pq');
    }
}

export function promiseQueuePlay(group: number, executor: () => Promise<any>, pre: PreFunction = defaultPre) {
    promiseQueuePre();
    return promiseQueue.play(group, executor, pre);
}

export function promiseQueueUnshiftPlay(group: number, executor: () => Promise<any>, pre: PreFunction = defaultPre) {
    promiseQueuePre();
    return promiseQueue.play(group, executor, pre, true);
}

export function promiseQueueIdle(group: number): boolean {
    promiseQueuePre();
    return promiseQueue.idle(group);
}

export function promiseQueueClear() {
    promiseQueuePre();
    return promiseQueue.clear();
}

@ccclass
export default class PromiseQueue {

    private data: QueueData[] = [];

    /**
     *
     * @param group
     * @param executor
     */
    public play(group: number, executor: () => Promise<any>, pre: () => boolean, unshift: boolean = false): Promise<any> {
        let qd = this.data[group];
        if (!qd) {
            qd = new QueueData();
            this.data[group] = qd;
        }

        if (!qd.idle) {
            const p = new Promise((res, rej) => {
                if (unshift) {
                    qd.queue.unshift([executor, pre, res, rej]);
                } else {
                    qd.queue.push([executor, pre, res, rej]);
                }
            });
            return p;
        } else {
            qd.idle = false;
            const p = executor();
            const rwp = resolveWrapper(p);
            rwp.then(() => this.next(group));
            return p;
        }

    }

    private next(group: number) {
        const qd = this.data[group];
        if (qd.queue.length === 0) {
            qd.idle = true;
        } else {
            const [executor, pre, res, rej] = qd.queue.shift();
            if (!pre()) {
                rej('reject by pre');
                return this.next(group);
            }
            const p = executor();
            // @ts-ignore
            p.then(res, rej);
            const rwp = resolveWrapper(p);
            rwp.then(() => this.next(group));
        }
    }

    public idle(group: number): boolean {
        let qd = this.data[group];
        if (!qd) {
            qd = new QueueData();
            this.data[group] = qd;
        }
        return qd.idle;
    }

    public clear() {
        this.data.length = 0;
    }
}
