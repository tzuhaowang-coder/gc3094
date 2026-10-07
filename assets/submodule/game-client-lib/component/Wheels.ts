
import { _decorator, CCFloat, Component } from 'cc';
import { schedulePromise } from '../../../submodule/game-client-lib/script/PromiseManager';
import { warn } from '../../../submodule/game-client-lib/utils/Utils';
import Wheel from './Wheel';

const { ccclass, property } = _decorator;

@ccclass
export default class Wheels extends Component {

    @property([Wheel])
    wheels:Wheel[] = [];

    @property([CCFloat])
    delays: number[] = [];

    public async play(results: string[]):Promise<any> {
        if (this.wheels.length !== results.length) {
            warn('Not match');
            return;
        }

        return Promise.all(this.wheels.map(async(wheel, index) => {
            const delay = this.delays[index] || 0;
            const result = results[index];
            await schedulePromise(delay);
            await wheel.play(result);
        }));
    }

}
