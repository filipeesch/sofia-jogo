import * as THREE from 'three';

// Gently animated ocean with GPU vertex waves (no per-frame CPU mesh edits).
export class Ocean extends THREE.Mesh {
  private uniforms: { uTime: { value: number }; uColorDeep: { value: THREE.Color }; uColorShallow: { value: THREE.Color } };

  constructor(config: { deep?: number; shallow?: number } = {}) {
    const uniforms = {
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(config.deep ?? 0x0e5fa8) },
      uColorShallow: { value: new THREE.Color(config.shallow ?? 0x45b6d6) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: [
        'uniform float uTime;',
        'varying float vH;',
        'void main() {',
        '  vec3 p = position;',
        '  float h = sin(p.x * 0.15 + uTime * 0.8) * 0.25;',
        '  h += sin(p.z * 0.20 - uTime * 0.6) * 0.20;',
        '  h += sin((p.x + p.z) * 0.35 + uTime * 0.5) * 0.08;',
        '  p.y += h;',
        '  vH = h;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColorDeep;',
        'uniform vec3 uColorShallow;',
        'varying float vH;',
        'void main() {',
        '  vec3 c = mix(uColorDeep, uColorShallow, smoothstep(-0.4, 0.4, vH));',
        '  c += vec3(0.5, 0.65, 0.7) * smoothstep(0.24, 0.42, vH) * 0.35;',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    });

    const geometry = new THREE.PlaneGeometry(600, 600, 48, 48);
    geometry.rotateX(-Math.PI / 2);

    super(geometry, material);
    this.uniforms = uniforms;
    this.frustumCulled = false;
  }

  update(dt: number): void {
    this.uniforms.uTime.value += dt;
  }
}
