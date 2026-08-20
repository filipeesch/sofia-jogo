// ---------------------------------------------------------------------------
// EditorScene — the 3D layer of the map editor.
//
// Owns the renderer, camera, controls, lights and the live World built from a
// LevelData. Also owns the editor overlay meshes (invisible picking proxies,
// road control handles, the car-tour line) and the drag ghost. The EditorApp
// owns all editor state (modes, selection, draft roads, undo) and the DOM; it
// drives this class and reads back pick results.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { World } from '../world/World';
import type { DayNightState } from '../world/DayNightCycle';
import type { WorldModels } from '../assets';
import { buildRoadTour } from '../rails/roadTour';
import { DebugCapture } from '../debug/DebugCapture';
import type { LevelData } from './levelData';
import { BOUND, ISLAND_BOUND, type Category, type ScenePick } from './editorTypes';
import { catArray, modelKey, proxySize } from './entries';

export interface PickOptions {
  handles?: boolean;
  objects?: boolean;
  roadLines?: boolean;
  ground?: boolean;
}

export interface RoadOverlayOptions {
  showHandles: boolean;
  selectedRoad: number;
  draft: [number, number][] | null;
}

export class EditorScene {
  readonly canvas: HTMLCanvasElement;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly scene: THREE.Scene;
  readonly sun: THREE.DirectionalLight;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly hemi: THREE.HemisphereLight;
  private readonly clock = new THREE.Clock();
  private shadowTimer = 0;
  /** ?debug=1 — lets the capture server drive the camera and grab frames. */
  private debug: DebugCapture | null = null;

  private readonly worldRoot = new THREE.Group();
  private readonly proxyGroup = new THREE.Group();
  private readonly roadOverlay = new THREE.Group();
  private world: World;
  private data: LevelData;
  private models: WorldModels;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly tmpA = new THREE.Vector3();

  // Model resources shared across world rebuilds; only destroyed on dispose().
  private readonly sharedGeos = new Set<THREE.BufferGeometry>();
  private readonly sharedMats = new Set<THREE.Material>();
  private readonly sharedTextures = new Set<THREE.Texture>();

  // Editor-owned resources, reused across rebuilds.
  private readonly proxyGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  private readonly handleGeo = new THREE.SphereGeometry(0.38, 12, 10);
  private readonly handleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  private readonly handleMatSel = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  private readonly handleMatDraft = new THREE.MeshBasicMaterial({ color: 0xff8a3c });
  private readonly roadMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.4 });
  private readonly roadMatSel = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 });
  private readonly draftMat = new THREE.LineBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.9 });
  private readonly tourMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 });

  private proxyMeshes: THREE.Mesh[] = [];
  private roadLines: THREE.Line[] = [];
  private handleMeshes: THREE.Mesh[] = [];
  private tourLine: THREE.Line | null = null;

  private ghost: THREE.Group | null = null;
  private ghostMats: THREE.Material[] = [];
  private ghostGeo: THREE.BufferGeometry | null = null;

  private disposed = false;

  constructor(container: HTMLElement, data: LevelData, models: WorldModels) {
    this.data = data;
    this.models = models;

    const debug = new URLSearchParams(window.location.search).has('debug');
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: debug
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfeffb, 60, 240);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(0, 55, 95);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 8);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.update();

    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x9fd08a, 1.0);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff4dc, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.autoUpdate = false;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -80;
    sc.right = 80;
    sc.top = 80;
    sc.bottom = -80;
    sc.near = 1;
    sc.far = 300;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.needsUpdate = true;
    this.scene.add(this.sun, this.sun.target);

    this.scene.add(this.worldRoot, this.proxyGroup, this.roadOverlay);

    this.collectShared(models);
    this.world = new World(data.level, models, data);
    this.world.addToScene(this.worldRoot);

    // Optional debug capture: when the page carries ?debug, expose window.__debug
    // (setView/snap/sweep) and enable framebuffer capture for screenshots.
    if (new URLSearchParams(window.location.search).has('debug')) {
      this.debug = new DebugCapture(this.camera, this.canvas);
      console.log('[editor] modo de captura ativo — use window.__debug no console');
    }
  }

  /** Advance the world by one frame and render. */
  tick(): void {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.world.update(dt, 0);
    this.controls.update();
    this.shadowTimer += dt;
    if (this.shadowTimer >= 0.5) {
      this.shadowTimer = 0;
      this.sun.shadow.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.debug?.postRender();
  }

  terrainHeight(x: number, z: number): number {
    return this.world.terrainHeight(x, z);
  }

  /** Placement bound: |x|,|z| <= 140, and inside the island ring on islands. */
  placeable(x: number, z: number): boolean {
    if (Math.abs(x) > BOUND || Math.abs(z) > BOUND) return false;
    if (this.data.level.worldType === 'island' && Math.hypot(x, z) > ISLAND_BOUND) return false;
    return true;
  }

  /** Reset the camera to the default overview. */
  resetCamera(): void {
    this.camera.position.set(0, 55, 95);
    this.controls.target.set(0, 0, 8);
    this.controls.update();
  }

  /** Frame the view on a world point. */
  frameOn(x: number, z: number): void {
    this.controls.target.set(x, this.terrainHeight(x, z) + 1.5, z);
  }

  /** Apply a DayNightState to lights, fog, clear color and the world sky. */
  applyDayState(s: DayNightState): void {
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(s.fogColor);
    this.renderer.setClearColor(s.skyHorizon);
    this.hemi.color.copy(s.ambientColor);
    this.hemi.groundColor.copy(s.groundColor);
    this.hemi.intensity = s.ambientIntensity;
    this.sun.color.copy(s.lightColor);
    this.sun.intensity = s.lightIntensity;
    this.sun.position.copy(s.sunDir).multiplyScalar(90);
    this.world.sky.setDayNight(s);
    this.world.setNight(0);
  }

  /** Rebuild the World from the (possibly mutated) LevelData; camera untouched. */
  rebuild(models: WorldModels): void {
    this.collectShared(models);
    this.disposeTree(this.worldRoot);
    this.worldRoot.clear();
    this.endGhost();
    this.world = new World(this.data.level, models, this.data);
    this.world.addToScene(this.worldRoot);
    this.sun.shadow.needsUpdate = true;
  }

  /**
   * Dispose everything under `root` except model resources shared with the
   * WorldModels cache (those must survive rebuilds and are freed on dispose()).
   */
  private disposeTree(root: THREE.Object3D): void {
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    root.traverse((o) => {
      const any = o as unknown as {
        isMesh?: boolean; isLine?: boolean; isPoints?: boolean;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (!any.isMesh && !any.isLine && !any.isPoints) return;
      if (any.geometry && !this.sharedGeos.has(any.geometry)) geos.add(any.geometry);
      if (any.material) {
        const list = Array.isArray(any.material) ? any.material : [any.material];
        for (const mm of list) if (mm && !this.sharedMats.has(mm)) mats.add(mm);
      }
    });
    const texs = new Set<THREE.Texture>();
    mats.forEach((mm) => {
      const any = mm as unknown as Record<string, unknown>;
      for (const v of Object.values(any)) {
        if (v instanceof THREE.Texture && !this.sharedTextures.has(v)) texs.add(v);
      }
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    texs.forEach((t) => t.dispose());
  }

  /** Invisible pick boxes over every placed object. */
  refreshProxies(): void {
    this.proxyGroup.clear();
    this.proxyMeshes = [];
    const add = (cat: Category, index: number, x: number, z: number): void => {
      const entry = catArray(this.data, cat)[index];
      if (!entry) return;
      const [r, h] = proxySize(cat, entry);
      const m = new THREE.Mesh(this.proxyGeo, this.proxyMat);
      m.position.set(x, this.terrainHeight(x, z) + h / 2, z);
      m.scale.set(r * 2, h, r * 2);
      m.userData = { pick: { kind: 'object', cat, index } as ScenePick };
      this.proxyGroup.add(m);
      this.proxyMeshes.push(m);
    };
    this.data.houses.forEach((o, i) => add('house', i, o.x, o.z));
    this.data.lamps.forEach(([x, z], i) => add('lamp', i, x, z));
    this.data.benches.forEach((o, i) => add('bench', i, o.x, o.z));
    this.data.animals.forEach((o, i) => add('animal', i, o.x, o.z));
    this.data.trees.forEach((o, i) => add('tree', i, o.x, o.z));
    this.data.bushes.forEach(([x, z], i) => add('bush', i, x, z));
    this.data.flowers.forEach(([x, z], i) => add('flower', i, x, z));
    if (this.data.barn) add('barn', 0, this.data.barn[0], this.data.barn[1]);
    this.data.fencePosts.forEach((o, i) => add('fence', i, o.x, o.z));
    this.data.snowmen.forEach((o, i) => add('snowman', i, o.x, o.z));
    this.data.pyramids.forEach((o, i) => add('pyramid', i, o.x, o.z));
    this.data.cacti.forEach((o, i) => add('cactus', i, o.x, o.z));
  }

  /** Committed roads (control lines + handles) plus the in-progress draft. */
  refreshRoadOverlays(opts: RoadOverlayOptions): void {
    for (const c of this.roadOverlay.children) {
      this.roadOverlay.remove(c);
      const l = c as THREE.Line;
      if (l.geometry) l.geometry.dispose();
    }
    this.roadLines = [];
    this.handleMeshes = [];
    this.tourLine = null; // re-attached by refreshTour if still on

    const drawRoad = (road: [number, number][], index: number, selected: boolean): void => {
      const pts = road.map(([x, z]) => new THREE.Vector3(x, this.terrainHeight(x, z) + 0.08, z));
      const curve = pts.length >= 3 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null;
      const sampled = curve ? curve.getPoints(64) : pts;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(sampled),
        selected ? this.roadMatSel : this.roadMat
      );
      line.userData.road = index;
      this.roadOverlay.add(line);
      this.roadLines.push(line);
      if (opts.showHandles) {
        road.forEach(([x, z], j) => {
          const h = new THREE.Mesh(this.handleGeo, selected ? this.handleMatSel : this.handleMat);
          h.position.set(x, this.terrainHeight(x, z) + 0.35, z);
          h.userData = { road: index, point: j, pick: { kind: 'handle', road: index, point: j } as ScenePick };
          this.roadOverlay.add(h);
          this.handleMeshes.push(h);
        });
      }
    };

    this.data.roads.forEach((road, i) => drawRoad(road, i, opts.selectedRoad === i));

    if (opts.draft && opts.draft.length > 0) {
      if (opts.draft.length >= 2) {
        const pts = opts.draft.map(([x, z]) => new THREE.Vector3(x, this.terrainHeight(x, z) + 0.08, z));
        const curve = pts.length >= 3 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve ? curve.getPoints(64) : pts),
          this.draftMat
        );
        this.roadOverlay.add(line);
      }
      opts.draft.forEach(([x, z], j) => {
        const h = new THREE.Mesh(this.handleGeo, this.handleMatDraft);
        h.position.set(x, this.terrainHeight(x, z) + 0.35, z);
        h.userData = { road: -1, point: j, pick: { kind: 'handle', road: -1, point: j } as ScenePick };
        this.roadOverlay.add(h);
        this.handleMeshes.push(h);
      });
    }
  }

  /** Recompute + draw the car tour; returns the label text for the UI. */
  refreshTour(enabled: boolean): string {
    if (this.tourLine) {
      this.roadOverlay.remove(this.tourLine);
      this.tourLine.geometry.dispose();
      this.tourLine = null;
    }
    if (!enabled) return 'Rota desativada (marque a caixa para ver a rota do carro)';
    if (this.data.roads.length === 0) return 'Sem estradas: o carro faz um círculo no spawn';
    try {
      const tour = buildRoadTour(
        this.data.roads,
        (x, z) => this.terrainHeight(x, z),
        0,
        20,
        { solids: this.world.solids }
      );
      const pts = tour.points.map((p) => p.clone());
      pts.push(pts[0].clone());
      this.tourLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.tourMat);
      this.roadOverlay.add(this.tourLine);
      const n = tour.uTurns.length;
      return `Rota do carro: ~${Math.round(tour.totalLength)} m · ${n} ${n === 1 ? 'U-turn' : 'U-turns'}`;
    } catch {
      return 'Não foi possível calcular a rota (verifique as estradas)';
    }
  }

  /** First point where the pick ray goes below the terrain surface. */
  private groundHit(): { x: number; z: number } | null {
    const ray = this.raycaster.ray;
    const f = (t: number): number => {
      ray.at(t, this.tmpA);
      return this.tmpA.y - this.terrainHeight(this.tmpA.x, this.tmpA.z);
    };
    if (f(0.5) <= 0) return null; // camera at/below the terrain
    let lo = 0.5;
    let hi = -1;
    for (let t = 1; t <= 400; t += 0.5) {
      if (f(t) <= 0) { hi = t; break; }
      lo = t;
    }
    if (hi < 0) return null;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    ray.at(hi, this.tmpA);
    return { x: this.tmpA.x, z: this.tmpA.z };
  }

  pick(e: PointerEvent, opts: PickOptions): ScenePick | null {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);

    if (opts.handles && this.handleMeshes.length > 0) {
      const hit = this.raycaster.intersectObjects(this.handleMeshes, false)[0];
      if (hit) return hit.object.userData.pick as ScenePick;
    }
    if (opts.objects && this.proxyMeshes.length > 0) {
      const hit = this.raycaster.intersectObjects(this.proxyMeshes, false)[0];
      if (hit) return hit.object.userData.pick as ScenePick;
    }
    if (opts.roadLines && this.roadLines.length > 0) {
      const prev = this.raycaster.params.Line.threshold;
      this.raycaster.params.Line.threshold = 1.5;
      const hit = this.raycaster.intersectObjects(this.roadLines, false)[0];
      this.raycaster.params.Line.threshold = prev;
      if (hit) return { kind: 'roadLine', road: hit.object.userData.road as number };
    }
    if (opts.ground) {
      const gp = this.groundHit();
      if (gp) return { kind: 'ground', x: gp.x, z: gp.z };
    }
    return null;
  }

  // --- drag ghost -----------------------------------------------------------

  /** Translucent preview of the object being dragged. */
  beginObjectDrag(cat: Category, index: number, x: number, z: number): void {
    this.endGhost();
    const entry = catArray(this.data, cat)[index];
    if (!entry) return;
    this.makeGhost(cat, entry, x, z);
  }

  moveObjectDrag(x: number, z: number): void {
    if (this.ghost) this.ghost.position.set(x, this.terrainHeight(x, z), z);
  }

  endObjectDrag(): void {
    this.endGhost();
  }

  private makeGhost(cat: Category, entry: unknown, x: number, z: number): void {
    // A translucent clone of the real model; falls back to a blue box when the
    // model key is unknown. Clones only share geometries (in sharedGeos), so
    // endGhost() must dispose the cloned materials and nothing else.
    const src = this.models[modelKey(cat, entry)];
    if (src) {
      this.ghost = src.clone(true);
      this.ghost.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = false;
        m.receiveShadow = false;
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        m.material = mats.map((mm) => {
          const c = mm.clone();
          c.transparent = true;
          c.opacity = 0.55;
          c.depthWrite = false;
          this.ghostMats.push(c);
          return c;
        });
      });
      if (cat === 'tree' || cat === 'cactus') this.ghost.scale.setScalar((entry as { scale?: number }).scale ?? 1);
      this.ghost.rotation.y = (entry as { rotY?: number }).rotY ?? 0;
    } else {
      const [r, h] = proxySize(cat, entry);
      this.ghostGeo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4, depthWrite: false });
      this.ghostMats.push(mat);
      this.ghost = new THREE.Group();
      const box = new THREE.Mesh(this.ghostGeo, mat);
      box.scale.set(r * 2, h, r * 2);
      box.position.y = h / 2;
      this.ghost.add(box);
    }
    this.ghost.position.set(x, this.terrainHeight(x, z), z);
    this.scene.add(this.ghost);
  }

  private endGhost(): void {
    if (this.ghost) this.scene.remove(this.ghost);
    this.ghost = null;
    this.ghostMats.forEach((m) => m.dispose());
    this.ghostMats = [];
    if (this.ghostGeo) {
      this.ghostGeo.dispose();
      this.ghostGeo = null;
    }
  }

  /** Live-preview a handle move (committed on pointer up). */
  moveHandlePreview(road: number, point: number, x: number, z: number): void {
    const h = this.handleMeshes.find((hm) => hm.userData.road === road && hm.userData.point === point);
    if (h) h.position.set(x, this.terrainHeight(x, z) + 0.35, z);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  collectShared(models: WorldModels): void {
    for (const g of Object.values(models)) {
      if (!g) continue;
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (m.geometry) this.sharedGeos.add(m.geometry);
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mm of mats) {
          this.sharedMats.add(mm);
          this.collectMatTextures(mm);
        }
      });
    }
  }

  private collectMatTextures(mm: THREE.Material): void {
    const any = mm as unknown as Record<string, unknown>;
    for (const v of Object.values(any)) {
      if (v instanceof THREE.Texture) this.sharedTextures.add(v);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.debug?.dispose();
    this.endGhost();
    this.controls.dispose();
    this.disposeTree(this.scene);
    this.sharedGeos.forEach((g) => g.dispose());
    this.sharedMats.forEach((m) => m.dispose());
    this.sharedTextures.forEach((t) => t.dispose());
    this.proxyGeo.dispose();
    this.handleGeo.dispose();
    this.proxyMat.dispose();
    this.handleMat.dispose();
    this.handleMatSel.dispose();
    this.handleMatDraft.dispose();
    this.roadMat.dispose();
    this.roadMatSel.dispose();
    this.draftMat.dispose();
    this.tourMat.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

