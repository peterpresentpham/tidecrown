/**
 * Bakes the CC0 source packs into src/render/assets/models.bin (one compact file the game loads).
 *
 *   npm run models -- <source-dir>
 *
 * <source-dir> layout (see docs/architecture.md#mô-hình-3d for download links):
 *   rts/      Quaternius Ultimate Fantasy RTS .glb files
 *   nature/   Quaternius Ultimate Nature .glb files
 *   village/  Quaternius Medieval Village .glb files
 *   extra/    Kenney Castle Kit siege*.obj/.mtl and Quaternius ship .glb files
 *
 * Units (skinned, animated) are packed separately by characters.ts.
 *
 * Format: "NMD1", u32 JSON length, JSON (models/anchors), then per model Float32 positions,
 * Uint8 RGBA colours (alpha 255 = faction-tinted) and Uint16/Uint32 indices.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as THREE from 'three';

import {
  bounds,
  type Fit,
  meshes,
  normalizer,
  pose,
  type TeamMask,
  transform,
  type Triangles,
  triangles,
} from './bake';
import { type Loaded, loadModel } from './load';

const root = process.argv[2];
if (!root) {
  console.error('Usage: npm run models -- <source-dir>');
  process.exit(1);
}
const OUT = join(import.meta.dirname, '../../src/render/assets/models.bin');

/** Quaternius RTS pieces paint the faction-coloured cloth with the "Main" material. */
const TEAM: TeamMask = { materials: ['Main'] };

type Static = {
  name: string;
  file: string;
  include?: RegExp;
  exclude?: RegExp;
  fit: Fit;
  rotate?: number;
  mask?: TeamMask;
  /** Extra parts baked in the same frame as the main model (e.g. a catapult arm). */
  parts?: Record<string, RegExp>;
};

const rts = (name: string, file: string, fit: Fit, rotate = 0): Static => ({
  name,
  file: `rts/${file}.glb`,
  fit,
  rotate,
  mask: TEAM,
});
const nature = (name: string, file: string, fit: Fit): Static => ({
  name,
  file: `nature/${file}.glb`,
  fit,
});
const village = (name: string, file: string, fit: Fit, rotate = 0): Static => ({
  name,
  file: `village/${file}.glb`,
  fit,
  rotate,
});

const STATIC: Static[] = [
  // Scenery
  rts('forest_A', 'Resource_PineTree_Group', { width: 1.75 }),
  rts('forest_B', 'Resource_Tree_Group', { width: 1.75 }),
  rts('forest_cut', 'Resource_PineTree_Group_Cut', { width: 1.2 }),
  nature('tree_pine', 'PineTree_2', { height: 1.25 }),
  nature('tree_common', 'CommonTree_1', { height: 1.15 }),
  nature('bush', 'Bush_1', { width: 0.55 }),
  nature('bush_berries', 'BushBerries_1', { width: 0.5 }),
  rts('mountain_A', 'Mountain_Group_1', { width: 1.85 }),
  rts('mountain_B', 'Mountain_Group_2', { width: 1.85 }),
  rts('mountain_C', 'MountainLarge_Single', { width: 1.6 }),
  rts('hill_A', 'Mountain_Single', { width: 1.15 }),
  rts('hill_B', 'Rock_Group', { width: 1.1 }),
  nature('rock_A', 'Rock_Moss_2', { width: 0.45 }),
  nature('rock_B', 'Rock_Moss_3', { width: 0.4 }),
  nature('rock_C', 'Rock_1', { width: 0.35 }),
  // Tile improvements and props
  rts('farm', 'Farm_FirstAge_Level2_Wheat', { width: 1.6 }),
  rts('mine', 'Mine', { width: 1.0 }),
  rts('stone', 'Resource_Rock_2', { width: 0.65 }),
  rts('logs', 'Logs', { width: 0.7 }),
  rts('crates', 'Crate_Stack1', { width: 0.42 }),
  village('fence', 'Fence', { width: 0.9 }),
  village('well', 'Well', { width: 0.42 }),
  village('cart', 'Cart', { width: 0.6 }),
  // Cities: houses for villages, a town centre that grows with the level, one model per building.
  rts('home_A', 'Houses_FirstAge_1_Level1', { width: 0.75 }),
  rts('home_B', 'Houses_FirstAge_2_Level1', { width: 0.75 }),
  rts('home_C', 'Houses_FirstAge_3_Level1', { width: 0.75 }),
  rts('town_1', 'TownCenter_FirstAge_Level3', { width: 1.1 }),
  rts('town_2', 'TownCenter_SecondAge_Level2', { width: 1.2 }),
  rts('town_3', 'TownCenter_SecondAge_Level3', { width: 1.3 }),
  rts('barracks', 'Barracks_FirstAge_Level1', { width: 0.72 }),
  rts('archery', 'Archery_FirstAge_Level1', { width: 0.72 }),
  rts('market', 'Market_FirstAge_Level1', { width: 0.68 }),
  rts('storage', 'Storage_FirstAge_Level1', { width: 0.62 }),
  rts('tower', 'WatchTower_SecondAge_Level2', { width: 0.45 }),
  rts('windmill', 'Windmill_FirstAge', { width: 0.55 }),
  rts('wall', 'Wall_FirstAge', { width: 1.6 }),
  rts('wall_stone', 'Wall_SecondAge', { width: 1.6 }),
  rts('port', 'Port_FirstAge_Level1', { width: 1.1 }),
  rts('ruin', 'Rock_Group', { width: 0.55 }),
  village('blacksmith', 'Blacksmith', { width: 0.72 }),
  village('sawmill', 'Sawmill', { width: 0.72 }),
  village('stable', 'Stable', { width: 0.78 }),
  // Siege engines face +Z after rotation; the throwing arm is a separate pivot part.
  {
    name: 'ballista',
    file: 'extra/siegeBallista.obj',
    fit: { width: 1.25 },
    exclude: /^flag/,
    mask: { materials: ['roof'] },
  },
  {
    name: 'catapult',
    file: 'extra/siegeCatapult.obj',
    fit: { width: 1.35 },
    exclude: /^(flag|catapult)/,
    mask: { materials: ['roof'] },
    parts: { arm: /^catapult/ },
  },
  {
    name: 'trebuchet',
    file: 'extra/siegeTrebuchet.obj',
    fit: { width: 1.5 },
    exclude: /^(flag|trebuchet|weight|catapult)/,
    mask: { materials: ['roof'] },
    parts: { arm: /^(trebuchet|weight|catapult)/ },
  },
  { name: 'boat_sail', file: 'extra/BoatWSail.glb', fit: { width: 1.45 } },
  {
    name: 'viking_boat',
    file: 'extra/Viking_boat.glb',
    fit: { width: 1.75 },
    mask: { materials: ['Red'] },
  },
  {
    name: 'sail_ship',
    file: 'extra/Sail_ship.glb',
    fit: { width: 1.85 },
    mask: { materials: ['DarkRed'] },
  },
];

const cache = new Map<string, Promise<Loaded>>();
const load = (file: string) => {
  if (!cache.has(file)) cache.set(file, loadModel(join(root, file)));
  return cache.get(file)!;
};

type Baked = Triangles;
const models = new Map<string, Baked>();
const anchors: Record<string, number[]> = {};

for (const entry of STATIC) {
  const model = await load(entry.file);
  pose(model, undefined);
  const partFilters = Object.values(entry.parts ?? {});
  const main = triangles(
    model,
    meshes(model, entry.include, entry.exclude).filter(
      (m) => !partFilters.some((f) => f.test(m.name))
    ),
    entry.mask
  );
  const matrix = normalizer(bounds(main), { rotate: entry.rotate, fit: entry.fit });
  models.set(entry.name, transform(main, matrix));
  for (const [part, filter] of Object.entries(entry.parts ?? {})) {
    const t = transform(triangles(model, meshes(model, filter), entry.mask), matrix);
    // Pivot at the part's lowest point so it can swing like an arm.
    const b = bounds(t);
    const pivot = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
    anchors[`${entry.name}.${part}`] = pivot.toArray();
    models.set(`${entry.name}.${part}`, transform(t, new THREE.Matrix4(), pivot));
  }
}

// Dedupe vertices (flat shading needs no normals) and write the library.
const header: { models: Record<string, number[]>; anchors: typeof anchors } = {
  models: {},
  anchors,
};
const chunks: Buffer[] = [];
let offset = 0;
const push = (buffer: Buffer) => {
  const padded = Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4)]);
  chunks.push(padded);
  const at = offset;
  offset += padded.length;
  return at;
};
let triangleCount = 0;
for (const [name, t] of models) {
  const keys = new Map<string, number>();
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let v = 0; v < t.positions.length / 3; v++) {
    const p = t.positions.slice(v * 3, v * 3 + 3).map((x) => Math.round(x * 2000) / 2000);
    const c = t.colors.slice(v * 4, v * 4 + 4);
    const key = p.join() + '|' + c.join();
    let index = keys.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      keys.set(key, index);
      positions.push(...p);
      colors.push(...c);
    }
    indices.push(index);
  }
  triangleCount += indices.length / 3;
  const wide = positions.length / 3 > 65535;
  const pos = push(Buffer.from(new Float32Array(positions).buffer));
  const col = push(Buffer.from(new Uint8Array(colors).buffer));
  const idx = push(
    Buffer.from((wide ? new Uint32Array(indices) : new Uint16Array(indices)).buffer)
  );
  header.models[name] = [positions.length / 3, indices.length, pos, col, idx, wide ? 1 : 0];
}
const json = Buffer.from(JSON.stringify(header));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const prefix = Buffer.alloc(8);
prefix.write('NMD1', 0, 'ascii');
prefix.writeUInt32LE(jsonPadded.length, 4);
mkdirSync(join(OUT, '..'), { recursive: true });
const file = Buffer.concat([prefix, jsonPadded, ...chunks]);
writeFileSync(OUT, file);
console.log(
  `${models.size} models, ${triangleCount} triangles, ${(file.length / 1024).toFixed(0)} KB → ${OUT}`
);
