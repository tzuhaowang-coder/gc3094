import { _decorator, Component, PageView } from 'cc';
import CommonButton from './CommonButton';

const { ccclass, property, requireComponent } = _decorator;

@ccclass
@requireComponent(PageView)
export default class PageViewScroll extends Component {

    @property([CommonButton])
    leftButtons: CommonButton[] = [];

    @property([CommonButton])
    rightButtons: CommonButton[] = [];

    private pageView: PageView = null;

    onLoad() {
        this.pageView = this.getComponent(PageView);

        const leftHandler = new Component.EventHandler();
        leftHandler.target = this.node;
        leftHandler.component = 'PageViewScroll';
        leftHandler.handler = 'onLeftClick';

        const rightHandler = new Component.EventHandler();
        rightHandler.target = this.node;
        rightHandler.component = 'PageViewScroll';
        rightHandler.handler = 'onRightClick';

        this.leftButtons.forEach((b) => {
            b.onClickHandler = leftHandler;
        });
        this.rightButtons.forEach((b) => {
            b.onClickHandler = rightHandler;
        });
        this.refreshButton();

        const h = new Component.EventHandler();
        h.component = 'PageViewScroll';
        h.handler = 'refreshButton';
        h.target = this.node;
        this.pageView.scrollEvents.push(h);
    }

    private refreshButton() {
        const idx = this.pageView.getCurrentPageIndex();
        const len = this.pageView.getPages().length;
        const leftAble = idx !== 0;
        const rightAble = idx !== len - 1;
        this.leftButtons.forEach(b => b.interactable = leftAble);
        this.rightButtons.forEach(b => b.interactable = rightAble);
    }

    onLeftClick() {
        const idx = this.pageView.getCurrentPageIndex();
        if (this.pageView.isAutoScrolling()) {
            this.pageView.stopAutoScroll();
        }
        this.pageView.scrollToPage(idx - 1, .5);
        this.refreshButton();

    }

    onRightClick() {
        const idx = this.pageView.getCurrentPageIndex();
        if (this.pageView.isAutoScrolling()) {
            this.pageView.stopAutoScroll();
        }
        this.pageView.scrollToPage(idx + 1, .5);
        this.refreshButton();
    }
}
