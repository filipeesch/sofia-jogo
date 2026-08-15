import * as THREE from 'three';
import { makeStarTexture, rand, TAU } from '../utils';
import { ParticleEffects } from './ParticleEffects';
import { AudioManager } from './AudioManager';

interface Star {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  base: number;
  baseY: number;
  bob: number;
  active: boolean;
  popping: boolean;
  popT: number;
  respawn: number;
}

// Big, friendly collectible stars that respawn forever.
export class Collectibles {
  count = 0;
  onCollect?: (count: number) => void;

  private stars: Star[] = [];
  private group = new THREE.Group();
  private texture = makeStarTexture();
  private center = new THREE.Vector3();
  private radius = 50;
  private night = 0;

  build(center: THREE.Vector3, radius: number, count = 16): void {
    this.center.copy(center);
    this.radius = radius;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(mat);
      this.group.add(sprite);
      const star: Star = {
        sprite,
        mat,
        base: 2,
        baseY: 0,
        bob: rand(0, TAU),
        active: true,
        popping: false,
        popT: 0,
        respawn: 0
      };
      this.placeStar(star);
      this.stars.push(star);
    }
  }

  private placeStar(st: Star): void {
    const a = rand(0, TAU);
    const r = rand(8, this.radius);
    st.sprite.position.set(this.center.x + Math.cos(a) * r, rand(3.5, 19), this.center.z + Math.sin(a) * r);
    st.baseY = st.sprite.position.y;
    st.base = rand(1.8, 2.6);
    st.sprite.scale.setScalar(st.base);
    st.mat.opacity = 1;
    st.sprite.visible = true;
    st.active = true;
    st.popping = false;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  setNight(n: number): void {
    this.night = n;
  }

  update(dt: number, planePos: THREE.Vector3, particles: ParticleEffects, audio: AudioManager): void {
    const t = performance.now() * 0.001;

    for (const st of this.stars) {
      st.mat.rotation = st.bob + t * 0.4;

      if (st.popping) {
        st.popT += dt;
        const k = st.popT / 0.28;
        if (k >= 1) {
          st.popping = false;
          st.sprite.visible = false;
          st.respawn = rand(6, 10);
          continue;
        }
        st.sprite.scale.setScalar(st.base * (1 + 1.8 * k));
        st.mat.opacity = 1 - k;
        continue;
      }

      if (!st.active) {
        st.respawn -= dt;
        if (st.respawn <= 0) this.placeStar(st);
        continue;
      }

      st.sprite.position.y = st.baseY + Math.sin(t * 1.5 + st.bob) * 0.4;
      st.sprite.scale.setScalar(st.base * (1 + this.night * 0.35));
      st.mat.opacity = 1;

      if (planePos.distanceTo(st.sprite.position) < 2.8) {
        st.active = false;
        st.popping = true;
        st.popT = 0;
        particles.burst(st.sprite.position, {
          count: 20,
          color: 0xffd54a,
          speed: 3,
          gravity: -2,
          life: 1.0,
          size: 6,
          biasY: 2
        });
        audio.collect();
        this.count++;
        this.onCollect?.(this.count);
      }
    }
  }
}
