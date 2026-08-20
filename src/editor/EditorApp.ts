// ---------------------------------------------------------------------------
// EditorApp — the map editor application: state, interactions and panels.
//
// The 3D layer (renderer, world, picking, overlays, ghost) lives in
// EditorScene; the save-file model lives in levelData.ts. This class owns:
//   - tool modes (select / road / delete / place) and selection;
//   - road drafting (click points, Enter / right-click / ✔ to commit);
//   - undo / redo (JSON snapshots of the LevelData, capped);
//   - the UI panels: top bar, palette + outliner, properties, tour info;
//   - persistence: save (localStorage + dev server), download, import,
//     level switching and new levels.
//
// Live mode: "▶ Testar" hands the working LevelData to the real game; the
// in-game back button returns to the editor with the same data object.
// ---------------------------------------------------------------------------

import { DayNightCycle, type DayNightState } from '../world/DayNightCycle';
import { LEVELS, type LevelConfig, type WorldType } from '../levels';
import type { WorldModels } from '../assets';
import {
  type LevelData,
  type AnimalData,
  type CactusData,
  type PyramidData,
  type TreeData,
  KNOWN_ANIMALS,
  blankLevelData,
  layoutToLevelData,
  normalizeLevelData,
  resolveLevelData,
  saveToLocalStorage
} from './levelData';
import {
  ANIMAL_META,
  NEW_LEVEL_MENU,
  PALETTES,
  ROT_CATS,
  TREE_KINDS_FOR,
  TREE_KIND_META,
  type Category,
  type EditorCallbacks,
  type Mode,
  type PlaceSpec,
  type Sel
} from './editorTypes';
import { catArray, entryFor, entryPos, setPos } from './entries';
import { el, escapeHtml, numRow, selectRow, textRow, rowText } from './editorDom';
import { EditorScene } from './EditorScene';
import './editor.css';

type DragState =
  | {
      kind: 'object';
      cat: Category;
      index: number;
      lastX: number;
      lastZ: number;
      snap: string;
      moved: boolean;
    }
  | {
      kind: 'handle';
      road: number;
      point: number;
      snap: string;
      pending: [number, number] | null;
    };

const ID_RE = /^[a-z0-9-]{1,40}$/;
const UNDO_CAP = 60;

export class EditorApp {
  private readonly data: LevelData;
  private readonly cb: EditorCallbacks;
  private readonly scene: EditorScene;
  private readonly modelsCache: Partial<Record<WorldType, WorldModels>>;

  private dayCycle: DayNightCycle;
  private dayState: DayNightState;
  private vehicle: 'car' | 'airplane';

  // --- editor state ---
  private mode: Mode = 'select';
  private activeSpec: PlaceSpec | null = null;
  private animalType: string = 'dog';
  private sel: Sel | null = null;
  private draft: [number, number][] | null = null;
  private tourOn = true;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private drag: DragState | null = null;

  private rafId = 0;
  private disposed = false;
  private toastTimer = 0;

  // --- DOM refs ---
  private uiRoot!: HTMLElement;
  private levelSelect!: HTMLSelectElement;
  private idInput!: HTMLInputElement;
  private btnSelect!: HTMLButtonElement;
  private btnRoad!: HTMLButtonElement;
  private btnDelete!: HTMLButtonElement;
  private btnCommit!: HTMLButtonElement;
  private btnCar!: HTMLButtonElement;
  private btnPlane!: HTMLButtonElement;
  private btnUndo!: HTMLButtonElement;
  private btnRedo!: HTMLButtonElement;
  private newMenu!: HTMLElement;
  private palGrid!: HTMLElement;
  private palButtons: [HTMLButtonElement, PlaceSpec][] = [];
  private animSub!: HTMLElement;
  private animButtons: [HTMLButtonElement, string][] = [];
  private outliner!: HTMLElement;
  private props!: HTMLElement;
  private tourText!: HTMLElement;
  private status!: HTMLElement;
  private fileInput!: HTMLInputElement;

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  constructor(container: HTMLElement, data: LevelData, models: WorldModels, cb: EditorCallbacks) {
    this.cb = cb;
    this.data = data; // never reassigned — live mode holds a reference to it
    this.modelsCache = { [data.level.worldType]: models };
    this.vehicle = data.level.vehicle === 'airplane' ? 'airplane' : 'car';
    this.dayCycle = this.makeDayCycle(data.level);
    this.dayState = this.dayCycle.update(0);

    this.scene = new EditorScene(container, data, models);
    this.scene.applyDayState(this.dayState);

    this.buildUI();
    this.undoStack = [JSON.stringify(this.data)];
    this.refreshProxiesAndOverlays();
    this.refreshUI();
  }

  mount(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.scene.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.scene.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.clearTimeout(this.toastTimer);
    this.scene.dispose();
    this.uiRoot.remove();
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.tick);
    this.scene.tick();
  };

  // ------------------------------------------------------------------
  // Scene glue
  // ------------------------------------------------------------------

  private makeDayCycle(level: LevelConfig): DayNightCycle {
    return new DayNightCycle({
      cycleSeconds: level.cycleSeconds,
      dayTop: level.skyDayTop,
      dayHorizon: level.skyDayHorizon
    });
  }

  /** Which pick layers are active for the current tool/selection. */
  private pickOpts(): { handles?: boolean; objects?: boolean; roadLines?: boolean; ground: boolean } {
    return {
      handles: this.mode === 'road' || this.mode === 'delete' || this.sel?.kind === 'road',
      objects: this.mode === 'select' || this.mode === 'delete',
      roadLines: this.mode === 'delete',
      ground: true
    };
  }

  /** Road-overlay visibility for the current tool/selection/draft. */
  private overlayOpts(): { showHandles: boolean; selectedRoad: number; draft: [number, number][] | null } {
    return {
      showHandles: this.mode === 'road' || this.mode === 'delete' || this.sel?.kind === 'road',
      selectedRoad: this.sel?.kind === 'road' ? this.sel.index : -1,
      draft: this.draft
    };
  }

  private refreshProxiesAndOverlays(): void {
    this.scene.refreshProxies();
    this.scene.refreshRoadOverlays(this.overlayOpts());
    this.tourText.textContent = this.scene.refreshTour(this.tourOn);
  }

  /** Full world rebuild: dispose + recreate the World, then refresh overlays. */
  private rebuild(): void {
    this.scene.rebuild(this.modelsFor());
    this.scene.applyDayState(this.dayState);
    this.scene.refreshProxies();
    this.scene.refreshRoadOverlays(this.overlayOpts());
    this.tourText.textContent = this.scene.refreshTour(this.tourOn);
    this.refreshUI();
  }

  private modelsFor(): WorldModels {
    return this.modelsCache[this.data.level.worldType] ?? {};
  }

  // ------------------------------------------------------------------
  // Pointer interaction
  // ------------------------------------------------------------------

  private onPointerDown = (e: PointerEvent): void => {
    if (this.disposed || (e.button !== 0 && e.button !== 2)) return;

    // Right-click: commit the draft road (documented in the hints).
    if (e.button === 2) {
      if (this.mode === 'road' && this.draft && this.draft.length >= 2) this.commitDraft();
      return;
    }

    const pick = this.scene.pick(e, this.pickOpts());
    if (!pick) {
      this.deselect();
      return;
    }
    switch (pick.kind) {
      case 'handle':
        if (this.mode === 'delete') {
          this.removeRoadPoint(pick.road, pick.point);
          return;
        }
        this.sel = { kind: 'road', index: pick.road };
        this.drag = { kind: 'handle', road: pick.road, point: pick.point, snap: JSON.stringify(this.data), pending: null };
        this.scene.controls.enabled = false;
        this.scene.refreshRoadOverlays(this.overlayOpts());
        this.refreshUI();
        return;
      case 'object':
        if (this.mode === 'delete') {
          this.deleteObject(pick.cat, pick.index);
          return;
        }
        this.sel = { kind: 'object', cat: pick.cat, index: pick.index };
        {
          const entry = entryFor(this.data, pick.cat, pick.index);
          if (entry) {
            const [ex, ez] = entryPos(pick.cat, entry);
            this.scene.beginObjectDrag(pick.cat, pick.index, ex, ez);
            this.drag = {
              kind: 'object',
              cat: pick.cat,
              index: pick.index,
              lastX: ex,
              lastZ: ez,
              snap: JSON.stringify(this.data),
              moved: false
            };
          }
        }
        this.scene.controls.enabled = false;
        this.refreshUI();
        return;
      case 'roadLine':
        this.deleteRoad(pick.road);
        return;
      case 'ground': {
        if (!this.scene.placeable(pick.x, pick.z)) {
          this.toast('Não dá para colocar aqui (fora dos limites)', false);
          return;
        }
        if (this.mode === 'road') {
          this.draft = this.draft ?? [];
          this.draft.push([Math.round(pick.x * 10) / 10, Math.round(pick.z * 10) / 10]);
          this.scene.refreshRoadOverlays(this.overlayOpts());
          this.refreshUI();
        } else if (this.mode === 'place' && this.activeSpec) {
          this.placeObject(this.activeSpec, pick.x, pick.z);
        } else {
          this.deselect();
        }
        return;
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || e.buttons === 0) return;
    const pick = this.scene.pick(e, { ground: true });
    if (!pick || pick.kind !== 'ground' || !this.scene.placeable(pick.x, pick.z)) return;
    const x = Math.round(pick.x * 10) / 10;
    const z = Math.round(pick.z * 10) / 10;
    if (d.kind === 'handle') {
      this.scene.moveHandlePreview(d.road, d.point, x, z);
      d.pending = [x, z];
    } else {
      if (!d.moved) {
        if (Math.hypot(x - d.lastX, z - d.lastZ) < 0.1) return;
        d.moved = true;
      }
      d.lastX = x;
      d.lastZ = z;
      this.scene.moveObjectDrag(x, z);
    }
  };

  private onPointerUp = (): void => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.scene.controls.enabled = true;
    if (d.kind === 'object') {
      this.scene.endObjectDrag();
      if (d.moved) {
        setPos(this.data, d.cat, d.index, d.lastX, d.lastZ);
        this.recordUndo();
        this.rebuild();
      }
    } else if (d.pending) {
      const road = this.data.roads[d.road];
      if (road) {
        road[d.point] = d.pending;
        this.recordUndo();
        this.rebuild();
      }
    }
  };

  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------

  private placeObject(spec: PlaceSpec, x: number, z: number): void {
    const rx = Math.round(x * 10) / 10;
    const rz = Math.round(z * 10) / 10;
    const d = this.data;
    let index = 0;
    switch (spec.cat) {
      case 'house':
        d.houses.push({ x: rx, z: rz, rotY: 0, colorIndex: 0 });
        index = d.houses.length - 1;
        break;
      case 'lamp':
        d.lamps.push([rx, rz]);
        index = d.lamps.length - 1;
        break;
      case 'bench':
        d.benches.push({ x: rx, z: rz, rotY: 0 });
        index = d.benches.length - 1;
        break;
      case 'animal':
        d.animals.push({ type: this.animalType, x: rx, z: rz, wanderR: 4 });
        index = d.animals.length - 1;
        break;
      case 'tree':
        d.trees.push({ x: rx, z: rz, scale: 1, rotY: 0, kind: spec.kind ?? 'tree' });
        index = d.trees.length - 1;
        break;
      case 'bush':
        d.bushes.push([rx, rz]);
        index = d.bushes.length - 1;
        break;
      case 'flower':
        d.flowers.push([rx, rz]);
        index = d.flowers.length - 1;
        break;
      case 'barn':
        d.barn = [rx, rz];
        index = 0;
        break;
      case 'fence':
        d.fencePosts.push({ x: rx, z: rz, rotY: 0 });
        index = d.fencePosts.length - 1;
        break;
      case 'snowman':
        d.snowmen.push({ x: rx, z: rz, rotY: 0 });
        index = d.snowmen.length - 1;
        break;
      case 'pyramid':
        d.pyramids.push({ x: rx, z: rz, r: 4, h: 6 });
        index = d.pyramids.length - 1;
        break;
      case 'cactus':
        d.cacti.push({ x: rx, z: rz, scale: 1, rotY: 0 });
        index = d.cacti.length - 1;
        break;
    }
    this.recordUndo();
    this.sel = { kind: 'object', cat: spec.cat, index };
    this.rebuild();
  }

  private deleteObject(cat: Category, index: number): void {
    if (index < 0 ||
      index >= catArray(this.data, cat).length) return;
    const d = this.data;
    switch (cat) {
      case 'house':
        d.houses.splice(index, 1);
        break;
      case 'lamp':
        d.lamps.splice(index, 1);
        break;
      case 'bench':
        d.benches.splice(index, 1);
        break;
      case 'animal':
        d.animals.splice(index, 1);
        break;
      case 'tree':
        d.trees.splice(index, 1);
        break;
      case 'bush':
        d.bushes.splice(index, 1);
        break;
      case 'flower':
        d.flowers.splice(index, 1);
        break;
      case 'barn':
        d.barn = undefined;
        break;
      case 'fence':
        d.fencePosts.splice(index, 1);
        break;
      case 'snowman':
        d.snowmen.splice(index, 1);
        break;
      case 'pyramid':
        d.pyramids.splice(index, 1);
        break;
      case 'cactus':
        d.cacti.splice(index, 1);
        break;
    }
    if (this.sel?.kind === 'object' && this.sel.cat === cat) this.sel = null;
    this.recordUndo();
    this.rebuild();
  }

  private deleteRoad(index: number): void {
    if (index < 0 || index >= this.data.roads.length) return;
    this.data.roads.splice(index, 1);
    if (this.sel?.kind === 'road' && this.sel.index === index) this.sel = null;
    this.recordUndo();
    this.rebuild();
  }

  private removeRoadPoint(road: number, point: number): void {
    if (road < 0) {
      // Draft handle: just drop the point.
      if (this.draft) {
        this.draft.splice(point, 1);
        if (this.draft.length === 0) this.draft = null;
        this.scene.refreshRoadOverlays(this.overlayOpts());
        this.refreshUI();
      }
      return;
    }
    const r = this.data.roads[road];
    if (!r) return;
    if (r.length > 2) {
      r.splice(point, 1);
      this.recordUndo();
      this.rebuild();
    } else {
      this.deleteRoad(road);
    }
  }

  private commitDraft(): void {
    if (this.mode !== 'road' || !this.draft || this.draft.length < 2) return;
    this.data.roads.push(this.draft);
    this.draft = null;
    this.sel = { kind: 'road', index: this.data.roads.length - 1 };
    this.recordUndo();
    this.rebuild();
    this.toast('Estrada adicionada');
  }

  private setMode(m: 'select' | 'road' | 'delete'): void {
    this.mode = m;
    this.activeSpec = null;
    this.draft = null;
    this.scene.refreshRoadOverlays(this.overlayOpts());
    this.refreshUI();
  }

  private pickSpec(spec: PlaceSpec): void {
    this.activeSpec = this.activeSpec === spec ? null : spec;
    this.mode = this.activeSpec ? 'place' : 'select';
    this.draft = null;
    this.scene.refreshRoadOverlays(this.overlayOpts());
    this.refreshUI();
  }

  private setVehicle(v: 'car' | 'airplane'): void {
    const lv = this.data.level.vehicle;
    if (lv === 'airplane' && v === 'car') return;
    if (lv === 'car' && v === 'airplane') return;
    this.vehicle = v;
    this.refreshUI();
  }

  private deselect(): void {
    if (!this.sel) return;
    this.sel = null;
    this.scene.refreshRoadOverlays(this.overlayOpts());
    this.refreshUI();
  }

  private rotateSelection(deltaDeg: number): void {
    const s = this.sel;
    if (!s || s.kind !== 'object' || !ROT_CATS.has(s.cat)) return;
    this.commit(() => {
      const o = entryFor(this.data, s.cat, s.index) as { rotY: number };
      o.rotY += (deltaDeg * Math.PI) / 180;
    });
  }

  private deleteSelection(): void {
    const s = this.sel;
    if (!s) return;
    if (s.kind === 'road') this.deleteRoad(s.index);
    else this.deleteObject(s.cat, s.index);
  }

  private focusEntry(cat: Category, index: number): void {
    const entry = entryFor(this.data, cat, index);
    if (!entry) return;
    const [x, z] = entryPos(cat, entry);
    this.scene.frameOn(x, z);
  }

  private focusRoad(index: number): void {
    const road = this.data.roads[index];
    if (!road || road.length === 0) return;
    let cx = 0;
    let cz = 0;
    for (const [x, z] of road) {
      cx += x;
      cz += z;
    }
    this.scene.frameOn(cx / road.length, cz / road.length);
  }

  private frameSelection(): void {
    const s = this.sel;
    if (!s) return;
    if (s.kind === 'road') this.focusRoad(s.index);
    else this.focusEntry(s.cat, s.index);
  }

  // ------------------------------------------------------------------
  // Undo / redo
  // ------------------------------------------------------------------

  /**
   * Call AFTER a mutation: record the new state so the stack's top always
   * equals the current data. Undo pops it and applies the new top; redo
   * pushes it back.
   */
  private recordUndo(): void {
    this.undoStack.push(JSON.stringify(this.data));
    if (this.undoStack.length > UNDO_CAP) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  private undo(): void {
    if (this.undoStack.length < 2) return;
    this.redoStack.push(this.undoStack.pop() as string);
    this.applySnapshot(this.undoStack[this.undoStack.length - 1]);
  }

  private redo(): void {
    if (this.redoStack.length === 0) return;
    const snap = this.redoStack.pop() as string;
    this.undoStack.push(snap);
    this.applySnapshot(snap);
  }

  private applySnapshot(snap: string): void {
    try {
      Object.assign(this.data, JSON.parse(snap) as LevelData);
    } catch {
      return;
    }
    this.sel = null;
    this.draft = null;
    this.rebuild();
  }

  /** Apply `mutate`, record the new state, then rebuild the scene. */
  private commit(mutate: () => void): void {
    mutate();
    this.recordUndo();
    this.rebuild();
  }

  // ------------------------------------------------------------------
  // Level switching & persistence
  // ------------------------------------------------------------------

  private async openLevel(id: string): Promise<void> {
    const data = (await resolveLevelData(id)) ?? layoutToLevelData(id);
    await this.applyLevelData(data, `Fase "${data.level.name}" carregada`);
  }

  private async newLevel(wt: WorldType): Promise<void> {
    const base = blankLevelData(wt, 'Nova fase');
    const taken = new Set([this.data.level.id, ...LEVELS.map((l) => l.id)]);
    let id = base.level.id;
    if (taken.has(id)) {
      let n = 2;
      while (taken.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    base.level.id = id;
    await this.applyLevelData(base, `Nova fase "${id}" criada — use 💾 para guardar`);
  }

  /** Swap the working data in place (live mode holds the same object). */
  private async applyLevelData(data: LevelData, toastMsg: string): Promise<void> {
    const wt = data.level.worldType;
    if (!this.modelsCache[wt]) this.modelsCache[wt] = await this.cb.loadWorldModels(wt);
    Object.assign(this.data, JSON.parse(JSON.stringify(data)) as LevelData);
    this.sel = null;
    this.draft = null;
    this.activeSpec = null;
    this.animalType = 'dog';
    this.vehicle = this.data.level.vehicle === 'airplane' ? 'airplane' : 'car';
    this.dayCycle = this.makeDayCycle(this.data.level);
    this.dayState = this.dayCycle.update(0);
    this.undoStack = [JSON.stringify(this.data)];
    this.redoStack.length = 0;
    this.rebuildPaletteButtons();
    this.scene.resetCamera();
    this.rebuild();
    this.toast(toastMsg);
  }

  private commitId(): void {
    const v = this.idInput.value.trim().toLowerCase();
    if (!ID_RE.test(v)) {
      this.toast('Id inválido — use 1–40 de a-z, 0-9 ou "-"', false);
      this.idInput.value = this.data.level.id;
      return;
    }
    if (v === this.data.level.id) return;
    this.data.level.id = v;
    this.recordUndo();
    this.refreshLevelSelect();
    this.refreshUI();
    this.toast(`Id da fase: ${v}`);
  }

  private async save(): Promise<void> {
    const id = this.data.level.id;
    saveToLocalStorage(id, this.data);
    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/save-level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, data: this.data })
        });
        if (res.ok) {
          this.toast(`Salvo: localStorage + levels/${id}.json`);
          return;
        }
        this.toast(`Salvo em localStorage (arquivo: HTTP ${res.status})`, false);
        return;
      } catch {
        this.toast('Salvo em localStorage (servidor de dev indisponível)', false);
        return;
      }
    }
    this.toast(`Salvo em localStorage (id: ${id})`);
  }

  private downloadJson(): void {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.data.level.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast(`Baixou ${this.data.level.id}.json`);
  }

  private async importFile(file: File): Promise<void> {
    try {
      const data = normalizeLevelData(JSON.parse(await file.text()));
      if (!data) {
        this.toast('JSON inválido para uma fase', false);
        return;
      }
      await this.applyLevelData(data, `Importada fase "${data.level.name}"`);
    } catch {
      this.toast('Não foi possível ler o arquivo', false);
    }
  }

  private toast(msg: string, ok = true): void {
    this.status.textContent = msg;
    this.status.classList.toggle('ok', ok);
    this.status.classList.toggle('warn', !ok);
    this.status.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.status.classList.remove('show'), 2200);
  }

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------

  private buildUI(): void {
    const root = el('div', 'ed-root');
    this.uiRoot = root;

    // ---------- top bar ----------
    const top = el('div', 'ed-panel ed-top');
    const back = el('button', 'ed-btn', '⬅');
    back.title = 'Sair do editor';
    back.addEventListener('click', () => this.cb.onExit());
    top.appendChild(back);
    top.appendChild(el('span', 'ed-title', '🛠️ Editor de Mapas'));

    const gLevels = el('div', 'ed-group');
    this.levelSelect = el('select');
    gLevels.appendChild(this.levelSelect);
    this.idInput = el('input', 'ed-id');
    this.idInput.type = 'text';
    this.idInput.placeholder = 'id';
    this.idInput.spellcheck = false;
    this.idInput.style.width = '96px';
    gLevels.appendChild(this.idInput);
    top.appendChild(gLevels);

    const gTools = el('div', 'ed-group');
    this.btnSelect = el('button', 'ed-btn', '👆 Selecionar');
    this.btnSelect.title = 'V — selecionar / mover objetos';
    this.btnRoad = el('button', 'ed-btn', '🛤️ Estrada');
    this.btnRoad.title = 'R — criar / editar estradas';
    this.btnDelete = el('button', 'ed-btn', '🗑️ Apagar');
    this.btnDelete.title = 'X — apagar objetos e estradas';
    this.btnCommit = el('button', 'ed-btn', '✔ Concluir');
    this.btnCommit.title = 'Termina a estrada em edição (Enter ou clique direito)';
    gTools.appendChild(this.btnSelect);
    gTools.appendChild(this.btnRoad);
    gTools.appendChild(this.btnDelete);
    gTools.appendChild(this.btnCommit);
    top.appendChild(gTools);

    const gVeh = el('div', 'ed-group');
    this.btnCar = el('button', 'ed-btn', '🚗');
    this.btnCar.title = 'Testar com o carro';
    this.btnPlane = el('button', 'ed-btn', '✈️');
    this.btnPlane.title = 'Testar com o avião';
    gVeh.appendChild(this.btnCar);
    gVeh.appendChild(this.btnPlane);
    top.appendChild(gVeh);

    const gActions = el('div', 'ed-group');
    const btnLive = el('button', 'ed-btn ed-live', '▶ Testar');
    btnLive.title = 'Jogar com a fase como ela está agora';
    const btnSave = el('button', 'ed-btn', '💾');
    btnSave.title = 'Salvar fase';
    const btnDl = el('button', 'ed-btn', '⬇');
    btnDl.title = 'Baixar JSON da fase';
    this.fileInput = el('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.style.display = 'none';
    const btnUp = el('button', 'ed-btn', '⬆');
    btnUp.title = 'Importar JSON de fase';
    this.btnUndo = el('button', 'ed-btn', '↶');
    this.btnUndo.title = 'Desfazer (Ctrl+Z)';
    this.btnRedo = el('button', 'ed-btn', '↷');
    this.btnRedo.title = 'Refazer (Ctrl+Y)';
    const btnNew = el('button', 'ed-btn', '＋');
    btnNew.title = 'Nova fase do zero';
    gActions.appendChild(btnLive);
    gActions.appendChild(btnSave);
    gActions.appendChild(btnDl);
    gActions.appendChild(this.fileInput);
    gActions.appendChild(btnUp);
    gActions.appendChild(this.btnUndo);
    gActions.appendChild(this.btnRedo);
    gActions.appendChild(btnNew);
    top.appendChild(gActions);
    root.appendChild(top);

    // ---------- new-level menu ----------
    this.newMenu = el('div', 'ed-panel ed-newmenu');
    this.newMenu.style.display = 'none';
    for (const [wt, label] of NEW_LEVEL_MENU) {
      const b = el('button', 'ed-btn', label);
      b.addEventListener('click', () => {
        this.newMenu.style.display = 'none';
        void this.newLevel(wt);
      });
      this.newMenu.appendChild(b);
    }
    root.appendChild(this.newMenu);

    // ---------- left panel: palette + outliner ----------
    const left = el('div', 'ed-panel ed-left');
    const palette = el('div', 'ed-palette');
    palette.appendChild(el('div', 'ed-sec', 'Objetos'));
    this.palGrid = el('div', 'ed-palette-grid');
    palette.appendChild(this.palGrid);
    this.rebuildPaletteButtons();
    this.animSub = el('div', 'ed-pal-sub');
    for (const t of KNOWN_ANIMALS) {
      const b = el('button', 'ed-btn', ANIMAL_META[t]?.emoji ?? '🐾');
      b.title = ANIMAL_META[t]?.label ?? t;
      b.addEventListener('click', () => {
        this.animalType = t;
        if (this.activeSpec?.cat !== 'animal') {
          this.pickSpec({ cat: 'animal', label: 'Animal', emoji: '🐾' });
        } else {
          this.refreshUI();
        }
      });
      this.animSub.appendChild(b);
      this.animButtons.push([b, t]);
    }
    palette.appendChild(this.animSub);
    left.appendChild(palette);
    this.outliner = el('div', 'ed-outliner');
    left.appendChild(this.outliner);
    root.appendChild(left);

    // ---------- right panel: properties + tour ----------
    const right = el('div', 'ed-panel ed-right');
    this.props = el('div', 'ed-props');
    right.appendChild(this.props);
    const tour = el('div', 'ed-tour');
    const tourLabel = el('label', 'ed-tour-line');
    const tourCheck = el('input');
    tourCheck.type = 'checkbox';
    tourCheck.checked = true;
    tourLabel.appendChild(tourCheck);
    tourLabel.appendChild(document.createTextNode(' Rota do carro'));
    tourLabel.addEventListener('change', () => {
      this.tourOn = tourCheck.checked;
      this.tourText.textContent = this.scene.refreshTour(this.tourOn);
    });
    tour.appendChild(tourLabel);
    this.tourText = el('div');
    tour.appendChild(this.tourText);
    right.appendChild(tour);
    root.appendChild(right);

    // ---------- status toast ----------
    this.status = el('div', 'ed-status');
    root.appendChild(this.status);

    // ---------- events ----------
    this.levelSelect.addEventListener('change', () => void this.openLevel(this.levelSelect.value));
    this.idInput.addEventListener('change', () => this.commitId());
    this.btnSelect.addEventListener('click', () => this.setMode('select'));
    this.btnRoad.addEventListener('click', () => this.setMode('road'));
    this.btnDelete.addEventListener('click', () => this.setMode('delete'));
    this.btnCommit.addEventListener('click', () => this.commitDraft());
    this.btnCar.addEventListener('click', () => this.setVehicle('car'));
    this.btnPlane.addEventListener('click', () => this.setVehicle('airplane'));
    this.btnUndo.addEventListener('click', () => this.undo());
    this.btnRedo.addEventListener('click', () => this.redo());
    btnLive.addEventListener('click', () => this.cb.onLive(this.data, this.vehicle));
    btnSave.addEventListener('click', () => void this.save());
    btnDl.addEventListener('click', () => this.downloadJson());
    btnUp.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', () => {
      const f = this.fileInput.files?.[0];
      this.fileInput.value = '';
      if (f) void this.importFile(f);
    });
    btnNew.addEventListener('click', () => {
      this.newMenu.style.display = this.newMenu.style.display === 'none' ? 'flex' : 'none';
    });

    const host = document.getElementById('ui') ?? document.body;
    host.appendChild(root);
  }

  private rebuildPaletteButtons(): void {
    this.palGrid.innerHTML = '';
    this.palButtons = [];
    for (const spec of PALETTES[this.data.level.worldType] ?? []) {
      const b = el('button', 'ed-pal');
      const emo = el('span', 'emo', spec.emoji);
      const lbl = el('span', 'lbl', spec.label);
      b.appendChild(emo);
      b.appendChild(lbl);
      b.addEventListener('click', () => this.pickSpec(spec));
      this.palGrid.appendChild(b);
      this.palButtons.push([b, spec]);
    }
  }

  private refreshLevelSelect(): void {
    const cur = this.data.level.id;
    const known = LEVELS.some((l) => l.id === cur);
    const prev = this.levelSelect.value;
    this.levelSelect.innerHTML = '';
    for (const l of LEVELS) this.levelSelect.appendChild(new Option(l.name, l.id));
    if (!known) this.levelSelect.appendChild(new Option(`${cur} (local)`, cur));
    this.levelSelect.value = known ? cur : cur;
    if (!known && this.levelSelect.value !== cur) this.levelSelect.value = prev;
  }

  // ------------------------------------------------------------------
  // UI refresh
  // ------------------------------------------------------------------

  private refreshUI(): void {
    this.btnSelect.classList.toggle('active', this.mode === 'select' && !this.activeSpec);
    this.btnRoad.classList.toggle('active', this.mode === 'road');
    this.btnDelete.classList.toggle('active', this.mode === 'delete');
    this.btnCommit.style.display = this.mode === 'road' && this.draft && this.draft.length >= 2 ? '' : 'none';
    for (const [b, spec] of this.palButtons) b.classList.toggle('active', this.activeSpec === spec);
    const animalOn = this.activeSpec?.cat === 'animal';
    this.animSub.style.display = animalOn ? 'flex' : 'none';
    for (const [b, t] of this.animButtons) b.classList.toggle('active', animalOn && this.animalType === t);
    const v = this.data.level.vehicle;
    this.btnCar.disabled = v === 'airplane';
    this.btnPlane.disabled = v === 'car';
    this.btnCar.classList.toggle('active', this.vehicle === 'car');
    this.btnPlane.classList.toggle('active', this.vehicle === 'airplane');
    this.btnUndo.disabled = this.undoStack.length < 2;
    this.btnRedo.disabled = this.redoStack.length === 0;
    if (document.activeElement !== this.idInput) this.idInput.value = this.data.level.id;
    this.refreshLevelSelect();
    this.buildOutliner();
    this.buildProps();
  }

  private buildOutliner(): void {
    this.outliner.innerHTML = '';
    const d = this.data;

    const phase = el('div', 'ed-item');
    phase.appendChild(el('span', '', `🗺️ ${escapeHtml(d.level.name)}`));
    phase.addEventListener('click', () => this.scene.frameOn(0, 20));
    this.outliner.appendChild(phase);

    const section = (title: string): void => {
      this.outliner.appendChild(el('div', 'ed-sec', title));
    };
    const row = (label: string, onClick: () => void, onDelete?: () => void, selected = false): void => {
      const r = el('div', 'ed-item' + (selected ? ' sel' : ''));
      r.appendChild(el('span', '', label));
      if (onDelete) {
        const del = el('button', 'ed-del', '✕');
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          onDelete();
        });
        r.appendChild(del);
      }
      r.addEventListener('click', onClick);
      this.outliner.appendChild(r);
    };

    if (d.roads.length > 0) {
      section(`Estradas (${d.roads.length})`);
      d.roads.forEach((road, i) => {
        row(
          `🛤️ Estrada ${i + 1} · ${road.length} pts`,
          () => {
            this.sel = { kind: 'road', index: i };
            this.scene.refreshRoadOverlays(this.overlayOpts());
            this.refreshUI();
            this.focusRoad(i);
          },
          () => this.deleteRoad(i),
          this.sel?.kind === 'road' && this.sel.index === i
        );
      });
    }

    const sections: [Category, string][] = [
      ['house', 'Casas'],
      ['lamp', 'Lâmpadas'],
      ['bench', 'Bancos'],
      ['animal', 'Animais'],
      ['tree', 'Árvores'],
      ['bush', 'Arbustos'],
      ['flower', 'Flores'],
      ['barn', 'Celeiro'],
      ['fence', 'Cerca'],
      ['snowman', 'Bonecos de Neve'],
      ['pyramid', 'Pirâmides'],
      ['cactus', 'Cactos']
    ];
    for (const [cat, title] of sections) {
      const arr = catArray(d, cat);
      if (arr.length === 0) continue;
      section(`${title} (${arr.length})`);
      arr.forEach((entry, i) => {
        row(
          this.objectLabel(cat, entry, i + 1),
          () => {
            this.sel = { kind: 'object', cat, index: i };
            this.scene.refreshRoadOverlays(this.overlayOpts());
            this.refreshUI();
            this.focusEntry(cat, i);
          },
          () => this.deleteObject(cat, i),
          this.sel?.kind === 'object' && this.sel.cat === cat && this.sel.index === i
        );
      });
    }
  }

  private objectLabel(cat: Category, entry: unknown, n: number): string {
    switch (cat) {
      case 'house':
        return `🏠 Casa ${n}`;
      case 'lamp':
        return `💡 Lâmpada ${n}`;
      case 'bench':
        return `🪑 Banco ${n}`;
      case 'animal': {
        const a = entry as AnimalData;
        const m = ANIMAL_META[a.type];
        return `${m?.emoji ?? '🐾'} ${m?.label ?? a.type} ${n}`;
      }
      case 'tree': {
        const t = entry as TreeData;
        const m = TREE_KIND_META[t.kind];
        return `${m?.emoji ?? '🌳'} ${m?.label ?? 'Árvore'} ${n}`;
      }
      case 'bush':
        return `🌿 Arbusto ${n}`;
      case 'flower':
        return `🌸 Flor ${n}`;
      case 'barn':
        return '🏚️ Celeiro';
      case 'fence':
        return `🚧 Cerca ${n}`;
      case 'snowman':
        return `⛄ Boneco de Neve ${n}`;
      case 'pyramid':
        return `🔺 Pirâmide ${n}`;
      case 'cactus':
        return `🌵 Cacto ${n}`;
    }
  }

  private buildProps(): void {
    this.props.innerHTML = '';
    const d = this.data;
    const s = this.sel;

    if (s?.kind === 'road') {
      const road = d.roads[s.index];
      if (road) {
        this.props.appendChild(el('h3', '', `🛤️ Estrada ${s.index + 1}`));
        this.props.appendChild(rowText('Pontos de controle', String(road.length)));
        this.props.appendChild(el('div', 'ed-hint',
          'Arraste as alças amarelas para ajustar a estrada. No modo Apagar (X), clique numa alça para remover o ponto, ou na linha para apagar a estrada inteira.'));
        const del = el('button', 'ed-btn danger', '🗑️ Apagar esta estrada');
        del.style.width = '100%';
        del.addEventListener('click', () => this.deleteRoad(s.index));
        this.props.appendChild(del);
      }
    } else if (s?.kind === 'object') {
      const entry = entryFor(d, s.cat, s.index);
      if (entry) this.buildObjectProps(s.cat, s.index, entry);
    }
    if (this.props.children.length === 0) {
      this.props.appendChild(el('h3', '', 'Dicas'));
      this.props.appendChild(el('div', 'ed-hint', this.modeHint()));
    }

    this.props.appendChild(el('div', 'ed-sec', 'Fase'));
    this.props.appendChild(textRow('Nome', d.level.name, (v) => {
      if (!v) return;
      this.commit(() => {
        this.data.level.name = v.slice(0, 60);
      });
    }));
    this.props.appendChild(textRow('Descrição', d.level.description, (v) => {
      this.commit(() => {
        this.data.level.description = v.slice(0, 140);
      });
    }));
    this.props.appendChild(selectRow('Veículo', [
      ['car', '🚗 Carro'],
      ['airplane', '✈️ Avião'],
      ['both', '✈️ + 🚗 Ambos']
    ], d.level.vehicle, (v) => {
      this.commit(() => {
        this.data.level.vehicle = v as LevelConfig['vehicle'];
        const lv = this.data.level.vehicle;
        if (lv === 'airplane') this.vehicle = 'airplane';
        else if (lv === 'car') this.vehicle = 'car';
      });
    }));
  }

  private buildObjectProps(cat: Category, index: number, entry: unknown): void {
    const d = this.data;
    const [x, z] = entryPos(cat, entry);
    this.props.appendChild(el('h3', '', this.objectLabel(cat, entry, index + 1)));
    this.props.appendChild(numRow('X', x, (v) => {
      if (!this.scene.placeable(v, z)) {
        this.toast('Fora dos limites', false);
        this.buildProps();
        return;
      }
      this.commit(() => setPos(d, cat, index, v, z));
    }));
    this.props.appendChild(numRow('Z', z, (v) => {
      if (!this.scene.placeable(x, v)) {
        this.toast('Fora dos limites', false);
        this.buildProps();
        return;
      }
      this.commit(() => setPos(d, cat, index, x, v));
    }));

    if (ROT_CATS.has(cat)) {
      const rot = ((entry as { rotY?: number }).rotY ?? 0) * (180 / Math.PI);
      this.props.appendChild(numRow('Rotação (°)', Math.round(rot * 10) / 10, (v) => {
        this.commit(() => {
          (entryFor(d, cat, index) as { rotY: number }).rotY = (v * Math.PI) / 180;
        });
      }, 0, 360, 5));
    }

    switch (cat) {
      case 'house': {
        const o = entryFor(d, cat, index) as { colorIndex: number };
        this.props.appendChild(selectRow('Cor',
          d.level.houseColors.map((c, i) => [String(i), `Cor ${i + 1}`]),
          String(o.colorIndex),
          (v) => this.commit(() => {
            (entryFor(d, cat, index) as { colorIndex: number }).colorIndex = Number(v) % d.level.houseColors.length;
          })));
        break;
      }
      case 'animal': {
        const o = entryFor(d, cat, index) as AnimalData;
        this.props.appendChild(selectRow('Tipo',
          KNOWN_ANIMALS.map((t): [string, string] => [t, `${ANIMAL_META[t]?.emoji ?? ''} ${ANIMAL_META[t]?.label ?? t}`]),
          o.type,
          (v) => this.commit(() => {
            (entryFor(d, cat, index) as AnimalData).type = v;
          })));
        this.props.appendChild(numRow('Raio do passeio', o.wanderR, (v) => {
          this.commit(() => {
            (entryFor(d, cat, index) as AnimalData).wanderR = Math.max(1, Math.min(30, v));
          });
        }, 1, 30, 1));
        break;
      }
      case 'tree': {
        const o = entryFor(d, cat, index) as TreeData;
        const kinds = TREE_KINDS_FOR[d.level.worldType];
        if (kinds.length > 0) {
          const opts = kinds.map((k): [string, string] => [k, `${TREE_KIND_META[k].emoji} ${TREE_KIND_META[k].label}`]);
          if (!kinds.includes(o.kind)) opts.push([o.kind, o.kind]);
          this.props.appendChild(selectRow('Tipo', opts, o.kind, (v) => {
            this.commit(() => {
              (entryFor(d, cat, index) as TreeData).kind = v as TreeData['kind'];
            });
          }));
        }
        this.props.appendChild(numRow('Tamanho', o.scale, (v) => {
          this.commit(() => {
            (entryFor(d, cat, index) as TreeData).scale = Math.max(0.4, Math.min(3, v));
          });
        }, 0.4, 3, 0.1));
        break;
      }
      case 'cactus': {
        const o = entryFor(d, cat, index) as CactusData;
        this.props.appendChild(numRow('Tamanho', o.scale, (v) => {
          this.commit(() => {
            (entryFor(d, cat, index) as CactusData).scale = Math.max(0.4, Math.min(2.5, v));
          });
        }, 0.4, 2.5, 0.1));
        break;
      }
      case 'pyramid': {
        const o = entryFor(d, cat, index) as PyramidData;
        this.props.appendChild(numRow('Raio', o.r, (v) => {
          this.commit(() => {
            (entryFor(d, cat, index) as PyramidData).r = Math.max(2, Math.min(25, v));
          });
        }, 2, 25, 0.5));
        this.props.appendChild(numRow('Altura', o.h, (v) => {
          this.commit(() => {
            (entryFor(d, cat, index) as PyramidData).h = Math.max(2, Math.min(40, v));
          });
        }, 2, 40, 1));
        break;
      }
      default:
        break;
    }

    const del = el('button', 'ed-btn danger', '🗑️ Apagar');
    del.style.marginTop = '8px';
    del.style.width = '100%';
    del.addEventListener('click', () => this.deleteObject(cat, index));
    this.props.appendChild(del);
  }

  private modeHint(): string {
    switch (this.mode) {
      case 'select':
        return 'Clique num objeto para selecionar; arraste para mover. Atalhos: V selecionar · R estrada · X apagar · Q/E rotacionar · Del apaga · F enquadra.';
      case 'road':
        return 'Clique no chão para adicionar pontos à estrada. Enter ou clique direito conclui; Esc cancela. Arraste as alças amarelas para ajustar.';
      case 'delete':
        return 'Clique num objeto, numa alça de estrada ou na linha roxa de uma estrada para apagar.';
      case 'place':
        return `Clique no chão para colocar ${this.activeSpec?.label.toLowerCase() ?? 'o objeto'}. Esc volta para selecionar; clique noutra peça para trocar.`;
    }
  }

  // ------------------------------------------------------------------
  // Keyboard / window events
  // ------------------------------------------------------------------

  private onKey = (e: KeyboardEvent): void => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) {
      e.preventDefault();
      this.redo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (k.toLowerCase()) {
      case 'v':
        this.setMode('select');
        break;
      case 'r':
        this.setMode('road');
        break;
      case 'x':
        this.setMode('delete');
        break;
      case 'delete':
      case 'backspace':
        this.deleteSelection();
        break;
      case 'q':
        this.rotateSelection(-15);
        break;
      case 'e':
        this.rotateSelection(15);
        break;
      case 'f':
        this.frameSelection();
        break;
      case 'enter':
        if (this.mode === 'road') this.commitDraft();
        break;
      case 'escape':
        if (this.draft) {
          this.draft = null;
          this.scene.refreshRoadOverlays(this.overlayOpts());
          this.refreshUI();
        } else if (this.sel) {
          this.deselect();
        } else if (this.mode !== 'select') {
          this.setMode('select');
        }
        break;
      default:
        break;
    }
  };

  private onResize = (): void => {
    this.scene.resize();
  };
}



