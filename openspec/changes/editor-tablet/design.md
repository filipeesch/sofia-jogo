# Design

## Context

The editor renders through `EditorScene` (own renderer, OrbitControls, one `World` under `worldRoot`). Current per-frame path (`EditorScene.tick`): `world.update(dt, 0)` — which re-composes and re-uploads every swaying `InstancedMesh`'s matrix buffer (trees/bushes/flowers/cacti, via `instanceProps` sway) and updates animals (each calling `terrainHeight` twice), ocean/sky/birds/clouds/balloons — plus a shadow-map refresh on a 0.5 s timer even though the sun is frozen (the editor calls `dayCycle.update(0)` once and never advances it). The renderer caps pixel ratio at 2, which quadruples fragment work on the Android tablet.

Input today: `EditorApp.onPointerDown` performs the tool action immediately (place / select+start drag / road point / delete), while OrbitControls receives the same pointerdown and orbits simultaneously — edits and camera moves are coupled. Edits already have a pointerup-based flow only for handle/object drags.

`World.update` is state-free to skip: all placements are composed at build time; animals/balloons/birds keep their constructor positions; `terrainHeight` and collision solids don't depend on updates. Live mode runs the real `Game`, not `EditorScene`, so it is structurally unaffected.

## Goals / Non-Goals

**Goals:**
- Zero per-frame CPU work beyond `controls.update()` + `render()` while the editor is idle or navigating.
- No shadow re-renders unless world content changed.
- A single tap/drag recognizer shared by mouse and touch, with edits decided at pointer-up.
- Keep every existing editor workflow (place, road draft + ✔ commit, drag-move, undo/redo, live mode) intact on desktop.

**Non-Goals:**
- Incremental world patching instead of full rebuild-per-edit (candidate follow-up change).
- Panel redesign (drawers, bottom sheets) beyond touch-target sizing.
- Runtime FPS-feedback render scaling; visual polish of the frozen scene.

## Decisions

**D1 — Freeze ambience by not calling `world.update` in the editor tick.**
`EditorScene.tick` stops calling `this.world.update(dt, 0)` entirely. Since `tGlobal` only advances inside `update`, sway, ocean time, animals and all decorative motion freeze with no World API change. Alternative considered: a `World.setAmbienceEnabled(false)` flag — rejected: an editor-only flag on a shared gameplay class couples world code to editor concerns for the same observable result. First-frame correctness holds because instance matrices and animal placements are composed at build time.

**D2 — Shadow refreshes driven by `rebuild()` only.**
Delete the `shadowTimer` branch in `tick`. `rebuild()` already sets `sun.shadow.needsUpdate = true` (one-shot for the next shadow pass); every world-content mutation goes through `rebuild()`. Handle-drag previews and the drag ghost don't affect shadows (their materials never cast). No other code path moves the sun during a session (day state is applied once per level open and on rebuild).

**D3 — Static touch pixel-ratio cap instead of an adaptive loop.**
At `EditorScene` construction: `pixelRatio = min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2)`. A runtime adaptive controller (measure frame time, oscillate scale) risks visible quality pumping and is unverifiable without the tablet in the loop; the static cap is one number, testable in the spec. If 1.5 still stutters, lowering the constant (or revisiting shadow quality) is a trivial follow-up — the trace from real-device use decides. The cap is decided once at construction; a rotation or external-display change does not re-evaluate it (accepted — one number, no pumping, and the tablet is used in a fixed orientation).

**D4 — Gesture recognizer in `EditorApp`, OrbitControls left as-is for navigation.**
A small pointer-gesture state machine in `EditorApp`:
- Track active pointer ids (a `Set`). Any gesture that ever saw 2+ pointers is camera-only (kills multi-touch edit leaks).
- Single pointer down: run a pick *at down position* only to decide a mode:
  - `object` hit while in select/delete-capable press → begin the existing object-drag (controls disabled at down, as today), but defer `sel`/undo until up: release without movement = select; with movement = today's move-commit path.
  - anything else → do nothing at down; controls remain enabled so the camera responds immediately.
- Up: if single pointer, movement ≤ 12 px (CSS px) and duration ≤ 500 ms → run the tool action using a pick at the **up** position (reusing `pickOpts()`), i.e., the exact behavior previously done at down. Otherwise the gesture was navigation: no edit.
- Right-click commit (road) and keyboard behavior unchanged; `touches`/`mouseButtons` config unchanged (ONE: ROTATE keeps drag-to-orbit).

Thresholds (12 px / 500 ms) chosen as typical tap definitions; they live as named constants for on-device tuning. Alternative considered: a mode toggle button (✋ Navigate / ✏️ Edit) — rejected: adds a state to manage and a failure mode ("why didn't my tap place?"); tap-vs-drag is the pattern tablet map editors (e.g., Tiled on Android, Procreate-style canvases) already teach users.

**D5 — Drag-time `groundHit` stays, with a cheaper march.**
During object drags, `groundHit()` still runs per pointermove. Change its coarse march from fixed 0.5-unit steps to adaptive doubling steps (0.5 → 1 → 2 … up to 8) before the existing 26-step bisection; same hit quality (bisection dominates accuracy), ~10× fewer `terrainHeight` calls for distant hits. Rejected: caching the ground plane per-frame — ray direction changes per event and caching adds staleness bugs for little gain once stepping is adaptive.

**D6 — Touch targets via CSS only.**
`editor.css`: add `min-height: 44px; min-width: 44px` rules for `.editor` buttons, palette buttons, outliner rows, and property-panel inputs/selects. No markup or layout-structure changes.

## Risks / Trade-offs

- [Micro-orbit on a tap: OrbitControls receives the same tiny pointer motion before we decide "tap"] → Rotation for ≤ 12 px is visually negligible with damping 0.08; if annoying on device, reset `controls` by restoring the pre-tap spherical position when a tap is recognized (documented escape hatch, not default).
- [Edit now lands ~50–150 ms later (on lift) than today (on press)] → Acceptable latency for placement tools; matches native tablet editor feel. Road drafting may feel slightly slower — the ✔ button flow is unchanged.
- [Frozen scene could feel lifeless compared to the animated game] → User explicitly confirmed ambience is not wanted while editing; live mode preserves the full animation for previewing.
- [Something in `World` might depend on per-frame `update` for correctness not visible in code review] → Validate with the existing debug-capture screenshots per world type (idle frame vs. post-edit frame) — placements are build-time composed; the risk is small and cheap to detect.
- [DPR 1.5 makes the scene visibly softer on a high-density tablet] → The trade is exactly what buys smoothness; spec pins 1.5, tuning the constant later is a one-line change.

## Migration Plan

Pure editor-side code (`src/editor/*` + one CSS file); no data format, save-file, or gameplay changes. Rollback = revert the commits. Land in two commits: (1) static scene + shadows + DPR (perf), (2) gesture recognizer + CSS (touch UX), so the perf win ships/rolls back independently.

## Open Questions

- Final tap thresholds (px/ms) after first touch on the real tablet — constants, tunable.
- Whether, after D1–D3, a trace still shows a ~0.5 s-period hitch (would point at something outside the editor frame path) — decide follow-up only from real-device evidence.
