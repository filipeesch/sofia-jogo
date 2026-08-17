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

// "Vale das Montanhas": a green valley ringed by snowy peaks, with a village,
// a farm, a lake and a pine forest. All positions come from
// mountainsLayout.ts (deterministic, validated by scripts/check-mountain-level.mjs).
export class Mountains extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];

  private layout: MountainsLayout;
  private foliage: { g: THREE.Group; phase: number; speed: number }[] = [];
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

    for (const p of this.layout.peaks) this.addPeak(p, models.peak);
    this.peaks = this.layout.peaks;

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
      for (const l of this.layout.lamps) {
        const lamp = models.lamp.clone();
        lamp.position.set(l.x, l.y, l.z);
        this.add(lamp);
        lamp.traverse((o) => {
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

    if (models.bench) {
      for (const b of this.layout.benches) {
        const bench = models.bench.clone();
        bench.position.set(b.x, b.y, b.z);
        bench.rotation.y = b.rotY;
        this.add(bench);
        this.solids.push({ x: b.x, y: b.y + 0.5, z: b.z, r: 1.0, h: 1.0 });
      }
    }

    const { barn, fencePosts } = this.layout;
    if (models.barn) {
      const barnMesh = models.barn.clone();
      barnMesh.position.set(barn.x, barn.y, barn.z);
      this.add(barnMesh);
      this.solids.push({ x: barn.x, y: barn.y + 2, z: barn.z, r: 2.3, h: 4 });
    }
    if (models.fence) {
      for (const f of fencePosts) {
        const post = models.fence.clone();
        post.position.set(f.x, f.y, f.z);
        post.rotation.y = f.rotY;
        this.add(post);
        this.solids.push({ x: f.x, y: f.y + 0.5, z: f.z, r: 0.4, h: 1 });
      }
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
    for (const t of this.layout.trees) {
      this.addTree(models, t);
    }
    if (models.bush) {
      for (const b of this.layout.bushes) {
        const bush = models.bush.clone();
        bush.position.set(b.x, b.y, b.z);
        bush.rotation.y = this.rng() * TAU;
        this.add(bush);
      }
    }
    if (models.flower) {
      for (const f of this.layout.flowers) {
        const flower = models.flower.clone();
        flower.position.set(f.x, f.y, f.z);
        this.add(flower);
      }
    }

    // ---- L4: decorations (snowmen on the peak slopes) ----
    for (const s of this.layout.snowmen) {
      if (!models.snowman) continue;
      const snowman = models.snowman.clone();
      snowman.position.set(s.x, s.y, s.z);
      snowman.rotation.y = s.rotY;
      this.add(snowman);
      this.solids.push({ x: s.x, y: s.y + 1.1, z: s.z, r: 0.9, h: 2.2 });
    }
  }

  private addTree(models: WorldModels, t: { x: number; z: number; y: number; scale: number; rotY: number; pine: boolean }): void {
    const src = t.pine
      ? models.pine ?? models.tree
      : models.appletree ?? models.tree ?? models.pine;
    const g = src ? src.clone() : undefined;
    if (g) {
      g.scale.setScalar(t.scale);
      g.position.set(t.x, t.y, t.z);
      g.rotation.y = t.rotY;
      this.add(g);
      this.foliage.push({ g, phase: this.rng() * TAU, speed: 0.6 + this.rng() * 0.5 });
    } else {
      this.addDraftTree(t.x, t.z, t.scale);
    }
    this.solids.push({ x: t.x, y: t.y + 2 * t.scale, z: t.z, r: 1.2 * t.scale, h: 4 * t.scale });
  }

  private addPeak(p: PeakPos, model?: THREE.Group): void {
    if (model) {
      const g = model.clone();
      g.position.set(p.x, 0, p.z);
      g.scale.setScalar(p.h / 7);
      this.add(g);
      this.solids.push({ x: p.x, y: 0, z: p.z, r: p.rad, h: p.h });
      return;
    }
    this.addPeakDraft(p);
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

  private addDraftTree(x: number, z: number, scale: number): void {
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

    g.scale.setScalar(scale);
    g.position.set(x, this.terrainHeight(x, z), z);
    this.add(g);
    this.foliage.push({ g: foliage, phase: this.rng() * TAU, speed: 0.6 + this.rng() * 0.6 });
  }

  terrainHeight(x: number, z: number): number {
    return mountainTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
  }

  update(dt: number, tGlobal: number): void {
    for (const f of this.foliage) {
      f.g.rotation.z = Math.sin(tGlobal * f.speed + f.phase) * 0.06;
    }
  }
}
