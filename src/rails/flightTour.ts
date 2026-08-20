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
  // Vale Vivo / Vale à Noite: vila → arco-íris → lago → floresta → campo sul
  // → fazenda → campo oeste (closed loop).
  valley: [
    [0, 13, 42], // takeoff over the southern meadow (near spawn)
    [0, 11, 2], // village
    RAINBOW,
    [50, 14, -30], // over the lake
    [56, 14, 48], // over the forest
    [6, 12, 54], // southern meadow
    [-64, 14, 34], // over the farm
    [-30, 13, 0] // western meadow, back to the vila
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
  // Ilha Feliz: vila → lagoa (o anel A dá a volta nela) → costa sul (baixo,
  // sobre a praia) → fazenda → serra menor → sela (onde o anel B fecha) →
  // serra grande → costa NW (closed loop).
  island: [
    [0, 11, 44], // takeoff over the southern field (near spawn)
    [0, 9, 8], // village (shared node of both rings)
    [38, 12, 20], // over the lagoon (ring A curves around it)
    [58, 7, 58], // south-east coast, low over the beach
    [0, 6, 80], // south coast, over the water
    [-58, 7, 58], // south-west coast
    [-40, 13, 14], // over the farm (ring A west leg)
    [34, 19, -26], // over the small rocky mountain
    [0, 13, -30], // the saddle, where roads B1/B2 meet
    [-10, 22, -38], // above the big mountain's west shoulder
    [-16, 24, -42], // over the big rocky mountain
    [-60, 11, -48] // north-west coast
  ],
  // Mundo da Neve: takeoff → rua da vila → lago congelado → arco-íris →
  // pinheiral → anel leste → alameda norte (closed loop).
  snow: [
    [0, 13, 42], // takeoff over the southern drifts (near spawn)
    [0, 11, 12], // village street (houses at z≈14)
    [-24, 12, -20], // over the frozen lake
    RAINBOW,
    [40, 11, -4], // over the pine grove
    [20, 10, 14], // east ring, village meadow
    [10, 12, -30] // north alameda snowmen
  ],
  // Deserto: takeoff → vila → oásis → cactos SE → arco-íris → pirâmides →
  // handle/sul (closed loop).
  desert: [
    [0, 13, 42], // takeoff over the southern dunes (near spawn)
    [-2, 12, 4], // village hub
    [30, 11, 26], // over the oasis
    [42, 12, 36], // cactus alameda, SE of the oasis
    RAINBOW,
    [-44, 18, -36], // pyramid cluster
    [10, 12, 20] // the handle, back over the southern field
  ]
};

const TOUR_SAMPLES = 240;

/** Dense closed polyline for arbitrary waypoints (arc-length even). */
export function flightTourPointsFrom(waypoints: [number, number, number][]): THREE.Vector3[] {
  const pts = waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < TOUR_SAMPLES; i++) {
    out.push(curve.getPointAt(i / TOUR_SAMPLES).clone());
  }
  return out;
}

/** Dense closed polyline of the flight tour for a world (arc-length even). */
export function flightTourPoints(worldType: WorldType): THREE.Vector3[] {
  return flightTourPointsFrom(WAYPOINTS[worldType]);
}

/** Raw hand-tuned waypoints (used by the check script and tooling). */
export function flightTourWaypoints(worldType: WorldType): [number, number, number][] {
  return WAYPOINTS[worldType];
}
