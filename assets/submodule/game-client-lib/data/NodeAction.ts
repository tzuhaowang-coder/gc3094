import { PromiseResolveReject } from '../script/PromiseManager';

/**
 * NodeAction is deprecated please use NodeTween
 * @deprecated
 */
export class NodeAction {

    constructor(
        public node: Node,
        public action: ActionInterval) {

    }
}

/**
 * nodeActionToPromise is deprecated please use nodeTweenToPromise
 * @deprecated
 */
export function nodeActionToPromise(nodeAction: NodeAction) {
    return new Promise((resolve) => {
        nodeAction.node.runAction(sequence(nodeAction.action, callFunc(resolve)));
    });
}

/**
 * nodeActionToPRR is deprecated please use nodeTweenToPRR
 * @deprecated
 */
export function nodeActionToPRR(nodeAction: NodeAction): PromiseResolveReject {
    let resolve: Function;
    let reject: Function;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
        nodeAction.node.runAction(sequence(nodeAction.action, callFunc(resolve)));
    });
    return {
        // @ts-ignore
        resolve,
        // @ts-ignore
        reject,
        promise,
    };
}

/**
 * nodeActionsToPromise is deprecated please use nodeTweensToPromise
 * @deprecated
 */
export function nodeActionsToPromise(nodeActions: NodeAction[]) {
    return Promise.all(nodeActions.map(nodeActionToPromise));
}

/**
 * applyNodeAction is deprecated please use applyNodeTween
 * @deprecated
 */
export function applyNodeAction(nodeAction: NodeAction) {
    nodeAction.node.stopAllActions();
    return nodeAction.node.runAction(nodeAction.action);
}

/**
 * applyNodeActions is deprecated please use applyNodeTween
 * @deprecated
 */
export function applyNodeActions(nodeActions: NodeAction[]) {
    return nodeActions.map(applyNodeAction);
}
