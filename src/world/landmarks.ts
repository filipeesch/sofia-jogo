import * as THREE from 'three';
import { rand, TAU } from '../utils';

// A cozy little house with windows that light up (and can blink) at night.
export class House extends THREE.Group {
  private windowMats: THREE.MeshStandardMaterial[] = [];
  private blinkTimer = 0;
  private lightsOn = false;

  constructor(color: number, roofColor: number, model?: THREE.Group) {
    super();

    if (model) {
      this.add(model);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // Clone materials per instance so each house can have its own tint.
        if (Array.isArray(m.material)) m.material = m.material.map((mm) => mm.clone());
        else m.material = m.material.clone();
        const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
        for (const mm of mats) {
          if (mm.name === 'Windows') this.windowMats.push(mm);
          else if (mm.name === 'Body') mm.color.set(color);
          else if (mm.name === 'Roof') mm.color.set(roofColor);
        }
      });
      return;
    }

    // Procedural fallback.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.6, 2.2),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;
    this.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, flatShading: true })
    );
    roof.position.y = 2.2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.add(roof);

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x2b3a4a,
      emissive: 0xffd76b,
      emissiveIntensity: 0,
      roughness: 0.3
    });
    this.windowMats.push(windowMat);
    for (let i = 0; i < 2; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.1), windowMat);
      w.position.set(-0.6 + i * 1.2, 0.95, 1.11);
      this.add(w);
    }

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.9, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
    );
    door.position.set(0, 0.45, 1.11);
    this.add(door);
  }

  setLights(on: boolean): void {
    this.lightsOn = on;
    if (this.blinkTimer <= 0) this.applyLights(on);
  }

  blink(): void {
    this.blinkTimer = 2.2;
  }

  private applyLights(on: boolean): void {
    for (const m of this.windowMats) {
      m.emissive.set(on ? 0xffd76b : 0x000000);
      m.emissiveIntensity = on ? 1.4 : 0;
    }
  }

  update(dt: number): void {
    if (this.blinkTimer > 0) {
      this.blinkTimer -= dt;
      const on = this.lightsOn && Math.floor(this.blinkTimer * 8) % 2 === 0;
      this.applyLights(on);
      if (this.blinkTimer <= 0) this.applyLights(this.lightsOn);
    }
  }
}

// A friendly whale that leaps out of the water and splashes back.
export class Whale extends THREE.Group {
  private jumping = false;
  private t = 0;
  private baseY: number;

  constructor(model?: THREE.Group) {
    super();
    this.baseY = -1.2;

    if (model) {
      this.add(model);
      return;
    }

    const mat = new THREE.MeshStandardMaterial({ color: 0x5c8bd6, roughness: 0.6, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), mat);
    body.scale.set(1.6, 1, 1);
    this.add(body);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.8, 8), mat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -2.6;
    this.add(tail);

    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xeaf3ff, roughness: 0.6 })
    );
    belly.scale.set(1.5, 0.7, 1.1);
    belly.position.set(0, -1.1, 0.4);
    this.add(belly);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x101820 })
    );
    eye.position.set(0.5, 0.4, 2.0);
    this.add(eye);
  }

  jump(): void {
    if (!this.jumping) {
      this.jumping = true;
      this.t = 0;
    }
  }

  update(dt: number): void {
    if (!this.jumping) {
      this.position.y = this.baseY + Math.sin(performance.now() * 0.001) * 0.1;
      return;
    }
    this.t += dt;
    const d = this.t / 1.4;
    if (d >= 1) {
      this.jumping = false;
      this.t = 0;
      this.position.y = this.baseY;
      this.rotation.x = 0;
      return;
    }
    this.position.y = this.baseY + Math.sin(d * Math.PI) * 3.6;
    this.rotation.x = -Math.sin(d * Math.PI) * 0.4;
  }
}

// A simple bird that idles, and circles around when startled.
export class Bird extends THREE.Group {
  private base = new THREE.Vector3();
  private flying = false;
  private timer = 0;
  private phase = rand(0, TAU);
  private wings: THREE.Mesh[] = [];

  constructor(color: number, model?: THREE.Group) {
    super();
    if (model) {
      this.add(model);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && (m.name === 'WingL' || m.name === 'WingR')) this.wings.push(m);
      });
      return;
    }
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mat);
    body.scale.set(1, 0.8, 1.4);
    this.add(body);

    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.6 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.05, 0.45);
    this.add(beak);

    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.4), mat);
      wing.position.set(s * 0.55, 0, -0.05);
      this.add(wing);
      this.wings.push(wing);
    }
  }

  place(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.base.set(x, y, z);
  }

  fly(): void {
    this.flying = true;
    this.timer = 5;
  }

  update(dt: number, tGlobal: number): void {
    if (this.flying) {
      this.timer -= dt;
      const a = tGlobal * 2.2 + this.phase;
      this.position.set(
        this.base.x + Math.cos(a) * 4,
        this.base.y + Math.sin(a * 0.7) * 1.5 + 1,
        this.base.z + Math.sin(a) * 4
      );
      if (this.timer <= 0) this.flying = false;
    } else {
      this.position.y = this.base.y + Math.sin(tGlobal * 1.5 + this.phase) * 0.3;
    }
    for (const w of this.wings) {
      w.rotation.z = Math.sin(tGlobal * 10 + this.phase) * 0.4 * (this.flying ? 1 : 0.4);
    }
  }
}

// A fluffy cloud made of a few spheres that drifts across the sky.
export class Cloud extends THREE.Group {
  private speed: number;
  private range: number;

  constructor() {
    super();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const puffs: [number, number, number, number][] = [
      [0, 0, 0, 1.6],
      [1.3, 0.2, 0.3, 1.1],
      [-1.3, 0.15, 0.2, 1.1],
      [0.5, 0.45, 0, 0.9],
      [-0.4, 0.4, 0.1, 0.9]
    ];
    for (const [x, y, z, s] of puffs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat);
      m.position.set(x, y, z);
      this.add(m);
    }
    this.speed = rand(0.6, 1.4);
    this.range = rand(60, 90);
  }

  update(dt: number): void {
    this.position.x += this.speed * dt;
    if (this.position.x > this.range) this.position.x = -this.range;
  }
}

// A colorful rainbow arch that pulses when the plane crosses it.
export class Rainbow extends THREE.Group {
  private mats: THREE.MeshBasicMaterial[] = [];
  private pulseT = 0;

  constructor() {
    super();
    const colors = [0xff5a5a, 0xffa53a, 0xfff45a, 0x5ad65a, 0x4aa8ff, 0x9a5aff];
    for (let i = 0; i < 6; i++) {
      const r = 13 - i * 0.8;
      const geo = new THREE.TorusGeometry(r, 0.42, 8, 40, Math.PI);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.y = i * 0.42;
      this.add(m);
      this.mats.push(mat);
    }
  }

  pulse(): void {
    this.pulseT = 2.0;
  }

  update(dt: number): void {
    if (this.pulseT > 0) {
      this.pulseT -= dt;
      const s = 1 + Math.sin(this.pulseT * 12) * 0.08 * (this.pulseT / 2);
      this.scale.setScalar(Math.max(1, s));
    } else {
      this.scale.setScalar(1);
    }
  }
}

// A colorful hot-air balloon that bobs gently.
export class Balloon extends THREE.Group {
  private phase = rand(0, TAU);
  private speed = rand(0.5, 1.2);

  constructor(color: number, model?: THREE.Group) {
    super();
    if (model) {
      this.add(model);
      return;
    }
    const env = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 12, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    env.scale.set(1, 1.25, 1);
    this.add(env);

    const basket = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.8 })
    );
    basket.position.y = -1.8;
    this.add(basket);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.1, 0), new THREE.Vector3(0, -1.7, 0)]),
      new THREE.LineBasicMaterial({ color: 0x7a6a5a })
    );
    this.add(line);
  }

  update(dt: number, tGlobal: number): void {
    this.position.y += Math.sin(tGlobal * this.speed + this.phase) * 0.02;
    this.rotation.z = Math.sin(tGlobal * this.speed * 0.6 + this.phase) * 0.08;
  }
}
