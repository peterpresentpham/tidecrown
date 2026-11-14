import * as THREE from 'three';

import { UNITS } from '../data/units';
import { FACTIONS, type Unit } from '../game/engine';
import { MATERIAL_PALETTE as P } from './visualIdentity';
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
};
/** Small rigid parts only; limbs/wheels/weapon pivots animate exclusively during actions. */
export function buildUnitModel(u: Unit, b: Builder) {
  const g = new THREE.Group(),
    color = FACTIONS[u.owner].color,
    d = UNITS[u.type],
    legs: THREE.Object3D[] = [],
    wheels: THREE.Object3D[] = [];
  const box = b.box,
    mesh = b.mesh;
  const flag = (p: THREE.Group, y: number) => {
    box(p, '#71604b', [0.04, 0.8, 0.04], [-0.35, y, 0]);
    box(p, color, [0.37, 0.22, 0.035], [-0.16, y + 0.24, 0]);
  };
  let weapon: THREE.Object3D | undefined;
  if (d.class === 'ship') {
    const hull = mesh(
      new THREE.CylinderGeometry(0.45, 0.28, 1.45, 6),
      u.type === 'heavy_warship' ? '#51493f' : '#806141',
      g,
      0,
      0.3
    );
    hull.rotation.x = Math.PI / 2;
    hull.scale.x = 1.2;
    box(g, '#c09a66', [0.84, 0.09, 1.1], [0, 0.4, 0]);
    const mast = box(g, '#80613b', [0.055, 1.15, 0.055], [0, 0.98, 0]);
    if (u.type !== 'transport') {
      const sail = mesh(
        new THREE.ConeGeometry(0.5, 0.85, 3),
        u.type === 'heavy_warship' ? '#d7c7a2' : color,
        g,
        0.05,
        1.2,
        0.08
      );
      sail.scale.z = 0.06;
      sail.rotation.z = -0.2;
      box(g, '#ebe2c3', [0.09, 0.5, 0.025], [0.05, 1.25, 0.12]);
    } else for (const x of [-0.2, 0.2]) box(g, '#ad8351', [0.24, 0.25, 0.4], [x, 0.57, 0.1]);
    if (['warship', 'heavy_warship'].includes(u.type)) {
      weapon = box(g, '#474c49', [0.15, 0.13, 0.65], [0, 0.6, -0.5]);
      if (u.type === 'heavy_warship') box(g, '#c6b393', [0.85, 0.08, 0.08], [0, 0.64, -0.65]);
    }
    if (u.type === 'warship' || u.type === 'heavy_warship') {
      box(g, P.wood, [0.05, 0.95, 0.05], [0, 1, -0.45]);
      const aft = mesh(new THREE.ConeGeometry(0.36, 0.65, 3), color, g, 0, 1.2, -0.45);
      aft.scale.z = 0.08;
    }
    if (u.type === 'heavy_warship') box(g, P.iron, [0.65, 0.3, 0.36], [0, 0.6, 0.4]);
    flag(g, 0.9);
    g.userData.sail = mast;
  } else if (d.class === 'siege') {
    box(g, '#775631', [0.85, 0.14, 1.05], [0, 0.28, 0]);
    for (const x of [-0.45, 0.45])
      for (const z of [-0.35, 0.35]) {
        const w = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.11, 7), '#403b31', g, x, 0.24, z);
        w.rotation.z = Math.PI / 2;
        wheels.push(w);
      }
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.85, 0);
    g.add(pivot);
    weapon = pivot;
    if (u.type === 'ballista') {
      box(g, '#a28b5a', [0.12, 0.15, 0.9], [0, 0.65, 0]);
      box(pivot, '#b8a079', [1.08, 0.07, 0.12], [0, 0, -0.12]);
      box(pivot, '#ddd1ae', [0.04, 0.04, 0.95], [0, 0.08, -0.2]);
    } else {
      const tall = u.type === 'trebuchet';
      for (const x of [-0.3, 0.3]) {
        const frame = box(g, color, [0.11, tall ? 1.55 : 0.7, 0.11], [x, tall ? 1.02 : 0.62, 0]);
        frame.rotation.z = x > 0 ? 0.15 : -0.15;
      }
      pivot.position.y = tall ? 1.62 : 0.96;
      const arm = box(pivot, '#bb9760', [0.1, tall ? 1.8 : 1.15, 0.1], [0, 0.3, 0]);
      arm.rotation.x = -0.55;
      mesh(new THREE.DodecahedronGeometry(0.17, 0), '#b4baa8', pivot, 0, 0.82, -0.38);
      if (tall) box(pivot, '#74776c', [0.4, 0.4, 0.4], [0, -0.4, 0.2]);
    }
    flag(g, 0.8);
  } else {
    const mounted = d.class === 'cavalry',
      heavy = ['heavy_infantry', 'heavy_knight', 'paladin'].includes(u.type),
      dy = mounted ? 0.62 : 0;
    if (mounted) {
      const horse = mesh(
        new THREE.CylinderGeometry(0.3, 0.34, 0.95, 7),
        heavy ? '#89908b' : '#815f43',
        g,
        0,
        0.65,
        0
      );
      horse.rotation.x = Math.PI / 2;
      for (const x of [-0.22, 0.22])
        for (const z of [-0.35, 0.35]) {
          const leg = new THREE.Group();
          leg.position.set(x, 0.52, z);
          g.add(leg);
          box(leg, '#4b4439', [0.13, 0.48, 0.13], [0, -0.24, 0]);
          legs.push(leg);
        }
      box(g, heavy ? '#9ea7a0' : '#947354', [0.32, 0.4, 0.3], [0, 0.98, 0.45]);
      box(g, '#c6ad7b', [0.3, 0.13, 0.34], [0, 1.06, 0.66]);
      box(g, color, [0.48, 0.07, 0.5], [0, 0.94, -0.07]);
    } else
      for (const x of [-0.13, 0.13]) {
        const leg = new THREE.Group();
        leg.position.set(x, 0.44, 0);
        g.add(leg);
        box(leg, '#4b483e', [0.17, 0.32, 0.2], [0, -0.16, 0]);
        box(leg, '#302c28', [0.18, 0.12, 0.3], [0, -0.33, 0.05]);
        legs.push(leg);
      }
    mesh(
      new THREE.CylinderGeometry(0.23, 0.3, 0.48, 7),
      heavy
        ? P.steel
        : ['swordsman', 'spear', 'pikeman', 'crossbow', 'knight'].includes(u.type)
          ? P.iron
          : ['scout', 'ranger'].includes(u.type)
            ? P.forest
            : P.leather,
      g,
      0,
      0.7 + dy
    );
    box(g, color, [0.53, 0.09, 0.35], [0, 0.52 + dy, 0]);
    mesh(new THREE.SphereGeometry(0.22, 8, 6), '#dfaf81', g, 0, 1.12 + dy);
    mesh(
      new THREE.SphereGeometry(0.25, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      heavy ? '#d0d6ce' : u.type === 'ranger' ? '#537d4e' : color,
      g,
      0,
      1.15 + dy
    );
    if (heavy) {
      box(g, color, [0.42, 0.07, 0.25], [0, 1.36 + dy, 0]);
      box(g, '#5d6568', [0.25, 0.07, 0.1], [0, 1.16 + dy, 0.22]);
    }
    if (['scout', 'ranger'].includes(u.type))
      box(g, '#4f6950', [0.5, 0.53, 0.08], [0, 0.8 + dy, -0.2]);
    const hand = new THREE.Group();
    hand.position.set(0.32, 0.87 + dy, 0);
    g.add(hand);
    weapon = hand;
    box(hand, '#d4a16f', [0.13, 0.28, 0.15], [0, -0.1, 0]);
    if (d.range > 1) {
      if (u.type === 'crossbow') {
        box(hand, '#b39968', [0.65, 0.07, 0.12], [0.1, -0.05, 0.2]);
        box(hand, '#e4dec7', [0.045, 0.045, 0.55], [0.1, 0, 0.25]);
      } else {
        const bow = mesh(
          new THREE.TorusGeometry(0.29, 0.04, 4, 9, Math.PI),
          '#8f623f',
          hand,
          0.08,
          0,
          0.2
        );
        bow.rotation.z = -Math.PI / 2;
        box(hand, '#ddd5ba', [0.025, 0.55, 0.025], [0.08, 0, 0.2]);
      }
    } else if (u.type === 'engineer') {
      box(hand, '#94764d', [0.06, 0.6, 0.06], [0, 0.1, 0.06]);
      box(hand, '#bdc6bc', [0.35, 0.15, 0.15], [0, 0.4, 0.06]);
      box(g, '#a7804f', [0.4, 0.4, 0.25], [0, 0.7, -0.3]);
    } else {
      const spear = ['spear', 'pikeman', 'knight', 'heavy_knight'].includes(u.type),
        length = u.type === 'pikeman' ? 2.1 : spear ? 1.65 : 0.65;
      box(
        hand,
        spear || u.type === 'clubman' ? '#977447' : '#dfe4d7',
        [0.06, length, 0.07],
        [0.05, length * 0.3, 0.12]
      );
      if (spear)
        mesh(new THREE.ConeGeometry(0.09, 0.27, 4), '#e1e1cf', hand, 0.05, length * 0.85, 0.12);
      if (u.type === 'clubman')
        mesh(new THREE.DodecahedronGeometry(0.24, 0), '#795630', hand, 0.05, 0.47, 0.12);
      if (!spear && u.type !== 'clubman')
        box(hand, '#c2a464', [0.3, 0.06, 0.07], [0.05, -0.03, 0.12]);
      const shield = box(
        g,
        u.type === 'paladin' ? '#eee6c9' : color,
        [u.type === 'shield' ? 0.62 : 0.34, u.type === 'shield' ? 1.05 : 0.45, 0.1],
        [-0.37, 0.78 + dy, 0.17]
      );
      shield.rotation.z = -0.05;
      box(g, '#e8dec0', [0.065, 0.35, 0.025], [-0.37, 0.78 + dy, 0.23]);
    }
    if (u.type === 'scout') {
      mesh(new THREE.ConeGeometry(0.29, 0.4, 5), P.forest, g, 0, 1.43, 0);
      box(g, P.leather, [0.36, 0.36, 0.23], [0, 0.75, -0.3]);
    }
    if (u.type === 'swordsman') {
      box(g, color, [0.09, 0.34, 0.36], [0, 1.47, 0]);
      for (const x of [-0.27, 0.27]) box(g, P.iron, [0.23, 0.18, 0.34], [x, 0.94, 0]);
    }
    if (u.type === 'crossbow') box(g, P.wood, [0.55, 0.75, 0.09], [0, 0.83, -0.3]);
    if (u.type === 'ranger') {
      mesh(new THREE.ConeGeometry(0.3, 0.33, 5), P.forest, g, 0, 1.4, 0);
      box(g, '#719367', [0.62, 0.58, 0.07], [0, 0.77, -0.27]);
    }
    if (u.type === 'archer') box(g, P.wood, [0.17, 0.58, 0.15], [-0.21, 0.9, -0.27]);
    if (u.type === 'heavy_infantry') {
      for (const x of [-0.28, 0.28]) box(g, P.steel, [0.27, 0.22, 0.4], [x, 0.96, 0]);
      box(g, P.iron, [0.36, 0.27, 0.21], [0, 1.16, 0.17]);
    }
    if (u.type === 'engineer')
      for (const x of [-0.15, 0.15]) box(g, P.wood, [0.1, 0.75, 0.1], [x, 0.9, -0.35]);
    if (u.type === 'paladin') {
      box(g, '#f0e7c7', [0.5, 0.6, 0.07], [0, 0.85 + dy, -0.2]);
      box(g, '#dfb74f', [0.07, 0.32, 0.025], [0, 0.85 + dy, -0.25]);
      box(g, '#dfb74f', [0.25, 0.06, 0.025], [0, 0.9 + dy, -0.25]);
    }
  }
  const base = mesh(
    new THREE.CylinderGeometry(
      d.class === 'ship' ? 0.7 : 0.57,
      d.class === 'ship' ? 0.7 : 0.57,
      0.05,
      16
    ),
    color,
    g,
    0,
    0.02,
    0
  );
  const mat = new THREE.MeshBasicMaterial({ color });
  mat.userData.transient = true;
  base.material = mat;
  g.userData.legs = legs;
  g.userData.wheels = wheels;
  g.userData.weapon = weapon;
  return g;
}
