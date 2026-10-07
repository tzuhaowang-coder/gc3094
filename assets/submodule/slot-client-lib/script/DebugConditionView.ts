import { _decorator, BlockInputEvents, builtinResMgr, Button, Color, color, Component, EventHandler, EventTouch, Graphics, Label, Layers, Layout, Mask, Node, Rect, ScrollBar, ScrollView, Size, Sprite, SpriteFrame, Texture2D, view, Widget } from 'cc';
import { setNodeAnchor, setNodeContentSize, setNodeHeight, setNodePosition, setNodeScale, setNodeWidth } from '../../game-client-lib/utils/Utils';
import LobbyBase, { DebugCondition, debugUniqueKey } from './LobbyBase';

const { ccclass, property } = _decorator;

const CLASS_NAME = 'DebugConditionView';

// 版型常數
const CARD_W = 760;        // 卡片寬
const TITLE_H = 90;        // 標題列高
const TAB_H = 76;          // 分組 tab 列高
const TAB_INNER_H = 60;    // tab 按鈕高（tab 列內留白後）
const ROW_H = 96;          // 每列高
const SCROLLBAR_W = 16;    // 滾動條寬
const MIN_HANDLE_H = 48;   // 拉桿最小高度
const TAB_SPACING = 8;     // tab 間距
const TAB_PADDING = 12;    // tab 列左右留白

// 配色（全部用 Graphics 畫，不依賴任何貼圖）
const BACKDROP_COLOR = color(255, 255, 255, 60);     // 半透明背景（淡透白）
const CARD_COLOR = color(24, 26, 34, 255);           // 卡片底
const TITLE_COLOR = color(48, 90, 160, 255);         // 標題列
const CLOSE_COLOR = color(176, 60, 60, 255);         // 關閉鈕
const ROW_EVEN_COLOR = color(46, 48, 58, 255);       // 偶數列
const ROW_ODD_COLOR = color(34, 36, 44, 255);        // 奇數列
const ROW_PRESSED_COLOR = color(70, 110, 170, 255);  // 按下
const SCROLLBAR_BG_COLOR = color(120, 130, 150, 255);
const SCROLLBAR_HANDLE_COLOR = color(255, 255, 255, 40);
const TAB_ACTIVE_COLOR = color(48, 90, 160, 255);    // 選中分組（同標題藍）
const TAB_INACTIVE_COLOR = color(40, 42, 52, 255);   // 未選中分組

@ccclass
export default class DebugConditionView extends Component {

    public lobby: LobbyBase;

    private modalNode: Node;

    // 分頁相關
    private conditions: DebugCondition[] = [];
    private groups: { group: number; items: DebugCondition[] }[] = [];
    private activeGroup: number = 0;
    private innerW: number = 0;
    private tabWidth: number = 0;
    private scrollView: ScrollView;
    private contentNode: Node;
    private contentLayout: Layout;
    private tabButtons: { group: number; node: Node }[] = [];

    /**
     * 依 group 編號將 debug 條件分組：未填歸 0、依編號升冪排序、組內維持原順序。
     */
    private static groupDebugConditions(conditions: DebugCondition[]): { group: number; items: DebugCondition[] }[] {
        const map = new Map<number, DebugCondition[]>();
        for (const cond of conditions) {
            const g = cond.group ?? 0;
            const items = map.get(g) ?? [];
            items.push(cond);
            map.set(g, items);
        }
        return Array.from(map.keys())
            .sort((a, b) => a - b)
            .map(group => ({ group, items: map.get(group)! }));
    }

    start(): void {
        // 右上角開關按鈕
        this.createToggleButton();

        // 依 group 分組（未填歸 0、升冪排序），決定有哪些分頁
        this.conditions = this.lobby.getDebugConditions();
        this.groups = DebugConditionView.groupDebugConditions(this.conditions);
        this.activeGroup = this.groups.length > 0 ? this.groups[0].group : 0;

        // 半透明背景 + 居中卡片（預設關閉，點 debug 才開）
        const visibleSize = view.getVisibleSize();
        const scrollH = Math.max(ROW_H * 2, visibleSize.height * 0.95 - TITLE_H - TAB_H);

        const modalNode = new Node('debugModal');
        modalNode.layer = Layers.Enum.UI_2D;
        modalNode.active = false;
        this.node.addChild(modalNode);
        this.modalNode = modalNode;

        // 背景遮罩：淡透白，擋住底下輸入，點空白處關閉
        const backdrop = new Node('backdrop');
        backdrop.layer = Layers.Enum.UI_2D;
        const backdropW = visibleSize.width * 1.5;
        const backdropH = visibleSize.height * 1.5;
        setNodeContentSize(backdrop, backdropW, backdropH);
        this.fillRect(backdrop, backdropW, backdropH, BACKDROP_COLOR);
        backdrop.addComponent(BlockInputEvents);
        const backdropButton = backdrop.addComponent(Button);
        backdropButton.target = backdrop;
        backdropButton.transition = Button.Transition.NONE;
        backdropButton.clickEvents.push(this.makeHandler('onCloseClick'));
        modalNode.addChild(backdrop);

        // 卡片：標題列 + 分組 tab + 滾動區（子節點皆手動定位）
        const cardH = TITLE_H + TAB_H + scrollH;
        const card = new Node('card');
        card.layer = Layers.Enum.UI_2D;
        setNodeContentSize(card, CARD_W, cardH);
        this.fillRect(card, CARD_W, cardH, CARD_COLOR);
        modalNode.addChild(card);

        // 標題列
        this.createTitleBar(card, cardH);

        // 分組 tab 列（標題列下方）
        this.createTabBar(card, cardH);

        // 滾動區（tab 列下方）
        this.createScrollView(card, scrollH, cardH);

        // 初次填入目前分組的列，並標記選中的 tab
        this.buildRows(this.activeGroup);
        this.updateTabHighlight();

        // 卡片若比螢幕寬就整體等比縮放，避免最右緣的 scroll bar 超出畫面
        const cardScale = Math.min(1, (visibleSize.width * 0.92) / CARD_W);
        setNodeScale(card, cardScale, cardScale);
    }

    /**
     * 在 node 上用 Graphics 畫一個以中心為錨點的純色矩形（沒有就建立，有就重畫）。
     */
    private fillRect(node: Node, w: number, h: number, c: Color): Graphics {
        const g = node.getComponent(Graphics) || node.addComponent(Graphics);
        g.clear();
        g.fillColor = c;
        g.rect(-w / 2, -h / 2, w, h);
        g.fill();
        return g;
    }

    private makeHandler(handlerName: string, customEventData?: string): EventHandler {
        const handler = new Component.EventHandler();
        handler.component = CLASS_NAME;
        handler.target = this.node;
        handler.handler = handlerName;
        if (customEventData != null) {
            handler.customEventData = customEventData;
        }
        return handler;
    }

    private createToggleButton(): void {
        const buttonNode = new Node('debugButton');
        buttonNode.layer = Layers.Enum.UI_2D;
        setNodeWidth(buttonNode, 100);
        setNodeHeight(buttonNode, 100);
        this.fillRect(buttonNode, 100, 100, TITLE_COLOR);

        const labelNode = new Node();
        labelNode.layer = Layers.Enum.UI_2D;
        setNodeWidth(labelNode, 90);
        setNodeHeight(labelNode, 90);
        const l = labelNode.addComponent(Label);
        l.overflow = Label.Overflow.SHRINK;
        l.string = 'debug';
        l.enableWrapText = false;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.verticalAlign = Label.VerticalAlign.CENTER;
        buttonNode.addChild(labelNode);

        const button = buttonNode.addComponent(Button);
        button.target = buttonNode;
        button.transition = Button.Transition.SCALE;
        button.clickEvents.push(this.makeHandler('onToggleClick'));

        const w = buttonNode.addComponent(Widget);
        w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        w.isAlignTop = true;
        w.isAlignRight = true;
        w.top = 10;
        w.right = 10;

        this.node.addChild(buttonNode);
    }

    private createTitleBar(card: Node, cardH: number): void {
        const titleBar = new Node('titleBar');
        titleBar.layer = Layers.Enum.UI_2D;
        setNodeContentSize(titleBar, CARD_W, TITLE_H);
        this.fillRect(titleBar, CARD_W, TITLE_H, TITLE_COLOR);
        // 卡片無 Layout，手動把標題列放最上方
        setNodePosition(titleBar, 0, cardH / 2 - TITLE_H / 2);
        card.addChild(titleBar);

        // 標題文字（靠左）
        const titleLabelNode = new Node('title');
        titleLabelNode.layer = Layers.Enum.UI_2D;
        setNodeAnchor(titleLabelNode, 0, 0.5);
        setNodeContentSize(titleLabelNode, CARD_W - 140, TITLE_H);
        setNodePosition(titleLabelNode, -CARD_W / 2 + 28, 0);
        const titleLabel = titleLabelNode.addComponent(Label);
        titleLabel.fontSize = 40;
        titleLabel.lineHeight = 44;
        titleLabel.overflow = Label.Overflow.SHRINK;
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        titleLabel.fontFamily = 'Microsoft JhengHei';
        titleLabel.string = 'Debug 列表';
        titleBar.addChild(titleLabelNode);

        // 關閉按鈕（靠右）
        const closeNode = new Node('close');
        closeNode.layer = Layers.Enum.UI_2D;
        setNodeContentSize(closeNode, 64, 64);
        this.fillRect(closeNode, 64, 64, CLOSE_COLOR);
        setNodePosition(closeNode, CARD_W / 2 - 44, 0);
        const closeLabelNode = new Node();
        closeLabelNode.layer = Layers.Enum.UI_2D;
        setNodeContentSize(closeLabelNode, 60, 60);
        const closeLabel = closeLabelNode.addComponent(Label);
        closeLabel.fontSize = 40;
        closeLabel.overflow = Label.Overflow.SHRINK;
        closeLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        closeLabel.verticalAlign = Label.VerticalAlign.CENTER;
        closeLabel.string = '✕';
        closeNode.addChild(closeLabelNode);
        const closeButton = closeNode.addComponent(Button);
        closeButton.target = closeNode;
        closeButton.transition = Button.Transition.SCALE;
        closeButton.clickEvents.push(this.makeHandler('onCloseClick'));
        titleBar.addChild(closeNode);
    }

    private createScrollView(card: Node, scrollH: number, cardH: number): void {
        // 列表用全卡寬，捲軸半透明浮在最右側（覆蓋內容右緣），view 不需補償位移
        const innerW = CARD_W;
        this.innerW = innerW;

        const scrollNode = new Node('scroll');
        scrollNode.layer = Layers.Enum.UI_2D;
        setNodeContentSize(scrollNode, CARD_W, scrollH);
        // 卡片無 Layout，手動把滾動區放 tab 列下方
        setNodePosition(scrollNode, 0, cardH / 2 - TITLE_H - TAB_H - scrollH / 2);
        const scrollView = scrollNode.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        card.addChild(scrollNode);
        this.scrollView = scrollView;

        // 可視區（Mask 裁切）
        const viewPort = new Node('view');
        viewPort.layer = Layers.Enum.UI_2D;
        setNodeContentSize(viewPort, innerW, scrollH);
        setNodePosition(viewPort, 0, 0);
        viewPort.addComponent(Mask);
        scrollNode.addChild(viewPort);

        // 內容（垂直 Layout，高度依列數自動撐開）；實際的列由 buildRows 依分組填入
        const content = new Node('content');
        content.layer = Layers.Enum.UI_2D;
        setNodeAnchor(content, 0.5, 1);
        setNodeContentSize(content, innerW, 0);
        setNodePosition(content, 0, scrollH / 2);
        const layout = content.addComponent(Layout);
        layout.type = Layout.Type.VERTICAL;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;
        layout.spacingY = 4;
        layout.paddingTop = 4;
        layout.paddingBottom = 4;
        viewPort.addChild(content);
        scrollView.content = content;
        this.contentNode = content;
        this.contentLayout = layout;

        // 滾動條（引擎 ScrollBar + 內建白圖，非 pic_info_bg）
        const whiteFrame = this.getWhiteFrame();

        const scrollBarNode = new Node('scrollbar');
        scrollBarNode.layer = Layers.Enum.UI_2D;
        const barBg = scrollBarNode.addComponent(Sprite);
        barBg.sizeMode = Sprite.SizeMode.CUSTOM;
        barBg.spriteFrame = whiteFrame;
        barBg.color = SCROLLBAR_BG_COLOR;
        setNodeContentSize(scrollBarNode, SCROLLBAR_W, scrollH);
        setNodePosition(scrollBarNode, CARD_W / 2 - SCROLLBAR_W / 2, 0);
        scrollNode.addChild(scrollBarNode);

        const handleNode = new Node('handle');
        handleNode.layer = Layers.Enum.UI_2D;
        const handleSprite = handleNode.addComponent(Sprite);
        handleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        handleSprite.spriteFrame = whiteFrame;
        handleSprite.color = SCROLLBAR_HANDLE_COLOR;
        setNodeContentSize(handleNode, SCROLLBAR_W, MIN_HANDLE_H);
        scrollBarNode.addChild(handleNode);

        const scrollBar = scrollBarNode.addComponent(ScrollBar);
        scrollBar.handle = handleSprite;
        scrollBar.direction = ScrollBar.Direction.VERTICAL;
        scrollBar.enableAutoHide = false;

        // 指派 verticalScrollBar；實際列由 buildRows 填入並 updateLayout，拉桿長度屆時更新
        scrollView.verticalScrollBar = scrollBar;
    }

    /**
     * 分組 tab 列：每個 group 一個按鈕，點擊切換目前顯示的分組。
     */
    private createTabBar(card: Node, cardH: number): void {
        const tabBar = new Node('tabBar');
        tabBar.layer = Layers.Enum.UI_2D;
        setNodeContentSize(tabBar, CARD_W, TAB_H);
        this.fillRect(tabBar, CARD_W, TAB_H, CARD_COLOR);
        // 卡片無 Layout，手動把 tab 列放標題列下方
        setNodePosition(tabBar, 0, cardH / 2 - TITLE_H - TAB_H / 2);
        card.addChild(tabBar);

        // 平分寬度（含間距與左右留白），讓所有 tab 盡量塞進卡片
        const n = Math.max(1, this.groups.length);
        this.tabWidth = (CARD_W - TAB_PADDING * 2 - TAB_SPACING * (n - 1)) / n;

        this.tabButtons = [];
        this.groups.forEach(({ group }, i) => {
            const tab = new Node('tab');
            tab.layer = Layers.Enum.UI_2D;
            setNodeContentSize(tab, this.tabWidth, TAB_INNER_H);
            // 手動水平排列（tab 列不掛 Layout，避免影響卡片其他手動定位的子節點）
            const x = -CARD_W / 2 + TAB_PADDING + this.tabWidth / 2 + i * (this.tabWidth + TAB_SPACING);
            setNodePosition(tab, x, 0);
            this.fillRect(tab, this.tabWidth, TAB_INNER_H, TAB_INACTIVE_COLOR);

            const labelNode = new Node('label');
            labelNode.layer = Layers.Enum.UI_2D;
            setNodeContentSize(labelNode, this.tabWidth - 12, TAB_INNER_H);
            const label = labelNode.addComponent(Label);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.overflow = Label.Overflow.SHRINK;
            label.fontSize = 30;
            label.lineHeight = 34;
            label.fontFamily = 'Microsoft JhengHei';
            label.string = `分組 ${group}`;
            tab.addChild(labelNode);

            const button = tab.addComponent(Button);
            button.target = tab;
            button.transition = Button.Transition.NONE;
            button.clickEvents.push(this.makeHandler('onTabClick', String(group)));
            tabBar.addChild(tab);

            this.tabButtons.push({ group, node: tab });
        });
    }

    /**
     * 清掉現有列，重建指定分組的列，並把捲軸捲回頂端。
     */
    private buildRows(group: number): void {
        const content = this.contentNode;
        content.removeAllChildren();

        const innerW = this.innerW;
        const found = this.groups.find(g => g.group === group);
        const items = found ? found.items : [];
        items.forEach((cond, i) => {
            const row = new Node('row');
            row.layer = Layers.Enum.UI_2D;
            setNodeContentSize(row, innerW, ROW_H);
            const baseColor = (i % 2 === 0) ? ROW_EVEN_COLOR : ROW_ODD_COLOR;
            this.fillRect(row, innerW, ROW_H, baseColor);

            // 點擊：Button 負責 click 語意；顏色回饋用 touch 事件重畫 Graphics
            const button = row.addComponent(Button);
            button.target = row;
            button.transition = Button.Transition.NONE;
            // 用分頁內互不干涉的唯一 key 當點擊資料，避免同 key 列彼此干涉
            const uniqueKey = debugUniqueKey(this.conditions, this.conditions.indexOf(cond));
            button.clickEvents.push(this.makeHandler('onConditionClick', uniqueKey));
            row.on(Node.EventType.TOUCH_START, () => this.fillRect(row, innerW, ROW_H, ROW_PRESSED_COLOR));
            row.on(Node.EventType.TOUCH_END, () => this.fillRect(row, innerW, ROW_H, baseColor));
            row.on(Node.EventType.TOUCH_CANCEL, () => this.fillRect(row, innerW, ROW_H, baseColor));

            const labelNode = new Node('label');
            labelNode.layer = Layers.Enum.UI_2D;
            setNodeAnchor(labelNode, 0, 0.5);
            setNodeContentSize(labelNode, innerW - 48, ROW_H);
            setNodePosition(labelNode, -innerW / 2 + 24, 0);
            const label = labelNode.addComponent(Label);
            label.horizontalAlign = Label.HorizontalAlign.LEFT;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.overflow = Label.Overflow.SHRINK;
            label.fontSize = 34;
            label.lineHeight = 38;
            label.fontFamily = 'Microsoft JhengHei';
            label.string = `${cond.key} - ${(cond.pako || cond.pako2) ? '(pako)' : ''}${cond.msg}`;
            row.addChild(labelNode);

            content.addChild(row);
        });

        // 重算 content 真實高度，拉桿長度與捲動範圍才正確
        this.contentLayout.updateLayout();
        this.scrollView.scrollToTop(0);
    }

    /**
     * 依目前選中的分組，重畫每個 tab 的底色。
     */
    private updateTabHighlight(): void {
        this.tabButtons.forEach(({ group, node }) => {
            const c = group === this.activeGroup ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;
            this.fillRect(node, this.tabWidth, TAB_INNER_H, c);
        });
    }

    onTabClick(event: EventTouch, data: string): void {
        const group = Number(data);
        if (group === this.activeGroup) {
            return;
        }
        this.activeGroup = group;
        this.buildRows(group);
        this.updateTabHighlight();
    }

    /**
     * 取得引擎內建白色 SpriteFrame（不依賴 pic_info_bg），用來當純色色塊底圖。
     */
    private getWhiteFrame(): SpriteFrame {
        const whiteTex = builtinResMgr.get<Texture2D>('white-texture');
        const frame = new SpriteFrame();
        frame.texture = whiteTex;
        frame.rect = new Rect(0, 0, whiteTex.width, whiteTex.height);
        frame.originalSize = new Size(whiteTex.width, whiteTex.height);
        // 不進動態合圖，避免對程式生成貼圖呼叫 texSubImage2D 觸發 WebGL 錯誤
        frame.packable = false;
        return frame;
    }

    onConditionClick(event: EventTouch, data: string): void {
        const lobby = this.lobby;
        // @ts-ignore
        if (!lobby.isIdle) {
            return;
        }
        lobby.debug = data;
        lobby.onSpinClick();
        this.onCloseClick();
    }

    onOpenClick() {
        this.modalNode.active = true;
    }

    onCloseClick() {
        this.modalNode.active = false;
    }

    onToggleClick() {
        this.modalNode.active = !this.modalNode.active;
    }
}
