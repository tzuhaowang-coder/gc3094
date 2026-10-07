import { _decorator, CCInteger, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class DefaultZIndex extends Component {

    @property(CCInteger)
    zIndex: number = 0;

    onLoad() {
        this.node.setSiblingIndex(this.zIndex);
    }

}
