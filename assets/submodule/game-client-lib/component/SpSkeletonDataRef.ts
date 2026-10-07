import { _decorator, Component, Node } from 'cc';

const { ccclass, property, executionOrder, requireComponent } = _decorator;

@ccclass
export default class SpSkeletonDataRef extends Component {

    @property(Node)
    refNode: Node = null;
}
