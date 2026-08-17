import * as THREE from 'three';
import { House } from './landmarks';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';
import { instanceProps } from './instancing';

// A desert world: sandy ground, dunes, an oasis, a pyramid and cacti.
export class Desert extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];

  private dunes: { x: number; z: number; r: number; h: number }[] = [];

  constructor(config: { ground?: number; oasis?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();

    const ground = config.ground ?? 0xe8c98a;
    const oasis = config.oasis ?? 0x4fb8e8;
    const houseColors = config.houseColors ?? [0xd9a066, 0xcf9a5a, 0xe0b080];

    // Sandy ground.
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.add(g);

    // Oasis.
    const o = new THREE.Mesh(
      new THREE.CircleGeometry(6, 32),
      new THREE.MeshStandardMaterial({ color: oasis, roughness: 0.2 })
    );
    o.rotation.x = -Math.PI / 2;
    o.position.set(-10, 0.06, 12);
    o.receiveShadow = true;
    this.add(o);

    // Dunes.
    const duneDefs: [number, number, number, number][] = [
      [8, -6, 7, 2.2],
      [-14, 6, 8, 2.6],
      [16, 12, 6, 2.0],
      [-6, -16, 7, 2.4],
      [-18, -14, 6, 2.0],
      [28, -20, 7, 2.4]
    ];
    for (const [x, z, r, h] of duneDefs) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      geo.scale(r, h, r);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xecc98f, roughness: 0.95 }));
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      this.add(m);
      this.dunes.push({ x, z, r, h });
    }

    // Adobe house.
    const hx = 8;
    const hz = 6;
    const house = new House(houseColors[0], 0xa0522d, models.house ? models.house.clone() : undefined);
    house.position.set(hx, this.terrainHeight(hx, hz), hz);
    this.add(house);
    this.houses.push(house);
    this.solids.push({ x: hx, y: this.terrainHeight(hx, hz) + 1.6, z: hz, r: 1.9, h: 3.2 });

    // Pyramid.
    if (models.pyramid) {
      // The pyramid sits off the road band so the on-rails tour can pass by.
      const px = 10;
      const pz = -8;
      const py = this.terrainHeight(px, pz);
      const p = models.pyramid.clone();
      p.position.set(px, py, pz);
      p.rotation.y = rand(0, TAU);
      this.add(p);
      this.solids.push({ x: px, y: py + 3.5, z: pz, r: 4.5, h: 7 });
    }

    // Cacti (instanced).
    if (models.cactus) {
      // Cacti keep clear of the road band (the on-rails tour drives the
      // grid roads; solids on the centerline would be hit by the car).
      const spots: [number, number][] = [
        [-4, -6], [4, -4], [24, 22], [-24, -6], [-6, -22], [22, -4], [4, 22], [22, 6], [-12, 20],
        [2, 8], [-12, -8], [10, -22], [-24, 20], [24, 10]
      ];
      const placements = spots.map(([x, z]) => {
        const y = this.terrainHeight(x, z);
        const s = rand(0.8, 1.4);
        this.solids.push({ x, y: y + 1.0 * s, z, r: 0.9 * s, h: 2.0 * s });
        return { x, y, z, scale: s, rotY: rand(0, TAU) };
      });
      const inst = instanceProps(models.cactus, placements, { castShadow: true });
      this.add(inst.group);
    }
  }

  terrainHeight(x: number, z: number): number {
    let h = 0;
    for (const d of this.dunes) {
      const n = Math.hypot(x - d.x, z - d.z) / d.r;
      if (n < 1) h += d.h * Math.sqrt(Math.max(0, 1 - n * n));
    }
    return h;
  }

  update(_dt: number, _tGlobal: number): void {
    // Static world; nothing to animate per-frame.
  }
}
