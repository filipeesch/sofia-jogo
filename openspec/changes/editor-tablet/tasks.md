# Tasks

## 1. Static scene (perf commit)

- [x] 1.1 In `EditorScene.tick`, remove the `world.update(dt, 0)` call so ambience (sway, ocean, animals, birds/clouds/balloons) no longer advances; keep `controls.update()` + `render()` — verify with `npm run typecheck` and by loading the editor with `?debug=1`, capturing two frames ~2 s apart with `window.__debug.snap()`, and confirming the frames are pixel-identical while idle (all world types: valley, island, desert, snow, mountains)
- [x] 1.2 Remove the 0.5 s shadow-refresh timer in `EditorScene.tick`; confirm `rebuild()` remains the only setter of `sun.shadow.needsUpdate` (plus level-open paths) — verify by placing a tree on the editor and observing its shadow immediately after the edit, and by confirming no shadow pass re-runs while idle (three consecutive idle debug snaps identical)
- [x] 1.3 Cap editor renderer pixel ratio at construction: 1.5 when `matchMedia('(pointer: coarse)')` matches, otherwise 2 (keep the existing `devicePixelRatio` min) — verify on desktop (ratio unchanged at DPR 1) and via Chrome DevTools device emulation with DPR 2 + touch: reported renderer pixel ratio ≤ 1.5
- [x] 1.4 Commit the perf group as its own atomic commit (rollback independence per design Migration Plan) — verify `git log` shows a separate commit touching only `src/editor/EditorScene.ts`

## 2. Tap-vs-drag gesture model

- [x] 2.1 Implement the gesture recognizer state in `EditorApp`: active-pointer `Set` (any 2+ pointer gesture = camera-only, never an edit), down position/time capture, named constants `TAP_MAX_MOVE_PX = 12`, `TAP_MAX_MS = 500` — verify by reading code plus typecheck; unit-testable helper `isTapGesture(down, up, pointerCount)` returns expected booleans for boundary cases (11 px/400 ms = tap; 20 px = drag; 2 pointers ever = drag)
- [x] 2.2 Move the tool actions from `onPointerDown` to the tap decision on pointer-up: place, ground deselect, road-point add, roadLine/handle delete picks all re-run against the up position using existing `pickOpts()`; right-click draft commit and keyboard paths unchanged — verify on desktop: click places, click-with-drag (click-drag) orbits with no object placed, right-click still commits a road draft, Enter still commits
- [x] 2.3 Rework the object press flow: pointerdown on an object still disables controls and starts the ghost drag, but selection commits on release-without-movement (no undo entry) and movement commits exactly one undo entry (existing `recordUndo` path); release outside placeable bounds reverts + shows the existing boundary toast — verify: tap-select an object then press undo/redo and confirm no spurious undo state; drag an object and confirm exactly one undo step records the move
- [x] 2.4 Confirm mouse parity per spec: left-drag orbits (no edit), plain click edits, wheel zoom unaffected, two-finger trackpad gestures don't place — verify interactively on desktop and note any deviation

## 3. Touch targets (CSS)

- [x] 3.1 In `src/editor/editor.css`, give top-bar buttons, palette buttons, outliner rows, and property inputs/selects `min-height: 44px` and (where tappable) `min-width: 44px`, without restructuring panels — verify with DevTools at a tablet viewport (e.g., 1180×820 touch emulation): every interactive control's bounding box is ≥ 44 px in both dimensions

## 4. On-tablet verification (integration)

- [ ] 4.1 Verify end-to-end on the Android tablet (Chrome): orbit/pan/pinch produce zero edits in place/road/select/delete modes; taps place/select/delete reliably; object drag moves without orbiting; road drafting works with ✔ commit; no periodic stutter while just moving the camera — record results and any threshold adjustment made to the D4 constants
  - *Waiver (2026-09-21): o dono mandou arquivar antes desta rodada; o teste no tablet físico fica para o primeiro uso real. A cobertura emulada está verde (`scripts/check-editor-tablet.mjs`: DPR de toque, swipe/pince, alvos 44 px, edições por tap, entra/sai do ▶ Testar). Se toques parecerem arrastos no aparelho, reajustar `TAP_MAX_MOVE_PX`/`TAP_MAX_MS` em `src/editor/EditorApp.ts`.*
- [x] 4.2 Re-run the game itself (normal play + ▶ Testar from editor) to confirm ambience, day cycle and shadows are unchanged in the running game — verify by playing one level and entering/exiting live mode once
