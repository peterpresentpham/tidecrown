import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';

import { UNITS, type UnitType } from '../src/game/engine';
import { buildUnitModel } from '../src/render/unitModels';
import { troop } from './helpers/tacticalScenarios';
test('all 23 unit identities have distinct geometry, bounded complexity and action pivots', () => {
  const signatures = new Set<string>();
  for (const type of Object.keys(UNITS) as UnitType[]) {
    const materials: THREE.Material[] = [];
    const mesh = (
      geometry: THREE.BufferGeometry,
      color: string,
      parent: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0
    ) => {
      const material = new THREE.MeshStandardMaterial({ color });
      materials.push(material);
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const box = (parent: THREE.Object3D, color: string, size: number[], pos: number[]) =>
      mesh(
        new THREE.BoxGeometry(...(size as [number, number, number])),
        color,
        parent,
        ...(pos as [number, number, number])
      );
    const g = buildUnitModel(troop(type, 'model', '0,0', 'player'), { mesh, box });
    g.updateMatrixWorld(true);
    const parts: unknown[] = [];
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        assert.ok(o.geometry.getAttribute('position').count > 0);
        parts.push([
          o.geometry.type,
          o.geometry.parameters,
          o.matrixWorld.elements,
          (o.material as THREE.MeshStandardMaterial).color.getHexString(),
        ]);
        o.geometry.dispose();
        if (o.material.userData.transient) o.material.dispose();
      }
    });
    assert.ok(parts.length < 100, `${type} too many rigid parts`);
    const signature = JSON.stringify(parts);
    assert.ok(!signatures.has(signature), `${type} duplicates another model`);
    signatures.add(signature);
    if (UNITS[type].class === 'siege') assert.equal(g.userData.wheels.length, 4);
    else if (UNITS[type].class !== 'ship') assert.ok(g.userData.legs.length >= 2);
    if (UNITS[type].attack > 0 && UNITS[type].class !== 'ship') assert.ok(g.userData.weapon);
    materials.forEach((m) => m.dispose());
  }
  assert.equal(signatures.size, 23);
});
