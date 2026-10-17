# editor-static-scene Specification

## Purpose
Defines the map editor's rendering behavior while editing: a frozen, predictable scene (no ambience animation, fixed lighting, event-driven shadows) with render cost bounded for touch devices, so camera navigation stays smooth on tablets.

## Requirements

### Requirement: Editor scene is static while editing
While the map editor is open, the scene SHALL be visually static when no edit is in progress: foliage sway, ocean wave motion, animal wander, and any other decorative animation MUST NOT advance between frames. The full animated ambience SHALL remain intact in the running game (live mode and normal play).

#### Scenario: Idle scene shows no motion
- **WHEN** the editor is open, no edit is in progress, and the user holds the camera still and watches for 10 seconds
- **THEN** trees, bushes, flowers, cacti, the ocean surface, animals, birds, clouds and balloons show no motion

#### Scenario: Camera navigation over a static scene is smooth
- **WHEN** the user orbits or pans the camera on the tablet
- **THEN** no per-frame decorative animation work runs (scene content is identical between frames unless an edit occurs)

#### Scenario: Live mode keeps the game animated
- **WHEN** the user starts "▶ Testar" (live mode) from the editor
- **THEN** the game runs with its normal ambience (sway, ocean, animals, day cycle) unchanged

### Requirement: Editor lighting is fixed
In the editor, lighting, sky and fog SHALL remain fixed for the duration of an editing session: the sun direction and colors MUST NOT change over time, and MUST only change on level open/switch.

#### Scenario: Lighting does not drift during a session
- **WHEN** the user edits a level for any length of time without switching levels
- **THEN** shadows, sky and fog remain at the same day-time appearance throughout

### Requirement: Shadows refresh only when the world changes
The editor MUST refresh the shadow map only when the world content or the light actually changes (placement, deletion, move commit, undo/redo, road change, level switch), and MUST NOT refresh it on a fixed periodic timer.

#### Scenario: Shadow appears with the edit
- **WHEN** the user places a shadow-casting object (e.g., a tree) and lifts their finger
- **THEN** the object's shadow is visible immediately after the edit is applied

#### Scenario: Idle editing costs no shadow re-renders
- **WHEN** the editor is idle (no edit in the last several seconds)
- **THEN** the shadow map is not re-rendered and no periodic hitch is observable

### Requirement: Render resolution is bounded on high-density touch displays
On coarse-pointer (touch) devices reporting a device pixel ratio of 2 or higher, the editor MUST render at an effective pixel ratio no greater than 1.5. All other devices (typical desktop, fine pointer) SHALL keep the current behavior (capped at 2).

#### Scenario: Tablet renders below the full native density
- **WHEN** the editor opens on a device reporting a coarse pointer and devicePixelRatio 2 or 2.6
- **THEN** the framebuffer scale used by the editor is at most 1.5

#### Scenario: Desktop unchanged
- **WHEN** the editor opens on a desktop display with devicePixelRatio 1
- **THEN** the editor renders at ratio 1 as before
