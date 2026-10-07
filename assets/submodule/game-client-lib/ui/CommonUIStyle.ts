import { CCString, Component, _decorator } from 'cc';

const { ccclass, property } = _decorator;
@ccclass
export default class CommonUIStyle extends Component {
        // tooltip: '優先權順序為 keys[0], keys[1], key，越後方越高',

    @property([CCString])
    keys: string[] = [];
}
