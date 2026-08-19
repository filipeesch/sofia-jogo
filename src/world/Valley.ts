import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import {
  buildValleyLayout,
  valleyTerrainHeight,
  VALLEY_HILLS,
  VALLEY_LAKE,
  mulberry32,
  VALLEY_SEED,
  type ValleyLayout
} from './valleyLayout';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// "Vale Vivo": a big living valley with vila, farm, lake and forest zones.
// All positions come from valleyLayout.ts (deterministic, validated by
// scripts/check-valley-level.mjs).
export class Valley extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private layout: ValleyLayout;
  private treeInsts: InstancedProps[] = [];
  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private lampLights: THREE.PointLight[] = [];
  private hills: { x: number; z: number; r: number; h: number }[] = VALLEY_HILLS;
  // Visual-only PRNG (sway phase/speed, initial animal facing) — positions
  // always come from the deterministic layout.
  private rng: () => number;

  constructor(config: { grass?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();
    this.layout = buildValleyLayout();
    this.rng = mulberry32(VALLEY_SEED + 1);

    const grass = config.grass ?? 0x7ec850;
    const houseColors = config.houseColors ?? [0xff8a80, 0x80d8ff, 0xfff176];

    // ---- L0: ground, lake, hills ----
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.add(ground);

    // Lake — also the keep-out zone for benches/ducks/scatter props.
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(VALLEY_LAKE.r, 40),
      new THREE.MeshStandardMaterial({ color: 0x38b0d8, roughness: 0.2 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(VALLEY_LAKE.x, 0.06, VALLEY_LAKE.z);
    lake.receiveShadow = true;
    this.add(lake);

    // Gentle hills (spheres scaled to the hill shape).
    for (const hill of this.hills) {
      const geo = new THREE.SphereGeometry(1, 24, 16);
      geo.scale(hill.r, hill.h, hill.r);
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(grass).offsetHSL(0, 0, 0.06).getHex(),
          roughness: 0.95,
          flatShading: true
        })
      );
      m.position.set(hill.x, 0, hill.z);
      m.receiveShadow = true;
      m.castShadow = true;
      this.add(m);
    }

    // ---- L2: anchors beside the roads (village, farm, lake edge) ----
    for (const h of this.layout.houses) {
      const house = new House(
        houseColors[h.colorIndex % houseColors.length],
        0xd84315,
        models.house ? models.house.clone() : undefined
      );
      house.position.set(h.x, h.y, h.z);
      house.rotation.y = h.rotY;
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2 });
    }

    // Street lamps (glow at night + real PointLight) — instanced, sharing one
    // LampHead material. Each lamp also gets a PointLight for real illumination.
    if (models.lamp) {
      const lampMat = meshMaterialNamed(models.lamp, 'LampHead');
      if (lampMat) {
        lampMat.emissive.set(0xffd97a);
        lampMat.emissiveIntensity = 0;
        this.lamps.push({ mat: lampMat });
      }
      const placements: InstancePlacement[] = this.layout.lamps.map((l) => {
        // Real point light per lamp (intensity 0 by default; setNightLamps toggles).
        const pl = new THREE.PointLight(0xffd97a, 0, 14, 2);
        pl.position.set(l.x, l.y + 3.3, l.z);
        this.add(pl);
        this.lampLights.push(pl);
        return { x: l.x, y: l.y, z: l.z };
      });
      const inst = instanceProps(models.lamp, placements, { castShadow: false });
      this.add(inst.group);
    }

    // Benches near the lake (instanced).
    if (models.bench) {
      const placements: InstancePlacement[] = this.layout.benches.map((b) => {
        this.solids.push({ x: b.x, y: b.y + 0.5, z: b.z, r: 1.0, h: 1.0 });
        return { x: b.x, y: b.y, z: b.z, rotY: b.rotY };
      });
      const inst = instanceProps(models.bench, placements, { castShadow: false });
      this.add(inst.group);
    }

    // Farm: barn + fence (instanced). The barn is optional in data-driven
    // levels (the editor may delete it).
    const { barn, fencePosts } = this.layout;
    if (barn && models.barn) {
      const barnMesh = models.barn.clone();
      barnMesh.position.set(barn.x, barn.y, barn.z);
      this.add(barnMesh);
      this.solids.push({ x: barn.x, y: barn.y + 2, z: barn.z, r: 2.3, h: 4 });
    }
    if (models.fence) {
      const placements: InstancePlacement[] = fencePosts.map((f) => {
        this.solids.push({ x: f.x, y: f.y + 0.5, z: f.z, r: 0.4, h: 1 });
        return { x: f.x, y: f.y, z: f.z, rotY: f.rotY };
      });
      const inst = instanceProps(models.fence, placements, { castShadow: false });
      this.add(inst.group);
    }

    // Animals (meadow, pen + lake-shore ducks) — all defined by the layout.
    // Ducks carry no solid (they sit at the water's edge).
    for (const a of this.layout.animals) {
      const src = models[a.type];
      if (!src) continue;
      const animal = new Animal(src.clone(), a.x, a.z, a.type, a.wanderR);
      animal.position.set(a.x, a.y + 0.15, a.z);
      animal.rotation.y = this.rng() * TAU;
      this.add(animal);
      this.animals.push(animal);
      if (a.type !== 'duck') this.solids.push({ x: a.x, y: a.y + 0.7, z: a.z, r: 1.0, h: 1.4 });
    }

    // ---- L3: vegetation (forest instanced by kind + bushes + flowers) ----
    const treeGroups: Record<string, InstancePlacement[]> = {};
    for (const t of this.layout.trees) {
      const key = t.kind;
      (treeGroups[key] ??= []).push({
        x: t.x,
        y: t.y,
        z: t.z,
        scale: t.scale,
        rotY: t.rotY,
        phase: this.rng() * TAU,
        speed: 0.6 + this.rng() * 0.5
      });
      this.solids.push({ x: t.x, y: t.y + 2 * t.scale, z: t.z, r: 1.2 * t.scale, h: 4 * t.scale });
    }
    for (const key of Object.keys(treeGroups)) {
      const src = models[key] ?? models.tree ?? models.pine;
      if (!src) continue;
      const inst = instanceProps(src, treeGroups[key], { castShadow: true, sway: 0.06 });
      this.add(inst.group);
      this.treeInsts.push(inst);
    }

    if (models.bush) {
      const placements: InstancePlacement[] = this.layout.bushes.map((b) => ({ x: b.x, y: b.y, z: b.z }));
      const inst = instanceProps(models.bush, placements, { castShadow: false });
      this.add(inst.group);
    }

    if (models.flower) {
      const placements: InstancePlacement[] = this.layout.flowers.map((f) => ({ x: f.x, y: f.y, z: f.z }));
      const inst = instanceProps(models.flower, placements, { castShadow: false });
      this.add(inst.group);
    }
  }

  terrainHeight(x: number, z: number): number {
    return valleyTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
    for (const p of this.lampLights) p.intensity = on ? 2.6 : 0;
  }

  update(dt: number, tGlobal: number): void {
    for (const inst of this.treeInsts) inst.update?.(tGlobal);
  }
}
