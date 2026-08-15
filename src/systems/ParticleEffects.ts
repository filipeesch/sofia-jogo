import * as THREE from 'three';
import { rand } from '../utils';

export interface BurstOptions {
  count?: number;
  color?: number;
  speed?: number;
  gravity?: number;
  life?: number;
  size?: number;
  biasY?: number;
}

const MAX = 1600;

// Lightweight pooled GPU particle system (sparkles, splashes, confetti).
export class ParticleEffects extends THREE.Points {
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lifeFrac: Float32Array; // aLife attribute: remaining fraction 0..1
  private lifes: Float32Array; // remaining life in seconds (separate from the GPU attribute)
  private vel: Float32Array;
  private gravity: Float32Array;
  private maxLife: Float32Array;
  private cursor = 0;

  constructor() {
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const sizes = new Float32Array(MAX);
    const lifeFrac = new Float32Array(MAX);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aLife', new THREE.BufferAttribute(lifeFrac, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: [
        'attribute float aSize;',
        'attribute float aLife;',
        'attribute vec3 aColor;',
        'varying float vLife;',
        'varying vec3 vColor;',
        'void main() {',
        '  vLife = aLife;',
        '  vColor = aColor;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float dist = max(1.0, -mv.z);',
        '  gl_PointSize = aSize * (90.0 / dist) * (0.35 + 0.65 * aLife);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying float vLife;',
        'varying vec3 vColor;',
        'void main() {',
        '  vec2 uv = gl_PointCoord - 0.5;',
        '  float d = length(uv);',
        '  float a = smoothstep(0.5, 0.05, d) * vLife;',
        '  if (a <= 0.01) discard;',
        '  gl_FragColor = vec4(vColor, a);',
        '}'
      ].join('\n')
    });

    super(geo, mat);
    this.frustumCulled = false;

    this.positions = positions;
    this.colors = colors;
    this.sizes = sizes;
    this.lifeFrac = lifeFrac;
    this.lifes = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.gravity = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);

    for (let i = 0; i < MAX; i++) {
      this.sizes[i] = 0;
      this.lifes[i] = 0;
      this.lifeFrac[i] = 0;
    }
  }

  burst(pos: THREE.Vector3, opts: BurstOptions = {}): void {
    const count = opts.count ?? 16;
    const color = new THREE.Color(opts.color ?? 0xffffff);
    const speed = opts.speed ?? 3;
    const gravity = opts.gravity ?? -3;
    const life = opts.life ?? 0.8;
    const size = opts.size ?? 5;
    const biasY = opts.biasY ?? speed * 0.4;

    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      const i3 = i * 3;

      const a = rand(0, Math.PI * 2);
      const b = rand(-1, 1);
      const s = Math.sqrt(1 - b * b);
      const sp = speed * rand(0.5, 1.0);

      this.positions[i3] = pos.x;
      this.positions[i3 + 1] = pos.y;
      this.positions[i3 + 2] = pos.z;
      this.vel[i3] = Math.cos(a) * s * sp;
      this.vel[i3 + 1] = b * sp + biasY;
      this.vel[i3 + 2] = Math.sin(a) * s * sp;
      this.gravity[i] = gravity;
      this.maxLife[i] = life * rand(0.6, 1.2);
      this.lifes[i] = this.maxLife[i];
      this.lifeFrac[i] = 1;
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      this.sizes[i] = size * rand(0.7, 1.4);
    }

    // Color and size only change here, so flag them for GPU upload.
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const lifeAttr = this.geometry.attributes.aLife as THREE.BufferAttribute;

    for (let i = 0; i < MAX; i++) {
      if (this.lifes[i] <= 0) {
        this.lifeFrac[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      this.lifes[i] -= dt;
      const i3 = i * 3;
      this.vel[i3 + 1] += this.gravity[i] * dt;
      this.positions[i3] += this.vel[i3] * dt;
      this.positions[i3 + 1] += this.vel[i3 + 1] * dt;
      this.positions[i3 + 2] += this.vel[i3 + 2] * dt;
      this.lifeFrac[i] = Math.max(0, this.lifes[i] / this.maxLife[i]);
    }

    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }
}
