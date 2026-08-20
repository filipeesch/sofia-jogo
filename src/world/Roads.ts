import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Curved roads (splines) that follow the terrain, with paths for the tour.
// The control polylines come from the caller (World): the procedural
// ROAD_DEFS (src/rails/roadDefs.ts) for the shipped levels, or a LevelData's
// roads for data-driven levels (map editor).
//
// Performance: instead of one Mesh per segment (previously ~2 meshes × ~70
// segments × N roads ≈ 560–840 draw calls), every segment box is baked into a
// single merged BufferGeometry per material — the whole road network renders
// as just 2 draw calls.
//
// Terrain following: each segment is PITCHED along the (lightly smoothed)
// terrain profile, so hillsides read as a continuous ramp — never a
// stair-step of horizontal treads.
export class Roads extends THREE.Group {
  readonly paths: THREE.Vector3[][] = [];

  private static readonly _m = new THREE.Matrix4();

  constructor(terrainHeight: (x: number, z: number) => number, readonly defs: [number, number][][]) {
    super();
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x48515c, roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0e6a8, roughness: 0.9 });

    const roadGeos: THREE.BufferGeometry[] = [];
    const lineGeos: THREE.BufferGeometry[] = [];

    for (const def of defs) {
      const pts = this.sample(def);
      const path3 = this.heights(pts, terrainHeight);
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

  // Terrain heights for the sampled points, lightly smoothed (5-tap window)
  // so the ribbon blends with the ground instead of chasing every bump.
  private heights(pts: [number, number][], terrainHeight: (x: number, z: number) => number): THREE.Vector3[] {
    const raw = pts.map(([x, z]) => terrainHeight(x, z));
    const n = raw.length;
    return pts.map(([x, z], i) => {
      let s = 0;
      let c = 0;
      for (let k = -2; k <= 2; k++) {
        const j = Math.max(0, Math.min(n - 1, i + k));
        s += raw[j];
        c++;
      }
      return new THREE.Vector3(x, s / c, z);
    });
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
    const rotY = Math.atan2(dx, dz);
    // Pitch along the local slope: local +Z ends at b, so a positive rise
    // (b.y > a.y) needs a negative X-rotation to lift the +Z end.
    const ang = -Math.atan2(b.y - a.y, len);
    const mRot = new THREE.Matrix4().makeRotationY(rotY);
    mRot.multiply(new THREE.Matrix4().makeRotationX(ang));
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.06, (a.z + b.z) / 2);

    const roadGeo = new THREE.BoxGeometry(3.4, 0.08, len + 0.35);
    roadGeo.applyMatrix4(Roads._m.copy(mRot).setPosition(mid));
    roadGeos.push(roadGeo);

    const lineLen = len - 0.6;
    if (lineLen > 0.01) {
      const up = new THREE.Vector3(0, 0.045, 0).applyMatrix4(mRot);
      const lineMid = mid.clone().add(up);
      const lineGeo = new THREE.BoxGeometry(0.22, 0.03, lineLen);
      lineGeo.applyMatrix4(Roads._m.copy(mRot).setPosition(lineMid));
      lineGeos.push(lineGeo);
    }
  }
}
