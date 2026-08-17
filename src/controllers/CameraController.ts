import * as THREE from 'three';
import { dampVector } from '../utils';

// Third-person chase camera: behind and slightly above, smooth and calm.
// Both the position AND the look target are exponentially damped (frame-rate
// independent), so the view glides through bends, climbs and the 180° U-turns
// instead of jumping with every path sample.
export class CameraController {
  private desired = new THREE.Vector3();
  private look = new THREE.Vector3();
  private lookDesired = new THREE.Vector3();
  private lookReady = false;
  private tmp = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera, private distance = 9, private height = 3.6) {}

  update(dt: number, airplane: THREE.Object3D, forward: THREE.Vector3): void {
    this.tmp.copy(forward).multiplyScalar(-this.distance);
    this.desired.copy(airplane.position).add(this.tmp);
    this.desired.y += this.height;

    dampVector(this.camera.position, this.camera.position, this.desired, 4.5, dt);

    this.lookDesired.copy(airplane.position).addScaledVector(forward, 6);
    this.lookDesired.y += 0.5;
    if (!this.lookReady) {
      this.look.copy(this.lookDesired);
      this.lookReady = true;
    } else {
      // The look target chases a little faster than the position so the gaze
      // leads the body into the turn without lagging behind the car/plane.
      dampVector(this.look, this.look, this.lookDesired, 9, dt);
    }
    this.camera.lookAt(this.look);
  }
}
