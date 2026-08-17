import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// The "Vale Vivo": a big living valley with vila, farm, lake and forest zones.
export class Valley extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private treeInsts: InstancedProps[] = [];
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

    // Street lamps (glow at night) — instanced, sharing one LampHead material.
    if (models.lamp) {
      const lampSpots: [number, number][] = [[0, 16], [16, 0], [0, -16], [-16, 0], [8, 8], [-8, -8]];
      const lampMat = meshMaterialNamed(models.lamp, 'LampHead');
      if (lampMat) {
        lampMat.emissive.set(0xffd97a);
        lampMat.emissiveIntensity = 0;
        this.lamps.push({ mat: lampMat });
      }
      const placements: InstancePlacement[] = lampSpots.map(([x, z]) => ({ x, y: this.terrainHeight(x, z), z }));
      const inst = instanceProps(models.lamp, placements, { castShadow: false });
      this.add(inst.group);
    }

    // Benches near the lake (instanced).
    if (models.bench) {
      const placements: InstancePlacement[] = [[44, -22], [58, -26], [50, -40]].map(([x, z]) => {
        const y = this.terrainHeight(x, z);
        this.solids.push({ x, y: y + 0.5, z, r: 1.0, h: 1.0 });
        return { x, y, z, rotY: rand(0, TAU) };
      });
      const inst = instanceProps(models.bench, placements, { castShadow: false });
      this.add(inst.group);
    }

    // ---- FAZENDA at (-70, 40) ----
    if (models.barn) {
      // The barn sits inside the fence, away from the road corner at
      // (-70, 40) where the two farm roads meet (the on-rails tour drives
      // right past that corner).
      const barn = models.barn.clone();
      barn.position.set(-66, this.terrainHeight(-66, 22), 22);
      this.add(barn);
      this.solids.push({ x: -66, y: this.terrainHeight(-66, 22) + 2, z: 22, r: 2.3, h: 4 });
    }
    if (models.fence) {
      const size = 14;
      // Gate gaps: where the farm roads cross the fence line there are no
      // posts, so the on-rails tour can pass through cleanly.
      const gates: [number, number][] = [[-46, 25], [-65, 44], [-62, 44]];
      const placements: InstancePlacement[] = [];
      for (let i = -size; i <= size; i += 3) {
        for (const [sx, sz, ry] of [[i, -size, 0], [i, size, 0], [-size, i, Math.PI / 2], [size, i, Math.PI / 2]] as [number, number, number][]) {
          const fx = -60 + sx;
          const fz = 30 + sz;
          if (gates.some(([gx, gz]) => gx === fx && gz === fz)) continue;
          const y = this.terrainHeight(fx, fz);
          placements.push({ x: fx, y, z: fz, rotY: ry });
          this.solids.push({ x: fx, y: y + 0.5, z: fz, r: 0.4, h: 1 });
        }
      }
      const inst = instanceProps(models.fence, placements, { castShadow: false });
      this.add(inst.group);
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
      const groups: Record<string, InstancePlacement[]> = {};
      for (let i = 0; i < 42; i++) {
        const a = rand(0, TAU);
        const r = rand(5, 26);
        const x = 60 + Math.cos(a) * r;
        const z = 40 + Math.sin(a) * r;
        if (Math.hypot(x, z) < 12) continue; // keep the vila clear
        const key = i % 3 === 0 ? 'pine' : i % 3 === 1 ? 'tree' : 'appletree';
        const src = models[key] ?? models.tree ?? models.pine;
        if (!src) continue;
        const tplKey = models[key] ? key : models.tree ? 'tree' : 'pine';
        const s = rand(0.9, 1.5);
        const y = this.terrainHeight(x, z);
        (groups[tplKey] ??= []).push({ x, y, z, scale: s, rotY: rand(0, TAU), phase: rand(0, TAU) });
        this.solids.push({ x, y: y + 2 * s, z, r: 1.2 * s, h: 4 * s });
      }
      for (const key of Object.keys(groups)) {
        const inst = instanceProps(models[key], groups[key], { castShadow: true, sway: 0.04 });
        this.add(inst.group);
        this.treeInsts.push(inst);
      }
    }

    // Bushes and flowers everywhere (density) — instanced.
    if (models.bush) {
      const placements: InstancePlacement[] = [];
      for (let i = 0; i < 18; i++) {
        const a = rand(0, TAU);
        const r = rand(12, 70);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        placements.push({ x, y: this.terrainHeight(x, z), z, rotY: rand(0, TAU) });
      }
      const inst = instanceProps(models.bush, placements, { castShadow: false });
      this.add(inst.group);
    }
    if (models.flower) {
      const placements: InstancePlacement[] = [];
      for (let i = 0; i < 34; i++) {
        const a = rand(0, TAU);
        const r = rand(5, 62);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        placements.push({ x, y: this.terrainHeight(x, z), z });
      }
      const inst = instanceProps(models.flower, placements, { castShadow: false });
      this.add(inst.group);
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
    for (const inst of this.treeInsts) inst.update?.(tGlobal);
  }
}
