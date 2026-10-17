# Proposal

## Why

The map editor stutters on an Android tablet (Chrome) while navigating the camera, and its input model is hostile to fingers: every screen touch fires an edit on pointer-DOWN, so panning or rotating the view simultaneously places objects, selects, or adds road points. On desktop a click is unambiguous; on glass, navigation and editing are inseparable, making the editor unpleasant to use on the tablet — the device the user actually edits on.

## What Changes

- The editor scene becomes **static while editing**: world ambience (foliage sway, ocean animation, animal wander, balloons/birds/clouds) is frozen, the day/night cycle stays fixed (already the case), and the shadow map is refreshed only when the world actually changes (edits), not on a 0.5 s timer. This removes the per-frame instanceMatrix re-uploads and the periodic full-scene shadow re-render — the two stutter sources that fire regardless of user action.
- The editor renderer gains an **adaptive pixel ratio** for touch devices (start ≤ 1.5 instead of 2), with the option to degrade further if frame time stays high.
- The pointer interaction model changes to **tap = edit, drag = navigate**: edits (place, select, deselect, road point, delete) are recognized on pointer-UP only when the gesture moved less than a small distance and lasted less than a small duration; a finger drag is consumed by the camera (OrbitControls) alone. Object dragging keeps working: pressing an object and moving it drags (controls disabled), releasing without movement is a tap-select.
- Touch targets in the editor chrome (tool buttons, palette buttons, property rows) grow to finger-friendly sizes (≥ 44 px).
- Live mode ("▶ Testar") is untouched: the running game keeps its full ambience, day cycle and shadow behavior.

## Capabilities

### New Capabilities
- `editor-static-scene`: The editor renders a frozen, predictable scene — no ambience animation, day cycle fixed, shadows refreshed on world change, pixel ratio bounded for touch devices.
- `editor-touch-input`: Finger-first pointer model for the editor canvas — tap gestures perform edits, drag gestures navigate the camera, with unambiguous state transitions and finger-sized controls.

### Modified Capabilities
<!-- None: no existing spec covers the map editor; debug-capture and world-* specs are unaffected. -->

## Impact

- `src/editor/EditorScene.ts` — tick loop (skip `world.update` ambience; drop the 0.5 s shadow timer), renderer pixel ratio policy, pick/edit helpers.
- `src/editor/EditorApp.ts` — pointer handlers rewritten around a tap-vs-drag recognizer (edits move from `pointerdown` to a gesture-decided `pointerup`); drag-to-move object flow preserved; UI wiring unchanged otherwise.
- `src/editor/editor.css` — touch target sizing and small layout adjustments for the tool/palette/properties panels.
- `src/world/World.ts` (possibly) — a way to advance zero animation while keeping the same update entry point (or simply calling `update(0, t)` from the editor); no gameplay code changes.
- Out of scope: full World rebuild-per-edit (deferred as a possible follow-up change), panel redesign/drawer layout for small screens beyond target sizing, game runtime behavior.
