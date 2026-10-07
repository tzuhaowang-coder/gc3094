import { _decorator, CCBoolean, color, Color, Component, v2, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

export type ArtLabelStyleData = {
    p: number[];
    lc: string;
    uoc: number;
    oc: string;
    ow: number;
    s: number;
    sc: string;
    so: number[];
    ug:number
    glb:string;
    grb:string;
    glt:string;
    grt:string;
};

@ccclass
export default class ArtLabelStyle extends Component {

    @property(Vec2)
    position: Vec2 = v2();

    @property(Color)
    labelColor: Color = color(255, 255, 255);

    @property({ visible() { return this.outlineWidth > 0; } })
    useOutlineColor: boolean = false;

    @property({ visible() { return this.outlineWidth > 0 && this.useOutlineColor; } })
    outlineColor: Color = color(255, 255, 255);

    @property({ min:0 })
    outlineWidth: number = 0;

    @property(CCBoolean)
    shadow: boolean = false;

    @property({ min:0, visible() { return this.shadow; } })
    shadowColor: Color = color(255, 255, 255);

    @property({ visible() { return this.shadow; } })
    shadowOffset: Vec2 = v2();

    @property(CCBoolean)
    gradient: boolean = false;

    @property({ visible() { return this.gradient; } })
    gradColorLB: Color = color(255, 255, 255);

    @property({ visible() { return this.gradient; } })
    gradColorRB: Color = color(255, 255, 255);

    @property({ visible() { return this.gradient; } })
    gradColorLT: Color = color(255, 255, 255);

    @property({ visible() { return this.gradient; } })
    gradColorRT: Color = color(255, 255, 255);

    public toJson():ArtLabelStyleData {
        return {
            p: [this.position.x, this.position.y],
            lc: this.labelColor.toHEX('#rrggbbaa'),
            uoc: Number(this.useOutlineColor),
            oc: this.outlineColor.toHEX('#rrggbbaa'),
            ow: this.outlineWidth,
            s: Number(this.shadow),
            sc: this.shadowColor.toHEX('#rrggbbaa'),
            so: [this.shadowOffset.x, this.shadowOffset.y],
            ug: Number(this.gradient),
            glb: this.gradColorLB.toHEX('#rrggbbaa'),
            grb: this.gradColorRB.toHEX('#rrggbbaa'),
            glt: this.gradColorLT.toHEX('#rrggbbaa'),
            grt: this.gradColorRT.toHEX('#rrggbbaa'),
        };
    }

    public loadJson(o: ArtLabelStyleData) {
        this.position = v2(o.p[0], o.p[1]);
        Color.fromHEX(this.labelColor, o.lc);
        this.useOutlineColor = Boolean(o.uoc);
        Color.fromHEX(this.outlineColor, o.oc);
        this.outlineWidth = o.ow;
        this.shadow = Boolean(o.s);
        Color.fromHEX(this.shadowColor, o.sc);
        this.shadowOffset = v2(o.so[0], o.so[1]);
        this.gradient = Boolean(o.ug);
        Color.fromHEX(this.gradColorLB, o.glb);
        Color.fromHEX(this.gradColorRB, o.grb);
        Color.fromHEX(this.gradColorLT, o.glt);
        Color.fromHEX(this.gradColorRT, o.grt);
    }
}
