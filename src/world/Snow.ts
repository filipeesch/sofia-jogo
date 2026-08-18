import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import { buildSnowLayout, snowTerrainHeight, mulberry32, SNOW_SEED, type SnowLayout } from './snowLayout';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// "Mundo da Neve": a big snowy world with a village, a frozen lake, a pine
// grove, snowmen, drifts and street lamps with real point lights. All
// positions come from snowLayout.ts (deterministic, validated by
// scripts/check-snow-level.mjs).
export class Snow extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private layout: SnowLayout;
  private pines: InstancedProps = { group: new THREE.Group() };
  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private lampLights: THREE.PointLight[] = [];
  // Visual-only PRNG (initial animal facing) — positions always come from the
  // deterministic layout.
  private rng: () => number;

  constructor(config: { ground?: number; lake?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();
    this.layout = buildSnowLayout();
    this.rng = mulberry32(SNOW_SEED + 1);

    const ground = config.ground ?? 0xf0f6fc;
    const lakeColor = config.lake ?? 0xbfe6f7;
    const houseColors = config.houseColors ?? [0xc9644a, 0x9fd0f0, 0xe0b060];

    // ---- L0: ground, frozen lake, drifts ----
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.add(g);

    const lake = this.layout.lake;
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(lake.r, 40),
      new THREE.MeshStandardMaterial({ color: lakeColor, roughness: 0.15, metalness: 0.1 })
    );
    ice.rotation.x = -Math.PI / 2;
    ice.position.set(lake.x, 0.06, lake.z);
    ice.receiveShadow = true;
    this.add(ice);

    for (const hill of this.layout.hills) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      geo.scale(hill.r, hill.h, hill.r);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
      m.position.set(hill.x, 0, hill.z);
      m.receiveShadow = true;
      this.add(m);
    }

    // ---- L2: houses, snowmen, lamps ----
    for (const h of this.layout.houses) {
      const house = new House(
        houseColors[h.colorIndex % houseColors.length],
        0x8a4a2f,
        models.house ? models.house.clone() : undefined
      );
      house.position.set(h.x, h.y, h.z);
      house.rotation.y = h.rotY;
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2 });
    }

    if (models.snowman) {
      const placements: InstancePlacement[] = this.layout.snowmen.map((s) => {
        this.solids.push({ x: s.x, y: s.y + 1.8, z: s.z, r: 1.6, h: 3.8 });
        return { x: s.x, y: s.y, z: s.z, rotY: s.rotY };
      });
      const inst = instanceProps(models.snowman, placements, { castShadow: true });
      this.add(inst.group);
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

    // Animals (village + rings + alameda) — all defined by the layout.
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

    // ---- L3: pines (instanced, with a gentle sway) ----
    if (models.pine) {
      const placements: InstancePlacement[] = this.layout.pines.map((p) => {
        this.solids.push({ x: p.x, y: p.y + 1.5 * p.scale, z: p.z, r: 1.2 * p.scale, h: 4 * p.scale });
        return { x: p.x, y: p.y, z: p.z, scale: p.scale, rotY: p.rotY, phase: this.rng() * TAU, speed: 0.6 + this.rng() * 0.5 };
      });
      this.pines = instanceProps(models.pine, placements, { castShadow: true, sway: 0.05, swayX: 0.03 });
      this.add(this.pines.group);
    }
  }

  terrainHeight(x: number, z: number): number {
    return snowTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
    for (const p of this.lampLights) p.intensity = on ? 2.6 : 0;
  }

  update(_dt: number, tGlobal: number): void {
    this.pines.update?.(tGlobal);
  }
}
