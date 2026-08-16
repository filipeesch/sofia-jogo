let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
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
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
}

export function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, glideTo?: number, delay = 0): void {
  const c = ac();
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
export function popSound(): void { tone(600, 0.08, 'triangle', 0.22, 300); }

// Puzzle feedback (animal-puzzle): miss, hit and win.
export function thump(): void { tone(150, 0.2, 'sine', 0.1, 90); }
export function ding(): void { tone(660, 0.1, 'triangle', 0.14); tone(990, 0.14, 'triangle', 0.14, undefined, 0.09); }
export function win(): void {
  tone(523, 0.14, 'triangle', 0.16, undefined, 0);
  tone(659, 0.14, 'triangle', 0.16, undefined, 0.13);
  tone(784, 0.14, 'triangle', 0.16, undefined, 0.26);
  tone(1047, 0.3, 'triangle', 0.18, undefined, 0.39);
}
