import { DEBUG } from 'cc/env';
import { log, sumReducer, warn } from '../utils/Utils';
import { Observable } from './GrpcWarp';
import { Any, AuthReq, AuthRes, BetBonusReq, BetBonusRes, BonusInfoReq, BonusInfoRes, CheckBonusReq, CheckBonusRes, DisconnectReq, DisconnectRes, Game, HeartbeatReq, HeartbeatRes, KickRes, MarqueeRes, Message, PacketReq, PacketRes, PacketType, PlatformReq, PlatformRes, Result, ResumeReq, ResumeRes, UpdateBalanceReq, UpdateBalanceRes, UserInfoReq, UserInfoRes } from './ProtobufWarp';
import { attachPacketBalance, SkillCardCheckReq, SkillCardCheckRes, SkillCardDrawReq, SkillCardDrawRes, SkillCardKey, SkillCardUseReq, SkillCardUseRes } from './SkillCardProto';
import RpcServiceBase from './RpcServiceBase';

export enum MemberServiceBaseKey {
    AccountAuthRes = 'account.AuthRes',
    AccountUserInfoRes = 'account.UserInfoRes',
    AccountPlatformRes = 'account.PlatformRes',
    GameResumeRes = 'game.ResumeRes',
    GameHeartbeatRes = 'game.HeartbeatRes',
    DisconnectRes = 'game.DisconnectRes',
    AccountUpdateBalanceRes = 'account.UpdateBalanceRes',
    GameKickRes = 'game.KickRes',
    GameMarqueeRes = 'game.MarqueeRes',
    CheckBonusRes = 'extension.CheckBonusRes',
    BetBonusRes = 'extension.BetBonusRes',
    BonusInfoRes = 'extension.BonusInfoRes',
    GamebaseResult = 'gamebase.Result',
    // 技能卡訊息 key 一律用 SkillCardProto 的 SkillCardKey（單一來源，不在此重複字串）
}

export default abstract class MemberServiceBase extends RpcServiceBase {

    constructor(host: string, token:string) {
        super();
        this.host = host;
        this.token = token;
        this.respondPacketProcessor = this.respondPacketProcessor.bind(this);
    }

    /**
     * 登入
     * @param authReq
     */
    streamAuth(authReq: AuthReq): Observable<[string, AuthRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(authReq, 'account.AuthReq'));
        return this.callStreamingAPI<[string, AuthRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 取得玩家資訊
     */
    streamGetUserInfo(req: UserInfoReq): Observable<[string, UserInfoRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(req, 'account.UserInfoReq'));
        return this.callStreamingAPI<[string, UserInfoRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 取得平台token
     */
    streamGetPlatformAuthInfo(): Observable<[string, PlatformRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(new PlatformReq(), 'account.PlatformReq'));
        return this.callStreamingAPI<[string, PlatformRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 斷線回傳
     */
    streamDisconnect(): Observable<[string, DisconnectRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.DISCONNECT);
        const disconnectReq = new DisconnectReq();
        packet.setDisconnectReq(disconnectReq);
        return this.callStreamingAPI<[string, DisconnectRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 取得餘額
     */
    streamGetUpdateBalance(): Observable<[string, UpdateBalanceRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(new UpdateBalanceReq(), 'account.UpdateBalanceReq'));
        return this.callStreamingAPI<[string, UpdateBalanceRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 心跳封包
     * @param heartbeat
     * @returns {Observable<HeartbeatRes>}
     */
    streamHeartbeat(heartbeat: HeartbeatReq): Observable<[string, HeartbeatRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(0);
        packet.setType(PacketType.HEARTBEAT);
        packet.setHeartBeatReq(heartbeat);
        if(DEBUG && this.rpcLog){
            log('rpc hb', heartbeat.toObject());
        }
        return this.callStreamingAPI<[string, HeartbeatRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 確認Bonus數量
     * @returns {Observable<CheckBonusRes>}
     */
    streamCheckBonusReq(): Observable<[string, CheckBonusRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(new CheckBonusReq(), 'extension.CheckBonusReq'));
        return this.callStreamingAPI<[string, CheckBonusRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * BetBonus
     * @returns {Observable<BetBonusRes>}
     */
    streamBonusInfoReq(): Observable<[string, BonusInfoRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(new BonusInfoReq(), 'extension.BonusInfoReq'));
        return this.callStreamingAPI<[string, BonusInfoRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * BetBonus
     * @returns {Observable<BetBonusRes>}
     */
    streamBetBonusReq(): Observable<[string, BetBonusRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(new BetBonusReq(), 'extension.BetBonusReq'));
        return this.callStreamingAPI<[string, BetBonusRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 技能卡查卡：回該玩家所有可見卡＋符合資格活動（前端依 game_id filter）
     * @returns {Observable<SkillCardCheckRes>}
     */
    streamSkillCardCheckReq(): Observable<[string, SkillCardCheckRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(new SkillCardCheckReq(), SkillCardKey.SkillCardCheckReq));
        return this.callStreamingAPI<[string, SkillCardCheckRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 技能卡使用（GameBag 情境二）：標記啟用，未使用不可領
     * @returns {Observable<SkillCardUseRes>}
     */
    streamSkillCardUseReq(cardId: string): Observable<[string, SkillCardUseRes]> {
        const req = new SkillCardUseReq();
        req.setCardId(cardId);
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(req, SkillCardKey.SkillCardUseReq));
        return this.callStreamingAPI<[string, SkillCardUseRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 技能卡逐局領取：不帶局數，server 依卡上 cursor 決定並推進
     * @returns {Observable<SkillCardDrawRes>}
     */
    streamSkillCardDrawReq(cardId: string): Observable<[string, SkillCardDrawRes]> {
        const req = new SkillCardDrawReq();
        req.setCardId(cardId);
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.EXTENSION);
        packet.setContent(this.toAny(req, SkillCardKey.SkillCardDrawReq));
        return this.callStreamingAPI<[string, SkillCardDrawRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 回復狀態時回傳
     * @returns {Observable<ResumeRes>}
     */
    streamResumeReq(req: ResumeReq): Observable<[string, ResumeRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(0);
        packet.setType(PacketType.RESUME);
        packet.setResumeReq(req);
        return this.callStreamingAPI<[string, ResumeRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * 回傳封包處理
     * @param {Packet} packet
     * @returns {any}
     */
    protected respondPacketProcessor(packet: PacketRes): [string, any] {
        switch (packet.getType()) {
        case PacketType.HEARTBEAT:
            return [MemberServiceBaseKey.GameHeartbeatRes, packet.getHeartBeatRes()];
        case PacketType.DISCONNECT:
            return [MemberServiceBaseKey.DisconnectRes, packet.getDisconnectRes()];
        case PacketType.RESUME:
            if (packet.getResumeRes()) {
                return [MemberServiceBaseKey.GameResumeRes, packet.getResumeRes()];
            } else {
                return this.parseContent(packet.getContent());
            }
        case PacketType.EXTENSION:
            const [key, any] = this.parseContent(packet.getContent());
            const packetInfo = packet.getPacketInfo();
            if (packetInfo && any instanceof BetBonusRes) {
                if (DEBUG) {
                    if (any.getBalanceSerial() <  packetInfo.getBalanceSerial()) {
                        log('@@xx BetBonusRes' , any.getBalanceSerial() ,  any.getBonus().getRewardsList().reduce(sumReducer));
                        log('@@xx packetInfo ' , packetInfo.getBalanceSerial() ,  packetInfo.getBalance());
                    }
                }
                any.setBalanceSerial(packet.getPacketInfo().getBalanceSerial());
                any.setBalance(packet.getPacketInfo().getBalance());
            }
            // SkillCardDrawRes 本體無餘額欄位，入帳後餘額只在 packet_info：附掛供下游使用
            if (packetInfo && any instanceof SkillCardDrawRes) {
                attachPacketBalance(any, packetInfo.getBalance());
            }
            return [key, any];
        case PacketType.CONTENT:
        case PacketType.AICONTENT:
            return this.parseContent(packet.getContent());
        default:
            log('no PacketType');
            break;
        }
        return null;
    }

    /**
     * any轉回物件
     * @param content
     */
    protected parseContent(content: any): [string, any] {
        const key = content.getTypeName();
        let obj = null;
        switch (key) {
        case MemberServiceBaseKey.AccountAuthRes:
            obj = content.unpack(AuthRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.AccountUserInfoRes:
            obj = content.unpack(UserInfoRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.AccountPlatformRes:
            obj = content.unpack(PlatformRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.GameHeartbeatRes:
            obj = content.unpack(HeartbeatRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.AccountUpdateBalanceRes:
            obj = content.unpack(UpdateBalanceRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.GameKickRes:
            obj = content.unpack(KickRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.GameMarqueeRes:
            obj = content.unpack(MarqueeRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.CheckBonusRes:
            obj = content.unpack(CheckBonusRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.BonusInfoRes:
            obj = content.unpack(BonusInfoRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.BetBonusRes:
            obj = content.unpack(BetBonusRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.GameResumeRes:
            obj = content.unpack(ResumeRes.deserializeBinary, content.getTypeName());
            break;
        case MemberServiceBaseKey.GamebaseResult:
            obj = content.unpack(Result.deserializeBinary, content.getTypeName());
            break;
        case SkillCardKey.SkillCardCheckRes:
            obj = content.unpack(SkillCardCheckRes.deserializeBinary, content.getTypeName());
            break;
        case SkillCardKey.SkillCardUseRes:
            obj = content.unpack(SkillCardUseRes.deserializeBinary, content.getTypeName());
            break;
        case SkillCardKey.SkillCardDrawRes:
            obj = content.unpack(SkillCardDrawRes.deserializeBinary, content.getTypeName());
            break;
        default:
            obj = this.doParseContent(content);
            break;
        }
        if (!obj) {
            warn('No Match Type', content.getTypeName(), content);
        }
        return [key, obj];
    }

    protected abstract doParseContent(content: any):any;
    /**
     * 物件轉any
     * @param content
     * @param name
     * @constructor
     */
    protected toAny(content: Message, name: string): Any {
        const a: Any = new Any();
        a.pack(content.serializeBinary(), name);
        return a;
    }
}
