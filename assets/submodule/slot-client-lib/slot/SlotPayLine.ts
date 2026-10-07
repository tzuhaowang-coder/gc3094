import { _decorator, CCString, EventTouch, input, Input, Node, NodeEventType, Size, UITransform, v2, Vec2, view } from 'cc';
import { DEBUG } from 'cc/env';
import { audioPlay } from '../../game-client-lib/component/Audio';
import { TemplateGenerator } from '../../game-client-lib/component/TemplateGenerator';
import { ColLabel } from '../../game-client-lib/data/ColLabel';
import CommonUIData from '../../game-client-lib/ui/CommonUIData';
import { fixThousandthK, safeDiv, safeMul } from '../../game-client-lib/utils/Balance';
import { getPosition2, log, setNodeContentSize, vec3ToVec2, warn } from '../../game-client-lib/utils/Utils';
import { SymbolType } from '../protobuf/ProtobufWarp';
import SlotBase from './SlotBase';
import SlotPayLineNode from './SlotPayLineNode';
import SlotResultBase from './SlotResultBase';
import SymbolBase from './SymbolBase';

const { ccclass, property } = _decorator;

export interface SlotPayLineOdds {
    betBase: number;
    count: number;
    odds: number;
    wins: string;
}

@ccclass('SlotPayLineGroup')
export class SlotPayLineGroup {
    @property(SlotBase)
    slot: SlotBase = null;

    @property(SlotResultBase)
    slotResult: SlotResultBase = null;
}

@ccclass
export default class SlotPayLine extends TemplateGenerator {

    @property({ tooltip: '自定義可點擊範圍，否則預設全畫面' })
    rect: Size = new Size();

    @property(SlotBase)
    slot: SlotBase = null;

    @property(SlotResultBase)
    slotResult: SlotResultBase = null;

    @property({
        type: [SlotPayLineGroup],
        tooltip: '綁定多組 slot 及其對應的 slotResult',
    })
    slots: SlotPayLineGroup[] = [];

    @property(SlotPayLineNode)
    payLineNode: SlotPayLineNode = null;

    @property([CCString])
    audioNames: string[] = [];

    public data: CommonUIData = null;

    // tslint:disable-next-line:variable-name
    private _able: boolean = false;

    public get able(): boolean {
        return this._able;
    }

    public set able(able: boolean) {
        this._able = able;
        if (!able) {
            this.node.off(NodeEventType.TOUCH_START, this.onClick, this);
            this.revert();
        } else {
            this.node.on(NodeEventType.TOUCH_START, this.onClick, this);
        }
    }

    private symbol: string = '';
    private xy: Vec2 = null;
    private root: Node = null;
    private left: boolean = false;
    private currentGroup: SlotPayLineGroup = null;
    // tslint:disable-next-line:variable-name
    private _activeGroups: SlotPayLineGroup[] = null;

    public typeToNodeTplIdx: (type: string, x: number, y: number) => number = null;
    public xyShow: (x: number, y: number) => boolean = null;
    public typeToOdds: (type: string) => SlotPayLineOdds[] = null;
    public showFinish:(slotBase:SymbolBase, symbol: string, x: number, y: number, left: boolean) => void = null;
    public revetFinish:(slotBase:SymbolBase, symbol: string, x: number, y: number, left: boolean) => void = null;

    private loaded: boolean = false;

    private get activeGroups(): SlotPayLineGroup[] {
        if (this._activeGroups) {
            return this._activeGroups;
        }
        const list: SlotPayLineGroup[] = [];
        if (this.slots && this.slots.length > 0) {
            list.push(...this.slots);
        }
        if (this.slot) {
            const exists = list.some(g => g.slot === this.slot);
            if (!exists) {
                const group = new SlotPayLineGroup();
                group.slot = this.slot;
                group.slotResult = this.slotResult;
                list.push(group);
            }
        }
        this._activeGroups = list.filter(g => g.slot != null);
        return this._activeGroups;
    }

    onLoad(): void {
        super.onLoad();
        this.pre();
    }

    public pre() {
        if (this.loaded) {
            return;
        }
        this.loaded = true;
        // const size = getNodeContentSize(this.slot.node);
        const dr = view.getDesignResolutionSize();
        const customRect = (this.rect && this.rect.width > 0 && this.rect.height > 0);
        const rect = customRect ? this.rect : dr;
        setNodeContentSize(this.node, rect.width, rect.height);

        this.able = true;
        const touchNode = this.payLineNode.touchNode || this.payLineNode.node;
        touchNode.on(NodeEventType.TOUCH_START, (e: EventTouch) => {
            e.propagationStopped = true;
            audioPlay(this.audioNames[0]);
            this.revert();
        });

        this.data.registerCallback('rawTotalBet', () => {
            if (this.symbol && this.typeToOdds) {
                const left = this.left;
                const pln = this.payLineNode;
                const ln = left ? pln.rightNode : pln.leftNode;
                const tb = Number(this.data.rawTotalBet);
                const odds = this.typeToOdds(this.symbol).map((kv) => {
                    kv.wins = this.data.appendCurrencySymbol(fixThousandthK('' + safeDiv(safeMul(tb, kv.odds), kv.betBase)));
                    return kv;
                });
                const node = ln.children[0];
                if (node) {
                    this.refreshOdds(node, odds);
                }
            }
        });
    }

    onClick(e: EventTouch) {
        if (!this.able) {
            return;
        }

        const uil = e.touch.getUILocation();
        const groups = this.activeGroups;

        for (const group of groups) {
            const slot = group.slot;
            if (!slot) {
                continue;
            }
            const reels = slot.reels;
            if (!reels) {
                continue;
            }
            for (let x = 0; x < reels.length; x += 1) {
                const reel = reels[x];
                for (let y = 0; y < reel.length + 2; y += 1) {
                    if (y === 0 || y === reel.length + 1) {
                        continue;
                    }
                    const s = reel.getSymbol(y);
                    if (!s) {
                        continue;
                    }
                    const uit = s.getComponent(UITransform);
                    if (!uit) {
                        continue;
                    }
                    const box = uit.getBoundingBoxToWorld();

                    if (box.contains(uil)) {
                        const xx = s.symbol === '' + SymbolType.XX;
                        if (xx) {
                            this.revert();
                            groups.forEach(g => g.slotResult?.clearAll());
                            return;
                        }
                        if (this.xyShow && !this.xyShow(x, y)) {
                            this.revert();
                            groups.forEach(g => g.slotResult?.clearAll());
                            return;
                        }
                        this.show(x, y, group);
                        audioPlay(this.audioNames[0]);
                        log('SlotPayLine onClick', x, y);
                        return;
                    }
                }
            }
        }
        this.revert();
    }

    public show(x: number, y: number, targetGroup?: SlotPayLineGroup): void {
        log('SlotPayLine show', x, y);
        this.revert();

        const groups = this.activeGroups;
        groups.forEach(g => g.slotResult?.clearAll());

        const group = targetGroup || groups[0];
        if (!group || !group.slot) {
            warn('SlotPayLine show: no slot available');
            return;
        }

        this.currentGroup = group;

        const pln = this.payLineNode;
        const slot = group.slot;

        pln.node.active = true;

        const s = slot.reels[x].getSymbol(y);
        const root = s.node.parent;
        const l = slot.reels.length;
        const tb = Number(this.data.rawTotalBet);
        const odds = this.typeToOdds(s.symbol).map((kv) => {
            kv.wins = this.data.appendCurrencySymbol(fixThousandthK('' + safeDiv(safeMul(tb, kv.odds), kv.betBase)));
            return kv;
        });
        const idx = this.typeToNodeTplIdx ? this.typeToNodeTplIdx(s.symbol, x, y) : -1;

        const left = x < l / 2;
        const sn = left ? pln.leftNode : pln.rightNode;
        const ln = left ? pln.rightNode : pln.leftNode;

        if (sn.parent === ln.parent && ln.parent.children.length === 2) {
            sn.setSiblingIndex(0);
            ln.setSiblingIndex(1);
        }

        const parent = pln.node.parent;
        const p = getPosition2(s.node, vec3ToVec2(sn.getPosition().negative()), parent);
        pln.node.setPosition(p);

        s.node.setParent(sn);
        s.node.setPosition(0, 0, 0);

        if (idx === -1) {
            pln.layoutNode.setParent(ln);
            pln.layoutNode.setPosition(0, 0, 0);
            this.refreshOdds(pln.layoutNode, odds);
        } else {
            const node = this.getNode(idx);
            pln.layoutNode.removeFromParent();
            node.setParent(ln);
            node.setPosition(0, 0, 0);
            this.refreshOdds(node, odds);
        }

        this.symbol = s.symbol;
        this.xy = v2(x, y);
        this.root = root;
        this.left = left;

        this.showFinish?.(s, s.symbol, x, y, left);

        // 註冊全局點擊監聽以支援點擊外部關閉
        input.on(Input.EventType.TOUCH_START, this.onGlobalTouch, this);
    }

    public revert() {
        // 移除全局點擊監聽
        input.off(Input.EventType.TOUCH_START, this.onGlobalTouch, this);

        const pln = this.payLineNode;
        pln.node.active = false;
        const left = this.left;
        const ln = left ? pln.rightNode : pln.leftNode;
        const node = ln.children[0];
        if (node && pln.layoutNode !== node) {
            this.recycleNode(ln.children[0], -1);
        }
        if (!this.xy) {
            return;
        }
        const group = this.currentGroup;
        if (!group || !group.slot) {
            return;
        }
        const slot = group.slot;
        const x = this.xy.x;
        const y = this.xy.y;
        const r = slot.reels[x];
        const s = r.getSymbol(y);
        const symbol = s.symbol;
        s.node.setParent(this.root);
        this.xy = null;
        this.root = null;
        this.left = false;
        this.currentGroup = null;

        this.revetFinish?.(s, symbol, x, y, left);
    }

    private refreshOdds(node: Node, odds: SlotPayLineOdds[]) {
        if (!node) {
            debugger;
            return;
        }
        const pln = this.payLineNode;
        const ln = pln.layoutNode;
        if (node === ln) {
            let l = ln.children.length;
            while (l) {
                pln.recycleNode(ln.children[0]);
                l -= 1;
            }
            odds.sort((a, b) => b.count - a.count);
            odds.forEach((o) => {
                const node = pln.getNode();
                const cols = node.getComponentsInChildren(ColLabel);
                cols.forEach((c, i) => {
                    if (c.colKey === 'count') {
                        c.reset('' + o.count);
                    } else if (c.colKey === 'wins') {
                        c.reset('' + o.wins);
                    } else if (c.colKey === 'odds') {
                        c.reset('' + o.odds);
                    } else if (i === 0) {
                        c.reset('' + o.count);
                    } else if (i === 1) {
                        c.reset('' + o.wins);
                    }
                });
                ln.addChild(node);
            });
        } else {
            if (DEBUG) {
                warn('Not supported');
            }
        }
    }

    onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onGlobalTouch, this);
    }

    private onGlobalTouch(e: EventTouch) {
        if (!this.able || !this.xy) {
            return;
        }

        const uil = e.touch.getUILocation();
        const groups = this.activeGroups;
        for (const group of groups) {
            const slot = group.slot;
            if (!slot) {
                continue;
            }
            const reels = slot.reels;
            if (!reels) {
                continue;
            }
            for (let x = 0; x < reels.length; x += 1) {
                const reel = reels[x];
                for (let y = 0; y < reel.length + 2; y += 1) {
                    if (y === 0 || y === reel.length + 1) {
                        continue;
                    }
                    const s = reel.getSymbol(y);
                    if (!s) {
                        continue;
                    }
                    const uit = s.getComponent(UITransform);
                    if (!uit) {
                        continue;
                    }
                    const box = uit.getBoundingBoxToWorld();

                    if (box.contains(uil)) {
                        // 點擊在任何一個 Slot 的 Symbol 內，交給 onClick 處理，此處不 revert
                        return;
                    }
                }
            }
        }
        this.revert();
    }

}
