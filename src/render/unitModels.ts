import * as THREE from 'three';

import { UNITS } from '../data/units';
import { FACTIONS, type Unit } from '../game/engine';
import type { Character, CharacterSource } from './characters';
import type { VoxelScenery } from './voxelScenery';

type Builder = {
  mesh: (
    geometry: THREE.BufferGeometry,
    color: string,
    parent: THREE.Object3D,
    x?: number,
    y?: number,
    z?: number
  ) => THREE.Mesh;
  box: (parent: THREE.Object3D, color: string, size: number[], position: number[]) => THREE.Mesh;
  /** Voxel siege engines and ships. */
  library?: VoxelScenery | null;
  /** Adds a library model as a vertex-coloured mesh. */
  model?: (name: string, parent: THREE.Object3D, team?: string) => THREE.Mesh;
  /** Voxel soldiers and riders. */
  characters?: CharacterSource | null;
};

/**
 * A unit: an animated voxel character (userData.character) for soldiers and riders, a voxel model with a
 * swinging arm or sail pivot (userData.weapon) for siege engines and ships, always on a faction
 * disc. Until the models have loaded only the disc is drawn.
 */
export function buildUnitModel(u: Unit, b: Builder) {
  const g = new THREE.Group(),
    color = FACTIONS[u.owner].color,
    d = UNITS[u.type];
  let weapon: THREE.Object3D | undefined;
  let character: Character | undefined;
  const flag = (parent: THREE.Object3D, x: number, y: number, z: number, height = 0.8) => {
    b.box(parent, '#71604b', [0.035, height, 0.035], [x, y + height / 2, z]);
    b.box(parent, color, [0.32, 0.2, 0.03], [x + 0.17, y + height - 0.12, z]);
  };
  if (b.characters?.has(u.type)) {
    character = b.characters.build(u.type, color);
    g.add(character.root);
  } else if (b.library && b.model && d.class === 'siege') {
    b.model(u.type, g, color);
    weapon = new THREE.Group();
    g.add(weapon);
    if (b.library.has(`${u.type}.arm`)) {
      weapon.position.copy(b.library.anchor(`${u.type}.arm`));
      b.model(`${u.type}.arm`, weapon, color);
    }
    flag(g, -0.45, 0.2, 0.35, 0.7);
  } else if (b.library && b.model && d.class === 'ship') {
    const hull = new THREE.Group();
    // Hulls sit slightly below the waterline.
    hull.position.y = -0.1;
    g.add(hull);
    const name =
      u.type === 'scout_ship' ? 'boat_sail' : u.type === 'transport' ? 'viking_boat' : 'sail_ship';
    b.model(name, hull, color);
    if (u.type === 'warship') hull.scale.setScalar(0.85);
    weapon = new THREE.Group();
    hull.add(weapon);
    flag(hull, 0, 0.5, -0.1, u.type === 'scout_ship' ? 1.1 : 1.6);
  }
  const radius = d.class === 'ship' ? 0.7 : 0.55;
  const base = b.mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 20), color, g, 0, 0.02, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  mat.userData.transient = true;
  base.material = mat;
  g.userData.weapon = weapon;
  g.userData.character = character;
  return g;
}
