import { DEBUG } from 'cc/env';
import { supportSessionStorage } from '../StorageGlobal';
import { log, warn } from '../utils/Utils';
import { client, Client, Code, create, Metadata, Observable, Observer, Subscriber, WebsocketTransport } from './GrpcWarp';
import { HeartbeatRes } from './ProtobufWarp';

interface IPacketReq {
    getIndex(): number;
    toObject(): Object;
}
interface IPacketRes {
    getHeartBeatRes(): HeartbeatRes;
    getIndex(): number;
    toObject(): Object;
}
const session: Metadata = new Metadata();

// k8s load balance 處理
let upstream: string = null;

const loadBalanceHash: string = Date.now().toString();

function needRestartClient(client: any): boolean {
    return client.started && (client.completed || client.closed || client.finishedSending);
}

export default abstract class RpcServiceBase {

    protected host = null;

    protected token = null;

    public websocketClient: Client;

    private rej: Function = null;
    private p: Promise<any> = null;
    public ok: boolean = false;
    private id: number = 0;

    public rpcLog:boolean = false;

    public clientsSubscriber: Map<number, {
        subscriber: Subscriber<any>,
        processor: (resp: IPacketRes) => any,
        callbackOnce: boolean,
    }> = new Map();

    private packetIndex: number = 0;

    constructor() {
        if (supportSessionStorage()) {
            const token: string = sessionStorage.getItem('grpc-session');
            if (token) {
                session.set('grpc-session', token);
            }
        }
    }

    public generatePacketIndex(): number {
        return this.packetIndex += 1;
    }

    protected abstract respondPacketProcessor(packet: IPacketRes): [string, any];
    public observer: Observer<any> = null;

    public initStreaming(observer: Observer<any>) {
        return create((subscriber: Subscriber<any>) => {
            this.clientsSubscriber.set(0, {
                subscriber,
                processor: this.respondPacketProcessor,
                callbackOnce: false,
            });
        }).subscribe(observer);
    }

    private startWs(protoType: any) {
        if (!this.websocketClient || needRestartClient(this.websocketClient)) {
            this.closeWebSocket();

            if (protoType.methodName.indexOf('token') === -1) {
                protoType.methodName += '?token=' + this.token;
            }
            if (protoType.methodName.indexOf('lbhash') === -1) {
                protoType.methodName += '&lbhash=' + loadBalanceHash;
                if (upstream) {
                    protoType.methodName += '&upstream=' + upstream;
                }
            }
            this.websocketClient = client(protoType, {
                host: this.host,
                transport: WebsocketTransport(),
            });
            this.initStreaming(this.observer);

            const id = this.id + 1;
            this.id = id ;
            let res: Function;
            const p = new Promise((resolve, reject) => {
                res = resolve;
                this.rej = reject;
            });
            this.p = p;
            this.ok = false;

            this.websocketClient.onMessage((resp: IPacketRes) => {
                if (this.id !== id) {
                    if(DEBUG && this.rpcLog){
                        log('rpc id != id', this.id , id, Date.now());
                    }
                }
                if (resp.getHeartBeatRes()) {
                    // if (resp.getHeartBeatRes().getResult().getCode() === 1) {
                    // }
                    if(DEBUG && this.rpcLog){
                        log('rpc hb res', id, Date.now(), resp.getHeartBeatRes().toObject());
                    }
                    this.ok = true;
                    res();
                }
                const subscriberAndProcessor = this.clientsSubscriber.get(resp.getIndex());
                if (!subscriberAndProcessor) {
                    warn('rpc no subscriber index', resp.getIndex(), resp.toObject ? resp.toObject() : resp);
                    return;
                }
                const subscriber = subscriberAndProcessor.subscriber;
                const processor = subscriberAndProcessor.processor;
                const r = processor(resp);
                if(DEBUG && this.rpcLog){
                    log('rpc resp', id, r && r.toObject && r.toObject(), r, resp.toObject());
                }
                subscriber.next(processor(resp));
                if (subscriber.closed) {
                    if(DEBUG && this.rpcLog){
                        log('rpc resp subscriber.closed');
                    }
                }
                if (subscriberAndProcessor.callbackOnce) {
                    this.clientsSubscriber.delete(resp.getIndex());
                    subscriber.complete();
                }
            });

            this.websocketClient.onEnd((code: Code, msg: string | undefined, trailers: Metadata) => {
                if(DEBUG && this.rpcLog){
                    log('rpc on end:', code, msg);
                }
                this.clientsSubscriber.forEach((subscriberAndProcessor, idx) => {
                    if (code !== Code.OK) {
                        subscriberAndProcessor.subscriber.error(msg);
                    }
                    subscriberAndProcessor.subscriber.complete();
                });
                this.closeWebSocket();
            });
            try {
                this.websocketClient.start(session);
                if(DEBUG && this.rpcLog){
                    log('rpc start', id, Date.now());
                }
            } catch (e) {
                if(DEBUG && this.rpcLog){
                    log('rpc start error:', e);
                }
                this.closeWebSocket();
            }
            return id;
        }
        return this.id;
    }

    public callStreamingAPI<T>(protoType: any, req: IPacketReq, callbackOnce: boolean, processor: (resp: IPacketRes) => T): Observable<T> {
        const id = this.startWs(protoType);

        return create(async(obs: Subscriber<T>) => {
            if (req.getIndex() !== 0) {
                this.clientsSubscriber.set(req.getIndex(), { processor, callbackOnce, subscriber: obs });
            }
            if (this.websocketClient) {
                try {
                    if(DEBUG && this.rpcLog){
                        log('rpc wait', id, req.getIndex(), Date.now(), req.toObject());
                    }
                    await this.p;
                } catch (e) {
                    if(DEBUG && this.rpcLog){
                        log('rpc give up', id, req.toObject(), Date.now());
                    }
                    // 放棄，不要送
                    return;
                }
                try {
                    if(DEBUG && this.rpcLog){
                        log('rpc send', id, req.getIndex(), Date.now(), req.toObject());
                    }
                    this.websocketClient.send(req);
                } catch (e) {
                    if(DEBUG && this.rpcLog){
                        log('rpc send error:', id, e);
                    }
                    this.closeWebSocket();
                }

            }
        });

    }

    public closeWebSocket() {
        this.rej?.();
        this.clientsSubscriber.clear();
        if (this.websocketClient) {
            this.websocketClient.onMessage((resp: IPacketRes) => {
                if(DEBUG && this.rpcLog){
                    log('rpc prev onMessage', resp.toObject());
                }
            });
            this.websocketClient.onEnd((code: Code, msg: string | undefined, trailers: Metadata) => {
                if(DEBUG && this.rpcLog){
                    log('rpc prev onEnd', code, msg);
                }
            });
            this.websocketClient.close();
        }
        this.ok = false;
        this.p = null;
        this.rej = null;
        delete this.websocketClient;
    }

    public finishSendWebSocket() {
        if (this.websocketClient) {
            this.websocketClient.finishSend();
        }
        this.clientsSubscriber.clear();
        delete this.websocketClient;
    }

    // public callAPI<T>(protoType: any, req: any): Observable<T> {

    //     const ob: Observable<T> = Observable.create((obs: Subscriber<T>) => {
    //         if (protoType.methodName.indexOf('token') === -1) {
    //             protoType.methodName += '?token=' + this.token;
    //         }
    //         if (protoType.methodName.indexOf('lbhash') === -1) {
    //             protoType.methodName += '&lbhash=' + loadBalanceHash;
    //             if (upstream) {
    //                 protoType.methodName += '&upstream=' + upstream;
    //             }
    //         }
    //         // sesseion 處理
    //         grpc.invoke(protoType, {
    //             host: this.host,
    //             request: req,
    //             metadata: session,
    //             onHeaders: this.onHeaders,
    //             onMessage: (resp: any) => {
    //                 obs.next(resp);
    //             },
    //             onEnd(code: grpc.Code, msg: string | undefined, trailers: grpc.Metadata) {
    //                 if (code !== grpc.Code.OK) {
    //                     // reject();
    //                     obs.error(msg);
    //                 }
    //                 obs.complete();
    //             },
    //         });
    //     },
    //     );

    //     return ob;

    // }

    private onHeaders(headers: Metadata) {
        if (headers.has('grpc-session')) {
            const token = headers.get('grpc-session')[0];
            session.set('grpc-session', token);
            if (supportSessionStorage()) {
                sessionStorage.setItem('grpc-session', token);
            }
        }
        // k8s load balance 處理
        if (headers.has('x-upstream')) {
            upstream = headers.get('x-upstream')[0];
        }
    }

}
