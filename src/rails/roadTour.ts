import * as THREE from 'three';
import type { Solid } from '../utils';

// ---------------------------------------------------------------------------
// "Sobre trilhos" (on-rails) tour for the car: a closed walk that drives
// through EVERY road of the level, following the road centerlines. Dead-end
// streets are entered and backed out with a smooth 180° U-turn (a short
// backoff keeps the car clear of solids at the road's end).
//
// How it is built (all in 2D, x/z):
//   1. each road control polyline is sampled like Roads.ts does (CatmullRom,
//      centripetal, 70 samples);
//   2. graph nodes = road endpoints + intersections between roads;
//   3. each road is split into edges between consecutive nodes on it;
//   4. a minimum closed tour (closed Chinese postman) is computed: the odd
//      degree nodes are paired through their shortest road paths and those
//      paths are duplicated, so the multigraph has an Euler circuit that
//      covers every road edge at least once;
//   5. the circuit is flattened into a dense closed polyline (y = terrain).
//
// The module is pure (no DOM) so scripts/check-rail-tour.mjs can run the
// same math in Node and validate the level.
// ---------------------------------------------------------------------------

export interface RoadTour {
  /** Closed polyline: points[i] wraps around to points[0]. y = terrain height. */
  points: THREE.Vector3[];
  /** Arc length of the closed tour (in meters). */
  totalLength: number;
  /** Dead-end road ends where the tour does its 180° U-turn. */
  uTurns: { x: number; z: number }[];
}

const SAMPLES = 70; // must match Roads.ts sampling
const MEET_EPS = 2.2; // two roads "meet" when their samples come within this
const SNAP_EPS = 1.2; // merge duplicate nodes within this distance
const ON_ROAD_EPS = 1.3; // a node belongs to a road within this distance
const CLUSTER_EPS = 3.0; // merge nearby intersection candidates
const UTURN_BACKOFF = 4.0; // stop short of a dead end (clears end solids)
const DENSE_STEP = 1.0; // tour point spacing (meters)

export interface RoadTourOptions {
  /** Collision solids to steer around with a small lateral offset. */
  solids?: Solid[];
}

// Same sampling as Roads.ts: CatmullRom centripetal through the control
// points, 70 samples, inclusive of both ends.
export function sampleRoadDef(def: [number, number][], n = SAMPLES): [number, number][] {
  const pts = def.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    out.push([p.x, p.z]);
  }
  return out;
}

interface GNode {
  x: number;
  z: number;
}

interface GEdge {
  a: number; // node index
  b: number; // node index
  road: number;
  sa: number; // arc-length of node a along the road
  sb: number; // arc-length of node b along the road
  len: number;
}

function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return dx * dx + dz * dz;
}

// Nearest point on a sampled polyline to (x, z): returns [px, pz, arcLen].
function nearestOnPolyline(
  poly: [number, number][],
  cum: number[],
  x: number,
  z: number
): [number, number, number] {
  let best = Infinity;
  let bx = poly[0][0];
  let bz = poly[0][1];
  let bArc = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i];
    const [ex, ez] = poly[i + 1];
    const dx = ex - ax;
    const dz = ez - az;
    const len2 = dx * dx + dz * dz;
    let t = 0;
    if (len2 > 1e-9) t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d2 = dist2(x, z, px, pz);
    if (d2 < best) {
      best = d2;
      bx = px;
      bz = pz;
      bArc = cum[i] + Math.sqrt(len2) * t;
    }
  }
  return [bx, bz, bArc];
}

// Point on a sampled polyline at a given arc length (0..total).
function pointAtArc(poly: [number, number][], cum: number[], arc: number, out: number[]): void {
  const total = cum[cum.length - 1];
  const s = Math.max(0, Math.min(total, arc));
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const segLen = cum[lo + 1] - cum[lo];
  const t = segLen > 1e-9 ? (s - cum[lo]) / segLen : 0;
  out[0] = poly[lo][0] + (poly[lo + 1][0] - poly[lo][0]) * t;
  out[1] = poly[lo][1] + (poly[lo + 1][1] - poly[lo][1]) * t;
}

function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function buildRoadTour(
  roads: [number, number][][],
  terrainHeight: (x: number, z: number) => number,
  spawnX = 0,
  spawnZ = 20,
  opts: RoadTourOptions = {}
): RoadTour {
  const polys = roads.map((d) => sampleRoadDef(d));
  const cum: number[][] = polys.map((poly) => {
    const c = new Array<number>(poly.length).fill(0);
    for (let i = 1; i < poly.length; i++) {
      c[i] = c[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    }
    return c;
  });

  // ---- nodes: endpoints + intersections ----
  const nodes: GNode[] = [];
  const addNode = (x: number, z: number, snap = SNAP_EPS): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (dist2(x, z, nodes[i].x, nodes[i].z) < snap * snap) return i;
    }
    nodes.push({ x, z });
    return nodes.length - 1;
  };

  polys.forEach((poly, r) => {
    addNode(poly[0][0], poly[0][1]);
    addNode(poly[poly.length - 1][0], poly[poly.length - 1][1]);
  });

  // Intersections between pairs of roads: sample points of road i that come
  // close to road j. Candidates close to each other are clustered and the
  // representative is the average of the projections on both roads.
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const candidates: { px: number; pz: number; qx: number; qz: number }[] = [];
      for (let k = 0; k < polys[i].length; k++) {
        const [px, pz] = polys[i][k];
        const [qx, qz] = nearestOnPolyline(polys[j], cum[j], px, pz);
        if (dist2(px, pz, qx, qz) < MEET_EPS * MEET_EPS) candidates.push({ px, pz, qx, qz });
      }
      const used = new Set<number>();
      for (let c = 0; c < candidates.length; c++) {
        if (used.has(c)) continue;
        let sx = candidates[c].px + candidates[c].qx;
        let sz = candidates[c].pz + candidates[c].qz;
        let n = 1;
        for (let d = c + 1; d < candidates.length; d++) {
          if (used.has(d)) continue;
          if (dist2(candidates[c].px, candidates[c].pz, candidates[d].px, candidates[d].pz) < CLUSTER_EPS * CLUSTER_EPS) {
            used.add(d);
            sx += candidates[d].px + candidates[d].qx;
            sz += candidates[d].pz + candidates[d].qz;
            n++;
          }
        }
        addNode(sx / (2 * n), sz / (2 * n));
      }
    }
  }

  // Which nodes lie on which road, and where (arc length along the road).
  // nodeRoad[nodeIdx] = [{road, arc}]
  const nodeRoad: { road: number; arc: number }[][] = nodes.map(() => []);
  for (let r = 0; r < polys.length; r++) {
    for (let ni = 0; ni < nodes.length; ni++) {
      const [, , arc] = nearestOnPolyline(polys[r], cum[r], nodes[ni].x, nodes[ni].z);
      // Re-check the actual distance (nearestOnPolyline returns the point too).
      const [bx, bz] = nearestOnPolyline(polys[r], cum[r], nodes[ni].x, nodes[ni].z);
      if (dist2(nodes[ni].x, nodes[ni].z, bx, bz) < ON_ROAD_EPS * ON_ROAD_EPS) {
        nodeRoad[ni].push({ road: r, arc });
      }
    }
  }

  // ---- edges: between consecutive nodes on each road ----
  const edges: GEdge[] = [];
  for (let r = 0; r < polys.length; r++) {
    const on = nodeRoad
      .map((list, ni) => ({ hit: list.find((e) => e.road === r), ni }))
      .filter((e): e is { hit: { road: number; arc: number }; ni: number } => e.hit !== undefined)
      .sort((p, q) => p.hit.arc - q.hit.arc);
    for (let i = 0; i < on.length - 1; i++) {
      const a = on[i].ni;
      const b = on[i + 1].ni;
      const sa = on[i].hit.arc;
      const sb = on[i + 1].hit.arc;
      if (Math.abs(sb - sa) < 0.4) continue;
      edges.push({ a, b, road: r, sa, sb, len: Math.abs(sb - sa) });
    }
  }

  // ---- degrees ----
  const degree = nodes.map(() => 0);
  for (const e of edges) {
    degree[e.a]++;
    degree[e.b]++;
  }

  // ---- shortest paths between odd nodes (Dijkstra) ----
  const odd = nodes.map((_, i) => i).filter((i) => degree[i] % 2 === 1);
  const adjacency: number[][] = nodes.map(() => []);
  for (let i = 0; i < edges.length; i++) {
    adjacency[edges[i].a].push(i);
    adjacency[edges[i].b].push(i);
  }

  const dijkstra = (src: number): { dist: number[]; parent: { node: number; edge: number }[] } => {
    const dist = nodes.map(() => Infinity);
    const parent: { node: number; edge: number }[] = nodes.map(() => ({ node: -1, edge: -1 }));
    const done = new Array<boolean>(nodes.length).fill(false);
    dist[src] = 0;
    for (let iter = 0; iter < nodes.length; iter++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        if (!done[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1) break;
      done[u] = true;
      for (let ei = 0; ei < adjacency[u].length; ei++) {
        const eIdx = adjacency[u][ei]; // global index into `edges`
        const e = edges[eIdx];
        const w = e.a === u ? e.b : e.a;
        const nd = dist[u] + e.len;
        if (nd < dist[w]) {
          dist[w] = nd;
          parent[w] = { node: u, edge: eIdx };
        }
      }
    }
    return { dist, parent };
  };

  // Path (as edge index list) between two nodes via Dijkstra parents.
  const pathEdges = (src: number, parent: { node: number; edge: number }[], dst: number): number[] => {
    const out: number[] = [];
    let cur = dst;
    while (cur !== src && parent[cur].node !== -1) {
      out.push(parent[cur].edge);
      cur = parent[cur].node;
    }
    out.reverse();
    return out;
  };

  // Minimum-weight perfect matching of the odd nodes (brute-force DP; the
  // maps are small. Fallback: greedy, if the count ever grows large).
  const extraEdges: number[] = [];
  if (odd.length >= 2) {
    if (odd.length <= 16) {
      const d = odd.map((src) => dijkstra(src));
      const k = odd.length;
      const cost = (i: number, j: number): number => d[i].dist[odd[j]];
      const FULL = 1 << k;
      const memo = new Array<number>(FULL).fill(Infinity);
      memo[0] = 0;
      const dp = (mask: number): number => {
        if (memo[mask] !== Infinity) return memo[mask];
        // lowest set bit
        let i = 0;
        while (((mask >> i) & 1) === 0) i++;
        let best = Infinity;
        for (let j = i + 1; j < k; j++) {
          if (((mask >> j) & 1) === 0) continue;
          const rest = mask & ~((1 << i) | (1 << j));
          const v = cost(i, j) + dp(rest);
          if (v < best) best = v;
        }
        memo[mask] = best;
        return best;
      };
      const solve = (mask: number): number[] => {
        if (mask === 0) return [];
        let i = 0;
        while (((mask >> i) & 1) === 0) i++;
        let bestJ = -1;
        let bestV = Infinity;
        for (let j = i + 1; j < k; j++) {
          if (((mask >> j) & 1) === 0) continue;
          const rest = mask & ~((1 << i) | (1 << j));
          const v = cost(i, j) + dp(rest);
          if (v < bestV) {
            bestV = v;
            bestJ = j;
          }
        }
        return [odd[i], odd[bestJ], ...solve(restMask(mask, i, bestJ))];
      };
      function restMask(mask: number, i: number, j: number): number {
        return mask & ~((1 << i) | (1 << j));
      }
      const oddPos = new Map<number, number>();
      odd.forEach((n, i) => oddPos.set(n, i));
      const pairs = solve(FULL - 1);
      for (let p = 0; p < pairs.length; p += 2) {
        const a = pairs[p];
        const b = pairs[p + 1];
        const path = pathEdges(a, d[oddPos.get(a)!].parent, b); // a is in `odd`, so the index exists
        extraEdges.push(...path);
      }
    } else {
      // Greedy fallback (should never trigger for the shipped levels).
      const free = new Set(odd);
      while (free.size >= 2) {
        const src = [...free][0];
        const dsrc = dijkstra(src);
        let bestT = -1;
        let bestD = Infinity;
        for (const t of free) {
          if (t === src) continue;
          const dd = dsrc.dist[t];
          if (dd < bestD) {
            bestD = dd;
            bestT = t;
          }
        }
        free.delete(src);
        free.delete(bestT);
        extraEdges.push(...pathEdges(src, dsrc.parent, bestT));
      }
    }
  }

  // ---- Euler circuit over the multigraph (Hierholzer) ----
  // Build the multigraph edge list: originals + extra traversals.
  const multi: GEdge[] = [...edges];
  for (const ei of extraEdges) multi.push(edges[ei]);
  const used = new Array<boolean>(multi.length).fill(false);
  const mAdj: number[][] = nodes.map(() => []);
  for (let i = 0; i < multi.length; i++) {
    mAdj[multi[i].a].push(i);
    mAdj[multi[i].b].push(i);
  }

  // Start the circuit at the node closest to the vehicle spawn.
  let start = 0;
  let bestD = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (degree[i] === 0) continue;
    const dd = dist2(spawnX, spawnZ, nodes[i].x, nodes[i].z);
    if (dd < bestD) {
      bestD = dd;
      start = i;
    }
  }

  const stack: number[] = [start];
  const circuit: number[] = []; // directed edge instances, in circuit order
  const fromOf: number[] = []; // from-node of each circuit step
  {
    const vStack: { v: number; edge: number }[] = [{ v: start, edge: -1 }];
    while (vStack.length) {
      const top = vStack[vStack.length - 1];
      let taken = -1;
      for (const ei of mAdj[top.v]) {
        if (!used[ei]) {
          used[ei] = true;
          taken = ei;
          break;
        }
      }
      if (taken !== -1) {
        const e = multi[taken];
        const w = e.a === top.v ? e.b : e.a;
        vStack.push({ v: w, edge: taken });
      } else {
        vStack.pop();
        if (top.edge !== -1) {
          const e = multi[top.edge];
          const from = e.a === top.v ? e.b : e.a;
          // traversed into top.v: from the other endpoint to top.v
          fromOf.push(from);
          circuit.push(top.edge);
        }
      }
    }
    // Backtracking emits the circuit in reverse: reverse it so that the
    // directed steps chain as to(k) === from(k+1) (cyclically, ending at `start`).
    circuit.reverse();
    fromOf.reverse();
  }

  // ---- flatten into a dense closed polyline ----
  const uTurnNodes = nodes.map((n, i) => ({ n, i })).filter((o) => degree[o.i] === 1).map((o) => o.n);
  const effStart: number[] = new Array(circuit.length);
  const effEnd: number[] = new Array(circuit.length);
  const edgeOf = (ei: number, from: number, to: number): { road: number; s0: number; s1: number } => {
    const e = multi[ei];
    const forward = e.a === from; // from == e.a
    return { road: e.road, s0: forward ? e.sa : e.sb, s1: forward ? e.sb : e.sa };
  };
  for (let k = 0; k < circuit.length; k++) {
    const to = (k + 1) % circuit.length === 0 ? start : fromOf[(k + 1) % circuit.length];
    const { road, s0, s1 } = edgeOf(circuit[k], fromOf[k], to);
    effStart[k] = s0;
    effEnd[k] = s1;
    // U-turn backoff: entering a dead end -> stop short of it.
    if (degree[to] === 1) {
      const back = Math.min(UTURN_BACKOFF, Math.abs(s1 - s0) * 0.45);
      effEnd[k] = s0 + Math.sign(s1 - s0) * (Math.abs(s1 - s0) - back);
    }
    // leaving a dead end -> resume short of it (the previous step ended there)
    const prevK = (k - 1 + circuit.length) % circuit.length;
    if (degree[fromOf[k]] === 1) {
      const back = Math.min(UTURN_BACKOFF, Math.abs(s1 - s0) * 0.45);
      effStart[k] = s0 + Math.sign(s1 - s0) * back;
    }
  }

  const raw: [number, number][] = [];
  const out: number[] = [0, 0];
  let lastX = NaN;
  let lastZ = NaN;
  for (let k = 0; k < circuit.length; k++) {
    const { road } = edgeOf(circuit[k], fromOf[k], (k + 1) % circuit.length === 0 ? start : fromOf[(k + 1) % circuit.length]);
    const poly = polys[road];
    const c = cum[road];
    const total = c[c.length - 1];
    // effStart/effEnd are arc positions on the road within [0, total]; an
    // edge that starts at the road's end uses s = total (valid for
    // pointAtArc). No modulo here: normalizing total → 0 would collapse
    // reverse walks that start at the road's end.
    const s0 = effStart[k];
    const s1 = effEnd[k];
    // walk from s0 to s1 (may wrap around the road's end... it can't: the
    // arc-length interval of a single edge never wraps), step DENSE_STEP
    const dir = Math.sign(s1 - s0) || 1;
    let s = s0;
    const end = s1;
    for (;;) {
      pointAtArc(poly, c, s, out);
      const px = out[0];
      const pz = out[1];
      if (!(Math.abs(px - lastX) < 1e-4 && Math.abs(pz - lastZ) < 1e-4)) {
        raw.push([px, pz]);
        lastX = px;
        lastZ = pz;
      }
      if (Math.abs(s - end) < 1e-6) break;
      s += dir * Math.min(DENSE_STEP, Math.abs(end - s));
    }
  }

  // Drop the duplicated closing point if the tour closed on itself.
  const first = raw[0];
  const last = raw[raw.length - 1];
  if (dist2(first[0], first[1], last[0], last[1]) < 0.01) raw.pop();

  // ---- lateral offset: keep the car clear of solids without leaving the road ----
  // For each solid, each tour point receives the exact lateral shift that
  // keeps it at least r + 1.35 from the solid's center (the car's collision
  // margin r + 1.2 plus a 0.15 m buffer), as a function of the point's
  // longitudinal offset u from the solid: needLat(u) = sqrt((r + 1.35)^2 - u^2).
  // The demand is zero wherever the point is already clear, so the lane
  // change only happens where it is needed; the 1.35 m cap keeps the car on
  // the road (half road width is 1.7 m).
  const solids = opts.solids ?? [];
  if (solids.length > 0 && raw.length > 2) {
    const n = raw.length;
    const shift = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const prevP = raw[(i - 1 + n) % n];
      const nextP = raw[(i + 1) % n];
      let tx = nextP[0] - prevP[0];
      let tz = nextP[1] - prevP[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const perpX = -tz;
      const perpZ = tx;
      const [px, pz] = raw[i];
      let want = 0;
      for (const s of solids) {
        let p = (px - s.x) * perpX + (pz - s.z) * perpZ; // lateral offset from the solid
        if (Math.abs(p) < 0.05) p = p >= 0 ? 0.05 : -0.05; // push to a defined side
        const u = (px - s.x) * tx + (pz - s.z) * tz; // longitudinal offset from the solid
        const target = s.r + 1.35;
        const under = target * target - u * u;
        if (under <= p * p) continue; // already clear at this longitudinal offset
        want += Math.sign(p) * Math.sqrt(under) - p;
      }
      if (want !== 0) shift[i] = Math.max(-1.35, Math.min(1.35, want));
    }
    for (let i = 0; i < n; i++) {
      if (shift[i] === 0) continue;
      const [px, pz] = raw[i];
      const prevP = raw[(i - 1 + n) % n];
      const nextP = raw[(i + 1) % n];
      let tx = nextP[0] - prevP[0];
      let tz = nextP[1] - prevP[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      raw[i] = [px + -tz * shift[i], pz + tx * shift[i]];
    }
  }

  // ---- final points with terrain heights + total length ----
  const points: THREE.Vector3[] = raw.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z), z));
  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    totalLength += points[i].distanceTo(points[(i + 1) % points.length]);
  }

  return { points, totalLength, uTurns: uTurnNodes };
}
