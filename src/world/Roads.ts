import * as THREE from 'three';

// A small street grid: straight roads that cross like a tiny town (not a loop).
export class Roads extends THREE.Group {
  constructor() {
    super();
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x48515c, roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0e6a8, roughness: 0.9 });

    for (const z of [-15, 0, 15]) this.segment(160, 3.4, 0, z, roadMat, lineMat, false);
    for (const x of [-18, 18]) this.segment(3.4, 160, x, 0, roadMat, lineMat, true);
  }

  private segment(w: number, d: number, cx: number, cz: number, roadMat: THREE.Material, lineMat: THREE.Material, vertical: boolean): void {
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), roadMat);
    road.position.set(cx, 0.03, cz);
    road.receiveShadow = true;
    this.add(road);

    const line = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.25 : w, 0.02, vertical ? d : 0.25), lineMat);
    line.position.set(cx, 0.07, cz);
    this.add(line);
  }
}
