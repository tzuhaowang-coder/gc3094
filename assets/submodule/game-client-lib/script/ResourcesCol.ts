import { _decorator, CCBoolean, CCString, Component } from 'cc';
import ResourcesLoader from './ResourcesLoader';

const { ccclass, property, menu, requireComponent } = _decorator;

@ccclass
@menu('ResourcesLoad/ResourcesCol')
export default abstract class ResourcesCol extends Component {

    @property([CCString])
    keys: string[] = [];

    @property(CCBoolean)
    delay: boolean = false;

    abstract reset(loader: ResourcesLoader): void;
}
