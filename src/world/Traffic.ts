import * as THREE from 'three';
import { Roads } from './Roads';
import { rand } from '../utils';

class TrafficCar extends THREE.Group {
  private path: THREE.Vector3[];
  private idx: number;
  private dir = 1;
  private speed: number;
  private q = new THREE.Quaternion();
  private wheels: { o: THREE.Object3D; axis: THREE.Vector3 }[] = [];

  constructor(model: THREE.Group, path: THREE.Vector3[]) {
    super();
    const c = model.clone();
    this.add(c);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
      if (o.name.startsWith('Wheel')) {
        this.wheels.push({ o, axis: new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion.clone().invert()).normalize() });
      }
    });
    this.path = path;
    this.speed = rand(4, 6.5);
    this.idx = Math.floor(rand(0, path.length - 1));
    this.position.set(path[this.idx].x, 0, path[this.idx].z);
  }

  update(dt: number, terrainHeight: (x: number, z: number) => number): void {
    if (this.path.length < 2) return;
    const target = this.path[this.idx];
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) {
      this.idx += this.dir;
      if (this.idx >= this.path.length - 1) { this.idx = this.path.length - 2; this.dir = -1; }
      else if (this.idx <= 0) { this.idx = 1; this.dir = 1; }
      return;
    }
    this.position.x += (dx / dist) * this.speed * dt;
    this.position.z += (dz / dist) * this.speed * dt;
    this.position.y = terrainHeight(this.position.x, this.position.z) + 0.05;
    this.rotation.y = Math.atan2(dx, dz);
    for (const w of this.wheels) {
      this.q.setFromAxisAngle(w.axis, 6 * dt);
      w.o.quaternion.multiply(this.q);
    }
  }
}

export class Traffic {
  private cars: TrafficCar[] = [];

  constructor(model: THREE.Group | undefined, roads: Roads | undefined, count = 3) {
    if (!model || !roads) return;
    for (let i = 0; i < count && i < roads.paths.length; i++) {
      this.cars.push(new TrafficCar(model, roads.paths[i]));
    }
  }

  addToScene(scene: THREE.Scene): void {
    this.cars.forEach((c) => scene.add(c));
  }

  update(dt: number, terrainHeight: (x: number, z: number) => number): void {
    this.cars.forEach((c) => c.update(dt, terrainHeight));
  }
}
