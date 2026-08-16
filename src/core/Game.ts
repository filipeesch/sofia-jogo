import * as THREE from 'three';
import type { Vehicle, VehicleController } from '../entities/Vehicle';
import { CameraController } from '../controllers/CameraController';
import { World } from '../world/World';
import { DayNightCycle } from '../world/DayNightCycle';
import { Collectibles } from '../systems/Collectibles';
import { ProximityEvents } from '../systems/ProximityEvents';
import { ParticleEffects } from '../systems/ParticleEffects';
import { AudioManager } from '../systems/AudioManager';
import { UI } from '../ui/UI';
import { AmbientPlanes } from '../world/AmbientPlanes';
import { Clickables } from '../systems/Clickables';
import type { LevelConfig } from '../levels';
import { clamp } from '../utils';
import type { WorldModels } from '../assets';

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
  private ambientPlanes: AmbientPlanes;
  private musicTrack: number;
  private clickables = new Clickables();
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  private activePointer: number | null = null;
  private startX = 0;
  private startY = 0;

  constructor(container: HTMLElement, level: LevelConfig, vehicle: Vehicle, controller: VehicleController, models: WorldModels = {}, ambientModel?: THREE.Group, vehicleType: 'airplane' | 'car' = 'airplane') {
    this.vehicle = vehicle;
    this.controller = controller;
    this.vehicleType = vehicleType;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
    this.cam = new CameraController(this.camera);

    this.scene.fog = new THREE.Fog(level.skyDayHorizon, 60, 240);

    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x9fd08a, 1.0);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff4dc, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 1;
    sc.far = 300;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
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
      this.vehicle.position.set(0, this.world.terrainHeight(0, 20) + 0.9, 20);
    } else {
      this.vehicle.position.set(0, 12, 42);
    }
    this.scene.add(this.vehicle);

    this.musicTrack = level.music;
    this.ambientPlanes = new AmbientPlanes(ambientModel);
    this.ambientPlanes.addToScene(this.scene);

    this.proximity = new ProximityEvents(this.world, this.particles, this.audio, this.vehicle);

    this.registerClickables();

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
      () => this.exit()
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
        this.audio.plim();
      });
    }
    for (const balloon of this.world.balloons) {
      this.clickables.register(balloon, () => {
        balloon.bounce();
        this.audio.pop();
      });
    }
    for (const house of this.world.houses) {
      this.clickables.register(house, () => {
        house.blink();
        this.audio.plim();
      });
    }
    for (const c of this.world.creatures) {
      this.clickables.register(c.g, () => {
        if (c.type === 'dog') this.audio.bark();
        else if (c.type === 'cat') this.audio.meow();
        else if (c.type === 'chicken') this.audio.cluck();
        else if (c.type === 'sheep') this.audio.baa();
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
    this.controller.update(dt, terrain);
    this.controller.resolveCollisions(this.world.solids, terrain);
    this.vehicle.update(dt);

    this.cam.update(dt, this.vehicle, this.controller.forward);

    this.world.update(dt, state.nightAmount);
    this.ambientPlanes.update(dt);
    this.collectibles.update(dt, this.vehicle.position, this.particles, this.audio);
    this.proximity.update(dt, state.nightAmount);
    this.particles.update(dt);

    if (this.trailTimer > 0) {
      this.trailTimer -= dt;
      const tail = this.vehicle.position.clone().addScaledVector(this.controller.forward, -1.8);
      this.particles.burst(tail, { count: 1, color: 0xfff9c4, speed: 0.6, gravity: 0, life: 0.7, size: 4, biasY: 0 });
      this.particles.burst(tail, { count: 1, color: 0xffe082, speed: 0.6, gravity: 0, life: 0.7, size: 4, biasY: 0 });
    }
  }

  private tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(this.tick);
    this.audio.startMusic(this.musicTrack);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMoveMouse);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMoveTouch);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);

    // Best-effort GPU resource cleanup (skip Sprite's shared geometry).
    this.scene.traverse((obj) => {
      const any = obj as {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        isMesh?: boolean;
        isPoints?: boolean;
      };
      if (any.geometry && (any.isMesh || any.isPoints)) any.geometry.dispose();
      if (any.material) {
        if (Array.isArray(any.material)) any.material.forEach((m) => m.dispose());
        else any.material.dispose();
      }
    });

    this.audio.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    document.getElementById('ui')!.innerHTML = '';
  }
}
