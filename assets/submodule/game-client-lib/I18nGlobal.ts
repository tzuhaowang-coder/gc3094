// @ts-ignore

import { DEBUG } from 'cc/env';
import Polyglot from 'polyglot/dist/polyglot.cjs.js';
import { globalDebugNNN } from './LibGlobal';
// tslint:disable-next-line:variable-name

let polyglot = null;
// [key, depth, regex, prop , value]
type metaRuleRow = [string, number, RegExp, string, string];
export interface IMetaData {
    $p?: IMetaData; // parent node metadata
    fnt?: string;
    active?: string;
    x?: string;
    y?: string;
    h?: string;
    w?: string;
    scale?: string;
    lineHeight?: string;
    fontSize?: string;
    halign?: string;
    valign?: string;
}
let metaData: metaRuleRow[] = [];
let metaCache: { [s: string]: string } = {};

function initPolyglot(data: Object) {
    polyglot = new Polyglot({ phrases: data, allowMissing: true });
}

export function getLayoutMagic(key: string): string[] {
    switch (key) {
    case 'pch':
        return ['h', 'pch'];
    case 'mh':
        return ['h', 'm', 'mh'];
    case 'mv':
        return ['v', 'm', 'mv'];
    default:
        return [];
    }
}

export function getMeta(key: string, layout: string = ''): IMetaData {
    const cache = metaCache[key + '$' + layout];
    if (cache) {
        if (cache === '{}') {
            return null;
        } else {
            return JSON.parse(cache);
        }
    }
    const meta = {};
    const len = key.split('.').length;
    let has = false;
    const $p = key.indexOf('$p') !== -1;
    const layoutMagics = getLayoutMagic(layout);
    const eachProp = (prop: string, v: string) => {
        let propMagic: string;
        [prop, propMagic] = prop.split('$');
        // p 為 parent 保留字
        // 留下 mark
        if (propMagic && propMagic !== 'p') {
            if (layoutMagics && layoutMagics.indexOf(propMagic) !== -1) {
                meta[prop] = v;
            }
        } else {
            meta[prop] = v;
        }
    };
    metaData.forEach(([k, l, regex, prop, v]) => {
        if (l < len && regex.test(key) && !$p) {
            eachProp(prop, v);
            has = true;
        } else if (l === len && k === key) {
            eachProp(prop, v);
            has = true;
        }
    });
    metaCache[key + '$' + layout] = JSON.stringify(meta);
    if (has) {
        return meta;
    } else {
        return null;
    }
}

export function clearPolyglot() {
    polyglot = null;
    metaData = [];
    metaCache = {};
}

export function extendPolyglot(data: Object) {
    if (!polyglot) {
        initPolyglot({});
    }
    polyglot.extend(data);

    const mark$p = {};
    const each = (str: string) => {
        const $p = str.lastIndexOf('.$p');
        if ($p !== -1) {
            const kk = str.substring(0, $p) + '.mark$p';
            if (!polyglot.phrases[kk]) {
                mark$p[kk] = 1;
            }
            each(kk);
        }
    };
    metaData = Object.keys(polyglot.phrases).filter(k => k.startsWith('meta')).map((k): metaRuleRow => {
        const v: string = polyglot.phrases[k];
        const p = k.replace('meta.', '').split('.');
        const prop = p.pop();
        const k1 = p.join('.');
        const l = p.length;
        const regex = new RegExp('^' + k1.replace(/\*/g, '\\w+').replace(/\./g, '\\.'));
        each(k);
        return [k1, l, regex, prop, v];
    }).sort((a, b) => {
        return a[1] - b[1];
    });
    polyglot.extend(mark$p);
    metaCache = {};
}

export function setDocumentTitle(title: string) {
    try {
        document.title = title;
    } catch (e) {

    }
}

function polyglotTranslate(key: string, opt?: { [s: string]: string }): string {
    if (polyglot) {
        return polyglot.t(key, opt);
    }
    debugger;

    return '';
}

export interface TranslateArg {
    dataID: string;
    dataIDArgs?: (string | number)[];
    args?: (TranslateArg | string | number)[];
}

export function translateArg(arg: TranslateArg | string | number, t: (key: string, ...args: (string | number)[]) => string = pt): string {
    if (typeof arg === 'string' || typeof arg === 'number') {
        return '' + arg;
    }
    let dataID = arg.dataID;
    if (arg.dataIDArgs) {
        dataID = arg.dataIDArgs.reduce<string>((str, s, i) => str.replace(`%{${i}}`, '' + s), arg.dataID);
    }
    const args = arg.args ? arg.args.map(a => translateArg(a, t)) : [];
    return t(dataID, ...args);
}

function pt(key: string, ...args: (string | number)[]): string {
    const opt: { [s: string]: string } = {};
    args.forEach((arg, index) => {
        opt[index] = '' + arg;
    });
    return polyglotTranslate(key, opt);
}

/**
 * @param key
 * @param args 依序取代 lang.json 裡面 "%{0} %{1}"
 */
export function translate(key: string | TranslateArg, ...args: (string | number | TranslateArg)[]): string {
    if (typeof key !== 'string') {
        if (DEBUG && args.length) {
            // tslint:disable-next-line:no-console
            console.warn('translate arg with args', key, args);
        }
        return translateArg(key);
    }
    return pt(key, ...args.map(a => translateArg(a)));
}

export function translateError(key: string | TranslateArg, errorCode: string | number, ...args: (string | number | TranslateArg)[]): string {
    let str = translate(key, ...args);
    if (!DEBUG && str === key) {
        str = translate('GAME.sysm_error_unknown', ...args);
    }
    return str + '(' + errorCode + ')';
}

globalDebugNNN(translate, 'translate', false);
globalDebugNNN(translateError, 'translateError', false);
