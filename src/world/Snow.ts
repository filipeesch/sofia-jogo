import * as THREE from 'three';
import { House } from './landmarks';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';
import { instanceProps, type InstancedProps } from './instancing';

// A snowy world: white ground, frozen lake, snow drifts, a cabin, snowmen and pine trees.
export class Snow extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];

  private pines: InstancedProps = { group: new THREE.Group() };
  private hills: { x: number; z: number; r: number; h: number }[] = [];

  constructor(config: { ground?: number; lake?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();

    const ground = config.ground ?? 0xf0f6fc;
    const lake = config.lake ?? 0xbfe6f7;
    const houseColors = config.houseColors ?? [0xc9644a, 0x9fd0f0, 0xe0b060];

    // Snowy ground.
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
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
      [18, -8, 6, 2.0],
      [-10, -12, 5, 1.7],
      [22, 6, 5, 1.8]
    ];
    for (const [x, z, r, h] of hillDefs) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      geo.scale(r, h, r);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      this.add(m);
      this.hills.push({ x, z, r, h });
    }

    // Cozy cabin. Kept off the road band (z = -15) so the on-rails tour
    // can drive right up to its door.
    const cx = 0;
    const cz = -21;
    const cabin = new House(houseColors[0], 0x8a4a2f, models.house ? models.house.clone() : undefined);
    cabin.position.set(cx, this.terrainHeight(cx, cz), cz);
    this.add(cabin);
    this.houses.push(cabin);
    this.solids.push({ x: cx, y: this.terrainHeight(cx, cz) + 1.6, z: cz, r: 1.9, h: 3.2 });

    // Snowmen (instanced).
    if (models.snowman) {
      const spots: [number, number][] = [[2, 6], [-14, -4], [0, 21], [-4, 19], [10, -10]];
      const placements = spots.map(([x, z]) => {
        const y = this.terrainHeight(x, z);
        this.solids.push({ x, y: y + 1.8, z, r: 1.6, h: 3.8 });
        return { x, y, z, rotY: rand(0, TAU) };
      });
      const inst = instanceProps(models.snowman, placements, { castShadow: true });
      this.add(inst.group);
    }

    // Pine trees (instanced, with a gentle sway).
    if (models.pine) {
      // Pines keep clear of the road band (the on-rails tour drives the
      // grid roads, and solids sit on the centerline there would be hit).
      const spots: [number, number][] = [
        [-22, 6], [8, -8], [22, 10], [-26, 4], [-6, -22], [26, -8], [-24, 22], [4, 22], [24, -22],
        [10, 5], [-12, 22], [24, -8], [-24, 10], [12, 24]
      ];
      const placements = spots.map(([x, z]) => {
        const y = this.terrainHeight(x, z);
        const s = rand(0.8, 1.3);
        this.solids.push({ x, y: y + 1.5 * s, z, r: 1.2 * s, h: 4 * s });
        return { x, y, z, scale: s, rotY: rand(0, TAU), phase: rand(0, TAU), speed: rand(0.6, 1.1) };
      });
      this.pines = instanceProps(models.pine, placements, { castShadow: true, sway: 0.05, swayX: 0.03 });
      this.add(this.pines.group);
    }
  }

  terrainHeight(x: number, z: number): number {
    let h = 0;
    for (const hill of this.hills) {
      const d = Math.hypot(x - hill.x, z - hill.z);
      const n = d / hill.r;
      if (n < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - n * n));
    }
    return h;
  }

  update(_dt: number, tGlobal: number): void {
    this.pines.update?.(tGlobal);
  }
}
