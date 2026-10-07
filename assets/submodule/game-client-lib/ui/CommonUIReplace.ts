import { _decorator, CCBoolean, CCInteger, CCString, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass
export default class CommonUIReplace extends Component {

    @property(CCBoolean)
    pcHorizontal: boolean = false;

    @property(CCBoolean)
    mobileHorizontal: boolean = false;

    @property(CCBoolean)
    mobileVertical: boolean = false;

    @property(CCString)
    path: string = '';

    @property(CCString)
    colKey: string = '';

    @property(CCBoolean)
    unregisterCol: boolean = false;

    @property(CCString)
    i18nKey: string = '';

    @property(CCString)
    resSpriteKey: string = '';

    @property(CCString)
    styleKey: string = '';

    @property(CCInteger)
    parentLayers: number = 0;

    @property(CCBoolean)
    removeAllChildren: boolean = false;

    @property(CCBoolean)
    setParent: boolean = false;

    @property(CCBoolean)
    removeNode: boolean = false;
}
