import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import {
  buildDesertLayout,
  desertTerrainHeight,
  mulberry32,
  DESERT_SEED,
  type DesertLayout
} from './desertLayout';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// "Deserto": a big sandy world with a village of adobe houses, a water oasis
// ringed by cacti, a pyramid cluster, dunes and a closed road network. All
// positions come from desertLayout.ts (deterministic, validated by
// scripts/check-desert-level.mjs). Street lamps carry real point lights that
// warm the night.
export class Desert extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private layout: DesertLayout;
  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private lampLights: THREE.PointLight[] = [];
  private cactusInsts: InstancedProps[] = [];
  // Visual-only PRNG (cactus/animal facing, sway phase) — positions always
  // come from the deterministic layout.
  private rng: () => number;

  constructor(config: { ground?: number; oasis?: number; houseColors?: number[] } = {}, models: WorldModels = {}, layout?: DesertLayout) {
    super();
    this.layout = layout ?? buildDesertLayout();
    this.rng = mulberry32(DESERT_SEED + 1);

    const ground = config.ground ?? 0xe8c98a;
    const oasis = config.oasis ?? 0x4fb8e8;
    const houseColors = config.houseColors ?? [0xd9a066, 0xcf9a5a, 0xe0b080];

    // ---- L0: ground, oasis, dunes ----
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95, flatShading: true })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.add(g);

    const o = new THREE.Mesh(
      new THREE.CircleGeometry(this.layout.oasis.r, 48),
      new THREE.MeshStandardMaterial({ color: oasis, roughness: 0.25 })
    );
    o.rotation.x = -Math.PI / 2;
    o.position.set(this.layout.oasis.x, 0.06, this.layout.oasis.z);
    o.receiveShadow = true;
    this.add(o);

    for (const d of this.layout.dunes) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      geo.scale(d.r, d.h, d.r);
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xecc98f, roughness: 0.95, flatShading: true })
      );
      m.position.set(d.x, 0, d.z);
      m.receiveShadow = true;
      this.add(m);
    }

    // ---- L2: anchors (village, pyramids, lamps) ----
    for (const h of this.layout.houses) {
      const house = new House(
        houseColors[h.colorIndex % houseColors.length],
        0xa0522d,
        models.house ? models.house.clone() : undefined
      );
      house.position.set(h.x, h.y, h.z);
      house.rotation.y = h.rotY;
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2 });
    }

    for (const p of this.layout.pyramids) {
      if (!models.pyramid) continue;
      const m = models.pyramid.clone();
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = this.rng() * TAU; // visual jitter only
      this.add(m);
      this.solids.push({ x: p.x, y: p.y + p.h / 2, z: p.z, r: p.r, h: p.h });
    }

    if (models.lamp) {
      const lampMat = meshMaterialNamed(models.lamp, 'LampHead');
      if (lampMat) {
        lampMat.emissive.set(0xffd97a);
        lampMat.emissiveIntensity = 0;
        this.lamps.push({ mat: lampMat });
      }
      const placements: InstancePlacement[] = this.layout.lamps.map((l) => ({ x: l.x, y: l.y, z: l.z }));
      const inst = instanceProps(models.lamp, placements, { castShadow: false });
      this.add(inst.group);
      // Lamps are not registered as solids (road-edge props; the on-rails
      // tour's lane shift would hit a lamp solid).
      // Real light: one warm point light per lamp head, on only at night.
      for (const l of this.layout.lamps) {
        const pl = new THREE.PointLight(0xffd97a, 0, 14, 2);
        pl.position.set(l.x, l.y + 3.3, l.z);
        this.add(pl);
        this.lampLights.push(pl);
      }
    }

    // Animals (village + oasis meadow + content ring) — all from the layout.
    for (const a of this.layout.animals) {
      const src = models[a.type];
      if (!src) continue;
      const animal = new Animal(src.clone(), a.x, a.z, a.type, a.wanderR);
      animal.position.set(a.x, a.y + 0.15, a.z);
      animal.rotation.y = this.rng() * TAU;
      this.add(animal);
      this.animals.push(animal);
      this.solids.push({ x: a.x, y: a.y + 0.7, z: a.z, r: 1.0, h: 1.4 });
    }

    // ---- L3: cacti (instanced, gentle sway) ----
    if (models.cactus) {
      const placements: InstancePlacement[] = this.layout.cacti.map((c) => {
        this.solids.push({ x: c.x, y: c.y + 1.0 * c.scale, z: c.z, r: 0.9 * c.scale, h: 2.0 * c.scale });
        return { x: c.x, y: c.y, z: c.z, scale: c.scale, rotY: c.rotY, phase: this.rng() * TAU, speed: 0.5 + this.rng() * 0.4 };
      });
      const inst = instanceProps(models.cactus, placements, { castShadow: true, sway: 0.05 });
      this.add(inst.group);
      this.cactusInsts.push(inst);
    }
  }

  terrainHeight(x: number, z: number): number {
    return desertTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
    for (const p of this.lampLights) p.intensity = on ? 2.6 : 0;
  }

  update(_dt: number, tGlobal: number): void {
    for (const inst of this.cactusInsts) inst.update?.(tGlobal);
  }
}
