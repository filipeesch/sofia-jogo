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
import type { LevelConfig } from '../levels';
import type { WorldModels } from '../assets';
import type { Solid } from '../utils';
import { rand, TAU } from '../utils';

type Terrain = Island | Mountains | Snow | Desert | Valley;

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

  private tGlobal = 0;

  constructor(config: LevelConfig, models: WorldModels = {}) {
    if (config.worldType === 'mountains') {
      const mountains = new Mountains({ grass: config.groundColor, lake: config.oceanShallow, houseColors: config.houseColors }, models);
      this.terrain = mountains;
      this.roads = new Roads((x, z) => this.terrainHeight(x, z), 'mountains');
      this.creatures.push(...mountains.animals);
    } else if (config.worldType === 'snow') {
      const snow = new Snow({ ground: config.groundColor, lake: config.oceanShallow, houseColors: config.houseColors }, models);
      this.terrain = snow;
      this.roads = new Roads((x, z) => snow.terrainHeight(x, z), 'snow');
      this.creatures.push(...snow.animals);
    } else if (config.worldType === 'desert') {
      const desert = new Desert({ ground: config.groundColor, oasis: config.oceanShallow, houseColors: config.houseColors }, models);
      this.terrain = desert;
      this.roads = new Roads((x, z) => desert.terrainHeight(x, z), 'desert');
      this.creatures.push(...desert.animals);
    } else if (config.worldType === 'valley') {
      const valley = new Valley({ grass: config.groundColor, houseColors: config.houseColors }, models);
      this.terrain = valley;
      this.roads = new Roads((x, z) => valley.terrainHeight(x, z), 'valley');
      this.creatures.push(...valley.animals);
    } else {
      const island = new Island({ grass: config.groundColor, houseColors: config.houseColors }, models);
      this.terrain = island;
      this.ocean = new Ocean({ deep: config.oceanDeep, shallow: config.oceanShallow });
      this.whale = new Whale(models.whale);
      this.whale.position.set(-88, -1.2, 56); // open sea, outside the beach ring
      this.roads = new Roads((x, z) => this.terrainHeight(x, z), 'island');
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

    for (let i = 0; i < config.cloudCount; i++) {
      const c = new Cloud(models.cloud ? models.cloud.clone() : undefined);
      c.scale.setScalar(rand(0.9, 1.5));
      c.rotation.y = rand(0, TAU);
      c.position.set(rand(-70, 70), rand(12, 26), rand(-70, 70));
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

    // Every world places its own road network (kind matches the world's pure
    // layout module) and its own animals, so there is no generic fallback.
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.terrain, this.sky);
    if (this.ocean) scene.add(this.ocean);
    if (this.whale) scene.add(this.whale);
    scene.add(this.rainbow);
    this.birds.forEach((b) => scene.add(b));
    this.clouds.forEach((c) => scene.add(c));
    this.balloons.forEach((b) => scene.add(b));
    this.creatures.forEach((c) => scene.add(c));
    if (this.roads) scene.add(this.roads);
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
