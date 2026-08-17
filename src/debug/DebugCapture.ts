import * as THREE from 'three';

// Default port of scripts/capture-server.mjs. A ?shots=PORT query param can
// point a debug page at a dedicated capture server (useful when several game
// tabs are open at once — each tab talks only to its own server).
const SERVER = 'http://localhost:' + (new URLSearchParams(window.location.search).get('shots') || 4477);

// Cursor de comandos compartilhado entre instâncias: sobrevive à troca de fase
// (novo Game → novo DebugCapture) sem re-executar comandos antigos da fila.
let cmdCursor = 0;

// Runtime "engine viewport" for debug: control the camera, capture PNGs and short videos.
export class DebugCapture {
  private chaseEnabled = true;
  private pendingSnap: string | null = null;
  private recorder: MediaRecorder | null = null;
  private recording = false;
  private chunks: Blob[] = [];
  private sweepPoints: { pos: THREE.Vector3; look: THREE.Vector3 }[] = [];
  private sweepIdx = 0;

  constructor(private camera: THREE.PerspectiveCamera, private canvas: HTMLCanvasElement) {
    const g = window as unknown as Record<string, unknown>;
    g.__debug = {
      setView: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => this.setView(px, py, pz, tx, ty, tz),
      snap: (name?: string) => this.snap(name),
      record: (seconds?: number) => this.record(seconds ?? 10),
      stopRecord: () => this.stopRecord(),
      sweep: (points: number[][], _fps?: number) => this.sweep(points),
      resumeChase: () => { this.chaseEnabled = true; this.sweepPoints = []; },
      chase: () => this.chaseEnabled
    };
    this.buildOverlay();
    this.pollTimer = window.setInterval(() => void this.pollCommands(), 400);
    void this.pollCommands();
  }

  private pollTimer: number;

  private async pollCommands(): Promise<void> {
    try {
      const res = await fetch(SERVER + '/cmd?since=' + cmdCursor);
      const cmds = (await res.json()) as { id: number; cmd: string; args: unknown[] }[];
      for (const c of cmds) {
        cmdCursor = Math.max(cmdCursor, c.id);
        this.execute(c.cmd, c.args);
      }
    } catch {
      // capture server offline — ignore
    }
  }

  private execute(cmd: string, args: unknown[]): void {
    const a = args as number[];
    switch (cmd) {
      case 'setView':
        this.setView(a[0], a[1], a[2], a[3], a[4], a[5]);
        break;
      case 'viewSnap':
        this.setView(a[0], a[1], a[2], a[3], a[4], a[5]);
        window.setTimeout(() => this.snap(typeof args[6] === 'string' ? args[6] : undefined), 300);
        break;
      case 'snap':
        this.snap(typeof args[0] === 'string' ? args[0] : undefined);
        break;
      case 'record':
        this.record(typeof args[0] === 'number' ? args[0] : 10);
        break;
      case 'sweep':
        this.sweep(args[0] as number[][]);
        break;
      case 'resumeChase':
        this.chaseEnabled = true;
        this.sweepPoints = [];
        break;
      case 'loadLevel': {
        const g = window as unknown as { __loadLevel?: (level: string, vehicle?: string) => void };
        g.__loadLevel?.(String(args[0] ?? ''), typeof args[1] === 'string' ? args[1] : undefined);
        break;
      }
      default:
        console.warn('[debug] comando desconhecido:', cmd);
    }
  }

  isChaseEnabled(): boolean {
    return this.chaseEnabled;
  }

  dispose(): void {
    window.clearInterval(this.pollTimer);
    this.sweepPoints = [];
    this.pendingSnap = null;
  }

  setView(px: number, py: number, pz: number, tx: number, ty: number, tz: number): void {
    this.chaseEnabled = false;
    this.sweepPoints = [];
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(tx, ty, tz);
  }

  sweep(points: number[][]): void {
    if (!points.length) return;
    this.chaseEnabled = false;
    this.sweepPoints = points.map((p) => ({
      pos: new THREE.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0),
      look: new THREE.Vector3(p[3] ?? 0, p[4] ?? 0, p[5] ?? 0)
    }));
    this.sweepIdx = 0;
  }

  snap(name?: string): void {
    this.pendingSnap = name ?? 'cap_' + Date.now() + '.png';
  }

  record(seconds = 10): void {
    if (this.recording) return;
    try {
      const stream = this.canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      this.chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
      rec.onstop = () => {
        this.recording = false;
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        void blob.arrayBuffer().then((buf) => this.post('/clip', this.toBase64(buf), 'clip_' + Date.now() + '.webm'));
      };
      this.recorder = rec;
      rec.start();
      this.recording = true;
      window.setTimeout(() => this.stopRecord(), seconds * 1000);
    } catch (e) {
      console.warn('record failed', e);
    }
  }

  stopRecord(): void {
    if (this.recorder && this.recording) {
      this.recorder.stop();
    }
  }

  update(_dt: number): void {
    if (this.sweepPoints.length === 0) return;
    // Teleporta a câmera direto para o próximo waypoint (sem interpolação) e
    // captura um frame por ponto. O postRender() grava o frame recém-renderizado.
    const p = this.sweepPoints[this.sweepIdx];
    this.camera.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.camera.lookAt(p.look.x, p.look.y, p.look.z);
    this.snap('sweep_' + this.sweepIdx + '.png');
    this.sweepIdx++;
    if (this.sweepIdx >= this.sweepPoints.length) {
      this.sweepPoints = [];
      // chase permanece desativado: a câmera fica no último waypoint.
    }
  }

  // Called right after renderer.render so the framebuffer is fresh.
  postRender(): void {
    if (this.pendingSnap === null) return;
    const name = this.pendingSnap;
    this.pendingSnap = null;
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      void this.post('/shot', base64, name);
    } catch (e) {
      console.warn('snap failed', e);
    }
  }

  private async post(path: string, base64: string, filename: string): Promise<void> {
    try {
      const res = await fetch(SERVER + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data: base64 })
      });
      console.log('[debug] ' + path + ' ->', await res.text());
    } catch (e) {
      console.warn('[debug] capture server offline — rode: npm run shots');
    }
  }

  private toBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  private buildOverlay(): void {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:8px;z-index:99;';
    const btn = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'pointer-events:auto;border:none;border-radius:14px;padding:10px 14px;background:#222;color:#fff;font-size:14px;cursor:pointer;';
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });
      bar.append(b);
    };
    btn('📸 Snap', () => this.snap());
    btn('🎥 10s', () => this.record(10));
    btn('▶ Chase', () => { this.chaseEnabled = true; this.sweepPoints = []; });
    document.body.append(bar);
  }
}
