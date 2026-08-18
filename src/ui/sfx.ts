let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function resume(): void {
  const c = audioCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, glideTo?: number, delay = 0): void {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function bark(): void { tone(300, 0.08, 'square', 0.2); tone(220, 0.1, 'square', 0.18); }
export function meow(): void { tone(720, 0.3, 'triangle', 0.16, 380); }
export function cluck(): void { tone(900, 0.05, 'square', 0.13); tone(700, 0.05, 'square', 0.13); tone(900, 0.06, 'square', 0.13); }
export function baa(): void { tone(220, 0.4, 'sawtooth', 0.12, 300); }
export function moo(): void { tone(160, 0.5, 'sawtooth', 0.14, 120); }
export function quack(): void { tone(420, 0.1, 'square', 0.15, 300); }
export function oink(): void { tone(240, 0.12, 'square', 0.16, 180); tone(200, 0.12, 'square', 0.14, 150, 0.16); }
export function neigh(): void { tone(600, 0.4, 'sawtooth', 0.12, 900); tone(700, 0.3, 'sawtooth', 0.1, 1000, 0.15); }
export function roar(): void { tone(90, 0.6, 'sawtooth', 0.22, 160); tone(70, 0.5, 'square', 0.14, 120, 0.1); }
export function ribbit(): void { tone(120, 0.18, 'square', 0.18, 80); tone(140, 0.14, 'square', 0.14, 90, 0.22); }
export function hoot(): void { tone(400, 0.18, 'sine', 0.2, 320); tone(380, 0.22, 'sine', 0.16, 300, 0.24); }
export function crow(): void { tone(880, 0.12, 'square', 0.15); tone(700, 0.1, 'square', 0.14, 600, 0.14); tone(950, 0.2, 'square', 0.15, 800, 0.28); }
export function popSound(): void { tone(600, 0.08, 'triangle', 0.22, 300); }

// Procedural fallbacks for the vehicles puzzle (used only when the real
// MP3 cannot be loaded).
export function carHorn(): void { tone(400, 0.09, 'square', 0.16); tone(400, 0.1, 'square', 0.16, undefined, 0.17); }
export function taxiDing(): void { tone(1320, 0.1, 'sine', 0.2); tone(1760, 0.16, 'sine', 0.15, undefined, 0.07); }
export function policeSiren(): void { tone(700, 0.13, 'sine', 0.2, 950); tone(950, 0.13, 'sine', 0.2, 700, 0.14); }
export function ambulanceSiren(): void { tone(520, 0.18, 'sine', 0.2, 1000); tone(1000, 0.18, 'sine', 0.2, 520, 0.2); }
export function fireSiren(): void { tone(600, 0.24, 'sawtooth', 0.11, 900); tone(900, 0.24, 'sawtooth', 0.11, 600, 0.26); }
export function truckHorn(): void { tone(110, 0.5, 'square', 0.22, 105); }
export function busHorn(): void { tone(165, 0.35, 'square', 0.2, 150); }
export function bikeBell(): void { tone(1560, 0.08, 'sine', 0.24); tone(1560, 0.14, 'sine', 0.2, undefined, 0.13); }
export function motorcycleRev(): void { tone(150, 0.35, 'sawtooth', 0.15, 430); }
export function trainWhistle(): void { tone(620, 0.7, 'sine', 0.2); tone(748, 0.7, 'sine', 0.13, undefined, 0.02); }
export function airplaneEngine(): void { tone(90, 0.9, 'sawtooth', 0.13, 260); }
export function helicopterWhup(): void { for (let i = 0; i < 4; i++) tone(85, 0.07, 'sine', 0.24, 60, i * 0.11); }
export function rocketLaunch(): void { tone(100, 0.8, 'sawtooth', 0.18, 700); tone(55, 0.8, 'square', 0.1, 120); }
export function boatHorn(): void { tone(105, 0.55, 'sine', 0.24, 100); }
export function tractorRumble(): void { tone(58, 0.8, 'sawtooth', 0.16, 85); tone(40, 0.8, 'square', 0.1, 60, 0.05); }

// Puzzle feedback (animal-puzzle): miss, hit and win.
export function thump(): void { tone(150, 0.2, 'sine', 0.1, 90); }
export function ding(): void { tone(660, 0.1, 'triangle', 0.14); tone(990, 0.14, 'triangle', 0.14, undefined, 0.09); }
export function win(): void {
  tone(523, 0.14, 'triangle', 0.16, undefined, 0);
  tone(659, 0.14, 'triangle', 0.16, undefined, 0.13);
  tone(784, 0.14, 'triangle', 0.16, undefined, 0.26);
  tone(1047, 0.3, 'triangle', 0.18, undefined, 0.39);
}
