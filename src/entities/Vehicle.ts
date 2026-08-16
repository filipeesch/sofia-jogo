import * as THREE from 'three';
import type { Solid } from '../utils';

// Common shape shared by Airplane and Car so the Game can drive either.
export type Vehicle = THREE.Group & {
  update(dt: number): void;
  setNightLights(on: boolean): void;
  playBounce(): void;
};

export type VehicleController = {
  forward: THREE.Vector3;
  yaw: number;
  setSteer(x: number, y: number): void;
  triggerSpecial(): void;
  update(dt: number, terrainHeight: (x: number, z: number) => number): void;
  resolveCollisions(solids: Solid[], terrainHeight: (x: number, z: number) => number): void;
  onSpecial?: () => void;
  onBounce?: () => void;
};
