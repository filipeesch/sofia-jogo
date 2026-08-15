import * as THREE from 'three';
import { Airplane } from '../entities/Airplane';
import { dampVector } from '../utils';

// Third-person chase camera: behind and slightly above, smooth and calm.
export class CameraController {
  private desired = new THREE.Vector3();
  private look = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  update(dt: number, airplane: Airplane, forward: THREE.Vector3): void {
    this.tmp.copy(forward).multiplyScalar(-9);
    this.desired.copy(airplane.position).add(this.tmp);
    this.desired.y += 3.6;

    dampVector(this.camera.position, this.camera.position, this.desired, 4.5, dt);

    this.look.copy(airplane.position).addScaledVector(forward, 6);
    this.look.y += 0.5;
    this.camera.lookAt(this.look);
  }
}
