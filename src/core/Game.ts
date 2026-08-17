import * as THREE from 'three';
import type { Vehicle, VehicleController } from '../entities/Vehicle';
import { CameraController } from '../controllers/CameraController';
import { World } from '../world/World';
import { DayNightCycle } from '../world/DayNightCycle';
import { Collectibles } from '../systems/Collectibles';
import { ProximityEvents } from '../systems/ProximityEvents';
import { ParticleEffects } from '../systems/ParticleEffects';
import { AudioManager } from '../systems/AudioManager';
import { playSound, preloadSound } from '../ui/sounds';
import { UI } from '../ui/UI';
import { buildRoadTour } from '../rails/roadTour';
import { flightTourPoints } from '../rails/flightTour';
import { PathFollower } from '../rails/pathFollower';
import { ROAD_DEFS } from '../rails/roadDefs';
import type { CarController } from '../controllers/CarController';
import type { FlightController } from '../controllers/FlightController';
import { AmbientPlanes } from '../world/AmbientPlanes';
import { Clickables } from '../systems/Clickables';
import { DebugCapture } from '../debug/DebugCapture';
import type { LevelConfig } from '../levels';
import { clamp, damp, dampFactor } from '../utils';
import type { WorldModels } from '../assets';

function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

// Collects every texture a material references (direct slots like Sprite.map
// and ShaderMaterial uniform values), so dispose() can free them on the GPU.
function collectMaterialTextures(material: THREE.Material, out: Set<THREE.Texture>): void {
  const mat = material as unknown as Record<string, unknown>;
  for (const value of Object.values(mat)) {
    if (value && typeof value === 'object' && (value as THREE.Texture).isTexture) {
      out.add(value as THREE.Texture);
    }
  }
  const uniforms = (material as unknown as { uniforms?: Record<string, { value?: unknown }> }).uniforms;
  if (uniforms) {
    for (const u of Object.values(uniforms)) {
      const inner = u && (u as { value?: unknown }).value;
      if (inner && (inner as THREE.Texture).isTexture) out.add(inner as THREE.Texture);
    }
  }
}

export class Game {
  onExit?: () => void;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private clock = new THREE.Clock();

  readonly vehicle: Vehicle;
  readonly controller: VehicleController;
  private vehicleType: 'airplane' | 'car';
  private cam: CameraController;
  readonly world: World;
  readonly dayNight: DayNightCycle;
  readonly collectibles = new Collectibles();
  readonly particles = new ParticleEffects();
  readonly audio = new AudioManager();
  private proximity: ProximityEvents;
  private ui: UI;

  private trailTimer = 0;
  private shadowTimer = 0;
  private ambientPlanes: AmbientPlanes;
  private musicTrack: number;
  private clickables = new Clickables();
  private debugCapture: DebugCapture | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  private activePointer: number | null = null;
  private startX = 0;
  private startY = 0;

  // "Sobre trilhos": on-rails mode. Default ON — the car drives a closed
  // tour through every road of the level; the airplane loops over the
  // points of interest. The HUD toggle (or the T key) switches modes.
  private railMode = true;
  private rail: PathFollower;
  private railForward = new THREE.Vector3(0, 0, -1);
  private railYaw = 0;
  private railPitch = 0;
  private railBank = 0;
  private rejoinFrom = new THREE.Vector3();
  private rejoinT = 0;
  private rejoinDur = 1;
  private readonly railScratch = new THREE.Vector3();

  constructor(container: HTMLElement, level: LevelConfig, vehicle: Vehicle, controller: VehicleController, models: WorldModels = {}, ambientModel?: THREE.Group, vehicleType: 'airplane' | 'car' = 'airplane') {
    this.vehicle = vehicle;
    this.controller = controller;
    this.vehicleType = vehicleType;

    const debug = new URLSearchParams(window.location.search).has('debug');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: debug });
    if (debug) console.log('[debug] modo de captura ativo — suba o servidor com npm run shots e use window.__debug no console');
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(level.skyDayHorizon);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 15, 52);
    this.cam = new CameraController(this.camera, this.vehicleType === 'car' ? 6.5 : 9, this.vehicleType === 'car' ? 2.4 : 3.6);
    if (debug) this.debugCapture = new DebugCapture(this.camera, this.renderer.domElement);

    this.scene.fog = new THREE.Fog(level.skyDayHorizon, 60, 240);

    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x9fd08a, 1.0);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff4dc, 2.4);
    this.sun.castShadow = true;
    // The sun's shadow is re-rendered on a fixed cadence (see update), not
    // every frame: it barely moves between frames and the scene is mostly
    // static, so a 60fps shadow pass is pure waste.
    this.sun.shadow.autoUpdate = false;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 1;
    sc.far = 300;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.needsUpdate = true; // render the shadow map once at startup
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.world = new World(level, models);
    this.dayNight = new DayNightCycle({
      cycleSeconds: level.cycleSeconds,
      startNight: level.startNight,
      dayTop: level.skyDayTop,
      dayHorizon: level.skyDayHorizon
    });

    this.world.addToScene(this.scene);
    this.collectibles.build(new THREE.Vector3(0, 0, 0), 90, level.starCount);
    this.collectibles.addToScene(this.scene);
    this.scene.add(this.particles);

    this.vehicle.rotation.order = 'YXZ';
    this.controller.yaw = Math.PI; // face the world center
    if (this.vehicleType === 'car') {
      this.vehicle.position.set(0, this.world.terrainHeight(0, 20) + 0.05, 20);
    } else {
      this.vehicle.position.set(0, 12, 42);
    }
    this.scene.add(this.vehicle);

    // Build the on-rails path. The car tour is computed from the level's road
    // network (every street is driven; dead ends get a 180° U-turn). The
    // airplane loops over the world's points of interest instead.
    const railTerrain = (x: number, z: number) => this.world.terrainHeight(x, z);
    const roadDefs = this.world.roads ? ROAD_DEFS[this.world.roads.kind] : ROAD_DEFS.valley;
    const tourPoints =
      this.vehicleType === 'car'
        ? buildRoadTour(roadDefs, railTerrain, this.vehicle.position.x, this.vehicle.position.z, {
            solids: this.world.solids
          }).points
        : flightTourPoints(level.worldType);
    this.rail = new PathFollower(tourPoints);
    this.rail.s =
      this.vehicleType === 'car'
        ? this.rail.nearest(this.vehicle.position.x, this.vehicle.position.z)
        : this.rail.nearest(this.vehicle.position.x, this.vehicle.position.z, this.vehicle.position.y);
    this.railForward.copy(this.rail.getForward());
    this.railYaw = Math.atan2(this.railForward.x, this.railForward.z);
    // Glide from the spawn point onto the rail instead of snapping.
    this.rejoinFrom.copy(this.vehicle.position);
    this.rail.posAt(this.railScratch);
    this.rejoinDur = clamp(this.rejoinFrom.distanceTo(this.railScratch) / this.railSpeed(), 0.5, 4);
    this.rejoinT = this.rejoinDur;

    this.musicTrack = level.music;
    this.ambientPlanes = new AmbientPlanes(ambientModel);
    this.ambientPlanes.addToScene(this.scene);

    this.proximity = new ProximityEvents(this.world, this.particles, this.audio, this.vehicle);

    this.registerClickables();

    if (this.debugCapture) {
      const dbg = (window as unknown as Record<string, unknown>).__debug as Record<string, unknown> | undefined;
      if (dbg) {
        // Live positions of the clickable creatures (capture tooling and tests).
        dbg.creatures = () =>
          this.world.creatures.map((c) => [c.type, c.position.x, c.position.y, c.position.z, c.scale.x]);
        // Live positions/scale of the clickable sky objects (clouds, balloons).
        dbg.objects = () =>
          this.world.clouds
            .map((c) => ({ kind: 'cloud', p: [c.position.x, c.position.y, c.position.z] }))
            .concat(this.world.balloons.map((b) => ({ kind: 'balloon', p: [b.position.x, b.position.y, b.position.z], s: b.scale.x })));
        // On-rails mode state (capture tooling and tests).
        dbg.toggleRail = () => this.setRailMode(!this.railMode);
        dbg.rail = () => ({
          mode: this.railMode,
          s: this.rail.s,
          total: this.rail.total,
          pos: [this.vehicle.position.x, this.vehicle.position.y, this.vehicle.position.z]
        });
        // Renderer stats (draw calls / triangles / GPU memory) for profiling.
        dbg.stats = () => {
          const info = this.renderer.info;
          let instanced = 0;
          let instCount = 0;
          let meshes = 0;
          let objects = 0;
          this.scene.traverse((o) => {
            objects++;
            const any = o as { isInstancedMesh?: boolean; count?: number; isMesh?: boolean; isPoints?: boolean };
            if (any.isInstancedMesh) {
              instanced++;
              instCount += any.count ?? 0;
            } else if (any.isMesh || any.isPoints) meshes++;
          });
          return {
            calls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            objects,
            meshes,
            instanced,
            instCount
          };
        };
      }
    }

    this.collectibles.onCollect = (count) => {
      this.ui.setStars(count);
      if (count % 5 === 0) this.celebrate();
    };
    this.controller.onSpecial = () => {
      this.audio.resume();
      if (this.vehicleType === 'car') this.audio.horn();
      else this.audio.special();
      this.particles.burst(this.vehicle.position, {
        count: 26,
        color: 0xffffff,
        speed: 3,
        gravity: 0.5,
        life: 1.0,
        size: 5,
        biasY: 1
      });
    };
    this.controller.onBounce = () => this.audio.boing();
    this.proximity.onRainbow = () => {
      this.trailTimer = 5;
    };

    this.ui = new UI(
      () => this.controller.triggerSpecial(),
      () => this.exit(),
      { railMode: this.railMode, onToggleRail: () => this.setRailMode(!this.railMode) }
    );
    this.ui.setStars(0);

    this.bindInput();
    window.addEventListener('resize', this.onResize);
  }

  private bindInput(): void {
    window.addEventListener('pointermove', this.onPointerMoveMouse);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMoveTouch);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onPointerMoveMouse = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      this.controller.setSteer(x, -y);
    }
  };

  private onMouseLeave = (): void => {
    this.controller.setSteer(0, 0);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.audio.resume();
    if (e.pointerType === 'touch' && this.activePointer === null) {
      this.activePointer = e.pointerId;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.tapAt(e.clientX, e.clientY);
    } else if (e.pointerType === 'mouse') {
      if (!(e.target as HTMLElement).closest('button')) {
        if (!this.tapAt(e.clientX, e.clientY)) this.controller.triggerSpecial();
      }
    }
  };

  private onPointerMoveTouch = (e: PointerEvent): void => {
    if (this.activePointer === e.pointerId) {
      const scale = Math.min(window.innerWidth, window.innerHeight) * 0.3;
      const x = clamp((e.clientX - this.startX) / scale, -1, 1);
      const y = clamp((this.startY - e.clientY) / scale, -1, 1);
      this.controller.setSteer(x, y);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointer === e.pointerId) {
      this.activePointer = null;
      this.controller.setSteer(0, 0);
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.audio.resume();
    if (e.code === 'Space') {
      e.preventDefault();
      this.controller.triggerSpecial();
    }
    if (e.code === 'KeyT') {
      this.setRailMode(!this.railMode);
    }
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private registerClickables(): void {
    this.clickables.register(this.vehicle, () => this.controller.triggerSpecial());
    for (const sprite of this.collectibles.sprites()) {
      this.clickables.register(sprite, () => this.collectibles.collectBySprite(sprite));
    }
    if (this.world.whale) {
      this.clickables.register(this.world.whale, () => {
        this.world.whale!.jump();
        this.particles.burst(this.world.whale!.position, {
          count: 20,
          color: 0xbfe4ff,
          speed: 3,
          gravity: -6,
          life: 0.8,
          size: 6,
          biasY: 4
        });
        this.audio.splash();
      });
    }
    for (const bird of this.world.birds) {
      this.clickables.register(bird, () => {
        bird.fly();
        this.audio.chirp();
      });
    }
    for (const cloud of this.world.clouds) {
      this.clickables.register(cloud, () => {
        this.particles.burst(cloud.position, {
          count: 14,
          color: 0xffffff,
          speed: 2,
          gravity: 0.3,
          life: 1.1,
          size: 5,
          biasY: 1
        });
        this.audio.cloudPuff();
      });
    }
    for (const balloon of this.world.balloons) {
      this.clickables.register(balloon, () => {
        balloon.bounce();
        this.audio.balloonBoing();
      });
    }
    for (const house of this.world.houses) {
      this.clickables.register(house, () => {
        house.blink();
        this.audio.plim();
      });
    }
    // Real recordings for the creatures that have one (public/sounds/);
    // the procedural synth of AudioManager is the fallback when the file is
    // missing (same philosophy as the animal puzzle). Unknown creatures keep
    // the generic plim, as before.
    const creatureSounds: Record<string, { file: string; synth: () => void }> = {
      dog: { file: 'sounds/dog.mp3', synth: () => this.audio.bark() },
      cat: { file: 'sounds/cat.mp3', synth: () => this.audio.meow() },
      chicken: { file: 'sounds/chicken.mp3', synth: () => this.audio.cluck() },
      sheep: { file: 'sounds/sheep.mp3', synth: () => this.audio.baa() },
      cow: { file: 'sounds/cow.mp3', synth: () => this.audio.moo() },
      duck: { file: 'sounds/duck.mp3', synth: () => this.audio.quack() },
    };
    const presentTypes = new Set(this.world.creatures.map((c) => c.type));
    for (const t of presentTypes) {
      const s = creatureSounds[t];
      if (s) void preloadSound(s.file);
    }
    for (const c of this.world.creatures) {
      const s = creatureSounds[c.type];
      this.clickables.register(c, () => {
        c.hop();
        if (s) playSound(s.file, s.synth);
        else this.audio.plim();
      });
    }
  }

  private tapAt(clientX: number, clientY: number): boolean {
    this.pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const entry = this.clickables.pick(this.raycaster);
    if (entry) {
      entry.onTap();
      return true;
    }
    return false;
  }

  private exit(): void {
    this.onExit?.();
  }

  private railSpeed(): number {
    return this.vehicleType === 'car' ? 9 : 11;
  }

  // On-rails update: follow the tour path, orient the vehicle along it with
  // smooth heading/bank and a short glide when rejoining the rail after
  // manual driving. Returns the forward vector (used by the chase camera).
  private updateRail(dt: number): THREE.Vector3 {
    this.rail.update(dt, this.railSpeed());
    this.rail.posAt(this.railScratch);
    if (this.rejoinT > 0) {
      this.rejoinT = Math.max(0, this.rejoinT - dt);
      const t = 1 - this.rejoinT / this.rejoinDur;
      const k = t * t * (3 - 2 * t); // smoothstep
      this.vehicle.position.lerpVectors(this.rejoinFrom, this.railScratch, k);
    } else {
      this.vehicle.position.copy(this.railScratch);
    }

    const f = this.rail.getForward();
    this.railForward.copy(f);
    const targetYaw = Math.atan2(f.x, f.z);
    const rate = wrapAngle(targetYaw - this.railYaw) / Math.max(dt, 1e-4);
    this.railYaw = this.railYaw + wrapAngle(targetYaw - this.railYaw) * dampFactor(9, dt);

    this.vehicle.rotation.order = 'YXZ';
    this.vehicle.rotation.y = this.railYaw;
    this.vehicle.rotation.x = 0;
    if (this.vehicleType === 'car') {
      // Slight body roll into turns (matches the manual feel).
      this.vehicle.rotation.z = damp(this.vehicle.rotation.z, clamp(rate * 0.05, -0.16, 0.16), 5, dt);
    } else {
      this.railPitch = damp(this.railPitch, Math.asin(clamp(f.y, -1, 1)), 5, dt);
      this.railBank = damp(this.railBank, clamp(-rate * 0.35, -0.55, 0.55), 4, dt);
      this.vehicle.rotation.x = -this.railPitch;
      this.vehicle.rotation.z = this.railBank;
    }
    return this.railForward;
  }

  // Switch between on-rails and manual control. Rejoining the rail glides the
  // vehicle back to the closest point of the tour; leaving the rail hands the
  // current heading to the manual controller (no heading jump).
  setRailMode(on: boolean): void {
    if (this.railMode === on) return;
    this.railMode = on;
    this.ui.setRailMode(on);
    if (on) {
      const p = this.vehicle.position;
      this.rail.s =
        this.vehicleType === 'car'
          ? this.rail.nearest(p.x, p.z)
          : this.rail.nearest(p.x, p.z, p.y);
      this.railForward.copy(this.rail.getForward());
      this.railYaw = Math.atan2(this.railForward.x, this.railForward.z);
      this.rejoinFrom.copy(p);
      this.rail.posAt(this.railScratch);
      this.rejoinDur = clamp(p.distanceTo(this.railScratch) / this.railSpeed(), 0.5, 4);
      this.rejoinT = this.rejoinDur;
    } else {
      this.controller.setSteer(0, 0);
      const yaw = Math.atan2(this.railForward.x, this.railForward.z);
      if (this.vehicleType === 'car') {
        (this.controller as CarController).yaw = yaw;
      } else {
        const fc = this.controller as FlightController;
        fc.yaw = yaw;
        fc.pitch = this.railPitch;
      }
    }
  }

  private celebrate(): void {
    this.audio.fanfare();
    this.world.rainbow.pulse();
    this.trailTimer = 6;
    const center = this.vehicle.position.clone().add(new THREE.Vector3(0, 12, 0));
    this.particles.burst(center, {
      count: 60,
      color: 0xffe082,
      speed: 1.2,
      gravity: -4,
      life: 2.2,
      size: 7,
      biasY: -2
    });
  }

  private update(dt: number): void {
    const state = this.dayNight.update(dt);

    // Re-render the shadow map at 30fps (instead of every frame). The sun
    // moves very slowly through the day/night cycle and the props are mostly
    // static, so this keeps shadows smooth while removing most of the
    // shadow-pass cost.
    this.shadowTimer -= dt;
    if (this.shadowTimer <= 0) {
      this.shadowTimer = 1 / 30;
      this.sun.shadow.needsUpdate = true;
    }

    this.hemi.color.copy(state.ambientColor);
    this.hemi.groundColor.copy(state.groundColor);
    this.hemi.intensity = state.ambientIntensity;
    this.sun.color.copy(state.lightColor);
    this.sun.intensity = state.lightIntensity;
    this.sun.position.copy(state.sunDir).multiplyScalar(90);
    this.sun.target.position.set(0, 0, 0);
    (this.scene.fog as THREE.Fog).color.copy(state.fogColor);

    this.world.sky.setDayNight(state);
    this.world.setNight(state.nightAmount);
    this.vehicle.setNightLights(state.nightAmount > 0.5);
    this.collectibles.setNight(state.nightAmount);

    const terrain = (x: number, z: number) => this.world.terrainHeight(x, z);
    let forward: THREE.Vector3;
    if (this.railMode) {
      forward = this.updateRail(dt);
    } else {
      this.controller.update(dt, terrain);
      this.controller.resolveCollisions(this.world.solids, terrain);
      forward = this.controller.forward;
    }
    this.vehicle.update(dt);

    this.debugCapture?.update(dt);
    if (!this.debugCapture || this.debugCapture.isChaseEnabled()) {
      this.cam.update(dt, this.vehicle, forward);
    }

    this.world.update(dt, state.nightAmount);
    this.ambientPlanes.update(dt);
    this.collectibles.update(dt, this.vehicle.position, this.particles, this.audio);
    this.proximity.update(dt, state.nightAmount);
    this.particles.update(dt);

    if (this.trailTimer > 0) {
      this.trailTimer -= dt;
      const tail = this.vehicle.position.clone().addScaledVector(forward, -1.8);
      this.particles.burst(tail, { count: 1, color: 0xfff9c4, speed: 0.6, gravity: 0, life: 0.7, size: 4, biasY: 0 });
      this.particles.burst(tail, { count: 1, color: 0xffe082, speed: 0.6, gravity: 0, life: 0.7, size: 4, biasY: 0 });
    }
  }

  private tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.debugCapture?.postRender();
  };

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(this.tick);
    this.audio.startMusic(this.musicTrack);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.debugCapture?.dispose();

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMoveMouse);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMoveTouch);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);

    // Best-effort GPU resource cleanup: dispose geometries, materials and the
    // textures they reference (sky/star CanvasTextures, etc.). Instanced meshes
    // are covered too (they are meshes).
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((obj) => {
      const any = obj as {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        isMesh?: boolean;
        isPoints?: boolean;
      };
      if (any.geometry && (any.isMesh || any.isPoints)) any.geometry.dispose();
      const mats = any.material ? (Array.isArray(any.material) ? any.material : [any.material]) : [];
      for (const m of mats) {
        collectMaterialTextures(m, textures);
        m.dispose();
      }
    });
    textures.forEach((t) => t.dispose());

    this.audio.dispose();
    this.renderer.dispose();
    // Deterministically release the WebGL context: each Game creates its own
    // renderer/context, so without this the browser keeps old contexts alive
    // across level switches (and eventually hits its context limit).
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    document.getElementById('ui')!.innerHTML = '';
  }
}
