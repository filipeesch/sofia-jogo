import * as THREE from 'three';
import { House } from './landmarks';
import { Animal } from './Animals';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import {
  buildIslandLayout,
  islandTerrainHeight,
  ISLAND_HILLS,
  ISLAND_LAGOON,
  ISLAND_LAGOON_FLOOR,
  ISLAND_PEAK,
  ISLAND_RADIUS,
  mulberry32,
  ISLAND_SEED,
  type IslandLayout,
  type IslandPeakPos
} from './islandLayout';
import { instanceProps, meshMaterialNamed, type InstancedProps, type InstancePlacement } from './instancing';

// "Ilha Feliz": a big tropical island (radius 76, ~5x the old one in usable
// area) with a village, a lagoon with ducks, a farm, a palm beach and two
// rocky GREEN mountains — deliberately no snow / snowmen on a tropical
// island. All positions come from islandLayout.ts (deterministic, validated
// by scripts/check-island-level.mjs).
export class Island extends THREE.Group {
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly animals: Animal[] = [];
  readonly radius = ISLAND_RADIUS;

  private layout: IslandLayout;
  private treeInsts: InstancedProps[] = [];
  private lamps: { mat: THREE.MeshStandardMaterial }[] = [];
  private lampLights: THREE.PointLight[] = [];
  // Visual-only PRNG (sway phase/speed, initial animal facing, rock jitter) —
  // positions always come from the deterministic layout.
  private rng: () => number;

  constructor(config: { grass?: number; lagoon?: number; houseColors?: number[] } = {}, models: WorldModels = {}) {
    super();
    this.layout = buildIslandLayout();
    this.rng = mulberry32(ISLAND_SEED + 1);

    const grass = config.grass ?? 0x6fc45c;
    const lagoonColor = config.lagoon ?? 0x45b6d6;
    const houseColors = config.houseColors ?? [0xff8a80, 0x80d8ff, 0xfff176];

    // ---- L0: ground mound + beach + hills + rocky mountains + lagoon ----
    const baseGeo = new THREE.SphereGeometry(1, 44, 26, 0, TAU, 0, Math.PI / 2);
    baseGeo.scale(this.radius, ISLAND_PEAK, this.radius);
    const base = new THREE.Mesh(
      baseGeo,
      new THREE.MeshStandardMaterial({ color: grass, roughness: 0.85, flatShading: true })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    this.add(base);

    // Sandy beach ring.
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radius - 3, this.radius + 5.5, 0.5, 64),
      new THREE.MeshStandardMaterial({ color: 0xf4e3a1, roughness: 0.9, flatShading: true })
    );
    beach.position.y = 0.15;
    beach.receiveShadow = true;
    this.add(beach);

    for (const hill of ISLAND_HILLS) {
      const hillGeo = new THREE.SphereGeometry(1, 14, 10);
      hillGeo.scale(hill.r, hill.h, hill.r);
      const mesh = new THREE.Mesh(
        hillGeo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(grass).offsetHSL(0, 0, 0.06).getHex(),
          roughness: 0.85,
          flatShading: true
        })
      );
      mesh.position.set(hill.x, this.baseHeight(hill.x, hill.z) - 0.15, hill.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.add(mesh);
    }

    for (const m of this.layout.mountains) this.addMountain(m);

    // Lagoon (inland, flush with the flattened basin floor).
    const lagoon = new THREE.Mesh(
      new THREE.CircleGeometry(ISLAND_LAGOON.r + 0.6, 40),
      new THREE.MeshStandardMaterial({ color: lagoonColor, roughness: 0.3 })
    );
    lagoon.rotation.x = -Math.PI / 2;
    lagoon.position.set(ISLAND_LAGOON.x, ISLAND_LAGOON_FLOOR + 0.12, ISLAND_LAGOON.z);
    lagoon.receiveShadow = true;
    this.add(lagoon);

    // ---- L2: anchors beside the roads (village, lagoon, farm, beach) ----
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
      // Real light: one warm point light per lamp head, on only at night.
      for (const l of this.layout.lamps) {
        const pl = new THREE.PointLight(0xffd97a, 0, 14, 2);
        pl.position.set(l.x, l.y + 3.3, l.z);
        this.add(pl);
        this.lampLights.push(pl);
      }
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
    if (barn && models.barn) { // barn optional in data-driven levels
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

    // Animals (farm + village + lagoon edge) — all defined by the layout.
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

    // ---- L3: vegetation (palm grove + inland trees + filler) ----
    const treeGroups: Record<string, InstancePlacement[]> = {};
    for (const t of this.layout.trees) {
      const src = t.palm ? models.palm ?? models.tree : models.appletree ?? models.tree ?? models.palm;
      if (!src) {
        this.addDraftTree(t.x, t.z, t.scale);
      } else {
        const tplKey = t.palm
          ? models.palm ? 'palm' : 'tree'
          : models.appletree ? 'appletree' : models.tree ? 'tree' : 'palm';
        (treeGroups[tplKey] ??= []).push({
          x: t.x,
          y: t.y,
          z: t.z,
          scale: t.scale,
          rotY: t.rotY,
          phase: this.rng() * TAU,
          speed: 0.6 + this.rng() * 0.5
        });
      }
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
  }

  // Rocky tropical mountain: a dome that matches islandTerrainHeight, topped
  // with loose rocks. No snow — this is a warm island.
  private addMountain(m: IslandPeakPos): void {
    const baseY = this.baseHeight(m.x, m.z);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12, 0, TAU, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x9aa58d, roughness: 0.95, flatShading: true })
    );
    dome.scale.set(m.rad, m.h, m.rad);
    dome.position.set(m.x, baseY - 0.2, m.z);
    dome.castShadow = true;
    dome.receiveShadow = true;
    this.add(dome);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8d84, roughness: 0.9, flatShading: true });
    const nRocks = 4;
    for (let i = 0; i < nRocks; i++) {
      const f = 0.28 + this.rng() * 0.26; // fraction of the radius (upper slope)
      const a = (i / nRocks) * TAU + this.rng() * 0.9;
      const s = 0.8 + this.rng() * 0.7;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rockMat);
      rock.scale.set(s * 1.25, s * 0.85, s * 1.25);
      rock.position.set(
        m.x + Math.cos(a) * m.rad * f,
        baseY + m.h * Math.sqrt(1 - f * f) - s * 0.25,
        m.z + Math.sin(a) * m.rad * f
      );
      rock.rotation.set(this.rng() * TAU, this.rng() * TAU, this.rng() * TAU);
      rock.castShadow = true;
      this.add(rock);
    }

    this.solids.push({ x: m.x, y: baseY, z: m.z, r: m.rad - 3, h: m.h });
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
  }

  private baseHeight(x: number, z: number): number {
    const d = Math.hypot(x, z);
    if (d >= this.radius) return 0;
    const n = d / this.radius;
    return ISLAND_PEAK * Math.sqrt(Math.max(0, 1 - n * n));
  }

  terrainHeight(x: number, z: number): number {
    return islandTerrainHeight(x, z);
  }

  setNightLamps(on: boolean): void {
    for (const l of this.lamps) l.mat.emissiveIntensity = on ? 1.6 : 0;
    for (const p of this.lampLights) p.intensity = on ? 2.6 : 0;
  }

  update(dt: number, tGlobal: number): void {
    for (const inst of this.treeInsts) inst.update?.(tGlobal);
  }
}
