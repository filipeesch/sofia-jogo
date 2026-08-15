import * as THREE from 'three';
import type { DayNightState } from './DayNightCycle';
import { makeSoftCircleTexture, rand, TAU } from '../utils';

// Sky dome (gradient), background stars, twinkling stars, sun and a friendly moon.
export class Sky extends THREE.Group {
  private domeMat: THREE.ShaderMaterial;
  private starsMat: THREE.PointsMaterial;
  private twinkles: { s: THREE.Sprite; phase: number; speed: number }[] = [];
  private sun: THREE.Sprite;
  private moon: THREE.Group;
  private moonGlow: THREE.Sprite;
  private t = 0;
  private night = 0;

  constructor() {
    super();

    this.domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(0x54b3f0) },
        uHorizon: { value: new THREE.Color(0xcfeffb) }
      },
      vertexShader: [
        'varying vec3 vDir;',
        'void main() {',
        '  vDir = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uTop;',
        'uniform vec3 uHorizon;',
        'varying vec3 vDir;',
        'void main() {',
        '  float h = clamp(vDir.y, 0.0, 1.0);',
        '  vec3 c = mix(uHorizon, uTop, pow(h, 0.7));',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(340, 32, 18), this.domeMat);
    dome.frustumCulled = false;
    this.add(dome);

    // Background star field (upper hemisphere).
    const count = 420;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = rand(0.15, 1);
      const a = rand(0, TAU);
      const r = Math.sqrt(1 - y * y) * 300;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y * 300;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const stars = new THREE.Points(geo, this.starsMat);
    stars.frustumCulled = false;
    this.add(stars);

    // A handful of individually twinkling stars.
    const tex = makeSoftCircleTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const s = new THREE.Sprite(mat);
      const y = rand(0.3, 1);
      const a = rand(0, TAU);
      const r = Math.sqrt(1 - y * y) * 280;
      s.position.set(Math.cos(a) * r, y * 280, Math.sin(a) * r);
      s.scale.setScalar(rand(5, 10));
      this.twinkles.push({ s, phase: rand(0, TAU), speed: rand(1, 3) });
      this.add(s);
    }

    // Sun glow.
    const sunTex = makeSoftCircleTexture('rgba(255,245,200,1)', 'rgba(255,180,60,0)');
    this.sun = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.sun.scale.setScalar(120);
    this.add(this.sun);

    // Friendly moon (big, with a smiling face).
    this.moon = new THREE.Group();
    const moonBody = new THREE.Mesh(
      new THREE.SphereGeometry(7, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff7d6 })
    );
    this.moon.add(moonBody);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4a3f35 });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), eyeMat);
    e1.position.set(-2.2, 1.6, 6.0);
    const e2 = e1.clone();
    e2.position.x = 2.2;
    this.moon.add(e1, e2);

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.35, 6, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x4a3f35 })
    );
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.4, 6.2);
    this.moon.add(smile);

    this.moonGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeSoftCircleTexture('rgba(255,250,220,0.9)', 'rgba(255,250,220,0)'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.moonGlow.scale.setScalar(60);
    this.moon.add(this.moonGlow);
    this.moon.visible = false;
    this.add(this.moon);
  }

  setDayNight(state: DayNightState): void {
    this.night = state.nightAmount;
    (this.domeMat.uniforms.uTop.value as THREE.Color).copy(state.skyTop);
    (this.domeMat.uniforms.uHorizon.value as THREE.Color).copy(state.skyHorizon);

    this.starsMat.opacity = this.night;

    this.sun.position.copy(state.sunDir).multiplyScalar(250);
    (this.sun.material as THREE.SpriteMaterial).opacity = 1 - this.night;

    this.moon.position.copy(state.moonDir).multiplyScalar(250);
    this.moon.visible = this.night > 0.12;
    this.moonGlow.material.opacity = this.night;
    this.moon.lookAt(0, 0, 0);
  }

  update(dt: number): void {
    this.t += dt;
    for (const tw of this.twinkles) {
      tw.s.material.opacity = this.night * (0.5 + 0.5 * Math.sin(this.t * tw.speed + tw.phase));
    }
  }
}
