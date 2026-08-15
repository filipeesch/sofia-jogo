import * as THREE from 'three';
import { clamp, lerp } from '../utils';

export interface DayNightState {
  nightAmount: number;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  fogColor: THREE.Color;
  lightColor: THREE.Color;
  lightIntensity: number;
  ambientColor: THREE.Color;
  groundColor: THREE.Color;
  ambientIntensity: number;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
}

export interface DayNightConfig {
  cycleSeconds?: number;
  startNight?: boolean;
  dayTop?: number;
  dayHorizon?: number;
}

// Continuous day/night cycle with smooth, child-friendly transitions.
export class DayNightCycle {
  readonly sunDir = new THREE.Vector3(0.5, 0.75, 0.35).normalize();
  readonly moonDir = new THREE.Vector3(-0.4, 0.55, -0.5).normalize();

  private elapsed = 0;
  private cycleSeconds: number;

  private cDayTop = new THREE.Color(0x54b3f0);
  private cDayHorizon = new THREE.Color(0xcfeffb);
  private cDayFog = new THREE.Color(0xcfeffb);
  private cDayLight = new THREE.Color(0xfff4dc);
  private cDayAmbient = new THREE.Color(0xcfe4ff);
  private cDayGround = new THREE.Color(0x9fd08a);

  private cNightTop = new THREE.Color(0x16305e);
  private cNightHorizon = new THREE.Color(0x2c4f86);
  private cNightFog = new THREE.Color(0x2c4f86);
  private cNightLight = new THREE.Color(0xa9c8ff);
  private cNightAmbient = new THREE.Color(0x6c86c8);
  private cNightGround = new THREE.Color(0x2f4a3a);

  private cSunsetTop = new THREE.Color(0x8a63c8);
  private cSunsetHorizon = new THREE.Color(0xff9e4d);
  private cSunsetLight = new THREE.Color(0xffb46b);

  private cDawnTop = new THREE.Color(0x4a68b0);
  private cDawnHorizon = new THREE.Color(0xffb46b);
  private cDawnLight = new THREE.Color(0xffc98a);

  constructor(config: DayNightConfig = {}) {
    this.cycleSeconds = config.cycleSeconds ?? 150;
    if (config.dayTop !== undefined) this.cDayTop.set(config.dayTop);
    if (config.dayHorizon !== undefined) {
      this.cDayHorizon.set(config.dayHorizon);
      this.cDayFog.set(config.dayHorizon);
    }
    if (config.startNight) this.elapsed = 0.55 * this.cycleSeconds;
  }

  update(dt: number): DayNightState {
    this.elapsed += dt;
    const t = (this.elapsed % this.cycleSeconds) / this.cycleSeconds;

    // Night amount: 0 = day, 1 = night, with sunset/dawn ramps.
    let night = 0;
    if (t >= 0.45 && t < 0.52) night = (t - 0.45) / 0.07;
    else if (t >= 0.52 && t < 0.85) night = 1;
    else if (t >= 0.85 && t < 0.92) night = 1 - (t - 0.85) / 0.07;
    night = clamp(night, 0, 1);

    const sunset = clamp(1 - Math.abs(t - 0.485) / 0.035, 0, 1);
    const dawn = clamp(1 - Math.abs(t - 0.885) / 0.035, 0, 1);
    const warm = clamp(sunset + dawn, 0, 1);
    const useSunset = sunset >= dawn;

    const skyTop = new THREE.Color().copy(this.cDayTop).lerp(this.cNightTop, night);
    skyTop.lerp(useSunset ? this.cSunsetTop : this.cDawnTop, warm * 0.5);

    const skyHorizon = new THREE.Color().copy(this.cDayHorizon).lerp(this.cNightHorizon, night);
    skyHorizon.lerp(useSunset ? this.cSunsetHorizon : this.cDawnHorizon, warm * 0.85);

    const fogColor = new THREE.Color().copy(this.cDayFog).lerp(this.cNightFog, night);
    fogColor.lerp(useSunset ? this.cSunsetHorizon : this.cDawnHorizon, warm * 0.6);

    const lightColor = new THREE.Color().copy(this.cDayLight).lerp(this.cNightLight, night);
    lightColor.lerp(useSunset ? this.cSunsetLight : this.cDawnLight, warm * 0.7);

    const ambientColor = new THREE.Color().copy(this.cDayAmbient).lerp(this.cNightAmbient, night);
    const groundColor = new THREE.Color().copy(this.cDayGround).lerp(this.cNightGround, night);

    const lightIntensity = lerp(2.4, 1.15, night);
    const ambientIntensity = lerp(1.0, 0.8, night);

    return {
      nightAmount: night,
      skyTop,
      skyHorizon,
      fogColor,
      lightColor,
      lightIntensity,
      ambientColor,
      groundColor,
      ambientIntensity,
      sunDir: this.sunDir,
      moonDir: this.moonDir
    };
  }
}
