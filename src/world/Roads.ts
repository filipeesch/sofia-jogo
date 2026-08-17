import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Road control polylines live in src/rails/roadDefs.ts (single source of
// truth shared with the on-rails tour builder, Node-importable).
import { ROAD_DEFS, type RoadKind } from '../rails/roadDefs';

// Curved roads (splines) that follow the terrain, with paths for traffic.
//
// Performance: instead of one Mesh per segment (previously ~2 meshes × ~70
// segments × N roads ≈ 560–840 draw calls), every segment box is baked into a
// single merged BufferGeometry per material — the whole road network renders
// as just 2 draw calls.
export class Roads extends THREE.Group {
  readonly paths: THREE.Vector3[][] = [];

  private static readonly _m = new THREE.Matrix4();

  constructor(terrainHeight: (x: number, z: number) => number, readonly kind: RoadKind = 'grid') {
    super();
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x48515c, roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0e6a8, roughness: 0.9 });

    const roadGeos: THREE.BufferGeometry[] = [];
    const lineGeos: THREE.BufferGeometry[] = [];

    const defs = ROAD_DEFS[kind];
    for (const def of defs) {
      const pts = this.sample(def);
      const path3 = pts.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z), z));
      for (let i = 0; i < path3.length - 1; i++) {
        this.pushSegment(path3[i], path3[i + 1], roadGeos, lineGeos);
      }
      this.paths.push(pts.map(([x, z]) => new THREE.Vector3(x, z, 0)));
    }

    if (roadGeos.length) {
      const road = new THREE.Mesh(mergeGeometries(roadGeos), roadMat);
      road.receiveShadow = true;
      this.add(road);
    }
    if (lineGeos.length) {
      const line = new THREE.Mesh(mergeGeometries(lineGeos), lineMat);
      this.add(line);
    }

    // Drop the per-segment geometries once merged.
    roadGeos.forEach((g) => g.dispose());
    lineGeos.forEach((g) => g.dispose());
  }

  private sample(def: [number, number][]): [number, number][] {
    const pts = def.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = 70;
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const p = curve.getPoint(i / n);
      out.push([p.x, p.z]);
    }
    return out;
  }

  private pushSegment(
    a: THREE.Vector3,
    b: THREE.Vector3,
    roadGeos: THREE.BufferGeometry[],
    lineGeos: THREE.BufferGeometry[]
  ): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return;
    const y = Math.max(a.y, b.y) + 0.05;
    const mid = new THREE.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    const rotY = Math.atan2(dx, dz);

    const roadGeo = new THREE.BoxGeometry(3.4, 0.08, len + 0.35);
    Roads._m.makeRotationY(rotY).setPosition(mid);
    roadGeo.applyMatrix4(Roads._m);
    roadGeos.push(roadGeo);

    const lineLen = len - 0.6;
    if (lineLen > 0.01) {
      const lineMid = mid.clone().add(new THREE.Vector3(0, 0.045, 0));
      const lineGeo = new THREE.BoxGeometry(0.22, 0.03, lineLen);
      Roads._m.makeRotationY(rotY).setPosition(lineMid);
      lineGeo.applyMatrix4(Roads._m);
      lineGeos.push(lineGeo);
    }
  }
}
