import * as THREE from 'three';

// Instanced batching for repeated world props (trees, bushes, flowers, fence
// posts, lamps, benches, cacti, snowmen, …). Each prop was previously an
// individual `model.clone()` whose meshes became one draw call apiece — a
// 10-mesh tree placed 40 times meant 400 draw calls. Here the template is
// baked into a set of `InstancedMesh`es (one per template mesh), so the same
// 40 trees cost only 10 draw calls, and 60 flowers cost ~11 instead of ~660.
//
// Placement data (position, rotation, scale) comes from the level layouts;
// collision solids are kept separately in each world, so batching changes
// nothing about gameplay.

export interface InstancePlacement {
  x: number;
  z: number;
  y?: number; // terrain height; defaults to 0
  rotY?: number; // radians around Y; defaults to 0
  scale?: number; // uniform scale; defaults to 1
  phase?: number; // sway phase (used when sway is enabled)
  speed?: number; // sway speed (used when sway is enabled)
}

export interface InstancedProps {
  group: THREE.Group;
  // Call every frame with the global elapsed time when `sway` is enabled.
  update?: (tGlobal: number) => void;
}

export interface InstanceOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  // Sway amplitude in radians around Z (foliage), e.g. 0.06.
  sway?: number;
  // Secondary sway amplitude around X (used by pine trees).
  swayX?: number;
}

export function instanceProps(
  template: THREE.Group | undefined,
  placements: InstancePlacement[],
  opts: InstanceOptions = {}
): InstancedProps {
  const group = new THREE.Group();
  if (!template || placements.length === 0) return { group };

  // Bake each template mesh's own node transform into its geometry, so the
  // instance matrix only needs to encode the placement transform.
  template.updateWorldMatrix(true, true);
  const inv = template.matrixWorld.clone().invert();

  const meshes: THREE.Mesh[] = [];
  template.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) meshes.push(m);
  });

  const sway = opts.sway ?? 0;
  const swayX = opts.swayX ?? 0;
  const animated: {
    im: THREE.InstancedMesh;
    idx: number;
    pos: THREE.Vector3;
    rotY: number;
    scale: number;
    phase: number;
    speed: number;
  }[] = [];

  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const mtx = new THREE.Matrix4();

  for (const mesh of meshes) {
    const rel = inv.clone().multiply(mesh.matrixWorld);
    const geo = mesh.geometry.clone().applyMatrix4(rel);
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;

    const im = new THREE.InstancedMesh(geo, mat, placements.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (opts.castShadow !== undefined) im.castShadow = opts.castShadow;
    if (opts.receiveShadow !== undefined) im.receiveShadow = opts.receiveShadow;

    placements.forEach((inst, i) => {
      const rotY = inst.rotY ?? 0;
      const scale = inst.scale ?? 1;
      p.set(inst.x, inst.y ?? 0, inst.z);
      e.set(0, rotY, 0);
      q.setFromEuler(e);
      s.setScalar(scale);
      mtx.compose(p, q, s);
      im.setMatrixAt(i, mtx);

      if (sway !== 0 || swayX !== 0) {
        animated.push({
          im,
          idx: i,
          pos: p.clone(),
          rotY,
          scale,
          phase: inst.phase ?? 0,
          speed: inst.speed ?? 0.8
        });
      }
    });

    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  let update: ((tGlobal: number) => void) | undefined;
  if (animated.length > 0) {
    update = (tGlobal: number) => {
      for (const a of animated) {
        // Rebuild the instance matrix with the sway rotation applied around
        // the base heading (order YXZ, matching the old foliage sway).
        e.order = 'YXZ';
        e.set(
          swayX !== 0 ? Math.cos(tGlobal * a.speed + a.phase) * swayX : 0,
          a.rotY,
          sway !== 0 ? Math.sin(tGlobal * a.speed + a.phase) * sway : 0
        );
        q.setFromEuler(e);
        s.setScalar(a.scale);
        mtx.compose(a.pos, q, s);
        a.im.setMatrixAt(a.idx, mtx);
        a.im.instanceMatrix.needsUpdate = true;
      }
    };
  }

  return { group, update };
}

export function meshMaterialNamed(template: THREE.Group | undefined, meshName: string): THREE.MeshStandardMaterial | null {
  if (!template) return null;
  let found: THREE.MeshStandardMaterial | null = null;
  template.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name === meshName && !found) {
      found = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    }
  });
  return found;
}
