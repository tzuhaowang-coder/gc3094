// // @ts-ignore
// import * as CryptoJS from 'crypto-js';
// // @ts-ignore
// import { v1 } from 'node-uuid';
// // @ts-ignore
// import { Md5 } from 'ts-md5';
// import { safePlus } from '../utils/Utils';

// export interface TransferAPIReq {
//     serial: string;
//     token?: string;
//     account: string;
//     amount: string;
//     operType: number;
//     agent: string;
//     random?: number;
// }
// export interface BetLogDetailReq {
//     agent: string;
//     account: string;
//     // tslint:disable-next-line:variable-name
//     game_id: string;
//     lang: string;
// }

// export interface AddMemberReq {
//     agent: string;
//     account: string;
//     // tslint:disable-next-line:variable-name
//     group_id?: string;
//     // tslint:disable-next-line:variable-name
//     class_id?: string;
//     password?: string;
//     random?: number;
// }
// export interface MemberLoginReq {
//     agent: string;
//     account: string;
//     // tslint:disable-next-line:variable-name
//     group_id: string;
//     // tslint:disable-next-line:variable-name
//     class_id: string;
//     // tslint:disable-next-line:variable-name
//     game_id: string;
//     lang: string;
//     oper: string;
//     backurl: string;
//     // tslint:disable-next-line:variable-name
//     is_demo: boolean;
//     // tslint:disable-next-line:variable-name
//     carry_balance: string;
// }
// export interface CryptoData {
//     data: string;
//     sign: string;
//     channel:string;
// }
// // tslint:disable-next-line:variable-name
// const OpenSslFormatter = {
//     stringify(params: any) {
//         const salt = CryptoJS.enc.Hex.parse(params.salt.toString()).toString(CryptoJS.enc.Latin1);
//         const ct = params.ciphertext.toString(CryptoJS.enc.Latin1);

//         return CryptoJS.enc.Latin1.parse('Salted__' + salt + ct).toString(CryptoJS.enc.Base64);
//     },

//     parse(str: any) {
//         str = CryptoJS.enc.Base64.parse(str).toString(CryptoJS.enc.Latin1);
//         const salted = str.substr(0, 8);

//         if (salted !== 'Salted__') {
//             throw new Error('Error parsing salt');
//         }

//         const salt = str.substr(8, 8);
//         const ct = str.substr(16);

//         return CryptoJS.lib.WordArray.create({
//             ciphertext: CryptoJS.enc.Latin1.parse(ct),
//             salt: CryptoJS.enc.Latin1.parse(salt),
//         });
//     },
// };

// export default class Service {

//     constructor(public local: {
//         aesKey: string,
//         signKey: string,
//         channel: string,
//         endpoint: string,
//     }) {

//     }

//     private async submit(req: any, path: string) {
//         // encryption
//         const encrypted = this.encrypt(JSON.stringify(req), this.local.aesKey);
//         const toSign = encrypted + this.local.signKey;
//         const sign = this.sign(toSign);
//         const cryptoData: CryptoData = {
//             channel: this.local.channel,
//             data: encrypted,
//             sign: String(sign),
//         };

//         const resp = await fetch(this.local.endpoint + path, {
//             method: 'POST',
//             body: JSON.stringify(cryptoData),
//             headers: {
//                 'content-type': 'application/json',
//             },
//         });
//         return resp.json();
//     }

//     private sign(toSign: string) {
//         const md5 = new Md5();
//         md5.appendStr(toSign);
//         return md5.end();
//     }

//     private encrypt(input: any, passphrase: any) {
//         return CryptoJS.AES.encrypt(input, passphrase, { format: OpenSslFormatter }).toString();
//     }

//     private decrypt(crypted: any, passphrase: any) {
//         return CryptoJS.AES.decrypt(crypted, passphrase, { format: OpenSslFormatter }).toString(CryptoJS.enc.Utf8);
//     }

//     public async setBalance(account: string, agent: string, balance: number) :Promise<number> {
//         const bal = await this.getBalance(account, agent);
//         const diff = safePlus(balance, -bal);
//         if (diff) {
//             await this.transfer(account, agent, diff);
//         }
//         return balance;
//     }

//     public async getCleanAccount(prefix: string, agent: string, balance: number = 0): Promise<string> {
//         let i = 1;
//         while (i <= 100) {
//             const account = prefix + i;
//             try {
//                 await this.createMember(account, agent);
//             } catch (e) {
//             }
//             try {
//                 await this.transfer(account, agent, -1);
//                 if (balance === 0) {
//                     await this.transfer(account, agent, +1);
//                 } else {
//                     this.setBalance(account, agent, balance);
//                 }
//                 return account;
//             } catch (e) {
//                 i += 1;
//             }
//         }
//         return Promise.reject('to many tries');
//     }

//     /**
//      *
//      * @param account
//      * @param agent
//      * @param amount >0 為存入多少，<0 為減少多少
//      */
//     public async transfer(account: string, agent: string, amount: number, sign?: number): Promise<number> {
//         if  (typeof sign === 'undefined') {
//             sign = (String(Math.sign(amount))[0] === '-' ? 0 : 1);
//         }
//         const req: TransferAPIReq = {
//             account,
//             agent,
//             serial: v1(),
//             amount: '' + Math.abs(amount),
//             operType: sign,
//         };
//         const o: {
//             result: {
//                 code: number,
//                 msg: string,
//             }
//             balance: string,
//         } = await this.submit(req, '/v1/trans/transfer');
//         if (o.result && o.result.code !== 1) {
//             return Promise.reject(o.result.msg);
//         }
//         return Number(o.balance);
//     }

//     public async createMember(account: string, agent: string) : Promise<void> {
//         const req: AddMemberReq = {
//             account,
//             agent,
//         };
//         const o: {
//             result: {
//                 code: number,
//                 msg: string,
//             },
//         } = await this.submit(req, '/v1/member/create');
//         if (o.result && o.result.code !== 1) {
//             return Promise.reject(o.result.msg);
//         }
//     }

//     public async getToken(account: string, agent: string): Promise<string> {
//         const req: AddMemberReq = {
//             account,
//             agent,
//         };
//         const o: {
//             result: {
//                 code: number,
//                 msg: string,
//             }
//             token: string,
//         } = await this.submit(req, '/v1/member/login');
//         if (o.result && o.result.code !== 1) {
//             return Promise.reject(o.result.msg);
//         }
//         return o.token;
//     }

//     public async getBalance(account: string, agent: string) : Promise <number> {
//         const req: AddMemberReq = {
//             account,
//             agent,
//         };
//         const o: {
//             result: {
//                 code: number,
//                 msg: string,
//             }
//             balance: string,
//         } =  await this.submit(req, '/v1/trans/check_balance');
//         if (o.result && o.result.code !== 1) {
//             return Promise.reject(o.result.msg);
//         }
//         return Number(o.balance);
//     }

// }

// export function resolveReverser<T>(promise: Promise<T>) : Promise<string> {
//     return new Promise((resolve, reject) => {
//         promise.then(reject, resolve);
//     });
// }
