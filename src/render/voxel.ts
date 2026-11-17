/**
 * Soldiers and horses built in code from voxels: a big-headed figure of rigid parts (head, body,
 * arms, legs, cape, gear) on pivots, animated by generated keyframe clips. No asset files.
 *
 * Axes: x = the figure's left (+) / right (−), y up, z forward. Parts are voxel grids meshed into
 * vertex-coloured geometry (hidden faces skipped), cached per look, part and faction colour.
 */
import * as THREE from 'three';

import type { UnitType } from '../game/engine';
import { Character, type CharacterSource, type Pose } from './characters';
import { Grid, meshGrid, shade, TEAM, TEAM_DARK, TEAM_LIGHT, upscale, VOXEL } from './voxelGrid';

const SKIN = ['#f2c29b', '#e0a87e', '#c98d64', '#9b6a48'];
const PALETTE = {
  hair: ['#3b2a20', '#6b4529', '#a8743d', '#d9b36c'],
  steel: '#b9c2c6',
  steelDark: '#7c878c',
  leather: '#7a5235',
  wood: '#8f6a43',
  woodDark: '#5c432b',
  pants: '#4f4a43',
  boots: '#3a2c22',
  eye: '#2b2320',
  blush: '#f09a8e',
  gold: '#e3b34a',
  string: '#efe3c4',
  steelLight: '#e1e7e9',
  goldLight: '#f5d47a',
  eyeWhite: '#fbf7ef',
  mouth: '#9a4a40',
  red: '#c9473c',
};

// ——— Looks ———

type Headgear = 'hair' | 'helmet' | 'greathelm' | 'hood' | 'cap' | 'widehat' | 'kettle' | 'plumed';
type Weapon =
  | 'sword'
  | 'greatsword'
  | 'club'
  | 'axe'
  | 'hammer'
  | 'dagger'
  | 'spear'
  | 'pike'
  | 'lance'
  | 'golden';
type Attack = 'swing' | 'thrust' | 'shoot' | 'crossbow';
type Look = {
  head: Headgear;
  beard?: boolean;
  armour?: boolean;
  cape?: boolean;
  weapon?: Weapon;
  /** Off-hand: shield (faction face), bow, or a crossbow held in both hands. */
  offhand?: 'shield' | 'bow' | 'crossbow';
  attack: Attack;
  mount?: 'brown' | 'white';
  /** Faster gait (scouts). */
  quick?: boolean;
  /** Face scarf (rangers). */
  scarf?: boolean;
};

/** Every unit drawn as a soldier (siege engines and ships are scenery models). */
export const VOXEL_LOOKS: Partial<Record<UnitType, Look>> = {
  clubman: { head: 'hair', beard: true, weapon: 'club', attack: 'swing' },
  scout: { head: 'hood', weapon: 'dagger', attack: 'thrust', quick: true },
  shield: { head: 'helmet', weapon: 'sword', offhand: 'shield', attack: 'swing' },
  spear: { head: 'cap', weapon: 'spear', offhand: 'shield', attack: 'thrust' },
  pikeman: { head: 'kettle', weapon: 'pike', attack: 'thrust' },
  swordsman: { head: 'plumed', weapon: 'sword', cape: true, attack: 'swing' },
  heavy_infantry: {
    head: 'greathelm',
    armour: true,
    cape: true,
    weapon: 'greatsword',
    attack: 'swing',
  },
  archer: { head: 'hood', offhand: 'bow', attack: 'shoot' },
  ranger: { head: 'widehat', cape: true, offhand: 'bow', attack: 'shoot', scarf: true },
  crossbow: { head: 'kettle', offhand: 'crossbow', attack: 'crossbow' },
  engineer: { head: 'cap', beard: true, weapon: 'hammer', attack: 'swing' },
  light_cavalry: { head: 'hair', weapon: 'axe', attack: 'swing', mount: 'brown' },
  horse_archer: { head: 'hood', offhand: 'bow', attack: 'shoot', mount: 'brown' },
  knight: { head: 'helmet', weapon: 'lance', offhand: 'shield', attack: 'thrust', mount: 'brown' },
  heavy_knight: {
    head: 'greathelm',
    armour: true,
    weapon: 'lance',
    offhand: 'shield',
    attack: 'thrust',
    mount: 'white',
  },
  paladin: {
    head: 'plumed',
    armour: true,
    cape: true,
    weapon: 'golden',
    offhand: 'shield',
    attack: 'swing',
    mount: 'white',
  },
};

/** Stable per-type variety (skin and hair tone) without randomness between builds. */
function tone(type: string, list: string[]) {
  let h = 0;
  for (const c of type) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

function headGrid(look: Look, type: string) {
  const skin = tone(type, SKIN),
    hair = tone(type + 'h', PALETTE.hair);
  const g = new Grid().box(-4, 0, -4, 8, 8, 8, skin);
  // Face on the front layer (z = 3): eyes, blush.
  g.box(-3, 3, 3, 1, 2, 1, PALETTE.eye).box(2, 3, 3, 1, 2, 1, PALETTE.eye);
  g.set(-4, 2, 3, PALETTE.blush).set(3, 2, 3, PALETTE.blush);
  const shell = (color: string, low = 3) => {
    g.box(-5, 7, -5, 10, 2, 10, color);
    g.box(-5, low, -5, 1, 7 - low, 10, color).box(4, low, -5, 1, 7 - low, 10, color);
    g.box(-5, low, -5, 10, 7 - low, 1, color);
  };
  switch (look.head) {
    case 'hair':
      g.box(-4, 8, -4, 8, 1, 8, hair).box(-4, 3, -5, 8, 6, 1, hair);
      g.box(-5, 4, -4, 1, 5, 5, hair).box(4, 4, -4, 1, 5, 5, hair);
      g.box(-4, 7, 3, 8, 1, 1, hair);
      break;
    case 'helmet':
      shell(PALETTE.steel);
      g.box(-1, 3, 4, 1, 5, 1, PALETTE.steelDark);
      break;
    case 'plumed':
      shell(PALETTE.steel);
      g.box(-1, 9, -3, 2, 2, 6, TEAM).box(-1, 11, -2, 2, 1, 4, TEAM);
      break;
    case 'greathelm':
      shell(PALETTE.steel, 0);
      g.box(-5, 0, 4, 10, 9, 1, PALETTE.steel);
      g.box(-4, 4, 4, 8, 1, 1, PALETTE.eye);
      g.box(-1, 9, -2, 2, 2, 4, TEAM);
      break;
    case 'hood':
      shell(TEAM, 1);
      g.box(-4, 7, 4, 8, 1, 1, TEAM);
      g.box(-2, 9, -5, 4, 1, 3, TEAM).box(-1, 10, -6, 2, 1, 2, TEAM);
      break;
    case 'cap':
      g.box(-4, 8, -4, 8, 1, 8, hair).box(-4, 3, -5, 8, 5, 1, hair);
      g.box(-5, 7, -5, 10, 2, 10, PALETTE.leather).box(-5, 7, 5, 10, 1, 2, PALETTE.leather);
      break;
    case 'widehat':
      g.box(-4, 3, -5, 8, 5, 1, hair);
      g.box(-6, 7, -6, 12, 1, 12, PALETTE.leather).box(-4, 8, -4, 8, 2, 8, PALETTE.leather);
      g.box(-4, 8, -4, 8, 1, 8, TEAM);
      break;
    case 'kettle':
      g.box(-4, 3, -5, 8, 5, 1, hair);
      g.box(-6, 7, -6, 12, 1, 12, PALETTE.steel).box(-4, 8, -4, 8, 2, 8, PALETTE.steel);
      break;
  }
  if (look.beard && look.head !== 'greathelm')
    g.box(-3, 0, 4, 6, 3, 1, hair).box(-4, 1, 3, 1, 2, 1, hair).box(3, 1, 3, 1, 2, 1, hair);
  return g;
}

function torsoGrid(look: Look) {
  const g = new Grid();
  if (look.armour) {
    g.box(-3, 0, -2, 6, 6, 4, PALETTE.steel);
    // Faction tabard over the plate.
    g.box(-2, 0, 2, 4, 6, 1, TEAM).box(-2, 0, -3, 4, 5, 1, TEAM);
    g.box(-4, 4, -2, 1, 2, 4, PALETTE.steelDark).box(3, 4, -2, 1, 2, 4, PALETTE.steelDark);
  } else {
    g.box(-3, 0, -2, 6, 6, 4, TEAM);
    g.box(-3, 5, -2, 6, 1, 4, TEAM).box(-1, 5, 2, 2, 1, 1, tone('collar', SKIN));
  }
  g.box(-3, 1, -2, 6, 1, 4, PALETTE.leather).set(0, 1, 2, PALETTE.gold);
  return g;
}

function armGrid(look: Look, type: string) {
  const sleeve = look.armour ? PALETTE.steel : TEAM;
  return new Grid()
    .box(-1, -4, -1, 2, 4, 2, sleeve)
    .box(-1, -6, -1, 2, 2, 2, look.armour ? PALETTE.steelDark : tone(type, SKIN));
}

function legGrid(look: Look) {
  return new Grid()
    .box(-1, -5, -1, 3, 5, 3, look.armour ? PALETTE.steelDark : PALETTE.pants)
    .box(-1, -5, -1, 3, 2, 3, PALETTE.boots)
    .box(-1, -5, 2, 3, 1, 1, PALETTE.boots);
}

/** Held weapons run along +Y from the grip (voxel 0,0,0). */
function weaponGrid(weapon: Weapon) {
  const g = new Grid();
  const blade = (length: number, width: number, color = PALETTE.steel) => {
    g.box(0, -2, 0, 1, 3, 1, PALETTE.woodDark).box(
      -Math.floor(width / 2) - 1,
      1,
      0,
      width + 2,
      1,
      1,
      PALETTE.steelDark
    );
    g.box(-Math.floor((width - 1) / 2), 2, 0, width, length, 1, color);
    g.set(0, length + 2, 0, color);
  };
  switch (weapon) {
    case 'sword':
      blade(8, 1);
      break;
    case 'golden':
      blade(9, 1, PALETTE.gold);
      break;
    case 'greatsword':
      g.box(0, -4, 0, 1, 2, 1, PALETTE.woodDark);
      blade(13, 3);
      break;
    case 'dagger':
      g.box(0, -1, 0, 1, 2, 1, PALETTE.woodDark).box(-1, 1, 0, 3, 1, 1, PALETTE.steelDark);
      g.box(0, 2, 0, 1, 4, 1, PALETTE.steel);
      break;
    case 'club':
      g.box(0, -2, 0, 1, 7, 1, PALETTE.wood).box(-1, 5, -1, 3, 4, 3, PALETTE.woodDark);
      break;
    case 'axe':
      g.box(0, -2, 0, 1, 11, 1, PALETTE.wood).box(-3, 5, 0, 3, 4, 1, PALETTE.steel);
      break;
    case 'hammer':
      g.box(0, -2, 0, 1, 10, 1, PALETTE.wood).box(-2, 7, -1, 5, 2, 3, PALETTE.steelDark);
      break;
    case 'spear':
    case 'pike':
    case 'lance': {
      const length = weapon === 'pike' ? 34 : weapon === 'lance' ? 28 : 22;
      g.box(0, -8, 0, 1, length, 1, PALETTE.wood);
      g.box(0, length - 8, 0, 1, 4, 1, PALETTE.steel).box(
        -1,
        length - 7,
        0,
        3,
        1,
        1,
        PALETTE.steel
      );
      if (weapon === 'lance') g.box(-1, 0, -1, 3, 3, 3, TEAM);
      break;
    }
  }
  return g;
}

function shieldGrid() {
  const g = new Grid().box(-3, -4, 0, 7, 8, 1, PALETTE.steelDark);
  g.box(-2, -3, 0, 5, 6, 1, TEAM).box(0, -1, 1, 1, 2, 1, PALETTE.gold);
  return g.clear(-3, -4, 0).clear(3, -4, 0);
}

/** Vertical bow curving toward the target, string at the back. */
function bowGrid() {
  const g = new Grid();
  for (let y = -8; y <= 8; y++) {
    g.set(0, y, Math.round(2.5 * (1 - (y / 8) ** 2)), PALETTE.woodDark);
    g.set(0, y, 0, PALETTE.string);
  }
  return g.box(0, -1, 2, 1, 3, 1, PALETTE.leather);
}

/** Crossbow along +Z (stock in the hands, prod at the front). */
function crossbowGrid() {
  return new Grid()
    .box(0, 0, -3, 1, 1, 11, PALETTE.wood)
    .box(-4, 0, 6, 9, 1, 1, PALETTE.woodDark)
    .box(0, -2, -1, 1, 2, 1, PALETTE.woodDark)
    .box(-3, 1, 6, 7, 1, 1, PALETTE.string);
}

function capeGrid() {
  return new Grid().box(-3, -1, -3, 6, 7, 1, TEAM).box(-3, -1, -4, 6, 2, 1, TEAM);
}

function horseGrids(coat: 'brown' | 'white') {
  const hide = coat === 'white' ? '#e8e2d6' : '#8a5a36',
    mane = coat === 'white' ? '#b9b0a2' : '#3a271b';
  const body = new Grid().box(-3, 8, -8, 6, 6, 16, hide);
  // Faction saddle cloth and a tail.
  body.box(-4, 10, -3, 8, 5, 6, TEAM).box(-3, 14, -3, 6, 1, 6, PALETTE.leather);
  body.box(-1, 8, -10, 2, 5, 2, mane);
  const neck = new Grid().box(-2, 0, -2, 4, 7, 4, hide).box(-2, 4, 2, 4, 3, 5, hide);
  neck.box(-1, 1, -3, 2, 7, 1, mane).box(-1, 7, -2, 2, 1, 4, mane);
  neck.set(-2, 6, 4, PALETTE.eye).set(1, 6, 4, PALETTE.eye);
  const leg = new Grid().box(-1, -8, -1, 2, 8, 2, hide).box(-1, -8, -1, 2, 1, 2, '#2d2620');
  return { body, neck, leg };
}

// ——— Fine detail (full graphics quality) ———
//
// High detail meshes every part at half the voxel size: the coarse design is doubled (coarse cell x
// covers fine x = 2x, 2x + 1) and then painted with features too small for the coarse grid.

/** Visits every cell (x, y, z, colour); a returned colour replaces the cell's. */
function each(g: Grid, fn: (x: number, y: number, z: number, color: string) => string | void) {
  for (const [key, color] of [...g.cells]) {
    const [x, y, z] = key.split(',').map(Number);
    const next = fn(x, y, z, color);
    if (next && next !== color) g.cells.set(key, next);
  }
}
const open = (g: Grid, x: number, y: number, z: number) => !g.get(x, y, z);

/** Small features that rounding must never erode. */
const KEEP = new Set<string>([
  PALETTE.eye,
  PALETTE.eyeWhite,
  PALETTE.gold,
  PALETTE.string,
  PALETTE.mouth,
]);

/**
 * Rounds a part: removes every cell exposed along two or more axes (edges and corners), so boxes
 * read as stepped, chunky curves instead of bricks. One pass; protected colours stay.
 */
function round(g: Grid) {
  const drop: string[] = [];
  for (const [key, color] of g.cells) {
    if (KEEP.has(color)) continue;
    const [x, y, z] = key.split(',').map(Number);
    let axes = 0;
    if (open(g, x + 1, y, z) || open(g, x - 1, y, z)) axes++;
    if (open(g, x, y + 1, z) || open(g, x, y - 1, z)) axes++;
    if (open(g, x, y, z + 1) || open(g, x, y, z - 1)) axes++;
    if (axes >= 2) drop.push(key);
  }
  for (const key of drop) g.cells.delete(key);
  return g;
}

/** A box with its edges rounded off (for hands, pauldrons and other add-ons). */
function blob(
  g: Grid,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  c: string
) {
  const part = round(new Grid().box(x, y, z, w, h, d, c));
  return g.add(part);
}

const ramps = new Map<string, string>();
/** Hue-shifted light and shadow of a colour: warm, brighter tops; cool, darker undersides. */
function rampColor(css: string, light: boolean) {
  const key = css + light;
  let out = ramps.get(key);
  if (!out) {
    const c = new THREE.Color(css);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    const toward = (target: number, amount: number) => {
      let d = target - hsl.h;
      if (d > 0.5) d -= 1;
      if (d < -0.5) d += 1;
      return (hsl.h + d * amount + 1) % 1;
    };
    if (light) c.setHSL(toward(0.12, 0.08), hsl.s * 0.95, Math.min(0.95, hsl.l * 1.12 + 0.03));
    else c.setHSL(toward(0.66, 0.1), Math.min(1, hsl.s * 1.08), hsl.l * 0.74);
    out = `#${c.getHexString()}`;
    ramps.set(key, out);
  }
  return out;
}

/** Bakes the light ramp: tops lit, undersides shaded, faction cloth through its own variants. */
function ramp(g: Grid) {
  const flat = new Set<string>([
    PALETTE.eye,
    PALETTE.eyeWhite,
    PALETTE.mouth,
    PALETTE.blush,
    PALETTE.string,
  ]);
  const up: string[] = [],
    down: string[] = [];
  for (const [key, c] of g.cells) {
    if (flat.has(c)) continue;
    const [x, y, z] = key.split(',').map(Number);
    if (open(g, x, y + 1, z)) up.push(key);
    else if (open(g, x, y - 1, z)) down.push(key);
  }
  for (const key of up) {
    const c = g.cells.get(key)!;
    g.cells.set(
      key,
      c === TEAM
        ? TEAM_LIGHT
        : c === TEAM_DARK
          ? TEAM
          : c === TEAM_LIGHT
            ? TEAM_LIGHT
            : c === PALETTE.steel
              ? PALETTE.steelLight
              : c === PALETTE.gold
                ? PALETTE.goldLight
                : rampColor(c, true)
    );
  }
  for (const key of down) {
    const c = g.cells.get(key)!;
    g.cells.set(
      key,
      c === TEAM || c === TEAM_LIGHT ? TEAM_DARK : c === TEAM_DARK ? TEAM_DARK : rampColor(c, false)
    );
  }
  return g;
}

/** Wood shows grain; hair falls in strands; then the light ramp. */
function polish(g: Grid, hair?: string) {
  each(g, (x, y, z, c) => {
    if ((c === PALETTE.wood || c === PALETTE.woodDark) && ((x * 5 + y * 3 + z * 7) & 7) === 0)
      return shade(c, 0.85);
    if (hair && c === hair) {
      const n = (x * 3 + y * 5 + z * 7) & 7;
      if (n === 0) return shade(hair, 0.78);
      if (n === 3) return shade(hair, 1.18);
    }
  });
  return ramp(g);
}

function fineHead(g: Grid, look: Look, type: string) {
  const skin = tone(type, SKIN),
    hair = tone(type + 'h', PALETTE.hair);
  // Clear the coarse face, round the skull and headgear, then paint the face on the front (z = 7).
  each(g, (_x, _y, z, c) =>
    z >= 6 && z <= 7 && (c === PALETTE.eye || c === PALETTE.blush) ? skin : c
  );
  if (look.head === 'helmet') g.carve(-2, 6, 8, 2, 10, 2);
  round(g);
  const face = (x: number, y: number, color: string) => {
    if (g.get(x, y, 7) === skin && open(g, x, y, 8)) g.set(x, y, 7, color);
  };
  // Big eyes with a catchlight, brows, nose, small mouth, rosy cheeks, ears.
  for (const [ex, inner] of [
    [-6, -5],
    [4, 4],
  ]) {
    for (let y = 5; y <= 8; y++) {
      face(ex, y, PALETTE.eye);
      face(ex + 1, y, PALETTE.eye);
    }
    face(inner, 8, PALETTE.eyeWhite);
    face(inner, 7, PALETTE.eyeWhite);
  }
  for (const x of [-7, -6, -5, 4, 5, 6]) face(x, 10, shade(hair, 0.85));
  face(-1, 2, PALETTE.mouth);
  face(0, 2, PALETTE.mouth);
  for (const x of [-7, -6, 5, 6]) face(x, 3, PALETTE.blush);
  if (open(g, -1, 4, 8) && open(g, 0, 4, 8) && g.get(-1, 4, 7) === skin)
    g.box(-1, 4, 8, 2, 1, 1, shade(skin, 0.9));
  for (const x of [-8, 7])
    for (let y = 5; y <= 8; y++)
      for (const z of [-1, 0])
        if (open(g, x + Math.sign(x), y, z) && g.get(x, y, z) === skin)
          g.set(x + Math.sign(x), y, z, y === 6 || y === 7 ? shade(skin, 0.86) : skin);
  // Fringe and side locks under hats and loose hair.
  if (['hair', 'cap', 'widehat', 'kettle'].includes(look.head))
    for (let x = -7; x <= 6; x++) {
      if (open(g, x, 13, 8)) g.set(x, 13, 8, hair);
      if ((x & 1) === 0 && open(g, x, 12, 8)) g.set(x, 12, 8, hair);
    }
  switch (look.head) {
    case 'helmet':
      // Nasal guard and a riveted rim.
      g.box(-1, 9, 8, 2, 6, 1, PALETTE.steelDark);
      each(g, (x, y, z, c) =>
        c === PALETTE.steel && y === 6 && ((x + z) & 3) === 0 ? PALETTE.steelDark : c
      );
      break;
    case 'plumed':
      each(g, (_x, y, z, c) => (c === TEAM && y >= 18 && z & 1 ? TEAM_LIGHT : c));
      each(g, (x, y, z, c) =>
        c === PALETTE.steel && y === 6 && ((x + z) & 3) === 0 ? PALETTE.steelDark : c
      );
      break;
    case 'greathelm':
      each(g, (_x, y, z, c) => (c === TEAM && y >= 18 && z & 1 ? TEAM_LIGHT : c));
      // Breathing holes and a cross on the visor.
      for (const [x, y] of [
        [-5, 2],
        [-3, 3],
        [-5, 4],
        [3, 2],
        [5, 3],
        [3, 4],
      ])
        if (g.get(x, y, 9)) g.set(x, y, 9, PALETTE.eye);
      g.box(-1, 1, 10, 2, 7, 1, PALETTE.gold);
      break;
    case 'hood':
      each(g, (_x, _y, z, c) => (c === TEAM && z >= 8 ? TEAM_DARK : c));
      break;
    case 'cap':
    case 'widehat':
    case 'kettle':
      each(g, (_x, y, _z, c) =>
        y === 14 && (c === PALETTE.leather || c === PALETTE.steel) ? shade(c, 0.82) : c
      );
      break;
  }
  if (look.scarf)
    // A face scarf in the faction's dark tone, knotted at the side.
    for (let x = -8; x <= 7; x++)
      for (let y = 0; y <= 4; y++) if (g.get(x, y, 7)) g.set(x, y, 8, TEAM_DARK);
  return polish(g, hair);
}

function fineTorso(g: Grid, look: Look) {
  round(g);
  if (look.armour) {
    // Overlapping lames, tabard edges, a gold cross and plate faulds below the belt.
    each(g, (_x, y, _z, c) =>
      c === PALETTE.steel && (y === 4 || y === 8) ? PALETTE.steelDark : c
    );
    each(g, (x, _y, z, c) =>
      c === TEAM && (x === -4 || x === 3) && Math.abs(z) > 3 ? TEAM_DARK : c
    );
    g.box(-1, 4, 5, 2, 6, 1, PALETTE.gold).box(-3, 7, 5, 6, 1, 1, PALETTE.gold);
    blob(g, -7, -2, -5, 14, 3, 10, PALETTE.steelDark);
  } else {
    // Tunic skirt flaring under the belt, placket and buttons, shoulder seams.
    blob(g, -7, -2, -5, 14, 4, 10, TEAM_DARK);
    for (let y = 4; y <= 11; y++)
      for (const x of [-1, 0]) if (g.get(x, y, 3) === TEAM) g.set(x, y, 3, TEAM_DARK);
    for (const y of [6, 9]) g.box(-1, y, 4, 2, 1, 1, PALETTE.gold);
  }
  // Belt ring buckle and pouch.
  g.box(-1, 2, 4, 2, 2, 1, PALETTE.gold).set(0, 2, 4, PALETTE.leather);
  blob(g, 3, 0, 4, 3, 3, 2, shade(PALETTE.leather, 0.85));
  // Gear on the body: a cross strap and back quiver for shooters, a sword scabbard at the hip.
  if (look.offhand === 'bow' || look.offhand === 'crossbow') {
    for (let i = 0; i <= 9; i++) {
      g.set(5 - i, 12 - i, 4, PALETTE.leather).set(4 - i, 12 - i, 4, PALETTE.leather);
      g.set(5 - i, 12 - i, -5, PALETTE.leather).set(4 - i, 12 - i, -5, PALETTE.leather);
    }
    if (look.offhand === 'bow') {
      blob(g, 1, 1, -8, 4, 13, 3, PALETTE.leather);
      g.box(2, 13, -7, 2, 1, 1, shade(PALETTE.leather, 0.8));
      for (const [x, z, c] of [
        [1, -8, PALETTE.string],
        [2, -7, PALETTE.red],
        [3, -8, PALETTE.string],
        [4, -7, PALETTE.red],
      ] as const)
        g.box(x, 14, z, 1, 2, 1, c);
    }
  }
  if (look.weapon === 'sword' || look.weapon === 'golden' || look.weapon === 'greatsword') {
    g.box(7, -8, -1, 2, 11, 2, PALETTE.leather).box(7, -9, -1, 2, 1, 2, PALETTE.gold);
    g.box(6, 3, -2, 4, 1, 4, PALETTE.steelDark);
  }
  return polish(g);
}

function fineArm(g: Grid, look: Look, type: string) {
  // Drop the coarse hand: a bigger, rounded glove or fist reads better at game distance.
  g.carve(-2, -12, -2, 4, 4, 4);
  round(g);
  const glove = look.armour
    ? PALETTE.steelDark
    : look.weapon || look.offhand
      ? PALETTE.leather
      : tone(type, SKIN);
  blob(g, -3, -14, -3, 6, 6, 6, glove);
  if (look.armour)
    each(g, (_x, y, _z, c) => (c === PALETTE.steel && y === -5 ? PALETTE.steelDark : c));
  else each(g, (_x, y, _z, c) => (c === TEAM && y === -8 ? TEAM_DARK : c));
  if (look.armour || ['helmet', 'plumed', 'kettle', 'greathelm'].includes(look.head)) {
    blob(g, -3, -4, -3, 6, 5, 6, look.armour ? PALETTE.steel : PALETTE.leather);
    g.box(-3, -4, -1, 6, 1, 2, look.armour ? PALETTE.gold : TEAM_DARK);
  }
  return polish(g);
}

function fineLeg(g: Grid, look: Look) {
  round(g);
  // Chunky boots with a turned-down cuff and a toe.
  g.carve(-2, -10, -2, 6, 4, 8);
  blob(g, -2, -10, -3, 6, 5, 9, PALETTE.boots);
  blob(g, -3, -6, -3, 8, 2, 8, shade(PALETTE.boots, 1.45));
  if (look.armour) blob(g, -2, -6, 2, 6, 3, 2, PALETTE.steel);
  return polish(g);
}

/** Tapered points, bright cutting edges, grained hafts. */
function fineWeapon(g: Grid) {
  const metal = (c?: string) => c === PALETTE.steel || c === PALETTE.gold;
  let top = -Infinity;
  for (const [key, c] of g.cells) if (metal(c)) top = Math.max(top, Number(key.split(',')[1]));
  each(g, (x, y, z, c) => {
    if (y === top && metal(c) && metal(g.get(x - 1, y, z))) return 'cut';
    if (metal(c) && open(g, x + 1, y, z))
      return c === PALETTE.gold ? PALETTE.goldLight : PALETTE.steelLight;
  });
  for (const [key, c] of [...g.cells]) if (c === 'cut') g.cells.delete(key);
  each(g, (_x, y, _z, c) => (c === TEAM && (y & 3) === 0 ? TEAM_DARK : c));
  return polish(g);
}

/** Heater shield: pointed base, steel rim, quartered faction face, gold boss. */
function fineShield(g: Grid) {
  for (const [key] of [...g.cells]) {
    const [x, y] = key.split(',').map(Number);
    if (y < -2 && Math.abs(x - 0.5) > 7 + (y + 2) * 1.1) g.cells.delete(key);
  }
  each(g, (x, y, z, c) => {
    if (c === PALETTE.gold) return;
    const edge = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => open(g, x + dx, y + dy, z));
    if (edge) return ((x + y) & 3) === 0 ? PALETTE.steel : PALETTE.steelDark;
    if (c === PALETTE.steelDark) return TEAM;
    if (x === 0 || x === 1 || y === -1 || y === 0) return TEAM_LIGHT;
    return x > 0 === y > 0 ? TEAM : TEAM_DARK;
  });
  return polish(g);
}

/** A smooth longbow drawn at fine resolution (not upscaled). */
function fineBow() {
  const g = new Grid();
  for (let y = -17; y <= 17; y++) {
    const z = Math.round(5 * (1 - (y / 17) ** 2));
    g.box(0, y, z, 2, 1, 1, PALETTE.woodDark);
    if (Math.abs(y) < 9) g.box(0, y, z + 1, 2, 1, 1, PALETTE.woodDark);
    g.set(1, y, 0, PALETTE.string);
  }
  g.box(0, -2, 5, 2, 5, 2, PALETTE.leather);
  g.box(0, 17, 0, 2, 1, 2, PALETTE.gold).box(0, -17, 0, 2, 1, 2, PALETTE.gold);
  return polish(g);
}

/** A longer cape with folds and a ragged hem, clasped in gold. */
function fineCape(g: Grid) {
  for (let x = -6; x <= 5; x++) {
    const hem = -6 - ((x * 7) & 3);
    g.box(x, hem, -6, 1, -2 - hem, 1, TEAM);
  }
  each(g, (x, _y, _z, c) => (c === TEAM && (x + 6) % 4 === 0 ? TEAM_DARK : c));
  g.box(-6, 10, -5, 2, 2, 1, PALETTE.gold).box(4, 10, -5, 2, 2, 1, PALETTE.gold);
  return polish(g);
}

function fineHorse(part: 'body' | 'neck' | 'leg', g: Grid, coat: 'brown' | 'white') {
  const hide = coat === 'white' ? '#e8e2d6' : '#8a5a36',
    mane = coat === 'white' ? '#b9b0a2' : '#3a271b';
  round(g);
  each(g, (x, y, z, c) => {
    if (c === mane && x & 1) return shade(mane, 1.3);
    if (c === hide && ((x * 7 + y * 3 + z * 5) & 15) === 0) return shade(hide, 0.92);
  });
  if (part === 'body') {
    each(g, (_x, y, z, c) => {
      if (c === TEAM && y <= 21) return PALETTE.gold;
      if (c === TEAM && (z === -6 || z === 5)) return TEAM_DARK;
    });
    // Saddle with a raised cantle and pommel.
    g.box(-4, 30, -6, 8, 2, 2, PALETTE.leather).box(-2, 30, 4, 4, 1, 2, PALETTE.leather);
  } else if (part === 'neck') {
    each(g, (_x, _y, _z, c) => (c === PALETTE.eye ? hide : c));
    for (const x of [-4, 3]) {
      g.set(x, 11, 8, PALETTE.eye).set(x, 12, 8, PALETTE.eye).set(x, 12, 9, PALETTE.eyeWhite);
      g.box(x, 14, 6, 1, 2, 1, hide);
    }
    // Darker muzzle, nostrils, a leather bridle and a forelock.
    each(g, (_x, y, z, c) => (c === hide && z >= 12 && y <= 10 ? shade(hide, 0.78) : c));
    g.set(-3, 9, 13, PALETTE.eye).set(2, 9, 13, PALETTE.eye);
    each(g, (x, y, z, c) =>
      c !== PALETTE.eye && z === 10 && y >= 8 && (x === -4 || x === 3 || y === 8 || y === 13)
        ? PALETTE.leather
        : c
    );
    g.box(-1, 14, 4, 2, 1, 3, mane);
  } else {
    // Feathered fetlocks above dark hooves.
    g.carve(-2, -16, -2, 4, 6, 4);
    blob(g, -3, -16, -3, 6, 4, 6, '#2d2620');
    blob(g, -3, -12, -3, 6, 3, 6, shade(hide, 1.25));
  }
  return ramp(g);
}

// ——— Clips ———

const track = (name: string, times: number[], values: number[]) =>
  new THREE.NumberKeyframeTrack(name, times, values);
const clip = (name: string, duration: number, tracks: THREE.KeyframeTrack[]) =>
  new THREE.AnimationClip(name, duration, tracks);

function figureClips(look: Look, riding: boolean): Record<Pose, THREE.AnimationClip> {
  const legs = (swing: number, period: number) =>
    riding
      ? []
      : [
          track('legL.rotation[x]', [0, period / 2, period], [swing, -swing, swing]),
          track('legR.rotation[x]', [0, period / 2, period], [-swing, swing, -swing]),
        ];
  const idle = clip('idle', 1.6, [
    track('body.position[y]', [0, 0.8, 1.6], [5 * VOXEL, 5 * VOXEL - 0.02, 5 * VOXEL]),
    track('head.rotation[x]', [0, 0.8, 1.6], [0, 0.05, 0]),
    track('armL.rotation[z]', [0, 0.8, 1.6], [0.08, 0.12, 0.08]),
    track('armR.rotation[z]', [0, 0.8, 1.6], [-0.08, -0.12, -0.08]),
  ]);
  const period = look.quick ? 0.42 : 0.6;
  const walk = clip('walk', period, [
    ...legs(0.6, period),
    track('armL.rotation[x]', [0, period / 2, period], [-0.5, 0.5, -0.5]),
    track('armR.rotation[x]', [0, period / 2, period], [0.35, -0.35, 0.35]),
    track(
      'body.position[y]',
      [0, period / 4, period / 2, (3 * period) / 4, period],
      [5 * VOXEL, 5 * VOXEL + 0.04, 5 * VOXEL, 5 * VOXEL + 0.04, 5 * VOXEL]
    ),
  ]);
  const attack = {
    swing: clip('attack', 0.9, [
      track('armR.rotation[x]', [0, 0.35, 0.5, 0.9], [0, -2.7, 0.5, 0]),
      track('body.rotation[y]', [0, 0.35, 0.5, 0.9], [0, 0.35, -0.25, 0]),
      track('body.rotation[x]', [0, 0.35, 0.5, 0.9], [0, -0.1, 0.2, 0]),
    ]),
    thrust: clip('attack', 0.9, [
      track('armR.rotation[x]', [0, 0.3, 0.45, 0.9], [0, 0.4, -1.2, 0]),
      track('body.position[z]', [0, 0.3, 0.45, 0.9], [0, -0.06, 0.18, 0]),
      track('body.rotation[x]', [0, 0.3, 0.45, 0.9], [0, -0.1, 0.25, 0]),
    ]),
    shoot: clip('attack', 1, [
      track('armL.rotation[x]', [0, 0.25, 0.8, 1], [0, -1.5, -1.5, 0]),
      track('armR.rotation[x]', [0, 0.25, 0.55, 0.6, 0.8, 1], [0, -1.5, -1.4, -1.5, -1.5, 0]),
      track('armR.rotation[y]', [0, 0.25, 0.55, 0.6, 1], [0, 0, -0.7, 0, 0]),
      track('body.rotation[y]', [0, 0.25, 0.8, 1], [0, -0.3, -0.3, 0]),
    ]),
    crossbow: clip('attack', 1, [
      track('armL.rotation[x]', [0, 0.25, 0.8, 1], [0, -1.4, -1.4, 0]),
      track('armR.rotation[x]', [0, 0.25, 0.8, 1], [0, -1.4, -1.4, 0]),
      track('body.position[z]', [0, 0.55, 0.62, 0.8], [0, 0, -0.08, 0]),
    ]),
  }[look.attack];
  const hit = clip('hit', 0.5, [
    track('body.rotation[x]', [0, 0.12, 0.5], [0, -0.45, 0]),
    track('head.rotation[x]', [0, 0.12, 0.5], [0, -0.3, 0]),
    track('body.position[z]', [0, 0.12, 0.5], [0, -0.1, 0]),
  ]);
  const death = clip('death', 0.8, [
    track('figure.rotation[x]', [0, 0.15, 0.6, 0.8], [0, 0.15, -1.5, -1.45]),
    track('figure.position[y]', [0, 0.6, 0.8], [0, 0.1, 0.05]),
    track('armL.rotation[z]', [0, 0.6], [0, 1.2]),
    track('armR.rotation[z]', [0, 0.6], [0, -1.2]),
  ]);
  const work = clip('work', 0.8, [
    track('armR.rotation[x]', [0, 0.35, 0.5, 0.8], [-0.3, -2.2, 0.1, -0.3]),
    track('body.rotation[x]', [0, 0.35, 0.5, 0.8], [0.15, 0.05, 0.3, 0.15]),
  ]);
  return { idle, walk, attack, hit, death, work };
}

function horseClips(): Record<Pose, THREE.AnimationClip> {
  const gait = (period: number, swing: number, name: string) =>
    clip(name, period, [
      track('hLegFL.rotation[x]', [0, period / 2, period], [swing, -swing, swing]),
      track('hLegBR.rotation[x]', [0, period / 2, period], [swing, -swing, swing]),
      track('hLegFR.rotation[x]', [0, period / 2, period], [-swing, swing, -swing]),
      track('hLegBL.rotation[x]', [0, period / 2, period], [-swing, swing, -swing]),
      track('hNeck.rotation[x]', [0, period / 2, period], [0.05, -0.08, 0.05]),
      track('hBody.position[y]', [0, period / 2, period], [0, 0.04, 0]),
    ]);
  const idle = clip('idle', 2, [track('hNeck.rotation[x]', [0, 1, 2], [0, 0.12, 0])]);
  return {
    idle,
    walk: gait(0.7, 0.45, 'walk'),
    attack: gait(0.45, 0.7, 'attack'),
    hit: clip('hit', 0.5, [track('hNeck.rotation[x]', [0, 0.15, 0.5], [0, -0.5, 0])]),
    death: clip('death', 0.9, [
      track('horse.rotation[z]', [0, 0.7, 0.9], [0, 1.45, 1.4]),
      track('horse.position[y]', [0, 0.7], [0, 0.1]),
    ]),
    work: idle,
  };
}

// ——— Library ———

/** 'high' doubles the voxel resolution and adds fine features and corner shading. */
export type Detail = 'basic' | 'high';

export class VoxelLibrary implements CharacterSource {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

  constructor(readonly detail: Detail = 'basic') {}

  has(type: UnitType) {
    return !!VOXEL_LOOKS[type];
  }

  /**
   * A part mesh. `fine` paints extra features on the doubled grid in high detail, or returns a
   * grid drawn at fine resolution from scratch when `scratch` is set.
   */
  private part(
    key: string,
    team: string,
    make: () => Grid,
    name: string,
    offset: [number, number, number] = [0, 0, 0],
    fine?: (g: Grid) => Grid,
    scratch = false
  ) {
    const id = `${key}|${team}`;
    let geometry = this.geometries.get(id);
    if (!geometry) {
      geometry =
        this.detail === 'high'
          ? meshGrid(
              scratch && fine
                ? fine(new Grid())
                : (fine ?? ((g: Grid) => polish(g)))(upscale(make(), 2)),
              team,
              {
                offset: [offset[0] * 2, offset[1] * 2, offset[2] * 2],
                greedy: true,
                ao: true,
                size: VOXEL / 2,
              }
            )
          : meshGrid(make(), team, { offset });
      this.geometries.set(id, geometry);
    }
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = name;
    mesh.castShadow = true;
    // Shared with every unit of this look; the world must not dispose it.
    mesh.userData.shared = true;
    return mesh;
  }

  build(type: UnitType, team: string): Character {
    const look = VOXEL_LOOKS[type]!;
    const character = new Character();
    const at = (o: THREE.Object3D, x: number, y: number, z: number) => {
      o.position.set(x * VOXEL, y * VOXEL, z * VOXEL);
      return o;
    };
    const pivot = (name: string) => {
      const g = new THREE.Group();
      g.name = name;
      return g;
    };
    const figure = pivot('figure');
    const body = at(pivot('body'), 0, 5, 0);
    figure.add(body);
    body.add(
      this.part(
        `torso-${look.armour}`,
        team,
        () => torsoGrid(look),
        'torso',
        undefined,
        (g) => fineTorso(g, look)
      )
    );
    const head = at(pivot('head'), 0, 6, 0);
    head.add(
      this.part(
        `head-${type}`,
        team,
        () => headGrid(look, type),
        'headMesh',
        undefined,
        (g) => fineHead(g, look, type)
      )
    );
    body.add(head);
    if (look.cape) body.add(this.part('cape', team, capeGrid, 'capeMesh', undefined, fineCape));
    const arm = (side: 'L' | 'R') => {
      const g = at(pivot(`arm${side}`), side === 'L' ? 4 : -4, 6, 0);
      g.add(
        this.part(
          `arm-${type}`,
          team,
          () => armGrid(look, type),
          `arm${side}Mesh`,
          undefined,
          (g) => fineArm(g, look, type)
        )
      );
      body.add(g);
      return g;
    };
    const armL = arm('L'),
      armR = arm('R');
    for (const side of ['L', 'R'] as const) {
      const leg = at(pivot(`leg${side}`), side === 'L' ? 1.5 : -1.5, 5, 0);
      leg.add(
        this.part(
          `leg-${look.armour}`,
          team,
          () => legGrid(look),
          `leg${side}Mesh`,
          [-0.5, 0, -0.5],
          (g) => fineLeg(g, look)
        )
      );
      figure.add(leg);
    }
    const hold = (parent: THREE.Object3D, mesh: THREE.Object3D, tilt: number, z = 1) => {
      const holder = at(new THREE.Group(), 0, -5, z);
      holder.rotation.x = tilt;
      holder.add(mesh);
      parent.add(holder);
      return holder;
    };
    if (look.weapon) {
      const tilt = { pike: 0.25, spear: 1.35, lance: 1.45 }[look.weapon as string] ?? 1.15;
      hold(
        armR,
        this.part(
          `w-${look.weapon}`,
          team,
          () => weaponGrid(look.weapon!),
          'weapon',
          [-0.5, 0, -0.5],
          fineWeapon
        ),
        tilt
      );
    }
    if (look.offhand === 'shield') {
      const holder = at(new THREE.Group(), 1.5, -3, 1.5);
      holder.add(this.part('shield', team, shieldGrid, 'shield', [-0.5, 0, 0], fineShield));
      armL.add(holder);
    } else if (look.offhand === 'bow')
      hold(armL, this.part('bow', team, bowGrid, 'bow', [-0.5, 0, -0.5], fineBow, true), 1.2, 0.5);
    else if (look.offhand === 'crossbow')
      hold(
        armR,
        this.part('crossbow', team, crossbowGrid, 'crossbow', [-0.5, 0, -0.5], fineWeapon),
        0,
        0
      );
    const riding = !!look.mount;
    character.mixers.push({
      mixer: new THREE.AnimationMixer(figure),
      clips: figureClips(look, riding),
    });
    if (look.mount) {
      const grids = horseGrids(look.mount);
      const horse = pivot('horse');
      const hBody = pivot('hBody');
      hBody.add(
        this.part(
          `horse-${look.mount}`,
          team,
          () => grids.body,
          'hBodyMesh',
          undefined,
          (g) => fineHorse('body', g, look.mount!)
        )
      );
      horse.add(hBody);
      const neck = at(pivot('hNeck'), 0, 12, 7);
      neck.add(
        this.part(
          `neck-${look.mount}`,
          team,
          () => grids.neck,
          'hNeckMesh',
          undefined,
          (g) => fineHorse('neck', g, look.mount!)
        )
      );
      hBody.add(neck);
      for (const [name, x, z] of [
        ['hLegFL', 2, 6],
        ['hLegFR', -2, 6],
        ['hLegBL', 2, -6],
        ['hLegBR', -2, -6],
      ] as const) {
        const leg = at(pivot(name), x, 8, z);
        leg.add(
          this.part(
            `hleg-${look.mount}`,
            team,
            () => grids.leg,
            `${name}Mesh`,
            [0, 0, 0],
            (g) => fineHorse('leg', g, look.mount!)
          )
        );
        hBody.add(leg);
      }
      character.root.add(horse);
      character.mixers.push({ mixer: new THREE.AnimationMixer(horse), clips: horseClips() });
      // Astride: legs forward and apart round the saddle, hips on the saddle cloth.
      for (const [leg, side] of [
        [figure.getObjectByName('legL')!, 1],
        [figure.getObjectByName('legR')!, -1],
      ] as const) {
        leg.rotation.set(-1.25, 0, side * 0.55);
        leg.position.x += side * 1.5 * VOXEL;
      }
      // The seat carries the rider so the figure's own clips (death fall) stay relative to it.
      const seat = at(new THREE.Group(), 0, 10, -1);
      seat.add(figure);
      hBody.add(seat);
    } else character.root.add(figure);
    character.play('idle', 0);
    character.update(Math.random() * 2);
    return character;
  }
}

/** One soldier library per detail level, built on first use. */
const soldiers: Partial<Record<Detail, VoxelLibrary>> = {};
export const voxelSoldiers = (detail: Detail = 'basic') =>
  (soldiers[detail] ??= new VoxelLibrary(detail));
