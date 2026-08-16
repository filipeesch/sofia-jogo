import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Toy car built in Blender. Front points +Z (same convention as the airplane).
export class Car extends THREE.Group {
  private wheels: { o: THREE.Object3D; axis: THREE.Vector3 }[] = [];
  private q = new THREE.Quaternion();
  private bounceT = 0;

  constructor(procedural = true) {
    super();
    if (procedural) this.buildProcedural();
  }

  static async fromGLB(url: string): Promise<Car> {
    const gltf: { scene: THREE.Group } = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
    const car = new Car(false);
    car.add(gltf.scene);
    gltf.scene.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
      if (o.name.startsWith('Wheel')) {
        car.wheels.push({ o, axis: new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion.clone().invert()).normalize() });
      }
    });
    return car;
  }

  private buildProcedural(): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0f0, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.4), mat);
    body.position.y = 0.62;
    body.castShadow = true;
    this.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 1.1), glass);
    cabin.position.set(0, 1.18, -0.15);
    cabin.castShadow = true;
    this.add(cabin);
    for (const [sx, sz] of [[-0.78, -0.82], [0.78, -0.82], [-0.78, 0.82], [0.78, 0.82]] as [number, number][]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16), dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx, 0.36, sz);
      this.add(w);
    }
  }

  setNightLights(_on: boolean): void {}

  playBounce(): void {
    this.bounceT = 0.28;
  }

  update(dt: number): void {
    for (const w of this.wheels) {
      this.q.setFromAxisAngle(w.axis, 9 * dt);
      w.o.quaternion.multiply(this.q);
    }
    if (this.bounceT > 0) {
      this.bounceT -= dt;
      const k = Math.max(0, this.bounceT) / 0.28;
      this.scale.setScalar(1 + Math.sin((1 - k) * Math.PI) * 0.15);
    } else {
      this.scale.setScalar(1);
    }
  }
}
