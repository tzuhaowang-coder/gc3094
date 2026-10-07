import { Observable } from '../../game-client-lib/protobuf/GrpcWarp';
import MemberServiceBase from '../../game-client-lib/protobuf/MemberServiceBase';
import { Any, Empty, Game, PacketReq, PacketType } from '../../game-client-lib/protobuf/ProtobufWarp';
import { InMachineRes, SpinReq, SpinRes } from './ProtobufWarp';

export enum GameServiceKey {
    InMachineRes = 'messages.InMachineRes',
    SpinRes = 'messages.SpinRes',
}

export default class GameService extends MemberServiceBase {

    /**
     * spin
     * @param spinData
     * @returns {Observable<[string, SpinRes]>}
     */
    streamSpin(spinReq: SpinReq): Observable<[string, SpinRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(spinReq, 'messages.SpinReq'));
        return this.callStreamingAPI<[string, SpinRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }
    /**
     * 命中魚
     * @param hit
     * @returns {Observable<HitRes>}
     */
    streamMachineInfo(): Observable<[string, InMachineRes]> {
        const packet: PacketReq = new PacketReq();
        packet.setIndex(this.generatePacketIndex());
        packet.setType(PacketType.CONTENT);
        packet.setContent(this.toAny(new Empty(), 'messages.InMachineReq'));
        return this.callStreamingAPI<[string, InMachineRes]>(Game.Streaming, packet, true, this.respondPacketProcessor);
    }

    /**
     * any轉回物件
     * @param content
     */
    protected doParseContent(content: Any): any {
        let obj: any;
        switch (content.getTypeName()) {
        case GameServiceKey.InMachineRes:
            obj = content.unpack(InMachineRes.deserializeBinary, content.getTypeName());
            break;
        case GameServiceKey.SpinRes:
            obj = content.unpack(SpinRes.deserializeBinary, content.getTypeName());
            break;
        }
        return obj;
    }
}
