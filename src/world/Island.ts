import * as THREE from 'three';
import { House } from './landmarks';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';

// A small open island: green mound, beach, hills, mountain, trees and houses.
export class Island extends THREE.Group {
  readonly radius = 34;
  readonly peak = 3.2;
  readonly mountainPos = new THREE.Vector3(16, 0, -10);
  readonly mountainRadius = 7.5;
  readonly mountainHeight = 8.5;

  readonly houses: House[] = [];
  readonly solids: Solid[] = [];

  private foliage: { g: THREE.Group; phase: number; speed: number }[] = [];
  private hills = [
    { x: -8, z: -12, r: 6, h: 2.2 },
    { x: 10, z: 14, r: 5, h: 1.8 },
    { x: -14, z: 10, r: 5.5, h: 2.0 },
    { x: 18, z: 14, r: 5, h: 1.8 },
    { x: -22, z: -4, r: 5.5, h: 2.0 }
  ];

  constructor(config: { grass?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();

    const grass = config.grass ?? 0x6fc45c;
    const hillColor = new THREE.Color(grass).offsetHSL(0, 0, 0.06).getHex();
    const houseColors = config.houseColors ?? [0xff8a80, 0x80d8ff, 0xfff176];

    // Base island mound (scaled hemisphere).
    const baseGeo = new THREE.SphereGeometry(1, 28, 20, 0, TAU, 0, Math.PI / 2);
    baseGeo.scale(this.radius, this.peak, this.radius);
    const base = new THREE.Mesh(
      baseGeo,
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.85, flatShading: true })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    this.add(base);

    // Sandy beach ring.
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radius - 3, this.radius + 5.5, 0.5, 40),
      new THREE.MeshStandardMaterial({ color: 0xf4e3a1, roughness: 0.9, flatShading: true })
    );
    beach.position.y = 0.15;
    beach.receiveShadow = true;
    this.add(beach);

    // Hills.
    for (const hill of this.hills) {
      const hillGeo = new THREE.SphereGeometry(1, 12, 10);
      hillGeo.scale(hill.r, hill.h, hill.r);
      const mesh = new THREE.Mesh(
        hillGeo,
        new THREE.MeshStandardMaterial({ color: hillColor, roughness: 0.85, flatShading: true })
      );
      mesh.position.set(hill.x, this.baseHeight(hill.x, hill.z), hill.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.add(mesh);
    }

    // Mountain (detailed GLB when available, procedural fallback otherwise).
    const mountainBaseY = this.baseHeight(this.mountainPos.x, this.mountainPos.z);
    if (models.mountain) {
      const m = models.mountain.clone();
      m.position.set(this.mountainPos.x, mountainBaseY - 0.3, this.mountainPos.z);
      m.rotation.y = rand(0, TAU);
      this.add(m);
    } else {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(this.mountainRadius, this.mountainHeight, 12),
        new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.9, flatShading: true })
      );
      mountain.position.set(this.mountainPos.x, mountainBaseY + this.mountainHeight / 2, this.mountainPos.z);
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      this.add(mountain);

      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(this.mountainRadius * 0.32, this.mountainHeight * 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
      );
      snow.position.set(this.mountainPos.x, mountainBaseY + this.mountainHeight - this.mountainHeight * 0.17, this.mountainPos.z);
      this.add(snow);
    }

    this.solids.push({
      x: this.mountainPos.x,
      y: mountainBaseY,
      z: this.mountainPos.z,
      r: this.mountainRadius,
      h: this.mountainHeight
    });

    // Trees (detailed GLB when available, procedural fallback otherwise).
    const treeSpots: [number, number][] = [
      [-3, 3], [8, 6], [-18, 6], [4, -12], [-6, -18], [14, -4],
      [-26, -8], [12, 20], [-2, 16], [22, 8], [-14, -16], [18, -18],
      [6, -8], [16, 6], [-24, 14], [0, -24], [26, -6], [-10, -22]
    ];
    treeSpots.forEach(([x, z], i) => {
      if (Math.hypot(x, z) > this.radius - 3) return;
      if (models.tree || models.palm) this.addGLBTree(models, x, z, i);
      else this.addTree(x, z);
    });

    // Houses.
    const houseSpots: [number, number][] = [
      [6, 9],
      [-12, 5],
      [2, -16]
    ];
    houseSpots.forEach(([x, z], i) => {
      const gy = this.terrainHeight(x, z);
      const house = new House(houseColors[i % houseColors.length], 0xd84315, models.house ? models.house.clone() : undefined);
      house.position.set(x, gy, z);
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x, y: gy + 1.6, z, r: 1.9, h: 3.2 });
    });
  }

  private addGLBTree(models: WorldModels, x: number, z: number, i: number): void {
    const src = i % 3 === 0 && models.palm ? models.palm : models.tree ?? models.palm;
    if (!src) return;
    const g = src.clone();
    const s = rand(0.9, 1.4);
    g.scale.setScalar(s);
    const y = this.terrainHeight(x, z);
    g.position.set(x, y, z);
    g.rotation.y = rand(0, TAU);
    this.add(g);
    this.foliage.push({ g, phase: rand(0, TAU), speed: rand(0.6, 1.1) });
    this.solids.push({ x, y: y + 1.7 * s, z, r: 1.2 * s, h: 4 * s });
  }

  private baseHeight(x: number, z: number): number {
    const d = Math.hypot(x, z);
    if (d >= this.radius) return 0;
    const n = d / this.radius;
    return this.peak * Math.sqrt(Math.max(0, 1 - n * n));
  }

  terrainHeight(x: number, z: number): number {
    let h = this.baseHeight(x, z);

    const md = Math.hypot(x - this.mountainPos.x, z - this.mountainPos.z);
    const mn = md / this.mountainRadius;
    if (mn < 1) h += this.mountainHeight * (1 - mn * mn);

    for (const hill of this.hills) {
      const hd = Math.hypot(x - hill.x, z - hill.z);
      const hn = hd / hill.r;
      if (hn < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - hn * hn));
    }
    return h;
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

  update(dt: number, tGlobal: number): void {
    for (const f of this.foliage) {
      f.g.rotation.z = Math.sin(tGlobal * f.speed + f.phase) * 0.06;
    }
  }
}
