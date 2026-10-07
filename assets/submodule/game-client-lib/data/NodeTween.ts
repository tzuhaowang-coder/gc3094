import { Node, tween, Tween, TweenAction } from 'cc';
import { PromiseResolveReject } from '../script/PromiseManager';
import { callFunc, delayTime } from '../utils/Tween';
import { sumReducer } from '../utils/Utils';

export let TWEEN_SYMBOL = Symbol('tween');

export function stopTween(node: Node) {
    const t: Tween<Node> = node[TWEEN_SYMBOL];
    if (t) {
        t.stop();
        node[TWEEN_SYMBOL] = null;
    }
}

export function nodeTween(node: Node): Tween<Node> {
    stopTween(node);
    const t = tween(node);
    node[TWEEN_SYMBOL] = t;
    return t;
}

export class NodeTween {

    constructor(
        public node: Node,
        public action: Tween<Node>) {

    }
}

export function nodeTweenToPromise(nodeTween: NodeTween) {
    return new Promise((resolve) => {
        tween(nodeTween.node).sequence(nodeTween.action, callFunc(resolve)).start();
    });
}

export function nodeTweenToPromise2(nodeTween: NodeTween) {
    return new Promise((resolve, reject) => {
        const action = nodeTween.action;

        let dur: number;
        // @ts-ignore
        const acts:TweenAction[] = action._actions;
        dur = acts.map(a => a.getDuration()).reduce(sumReducer, 0);

        tween(nodeTween.node).sequence(nodeTween.action, callFunc(resolve)).start();
        tween({}).sequence(delayTime(dur + .1), callFunc(reject)).start();

        // const node = new Node();
        // let ok = false;
        // const rej = () => {
        //     if (!ok) {
        //         if (DEBUG) {
        //             debugger;
        //         }
        //         reject();
        //     }
        //     node.destroy();
        // };
        // const res = () => {
        //     ok = true;
        //     resolve(1);
        // };
        // const action = sequence(delayTime(dur + .1), callFunc(rej));
        // director.getActionManager().addAction(action, node, false);
        // tween(nodeTween.node).sequence(nodeTween.action, callFunc(res)).start();
    });
}

export function nodeTweenToPRR(nodeTween: NodeTween): PromiseResolveReject {
    let resolve: Function;
    let reject: Function;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
        tween(nodeTween.node).sequence(nodeTween.action, callFunc(resolve)).start();
    });
    return {
        // @ts-ignore
        resolve,
        // @ts-ignore
        reject,
        promise,
    };
}

export function nodeTweensToPromise(nodeTweens: NodeTween[]) {
    return Promise.all(nodeTweens.map(nodeTweenToPromise));
}

export function applyNodeTween(nodeTween: NodeTween) {
    Tween.stopAllByTarget(nodeTween.node);
    return tween(nodeTween.node).then(nodeTween.action).start();
}

export function applyNodeTweens(nodeTweens: NodeTween[]) {
    return nodeTweens.map(applyNodeTween);
}
