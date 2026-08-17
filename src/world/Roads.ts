import * as THREE from 'three';
import { MOUNTAINS_ROADS } from './mountainsLayout';
import { ISLAND_ROADS } from './islandLayout';

const VALLEY_DEFS: [number, number][][] = [
  [[0, 0], [-15, 6], [-30, 16], [-50, 28], [-70, 40]],
  [[0, 0], [15, -8], [30, -16], [47, -15]],
  [[0, 0], [20, 12], [40, 26], [60, 40]],
  [[-70, 40], [-45, 55], [0, 58], [60, 40]]
];

const GRID_DEFS: [number, number][][] = [
  [[-32, -15], [32, -15]],
  [[-32, 0], [32, 0]],
  [[-32, 15], [32, 15]],
  [[-18, -32], [-18, 32]],
  [[18, -32], [18, 32]]
];

// Vale das Montanhas: the road network lives in mountainsLayout.ts
// (MOUNTAINS_ROADS) so the level auto-check can validate the same geometry.
// main: spawn (0,24) → vila (0,4); branches: fazenda, lago, pinheiral.
export const MOUNTAINS_DEFS = MOUNTAINS_ROADS;

// Ilha Feliz: the road network lives in islandLayout.ts (ISLAND_ROADS) so the
// level auto-check can validate the same geometry. Hub at the village; spokes
// to serra, lagoa, fazenda and two beaches.
export const ISLAND_DEFS = ISLAND_ROADS;

// Curved roads (splines) that follow the terrain, with paths for traffic.
export class Roads extends THREE.Group {
  readonly paths: THREE.Vector3[][] = [];

  constructor(terrainHeight: (x: number, z: number) => number, kind: 'valley' | 'grid' | 'mountains' | 'island' = 'grid') {
    super();
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x48515c, roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0e6a8, roughness: 0.9 });

    const defs =
      kind === 'valley' ? VALLEY_DEFS : kind === 'mountains' ? MOUNTAINS_DEFS : kind === 'island' ? ISLAND_DEFS : GRID_DEFS;
    for (const def of defs) {
      const pts = this.sample(def);
      const path3 = pts.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z), z));
      for (let i = 0; i < path3.length - 1; i++) {
        this.addSegment(path3[i], path3[i + 1], roadMat, lineMat);
      }
      this.paths.push(pts.map(([x, z]) => new THREE.Vector3(x, z, 0)));
    }
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

  private addSegment(a: THREE.Vector3, b: THREE.Vector3, roadMat: THREE.Material, lineMat: THREE.Material): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return;
    const y = Math.max(a.y, b.y) + 0.05;
    const mid = new THREE.Vector3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    const rotY = Math.atan2(dx, dz);

    const seg = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, len + 0.35), roadMat);
    seg.position.copy(mid);
    seg.rotation.y = rotY;
    seg.receiveShadow = true;
    this.add(seg);

    const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, len - 0.6), lineMat);
    line.position.copy(mid).add(new THREE.Vector3(0, 0.045, 0));
    line.rotation.y = rotY;
    this.add(line);
  }
}
