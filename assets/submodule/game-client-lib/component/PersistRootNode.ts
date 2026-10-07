import { _decorator, Component, director } from 'cc';

const { ccclass } = _decorator;

@ccclass
export default class PersistRootNode extends Component {

    onLoad() {
        // 將自已指為常駐NODE
        director.addPersistRootNode(this.node);
    }
}
