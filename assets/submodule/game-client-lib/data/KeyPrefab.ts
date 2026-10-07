import { _decorator, CCString, Node, Prefab } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('KeyPrefab')
export class KeyPrefab {

    @property(CCString)
    public key: string = '';

    @property(Prefab)
    public prefab: Prefab = null;

    public node: Node = null;
}
