import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';

import { UNITS, type UnitType } from '../src/game/engine';
import { VOXEL_LOOKS, VoxelLibrary } from '../src/render/voxel';
import { VOXEL } from '../src/render/voxelGrid';

const POSES = ['idle', 'walk', 'attack', 'hit', 'death', 'work'] as const;

test('voxel soldiers cover every character unit, stand about a tile high and animate every pose', () => {
  // Every land unit except siege engines is a soldier.
  const soldiers = (Object.keys(UNITS) as UnitType[]).filter(
    (t) => !['siege', 'ship'].includes(UNITS[t].class)
  );
  assert.deepEqual(Object.keys(VOXEL_LOOKS).sort(), soldiers.sort());
  const library = new VoxelLibrary();
  for (const type of Object.keys(VOXEL_LOOKS) as UnitType[]) {
    const character = library.build(type, '#2477f3');
    const box = new THREE.Box3().setFromObject(character.root);
    const height = box.max.y - box.min.y;
    assert.ok(height > 1.2 && height < 3.2, `${type} height ${height.toFixed(2)}`);
    for (const { mixer, clips } of character.mixers)
      for (const pose of POSES) {
        const clip = clips[pose];
        assert.ok(clip, `${type} ${pose}`);
        // Every track must bind to a named part of this figure (a typo would silently do nothing).
        const root = mixer.getRoot() as THREE.Object3D;
        for (const t of clip.tracks) {
          const node = t.name.split('.')[0];
          assert.ok(root.name === node || root.getObjectByName(node), `${type} ${t.name}`);
        }
      }
    for (const pose of POSES) {
      character.play(pose, 0);
      character.update(0.3);
    }
  }
});

test('voxel parts are shared per look and faction colour, and the colour reaches the cloth', () => {
  const library = new VoxelLibrary();
  const meshes = (root: THREE.Object3D) => {
    const list: THREE.Mesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) list.push(o as THREE.Mesh);
    });
    return list;
  };
  const a = meshes(library.build('swordsman', '#2477f3').root);
  const b = meshes(library.build('swordsman', '#2477f3').root);
  const red = meshes(library.build('swordsman', '#eb4646').root);
  assert.equal(a[0].geometry, b[0].geometry);
  assert.ok(a.every((m) => m.userData.shared));
  const torso = (list: THREE.Mesh[]) => list.find((m) => m.name === 'torso')!.geometry;
  assert.notEqual(torso(a), torso(red));
  const blue = torso(a).getAttribute('color');
  let bluish = 0;
  for (let i = 0; i < blue.count; i++) if (blue.getZ(i) > blue.getX(i) * 1.5) bluish++;
  assert.ok(bluish > blue.count / 3, 'tunic takes the faction blue');
});

test('high detail soldiers are finer, keep the same size and rig, and shade their creases', () => {
  const basic = new VoxelLibrary('basic'),
    high = new VoxelLibrary('high');
  const triangles = (root: THREE.Object3D) => {
    let n = 0;
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh)
        n += (o as THREE.Mesh).geometry.getAttribute('position').count / 3;
    });
    return n;
  };
  for (const type of Object.keys(VOXEL_LOOKS) as UnitType[]) {
    const a = basic.build(type, '#2477f3'),
      b = high.build(type, '#2477f3');
    const size = (c: typeof a) =>
      new THREE.Box3().setFromObject(c.root).getSize(new THREE.Vector3());
    // Same silhouette within a fine voxel or two (details stick out slightly).
    assert.ok(Math.abs(size(a).y - size(b).y) < 0.2, `${type} height`);
    const names = (c: typeof a) => {
      const list: string[] = [];
      c.root.traverse((o) => o.name && list.push(o.name));
      return list.sort();
    };
    assert.deepEqual(names(b), names(a), `${type} rig`);
    // Finer grid: some vertices fall between coarse voxel planes.
    const fine = b.root.getObjectByName('headMesh') as THREE.Mesh;
    const pos = fine.geometry.getAttribute('position');
    let half = 0;
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i) / VOXEL;
      if (Math.abs(v - Math.round(v)) > 0.25) half++;
    }
    assert.ok(half > 0, `${type} finer`);
    // Merged faces keep the fine models within a sane budget.
    assert.ok(triangles(b.root) < 12000, `${type} ${triangles(b.root)} triangles`);
    // Ambient occlusion.
    const head = b.root.getObjectByName('headMesh') as THREE.Mesh;
    const colors = head.geometry.getAttribute('color');
    let dark = 0;
    // Shaded corners: a triangle whose vertices differ in brightness.
    for (let i = 0; i < colors.count; i += 3) {
      const lum = [0, 1, 2].map(
        (k) => colors.getX(i + k) + colors.getY(i + k) + colors.getZ(i + k)
      );
      if (Math.min(...lum) < Math.max(...lum) * 0.8) dark++;
    }
    assert.ok(dark > 0, `${type} creases`);
  }
});
