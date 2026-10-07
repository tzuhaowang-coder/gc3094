import { EXTRA_1020_DEFAULT, EXTRA_1020_FORCE_DEFAULT, EXTRA_1100 } from './ParamsGlobal';
import CommonUIData from './ui/CommonUIData';

export function supportLocalStorage(): boolean {
    let support = true;
    try {
        localStorage.getItem('localStorage');
    } catch (error) {
        support = false;
    }
    return support;
}

export function supportSessionStorage(): boolean {
    let support = true;
    try {
        sessionStorage.getItem('sessionStorage');
    } catch (error) {
        support = false;
    }
    return support;
}

export const str2bool = (def: boolean) => (str: string) => (Boolean(str ? Number(str) : def));
export const bool2str = (val: boolean) => '' + Number(val);
export const str2num = (def: number) => (str: string) => isNaN(Number(str)) ? def : Number(str);
export const num2str = (val: number) => '' + val;
export function genLocalStorage<T>(key: string, defaultVal: T, stringToT: (str: string) => T, tToString: (val: T) => string) {
    return {
        get: genGetLocalStorage(key, defaultVal, stringToT),
        set: genSetLocalStorage(key, defaultVal, tToString),
    };
}

function genGetLocalStorage<T>(key: string, defaultVal: T, handler: (str: string) => T) {
    return () => {
        let val = defaultVal;
        try {
            const ks = key.split('.');
            const k = ks[0];
            const str = localStorage.getItem(k);
            let val2: string;
            if (ks.length !== 1) {
                val2 = str ? JSON.parse(str) : {};
                let len = 1;
                while (len < ks.length) {
                    val2 = val2[ks[len]];
                    len += 1;
                }
            } else {
                val2 = str;
            }

            val = handler(val2);
        } catch (e) {
        }
        return val;
    };
}

function genSetLocalStorage<T>(key: string, defaultVal: T, handler: (val: T) => string) {
    return (value: T) => {
        const ks = key.split('.');
        const k = ks[0];
        const str = handler(value);
        let val: string;
        try {
            if (ks.length !== 1) {
                const itemStr = localStorage.getItem(k);
                const json = itemStr ? JSON.parse(itemStr) : {};
                let len = 1;
                let obj = json;
                while (len < ks.length) {
                    const kk = ks[len];
                    if (!obj[kk]) {
                        obj[kk] = {};
                    }
                    if (len === ks.length - 1) {
                        obj[kk] = str;
                    }
                    obj = obj[kk];
                    len += 1;
                }
                val = JSON.stringify(json);
            } else {
                val = str;
            }
            localStorage.setItem(k, val);
        } catch (e) {
            return false;
        }
        return true;
    };
}

export enum STORAGE_KEY {
    AUDIO_ENABLED = 'dsd.CLIENT_AUDIO_ENABLED',
    // AUDIO_RATIO = 'dsd.CLIENT_AUDIO_RATIO',
    AUDIO_EFFECT_ENABLED = 'dsd.CLIENT_EFFECT_ENABLED',
    AUDIO_MUSIC_ENABLED = 'dsd.CLIENT_MUSIC_ENABLED',
    START_PAGE = 'dsd.SHOW_LEADING_PAGE_NEXT_TIME',
    SPIN_SPEED = 'dsd.SPIN_SPEED',
    CURRENCY_SYMBOL = 'dsd.CURRENCY_SYMBOL',
    SPACE_SPIN = 'dsd.SPACE_SPIN',
    BET_LEVEL = 'dsd.BET_LEVEL_{gid}',
    CUSTOM_1 = 'dsd.CUSTOM_1_{gid}',
    CUSTOM_2 = 'dsd.CUSTOM_2_{gid}',
    CUSTOM_3 = 'dsd.CUSTOM_3_{gid}',
    CUSTOM_4 = 'dsd.CUSTOM_4_{gid}',
    CUSTOM_5 = 'dsd.CUSTOM_5_{gid}',
    BONUS_AUTO_PRIZE =  'dsd.BONUS_AUTO_PRIZE',
    BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN =  'dsd.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN',
}

type storage_template<T> = [T, (str: string) => T, (val: T) => string];
export const TRUE_TEMPLATE: storage_template<boolean> = [true, str2bool(true), bool2str];
export const FALSE_TEMPLATE: storage_template<boolean> = [false, str2bool(false), bool2str];
export const ONE_TEMPLATE: storage_template<number> = [1, str2num(.5), num2str];
export const HALF_TEMPLATE: storage_template<number> = [.5, str2num(.5), num2str];
export const ZERO_TEMPLATE: storage_template<number> = [0, str2num(0), num2str];

export const STORAGE_DEFAULTS = {
    [STORAGE_KEY.AUDIO_ENABLED]: TRUE_TEMPLATE,
    // [STORAGE_KEY.AUDIO_RATIO]: ONE_TEMPLATE,
    [STORAGE_KEY.AUDIO_EFFECT_ENABLED]: TRUE_TEMPLATE,
    [STORAGE_KEY.AUDIO_MUSIC_ENABLED]: TRUE_TEMPLATE,
    [STORAGE_KEY.SPIN_SPEED]: HALF_TEMPLATE,
    [STORAGE_KEY.CURRENCY_SYMBOL]: EXTRA_1020_DEFAULT ? TRUE_TEMPLATE :  FALSE_TEMPLATE,
    [STORAGE_KEY.SPACE_SPIN]: TRUE_TEMPLATE,
    [STORAGE_KEY.START_PAGE]: TRUE_TEMPLATE,
    [STORAGE_KEY.BONUS_AUTO_PRIZE]: TRUE_TEMPLATE,
    [STORAGE_KEY.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN]: FALSE_TEMPLATE,
};

export let { get: getAudioEnable, set: setAudioEnable } = genLocalStorage(STORAGE_KEY.AUDIO_ENABLED, STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_ENABLED][0], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_ENABLED][1], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_ENABLED][2]);
// export let { get: getAudioRatio, set: setAudioRatio } = genLocalStorage(STORAGE_KEY.AUDIO_RATIO, STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_RATIO][0], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_RATIO][1], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_RATIO][2]);
export let { get: getEffectEnable, set: setEffectEnable } = genLocalStorage(STORAGE_KEY.AUDIO_EFFECT_ENABLED, STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_EFFECT_ENABLED][0], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_EFFECT_ENABLED][1], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_EFFECT_ENABLED][2]);
export let { get: getMusicEnable, set: setMusicEnable } = genLocalStorage(STORAGE_KEY.AUDIO_MUSIC_ENABLED, STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_MUSIC_ENABLED][0], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_MUSIC_ENABLED][1], STORAGE_DEFAULTS[STORAGE_KEY.AUDIO_MUSIC_ENABLED][2]);
export let { get: getSpinSpeed, set: setSpinSpeed } = genLocalStorage(STORAGE_KEY.SPIN_SPEED, STORAGE_DEFAULTS[STORAGE_KEY.SPIN_SPEED][0], STORAGE_DEFAULTS[STORAGE_KEY.SPIN_SPEED][1], STORAGE_DEFAULTS[STORAGE_KEY.SPIN_SPEED][2]);
export let { get: getCurrencySymbol, set: setCurrencySymbol } = genLocalStorage(STORAGE_KEY.CURRENCY_SYMBOL, STORAGE_DEFAULTS[STORAGE_KEY.CURRENCY_SYMBOL][0], STORAGE_DEFAULTS[STORAGE_KEY.CURRENCY_SYMBOL][1], STORAGE_DEFAULTS[STORAGE_KEY.CURRENCY_SYMBOL][2]);
export let { get: getSpaceSpin, set: setSpaceSpin } = genLocalStorage(STORAGE_KEY.SPACE_SPIN, STORAGE_DEFAULTS[STORAGE_KEY.SPACE_SPIN][0], STORAGE_DEFAULTS[STORAGE_KEY.SPACE_SPIN][1], STORAGE_DEFAULTS[STORAGE_KEY.SPACE_SPIN][2]);
export let { get: getStartPage, set: setStartPage } = genLocalStorage(STORAGE_KEY.START_PAGE, STORAGE_DEFAULTS[STORAGE_KEY.START_PAGE][0], STORAGE_DEFAULTS[STORAGE_KEY.START_PAGE][1], STORAGE_DEFAULTS[STORAGE_KEY.START_PAGE][2]);
export let { get: getBonusAutoPrize, set: setBonusAutoPrize } = genLocalStorage(STORAGE_KEY.BONUS_AUTO_PRIZE, STORAGE_DEFAULTS[STORAGE_KEY.BONUS_AUTO_PRIZE][0], STORAGE_DEFAULTS[STORAGE_KEY.BONUS_AUTO_PRIZE][1], STORAGE_DEFAULTS[STORAGE_KEY.BONUS_AUTO_PRIZE][2]);
export let { get: getBonusInfoFirstOpenDoNotShowAgain, set: setBonusInfoFirstOpenDoNotShowAgain } = genLocalStorage(STORAGE_KEY.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN, STORAGE_DEFAULTS[STORAGE_KEY.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN][0], STORAGE_DEFAULTS[STORAGE_KEY.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN][1], STORAGE_DEFAULTS[STORAGE_KEY.BONUS_INFO_FIRST_OPEN_DO_NOT_SHOW_AGAIN][2]);

export function applyLocalStorageToCommonUIData(data: CommonUIData) {

    const ee = getEffectEnable();
    const me = getMusicEnable();
    let ae = getAudioEnable();
    ae = ee || me;
    data.set('playSound', ae);
    data.set('soundRatio', 1);
    data.set('spinSpeed', getSpinSpeed());
    data.set('playEffect', ee);
    data.set('playMusic', me);
    data.set('startPage', EXTRA_1100 ? false :getStartPage());
    data.set('displayCurrencySymbol', EXTRA_1020_FORCE_DEFAULT ? EXTRA_1020_DEFAULT : getCurrencySymbol());
    // data.set('spaceSpin', getSpaceSpin());
}
