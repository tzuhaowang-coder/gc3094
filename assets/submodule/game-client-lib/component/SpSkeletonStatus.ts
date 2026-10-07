import { _decorator, Component, Label, RichText, sp } from 'cc';
import { log, onlyUnique, sumReducer, toObjectReducer } from '../utils/Utils';
import GraphicsProfile from './GraphicsProfile';
import NodeShrink from './NodeShrink';

const { ccclass, property, requireComponent, executionOrder } = _decorator;

export interface ISpSkeletonInfo {
    bones: string[];
    totalBones: number;
    slots: string[];
    totalSlots: number;
    duration: number;
    timelines: any[];
    timelinesFrames: number;
    textureChange: number;
    blendChange: number;
    drawCall: number;
    textures: any[];
    name: string;
    meshBones: number;
    cacheMode: number;
    verticesChange: number;
    triangleChange: number;
    totalVertices: number;
    totalTriangles: number;
    totalUVs: number;
}

@ccclass
@requireComponent(sp.Skeleton)
@executionOrder(1)
export default class SpSkeletonStatus extends Component {

    @property(Label)
    label: Label = null;

    @property(RichText)
    richtext: RichText = null;

    @property(GraphicsProfile)
    graphicsProfile: GraphicsProfile = null;

    private skeleton: sp.Skeleton = null;

    private updateTimes: number[] = [];

    private str: string = '';

    public load() {
        const i = spSkeletonInfo(this.skeleton, undefined, true);

        const arr = [
            i.name + '(' + Number(i.duration).toFixed(2) + 's' + ')',
            i.cacheMode + ' mode',
            [i.bones.length, i.totalBones].join('/') + ' bones',
            [i.slots.length, i.totalSlots].join('/') + ' slots',
            i.textures.length + ' textures',
            [i.timelinesFrames, i.timelines.length].join('/') + ' timelines',
            i.drawCall + '(' + i.textureChange + ',' + i.blendChange + ')' + ' drawcall',
            i.meshBones + ' mesh bones',
            [i.verticesChange, i.totalVertices].join('/') + ' vertices',
            [i.triangleChange, i.totalTriangles].join('/') + ' triangles',
        ];

        this.str = arr.join('\n');
    }

    onLoad() {
        this.skeleton = this.getComponent(sp.Skeleton);
        this.load();
        if (this.label) {
            this.label.string = this.str;
        }
        if (this.richtext) {
            this.richtext.string = this.str;
            const shrink = this.richtext.getComponent(NodeShrink);
            if (shrink) {
                shrink.resize();
            }
        }

        // @ts-ignore
        const update = this.skeleton.update.bind(this.skeleton);
        // @ts-ignore
        this.skeleton.update = (dt) => {
            const now = performance.now();
            update(dt);
            const diff = (performance.now() - now);
            this.updateTimes.push(diff);
            if (this.updateTimes.length > 1000) {
                this.updateTimes.splice(0, this.updateTimes.length - 1000);
            }
            if (this.label || this.richtext) {
                const arr = this.updateTimes.slice().sort();
                const mins = arr.slice(0, 100);
                const maxs = arr.slice(arr.length - 100);
                const str = this.str + '\n' + [
                    (mins.reduce(sumReducer, 0) / mins.length).toFixed(3),
                    (this.updateTimes.reduce(sumReducer, 0) / this.updateTimes.length).toFixed(3),
                    (maxs.reduce(sumReducer, 0) / maxs.length).toFixed(3),
                ].join('/') + ' ms';

                if (this.label) {
                    this.label.string = str;
                }
                if (this.richtext) {
                    this.richtext.string;
                }
            }
            if (this.graphicsProfile) {
                this.graphicsProfile.pushData(diff * 1e3);
            }
        };
    }
}

export function spSkeletonNameDuration(ske: sp.Skeleton, animation?: string) {
    const animationName = animation || ske.animation || ske.defaultAnimation;
    const { duration } = ske.findAnimation(animationName);
    return {
        duration,
        name: animationName,
    };
}

export function spSkeletonInfo(ske: sp.Skeleton, animation?: string, logMissingRegions: boolean = false): ISpSkeletonInfo {

    const animationName = animation || ske.animation || ske.defaultAnimation;
    // @ts-ignore
    const cacheMode = ske._cacheMode;
    const skeletonData = ske.skeletonData;
    const textures = skeletonData.textures;
    // @ts-ignore
    const skeleton = ske._skeleton;
    const drawOrder = skeleton.drawOrder;

    const json = skeletonData.getRuntimeData().animations[animationName];
    const totalBones = skeletonData.getRuntimeData().bones.length;
    const totalSlots = skeletonData.getRuntimeData().slots.length;

    const { duration, timelines } = ske.findAnimation(animationName);

    const bones = Object.keys(json.bones || {});
    const slots = Object.keys(json.slots || {});
    const slotAttachment = slots.map(k => json.slots[k].attachment && json.slots[k].attachment[0].name);
    const fixFolder = (k: string) => {
        return k.split('_')[0] + '/' + k;
    };
    const slots2 = slots.map(fixFolder);

    // @ts-ignore
    const atlasCache = skeletonData._atlasCache;
    // let pages = atlasCache.pages
    const regions: any[] = atlasCache.regions;
    const regionsMap = regions.reduce(toObjectReducer('name'), {});

    const { meshTable, totalVertices, totalTriangles, totalUVs } = getSkeletonMeshData(skeletonData);

    const verticesChange = slotAttachment.reduce((acc, x) => { return meshTable[x] ? acc + meshTable[x]['vertices'] : acc; }, 0);
    const triangleChange = slotAttachment.reduce(
        (acc, x) => {
            return meshTable[x] ? acc + meshTable[x]['triangles'] : acc;
        },
        0,
    );

    let drawCall = 0;
    let blendChange = 0;
    let textureChange = 0;
    let prevBlendMode = -1;
    let prevTexture = null;
    const attachments = [];
    const missingRegions = [];
    for (let i = 0; i < drawOrder.length; i += 1) {
        const drawOrderi = drawOrder[i];
        const data = drawOrderi.data;
        const name = data.name;
        const blendMode = data.blendMode;
        let idx = slots.indexOf(name);
        if (idx === -1) {
            idx = slots2.indexOf(fixFolder(name));
            if (idx === -1) {
                continue;
            }
        }
        const regionName = slotAttachment[idx] || name;
        if (drawOrderi.attachment) {
            attachments.push(drawOrderi.attachment);
        }
        const region = regionsMap[regionName] || regionsMap[fixFolder(regionName)];
        if (!region) {
            missingRegions.push(name);
            continue;
        }
        if (prevTexture !== region.texture || prevBlendMode !== blendMode) {
            drawCall += 1;
            if (prevTexture !== region.texture) {
                textureChange += 1;
            }
            if (prevBlendMode !== blendMode) {
                blendChange += 1;
            }
        }
        prevBlendMode = blendMode;
        prevTexture = region.texture;
    }

    if (logMissingRegions) {
        log(slots, slots2, slotAttachment);
    }

    if (logMissingRegions && missingRegions.length) {
        log('No region', missingRegions.sort(), 'in', regions.map(r => r.name).sort());
    }

    const timelinesFrames = timelines.map(t => t.frames.length).reduce(sumReducer, 0);
    const meshBones = attachments.filter(m => m.bones).map(m => m.bones.filter(onlyUnique).length).reduce(sumReducer, 0);

    return {
        blendChange,
        textureChange,
        cacheMode,
        bones,
        totalBones,
        slots,
        totalSlots,
        duration,
        timelines,
        timelinesFrames,
        drawCall,
        textures,
        meshBones,
        totalVertices,
        totalTriangles,
        totalUVs,
        verticesChange,
        triangleChange,
        name: animationName,
    };
}

export function getSkeletonMeshData(skeletonData: sp.SkeletonData, log: boolean = false) {

    const skins = skeletonData.getRuntimeData().skins;

    // let meshTable
    // let totalVertices
    // let totalTriangles
    // let totalUVs

    if (skins.default) {
        const obj = skins.default;
        const tDataArr: {}[] = [];
        const tDataMap: {} = {};
        Object.keys(obj).forEach((key0) => {
            const obj0 = obj[key0];
            Object.keys(obj0).forEach((key1) => {
                const obj1 = obj0[key1];
                const dType: string = obj1.type;
                const vertices: any[] = obj1.vertices;
                const triangles: any[] = obj1.triangles;
                const uvs: [] = obj1.uvs;
                if (dType && vertices && triangles && uvs) {
                    const tableData = {
                        attachmentName: key1,
                        bones: '',
                        type: dType,
                        vertices: vertices.length,
                        triangles: Math.floor(triangles.length / 3),
                        uvs: uvs.length,
                    };
                    tDataArr.push(tableData);
                    tDataMap[key1] = tableData;
                }
            });
        });

        const totalVertices = tDataArr.reduce((acc, x) => { return acc + x['vertices']; }, 0);
        const totalTriangles = tDataArr.reduce((acc, x) => { return acc + x['triangles']; }, 0);
        const totalUVs = tDataArr.reduce((acc, x) => { return acc + x['uvs']; }, 0);
        if (log) {
            // tslint:disable-next-line:no-console
            console.table(tDataArr);
        }

        const meshTable = tDataMap;

        return { meshTable, totalVertices, totalTriangles, totalUVs };

    } else {
        const obj = skins;
        const tDataArr: {}[] = [];
        const tDataMap: {} = {};
        Object.keys(obj).forEach((key0) => {
            const obj0 = obj[key0];
            Object.keys(obj0).forEach((key1) => {
                const obj1 = obj0[key1];
                Object.keys(obj1).forEach((key2) => {
                    const obj2 = obj1[key2];
                    Object.keys(obj2).forEach((key3) => {

                        const obj3 = obj2[key3];
                        const dType: string = obj3.type;
                        const vertices: [] = obj3.vertices;
                        const triangles: [] = obj3.triangles;
                        const uvs: [] = obj3.uvs;
                        if (dType && vertices && triangles && uvs) {

                            const skName = obj0.name;
                            const tableData = {
                                skinName: skName,
                                attachmentName: key3,
                                bones: '',
                                type: dType,
                                vertices: vertices.length,
                                triangles: Math.floor(triangles.length / 3),
                                uvs: uvs.length,
                            };
                            tDataArr.push(tableData);
                            tDataMap[key2] = tableData;
                        }
                    });
                });
            });
        });

        const totalVertices = tDataArr.reduce((acc, x) => { return acc + x['vertices']; }, 0);
        const totalTriangles = tDataArr.reduce((acc, x) => { return acc + x['triangles']; }, 0);
        const totalUVs = tDataArr.reduce((acc, x) => { return acc + x['uvs']; }, 0);
        if (log) {
            // tslint:disable-next-line:no-console
            console.table(tDataArr);
        }

        const meshTable = tDataMap;
        return { meshTable, totalVertices, totalTriangles, totalUVs };
    }
}
