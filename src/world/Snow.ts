import * as THREE from 'three';
import { House } from './landmarks';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';

// A snowy world: white ground, frozen lake, snow drifts, a cabin, snowmen and pine trees.
export class Snow extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];

  private pines: { g: THREE.Group; phase: number; speed: number }[] = [];
  private hills: { x: number; z: number; r: number; h: number }[] = [];

  constructor(config: { ground?: number; lake?: number; houseColors?: number[] } = {}) {
    super();

    const ground = config.ground ?? 0xf0f6fc;
    const lake = config.lake ?? 0xbfe6f7;
    const houseColors = config.houseColors ?? [0xc9644a, 0x9fd0f0, 0xe0b060];

    // Snowy ground.
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600, 1, 1),
      new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.add(g);

    // Frozen lake.
    const lakeMesh = new THREE.Mesh(
      new THREE.CircleGeometry(7, 32),
      new THREE.MeshStandardMaterial({ color: lake, roughness: 0.15, metalness: 0.1 })
    );
    lakeMesh.rotation.x = -Math.PI / 2;
    lakeMesh.position.set(-8, 0.06, -10);
    lakeMesh.receiveShadow = true;
    this.add(lakeMesh);

    // Snow drifts.
    const hillDefs: [number, number, number, number][] = [
      [10, 6, 6, 2.0],
      [-16, 8, 7, 2.4],
      [4, -18, 5, 1.6],
      [18, -8, 6, 2.0]
    ];
    for (const [x, z, r, h] of hillDefs) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      geo.scale(r, h, r);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
      m.position.set(x, h * 0.5, z);
      m.receiveShadow = true;
      this.add(m);
      this.hills.push({ x, z, r, h });
    }

    // Cozy cabin.
    const cx = 0;
    const cz = -14;
    const cabin = new House(houseColors[0], 0x8a4a2f);
    cabin.position.set(cx, this.terrainHeight(cx, cz), cz);
    this.add(cabin);
    this.houses.push(cabin);
    this.solids.push({ x: cx, y: this.terrainHeight(cx, cz) + 1.6, z: cz, r: 1.9, h: 3.2 });
  }

  addModels(models: WorldModels): void {
    const snowman = models.snowman;
    const pine = models.pine;

    const snowmanSpots: [number, number][] = [[6, 8], [-14, -4], [0, 14]];
    for (const [x, z] of snowmanSpots) {
      if (!snowman) break;
      const y = this.terrainHeight(x, z);
      const c = snowman.clone();
      c.position.set(x, y, z);
      c.rotation.y = rand(0, TAU);
      this.add(c);
      this.solids.push({ x, y: y + 1.8, z, r: 1.6, h: 3.8 });
    }

    const pineSpots: [number, number][] = [
      [-4, -2], [8, -14], [16, 10], [-20, 2], [-6, -18], [22, -4], [-18, 16], [4, 16], [18, -18]
    ];
    for (const [x, z] of pineSpots) {
      if (!pine) break;
      const y = this.terrainHeight(x, z);
      const s = rand(0.8, 1.3);
      const c = pine.clone();
      c.scale.setScalar(s);
      c.position.set(x, y, z);
      c.rotation.y = rand(0, TAU);
      this.add(c);
      this.pines.push({ g: c, phase: rand(0, TAU), speed: rand(0.6, 1.1) });
      this.solids.push({ x, y: y + 1.5 * s, z, r: 1.2 * s, h: 4 * s });
    }
  }

  terrainHeight(x: number, z: number): number {
    let h = 0;
    for (const hill of this.hills) {
      const d = Math.hypot(x - hill.x, z - hill.z);
      const n = d / hill.r;
      if (n < 1) h += hill.h * (1 - n * n);
    }
    return h;
  }

  update(_dt: number, tGlobal: number): void {
    for (const p of this.pines) {
      p.g.rotation.z = Math.sin(tGlobal * p.speed + p.phase) * 0.05;
      p.g.rotation.x = Math.cos(tGlobal * p.speed * 0.7 + p.phase) * 0.03;
    }
  }
}
