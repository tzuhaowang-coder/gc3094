
import { _decorator, CCBoolean, CCFloat, Component, Director, director, EventHandler, ResolutionPolicy, Size, sys, view } from 'cc';
import { DEBUG } from 'cc/env';
import { uiIsMobile } from '../LibGlobal';
import { applyOrientationMode, horizontalOnly, setOnResizeComponent, setWorldSize, showAllMode, verticalOnly } from '../ResizeGlobal';
import { scheduleOnce2 } from '../script/PromiseManager';
import { arraySplice, log, warn } from '../utils/Utils';

const GALAXY_FOLD_RATIO = .428; // galaxy fold 280*653

const { ccclass, property } = _decorator;
@ccclass
export default class OnResizeManager extends Component {

    private handlers: EventHandler[] = [];

    private callbacks: Function[] = [];

    private size: Size = null;

    @property(CCBoolean)
    resizeWithBrowserSize: boolean = false;

    @property({
        type: CCFloat,
        tooltip: '在 VerticalOnly 時，可以限制最小的 ratio，ratio 小於此值會出現上下黑邊',
    })
    vRatioMin: number = 0;

    @property({
        type: CCFloat,
        tooltip: '在 VerticalOnly 時，可以限制最大的 ratio，ratio 大於此值會出現左右黑邊\n應大於 720/1280=0.5625',
    })
    vRatioMax: number = 0;

    @property({
        type: CCFloat,
        tooltip: '在 HorizontalOnly 時，可以限制最小的 ratio，ratio 小於此值會出現上下黑邊\n應大於 1280/720=1.777',
    })
    hRatioMin: number = 0;

    @property({
        type: CCFloat,
        tooltip: '在 HorizontalOnly 時，可以限制最大的 ratio，ratio 大於此值會出現左右黑邊',
    })
    hRatioMax: number = 0;

    @property(CCBoolean)
    blackBorder: boolean = false;

    onLoad() {
        setOnResizeComponent(this);
        const dr = view.getDesignResolutionSize();
        setWorldSize(dr.width, dr.height);

        this.onResize = this.onResize.bind(this);

        // director.on(Director.EVENT_AFTER_UPDATE, refreshScene);
        if (this.resizeWithBrowserSize) {
            view.resizeWithBrowserSize(true);
            view.setResizeCallback(this.doResizeWithBrowserSize.bind(this));
        } else {
            if (sys.isMobile) {
                window.addEventListener('resize', this.onResize);
            } else {
                // @ts-ignore
                view.on('canvas-resize', this.onResize);
            }
        }
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.resize.bind(this));
        applyOrientationMode();
    }

    start() {
        this.resize();
    }

    resize() {
        if (this.resizeWithBrowserSize) {
            this.doResizeWithBrowserSize();
        } else {
            this.onResize();
        }
    }

    onDestroy() {
        setOnResizeComponent(null);

        if (this.resizeWithBrowserSize) {
            view.resizeWithBrowserSize(false);
            view.setResizeCallback(null);
        } else {
            if (sys.isMobile) {
                window.removeEventListener('resize', this.resize);
            } else {
                // @ts-ignore
                view.on('canvas-resize', this.resize);
            }
        }
    }

    doResizeWithBrowserSize() {
        const dr = view.getDesignResolutionSize();
        const drw = dr.width;
        const drh = dr.height;
        const ratioMax = drw / drh;
        const ratioMin = drh / drw;
        const size = view.getFrameSize();
        const ratio = size.width / size.height;
        const land = ratio >= 1;
        const black = this.blackBorder;

        const getType = ():'v' | 'h' | 'vBlackUD' | 'vBlackLR' | 'hBlackUD' | 'hBlackLR'  => {
            const h = () => {
                if (this.hRatioMin && this.hRatioMin > ratio) {
                    return 'hBlackUD'; // 上下黑
                } else if (this.hRatioMax && this.hRatioMax < ratio) {
                    return 'hBlackLR'; // 左右黑
                } else {
                    return 'h';
                }
            };
            const v = () => {
                if (this.vRatioMin && this.vRatioMin > ratio) {
                    return 'vBlackUD'; // 上下黑
                } else if (this.vRatioMax && this.vRatioMax < ratio) {
                    return 'vBlackLR'; // 左右黑
                } else {
                    return 'v';
                }
            };
            if (black && !land) { // black & v
                if (!uiIsMobile) {
                    return h(); // pch
                }
                if (horizontalOnly) {
                    return h();
                }
                return v();
            } else if (black && land) { // black & h
                if (verticalOnly) {
                    if (!sys.isMobile) {
                        return 'vBlackLR'; // 左右黑
                    }
                    return v();
                }
                return h();
            } else if (land) {
                return 'h';
            } else { // !land
                return 'v';
            }
        };
        const type = getType();
        if (type === 'h') {
            let h = drh;
            if (ratio < ratioMax) {
                h = h * (1 + ratioMax - ratio);
            }
            const rp = showAllMode ? ResolutionPolicy.SHOW_ALL : ResolutionPolicy.FIXED_HEIGHT;
            view.setDesignResolutionSize(drw, h, rp);
        } else if (type === 'v') {
            let w = drh;
            if (ratio > ratioMin) {
                w = w / (1 + ratioMin - ratio);
            }
            const rp = showAllMode ? ResolutionPolicy.SHOW_ALL : ResolutionPolicy.FIXED_WIDTH;
            view.setDesignResolutionSize(w, drw, rp);
        } else if (type === 'vBlackLR') { // 左右黑邊
            const vrMax = this.vRatioMax;
            if (land) {
                view.setDesignResolutionSize(drh, drw, ResolutionPolicy.SHOW_ALL);
            } else {
                view.setDesignResolutionSize(drw * vrMax, drw, ResolutionPolicy.SHOW_ALL);
            }
        } else if (type === 'vBlackUD') { // 上下黑邊
            const vrMin = this.vRatioMin;
            let h = drh / ratio;
            if (vrMin && vrMin > ratio) {
                h = drh / vrMin;
            }
            view.setDesignResolutionSize(drh, h, ResolutionPolicy.SHOW_ALL);
        } else if (type === 'hBlackUD') { // 上下黑邊
            const hrMin = this.hRatioMin;
            view.setDesignResolutionSize(drw, drw / hrMin, ResolutionPolicy.SHOW_ALL);
        } else if (type === 'hBlackLR') { // 左右黑邊
            const hrMax = this.hRatioMax;
            let w = drh * ratio;
            if (hrMax && hrMax < ratio) {
                w = drh * hrMax;
            }
            view.setDesignResolutionSize(w, drh, ResolutionPolicy.SHOW_ALL);
        }
        if (DEBUG) {
            const rs = view.getDesignResolutionSize();
            log(ratio, rs.width, rs.height);
        }

        this.onResize();
        // [1] ResolutionExactFit       Fill screen by stretch-to-fit: if the design resolution ratio of width to height is different from the screen resolution ratio, your game view will be stretched.<br/>
        // [2] ResolutionNoBorder       Full screen without black border: if the design resolution ratio of width to height is different from the screen resolution ratio, two areas of your game view will be cut.<br/>
        // [3] ResolutionShowAll        Full screen with black border: if the design resolution ratio of width to height is different from the screen resolution ratio, two black borders will be shown.<br/>
        // [4] ResolutionFixedHeight    Scale the content's height to screen's height and proportionally scale its width<br/>
        // [5] ResolutionFixedWidth     Scale the content's width to screen's width and proportionally scale its height<br/>
    }

    private onResize() {
        const size = view.getVisibleSize();
        setWorldSize(size.width, size.height);
        this.size = size;
        if (this.callbacks) {
            scheduleOnce2(
                () => {
                    this.callbacks.forEach(callback => callback());
                },
                0,
            );
        }
        if (!this.handlers) {
            warn('handlers is empty');
            return;
        }
        this.handlers.forEach(handler => handler.emit([size]));
    }

    public registHandler(handler: EventHandler) {
        if (!handler) {
            warn('handler is empty');
            return;
        }
        if (!this.handlers) {
            this.handlers = [];
        }
        this.handlers.push(handler);
        if (this.size) {
            handler.emit([this.size]);
        }
    }

    public unregistHandler(handler: EventHandler) {
        arraySplice(this.handlers, handler);
    }

    public registCallback(callback: Function) {
        if (!callback) {
            warn('callback is empty');
            return;
        }
        if (!this.callbacks) {
            this.callbacks = [];
        }
        this.callbacks.push(callback);
        if (this.size) {
            scheduleOnce2(callback, 0);
        }
    }

    public unregistCallback(callback: Function) {
        arraySplice(this.callbacks, callback);
    }
}
