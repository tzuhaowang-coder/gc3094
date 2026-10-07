import { DEBUG } from 'cc/env';

interface MMM {
    keyTimes: object;
    keyArray: object;
    array: any[];
}

export function countCreator(MMM: MMM, getRespTypeKey: (resp: any) => string) {
    return (obj, key = ''): string => {
        const protoInstanceName = getRespTypeKey(obj);
        key = key || protoInstanceName && protoInstanceName.toString ? protoInstanceName.toString() : '' || '';
        obj = protoInstanceName ? obj.toObject() : obj;
        if (!MMM.keyTimes[key]) {
            MMM.keyTimes[key] = 0;
            MMM.keyArray[key] = [];
        }
        MMM.keyTimes[key] += 1;
        MMM.keyArray[key].push(obj);
        MMM.array.push([Date.now(), key, obj.id, obj]);
        return protoInstanceName;
    };
}

export function globalDebugCreator(NNN) {
    if (!DEBUG) {
        return() => {
        };
    }

    return (obj: any , name: string = '', push: boolean = true) => {
        if (name) {
            NNN[name] = obj;
        }
        if (push) {
            NNN.push(obj);
        }
    };
}
