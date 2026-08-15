import * as THREE from 'three';
import { rand, TAU } from '../utils';

// A friendly non-player airplane that circles the world (reuses the aviao.glb model).
class AmbientPlane extends THREE.Group {
  private propeller: THREE.Object3D | null = null;
  private spinAxis = new THREE.Vector3(0, 0, 1);
  private q = new THREE.Quaternion();
  private radius: number;
  private speed: number;
  private angle: number;
  private height: number;
  private tilt: number;

  constructor(model: THREE.Group) {
    super();
    const c = model.clone();
    this.add(c);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    this.propeller = c.getObjectByName('Propeller') ?? null;
    if (this.propeller) {
      this.spinAxis.set(0, 0, 1).applyQuaternion(this.propeller.quaternion.clone().invert()).normalize();
    }
    this.radius = rand(32, 56);
    this.speed = rand(0.12, 0.24);
    this.angle = rand(0, TAU);
    this.height = rand(14, 24);
    this.tilt = rand(0.06, 0.16);
  }

  update(dt: number): void {
    this.angle += this.speed * dt;
    const x = Math.cos(this.angle) * this.radius;
    const z = Math.sin(this.angle) * this.radius;
    this.position.set(x, this.height + Math.sin(this.angle * 2) * 1.5, z);
    this.rotation.y = -this.angle;
    this.rotation.z = this.tilt;
    if (this.propeller) {
      this.q.setFromAxisAngle(this.spinAxis, 12 * dt);
      this.propeller.quaternion.multiply(this.q);
    }
  }
}

// A small flock of ambient airplanes flying circles high above the world.
export class AmbientPlanes {
  private planes: AmbientPlane[] = [];

  constructor(model: THREE.Group | undefined, count = 4) {
    if (!model) return;
    for (let i = 0; i < count; i++) {
      this.planes.push(new AmbientPlane(model));
    }
  }

  addToScene(scene: THREE.Scene): void {
    this.planes.forEach((p) => scene.add(p));
  }

  update(dt: number): void {
    this.planes.forEach((p) => p.update(dt));
  }
}
