import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';

import { UNITS, type UnitType } from '../src/game/engine';
import { buildUnitModel } from '../src/render/unitModels';
import { voxelSoldiers } from '../src/render/voxel';
import { VoxelScenery } from '../src/render/voxelScenery';
import { troop } from './helpers/tacticalScenarios';

const library = new VoxelScenery();

// Every name the renderer asks for; a missing one would throw at runtime.
const SCENERY = [
  ...['forest_A', 'forest_B', 'forest_cut', 'tree_pine', 'tree_common', 'bush', 'bush_berries'],
  ...['mountain_A', 'mountain_B', 'mountain_C', 'hill_A', 'hill_B', 'rock_A', 'rock_B', 'rock_C'],
  ...['farm', 'mine', 'stone', 'logs', 'crates', 'fence', 'well', 'home_A', 'home_B'],
  ...['town_1', 'town_2', 'town_3', 'archery', 'market', 'storage', 'tower', 'windmill'],
  ...['wall', 'wall_stone', 'port', 'ruin', 'blacksmith', 'sawmill', 'stable'],
  ...['ballista', 'catapult', 'catapult.arm', 'trebuchet', 'trebuchet.arm'],
  ...['boat_sail', 'viking_boat', 'sail_ship'],
];

test('voxel scenery has every model the world uses, standing within one tile', () => {
  for (const name of SCENERY) {
    assert.ok(library.has(name), name);
    const g = library.geometry(name);
    assert.ok(g.getAttribute('position').count > 0, name);
    assert.ok(g.getAttribute('color'), name);
    assert.ok(g.getAttribute('normal'), name);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    // Scenery stays within roughly one 1.9-unit tile; arms hang around their pivot.
    assert.ok(box.max.x - box.min.x < 2.3 && box.max.z - box.min.z < 2.3, name);
    if (!name.includes('.')) assert.ok(box.min.y >= 0 && box.max.y < 3, name);
    g.dispose();
  }
  assert.ok(library.anchor('catapult.arm').y > 0);
  assert.ok(library.anchor('trebuchet.arm').y > 0.8);
});

test('faction colour only changes the faction cells, and templates are reused', () => {
  const blue = library.geometry('archery', '#2477f3');
  const red = library.geometry('archery', '#eb4646');
  const a = blue.getAttribute('color'),
    b = red.getAttribute('color');
  let changed = 0;
  for (let i = 0; i < a.count; i++) if (a.getX(i) !== b.getX(i)) changed++;
  assert.ok(changed > 0, 'archery range has faction-coloured parts');
  assert.ok(changed < a.count / 2, 'most of the building keeps its own colours');
  const again = library.geometry('archery', '#2477f3');
  assert.notEqual(again, blue, 'callers own their geometry');
  assert.equal(again.getAttribute('position').count, a.count);
});

test('every unit type builds: soldiers animated, siege engines and ships from voxel models', () => {
  for (const type of Object.keys(UNITS) as UnitType[]) {
    const add = (geometry: THREE.BufferGeometry, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      parent.add(m);
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
      characters: voxelSoldiers(),
    });
    const box = new THREE.Box3().setFromObject(g, true);
    const height = box.max.y - box.min.y;
    assert.ok(height > 0.8 && height < 3.2, `${type} height ${height.toFixed(2)}`);
    const cls = UNITS[type].class;
    assert.equal(!!g.userData.character, cls !== 'siege' && cls !== 'ship', type);
    if (cls === 'siege' || cls === 'ship') assert.ok(g.userData.weapon, type);
  }
});
