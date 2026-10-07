import { _decorator, CCString, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyNode')
export class KeyNode {

    @property(CCString)
    public key: string = '';

    @property(Node)
    public node: Node = null;
}

// export abstract class KeyX<T> {

//     @property(CCString)
//     key: string = '';

//     abstract property: string = '';
// }

// @ccclass('KeyNode2')
// export class KeyNode2 extends KeyX<Node> {

//     property: string = 'node';

//     @property(Node)
//     public node: Node = null;
// }

export function getNodeByKey(keyNodes: KeyNode[], key: string): Node {
    const kn = keyNodes.find(kn => kn.key === key);
    return kn ? kn.node : null;
}

export function getNodesByKey(keyNodes: KeyNode[], key: string): Node[] {
    return keyNodes.filter(kn => kn.key === key).map(kn => kn.node);
}

// export function getXByKey<K extends KeyX<T>,T>(keyXs: K[], key: string) : T {
//     const kx = keyXs.find(kn => kn.key === key);
//     return kx ? kx[kx.property] : null;
// }

// getXByKey([new KeyNode2()], '');
