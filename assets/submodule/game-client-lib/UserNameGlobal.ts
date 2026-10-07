import { translate } from './I18nGlobal';

export enum NamingRule {
    NORMAL = 0,
    SERIAL_NAME = 1,
}

let selfId: string = '';
let namingRule: NamingRule = NamingRule.NORMAL;

class Data {
    constructor(
        public id: string = '',
        public serial: number = 0,
        public timeoutId: number = 0,
    ) {}
}

const serials: number[] = [];
const data: Map<string, Data> = new Map();

export function setNamingRule(rule: NamingRule) {
    namingRule = rule;
}

export function setSelfId(id: string | number): void {
    selfId = '' + id;
}

/**
 *
 * @param idOrSelf
 * @param expire 0 代表不會過期
 * @returns
 */
export function getName(idOrSelf: string | number | boolean, name: string, expire: number = 3600e3): string {
    if (namingRule === NamingRule.NORMAL) {
        return name;
    } else if (namingRule === NamingRule.SERIAL_NAME) {
        let id: string;
        let self = false;
        if (typeof idOrSelf === 'boolean') {
            id = '';
            self = idOrSelf;
        } else {
            id = '' + idOrSelf;
            self = selfId === id;
        }
        let d = data.get(id);
        if (d && d.timeoutId) {
            clearTimeout(d.timeoutId);
        }
        if (self) {
            return translate('GAME.own_player');
        } else {
            if (!d) {
                const serial = serials.length ? Math.max(...serials) + 1 : 1;
                d = new Data(id, serial);
                serials.push(serial);
                data.set(d.id, d);
            }
            if (expire) {
                d.timeoutId = setTimeout(genClear(d), expire);
            }
            return translate('GAME.other_player', d.serial);
        }
    } else {
        debugger;
        return name;
    }
}

function genClear(d: Data) {
    return () => {
        data.delete(d.id);
        const idx = serials.indexOf(d.serial);
        if (idx !== -1) {
            serials.splice(idx, 1);
        }
    };
}
