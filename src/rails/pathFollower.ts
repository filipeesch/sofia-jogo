import * as THREE from 'three';
import { dampFactor } from '../utils.ts'; // explicit .ts: also runs in Node (check script)

// Follows a closed polyline at constant speed, used by the on-rails modes
// (car road tour and airplane POI tour). The point list is cyclic: the last
// point connects back to the first.
//
// The reported forward is SMOOTHED, not the raw segment tangent: a look-ahead
// point a few meters ahead defines the target direction (anticipating curves,
// climbs and the 180° U-turns at dead ends), and an exponential decay blends
// the actual forward toward it. The heading — and the chase camera that uses
// it — glides instead of stepping once per path sample.
export class PathFollower {
  readonly points: THREE.Vector3[];
  readonly total: number;
  private cum: number[];
  private forward = new THREE.Vector3(0, 0, 1);
  private readonly lookAhead: number;
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();

  s = 0; // distance along the path (kept in [0, total))

  constructor(points: THREE.Vector3[], start = 0, lookAhead = 5) {
    if (points.length < 2) throw new Error('PathFollower needs at least 2 points');
    this.points = points;
    const n = points.length;
    const cum = new Array<number>(n).fill(0);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + points[i].distanceTo(points[i - 1]);
    this.cum = cum;
    this.total = cum[n - 1] + points[n - 1].distanceTo(points[0]);
    this.s = ((start % this.total) + this.total) % this.total;
    this.lookAhead = lookAhead;
    this.forward.copy(this.targetDirection()); // no swing-in on the first frame
  }

  /** Advance along the path by speed * dt (wraps around the loop). */
  update(dt: number, speed: number): void {
    this.s = (this.s + speed * dt) % this.total;
    this.forward.lerp(this.targetDirection(), dampFactor(12, dt)).normalize();
  }

  /** Position at arc length `arc` (also used by the look-ahead target). */
  posAtArc(arc: number, out: THREE.Vector3): THREE.Vector3 {
    const p = this.points;
    const n = p.length;
    const cum = this.cum;
    if (arc >= cum[n - 1]) {
      // wrap segment: last point -> first point
      const segLen = this.total - cum[n - 1];
      const t = segLen > 1e-9 ? (arc - cum[n - 1]) / segLen : 0;
      return out.copy(p[n - 1]).lerp(p[0], t);
    }
    let lo = 0;
    let hi = n - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= arc) lo = mid;
      else hi = mid;
    }
    const segLen = cum[lo + 1] - cum[lo];
    const t = segLen > 1e-9 ? (arc - cum[lo]) / segLen : 0;
    return out.copy(p[lo]).lerp(p[lo + 1], t);
  }

  /** Position at the current s. */
  posAt(out: THREE.Vector3): THREE.Vector3 {
    return this.posAtArc(this.s, out);
  }

  // Target heading: the direction toward a point `lookAhead` meters ahead on
  // the tour. Because the tour backtracks over the last 4 m at dead ends, the
  // look-ahead point slides across the 180° apex and the direction rotates
  // continuously instead of flipping. At a coincident look-ahead (a
  // degenerate spot) the plain segment tangent is used.
  private targetDirection(): THREE.Vector3 {
    this.posAt(this.tmpA);
    this.posAtArc((this.s + this.lookAhead) % this.total, this.tmpB);
    const f = this.tmpDir.subVectors(this.tmpB, this.tmpA);
    if (f.lengthSq() < 0.2) {
      const p = this.points;
      const n = p.length;
      const cum = this.cum;
      let a: THREE.Vector3;
      let b: THREE.Vector3;
      if (this.s >= cum[n - 1]) {
        a = p[n - 1];
        b = p[0];
      } else {
        let lo = 0;
        let hi = n - 1;
        while (lo < hi - 1) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] <= this.s) lo = mid;
          else hi = mid;
        }
        a = p[lo];
        b = p[lo + 1];
      }
      f.subVectors(b, a);
      if (f.lengthSq() < 1e-12) return this.forward; // degenerate segment
    }
    return f.normalize();
  }

  /** Smoothed unit forward (tangent) at the current s. */
  getForward(): THREE.Vector3 {
    return this.forward;
  }

  /** Distance along the path of the point nearest to (x, z[, y]). */
  nearest(x: number, z: number, y?: number): number {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      let d2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (y !== undefined) {
        const dy = p.y - y;
        d2 += dy * dy;
      }
      if (d2 < bestD) {
        bestD = d2;
        bestI = i;
      }
    }
    return this.cum[bestI];
  }
}
