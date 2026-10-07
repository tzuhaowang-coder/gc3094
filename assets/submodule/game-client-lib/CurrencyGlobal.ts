
const CURRENCY_SYMBOL_MAP = {
    // code: [symbol, ratio]
    CNY: ['¥', '1:1'],
    EUR: ['€', '1:1'],
    GBP: ['£', '1:1'],
    HKD: ['HK$', '1:1'],
    IDR: ['Rp', '1:1000'],
    JPY: ['¥', '1:1'],
    KRW: ['₩', '1:1'],
    MYR: ['RM', '1:1'],
    SGD: ['$', '1:1'],
    THB: ['฿', '1:1'],
    USD: ['$', '1:1'],
    VND: ['₫', '1:1000'],
    MMK: ['K', '1:1000'],
    RUB: ['₽', '1:1'],
    TTT: ['$', '1:1'],
    INR: ['₨', '1:1'],
    AMD: ['դր.', '1:1'],
    LKR: ['ரூ', '1:1'],
    UGX: ['Sh', '1:1000'],
    TRY: ['₺', '1:1'],
    UAH: ['₴', '1:1'],
    NOK: ['kr', '1:1'],
    SEK: ['kr', '1:1'],
    AUD: ['$', '1:1'],
    PLN: ['zł', '1:1'],
    KZT: ['Т', '1:1'],
    BND: ['$', '1:1'],
    NGN: ['₦', '1:1'],
    KES: ['Sh', '1:1'],
    BRL: ['R$', '1:1'],
    MXN: ['$', '1:1'],
    COP: ['$', '1:1000'],
    PEN: ['S/.', '1:1'],
    ARS: ['$', '1:1'],
    CLP: ['$', '1:1'],
    ZAR: ['R', '1:1'],
    CAD: ['$', '1:1'],
    PKR: ['₨', '1:1'],
    IRR: ['﷼', '1:1000'],
    TZS: ['Sh', '1:1000'],
    NZD: ['$', '1:1'],
    CZK: ['Kč', '1:1'],
    BYN: ['Br', '1:1'],
    AZN: ['₼', '1:1'],
    TND: ['د.ت', '1:1'],
    UZS: ['лв', '1:1000'],
    XBT: ['₿', '1000:1'],
    GEL: ['ლ', '1:1'],
    CHF: ['Fr', '1:1'],
    ZMW: ['ZK', '1:1'],
    MDL: ['L', '1:1'],
    HUF: ['Ft', '1:1'],
    '1VND': ['₫', '1:1'],
    kVND: ['₫', '1:1000'],
    '1IDR': ['Rp', '1:1'],
    kIDR: ['Rp', '1:1000'],
    XAF: ['Fr', '1:1'],
    NPR: ['₨', '1:1'],
    '1LAK': ['₭', '1:1'],
    kLAK: ['₭', '1:1000'],
    PHP: ['₱', '1:1'],
    KGS: ['лв', '1:1'],
    TMT: ['T', '1:1'],
    BDT: ['৳', '1:1'],
    GHS: ['GH₵', '1:1'],
    NIO: ['C$', '1:1'],
    USDT: ['$', '1:1'],
    IN5: ['₨', '1:1'],
    PK5: ['₨', '1:1'],
    KHR: ['៛', '1:1'],
    AED: ['د.إ', '1:1'],
    XOF: ['Fr', '1:1'],
    SSP: ['£', '1:1'],
    HTG: ['G', '1:1'],
    CDF: ['Fr', '1:1'],
    '1MMK': ['K', '1:1'],
    kMMK: ['K', '1:1000'],
    cTTT: ['$', '1:100'],
    TRX: ['TRX', '1:1'],
    DKK: ['kr', '1:1'],
    uTTT: ['$', '1:1'],
    ETB: ['Br', '1:1'],
    pTTT: ['$', '1:1'],
    xTTT: ['$', '1:100'],
    cMYR: ['RM', '1:100'],
    kKHR: ['៛', '1:1000'],
    '1MNT': ['₮', '1:1'],
    kMNT: ['₮', '1:1000'],
    MOP: ['$', '1:1'],
    ZWD: ['Z$', '1:1'],
    DZD: ['دج', '1:1'],
    MAD: ['DH', '1:1'],
    '1COP': ['$', '1:1'],
    EGP: ['E£', '1:1'],
    RSD: ['Дин', '1:1'],
    VES: ['Bs', '1:1'],
    ILS: ['₪', '1:1'],
    NAD: ['$', '1:1'],
    UBTC: ['UBTC', '1:1'],
    '1PYG': ['Gs', '1:1'],
    kPYG: ['Gs', '1:1000'],
    BOB: ['$b', '1:1'],
    '1TZS': ['Sh', '1:1'],
    kTZS: ['Sh', '1:1000'],
    '1UGX': ['Sh', '1:1'],
    kUGX: ['Sh', '1:1000'],
    '1IRR': ['﷼', '1:1'],
    kIRR: ['﷼', '1:1000'],
    xMYR: ['RM', '1:1000'],
    '1UZS': ['лв', '1:1'],
    kUZS: ['лв', '1:1000'],
    UYU: ['$U', '1:1'],
    PGK: ['K', '1:1'],
    xINR: ['₹', '1:100'],
    KWD: ['د.ك', '1:1'],
    SAR: ['﷼', '1:1'],
    MVR: ['Rf', '1:1'],
    '8TTT': ['$', '1:100'],
    kUSD: ['$', '1:1000'],
    cHKD: ['HK$', '1:100'],
    CRC: ['₡', '1:1'],
    DOP: ['RD$', '1:1'],
    cUSD: ['$', '1:100'],
};

let isoCode: string = '';
let symbol: string = '';
/**
 * 給贏分框使用
 */
let prefix: string = '';
/**
 * 給設定頁使用
 */
let prefix2: string = '';
let tail: string = '';

export function setCurrencyCode(code: string) {
    isoCode = code;
    const arr = CURRENCY_SYMBOL_MAP[isoCode] || [];
    symbol = arr[0] || '';
    const ratio = arr[1] || '';

    if (isoCode === 'kIDR') {
        prefix = symbol;
        prefix2 = 'kIDR';
        tail = '';
        return;
    }
    prefix = symbol;
    prefix2 = symbol;
    tail = ratio === '1:1000' ? 'K' : '';
}

export function getCurrencyISO() {
    return isoCode;
}

export function getCurrencyPrefix() {
    return prefix;
}

export function getCurrencyPrefix2() {
    return prefix2;
}

export function getCurrencySuffix() {
    return tail;
}
