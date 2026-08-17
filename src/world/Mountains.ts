import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import {
  buildMountainsLayout,
  mountainTerrainHeight,
  MOUNTAINS_HILLS,
  mulberry32,
  MOUNTAIN_SEED,
  type MountainsLayout,
  type PeakPos
} from './mountainsLayout';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// "Vale das Montanhas": a green valley ringed by snowy peaks, with a village,
// a farm, a lake and a pine forest. All positions come from
// mountainsLayout.ts (deterministic, validated by scripts/check-mountain-level.mjs).
export class Mountains extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private layout: MountainsLayout;
  private treeInsts: InstancedProps[] = [];
  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private peaks: PeakPos[] = [];
  private hills = MOUNTAINS_HILLS;
  // Visual-only PRNG (sway phase/speed, initial animal facing) — positions
  // always come from the deterministic layout.
  private rng: () => number;

  constructor(config: { grass?: number; lake?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();
    this.layout = buildMountainsLayout();
    this.rng = mulberry32(MOUNTAIN_SEED + 1);

    const grass = config.grass ?? 0x6fc45c;
    const lakeColor = config.lake ?? 0x38b0d8;
    const houseColors = config.houseColors ?? [0xc98a5e, 0xa8d8b9, 0xffd88a];

    // ---- L0: ground, lake, peaks, soft hills ----
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.9, flatShading: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.add(ground);

    for (const w of this.layout.waters) {
      const lake = new THREE.Mesh(
        new THREE.CircleGeometry(w.r, 40),
        new THREE.MeshStandardMaterial({ color: lakeColor, roughness: 0.3 })
      );
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(w.x, 0.08, w.z);
      lake.receiveShadow = true;
      this.add(lake);
    }

    // Snowy peaks (instanced when the peak model is available).
    this.peaks = this.layout.peaks;
    if (models.peak) {
      const placements = this.peaks.map((p) => {
        this.solids.push({ x: p.x, y: 0, z: p.z, r: p.rad, h: p.h });
        return { x: p.x, z: p.z, scale: p.h / 7 };
      });
      const inst = instanceProps(models.peak, placements, { castShadow: true });
      this.add(inst.group);
    } else {
      for (const p of this.peaks) this.addPeakDraft(p);
    }

    for (const hill of this.hills) {
      const hillGeo = new THREE.SphereGeometry(1, 12, 10);
      hillGeo.scale(hill.r, hill.h, hill.r);
      const hillMesh = new THREE.Mesh(
        hillGeo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(grass).offsetHSL(0, 0, 0.06).getHex(),
          roughness: 0.85,
          flatShading: true
        })
      );
      hillMesh.position.set(hill.x, 0, hill.z);
      hillMesh.castShadow = true;
      hillMesh.receiveShadow = true;
      this.add(hillMesh);
    }

    // ---- L2: anchors beside the roads (village, farm, lake edge) ----
    for (const h of this.layout.houses) {
      const house = new House(
        houseColors[h.colorIndex % houseColors.length],
        0x8d4a2f,
        models.house ? models.house.clone() : undefined
      );
      house.position.set(h.x, h.y, h.z);
      house.rotation.y = h.rotY;
      this.add(house);
      this.houses.push(house);
      this.solids.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2 });
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
    }

    if (models.bench) {
      const placements: InstancePlacement[] = this.layout.benches.map((b) => {
        this.solids.push({ x: b.x, y: b.y + 0.5, z: b.z, r: 1.0, h: 1.0 });
        return { x: b.x, y: b.y, z: b.z, rotY: b.rotY };
      });
      const inst = instanceProps(models.bench, placements, { castShadow: false });
      this.add(inst.group);
    }

    const { barn, fencePosts } = this.layout;
    if (models.barn) {
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

    // Animals (farm + meadow + lake edge) — all defined by the layout.
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

    // ---- L3: vegetation (meadow trees + dense pine ring + filler) ----
    const treeGroups: Record<string, InstancePlacement[]> = {};
    for (const t of this.layout.trees) {
      const src = t.pine ? models.pine ?? models.tree : models.appletree ?? models.tree ?? models.pine;
      if (!src) continue;
      const tplKey = t.pine
        ? models.pine ? 'pine' : 'tree'
        : models.appletree ? 'appletree' : models.tree ? 'tree' : 'pine';
      (treeGroups[tplKey] ??= []).push({
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
      const inst = instanceProps(models[key], treeGroups[key], { castShadow: true, sway: 0.06 });
      this.add(inst.group);
      this.treeInsts.push(inst);
    }

    if (models.bush) {
      const placements: InstancePlacement[] = this.layout.bushes.map((b) => ({ x: b.x, y: b.y, z: b.z, rotY: this.rng() * TAU }));
      const inst = instanceProps(models.bush, placements, { castShadow: false });
      this.add(inst.group);
    }
    if (models.flower) {
      const placements: InstancePlacement[] = this.layout.flowers.map((f) => ({ x: f.x, y: f.y, z: f.z }));
      const inst = instanceProps(models.flower, placements, { castShadow: false });
      this.add(inst.group);
    }

    // ---- L4: decorations (snowmen on the peak slopes) ----
    if (models.snowman) {
      const placements: InstancePlacement[] = this.layout.snowmen.map((s) => {
        this.solids.push({ x: s.x, y: s.y + 1.1, z: s.z, r: 0.9, h: 2.2 });
        return { x: s.x, y: s.y, z: s.z, rotY: s.rotY };
      });
      const inst = instanceProps(models.snowman, placements, { castShadow: true });
      this.add(inst.group);
    }
  }

  private addPeakDraft(p: PeakPos): void {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(p.rad, p.h, 12),
      new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.9, flatShading: true })
    );
    mountain.position.set(p.x, p.h / 2, p.z);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    this.add(mountain);

    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(p.rad * 0.32, p.h * 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    snow.position.set(p.x, p.h - p.h * 0.16, p.z);
    this.add(snow);

    this.solids.push({ x: p.x, y: 0, z: p.z, r: p.rad, h: p.h });
  }

  terrainHeight(x: number, z: number): number {
    return mountainTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
  }

  update(dt: number, tGlobal: number): void {
    for (const inst of this.treeInsts) inst.update?.(tGlobal);
  }
}
