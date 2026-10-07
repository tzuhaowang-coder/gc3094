// tslint:disable-next-line:import-name
import Grpc from '@improbable-eng/grpc-web';
// tslint:disable-next-line:import-name
import BrowserHeaders from 'browser-headers';
// tslint:disable-next-line:import-name
import Rxjs from 'rxjs';
// tslint:disable-next-line:import-name
import Operators from 'rxjs/operators/index.js';
export type Client = Grpc.grpc.Client<any, any>;
export const WebsocketTransport = Grpc.grpc.WebsocketTransport;
export const client = Grpc.grpc.client;
// @ts-ignore
export type Code = grpc.Code;
export const Code = Grpc.grpc.Code;
export const invoke = Grpc.grpc.invoke;

export type Metadata = BrowserHeaders.BrowserHeaders;
// tslint:disable-next-line:variable-name
export const Metadata = BrowserHeaders.BrowserHeaders;

export type Observer<T> = Rxjs.Observer<T>;
export type Observable<T> = Rxjs.Observable<T>;
export type Subscriber<T> = Rxjs.Subscriber<T>;
export const create = Rxjs.Observable.create;
export type Subscription = Rxjs.Subscription;

export const { debounceTime, map, tap } = Operators;
