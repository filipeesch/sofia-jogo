import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';

// The "Vale Vivo": a big living valley with vila, farm, lake and forest zones.
export class Valley extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private trees: { g: THREE.Group; phase: number }[] = [];
  private hills: { x: number; z: number; r: number; h: number }[] = [];

  constructor(config: { grass?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();
    const grass = config.grass ?? 0x74c463;
    const houseColors = config.houseColors ?? [0xff8a80, 0x80d8ff, 0xfff176];

    // Big meadow.
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.95 })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.add(g);

    // Lake.
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(15, 40),
      new THREE.MeshStandardMaterial({ color: 0x38b0d8, roughness: 0.2 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(50, 0.05, -30);
    lake.receiveShadow = true;
    this.add(lake);

    // Gentle hills away from the roads.
    for (const [x, z, r, h] of [[-30, -28, 22, 3.5], [24, 50, 18, 3.0], [-58, -18, 20, 3.2], [38, 8, 16, 2.6]] as [number, number, number, number][]) {
      const geo = new THREE.SphereGeometry(1, 24, 16);
      geo.scale(r, h, r);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7fd17f, roughness: 0.95 }));
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      this.add(m);
      this.hills.push({ x, z, r, h });
    }

    // ---- VILA at (0,0) ----
    const houseSpots: [number, number][] = [[8, 8], [-8, 10], [4, -10], [-10, -6]];
    houseSpots.forEach(([x, z], i) => {
      const house = new House(houseColors[i % houseColors.length], 0xd84315, models.house ? models.house.clone() : undefined);
      house.position.set(x, this.terrainHeight(x, z), z);
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x, y: this.terrainHeight(x, z) + 1.6, z, r: 1.9, h: 3.2 });
    });

    // Street lamps (glow at night).
    if (models.lamp) {
      const lampSpots: [number, number][] = [[0, 16], [16, 0], [0, -16], [-16, 0], [8, 8], [-8, -8]];
      for (const [x, z] of lampSpots) {
        const l = models.lamp.clone();
        l.position.set(x, this.terrainHeight(x, z), z);
        this.add(l);
        l.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.name === 'LampHead') {
            const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
            mat.emissive.set(0xffd97a);
            mat.emissiveIntensity = 0;
            this.lamps.push({ mat });
          }
        });
      }
    }

    // Benches near the lake.
    if (models.bench) {
      for (const [x, z] of [[44, -22], [58, -26], [50, -40]] as [number, number][]) {
        const b = models.bench.clone();
        b.position.set(x, this.terrainHeight(x, z), z);
        b.rotation.y = rand(0, TAU);
        this.add(b);
        this.solids.push({ x, y: this.terrainHeight(x, z) + 0.5, z, r: 1.0, h: 1.0 });
      }
    }

    // ---- FAZENDA at (-70, 40) ----
    if (models.barn) {
      const barn = models.barn.clone();
      barn.position.set(-70, this.terrainHeight(-70, 40), 40);
      this.add(barn);
      this.solids.push({ x: -70, y: this.terrainHeight(-70, 40) + 2, z: 40, r: 2.3, h: 4 });
    }
    if (models.fence) {
      const size = 14;
      for (let i = -size; i <= size; i += 3) {
        for (const [sx, sz, ry] of [[i, -size, 0], [i, size, 0], [-size, i, Math.PI / 2], [size, i, Math.PI / 2]] as [number, number, number][]) {
          const fx = -60 + sx;
          const fz = 30 + sz;
          const f = models.fence.clone();
          f.position.set(fx, this.terrainHeight(fx, fz), fz);
          f.rotation.y = ry;
          this.add(f);
          this.solids.push({ x: fx, y: this.terrainHeight(fx, fz) + 0.5, z: fz, r: 0.4, h: 1 });
        }
      }
    }
    const farmAnimals: [string, number, number][] = [
      ['cow', -60, 22], ['cow', -56, 38], ['sheep', -48, 22], ['sheep', -52, 40],
      ['chicken', -64, 30], ['chicken', -58, 18], ['dog', -78, 28], ['cat', -70, 50]
    ];
    for (const [type, x, z] of farmAnimals) {
      const src = models[type];
      if (!src) continue;
      const a = new Animal(src.clone(), x, z, type, 11);
      a.position.set(x, this.terrainHeight(x, z) + 0.15, z);
      a.rotation.y = rand(0, TAU);
      this.add(a);
      this.animals.push(a);
      this.solids.push({ x, y: this.terrainHeight(x, z) + 0.7, z, r: 1.0, h: 1.4 });
    }

    // Ducks at the lake.
    if (models.duck) {
      for (const [x, z] of [[52, -34], [48, -28], [56, -30]] as [number, number][]) {
        const a = new Animal(models.duck.clone(), x, z, 'duck', 6);
        a.position.set(x, this.terrainHeight(x, z) + 0.15, z);
        a.rotation.y = rand(0, TAU);
        this.add(a);
        this.animals.push(a);
      }
    }

    // ---- FLORESTA at (60, 40) ----
    if (models.pine || models.tree || models.appletree) {
      for (let i = 0; i < 42; i++) {
        const a = rand(0, TAU);
        const r = rand(5, 26);
        const x = 60 + Math.cos(a) * r;
        const z = 40 + Math.sin(a) * r;
        if (Math.hypot(x, z) < 12) continue; // keep the vila clear
        const key = i % 3 === 0 ? 'pine' : i % 3 === 1 ? 'tree' : 'appletree';
        const src = models[key] ?? models.tree ?? models.pine;
        if (!src) continue;
        const t = src.clone();
        const s = rand(0.9, 1.5);
        t.scale.setScalar(s);
        const y = this.terrainHeight(x, z);
        t.position.set(x, y, z);
        t.rotation.y = rand(0, TAU);
        this.add(t);
        this.trees.push({ g: t, phase: rand(0, TAU) });
        this.solids.push({ x, y: y + 2 * s, z, r: 1.2 * s, h: 4 * s });
      }
    }

    // Bushes and flowers everywhere (density).
    if (models.bush) {
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        const r = rand(12, 70);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const b = models.bush.clone();
        b.position.set(x, this.terrainHeight(x, z), z);
        b.rotation.y = rand(0, TAU);
        this.add(b);
      }
    }
    if (models.flower) {
      for (let i = 0; i < 34; i++) {
        const a = rand(0, TAU);
        const r = rand(5, 62);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const f = models.flower.clone();
        f.position.set(x, this.terrainHeight(x, z), z);
        this.add(f);
      }
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

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
  }

  update(dt: number, tGlobal: number): void {
    for (const t of this.trees) {
      t.g.rotation.z = Math.sin(tGlobal * 0.8 + t.phase) * 0.04;
    }
  }
}
