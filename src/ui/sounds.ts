import { audioCtx } from './sfx';

// Sons reais dos animais (MP3 em public/sounds/): pré-carregados no
// AudioContext compartilhado e reproduzidos via buffer. Se um arquivo
// não carregar (offline, fetch falhou, decodificação impossível), o
// sintetizador procedural de sfx.ts segue como fallback — a mesma
// filosofia de fallback do jogo (GLB -> primitivas).

const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

export function preloadSound(url: string, maxDur?: number): Promise<AudioBuffer | null> {
  const hit = buffers.get(url);
  if (hit) return Promise.resolve(hit);
  const queued = pending.get(url);
  if (queued) return queued;
  const job = (async () => {
    try {
      const c = audioCtx();
      if (!c) return null;
      const res = await fetch(url);
      if (!res.ok) throw new Error('http ' + res.status);
      let buf = await c.decodeAudioData(await res.arrayBuffer());
      if (maxDur !== undefined && buf.duration > maxDur) {
        // Kid-friendly cap: keep only the first `maxDur` seconds.
        const frames = Math.floor(maxDur * buf.sampleRate);
        const trimmed = c.createBuffer(buf.numberOfChannels, frames, buf.sampleRate);
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          trimmed.copyToChannel(buf.getChannelData(ch).subarray(0, frames), ch);
        }
        buf = trimmed;
      }
      buffers.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  })();
  pending.set(url, job);
  job.then((b) => {
    if (b === null) pending.delete(url);
  });
  return job;
}

export function isSoundLoaded(url: string): boolean {
  return buffers.has(url);
}

export function playSound(url: string, fallback: () => void, volume = 1): void {
  const c = audioCtx();
  const buf = c ? buffers.get(url) : undefined;
  if (!c || !buf) {
    fallback();
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}
