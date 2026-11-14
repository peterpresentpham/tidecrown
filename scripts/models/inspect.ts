import * as THREE from 'three';

import { loadModel } from './load';

for (const f of process.argv.slice(2)) {
  try {
    const { scene, animations, textures } = await loadModel(f);
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    const meshes: string[] = [];
    const bones: string[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const g = m.geometry;
        const mats = (
          Array.isArray(m.material) ? m.material : [m.material]
        ) as THREE.MeshStandardMaterial[];
        meshes.push(
          `${o.name}${(o as THREE.SkinnedMesh).isSkinnedMesh ? '*' : ''}<${o.parent?.name}>(${(g.index ? g.index.count : g.attributes.position.count) / 3})[${mats.map((x) => x.name + (textures.has(x.name) ? '+T' : '')).join(',')}]`
        );
      }
      if ((o as THREE.Bone).isBone && /hand|slot|head|spine|chest/i.test(o.name))
        bones.push(o.name);
    });
    console.log(
      `${f.split('/').pop()} ${size
        .toArray()
        .map((v) => v.toFixed(2))
        .join('x')} anims=${animations.length}`
    );
    console.log('  meshes', meshes.join(' '));
    if (bones.length) console.log('  bones', bones.join(' '));
    if (animations.length) console.log('  anims', animations.map((a) => a.name).join(' '));
  } catch (e) {
    console.log(f, 'ERR', (e as Error).stack?.split('\n').slice(0, 3).join(' | '));
  }
}
