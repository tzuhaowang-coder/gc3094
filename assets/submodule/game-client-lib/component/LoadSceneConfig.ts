
import { _decorator, CCBoolean, CCString, Component, Node } from 'cc';
import { warn } from '../utils/Utils';
import LoadScene from './LoadScene';

const { ccclass, property } = _decorator;

@ccclass
export default class LoadSceneConfig extends Component {

    @property(Node)
    loadSceneNode: Node = null;

    @property(CCString)
    sceneName: string = 'GameLobby';

    @property(CCBoolean)
    loadOnStart: boolean = false;

    @property(CCBoolean)
    loadResources: boolean = false;

    private loadScene: LoadScene = null;

    onLoad() {
        this.loadScene = this.loadSceneNode.getComponent(LoadScene);
        if (!this.loadScene) {
            warn('LoadScene is null');
            return;
        }

        this.loadScene.loadOnStart = this.loadOnStart;
        this.loadScene.loadResources = this.loadResources;
        this.loadScene.sceneName = this.sceneName;
    }
}
