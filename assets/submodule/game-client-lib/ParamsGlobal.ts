import { DEBUG } from 'cc/env';

function getLocationHref(): string {
    return window.location.href;
}

/**
 * 解析網址
 * @param {string} url
 * @returns {string[]}
 */
function parseURLParams(url: string): { [s: string]: string[] } {

    const queryStart: number = url.indexOf('?') + 1;
    const queryEnd: number = url.indexOf('#') + 1 || url.length + 1;
    const query: string = url.slice(queryStart, queryEnd - 1);
    const pairs: string[] = query.replace(/\+/g, ' ').split('&');
    const parms = {};
    let i;
    let n;
    let v;
    let nv;
    if (query === url || query === '') return parms;
    for (i = 0; i < pairs.length; i += 1) {
        nv = pairs[i].split('=', 2);
        n = decodeURIComponent(nv[0]);
        v = decodeURIComponent(nv[1]);
        if (!parms.hasOwnProperty(n)) parms[n] = [];
        parms[n].push(nv.length === 2 ? v : null);
    }
    return parms;

}

let hup: {
    [s: string]: string[];
};

export function getHrefURLParams(key: string): string {
    if (!hup) {
        hup = parseURLParams(getLocationHref());
    }
    return (hup && hup[key] && hup[key][0]) || '';
}

export function getDebugParams(key: string) {
    if (DEBUG) {
        const str = new URL(location.href).searchParams.get('debug');
        if (str) {
            // 'list,x,y=1'
            const m = str.split(',').map(s => s.split('='));
            for (let i = 0; i < m.length; i += 1) {
                const [k, v] = m[i];
                if (k === key) {
                    if (v) {
                        return v;
                    }
                    return k;
                }
            }
        }
        return getHrefURLParams(key);
    }
    return '';
}

export function getAuth() {
    return getHrefURLParams('auth') || getHrefURLParams('token');
}

interface Params {
    // token
    t: string;
    // gameId
    g: string;
    // LoginTokenArgs
    a: {
        // host
        h: string,
        // lang
        l: string,
        // backURL
        ba: string,
        // oper
        o: string,
        // extra
        e: string,
        // btn="0,1"
        bt: string,
        // music
        m: string,
        // sound
        s: string,
    };
}

const params = getParams();

function getParams(): Params {

    let lastAuth: string;
    let currAuth: string;
    try {
        lastAuth = localStorage.getItem('last_auth') || '';
        if (window.parent) {
            const authParams = parseURLParams(window.parent.location.href);
            currAuth = (authParams && authParams['auth'] && authParams['auth'][0]) || '';
        }
    } catch (e) {
    }
    const isRefreshPage = lastAuth === currAuth;
    localStorage.setItem('last_auth', currAuth);

    const auth = getHrefURLParams('auth');
    if (auth) {
        const a = {
            h: '',
            l: '',
            e: '',
            ba: '',
            o: '',
            bt: '',
            m: '',
            s: '',
        };
        const params: Params = {
            a,
            t: '',
            g: '',
        };
        const jwt = auth.split('.'); // 截取token，获取载体
        if (jwt.length !== 3) {
            return params;
        }
        try {
            const str = jwt[1].replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
            const params2 = JSON.parse(decodeURIComponent(escape(window.atob(str)))); // 解析，需要吧'_','-'进行转换否则会无法解析
            if (!params2.a) {
                params2.a = a;
            }
            params2.a.h = getHrefURLParams('host') || params2.a.h;
            if (isRefreshPage) {
                params2.a.m = '';
                params2.a.s = '';
            }
            return params2;
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(e);
            return params;
        }
    } else {
        const params2: Params = {
            t: getHrefURLParams('token'),
            g: '',
            a: {
                h: getHrefURLParams('host'),
                l: getHrefURLParams('lang'),
                e: getHrefURLParams('extra'),
                ba: getHrefURLParams('backurl'),
                o: getHrefURLParams('oper'),
                bt: getHrefURLParams('btn'),
                m: getHrefURLParams('music'),
                s: getHrefURLParams('sound'),
            },
        };
        if (isRefreshPage) {
            params2.a.m = '';
            params2.a.s = '';
        }
        return params2;
    }
}

type TrueFalseEmptyString = '1' | '0' | '';

const a = params.a;
export const TOKEN = params.t;
export const HOST = a.h;
export const LANG = a.l;
export const OPER = a.o;
export const BACK_URL = a.ba;
export const MUSIC: TrueFalseEmptyString = a.m ? (a.m === '1' ? '1' : '0') : '';
export const SOUND: TrueFalseEmptyString = a.s ? (a.s === '1' ? '1' : '0') : '';
export const BTN_EXIT: boolean = a.bt ? a.bt.split(',')[0] === '1' : true;
export const BTN_RECORD: boolean = a.bt ? a.bt.split(',')[1] === '1' : true;

const extras = a.e ? a.e.split(',') : [];
export const IS_GUEST = TOKEN === 'guest';
export const IS_LOBBY = getHrefURLParams('islobby') === '1';

// extra=1 web
// extra=2 boot with app webview
// extra=3 native app
//         extra=2、extra=3 皆會關閉 ResizeGlobal.showAllMode：
//         只有 iOS 行動裝置的純瀏覽器網頁版才啟用 showAll
//         （SHOW_ALL：整個設計畫面等比縮放完整顯示、不裁切，
//          螢幕比例不合時留黑邊）；帶 webview(2) 或原生 App(3)
//         flag 時則維持原本的 FIXED_HEIGHT / FIXED_WIDTH 策略。
// extra=11 強制直版（行動裝置有效）
// extra=12 強制橫版（行動裝置有效）
// extra=13 桌機網頁/window/mac 顯示 mobile 版型
// extra=1000 不顯示帳號
// extra=1010 只顯示整數
// extra=1020 強制關閉貨幣符號，不可設定貨幣符號開關
// extra=1021 強制顯示貨幣符號，不可設定貨幣符號開關
// extra=1022 預設關閉貨幣符號，可設定貨幣符號開關，有設定會先吃設定
// extra=1023 預設顯示貨幣符號，可設定貨幣符號開關，有設定會先吃設定
// extra=1030 關閉顯示比值
// extra=1040 不顯示跑馬燈
// extra=1050 隱藏注單及細單活動、活動贏分欄位
// extra=1060 隱藏注單及細單手續費欄位
// extra=1071 等於試玩玩家等級1
// extra=1072 等於試玩玩家等級2
// extra=1073 等於試玩玩家等級3 (星城套用)
// extra=1080 (a)魚機單廳進桌後不呈現 1元場(星城套用)
//            (b)本地不存session無法重新登入(星城套用)
//            (c)預設 Bet Level 設定最小值(星城套用)
//            (d)企劃依照各款遊戲素材選擇要測試 d1 或 d2(星城套用)
//              (d-1) 遊戲內有簡中、繁中的素材(遊戲圖標, 說明頁及起始頁附圖, 遊戲內細單)，zh_cn:顯示繁中/zh_hk:顯示繁中/其他語系：顯示繁中
//              (d-2) 遊戲內有簡中、繁中、英文的素材(遊戲圖標, 說明頁及起始頁附圖, 遊戲內細單)，zh_cn:顯示繁中/zh_hk:顯示繁中/其他語系：顯示英文
//              ※補充：上述“素材”為“非美術字體的遊戲元素圖案或動畫(若它有顯示語系文字)”
// extra=1090 是否使用 K 及 M
// extra=1100 不顯示起始頁
// extra=1110 網路異常斷線不出現刷新按鈕
// extra=1120 老虎機起始頁面的多語系 key『 LOBBY.leading_page.m2 』替換為『 LOBBY.leading_page.m2_extra1120 』
// extra=1130 隱藏 CLI certification 圖示
// extra=1140 Loading 頁面顯示長版資訊圖，隱藏 game-logo(logo.png)，遊戲起始頁面 不顯示長版圖(tx_start_bg)
// extra=1150 隱藏Loading活動頁面
// extra=1160 隱藏活動調轉遊戲功能
// extra=1170 未參與活動的遊戲也看得到活動
// extra=1180 隱藏 cocos 老虎機 Turbo 功能

export const EXTRA: string = a.e;
export const EXTRA_2: boolean = extras.indexOf('2') !== -1;
export const EXTRA_3: boolean = extras.indexOf('3') !== -1;
export const EXTRA_9: boolean = extras.indexOf('9') !== -1;
export const EXTRA_11: boolean = extras.indexOf('11') !== -1;
export const EXTRA_12: boolean = extras.indexOf('12') !== -1;
export const EXTRA_13: boolean = extras.indexOf('13') !== -1;
export const EXTRA_1000: boolean = extras.indexOf('1000') !== -1;
export const EXTRA_1010: boolean = extras.indexOf('1010') !== -1;
export const EXTRA_1020: boolean = extras.indexOf('1020') !== -1;
export const EXTRA_1021: boolean = extras.indexOf('1021') !== -1;
export const EXTRA_1022: boolean = extras.indexOf('1022') !== -1;
export const EXTRA_1023: boolean = extras.indexOf('1023') !== -1;
export const EXTRA_1020_FORCE_DEFAULT: boolean = (EXTRA_1020 || EXTRA_1021 || EXTRA_1022 || EXTRA_1023) ? (EXTRA_1020 || EXTRA_1021) : false;
export const EXTRA_1020_DEFAULT: boolean = (EXTRA_1020 || EXTRA_1021 || EXTRA_1022 || EXTRA_1023) ? (EXTRA_1021 || EXTRA_1023) : false;
export const EXTRA_1020_SETTING: boolean = (EXTRA_1020 || EXTRA_1021 || EXTRA_1022 || EXTRA_1023) ? (EXTRA_1022 || EXTRA_1023) : true;
export const EXTRA_1030: boolean = extras.indexOf('1030') !== -1;
export const EXTRA_1040: boolean = extras.indexOf('1040') !== -1;
export const EXTRA_1050: boolean = extras.indexOf('1050') !== -1;
export const EXTRA_1060: boolean = extras.indexOf('1060') !== -1;
export const EXTRA_1071: boolean = IS_GUEST ? extras.indexOf('1071') !== -1 : false;
export const EXTRA_1072: boolean = IS_GUEST ? extras.indexOf('1072') !== -1 : false;
export const EXTRA_1073: boolean = IS_GUEST ? extras.indexOf('1073') !== -1 : false;
export const EXTRA_1080: boolean = extras.indexOf('1080') !== -1;
export const EXTRA_1090: boolean = extras.indexOf('1090') !== -1;
export const EXTRA_1100: boolean = extras.indexOf('1100') !== -1;
export const EXTRA_1110: boolean = extras.indexOf('1110') !== -1;
export const EXTRA_1120: boolean = extras.indexOf('1120') !== -1;
export const EXTRA_1140: boolean = extras.indexOf('1140') !== -1;
export const EXTRA_1180: boolean = extras.indexOf('1180') !== -1;

// globalDebugNNN(getHrefURLParams, 'getHrefURLParams', false);
