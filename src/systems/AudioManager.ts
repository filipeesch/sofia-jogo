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

  // --- Música de fundo procedural (suave, para crianças pequenas) ---
  // Progressão I–vi–IV–V em Dó maior; baixo em registro grave.
  private static readonly MUSIC_CHORDS = [
    { bass: 130.81, tones: [261.63, 329.63, 392.0, 523.25] }, // C
    { bass: 110.0, tones: [220.0, 261.63, 329.63, 440.0] }, // Am
    { bass: 87.31, tones: [174.61, 220.0, 261.63, 349.23] }, // F
    { bass: 98.0, tones: [196.0, 246.94, 293.66, 392.0] }, // G
  ];

  // Melodia pentatônica de Dó (uma nota por batida; 0 = pausa).
  private static readonly MUSIC_MELODY = [
    523.25, 0, 659.25, 783.99, 880.0, 0, 783.99, 659.25,
    587.33, 0, 659.25, 523.25, 0, 0, 783.99, 0,
  ];

  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
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
    const beat = 0.75; // ~80 BPM
    const horizon = ctx.currentTime + 1.2;
    // Re-ancora após uma suspensão/desbloqueio de gesto para não disparar notas atrasadas.
    if (this.musicNextTime < ctx.currentTime - 0.25) {
      this.musicNextTime = ctx.currentTime + 0.2;
    }
    while (this.musicNextTime < horizon) {
      const when = this.musicNextTime - ctx.currentTime;
      const step = this.musicStep % 16;
      const chord = AudioManager.MUSIC_CHORDS[Math.floor(step / 4)];
      if (step % 4 === 0) this.tone(chord.bass, beat * 3.6, 'sine', 0.1, when);
      this.tone(chord.tones[step % 4], beat * 0.85, 'triangle', 0.045, when);
      const m = AudioManager.MUSIC_MELODY[step];
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
