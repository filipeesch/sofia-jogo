# Spec Delta

## Purpose

Defines how the map editor canvas interprets finger (and mouse) gestures so that navigating the camera and editing the map are unambiguous on touch screens: taps perform edits, drags navigate, and object dragging stays possible — with finger-sized controls.

## ADDED Requirements

### Requirement: Camera navigation and editing are disambiguated by gesture
The editor SHALL decide, at the end of a single-pointer gesture, whether it was a tap or a drag. A gesture whose pointer stayed within a small movement threshold and completed within a short time threshold is a **tap** and performs the current tool's edit (place, select, deselect, delete, add road point). Any longer single-pointer gesture is a **drag** and is consumed by the camera (orbit) alone, producing no edit. The decision MUST NOT fire any edit at the moment the pointer goes down; the only pointer-down action permitted is the mouse-only right-click draft-road commit, which performs no camera navigation.

#### Scenario: Orbit never places an object
- **WHEN** the Place tool is active and the user touches empty ground and drags their finger across the screen before releasing
- **THEN** the camera orbits and no object is placed

#### Scenario: Tap places an object
- **WHEN** the Place tool is active and the user taps empty ground (finger briefly down and up with negligible movement)
- **THEN** the selected object is placed at the tapped ground position after the finger lifts

#### Scenario: Road drafting by taps
- **WHEN** the Road tool is active and the user taps several ground points
- **THEN** each tap adds one draft road point and the camera performs no deliberate action in response to those taps (a residual sub-threshold nudge from orbit damping is acceptable)

#### Scenario: Orbit never deselects or grabs
- **WHEN** an object is selected and the user drags a finger starting on empty ground
- **THEN** the camera orbits and the selection is unchanged

### Requirement: Multi-touch gestures never edit
Two-finger gestures (pinch-dolly, two-finger pan) SHALL always control the camera and MUST NEVER trigger a tap, a drag-edit, a selection change, or a road point.

#### Scenario: Pinch zoom is camera-only
- **WHEN** the user pinches or zooms with two fingers in any active tool
- **THEN** the camera zooms and no object is placed, selected, deleted, or deselected

### Requirement: Pressing an object selects by tap and moves by drag
When a pointer-down lands on a placed object, the editor SHALL treat a no-movement release as a **select** (no position change, no undo entry) and a subsequent movement as a **move drag**: the object's ghost follows the finger, the camera MUST NOT move during the drag, and the position commits (with one undo entry) on release.

#### Scenario: Tap on object selects without moving it
- **WHEN** the user taps an object in Select mode
- **THEN** the object becomes selected, its position is unchanged, and undo is not affected

#### Scenario: Drag on object moves it without orbiting
- **WHEN** the user presses an object and moves their finger, then lifts
- **THEN** the object moves to the released position, the camera never orbited during the gesture, and one undo entry records the move

#### Scenario: Move outside placement bounds reverts
- **WHEN** the user drags an object outside the placeable area and releases
- **THEN** the object returns to its original position and a boundary warning is shown

### Requirement: Edit gestures remain compatible with mouse input
The tap/drag decision SHALL apply identically to mouse input: a click (press and release without movement) performs the edit, and a mouse drag continues to orbit the camera; right-click to commit a road draft and wheel zoom SHALL keep working as before.

#### Scenario: Desktop click still places
- **WHEN** a user clicks (without dragging) with the Place tool active on desktop
- **THEN** the object is placed, as before

#### Scenario: Desktop drag still orbits
- **WHEN** a user presses the left button on the canvas and drags on desktop
- **THEN** the camera orbits and no edit occurs

### Requirement: Editor controls are finger-sized
Interactive editor controls — top-bar tool buttons, palette buttons, outliner entries, and property-panel inputs and buttons — SHALL present a touch target of at least 44 px in both dimensions (via the control itself or its tap area), without changing the panel layout structure.

#### Scenario: Tool buttons are tappable on a tablet
- **WHEN** the editor is shown at a tablet viewport width
- **THEN** every tool, palette and outliner control can be activated with a fingertip without zooming
