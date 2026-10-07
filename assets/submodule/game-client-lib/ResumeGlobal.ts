
import { director, Node, Widget } from 'cc';
import { DEBUG } from 'cc/env';
import { getBonusIdle, getGameIdle } from './BonusEventGlobal';
import { translateError } from './I18nGlobal';
import { ILobby, IMain } from './LibGlobal';
import { EXTRA_1110, getDebugParams, IS_GUEST } from './ParamsGlobal';
import { isOffline, isTryResume } from './data/LoginState';
import { IComm } from './script/CommunicationBase';
import { requestAnimationFrameUpdate } from './script/PromiseManager';
import { log, sumReducer } from './utils/Utils';

function mainUpdateAlignment(main: IMain) {
    const each = (node: Node) => {
        [node.getComponent(Widget)].concat(node.getComponentsInChildren(Widget)).forEach(w => w && w.updateAlignment());
    };
    const a = main.getAlert();
    const l = main.getLoading();
    const t = main.getToast();

    each(a.node);
    each(l.node);
    each(t.node);

    const acf = a.colFade;
    if (acf) {
        requestAnimationFrameUpdate(1, (dt) => {
            acf.update(dt);
        });
    }
}

// function onLine() {
//     window.navigator.onLine;
//     window.addEventListener('online', () => console.log('online'));
//     window.addEventListener('offline', () => console.log('offline'));
// }

let resumeCloseTicks = [0.5, 1, 1.5, 2, 2, 2, 2].map(n => n * 10);
let resumeMaxTick = resumeCloseTicks.reduce(sumReducer, 0);

export function resumeTick(main: IMain, comm: IComm, lobby: ILobby, resumePause: boolean = false) {
    // let str: (str: string) => void = noop;
    // if (DEBUG) {
    //     const name = 'resumeTickDebugNode';
    //     const parent = director.getScene();
    //     let label: Label;
    //     let node = parent.getChildByName(name);
    //     if (!node) {
    //         node = new Node(name);
    //         const p = director.getScene();
    //         const pos = p.children[1].getPosition();
    //         p.addChild(node);
    //         node.setPosition(pos);
    //         label = node.addComponent(Label);
    //     } else {
    //         label = node.getComponent(Label);
    //     }
    //     str = (str) => {
    //         return;
    //         label.string = str;
    //     };
    // }

    if (DEBUG) {
        const rp = getDebugParams('resumePause');
        if (rp) {
            resumePause = Boolean(Number(rp));
        }
        const rct = getDebugParams('resumeCloseTicks');
        if (rct) {
            resumeCloseTicks = rct.split(',').map(s => Number(s));
            resumeMaxTick = resumeCloseTicks.reduce(sumReducer, 0);
        }
    }

    const tryResume = isTryResume(comm.loginState);
    let offline = isOffline(comm.loginState, true);
    let idle = (getGameIdle() && getBonusIdle()) || lobby.requesting || lobby.stepping;
    if (tryResume) {
        if (IS_GUEST) {
            main.offline(translateError('NETWORK.sys_disconnected', -1), -1);
            offline = true;
        } else {
            if (comm.resumeTick === -1) {
                comm.resumeTick = 0;
            }
            if (resumePause) {
                director.pause();
                idle = true;
            }
            main.resume2();
            if (comm.resumeTick === 0) {
                comm.closeWebsocket();
                comm.resumeRequesting = false;
            } else {
                let idx = 0;
                let tick = 0;
                for (let i = 0; i < resumeCloseTicks.length; i += 1) {
                    tick += resumeCloseTicks[i];
                    if (comm.resumeTick <= tick) {
                        idx = i;
                        break;
                    }
                }
                if (!comm.serviceOk && (comm.requestTick >= resumeCloseTicks[idx])) {
                    log('resumeTick close', idx, comm.requestTick, resumeCloseTicks[idx]);
                    comm.closeWebsocket();
                    comm.resumeRequesting = false;
                }
            }
            if (comm.resumeTick >= resumeMaxTick) {
                director.resume();
                if (EXTRA_1110) {
                    main.offline(translateError('NETWORK.sys_net_error2', -1), -1, false);
                } else {
                    main.offline(translateError('NETWORK.sys_disconnected', -1), -1, true);
                }
            } else {
                if (!comm.resumeRequesting) {
                    comm.resumeRequesting = true;
                    comm.requestResumeReq();
                    comm.requestTick = 0;
                }
            }
        }
        comm.requestTick += 1;
        comm.resumeTick += 1;
    } else {
        comm.resumeTick = -1;
    }

    if (idle) {
        if (offline) {
            main.offline2();
        } else if (tryResume) {
            main.resume2(Math.floor(Date.now() / 1e3) % 3 + 1);
            if (resumePause) {
                mainUpdateAlignment(main);
            }
        } else {
            director.resume();
        }
    }
}
