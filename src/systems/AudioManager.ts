// Procedural Web Audio: no external files required. Fails silently if unsupported.
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: { osc: OscillatorNode; lfo: OscillatorNode } | null = null;
  muted = false;
  private musicTimer: number | null = null;
  private musicNextTime = 0;
  private musicStep = 0;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.startEngine();
      return this.ctx;
    } catch {
      return null;
    }
  }

  resume(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  toggle(): boolean {
    this.resume();
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    return this.muted;
  }

  private startEngine(): void {
    if (!this.ctx || !this.master || this.engine) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 95;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.4;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start();
    lfo.start();
    this.engine = { osc, lfo };
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, glideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, filterFreq: number, vol: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  collect(): void {
    this.tone(660, 0.12, 'sine', 0.25);
    this.tone(990, 0.18, 'sine', 0.22, 0.09);
  }

  plim(): void {
    this.tone(880, 0.15, 'sine', 0.2);
  }

  boing(): void {
    this.tone(240, 0.18, 'triangle', 0.18, 0, 160);
  }

  splash(): void {
    this.noise(0.5, 700, 0.3);
  }

  special(): void {
    this.tone(300, 0.35, 'triangle', 0.22, 0, 900);
  }

  rainbow(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.18, i * 0.08));
  }

  fanfare(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.09));
  }

  chirp(): void {
    this.tone(1400, 0.07, 'sine', 0.18);
    this.tone(1800, 0.09, 'sine', 0.15, 0.07);
  }

  pop(): void {
    this.tone(520, 0.1, 'triangle', 0.2, 0, 320);
  }

  // --- Música de fundo procedural (uma trilha por mundo) ---
  private static readonly MUSIC_TRACKS: { beat: number; bass: number[]; tones: number[][]; melody: number[] }[] = [
    {
      // 0 — Alegre (Dó maior)
      beat: 0.75,
      bass: [130.81, 110.0, 87.31, 98.0],
      tones: [
        [261.63, 329.63, 392.0, 523.25],
        [220.0, 261.63, 329.63, 440.0],
        [174.61, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 392.0]
      ],
      melody: [523.25, 0, 659.25, 783.99, 880.0, 0, 783.99, 659.25, 587.33, 0, 659.25, 523.25, 0, 0, 783.99, 0]
    },
    {
      // 1 — Calma (Fá maior)
      beat: 0.85,
      bass: [87.31, 130.81, 73.42, 58.27],
      tones: [
        [174.61, 220.0, 261.63, 349.23],
        [261.63, 329.63, 392.0, 523.25],
        [146.83, 174.61, 220.0, 293.66],
        [116.54, 146.83, 174.61, 233.08]
      ],
      melody: [698.46, 587.33, 523.25, 440.0, 0, 523.25, 587.33, 0, 698.46, 783.99, 698.46, 587.33, 523.25, 0, 440.0, 0]
    },
    {
      // 2 — Brincalhona (Sol maior)
      beat: 0.68,
      bass: [98.0, 82.41, 130.81, 73.42],
      tones: [
        [196.0, 246.94, 293.66, 392.0],
        [164.81, 196.0, 246.94, 329.63],
        [261.63, 329.63, 392.0, 523.25],
        [146.83, 185.0, 220.0, 293.66]
      ],
      melody: [783.99, 0, 880.0, 0, 783.99, 659.25, 587.33, 0, 659.25, 0, 587.33, 523.25, 0, 783.99, 880.0, 0]
    },
    {
      // 3 — Sonhadora (Lá menor)
      beat: 0.9,
      bass: [110.0, 87.31, 130.81, 98.0],
      tones: [
        [220.0, 261.63, 329.63, 440.0],
        [174.61, 220.0, 261.63, 349.23],
        [261.63, 329.63, 392.0, 523.25],
        [196.0, 246.94, 293.66, 392.0]
      ],
      melody: [880.0, 0, 783.99, 659.25, 0, 587.33, 659.25, 0, 523.25, 0, 587.33, 659.25, 783.99, 0, 880.0, 0]
    }
  ];

  private musicTrack = 0;

  startMusic(track = 0): void {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    this.musicTrack = track % AudioManager.MUSIC_TRACKS.length;
    this.musicStep = 0;
    this.musicNextTime = ctx.currentTime + 0.2;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const track = AudioManager.MUSIC_TRACKS[this.musicTrack];
    const beat = track.beat;
    const horizon = ctx.currentTime + 1.2;
    // Re-ancora após uma suspensão/desbloqueio de gesto para não disparar notas atrasadas.
    if (this.musicNextTime < ctx.currentTime - 0.25) {
      this.musicNextTime = ctx.currentTime + 0.2;
    }
    while (this.musicNextTime < horizon) {
      const when = this.musicNextTime - ctx.currentTime;
      const step = this.musicStep % 16;
      const bar = Math.floor(step / 4);
      if (step % 4 === 0) this.tone(track.bass[bar], beat * 3.6, 'sine', 0.1, when);
      this.tone(track.tones[bar][step % 4], beat * 0.85, 'triangle', 0.045, when);
      const m = track.melody[step];
      if (m > 0) this.tone(m, beat * 1.4, 'sine', 0.05, when);
      this.musicNextTime += beat;
      this.musicStep = (this.musicStep + 1) % 16;
    }
  }

  dispose(): void {
    this.stopMusic();
    if (this.engine) {
      try {
        this.engine.osc.stop();
        this.engine.lfo.stop();
      } catch {
        // ignore
      }
      this.engine = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
