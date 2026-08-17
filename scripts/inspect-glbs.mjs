// Inspect GLB files: nodes, meshes, materials, vertex counts, image textures.
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

function inspect(file) {
  const buf = readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const nodeNames = (json.nodes || []).map((n) => n.name || '?');
  const meshNames = (json.meshes || []).map((m) => m.name || '?');
  const matNames = (json.materials || []).map((m) => m.name || '?');
  const images = (json.images || []).length;
  let vcount = 0;
  for (const m of json.meshes || []) {
    for (const p of m.primitives || []) {
      const acc = json.accessors[p.indices];
      if (acc) vcount += acc.count / 3;
      else {
        const pos = json.accessors[p.attributes.POSITION];
        if (pos) vcount += pos.count / 3;
      }
    }
  }
  const hasTex = (json.materials || []).some((m) => m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture);
  console.log(`${file.replace('public/models/', '')}: nodes=[${nodeNames.join(', ')}] meshes=${(json.meshes || []).length} verts≈${Math.round(vcount)} mats=[${matNames.join(', ')}] imgs=${images} tex=${hasTex}`);
}

for (const f of readdirSync('public/models').sort()) {
  if (f.endsWith('.glb')) inspect(`public/models/${f}`);
}
