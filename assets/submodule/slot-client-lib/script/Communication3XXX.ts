
import { _decorator } from 'cc';
import { Observer, tap } from '../../game-client-lib/protobuf/GrpcWarp';
import { MsgCode } from '../../game-client-lib/protobuf/ProtobufWarp';
import CommunicationBase from '../../game-client-lib/script/CommunicationBase';
import { log } from '../../game-client-lib/utils/Utils';
import GameService, { GameServiceKey } from '../protobuf/GameService';
import { SpinData, SpinReq } from '../protobuf/ProtobufWarp';
import MainBase from './MainBase';

const { ccclass } = _decorator;

@ccclass
export default abstract class Communication3XXX extends CommunicationBase {

    main: MainBase;

    // 遊戲服務
    private gameService: GameService = null;

    public getGameService(): GameService {
        if (!this.gameService) {
            this.gameService = new GameService(this.getGameServer(), this.main.token);
        }
        return this.gameService;
    }

    public setupStream(token?: string) {
        const service = this.getGameService();
        service.observer = this.streamObserver;
        // log('rpc setupStream update now', this.now);
        // this.now = Date.now();
    }

    /**
     * 重新設定server位置
     * */
    public resetServerHost(host: string) {
        this.gameService = new GameService(host, this.main.token);
    }

    protected toggleLoading(able: boolean) {
        if (this.main) {
            this.main.toggleLoading(able);
        }
    }

    public requestMachineInfo(quietly: boolean = false, next: Function = null) {
        if (!quietly) {
            this.toggleLoading(true);
        }
        log('comm2.requestMachineInfo');
        return this.getGameService().streamMachineInfo().pipe(
            tap(([s, r]) => {
                if (!quietly) {
                    this.toggleLoading(false);
                } else {
                    log('InMachineRes quietly', r.toObject());
                }
                if (r.getResult().getCode() === MsgCode.SUCCESS) {
                    next?.();
                }
            }),
        ).subscribe(quietly ? this.streamErrorObserver : this.streamObserver);
    }

    public requestSpin(spinData: SpinData, observer?: Observer<any>) {
        if (!this.requestBetOk) {
            return;
        }
        // 帶 observer 的呼叫端（monkey 壓測）回應不經 observerNext，解不了閘門，因此不上鎖
        if (!observer && !this.beginRequest(GameServiceKey.SpinRes)) {
            return;
        }
        const req = new SpinReq();
        req.setSpinData(spinData);
        return this.getGameService().streamSpin(req).subscribe(observer || this.observer);
    }
}
