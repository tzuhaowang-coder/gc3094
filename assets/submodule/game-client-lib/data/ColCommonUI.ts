import { _decorator, Enum, Node } from 'cc';
import ColFadeActive from './ColFadeActive';

const { ccclass, property, menu } = _decorator;
export enum UIDATABASE_PROPERTY {
    'None' = 0,
    'Horizontal' = 1,
    'Vertical' = 2,
    'PC Horizontal' = 3,
    'Mobile' = 4,
    'Mobile Horizontal' = 5,
    'Mobile Vertical' = 6,

    'Normal game' = 91,
    'Normal game And Horizontal' = 92,
    'Normal game And Vertical' = 93,

    'Free game' = 101,
    'Free game And Horizontal' = 102,
    'Free game And Vertical' = 103,

    'Bonus game' = 111,
    'Bonus game And Horizontal' = 112,
    'Bonus game And Vertical' = 113,

    'Special mode 3' = 121,
    'Special mode 3 And Horizontal' = 122,
    'Special mode 3 And Vertical' = 123,

    'Special mode 4' = 131,
    'Special mode 4 And Horizontal' = 132,
    'Special mode 4 And Vertical' = 133,
}
const keyMap = {
    0: '',
    1: 'isH',
    2: 'isV',
    3: 'isPCH',
    4: 'isM',
    5: 'isMH',
    6: 'isMV',

    91: 'inNG',
    92: 'inNGAndH',
    93: 'inNGAndV',

    101: 'inFG',
    102: 'inFGAndH',
    103: 'inFGAndV',

    111: 'inBonus',
    112: 'inBonusAndH',
    113: 'inBonusAndV',

    121: 'inSpecialMode3',
    122: 'inSpecialMode3AndH',
    123: 'inSpecialMode3AndV',

    131: 'inSpecialMode4',
    132: 'inSpecialMode4AndH',
    133: 'inSpecialMode4AndV',
};
@ccclass
@menu('Col/ColCommonUI')
export default class ColCommonUI extends ColFadeActive {

    @property({
        type: Enum(UIDATABASE_PROPERTY),
    })
    key: UIDATABASE_PROPERTY = UIDATABASE_PROPERTY.None;

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    nodes: Node[] = [];

    @property({
        override: true,
        readonly: true,
        visible: false,
    })
    colKey: string = '';

    pre() {
        super.pre();
        this.colKey = keyMap[this.key];
    }
}
