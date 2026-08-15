import * as THREE from 'three';

export const TAU = Math.PI * 2;

export interface Solid {
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Frame-rate independent exponential smoothing factor.
export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, dampFactor(lambda, dt));
}

export function dampVector(
  out: THREE.Vector3,
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number
): THREE.Vector3 {
  const t = dampFactor(lambda, dt);
  out.x = lerp(current.x, target.x, t);
  out.y = lerp(current.y, target.y, t);
  out.z = lerp(current.z, target.z, t);
  return out;
}

// Procedural 5-point star texture used by collectible sprites.
export function makeStarTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 8;
  const inner = outer * 0.45;

  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, outer + 14);
  glow.addColorStop(0, 'rgba(255,240,150,1)');
  glow.addColorStop(0.6, 'rgba(255,200,60,0.35)');
  glow.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, outer + 14, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * TAU) / 5;
    const x1 = cx + Math.cos(angle) * outer;
    const y1 = cy + Math.sin(angle) * outer;
    const angle2 = angle + Math.PI / 5;
    const x2 = cx + Math.cos(angle2) * inner;
    const y2 = cy + Math.sin(angle2) * inner;
    if (i === 0) ctx.moveTo(x1, y1);
    else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd54a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff3c4';
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Soft radial circle texture for glows, twinkles and sparkle sprites.
export function makeSoftCircleTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
