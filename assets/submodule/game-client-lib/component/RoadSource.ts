import { _decorator, Component } from 'cc';
import Road, { ROAD_TYPE, RoadData } from './Road';
const { ccclass, property } = _decorator;

@ccclass
export default abstract class RoadSource<SRC= any, BEAD extends RoadData = RoadData, BIG extends RoadData = RoadData, THREE extends RoadData = RoadData> extends Component {

    @property({
        type: [Road],
    })
    targetRoads: Road[] = [];

    private roadCache: {
        [ROAD_TYPE.BEAD]?: BEAD[]
        [ROAD_TYPE.BIG]?: BIG[]
        [ROAD_TYPE.BIG_EYE]?: THREE[]
        [ROAD_TYPE.SMALL]?: THREE[]
        [ROAD_TYPE.ROACH]?: THREE[],
    } = {};

    /**
     * 原始資料 轉 珠盤路
     */
    abstract srcToBead(srcArr :SRC[]): BEAD[];

    /**
     * 珠盤路 轉 大路
     */
    abstract beadToBig(beadArr :BEAD[]): BIG[];

    /**
     * 大路 轉 下三路
     */
    abstract bigToThree(roadType: ROAD_TYPE.BIG_EYE | ROAD_TYPE.SMALL | ROAD_TYPE.ROACH, bigArr :BIG[]): THREE[];

    public reset(roads: SRC[]) {
        this.roadCache = {};

        const beads = this.srcToBead(roads);
        this.roadCache[ROAD_TYPE.BEAD] = beads;

        this.targetRoads.forEach((road) => {
            if (!this.roadCache[road.roadType]) {
                this.calculate(road.roadType);
            }
            road.reset(this.roadCache[road.roadType]);
        });
    }

    private calculate(roadType: ROAD_TYPE) {
        if (roadType === ROAD_TYPE.BIG) {
            const beadArr = this.roadCache[ROAD_TYPE.BEAD];
            this.roadCache[ROAD_TYPE.BIG] = this.beadToBig(beadArr);
        } else if (roadType === ROAD_TYPE.BEAD) {
            // do nothing
        } else {
            if (!this.roadCache[ROAD_TYPE.BIG]) {
                this.calculate(ROAD_TYPE.BIG);
            }
            const bigArr = this.roadCache[ROAD_TYPE.BIG];
            const threeArr = this.bigToThree(roadType, bigArr);
            this.roadCache[roadType] = threeArr;
        }
    }
}
