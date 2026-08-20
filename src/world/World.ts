import * as THREE from 'three';
import { Ocean } from './Ocean';
import { Island } from './Island';
import { Mountains } from './Mountains';
import { Snow } from './Snow';
import { Desert } from './Desert';
import { Valley } from './Valley';
import { Sky } from './Sky';
import { House, Whale, Bird, Cloud, Rainbow, Balloon } from './landmarks';
import { Roads } from './Roads';
import { Animal } from './Animals';
import { ROAD_DEFS } from '../rails/roadDefs';
import type { LevelConfig } from '../levels';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { TAU } from '../utils';
import { mulberry32 } from './valleyLayout';
import {
  type LevelData,
  valleyLayoutFrom,
  islandLayoutFrom,
  mountainsLayoutFrom,
  snowLayoutFrom,
  desertLayoutFrom
} from '../editor/levelData';

type Terrain = Island | Mountains | Snow | Desert | Valley;

// Deterministic seed for the decorative cloud scatter: the clouds used to be
// placed with Math.random, which made every rebuild (e.g. the map editor's
// world rebuilds) scatter them to new spots.
function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class World {
  readonly ocean?: Ocean;
  readonly terrain: Terrain;
  readonly sky = new Sky();

  readonly whale?: Whale;
  readonly rainbow = new Rainbow();
  readonly birds: Bird[] = [];
  readonly clouds: Cloud[] = [];
  readonly balloons: Balloon[] = [];
  readonly houses: House[] = [];
  readonly solids: Solid[] = [];
  readonly roads?: Roads;
  readonly creatures: Animal[] = [];
  /** Road control polylines actually rendered (procedural defs or LevelData). */
  readonly roadDefs: [number, number][][];

  private tGlobal = 0;

  constructor(config: LevelConfig, models: WorldModels = {}, data?: LevelData) {
    // Data-driven levels (map editor / public/levels/*.json) pass a LevelData;
    // the shipped levels keep their procedural build*Layout() as default.
    this.roadDefs = data ? data.roads : ROAD_DEFS[config.worldType];

    if (config.worldType === 'mountains') {
      const mountains = new Mountains(
        { grass: config.groundColor, lake: config.oceanShallow, houseColors: config.houseColors },
        models,
        data ? mountainsLayoutFrom(data) : undefined
      );
      this.terrain = mountains;
      this.roads = new Roads((x, z) => this.terrainHeight(x, z), this.roadDefs);
      this.creatures.push(...mountains.animals);
    } else if (config.worldType === 'snow') {
      const snow = new Snow(
        { ground: config.groundColor, lake: config.oceanShallow, houseColors: config.houseColors },
        models,
        data ? snowLayoutFrom(data) : undefined
      );
      this.terrain = snow;
      this.roads = new Roads((x, z) => snow.terrainHeight(x, z), this.roadDefs);
      this.creatures.push(...snow.animals);
    } else if (config.worldType === 'desert') {
      const desert = new Desert(
        { ground: config.groundColor, oasis: config.oceanShallow, houseColors: config.houseColors },
        models,
        data ? desertLayoutFrom(data) : undefined
      );
      this.terrain = desert;
      this.roads = new Roads((x, z) => desert.terrainHeight(x, z), this.roadDefs);
      this.creatures.push(...desert.animals);
    } else if (config.worldType === 'valley') {
      const valley = new Valley(
        { grass: config.groundColor, houseColors: config.houseColors },
        models,
        data ? valleyLayoutFrom(data) : undefined
      );
      this.terrain = valley;
      this.roads = new Roads((x, z) => valley.terrainHeight(x, z), this.roadDefs);
      this.creatures.push(...valley.animals);
    } else {
      const island = new Island(
        { grass: config.groundColor, houseColors: config.houseColors },
        models,
        data ? islandLayoutFrom(data) : undefined
      );
      this.terrain = island;
      this.ocean = new Ocean({ deep: config.oceanDeep, shallow: config.oceanShallow });
      this.whale = new Whale(models.whale);
      this.whale.position.set(-88, -1.2, 56); // open sea, outside the beach ring
      this.roads = new Roads((x, z) => this.terrainHeight(x, z), this.roadDefs);
      this.creatures.push(...island.animals);
    }

    this.rainbow.position.set(24, 0, -24);

    const birdColors = [0xff5a5a, 0x4aa8ff, 0xffd54a];
    const birdSpots: [number, number, number][] = [
      [22, 9, 6],
      [-26, 10, -8],
      [12, 11, 22],
      [0, 12, -20],
      [-12, 13, 14]
    ];
    birdSpots.forEach((p, i) => {
      const b = new Bird(birdColors[i % birdColors.length], models.bird ? models.bird.clone() : undefined);
      b.place(p[0], p[1], p[2]);
      this.birds.push(b);
    });

    const cloudRng = mulberry32(seedFromId(config.id) ^ (config.cloudCount * 0x9e3779b9));
    for (let i = 0; i < config.cloudCount; i++) {
      const c = new Cloud(models.cloud ? models.cloud.clone() : undefined);
      c.scale.setScalar(0.9 + cloudRng() * 0.6);
      c.rotation.y = cloudRng() * TAU;
      c.position.set(-70 + cloudRng() * 140, 12 + cloudRng() * 14, -70 + cloudRng() * 140);
      this.clouds.push(c);
    }

    const balloonColors = [0xff6f91, 0x7ae07a, 0xffb74d];
    const balloonSpots: [number, number, number][] = [
      [20, 12, 14],
      [-22, 15, 20],
      [2, 17, -32],
      [-4, 18, 8],
      [16, 14, -24]
    ];
    balloonSpots.forEach((p, i) => {
      const bl = new Balloon(balloonColors[i], models.balloon ? models.balloon.clone() : undefined);
      bl.position.set(p[0], p[1], p[2]);
      this.balloons.push(bl);
    });

    this.houses = this.terrain.houses;
    this.solids = this.terrain.solids;

    // Every world places its own road network (procedural defs or the
    // LevelData's roads) and its own animals, so there is no generic fallback.
  }

  addToScene(parent: THREE.Object3D): void {
    parent.add(this.terrain, this.sky);
    if (this.ocean) parent.add(this.ocean);
    if (this.whale) parent.add(this.whale);
    parent.add(this.rainbow);
    this.birds.forEach((b) => parent.add(b));
    this.clouds.forEach((c) => parent.add(c));
    this.balloons.forEach((b) => parent.add(b));
    this.creatures.forEach((c) => parent.add(c));
    if (this.roads) parent.add(this.roads);
  }

  terrainHeight(x: number, z: number): number {
    return this.terrain.terrainHeight(x, z);
  }

  update(dt: number, _nightAmount: number): void {
    this.tGlobal += dt;
    this.ocean?.update(dt);
    this.terrain.update(dt, this.tGlobal);
    this.sky.update(dt);
    this.whale?.update(dt);
    this.rainbow.update(dt);
    this.birds.forEach((b) => b.update(dt, this.tGlobal));
    this.clouds.forEach((c) => c.update(dt));
    this.balloons.forEach((b) => b.update(dt, this.tGlobal));
    this.houses.forEach((h) => h.update(dt));
    for (const a of this.creatures) a.update(dt, (x, z) => this.terrainHeight(x, z));
  }

  setNight(night: number): void {
    this.houses.forEach((h) => h.setLights(night > 0.55));
    if (
      this.terrain instanceof Valley ||
      this.terrain instanceof Snow ||
      this.terrain instanceof Desert ||
      this.terrain instanceof Mountains ||
      this.terrain instanceof Island
    )
      this.terrain.setNightLamps(night > 0.5);
  }
}
