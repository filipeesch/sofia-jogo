import * as THREE from 'three';
import { Airplane } from '../entities/Airplane';
import type { Solid } from '../utils';
import { clamp, damp } from '../utils';

function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

// Gentle, forgiving flight model: auto-forward, no way to lose.
export class FlightController {
  readonly forward = new THREE.Vector3();
  readonly speed = 11;
  readonly minAltitude = 3.2;
  readonly maxAltitude = 26;
  readonly maxRadius = 120;

  yaw = 0;
  pitch = 0;

  private bank = 0;
  private steerX = 0; // -1..1 turn (right positive)
  private steerY = 0; // -1..1 climb (up positive)
  private spin = 0; // pirouette roll
  private spinTarget = 0;
  private lastBounce = 0;

  onSpecial?: () => void;
  onBounce?: () => void;

  constructor(readonly airplane: Airplane) {}

  setSteer(x: number, y: number): void {
    this.steerX = clamp(x, -1, 1);
    this.steerY = clamp(y, -1, 1);
  }

  triggerSpecial(): void {
    this.spinTarget += Math.PI * 2;
    this.onSpecial?.();
  }

  update(dt: number, terrainHeight: (x: number, z: number) => number): void {
    const p = this.airplane.position;

    // Turning (rate control). Mouse/drag right = turn right on screen.
    this.yaw -= this.steerX * 1.7 * dt;

    // Climb / descent target from vertical input.
    let targetPitch = this.steerY * 0.55;

    const horiz = Math.hypot(p.x, p.z);

    // Soft altitude limits.
    const ground = terrainHeight(p.x, p.z) + 1.1;
    if (p.y < ground) targetPitch = Math.max(targetPitch, 0.6);
    if (p.y > this.maxAltitude - 3) targetPitch = Math.min(targetPitch, -0.35);
    else if (p.y < this.minAltitude) targetPitch = Math.max(targetPitch, 0.35);

    // Soft radius limit: gently turn back toward the island.
    if (horiz > this.maxRadius) {
      const back = Math.atan2(-p.x, -p.z);
      const diff = wrapAngle(back - this.yaw);
      this.yaw += clamp(diff, -1.8 * dt, 1.8 * dt);
      if (p.y < 6) targetPitch = Math.max(targetPitch, 0.3);
    }

    this.pitch = damp(this.pitch, targetPitch, 3, dt);
    this.bank = damp(this.bank, this.steerX * 0.5, 5, dt);

    // Pirouette roll (special action) — a roll around the forward axis,
    // so it never changes the trajectory.
    if (this.spinTarget > 0.01) {
      const step = Math.min(8 * dt, this.spinTarget);
      this.spin += step;
      this.spinTarget -= step;
    } else {
      this.spin = damp(this.spin, 0, 5, dt);
    }

    // Orientation (YXZ so roll never affects the heading).
    this.airplane.rotation.order = 'YXZ';
    this.airplane.rotation.y = this.yaw;
    this.airplane.rotation.x = -this.pitch;
    this.airplane.rotation.z = this.bank + this.spin;

    // Move forward along the nose direction.
    this.forward.set(0, 0, 1).applyEuler(this.airplane.rotation).normalize();
    p.addScaledVector(this.forward, this.speed * dt);

    // Hard safety clamp.
    p.y = clamp(p.y, 2.2, this.maxAltitude + 4);
  }

  resolveCollisions(solids: Solid[], terrainHeight: (x: number, z: number) => number): void {
    const p = this.airplane.position;

    // Ground: never bury the plane.
    const ground = terrainHeight(p.x, p.z) + 1.1;
    if (p.y < ground) {
      p.y = ground;
      this.pitch = Math.max(this.pitch, 0.35);
      this.bounce();
    }

    // Solid obstacles: gentle "boing" push away.
    for (const s of solids) {
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const minDist = s.r + 1.4;
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
    this.airplane.playBounce();
    this.onBounce?.();
  }
}
