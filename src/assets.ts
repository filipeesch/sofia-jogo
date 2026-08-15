import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Loads a GLB and returns a clean Group (drops the GLTF Scene wrapper) with
// castShadow enabled on all meshes.
export function loadGLB(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        const group = new THREE.Group();
        group.name = gltf.scene.name || 'model';
        while (gltf.scene.children.length) group.add(gltf.scene.children[0]);
        group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = true;
        });
        resolve(group);
      },
      undefined,
      reject
    );
  });
}

export type WorldModels = Record<string, THREE.Group | undefined>;

const WORLD_MODELS: Record<string, { name: string; url: string }[]> = {
  snow: [
    { name: 'snowman', url: 'models/snowman.glb' },
    { name: 'pine', url: 'models/pine.glb' },
    { name: 'bird', url: 'models/bird.glb' },
    { name: 'balloon', url: 'models/balloon.glb' },
    { name: 'house', url: 'models/house.glb' }
  ],
  desert: [
    { name: 'cactus', url: 'models/cactus.glb' },
    { name: 'pyramid', url: 'models/pyramid.glb' },
    { name: 'bird', url: 'models/bird.glb' },
    { name: 'balloon', url: 'models/balloon.glb' },
    { name: 'house', url: 'models/house.glb' }
  ],
  island: [
    { name: 'palm', url: 'models/palm.glb' },
    { name: 'tree', url: 'models/tree.glb' },
    { name: 'whale', url: 'models/whale.glb' },
    { name: 'bird', url: 'models/bird.glb' },
    { name: 'balloon', url: 'models/balloon.glb' },
    { name: 'peak', url: 'models/peak.glb' },
    { name: 'mountain', url: 'models/mountain.glb' },
    { name: 'house', url: 'models/house.glb' }
  ],
  mountains: [
    { name: 'pine', url: 'models/pine.glb' },
    { name: 'tree', url: 'models/tree.glb' },
    { name: 'peak', url: 'models/peak.glb' },
    { name: 'bird', url: 'models/bird.glb' },
    { name: 'balloon', url: 'models/balloon.glb' },
    { name: 'house', url: 'models/house.glb' }
  ]
};

export async function loadWorldModels(worldType: string): Promise<WorldModels> {
  const list = WORLD_MODELS[worldType] ?? [];
  const out: WorldModels = {};
  await Promise.all(
    list.map(async (m) => {
      try {
        out[m.name] = await loadGLB(m.url);
      } catch (err) {
        console.warn('Falha ao carregar modelo', m.url, err);
      }
    })
  );
  return out;
}
