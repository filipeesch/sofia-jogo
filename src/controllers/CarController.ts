import * as THREE from 'three';
import { Car } from '../entities/Car';
import type { Solid } from '../utils';
import { clamp } from '../utils';

function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

// Grounded, forgiving car control: auto-forward, steer left/right, stays on the terrain.
export class CarController {
  readonly forward = new THREE.Vector3();
  readonly speed = 9;
  readonly maxRadius = 120;
  yaw = 0;
  onSpecial?: () => void;
  onBounce?: () => void;

  private steerX = 0;
  private lastBounce = 0;

  constructor(readonly car: Car) {}

  setSteer(x: number, _y: number): void {
    this.steerX = clamp(x, -1, 1);
  }

  triggerSpecial(): void {
    this.onSpecial?.();
  }

  update(dt: number, terrainHeight: (x: number, z: number) => number): void {
    const p = this.car.position;
    this.yaw += this.steerX * 1.5 * dt;

    const horiz = Math.hypot(p.x, p.z);
    if (horiz > this.maxRadius) {
      const back = Math.atan2(-p.x, -p.z);
      const diff = wrapAngle(back - this.yaw);
      this.yaw += clamp(diff, -1.6 * dt, 1.6 * dt);
    }

    this.car.rotation.order = 'YXZ';
    this.car.rotation.y = this.yaw;
    this.car.rotation.x = 0;
    this.car.rotation.z = 0;

    this.forward.set(0, 0, 1).applyEuler(this.car.rotation).normalize();
    p.addScaledVector(this.forward, this.speed * dt);
    p.y = terrainHeight(p.x, p.z) + 0.9;
  }

  resolveCollisions(solids: Solid[], _terrainHeight: (x: number, z: number) => number): void {
    const p = this.car.position;
    for (const s of solids) {
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const minDist = s.r + 1.2;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDist * minDist && p.y < s.y + s.h) {
        const d = Math.sqrt(d2) || 0.001;
        const push = minDist - d;
        p.x += (dx / d) * push;
        p.z += (dz / d) * push;
        this.bounce();
        break;
      }
    }
  }

  private bounce(): void {
    const now = performance.now();
    if (now - this.lastBounce < 400) return;
    this.lastBounce = now;
    this.car.playBounce();
    this.onBounce?.();
  }
}
