import { bezier, Color, ITweenOption, lerp, Node, tween, Tween, TweenEasing, UITransform, v2, Vec2, Vec3 } from 'cc';
import { getNodeColor, getNodeOpacity, isNone, setNodeColor, setNodeOpacity, vecXToVec3 } from './Utils';
type Easing = TweenEasing | ((k: number) => number);
export function removeSelf() {
    return tween<Node>().removeSelf();
}
export function place(x: number, y: number) {
    return tween<Node>().set({ position: vecXToVec3(v2(x, y)) });
}
export function repeat(action: Tween<Node>, times: number) {
    return tween<Node>().repeat(times, action);
}
export function sequence<T= Node>(...args: Tween<T>[]) {
    return tween<T>().sequence(...args);
}
export function spawn<T= Node>(...args: Tween<T>[]) {
    return tween<T>().parallel(...args);
}
export function heightTo(duration: number, height: number, easing?: Easing) {
    let uit: UITransform;
    let from: number;
    return tween<Node>().to(duration, {}, {
        onStart(target: Node) {
            uit = target.getComponent(UITransform) || target.addComponent(UITransform);
            from = uit.height;
        },
        onUpdate(target: Node, dt: number) {
            const h = lerp(from, height, dt);
            uit.height = h;
        },
        easing,
    });
}
export function widthTo(duration: number, width: number, easing?: Easing) {
    let uit: UITransform;
    let from: number;
    return tween<Node>().to(duration, {}, {
        onStart(target: Node) {
            uit = target.getComponent(UITransform) || target.addComponent(UITransform);
            from = uit.width;
        },
        onUpdate(target: Node, dt: number) {
            const w = lerp(from, width, dt);
            uit.width = w;
        },
        easing,
    });
}
export function rotateTo(duration: number, dstAngle: number, easing?: Easing) {
    return tween<Node>().to(duration, { angle: dstAngle }, easingTweenOption(easing));
}
export function rotateBy(duration: number, deltaAngle: number, easing?: Easing) {
    return tween<Node>().by(duration, { angle: deltaAngle }, easingTweenOption(easing));
}
export function moveBy(duration: number, position: Vec2 | Vec3, easing?: Easing) {
    return tween<Node>().by(duration, { position: vecXToVec3(position) }, easingTweenOption(easing));
}
export function moveTo(duration: number, position: Vec2 | Vec3, easing?: Easing) {
    return tween<Node>().to(duration, { position: vecXToVec3(position) }, easingTweenOption(easing));
}

export function jumpTo(duration: number, x: number, y: number, height: number, jumps: number) {
    let from: Vec3;
    let delta: Vec2;
    return tween<Node>().to(duration, {}, {
        onStart(target: Node) {
            from = target.position.clone();
            delta = new Vec2(x - from.x, y - from.y);
        },
        onUpdate(target: Node, dt: number) {
            const frac = dt * jumps % 1.0;
            let y = height * 4 * frac * (1 - frac);
            y += delta.y * dt;
            const x = delta.x * dt;
            target.setPosition(from.x + x, from.y + y);
        },
    });
}
function bezierAt(a: number, b: number, c: number, d: number, t: number) {
    return Math.pow(1 - t, 3) * a + 3 * t * Math.pow(1 - t, 2) * b + 3 * Math.pow(t, 2) * (1 - t) * c + Math.pow(t, 3) * d;
}
export function bezierTo(duration: number, bezier: Vec2[]) {
    const xa = 0;
    const xb = bezier[0].x;
    const xc = bezier[1].x;
    const xd = bezier[2].x;
    const ya = 0;
    const yb = bezier[0].y;
    const yc = bezier[1].y;
    const yd = bezier[2].y;
    return tween<Node>().to(duration, {}, {
        onUpdate(target: Node, dt: number) {
            const x = bezierAt(xa, xb, xc, xd, dt);
            const y = bezierAt(ya, yb, yc, yd, dt);
            target.setPosition(x, y);
        },
    });
}
export function scaleTo(duration: number, scaleX: number, scaleY?: number, easing?: Easing) {
    if (isNone(scaleY)) {
        scaleY = scaleX;
    }
    return tween<Node>().to(duration, { scale: new Vec3(scaleX, scaleY, 1) }, easingTweenOption(easing));
}
export function scaleBy(duration: number, scaleX: number, scaleY?: number, easing?: Easing) {
    if (isNone(scaleY)) {
        scaleY = scaleX;
    }
    return tween<Node>().by(duration, { scale: new Vec3(scaleX, scaleY, 1) }, easingTweenOption(easing));
}
export function fadeTo(duration: number, opacity: number) {
    let from: number;
    return tween<Node>().to(duration, {}, {
        onStart(target: Node) {
            from = getNodeOpacity(target);
        },
        onUpdate(target: Node, dt: number) {
            const o = lerp(from, opacity, dt);
            setNodeOpacity(target, o);
        },
        onComplete(target: Node) {
            setNodeOpacity(target, opacity);
        },
    });
}
export function fadeIn(duration: number) {
    return fadeTo(duration, 255);
}
export function fadeOut(duration: number) {
    return fadeTo(duration, 0);
}
export function tintTo(duration: number, red: number, green: number, blue: number) {
    let from: Color;
    const to = new Color(red, green, blue);
    return tween<Node>().to(duration, {}, {
        onStart(target: Node) {
            from = getNodeColor(target);
        },
        onUpdate(target: Node, dt: number) {
            setNodeColor(target, from.lerp(to, dt));
        },
    });
}
export function delayTime(duration: number) {
    if (duration < 0) {
        duration = 0;
    }
    return tween().delay(duration);
}
export function callFunc(func: Function, that?: any) {
    if (that) {
        return tween().call(func.bind(that));
    }
    return tween().call(func);
}

export function stopAllActions(node: Node) {
    Tween.stopAllByTarget(node);
}
export function easeBezierAction(c1: number, c2: number, c3: number, c4: number) {
    return (t: number) => {
        return bezier(c1, c2, c3, c4, t);
    };
}
export function easingTweenOption(easing?: Easing): ITweenOption {
    if (easing) {
        return { easing };
    }
}
export function easeInOut(rate: number) {
    return function easing(dt: number) {
        dt *= 2;
        return dt < 1 ? .5 * Math.pow(dt, rate) : 1 - .5 * Math.pow(2 - dt, rate);
    };
}
