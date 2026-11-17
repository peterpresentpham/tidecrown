/**
 * Every static model of the world (terrain dressing, villages, towns, city buildings, tile
 * improvements, siege engines, ships) built in code from voxels and greedy-meshed into
 * vertex-coloured geometry. Models stand on y = 0, centred on the origin, facing +z; a tile is
 * 1.9 wide (≈ 25 voxels). TEAM cells take the owner's colour.
 */
import * as THREE from 'three';

import { Grid, meshGrid, random, TEAM, VOXEL } from './voxelGrid';

const C = {
  grass: '#7fae55',
  grassDark: '#6a9a48',
  moss: '#7d9a5a',
  dirt: '#8f6a45',
  leaf: ['#6aa84f', '#5b9845', '#7cb85a'],
  pine: ['#3f7a4a', '#356b40', '#4a8752'],
  trunk: '#7a5236',
  rock: ['#a3a7a3', '#8f9493', '#b4b6b0'],
  snow: '#f1f3ef',
  plaster: '#efe2c4',
  plasterShade: '#e2d2ae',
  wood: '#a97c50',
  woodDark: '#7a5536',
  plank: '#c09a68',
  roof: '#c4644a',
  roofDark: '#a8513c',
  thatch: '#d9b45f',
  thatchDark: '#c39c48',
  stone: '#bdb6a6',
  stoneDark: '#9b9485',
  slate: '#5f6b78',
  soil: '#8a6440',
  wheat: '#e3c35a',
  sprout: '#8fbf55',
  window: '#3c4a57',
  glow: '#f2a541',
  iron: '#5b6166',
  hay: '#e5c76b',
  berry: '#d8434b',
  sail: '#f2ead6',
  water: '#6cb4c8',
  red: '#c9473c',
  string: '#efe3c4',
  leather: '#7a5235',
};

type Model = { grid: Grid; anchor?: [number, number, number] };

/** Centred box: x and z are the centre column, y the bottom. */
function cbox(
  g: Grid,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string
) {
  return g.box(x - Math.floor(w / 2), y, z - Math.floor(d / 2), w, h, d, color);
}

/** Gable roof over a w×d footprint starting at (x0, y0, z0), ridge along x; walls fill the gables. */
function gable(
  g: Grid,
  x0: number,
  y0: number,
  z0: number,
  w: number,
  d: number,
  roof: string,
  wall: string,
  ridge = roof
) {
  for (let k = 0; ; k++) {
    const lo = z0 - 1 + k,
      hi = z0 + d - k;
    if (lo > hi) break;
    for (let x = x0 - 1; x <= x0 + w; x++) {
      g.set(x, y0 + k, lo, roof).set(x, y0 + k, hi, roof);
      if (hi - lo <= 1) g.set(x, y0 + k, lo, ridge).set(x, y0 + k, hi, ridge);
    }
    for (let z = lo + 1; z < hi; z++) {
      g.set(x0, y0 + k, z, wall).set(x0 + w - 1, y0 + k, z, wall);
    }
  }
  return g;
}

/** Stepped pyramid roof (square towers and halls). */
function pyramid(g: Grid, x: number, y: number, z: number, w: number, color: string) {
  for (let k = 0; w - 2 * k > 0; k++) cbox(g, x, y + k, z, w - 2 * k, 1, w - 2 * k, color);
  return g;
}

/** A small house: plaster walls, timber corners, door and windows, gable roof. */
function house(g: Grid, x: number, z: number, w: number, d: number, h: number, roof: string) {
  const x0 = x - Math.floor(w / 2),
    z0 = z - Math.floor(d / 2);
  g.box(x0, 0, z0, w, h, d, C.plaster);
  for (const [cx, cz] of [
    [x0, z0],
    [x0 + w - 1, z0],
    [x0, z0 + d - 1],
    [x0 + w - 1, z0 + d - 1],
  ])
    g.box(cx, 0, cz, 1, h, 1, C.woodDark);
  g.box(x0, h - 1, z0, w, 1, d, C.plasterShade);
  g.box(x, 0, z0 + d - 1, 2, 3, 1, C.woodDark);
  if (w >= 6)
    g.box(x0 + 1, 2, z0 + d - 1, 1, 2, 1, C.window).box(
      x0 + w - 2,
      2,
      z0 + d - 1,
      1,
      2,
      1,
      C.window
    );
  gable(g, x0, h, z0, w, d, roof, C.plaster, C.roofDark);
  return g;
}

// ——— Nature ———

function pine(g: Grid, x: number, z: number, height: number, seed: () => number) {
  g.box(x, 0, z, 1, 2, 1, C.trunk);
  const tiers = Math.max(2, Math.round(height / 3.5));
  let y = 2;
  for (let t = 0; t < tiers; t++) {
    const w = 2 * (tiers - t) + 1;
    const color = C.pine[Math.floor(seed() * C.pine.length)];
    cbox(g, x, y, z, w, 2, w, color);
    cbox(g, x, y + 2, z, w - 2, 1, w - 2, color);
    y += 3;
  }
  g.box(x, y, z, 1, 1, 1, C.pine[0]);
}

function roundTree(g: Grid, x: number, z: number, height: number, seed: () => number) {
  const trunk = Math.max(2, Math.round(height * 0.35));
  g.box(x, 0, z, 1, trunk, 1, C.trunk);
  const r = Math.max(2, height * 0.32);
  const base = C.leaf[Math.floor(seed() * C.leaf.length)];
  g.blob(x + 0.5, trunk + r * 0.9, z + 0.5, r, r * 0.95, r, (vx, vy, vz) => {
    const n = Math.sin(vx * 3.1 + vy * 1.7 + vz * 2.3) * 0.5 + 0.5;
    return vy > trunk + r * 1.2 ? C.leaf[2] : n > 0.7 ? C.leaf[1] : base;
  });
}

function bush(berries: boolean) {
  const g = new Grid().blob(0, 2, 0, 3, 2.6, 3, (x, y, z) =>
    (x + y + z) % 3 === 0 ? C.leaf[1] : C.leaf[0]
  );
  if (berries)
    for (const [x, y, z] of [
      [2, 3, 1],
      [-2, 2, 2],
      [0, 4, -2],
      [1, 2, -3],
      [-3, 3, -1],
    ])
      g.set(x, y, z, C.berry);
  return g;
}

function forest(seed: string, count: number) {
  const g = new Grid(),
    rnd = random(seed);
  const spots: [number, number][] = [];
  for (let i = 0; spots.length < count && i < 200; i++) {
    const x = Math.round((rnd() - 0.5) * 20),
      z = Math.round((rnd() - 0.5) * 20);
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 5.5)) continue;
    spots.push([x, z]);
  }
  // Back trees first, so nearer trees overwrite overlapping leaves.
  spots.sort((a, b) => a[1] - b[1]);
  for (const [x, z] of spots) {
    const h = 7 + Math.round(rnd() * 5);
    if (rnd() < 0.55) pine(g, x, z, h, rnd);
    else roundTree(g, x, z, h, rnd);
  }
  return g;
}

function rock(seed: string, rx: number, ry: number, rz: number) {
  const rnd = random(seed);
  const g = new Grid().blob(
    0,
    ry * 0.8,
    0,
    rx,
    ry,
    rz,
    () => C.rock[Math.floor(rnd() * C.rock.length)]
  );
  for (const key of [...g.cells.keys()]) {
    const [x, y, z] = key.split(',').map(Number);
    if (y < 0) g.cells.delete(key);
    else if (y >= Math.floor(ry * 1.6) - 1 && rnd() < 0.4) g.set(x, y, z, C.moss);
  }
  return g;
}

/** Height-field massif: rock above the moss line, snow above `snow` (fraction of the peak). */
function mountain(seed: string, peaks: [number, number, number, number][], snow: number) {
  const g = new Grid(),
    rnd = random(seed);
  const top = Math.max(...peaks.map((p) => p[2]));
  for (let x = -12; x <= 12; x++)
    for (let z = -11; z <= 11; z++) {
      let h = 0;
      for (const [px, pz, ph, pr] of peaks) {
        const d = Math.hypot(x - px, z - pz) / pr;
        if (d < 1) h = Math.max(h, ph * (1 - d) ** 1.15);
      }
      h = Math.floor(h + rnd() * 1.4);
      for (let y = 0; y < h; y++) {
        const color =
          y >= top * snow && y >= h - 2
            ? C.snow
            : y < 2
              ? C.moss
              : // Strata: bands by height, broken now and then for texture.
                C.rock[(Math.floor(y / 3) + (rnd() < 0.12 ? 1 : 0)) % C.rock.length];
        g.set(x, y, z, color);
      }
    }
  return g;
}

function hill(seed: string, height: number, radius: number) {
  const g = new Grid(),
    rnd = random(seed);
  for (let x = -radius; x <= radius; x++)
    for (let z = -radius; z <= radius; z++) {
      const d = Math.hypot(x, z * 1.2) / radius;
      if (d >= 1) continue;
      const h = Math.max(1, Math.floor(height * (1 - d * d) + rnd() * 0.8));
      for (let y = 0; y < h; y++) g.set(x, y, z, y === h - 1 ? C.grass : C.dirt);
      if (y0Flower(rnd)) g.set(x, h, z, rnd() < 0.5 ? C.wheat : C.sail);
    }
  return g;
}
const y0Flower = (rnd: () => number) => rnd() < 0.025;

// ——— Village and improvements ———

function fence(length = 12) {
  const g = new Grid();
  const x0 = -Math.floor(length / 2);
  for (let x = x0; x < x0 + length; x += 3) g.box(x, 0, 0, 1, 5, 1, C.woodDark);
  g.box(x0, 2, 0, length, 1, 1, C.wood).box(x0, 4, 0, length, 1, 1, C.wood);
  return g;
}

function well() {
  const g = new Grid();
  cbox(g, 0, 0, 0, 4, 3, 4, C.stone).box(-1, 2, -1, 2, 1, 2, C.water);
  g.box(-2, 3, 0, 1, 4, 1, C.woodDark).box(1, 3, 0, 1, 4, 1, C.woodDark);
  gable(g, -2, 7, -2, 4, 4, C.roof, C.woodDark, C.roofDark);
  return g;
}

function farm() {
  const g = new Grid();
  cbox(g, 0, 0, 0, 21, 1, 14, C.soil);
  for (let z = -6; z <= 6; z += 2)
    for (let x = -10; x <= 10; x++) g.set(x, 1, z, (x + z) % 7 === 0 ? C.sprout : C.wheat);
  for (let x = -10; x <= 10; x += 4) g.set(x, 2, -6, C.wheat).set(x + 2, 2, 2, C.wheat);
  // Scarecrow.
  g.box(7, 1, 0, 1, 4, 1, C.woodDark).box(6, 3, 0, 3, 1, 1, C.red).box(7, 5, 0, 1, 1, 1, C.thatch);
  return g;
}

function mine() {
  const g = new Grid();
  for (let x = -6; x <= 6; x++)
    for (let z = -6; z <= 4; z++) {
      const h = Math.floor(10 * (1 - Math.hypot(x / 6.5, (z + 1) / 6.5)));
      for (let y = 0; y < h; y++) g.set(x, y, z, C.rock[(x + y * 2 + z) & 1]);
    }
  // Timbered entrance on the front face.
  g.carve(-1, 0, 0, 3, 4, 6);
  g.box(-2, 0, 4, 1, 5, 1, C.woodDark)
    .box(2, 0, 4, 1, 5, 1, C.woodDark)
    .box(-2, 4, 4, 5, 1, 1, C.wood);
  g.box(-1, 0, 0, 3, 4, 1, '#2a2522');
  g.box(-1, 0, 5, 1, 1, 3, C.iron).box(1, 0, 5, 1, 1, 3, C.iron);
  cbox(g, 4, 0, 6, 3, 2, 2, C.woodDark).box(3, 2, 5, 3, 1, 2, C.rock[1]);
  return g;
}

function stonePile() {
  const g = new Grid();
  cbox(g, 0, 0, 0, 6, 2, 5, C.stone);
  cbox(g, -1, 2, 0, 4, 2, 3, C.stoneDark).box(1, 2, -1, 2, 1, 2, C.stone);
  return g;
}

function logs() {
  const g = new Grid();
  for (const [y, z] of [
    [0, -2],
    [0, 0],
    [0, 2],
    [1, -1],
    [1, 1],
  ]) {
    g.box(-4, y, z, 9, 1, 1, C.wood).set(-5, y, z, C.plank).set(5, y, z, C.plank);
  }
  return g;
}

function crates() {
  const g = new Grid();
  const crate = (x: number, y: number, z: number) => {
    g.box(x, y, z, 3, 3, 3, C.plank);
    g.box(x, y + 1, z, 3, 1, 3, C.woodDark);
  };
  crate(-2, 0, -2);
  crate(1, 0, -1);
  crate(-1, 3, -1);
  return g;
}

// ——— Town halls and buildings ———

function banner(g: Grid, x: number, y: number, z: number, height = 5) {
  g.box(x, y, z, 1, height, 1, C.woodDark);
  g.box(x + 1, y + height - 3, z, 3, 2, 1, TEAM);
}

function town(level: 1 | 2 | 3) {
  const g = new Grid();
  if (level === 1) {
    // Timber longhall with a lookout.
    g.box(-6, 0, -4, 12, 6, 8, C.wood).box(-6, 0, -4, 12, 1, 8, C.stoneDark);
    g.box(-1, 0, 3, 2, 4, 1, C.woodDark)
      .box(-4, 3, 3, 1, 2, 1, C.window)
      .box(3, 3, 3, 1, 2, 1, C.window);
    gable(g, -6, 6, -4, 12, 8, C.thatch, C.wood, C.thatchDark);
    g.box(-7, 6, 4, 14, 1, 1, TEAM);
    g.box(3, 0, -3, 3, 13, 3, C.woodDark).box(2, 13, -4, 5, 1, 5, C.plank);
    pyramid(g, 4, 14, -2, 5, C.thatch);
    banner(g, 4, 16, -2, 3);
  } else if (level === 2) {
    // Stone keep and a hall.
    g.box(-7, 0, -6, 9, 10, 9, C.stone).box(-7, 0, -6, 9, 2, 9, C.stoneDark);
    for (let x = -7; x < 2; x += 2) g.set(x, 10, -6, C.stone).set(x, 10, 2, C.stone);
    for (let z = -6; z < 3; z += 2) g.set(-7, 10, z, C.stone).set(1, 10, z, C.stone);
    g.box(-4, 0, 2, 3, 4, 1, C.woodDark)
      .box(-6, 6, 2, 1, 2, 1, C.window)
      .box(0, 6, 2, 1, 2, 1, C.window);
    g.box(-7, 8, 2, 9, 1, 1, TEAM);
    house(g, 4, 3, 6, 7, 5, C.roof);
    banner(g, -3, 10, -2, 5);
  } else {
    // Castle: tall keep, four turrets with faction roofs, a curtain front.
    g.box(-5, 0, -5, 10, 13, 10, C.stone).box(-5, 0, -5, 10, 2, 10, C.stoneDark);
    g.box(-5, 10, 4, 10, 1, 1, TEAM);
    g.box(-1, 0, 4, 2, 5, 1, C.woodDark);
    for (const x of [-3, 2]) g.box(x, 7, 4, 1, 2, 1, C.window);
    pyramid(g, 0, 13, 0, 10, C.slate);
    for (const [x, z] of [
      [-7, -7],
      [6, -7],
      [-7, 6],
      [6, 6],
    ]) {
      cbox(g, x, 0, z, 4, 10, 4, C.stone);
      pyramid(g, x, 10, z, 6, TEAM);
    }
    g.box(-6, 0, 6, 12, 5, 1, C.stone);
    for (let x = -6; x < 6; x += 2) g.set(x, 5, 6, C.stone);
    g.carve(-1, 0, 6, 2, 4, 1);
    banner(g, 0, 18, 0, 5);
  }
  return g;
}

function archery() {
  // Workshop shed with a straw target and a faction pennant.
  const g = new Grid();
  house(g, -2, -1, 7, 6, 5, C.roofDark);
  g.box(-6, 3, 2, 1, 1, 1, TEAM);
  g.box(4, 0, 2, 1, 4, 1, C.woodDark);
  cbox(g, 4, 4, 3, 5, 5, 1, C.hay).box(3, 5, 3, 3, 3, 1, TEAM).set(4, 6, 3, C.sail);
  return g;
}

function market() {
  const g = new Grid();
  for (const [x, z] of [
    [-4, -3],
    [3, -3],
    [-4, 3],
    [3, 3],
  ])
    g.box(x, 0, z, 1, 4, 1, C.woodDark);
  g.box(-4, 1, -3, 8, 1, 7, C.plank);
  // Striped faction awning.
  for (let x = -5; x <= 4; x++) g.box(x, 4, -4, 1, 1, 9, x % 2 ? TEAM : C.sail);
  g.box(-3, 2, -2, 2, 1, 2, C.wheat).box(0, 2, -2, 2, 1, 2, C.berry).box(1, 2, 1, 2, 2, 2, C.plank);
  return g;
}

function storage() {
  const g = new Grid();
  g.box(-4, 0, -4, 8, 5, 8, C.roofDark).box(-4, 0, -4, 8, 1, 8, C.stoneDark);
  g.box(-1, 0, 3, 3, 4, 1, C.plank).box(-1, 1, 3, 3, 1, 1, C.woodDark);
  gable(g, -4, 5, -4, 8, 8, C.slate, C.roofDark);
  g.box(-4, 4, 4, 8, 1, 1, TEAM);
  cbox(g, 5, 0, 1, 3, 2, 3, C.hay);
  return g;
}

function tower() {
  const g = new Grid();
  cbox(g, 0, 0, 0, 5, 9, 4, C.stone);
  cbox(g, 0, 0, 0, 5, 2, 4, C.stoneDark);
  cbox(g, 0, 9, 0, 6, 1, 5, C.plank);
  for (const [x, z] of [
    [-3, -2],
    [2, -2],
    [-3, 2],
    [2, 2],
  ])
    g.box(x, 10, z, 1, 1, 1, C.stone);
  g.box(0, 4, 2, 1, 2, 1, C.window);
  banner(g, 0, 10, 0, 4);
  return g;
}

function windmill() {
  const g = new Grid();
  cbox(g, 0, 0, 0, 5, 7, 4, C.plaster);
  pyramid(g, 0, 7, 0, 5, C.thatch);
  g.box(0, 0, 1, 1, 2, 1, C.woodDark);
  // Sails on the front, in a faction-tipped cross.
  for (let i = 1; i <= 5; i++)
    g.set(i, 8, 2, i > 2 ? C.sail : C.wood)
      .set(-i, 8, 2, i > 2 ? C.sail : C.wood)
      .set(0, 8 + i, 2, i > 2 ? C.sail : C.wood)
      .set(0, 8 - i, 2, i > 2 ? C.sail : C.wood);
  g.set(5, 8, 2, TEAM).set(-5, 8, 2, TEAM).set(0, 13, 2, TEAM).set(0, 3, 2, TEAM);
  g.set(0, 8, 2, C.woodDark);
  return g;
}

function palisade() {
  const g = new Grid();
  for (let x = -10; x <= 10; x++) {
    const h = 7 + (x & 1);
    g.box(x, 0, 0, 1, h, 1, x & 1 ? C.wood : C.plank).set(x, h, 0, C.woodDark);
  }
  g.box(-10, 4, -1, 21, 1, 1, C.woodDark);
  return g;
}

function stoneWall() {
  const g = new Grid().box(-10, 0, -1, 21, 5, 2, C.stone).box(-10, 0, -1, 21, 1, 2, C.stoneDark);
  for (let x = -10; x <= 10; x += 2) g.box(x, 5, -1, 1, 1, 2, C.stone);
  g.box(-1, 2, 1, 3, 2, 1, TEAM);
  return g;
}

function port() {
  // Pier pointing to the water (+z) with a crane and a faction flag.
  const g = new Grid();
  g.box(-7, 1, -3, 14, 1, 7, C.plank);
  for (let x = -7; x < 7; x += 2) g.box(x, 1, -3, 1, 1, 7, C.wood);
  for (const [x, z] of [
    [-7, -3],
    [6, -3],
    [-7, 3],
    [6, 3],
  ])
    g.box(x, 0, z, 1, 3, 1, C.woodDark);
  g.box(-5, 2, -2, 1, 9, 1, C.woodDark)
    .box(-5, 10, -2, 1, 1, 5, C.wood)
    .box(-5, 7, 2, 1, 3, 1, C.iron);
  cbox(g, 3, 2, -1, 3, 3, 3, C.plank).box(2, 3, -2, 3, 1, 3, C.woodDark);
  banner(g, 6, 2, 3, 6);
  return g;
}

function ruin() {
  const g = new Grid();
  const rnd = random('ruin');
  for (let i = 0; i < 18; i++) {
    const x = Math.round((rnd() - 0.5) * 6),
      z = Math.round((rnd() - 0.5) * 7);
    g.set(x, rnd() < 0.3 ? 1 : 0, z, rnd() < 0.5 ? C.stone : C.stoneDark);
  }
  g.box(-2, 0, -3, 1, 2, 1, C.woodDark);
  return g;
}

function blacksmith() {
  const g = new Grid();
  house(g, -1, -1, 8, 6, 5, C.slate);
  g.box(2, 0, -3, 2, 11, 2, C.stoneDark).set(2, 11, -3, C.iron);
  // Open forge with glowing coals and an anvil out front.
  g.box(-4, 0, 3, 3, 2, 2, C.stoneDark).box(-3, 2, 3, 1, 1, 1, C.glow);
  g.box(1, 0, 3, 1, 1, 1, C.woodDark).box(0, 1, 3, 3, 1, 1, C.iron);
  g.box(-5, 3, 2, 1, 1, 1, TEAM);
  return g;
}

function sawmill() {
  const g = new Grid();
  for (const [x, z] of [
    [-4, -3],
    [3, -3],
    [-4, 2],
    [3, 2],
  ])
    g.box(x, 0, z, 1, 5, 1, C.woodDark);
  gable(g, -4, 5, -3, 8, 6, C.thatch, C.woodDark, C.thatchDark);
  g.box(-4, 1, -1, 8, 1, 2, C.wood).box(0, 2, -2, 1, 3, 1, C.iron);
  logs().cells.forEach((color, key) => {
    const [x, y, z] = key.split(',').map(Number);
    g.set(x, y, z + 6, color);
  });
  g.box(-5, 3, 3, 1, 1, 1, TEAM);
  return g;
}

function stable() {
  const g = new Grid();
  g.box(-5, 0, -4, 10, 5, 6, C.wood).box(-5, 0, -4, 10, 1, 6, C.stoneDark);
  for (let x = -4; x < 5; x += 3) g.box(x, 0, 1, 2, 3, 1, C.woodDark);
  gable(g, -5, 5, -4, 10, 6, C.roofDark, C.wood, C.roof);
  g.box(-5, 4, 2, 10, 1, 1, TEAM);
  cbox(g, 4, 0, 4, 3, 2, 2, C.hay);
  for (let x = -5; x <= 2; x += 3) g.box(x, 0, 4, 1, 3, 1, C.woodDark);
  g.box(-5, 2, 4, 8, 1, 1, C.wood);
  return g;
}

function homes(kind: 'A' | 'B') {
  const g = new Grid();
  if (kind === 'A') house(g, 0, 0, 9, 7, 5, C.roof);
  else {
    house(g, 0, 0, 7, 8, 4, C.thatch);
    g.box(2, 0, -5, 2, 9, 2, C.stoneDark);
  }
  return g;
}

// ——— Siege engines and ships ———

function wheels(g: Grid, xs: number[], zs: number[]) {
  for (const x of xs)
    for (const z of zs) {
      cbox(g, x, 0, z, 1, 3, 3, C.woodDark);
      g.set(x, 1, z, C.iron);
    }
}

function catapult(): Model {
  const g = new Grid();
  g.box(-3, 1, -6, 1, 2, 12, C.wood).box(2, 1, -6, 1, 2, 12, C.wood);
  g.box(-3, 2, -5, 6, 1, 2, C.wood).box(-3, 2, 4, 6, 1, 2, C.wood);
  wheels(g, [-4, 3], [-4, 4]);
  // Uprights and crossbar the arm pivots under, a faction cloth over the frame.
  g.box(-3, 3, -1, 1, 3, 1, C.woodDark)
    .box(2, 3, -1, 1, 3, 1, C.woodDark)
    .box(-3, 6, -1, 6, 1, 1, C.wood);
  g.box(-2, 3, -6, 4, 1, 3, TEAM);
  return { grid: g, anchor: [0, 4, -1] };
}

function catapultArm() {
  return new Grid()
    .box(0, 0, -2, 1, 1, 10, C.plank)
    .box(-1, 0, 7, 3, 2, 3, C.woodDark)
    .set(0, 1, 8, C.rock[1]);
}

function trebuchet(): Model {
  const g = new Grid();
  g.box(-4, 0, -8, 1, 1, 16, C.wood).box(3, 0, -8, 1, 1, 16, C.wood);
  g.box(-4, 0, -8, 8, 1, 1, C.wood).box(-4, 0, 7, 8, 1, 1, C.wood);
  // A-frames up to the axle.
  for (const x of [-4, 3])
    for (let y = 1; y <= 14; y++) {
      const spread = Math.round((14 - y) / 2.5);
      g.set(x, y, -spread, C.woodDark).set(x, y, spread, C.woodDark);
    }
  g.box(-4, 14, 0, 8, 1, 1, C.wood);
  cbox(g, 0, 1, -6, 4, 1, 3, TEAM);
  wheels(g, [-5, 4], [-6, 6]);
  return { grid: g, anchor: [0, 14.5, 0.5] };
}

function trebuchetArm() {
  const g = new Grid().box(0, 0, -6, 1, 1, 19, C.plank);
  // Counterweight hanging at the short end, sling at the long end.
  cbox(g, 0, -4, -5, 4, 4, 3, C.stoneDark).box(0, -1, -5, 1, 1, 1, C.iron);
  g.box(0, -3, 12, 1, 3, 1, C.string).box(-1, -4, 11, 3, 1, 3, C.leather);
  return g;
}

function ballista(): Model {
  const g = new Grid();
  cbox(g, 0, 0, 0, 7, 1, 11, C.wood);
  wheels(g, [-4, 4], [-4, 4]);
  cbox(g, 0, 1, 0, 3, 4, 3, C.woodDark);
  // Stock, bow arms and the bolt pointing forward (+z).
  g.box(0, 5, -5, 1, 1, 11, C.wood);
  for (let i = 1; i <= 6; i++)
    g.set(i, 5, 5 - Math.floor(i / 2), C.woodDark).set(-i, 5, 5 - Math.floor(i / 2), C.woodDark);
  g.box(0, 6, -4, 1, 1, 11, C.plank).set(0, 6, 7, C.iron);
  g.box(-1, 2, -5, 3, 2, 1, TEAM);
  return { grid: g };
}

/** Hull along z (bow at +z): rounded ends, faction strake, plank deck. */
function hull(g: Grid, length: number, width: number, height: number) {
  const half = length / 2;
  for (let z = -Math.floor(half); z <= Math.floor(half); z++) {
    const t = Math.abs(z) / half;
    for (let y = 0; y < height; y++) {
      const w = Math.max(
        1,
        Math.round((width / 2) * Math.sqrt(Math.max(0, 1 - t ** 2.2)) - (height - 1 - y) * 0.6)
      );
      for (let x = -w; x < w; x++) {
        const edge = x === -w || x === w - 1 || t > 0.9;
        g.set(
          x,
          y,
          z,
          y === height - 1 ? (edge ? C.woodDark : C.plank) : y === height - 2 ? TEAM : C.wood
        );
      }
    }
  }
  return g;
}

function boatSail() {
  const g = hull(new Grid(), 18, 7, 3);
  g.box(0, 3, 0, 1, 14, 1, C.woodDark);
  for (let y = 6; y < 15; y++) {
    const w = Math.round(1 + (15 - y) * 0.6);
    g.box(-w, y, 1, w * 2, 1, 1, y % 3 === 0 ? TEAM : C.sail);
  }
  return g;
}

function vikingBoat() {
  const g = hull(new Grid(), 22, 8, 3);
  // Curled prow and stern posts.
  g.box(0, 3, 10, 1, 4, 1, C.woodDark).set(0, 7, 9, C.woodDark).box(0, 3, -11, 1, 3, 1, C.woodDark);
  for (let z = -6; z <= 6; z += 3) g.box(-4, 2, z, 1, 2, 2, TEAM).box(3, 2, z, 1, 2, 2, TEAM);
  g.box(0, 3, 0, 1, 12, 1, C.woodDark);
  for (let y = 6; y < 13; y++)
    for (let x = -5; x < 5; x++) g.set(x, y, 1, (x + 10) % 4 < 2 ? TEAM : C.sail);
  return g;
}

function sailShip() {
  const g = hull(new Grid(), 24, 7, 4);
  // Stern castle and two masts with square sails.
  g.box(-3, 4, -11, 6, 3, 5, C.wood).box(-3, 7, -11, 6, 1, 5, C.woodDark);
  g.box(-1, 5, -6, 1, 1, 1, C.window).box(1, 5, -6, 1, 1, 1, C.window);
  for (const [z, top] of [
    [-2, 15],
    [5, 13],
  ]) {
    g.box(0, 4, z, 1, top, 1, C.woodDark);
    for (let y = 7; y < 4 + top - 1; y++)
      g.box(-4, y, z + 1, 8, 1, 1, y === 9 || y === 13 ? TEAM : C.sail);
  }
  g.box(0, 3, 11, 1, 1, 4, C.woodDark);
  return g;
}

const MODELS: Record<string, () => Model | Grid> = {
  forest_A: () => forest('forest_A', 6),
  forest_B: () => forest('forest_B', 5),
  forest_cut: () => {
    const g = forest('forest_cut', 2);
    for (const [x, z] of [
      [-4, 3],
      [3, 5],
      [5, -2],
    ])
      g.box(x, 0, z, 2, 1, 2, C.plank).set(x, 1, z, C.trunk);
    return g;
  },
  tree_pine: () => {
    const g = new Grid();
    pine(g, 0, 0, 15, random('pine'));
    return g;
  },
  tree_common: () => {
    const g = new Grid();
    roundTree(g, 0, 0, 14, random('tree'));
    return g;
  },
  bush: () => bush(false),
  bush_berries: () => bush(true),
  mountain_A: () =>
    mountain(
      'mountain_A',
      [
        [-2, -1, 15, 12],
        [5, 3, 10, 8],
      ],
      0.85
    ),
  mountain_B: () =>
    mountain(
      'mountain_B',
      [
        [1, 0, 18, 12],
        [-6, 4, 9, 7],
      ],
      0.75
    ),
  mountain_C: () =>
    mountain(
      'mountain_C',
      [
        [0, -1, 30, 13],
        [-6, 5, 13, 7],
        [7, 3, 11, 7],
      ],
      0.6
    ),
  hill_A: () => hill('hill_A', 6, 10).add(rock('hill_A_rock', 2, 1.6, 2), 3, 4, -3),
  hill_B: () => hill('hill_B', 2, 9),
  rock_A: () => rock('rock_A', 3, 3.5, 3),
  rock_B: () => rock('rock_B', 2.5, 2.2, 2.5),
  rock_C: () => rock('rock_C', 2, 4.5, 2),
  farm,
  mine,
  stone: stonePile,
  logs,
  crates,
  fence: () => fence(12),
  well,
  home_A: () => homes('A'),
  home_B: () => homes('B'),
  town_1: () => town(1),
  town_2: () => town(2),
  town_3: () => town(3),
  archery,
  market,
  storage,
  tower,
  windmill,
  wall: palisade,
  wall_stone: stoneWall,
  port,
  ruin,
  blacksmith,
  sawmill,
  stable,
  ballista,
  catapult,
  'catapult.arm': catapultArm,
  trebuchet,
  'trebuchet.arm': trebuchetArm,
  boat_sail: boatSail,
  viking_boat: vikingBoat,
  sail_ship: sailShip,
};

/**
 * The scenery library: same interface the world used for the baked models. Geometry is meshed
 * once per model and faction colour; callers get (and own) a clone.
 */
export class VoxelScenery {
  private models = new Map<string, Model>();
  private templates = new Map<string, THREE.BufferGeometry>();

  names() {
    return Object.keys(MODELS);
  }

  has(name: string) {
    return name in MODELS;
  }

  private model(name: string) {
    let model = this.models.get(name);
    if (!model) {
      const made = MODELS[name]?.();
      if (!made) throw new Error(`Missing model ${name}`);
      model = made instanceof Grid ? { grid: made } : made;
      this.models.set(name, model);
    }
    return model;
  }

  /** Pivot of a moving part (`catapult.arm`) in the parent model's space. */
  anchor(name: string) {
    const parent = name.replace(/\.[^.]+$/, '');
    const a = this.has(parent) ? this.model(parent).anchor : undefined;
    return a ? new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(VOXEL) : new THREE.Vector3();
  }

  /** A fresh geometry (callers own and dispose it); `team` colours the faction cells. */
  geometry(name: string, team = '#c8b48a'): THREE.BufferGeometry {
    const key = `${name}|${team}`;
    let template = this.templates.get(key);
    if (!template) {
      template = meshGrid(this.model(name).grid, team, { greedy: true });
      template.computeBoundingSphere();
      this.templates.set(key, template);
    }
    return template.clone();
  }
}

let scenery: VoxelScenery | null = null;
/** The one scenery library, built on first use. */
export const voxelScenery = () => (scenery ??= new VoxelScenery());
