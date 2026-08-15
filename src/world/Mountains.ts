import * as THREE from 'three';
import { House } from './landmarks';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';

// A mountain range: ring of snowy peaks around a green valley with a lake and a cabin.
export class Mountains extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];

  private foliage: { g: THREE.Group; phase: number; speed: number }[] = [];
  private peaks: { x: number; z: number; r: number; h: number }[] = [];
  private hills: { x: number; z: number; r: number; h: number }[] = [];

  constructor(config: { grass?: number; lake?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();

    const grass = config.grass ?? 0x6fc45c;
    const lakeColor = config.lake ?? 0x38b0d8;
    const houseColors = config.houseColors ?? [0xff8a80, 0x80d8ff, 0xfff176];

    // Big flat meadow.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600, 1, 1),
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.9, flatShading: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.add(ground);

    // Lake in the valley.
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(9, 32),
      new THREE.MeshStandardMaterial({ color: lakeColor, roughness: 0.3 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(-9, 0.08, 7);
    lake.receiveShadow = true;
    this.add(lake);

    // Ring of snowy peaks (detailed GLB when available).
    const peakDefs: { a: number; r: number; rad: number; h: number }[] = [
      { a: 0, r: 46, rad: 12, h: 15 },
      { a: 60, r: 44, rad: 11, h: 18 },
      { a: 120, r: 46, rad: 12, h: 14 },
      { a: 180, r: 45, rad: 13, h: 17 },
      { a: 240, r: 44, rad: 11, h: 16 },
      { a: 300, r: 46, rad: 12, h: 15 }
    ];
    for (const p of peakDefs) {
      const rad = (p.a * Math.PI) / 180;
      const x = Math.cos(rad) * p.r;
      const z = Math.sin(rad) * p.r;
      if (models.peak) {
        const g = models.peak.clone();
        g.position.set(x, 0, z);
        g.scale.setScalar(p.h / 7);
        g.rotation.y = rand(0, TAU);
        this.add(g);
        this.solids.push({ x, y: 0, z, r: p.rad, h: p.h });
      } else {
        this.addPeak(x, z, p.rad, p.h);
      }
      this.peaks.push({ x, z, r: p.rad, h: p.h });
    }

    // Soft hills in the valley.
    const hillDefs: [number, number, number, number][] = [
      [10, -6, 5, 1.6],
      [-16, -12, 6, 2.0],
      [14, 16, 5, 1.8]
    ];
    for (const [x, z, r, h] of hillDefs) {
      const hillGeo = new THREE.SphereGeometry(1, 12, 10);
      hillGeo.scale(r, h, r);
      const hill = new THREE.Mesh(
        hillGeo,
        new THREE.MeshStandardMaterial({ color: new THREE.Color(grass).offsetHSL(0, 0, 0.06).getHex(), roughness: 0.85, flatShading: true })
      );
      hill.position.set(x, h * 0.5, z);
      hill.castShadow = true;
      hill.receiveShadow = true;
      this.add(hill);
      this.hills.push({ x, z, r, h });
    }

    // Trees scattered in the valley (avoiding the lake).
    const treeSpots: [number, number][] = [
      [3, -4], [8, -14], [6, 12], [-8, -18], [18, 0],
      [-20, 12], [0, 18], [-24, -4], [22, -10]
    ];
    treeSpots.forEach(([x, z], i) => {
      if (Math.hypot(x, z) > 28) return;
      if (models.pine || models.tree) this.addGLBTree(models, x, z, i);
      else this.addTree(x, z);
    });

    // Cabin.
    const cabin = new House(houseColors[0], 0x8d4a2f, models.house ? models.house.clone() : undefined);
    cabin.position.set(12, 0, 10);
    this.add(cabin);
    this.houses.push(cabin);
    this.solids.push({ x: 12, y: 1.6, z: 10, r: 1.9, h: 3.2 });
  }

  private addGLBTree(models: WorldModels, x: number, z: number, i: number): void {
    const src = i % 2 === 0 && models.pine ? models.pine : models.tree ?? models.pine;
    if (!src) return;
    const g = src.clone();
    const s = rand(0.8, 1.3);
    g.scale.setScalar(s);
    const y = this.terrainHeight(x, z);
    g.position.set(x, y, z);
    g.rotation.y = rand(0, TAU);
    this.add(g);
    this.foliage.push({ g, phase: rand(0, TAU), speed: rand(0.6, 1.1) });
    this.solids.push({ x, y: y + 1.5 * s, z, r: 1.1 * s, h: 4 * s });
  }

  private addPeak(x: number, z: number, r: number, h: number): void {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 12),
      new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.9, flatShading: true })
    );
    mountain.position.set(x, h / 2, z);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    this.add(mountain);

    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.32, h * 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    snow.position.set(x, h - h * 0.16, z);
    this.add(snow);

    this.solids.push({ x, y: 0, z, r, h });
  }

  private addTree(x: number, z: number): void {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.42, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9, flatShading: true })
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    g.add(trunk);

    const foliage = new THREE.Group();
    const c1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.85, flatShading: true })
    );
    c1.position.y = 1.9;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.85, flatShading: true })
    );
    c2.position.set(0.35, 2.6, 0.2);
    c2.castShadow = true;
    foliage.add(c1, c2);
    foliage.position.y = 0.7;
    g.add(foliage);

    g.position.set(x, this.terrainHeight(x, z), z);
    this.add(g);
    this.foliage.push({ g: foliage, phase: rand(0, TAU), speed: rand(0.6, 1.2) });
    this.solids.push({ x, y: this.terrainHeight(x, z) + 1.2, z, r: 1.1, h: 4.5 });
  }

  terrainHeight(x: number, z: number): number {
    let h = 0;
    for (const p of this.peaks) {
      const d = Math.hypot(x - p.x, z - p.z);
      const n = d / p.r;
      if (n < 1) h += p.h * (1 - n);
    }
    for (const hill of this.hills) {
      const d = Math.hypot(x - hill.x, z - hill.z);
      const n = d / hill.r;
      if (n < 1) h += hill.h * (1 - n * n);
    }
    return h;
  }

  update(dt: number, tGlobal: number): void {
    for (const f of this.foliage) {
      f.g.rotation.z = Math.sin(tGlobal * f.speed + f.phase) * 0.06;
    }
  }
}
