interface ICurveDataPropFrameValue {
    frame: number;
    value: number;
}

interface ICurveDataPropFrameVec2 {
    frame: number;
    value: {
        __type__: 'Vec2',
        x: number,
        y: number,
    };
}

interface ICCAnimationClipProps {
    rotation?: ICurveDataPropFrameValue[];
    scale?: ICurveDataPropFrameVec2[];
    scaleX?: ICurveDataPropFrameValue[];
    scaleY?: ICurveDataPropFrameValue[];
    opacity?: ICurveDataPropFrameValue[];
    x?: ICurveDataPropFrameValue[];
    y?: ICurveDataPropFrameValue[];
    width?: ICurveDataPropFrameValue[];
    height?: ICurveDataPropFrameValue[];
}

interface ICCAnimationClipComps {
    // component
    [s: string]: ICCAnimationClipComp;
}

interface ICCAnimationClipComp {
    // property
    [s:string]: ICurveDataPropFrameValue[];
}

interface ICCAnimationClipCurveData {
    props?: ICCAnimationClipProps;
    comps?: ICCAnimationClipComps;
    paths?: {
        [s: string]: {
            props: ICCAnimationClipProps,
            comps: ICCAnimationClipComps,
        },
    };
}

interface ICCAnimationClip {
    __type__: 'AnimationClip';
    _name: string;
    _objFlags: 0;
    _native: 0;
    _duration: number;
    sample: number; // fps
    speed: 1;
    wrapMode: number;
    curveData:ICCAnimationClipCurveData;
    events: any[];
}
