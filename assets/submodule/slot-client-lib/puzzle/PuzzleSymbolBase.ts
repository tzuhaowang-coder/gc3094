import { _decorator } from 'cc';
import SkeletonSymbolBase from '../slot/SkeletonSymbolBase';

const { ccclass, property } = _decorator;

@ccclass
export default abstract class PuzzleSymbolBase extends SkeletonSymbolBase {

    public x: number = -1;

    public y: number = -1;
}
