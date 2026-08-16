import * as THREE from 'three';
import { World } from '../world/World';
import { ParticleEffects } from './ParticleEffects';
import { AudioManager } from './AudioManager';

// Simple proximity triggers with cooldowns so nothing fires constantly.
export class ProximityEvents {
  onRainbow?: () => void;

  private whaleCd = 0;
  private rainbowCd = 0;
  private birdCd = 0;
  private houseCd = 0;
  private cloudCd = 0;

  constructor(
    private world: World,
    private particles: ParticleEffects,
    private audio: AudioManager,
    private airplane: THREE.Object3D
  ) {}

  update(dt: number, nightAmount: number): void {
    this.whaleCd = Math.max(0, this.whaleCd - dt);
    this.rainbowCd = Math.max(0, this.rainbowCd - dt);
    this.birdCd = Math.max(0, this.birdCd - dt);
    this.houseCd = Math.max(0, this.houseCd - dt);
    this.cloudCd = Math.max(0, this.cloudCd - dt);

    const p = this.airplane.position;

    // Whale leaps out of the water (island only).
    const whale = this.world.whale;
    if (whale && this.whaleCd <= 0 && p.distanceTo(whale.position) < 16) {
      whale.jump();
      const surf = whale.position.clone();
      surf.y = 0;
      this.particles.burst(surf, {
        count: 26,
        color: 0xbfe4ff,
        speed: 3.5,
        gravity: -7,
        life: 0.8,
        size: 6,
        biasY: 4
      });
      this.audio.splash();
      this.whaleCd = 7;
    }

    // Rainbow crossing: colorful burst + sound + temporary trail.
    if (this.rainbowCd <= 0 && p.distanceTo(this.world.rainbow.position) < 13) {
      this.world.rainbow.pulse();
      for (const c of [0xff5a5a, 0xffa53a, 0xfff45a, 0x5ad65a, 0x4aa8ff, 0x9a5aff]) {
        this.particles.burst(p.clone(), {
          count: 6,
          color: c,
          speed: 2.5,
          gravity: 0.3,
          life: 1.0,
          size: 5,
          biasY: 1.5
        });
      }
      this.audio.rainbow();
      this.onRainbow?.();
      this.rainbowCd = 6;
    }

    // Birds start flying around.
    if (this.birdCd <= 0) {
      for (const b of this.world.birds) {
        if (p.distanceTo(b.position) < 11) {
          b.fly();
          this.audio.plim();
          this.birdCd = 9;
          break;
        }
      }
    }

    // House lights blink when approached at night.
    if (nightAmount > 0.5 && this.houseCd <= 0) {
      for (const h of this.world.houses) {
        if (p.distanceTo(h.position) < 14) {
          h.blink();
          this.houseCd = 5;
          break;
        }
      }
    }

    // Magic cloud: confetti puff.
    if (this.cloudCd <= 0) {
      for (const c of this.world.clouds) {
        if (p.distanceTo(c.position) < 6) {
          this.particles.burst(p.clone(), {
            count: 14,
            color: 0xffffff,
            speed: 2,
            gravity: 0.3,
            life: 1.1,
            size: 5,
            biasY: 1
          });
          this.particles.burst(p.clone(), {
            count: 8,
            color: 0xff8fb3,
            speed: 2,
            gravity: 0.3,
            life: 1.0,
            size: 4,
            biasY: 1
          });
          this.audio.plim();
          this.cloudCd = 3;
          break;
        }
      }
    }
  }
}
