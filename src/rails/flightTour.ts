import * as THREE from 'three';
import type { WorldType } from '../levels';

// ---------------------------------------------------------------------------
// "Sobre trilhos" flight loop for the airplane: a closed Catmull-Rom tour
// around each world that passes over the level's points of interest — the
// village, the lake/lagoon, the farm, the forest, the rainbow arch, and
// (in the mountain worlds) a high ring that slips through the gaps between
// the peaks. Waypoints are [x, y, z]; altitudes stay inside the Flight
// Controller's safe band [3.2, 26] — except the mountains' high ring, which
// deliberately climbs to ~29 m to clear the peaks' outer slopes.
// ---------------------------------------------------------------------------

// The rainbow arch spans x 11..37 at z = -24 (see landmarks.Rainbow);
// passing at its center, under the top ring, counts as flying through it.
const RAINBOW: [number, number, number] = [24, 10, -24];

const WAYPOINTS: Record<WorldType, [number, number, number][]> = {
  // Vale Vivo / Vale à Noite: vila → mirante NW → arco-íris → lago →
  // floresta → campo sul → fazenda (closed loop).
  valley: [
    [0, 13, 42], // takeoff over the southern meadow (near spawn)
    [0, 11, 2], // village
    [-28, 15, -14], // meadow hill NW
    RAINBOW,
    [50, 16, -28], // over the lake
    [62, 15, 38], // over the forest
    [14, 13, 52], // southern meadow
    [-44, 15, 44], // over the farm
    [-62, 14, 28] // farm animals
  ],
  // Vale das Montanhas / Noite Estrelada: vila → arco-íris → anel alto
  // entre os picos (E→NE→N→NW→W, clearing the outer slopes of the NE and
  // NW peaks) → lago → fazenda → pinheiral (closed loop). The ring flies at
  // ~29 m, just above the manual flight band, to clear the peak shoulders.
  mountains: [
    [0, 14, 46], // takeoff over the meadow (near spawn)
    [0, 12, 6], // village hub
    RAINBOW,
    [82, 29, 33], // ring: gap between E and NE peaks
    [61, 29, 61], // ring: high over the NE peak shoulder
    [34, 29, 82], // ring: gap between NE and N peaks
    [-34, 29, 82], // ring: gap between N and NW peaks
    [-61, 29, 61], // ring: high over the NW peak shoulder
    [-82, 29, 33], // ring: gap between NW and W peaks
    [-40, 15, -28], // over the lake
    [-30, 13, 22], // over the farm
    [56, 18, 30] // over the pine forest clearing
  ],
  // Ilha Feliz: vila → lagoa → costa sul (baixo, sobre a praia) → fazenda →
  // entre as duas serras → costa NW (closed loop).
  island: [
    [0, 11, 44], // takeoff over the southern field (near spawn)
    [0, 9, 8], // village
    [38, 12, 20], // over the lagoon
    [58, 7, 58], // south-east coast, low over the beach
    [0, 6, 80], // south coast, over the water
    [-58, 7, 58], // south-west coast
    [-40, 13, 14], // over the farm
    [34, 19, -26], // over the small rocky mountain
    [-16, 24, -42], // over the big rocky mountain
    [-62, 9, -50] // north-west coast
  ],
  // Mundo da Neve: bonecos de neve → lago congelado → arco-íris → pinheiros
  // → cabana (closed loop).
  snow: [
    [0, 12, 40], // takeoff over the snow (near spawn)
    [2, 10, 6], // south snowmen
    [-14, 11, -4], // west snowman
    [-8, 9, -10], // over the frozen lake
    RAINBOW,
    [26, 10, -8], // east pines
    [16, 10, 16], // south-east pines
    [4, 9, -16] // over the cabin
  ],
  // Deserto: oásis → adobe house → pirâmide → cactos N → arco-íris →
  // cactos E (closed loop).
  desert: [
    [0, 12, 40], // takeoff over the dunes (near spawn)
    [-18, 10, 14], // west cacti
    [-10, 9, 12], // over the oasis
    [8, 9, 6], // over the adobe house
    [16, 14, -12], // over the pyramid
    [-6, 10, -18], // north cacti
    RAINBOW,
    [24, 10, 16] // east cacti
  ]
};

const TOUR_SAMPLES = 240;

/** Dense closed polyline of the flight tour for a world (arc-length even). */
export function flightTourPoints(worldType: WorldType): THREE.Vector3[] {
  const wp = WAYPOINTS[worldType];
  const pts = wp.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < TOUR_SAMPLES; i++) {
    out.push(curve.getPointAt(i / TOUR_SAMPLES).clone());
  }
  return out;
}

/** Raw hand-tuned waypoints (used by the check script and tooling). */
export function flightTourWaypoints(worldType: WorldType): [number, number, number][] {
  return WAYPOINTS[worldType];
}
