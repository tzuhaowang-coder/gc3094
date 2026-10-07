import { _decorator, assetManager, AudioClip, AudioSource, CCBoolean, CCString, error, resources } from 'cc';
import { DEBUG } from 'cc/env';
import { KeyAudioClip } from '../data/KeyAudioClip';
import { getIsEnterBackground, globalDebugNNN } from '../LibGlobal';
import { getResourcesLoader, loadResAudioClipPromise } from '../script/ResourcesLoader';
import { arraySplice, log, warn } from '../utils/Utils';
import PersistRootNode from './PersistRootNode';

const { ccclass, property } = _decorator;

export let audio: Audio = null;

export function setAudioComponent(audioComponent: Audio) {
    audio = audioComponent;
}

export function getAudioComponent() {
    return audio;
}

let type = '';
let lang = '';
let loaded = false;

function audioNameToUrl(name: string): string {
    if (!loaded) {
        const l = getResourcesLoader();
        if (!l.varLoaded) {
            return;
        }
        lang = l.lang;
        type = l.audioType;

        loaded = true;
    }
    const urls = [
        `audio/${type}/${name}_${lang}`,
        `audio/${type}/${name}`,
    ];
    for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i];

        const info = resources.getInfoWithPath(url, AudioClip);
        if (info) {
            return url;
        }
    }
    return '';
}

const urlPromiseMap = new Map<string, Promise<AudioClip>>();
const urlCompletes: string[] = [];
const unstartedLoopKeys: string[] = [];
const unstartedKeys: string[] = [];
const delayPrefix = 'delay_';
const DELAY_TIMEOUT = 250;
let lastBGMName: string = '';
let delayId = 0;

async function audioReady(name: string) {
    const now = Date.now();
    const url = audioNameToUrl(name);
    if (urlCompletes.indexOf(url) !== -1) {
        return 0;
    }
    const p = urlPromiseMap.get(url);
    if (p) {
        await p;
        return Date.now() - now;
    }
    const lracp = loadResAudioClipPromise(url);
    urlPromiseMap.set(url, lracp);
    const audioClip = await lracp;
    urlCompletes.push(url);
    audio.registAudio([{
        audioClip,
        key: name,
    }]);
    return Date.now() - now;
}

async function audioDelayPlayBGM(name: string, customBGMVolume?: number, fade: boolean = false, fadeUnit: number = FADE_BGM_UNIT): Promise<string> {
    const t = await audioReady(name);
    if (name !== lastBGMName) {
        return;
    }
    audio.playBGM(name, customBGMVolume);
    if (fade) {
        audio.bgmFadeUnit = fadeUnit;
        audio.schedule(audio.fadeInBGMFadeVolume, .1);
    } else {
        audio.bgmFadeVolume = 1;
    }
}

async function audioDelayPlay(delayKey: string, name: string, { loop, loopIndex, throttle, throttleGroup }: { loop: boolean, loopIndex: string, throttle: number, throttleGroup: string }): Promise<string> {
    const t = await audioReady(name);
    if (loop) {
        const loopKey = [name, loopIndex].join('#');
        // 有 loop 但沒找到
        // 代表已被取消了
        if (unstartedLoopKeys.indexOf(loopKey) === -1) {
            return '-2';
        }
        arraySplice(unstartedLoopKeys, loopKey);
    } else {
        if (t >= DELAY_TIMEOUT) {
            arraySplice(unstartedKeys, delayKey);
            return '-1';
        }
        if (unstartedKeys.indexOf(delayKey) === -1) {
            return '-2';
        }
        arraySplice(unstartedKeys, delayKey);
    }
    return audio.playEffect(name, { loop, loopIndex, throttle, throttleGroup });
}

export function audioPlayBGM(name: string = '', customBGMVolume: number = 1, fade: boolean = true, fadeUnit: number = FADE_BGM_UNIT) {
    if (!audio) {
        return;
    }
    const has = audio.hasAudio(name);
    const old = lastBGMName;
    lastBGMName = name;
    if (has) {
        if (fade) {
            audio.bgmFadeUnit = fadeUnit;
            audio.unscheduleAllCallbacks();
            const next = () => {
                if (name !== lastBGMName) {
                    return;
                }
                audio.playBGM(name, customBGMVolume);
                audio.schedule(audio.fadeInBGMFadeVolume, .1); // 淡入
            };

            if (old && old !== name) {// 淡出
                audio.schedule(audio.fadeOutBGMFadeVolume.bind(audio, next), .1);
            } else {
                next();
            }
        } else {
            audio.bgmFadeVolume = 1;
            audio.playBGM(name, customBGMVolume);
        }
    } else {
        const next = () => {
            audioDelayPlayBGM(name, customBGMVolume, fade, fadeUnit);
        };
        if (fade) {
            audio.bgmFadeUnit = fadeUnit;
            audio.unscheduleAllCallbacks();
            if (old && old !== name) {
                audioReady(name);
                audio.schedule(audio.fadeOutBGMFadeVolume.bind(audio, next), .1); // 淡出
            } else {
                next();
            }
        } else {
            next();
        }
    }
}

export function audioPlay(name: string, { loop = false, loopIndex = '', throttle = 10, throttleGroup = '' }: { loop?: boolean, loopIndex?: string, throttle?: number, throttleGroup?: string } = {}): string {
    if (!audio) {
        return;
    }
    if (getIsEnterBackground()) {
        return '-1';
    }
    if (!audio.audioEnabled) {
        return '-1';
    }
    const has = audio.hasAudio(name);
    if (has) {
        return audio.playEffect(name, { loop, loopIndex, throttle });
    } else {
        delayId += 1;
        const key = delayPrefix + delayId;
        if (loop) {
            const loopKey = [name, loopIndex].join('#');
            unstartedLoopKeys.push(loopKey);
        } else {
            unstartedKeys.push(key);
        }
        audioDelayPlay(key, name, { loop, loopIndex, throttle, throttleGroup });
        return key;
    }
}

export function audioStop(id: string | number): void {
    if (!audio) {
        return;
    }
    if (typeof id === 'number') {
        audio.stopEffect(id);
    } else {
        if (id.startsWith(delayPrefix)) {
            // 如果有 delayKey
            // 沒有 cocos audio id
            // 目前播放後無法停止
            arraySplice(unstartedKeys, id);
        } else if (!isNaN(Number(id))) {
            audio.stopEffect(Number(id));
        }
    }
}

export function audioStopLoop(name: string, loopIndex: string = ''): void {
    if (!audio) {
        return;
    }
    if (getIsEnterBackground()) {
        return;
    }
    if (!audio.audioEnabled) {
        return;
    }
    const has = audio.hasAudio(name);
    if (has) {
        audio.stopEffectLoop(name, loopIndex);
    } else {
        const loopKey = [name, loopIndex].join('#');
        arraySplice(unstartedLoopKeys, loopKey);
    }
}

export function audioBGMVolume(volume: number) {
    if (!audio) {
        return;
    }
    audio.bgmVolume = volume;
}

export function audioEffectVolume(volume: number) {
    if (!audio) {
        return;
    }
    audio.effectVolume = volume;
}

export function audioCustomBGMVolume(volume: number) {
    if (!audio) {
        return;
    }
    audio.customBGMVolume = volume;
}

export function audioCustomEffVolume(volume: number) {
    if (!audio) {
        return;
    }
    audio.customEffectVolume = volume;
}

export function audioDefaultButtonAudioName(): string {
    if (!audio) {
        return;
    }
    return audio.defaultButtonAudioName;
}

export function audioEnabled(): boolean {
    if (!audio) {
        return;
    }
    return audio.audioEnabled;
}

export function audioEnable(able: boolean) {
    if (!audio) {
        return;
    }
    audio.enable(able);
}

export function audioGetBGMName() {
    // audioPre();
    return lastBGMName;
    // return audio.getBGMName();
}

export function audioAppend(keyAudioClip: KeyAudioClip[]) {
    if (!audio) {
        return;
    }
    return audio.registAudio(keyAudioClip);
}

const DEFAULT_EFFECT_AUDIOSOURCE_NUM = 5; // 預設audioSouce音效數量
const MUSIC_ID: string = '9999';
const FADE_BGM_UNIT: number = 0.2;

enum AudioPlayType {
    EFFECT,
    BGM,
}

@ccclass
class Audio extends PersistRootNode {

    @property(CCBoolean)
    debugMode: boolean = false;

    @property(CCString)
    defaultButtonAudioName: string = '';

    public audioEnabled: boolean = true;

    private audioMap: Map<string, AudioClip> = new Map();
    private throttleMap: { [s: string]: number; } = {};
    private loopIdMap: { [s: string]: string; } = {};
    private bgmAudioSouce: AudioSource = null;
    private effectAudioSouceArr: AudioSource[] = [];

    /**
     * BGM音量
     */
    private _bgmVolume: number = 1;
    public get bgmVolume(): number {
        return this._bgmVolume;
    }
    public set bgmVolume(value: number) {
        this._bgmVolume = value;
        this.updateBGMVolume();
    }

    /**
     * BMG淡入淡出音量
     */
    private _bgmFadeVolume: number = 0;
    public get bgmFadeVolume(): number {
        return this._bgmFadeVolume;
    }
    public set bgmFadeVolume(value: number) {
        this._bgmFadeVolume = value;
        this.updateBGMVolume();
    }

    /**
     * BGM 淡入淡出每 step 變化量（每 0.1 秒一次）
     */
    public bgmFadeUnit: number = FADE_BGM_UNIT;

    /**
     * custom BMG音量
     */
    private _customBGMVolume: number = 1;
    public get customBGMVolume(): number {
        return this._customBGMVolume;
    }
    public set customBGMVolume(value: number) {
        this._customBGMVolume = value;
        this.updateBGMVolume();
    }

    /**
     * BGM音量
     */
    private _effectVolume: number = 1;
    public get effectVolume(): number {
        return this._effectVolume;
    }
    public set effectVolume(value: number) {
        this._effectVolume = value;
        this.updateEffectVolume();
    }

    /**
     * custom 音效音量
     */
    private _customEffectVolume: number = 1;
    public get customEffectVolume(): number {
        return this._customEffectVolume;
    }
    public set customEffectVolume(value: number) {
        this._customEffectVolume = value;
        this.updateEffectVolume();
    }

    /**
    * 更新BGM AudioSouce元件音量
    */
    private updateBGMVolume() {
        this.bgmAudioSouce.volume = this.bgmVolume * this.bgmFadeVolume * this.customBGMVolume;

        if (this.debugMode) {
            log('Audio.ts#updateBGMVolume ', this.bgmAudioSouce.volume , this.bgmVolume , this.bgmFadeVolume , this.customBGMVolume);
        }
    }
    /**
    * 更新音效 AudioSouc元件音量
    */
    private updateEffectVolume() {
        this.effectAudioSouceArr.forEach(as => as.volume = this.effectVolume * this.customEffectVolume);

        if (this.debugMode) {
            log('Audio.ts#updateEffectVolume ', this.effectVolume , this.customEffectVolume);
        }
    }

    onLoad() {
        super.onLoad();
        setAudioComponent(this);
        const l = getResourcesLoader();
        this.registAudio(l.keyAudioClips);

        this.bgmAudioSouce = this.genAudioSource();
        for (let i = 0; i < DEFAULT_EFFECT_AUDIOSOURCE_NUM; i += 1) {
            const as = this.genAudioSource();
            this.effectAudioSouceArr.push(as);
        }
        this.node.on(AudioSource.EventType.ENDED, this.onAudioSourceEnded, this);

        if (DEBUG) {
            this.initDragAndDrop();
        }
    }

    private initDragAndDrop() {
        const preventDefault = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        window.addEventListener('dragenter', preventDefault, true);
        window.addEventListener('dragover', preventDefault, true);

        window.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (!e.dataTransfer || !e.dataTransfer.files) return;

            const files = e.dataTransfer.files;
            warn(`Drop mp3 files detected, count: ${files.length}`);

            for (let i = 0; i < files.length; i += 1) {
                const file = files[i];
                if (file.name.endsWith('.mp3')) {
                    warn(`Processing drop mp3: ${file.name}`);
                    const name = file.name.substring(0, file.name.length - 4);
                    // 加上 '#' 讓後續被強制塞入的 '?develop' 變成 url hash 而不會破壞 blob 的讀取
                    const url = URL.createObjectURL(file) + '#';
                    assetManager.loadRemote(url, { ext: '.mp3' }, (err: Error, clip: AudioClip) => {
                        if (err) {
                            error('Failed to load audio from drop', err);
                            return;
                        }
                        this.replaceAudioClip(name, clip);
                    });
                }
            }
        },                      true);
    }

    private replaceAudioClip(name: string, clip: AudioClip) {
        if (!this.audioMap.has(name)) {
            log(`New audio clip dropped and registered: ${name}`);
        } else {
            log(`Replaced audio clip: ${name}`);
        }

        this.audioMap.set(name, clip);

        // 如果取代的是當前的背景音樂，重新播放
        if (lastBGMName === name) {
            this.bgmAudioSouce.stop();
            this.bgmAudioSouce.clip = null;
            this.playBGM(name, this.customBGMVolume);
        }

        // 重啟目前在 loopIdMap 裡的同名循環音效
        Object.keys(this.loopIdMap).forEach((loopKey) => {
            if (loopKey.startsWith(name + '#') || loopKey === name + '#') {
                const loopIndex = loopKey.substring(name.length + 1);
                this.stopEffectLoop(name, loopIndex);
                this.playEffect(name, { loop: true, loopIndex });
            }
        });
    }

    onDestroy() {
        setAudioComponent(null);
        this.node.off(AudioSource.EventType.ENDED, this.onAudioSourceEnded, this);
    }

    private genAudioSource(): AudioSource {
        const audioSource = this.node.addComponent(AudioSource);
        return audioSource;
    }

    private onAudioSourceEnded(audioSource: AudioSource) {
        audioSource.clip = null; // 播完後清除音效
    }

    public registAudio(ary: KeyAudioClip[]) {
        ary.forEach((a) => {
            log(a);
            this.audioMap.set(a.key, a.audioClip);
        });
    }

    public hasAudio(name: string) {
        return this.audioMap.has(name);
    }

    public fadeInBGMFadeVolume() {
        let newVol = this.bgmFadeVolume + this.bgmFadeUnit;

        if (newVol >= 1) {
            newVol = 1;
        }
        this.bgmFadeVolume = newVol;
        if (newVol === 1) {
            this.unscheduleAllCallbacks();
        }
    }

    public async fadeOutBGMFadeVolume(next: Function) {
        let newVol = this.bgmFadeVolume - this.bgmFadeUnit;
        if (newVol <= 0) {
            newVol = 0;
        }
        this.bgmFadeVolume = newVol;
        if (newVol === 0) {
            this.unscheduleAllCallbacks();
            if (next) {
                next();
            }
        }
    }

    public playBGM(name: string, customVolume?: number) {
        const bgmAS = this.bgmAudioSouce;
        if (bgmAS.playing && bgmAS.clip.name === name) {// 不播重複
            return;
        }

        this.customBGMVolume = customVolume;
        const id = this.play(name, true, AudioPlayType.BGM);
        if (this.debugMode) {
            log('Audio.ts#playBGM', name, id, customVolume);
        }
        return id;
    }

    public playEffect(name: string, { loop = false, loopIndex = '', throttle = 0, throttleGroup = '' }: { loop?: boolean, loopIndex?: string, throttle?: number, throttleGroup?: string } = {}): string {
        if (throttle) {
            const group = throttleGroup || name;
            const now = Date.now();
            if (this.throttleMap[group] && (now - this.throttleMap[group]) < throttle) {
                return '';
            }
            this.throttleMap[group] = now;
        }

        const loopKey = [name, loopIndex].join('#');
        if (loop && this.loopIdMap[loopKey]) {
            return '';
        }

        const id = this.play(name, loop, AudioPlayType.EFFECT);
        if (loop && !this.loopIdMap[loopKey]) {
            this.loopIdMap[loopKey] = id;
        }

        if (this.debugMode) {
            log('Audio.ts#playEffect', name, loop, id);
        }
        return id;
    }

    public stopEffectLoop(name: string, loopIndex: string = '') {

        const loopKey = [name, loopIndex].join('#');
        if (this.debugMode) {
            log('Audio.ts#stopEffectLoop', name, loopIndex, this.loopIdMap[loopKey]);
        }

        const id = this.loopIdMap[loopKey];
        this.effectAudioSouceArr.forEach((as, idx) => {
            if (idx + '' === id) {
                as.stop();
            }
        });
        delete this.loopIdMap[loopKey];
    }

    public stopEffect(id: number) {
        if (this.debugMode) {
            log('Audio.ts#stopEffect', id);
        }
        this.effectAudioSouceArr.forEach((as, idx) => {
            if (idx === id) {
                as.stop();
            }
        });
    }

    private play(name: string, loop: boolean, type: AudioPlayType): string {
        if (!this.audioEnabled) return;
        const clip = this.audioMap.get(name);
        let id: string = '-1';
        switch (type) {
        case AudioPlayType.EFFECT:
            if (!clip) return;
            const effASArr = this.effectAudioSouceArr;
            let hasPlay: boolean = false;
            effASArr.forEach((as, idx) => {
                if (!hasPlay && !as.clip) {
                    hasPlay = true;
                    as.clip = clip;
                    as.loop = loop;
                    as.play();
                    id = idx + '';
                }
            });

            if (!hasPlay) {
                const as = this.genAudioSource();
                effASArr.push(as);
                hasPlay = true;
                as.clip = clip;
                as.loop = loop;
                as.play();
                id = (effASArr.length - 1) + '';
            }

            if (this.debugMode) {
                log('Audio.ts#play effect : ', id, name);
            }
            break;
        case AudioPlayType.BGM:
            const bgmAS = this.bgmAudioSouce;
            if (bgmAS.playing) {
                bgmAS.stop();
            }
            if (!clip) return;
            bgmAS.clip = clip;
            bgmAS.loop = loop;
            bgmAS.play();
            id = MUSIC_ID;
            break;
        }
        return id;
    }

    /**
     * 音效開關
     */
    public enable(able: boolean) {
        if (this.audioEnabled === able) return;
        this.audioEnabled = able;
        if (able) {
            audioPlayBGM(lastBGMName);
        } else {
            this.effectAudioSouceArr.forEach(eas => eas.stop());
            this.bgmAudioSouce.stop();
        }
    }
}

const buttonAudioMap: {[s:string]: string} = {};
export const CUSTOM_START_WITH = 'CUSTOM_';
export function buttonAudioPlay(audioName: string = '', playDefaultIfCustomIsEmpty: boolean = false) {
    const n = audioName;
    let str: string;
    if (n.startsWith(CUSTOM_START_WITH)) {
        str = audioGetCustomButtonAudioName(n.replace(CUSTOM_START_WITH, ''));
        if (playDefaultIfCustomIsEmpty && !str) {
            str = audioDefaultButtonAudioName();
        }
    } else {
        str = str || audioDefaultButtonAudioName();
    }
    audioPlay(str, { throttle: 10 });
}

export function audioGetCustomButtonAudioName(key: string) {
    const val = buttonAudioMap[key] || '';
    if (!val) {
        warn('audioGetButtonAudioName is empty', key);
    }
    return val;
}

export function audioSetCustomButtonAudioName(key: string, name: string): void {
    buttonAudioMap[key] = name;
}

export function audioPreload(name: string | string[]) {
    if (Array.isArray(name)) {
        name.forEach((n) => {
            audioReady(n);
        });
    } else {
        audioReady(name);
    }
}

globalDebugNNN(audioPlay, 'audioPlay', false);
