import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import * as THREE from 'three';

import { loadModel } from '../scripts/models/load';
import { UNITS, type UnitType } from '../src/game/engine';
import { type Asset, CharacterLibrary, LOOKS } from '../src/render/characters';
import { ModelLibrary } from '../src/render/modelLibrary';
import { buildUnitModel } from '../src/render/unitModels';
import { troop } from './helpers/tacticalScenarios';

const file = readFileSync(new URL('../src/render/assets/models.bin', import.meta.url));
const library = new ModelLibrary(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
);

// Every name the renderer asks for; a missing one would throw at runtime.
const SCENERY = [
  'forest_A',
  'forest_B',
  'forest_cut',
  'tree_pine',
  'tree_common',
  'bush',
  'bush_berries',
  'mountain_A',
  'mountain_B',
  'mountain_C',
  'hill_A',
  'hill_B',
  'rock_A',
  'rock_B',
  'rock_C',
  'farm',
  'mine',
  'stone',
  'logs',
  'crates',
  'fence',
  'well',
  'home_A',
  'home_B',
  'town_1',
  'town_2',
  'town_3',
  'archery',
  'market',
  'storage',
  'tower',
  'windmill',
  'wall',
  'wall_stone',
  'port',
  'ruin',
  'blacksmith',
  'sawmill',
  'stable',
];

test('model library contains every scenery and building model the world uses', () => {
  for (const name of SCENERY) {
    assert.ok(library.has(name), name);
    const g = library.geometry(name);
    assert.ok(g.getAttribute('position').count > 0, name);
    assert.ok(g.getAttribute('color'), name);
    assert.ok(g.getAttribute('normal'), name);
    g.computeBoundingBox();
    // Scenery stays within roughly one 1.9-unit tile.
    assert.ok(g.boundingBox!.max.x - g.boundingBox!.min.x < 2.3, name);
    g.dispose();
  }
});

test('faction colour only changes flagged vertices', () => {
  const blue = library.geometry('archery', '#2477f3');
  const red = library.geometry('archery', '#eb4646');
  const a = blue.getAttribute('color'),
    b = red.getAttribute('color');
  let changed = 0;
  for (let i = 0; i < a.count; i++) if (a.getX(i) !== b.getX(i)) changed++;
  assert.ok(changed > 0, 'archery range has faction-coloured parts');
  assert.ok(changed < a.count / 2, 'most of the building keeps its own colours');
  blue.dispose();
  red.dispose();
});

const dir = new URL('../src/render/assets/units/', import.meta.url);
const assets: Record<string, Asset> = {};
for (const name of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  const loaded = await loadModel(new URL(name, dir).pathname);
  assets[name.replace(/\.glb$/, '')] = loaded;
}
const characters = new CharacterLibrary(assets);

function build(type: UnitType) {
  const meshes: THREE.Mesh[] = [];
  const add = (geometry: THREE.BufferGeometry, parent: THREE.Object3D) => {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const g = buildUnitModel(troop(type, 'model', '0,0', 'player'), {
    mesh: (geometry, _color, parent, x = 0, y = 0, z = 0) => {
      const m = add(geometry, parent);
      m.position.set(x, y, z);
      return m;
    },
    box: (parent, _color, size, pos) => {
      const m = add(new THREE.BoxGeometry(...(size as [number, number, number])), parent);
      m.position.set(...(pos as [number, number, number]));
      return m;
    },
    library,
    model: (name, parent, team) => add(library.geometry(name, team), parent),
    characters,
  });
  return { g, meshes };
}

test('every unit type builds: soldiers as animated characters, siege and ships baked', () => {
  for (const type of Object.keys(UNITS) as UnitType[]) {
    const { g, meshes } = build(type);
    const box = new THREE.Box3().setFromObject(g, true);
    const height = box.max.y - box.min.y;
    assert.ok(height > 0.8 && height < 3.2, `${type} height ${height.toFixed(2)}`);
    if (LOOKS[type]) {
      assert.ok(g.userData.character, `${type} is a character`);
      let skinned = 0;
      g.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      });
      assert.ok(skinned >= 2, `${type} has body and head`);
    } else assert.ok(g.userData.weapon, `${type} has a weapon pivot`);
    meshes.forEach((m) => m.geometry.dispose());
  }
});

test('characters have every pose clip and hold their gear on hand bones', () => {
  for (const type of Object.keys(LOOKS) as UnitType[]) {
    const character = characters.build(type, '#2477f3');
    for (const { clips } of character.mixers)
      for (const pose of ['idle', 'walk', 'attack', 'hit', 'death', 'work'] as const)
        assert.ok(clips[pose], `${type} ${pose}`);
    const hands = new Set<string>();
    character.root.traverse((o) => {
      if (/^hand_[lr]$/.test(o.name) && o.children.some((c) => !(c as THREE.Bone).isBone))
        hands.add(o.name);
    });
    assert.equal(hands.size, new Set(LOOKS[type]!.gear.map((g) => g.hand)).size, type);
    // Poses run without throwing and the root stays in place (no root motion).
    for (const pose of ['walk', 'attack', 'death'] as const) {
      character.play(pose, 0);
      character.update(0.5);
    }
    assert.equal(character.root.position.length(), 0);
  }
});
