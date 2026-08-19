import * as THREE from 'three';
import { rand, TAU } from '../utils';

export class Animal extends THREE.Group {
  readonly type: string;
  private base: THREE.Vector3;
  private target: THREE.Vector3;
  private waitT: number;
  private wanderR: number;
  private hopT = 0;

  constructor(model: THREE.Group, x: number, z: number, type: string, wanderR = 14) {
    super();
    this.type = type;
    this.add(model);
    // Generous invisible tap target: the toy models are small and tablet taps
    // are imprecise, so Clickables raycasts against this sphere instead of
    // the mesh itself. `visible = false` keeps it out of rendering while the
    // raycaster still hits it.
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8));
    hit.visible = false;
    hit.position.y = 0.9;
    this.add(hit);
    this.base = new THREE.Vector3(x, 0, z);
    this.wanderR = wanderR;
    this.target = this.pickTarget();
    this.waitT = rand(0.5, 2.5);
    this.position.set(x, 0, z);
  }

  private pickTarget(): THREE.Vector3 {
    const a = rand(0, TAU);
    const r = rand(2, this.wanderR);
    return new THREE.Vector3(this.base.x + Math.cos(a) * r, 0, this.base.z + Math.sin(a) * r);
  }

  hop(): void {
    this.hopT = 0.4;
  }

  update(dt: number, terrainHeight: (x: number, z: number) => number): void {
    if (this.waitT > 0) {
      this.waitT -= dt;
      this.rotation.y += dt * 0.5;
      this.applyHop(dt);
      return;
    }
    const dx = this.target.x - this.position.x;
    const dz = this.target.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.6) {
      this.waitT = rand(1, 3);
      this.target = this.pickTarget();
      this.applyHop(dt);
      return;
    }
    const sp = 0.9;
    this.position.x += (dx / dist) * sp * dt;
    this.position.z += (dz / dist) * sp * dt;
    this.position.y = terrainHeight(this.position.x, this.position.z) + 0.15;
    this.rotation.y = Math.atan2(dx, dz);
    this.applyHop(dt);
  }

  private applyHop(dt: number): void {
    if (this.hopT > 0) {
      this.hopT -= dt;
      const k = Math.max(0, this.hopT) / 0.4;
      this.scale.setScalar(1 + Math.sin((1 - k) * Math.PI) * 0.18);
    } else {
      this.scale.setScalar(1);
    }
  }
}
