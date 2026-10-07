import { _decorator } from 'cc';
import { htmlControlShowToast } from '../../game-client-lib/HtmlControlGlobal';
import { translateError } from '../../game-client-lib/I18nGlobal';
import { I18nLabel } from '../../game-client-lib/component/I18nLabel';
import { MsgCode } from '../../game-client-lib/protobuf/ProtobufWarp';
import CommonUISlot from '../../game-client-lib/ui/CommonUISlot';
import { balanceSubNumber } from '../../game-client-lib/utils/Balance';
import LobbyBase, { DO_SPIN_STAT } from '../script/LobbyBase';
import PuzzleBase from './PuzzleBase';
import PuzzleResultBase from './PuzzleResultBase';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class PuzzleLobbyBase extends LobbyBase {

    @property({
        type: PuzzleBase,
        override: true,
    })
    slot: PuzzleBase = null;

    @property({
        type: PuzzleResultBase,
        override: true,
    })
    slotResult: PuzzleResultBase = null;

    puzzle: PuzzleBase;

    puzzleResult: PuzzleResultBase;

    onLoad() {
        super.onLoad();
        this.puzzle = this.slot;
        this.puzzleResult = this.slotResult;

        this.ui.commonUIManager.commonUINodes.forEach((node) => {
            const cui = node.getComponent(CommonUISlot);
            cui.getNodesByI18nKey('COMMONUI.reel_speed').forEach((n) => {
                const l = n.getComponent(I18nLabel);
                l.dataID = 'COMMONUI.puzzle_speed';
            });
        });
    }

    onSpin(featureBuy: string = '') {
        // 守門在狀態變更之前（同 SlotLobbyBase#onSpin）
        if (this.comm.isRequestPending()) {
            return;
        }
        const spinData = this.createSpinData(featureBuy);
        // 余额不足提示
        if (balanceSubNumber(this.commonUIData.rawBalance, spinData.getTotalbet()) < 0) {
            htmlControlShowToast(translateError('GAME.sysm_if_bal', -MsgCode.GAME_AMOUNT_NOT_ENOUGH));
            // 清 autoRound
            this.updateAutoRound(0);
            this.uiBetable(true);
            this.spinEffect(false);
            this.doSpin(DO_SPIN_STAT.FAIL_IF_BALANCE);
            return;
        }
        this.spinEffect(true);
        this.doSpin(DO_SPIN_STAT.BUTTON_AUDIO);
        this.spinData = spinData;
        this.spinRes = null;
        this.comm.requestSpin(spinData);
        this.lastSpinAt = Date.now();
        if (this.spinResult) {
            this.lastSpinResultRoundId = this.spinResult.getRoundId();
        }

        // 开始转
        // this.reset();
        // 清贏分
        this.updateWins(0);
        this.uiBetable(false);
        this.updateSkip(false); // 先不给停

        this.slot.clear();

        this.doSpin(DO_SPIN_STAT.REQUEST);
    }

    onStop() {
        if (this.promiseManager && this.promiseManager.skippable && this.promiseManager.skippable()) {
            this.promiseManager.skip();
            return;
        }
    }
}
