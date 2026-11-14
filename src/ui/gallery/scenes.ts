/**
 * Display-only states for the /gallery page. They are never saved or played; the world renders
 * them exactly like a game seen by the player with the whole map revealed.
 */
import {
  type ActionEvent,
  type City,
  createGame,
  type FactionId,
  type State,
  type Tile,
  type Unit,
  UNITS,
  type UnitType,
} from '../../game/engine';
import { emptyKnowledge, refreshKnowledge, rememberCity } from '../../game/visibility';

export type SceneId = 'units' | 'animation' | 'terrain' | 'cities';
export type SceneItem = { label: string; tile: string };
export type Scene = { state: State; items: SceneItem[]; focus: string; zoom: number };

const id = (q: number, r: number) => `${q},${r}`;

function blank(): State {
  const s = createGame({ seed: 'gallery', aiCount: 3 });
  for (const t of s.tiles) {
    t.terrain = 'grass';
    t.height = 0.22;
    delete t.improvement;
    delete t.road;
    delete t.bridge;
  }
  s.cities = [];
  s.units = [];
  s.events = [];
  s.event = undefined;
  // createGame already remembered its own cities; start every faction's memory empty.
  for (const owner of s.factions) s.knowledge[owner] = emptyKnowledge();
  return s;
}

/** Everything visible to the player, so every faction's units and cities are drawn current. */
function reveal(s: State) {
  refreshKnowledge(s);
  const k = s.knowledge.player;
  k.visible = s.tiles.map((t) => t.id);
  k.explored = [...k.visible];
  k.tiles = Object.fromEntries(s.tiles.map((t) => [t.id, { ...t }]));
  for (const c of s.cities) rememberCity(s, 'player', c);
  return s;
}

function tile(s: State, q: number, r: number): Tile {
  return s.tiles.find((t) => t.id === id(q, r))!;
}

function setTerrain(s: State, q: number, r: number, terrain: Tile['terrain']) {
  const t = tile(s, q, r);
  t.terrain = terrain;
  t.height =
    terrain === 'water' ? 0 : terrain === 'hill' ? 0.4 : terrain === 'mountain' ? 0.5 : 0.22;
  return t;
}

export function troop(
  type: UnitType,
  owner: FactionId,
  at: string,
  unitId = `${type}-${at}`
): Unit {
  return {
    id: unitId,
    type,
    owner,
    tile: at,
    hp: UNITS[type].hp,
    moves: UNITS[type].moves,
    acted: false,
    moved: false,
    retaliated: false,
    activeLastTurn: false,
  };
}

function city(
  name: string,
  at: string,
  owner: FactionId | null,
  level: number,
  fort: number,
  buildings: City['buildings'] = []
): City {
  return {
    id: `city-${at}`,
    name,
    tile: at,
    owner,
    level,
    fort,
    specialty: null,
    job: null,
    recruited: false,
    repaired: false,
    stability: 2,
    buildings,
  };
}

export const UNIT_TYPES = Object.keys(UNITS) as UnitType[];

function unitsScene(owner: FactionId): Scene {
  const s = blank();
  const items: SceneItem[] = [];
  UNIT_TYPES.forEach((type, i) => {
    const q = (i % 6) * 3 - 7,
      r = Math.floor(i / 6) * 3 - 4;
    if (UNITS[type].class === 'ship') setTerrain(s, q, r, 'water');
    s.units.push(troop(type, owner, id(q, r)));
    items.push({ label: UNITS[type].name, tile: id(q, r) });
  });
  return { state: reveal(s), items, focus: '0,0', zoom: 0.55 };
}

/** Actor at 0,0 facing a target placed at its attack range. */
export function animationScene(owner: FactionId, type: UnitType): Scene {
  const s = blank();
  const enemy: FactionId = owner === 'enemy' ? 'player' : 'enemy';
  const naval = UNITS[type].class === 'ship';
  const range = Math.max(1, UNITS[type].range);
  if (naval)
    for (let q = -3; q <= 5; q++) for (let r = -3; r <= 1; r++) setTerrain(s, q, r, 'water');
  s.units.push(troop(type, owner, '0,0', 'actor'));
  // Healers and engineers need a friendly target; everyone else faces an enemy.
  const friendly = type === 'paladin' || type === 'engineer';
  const targetType: UnitType = naval ? 'warship' : type === 'engineer' ? 'catapult' : 'swordsman';
  s.units.push(troop(targetType, friendly ? owner : enemy, id(friendly ? 1 : range, 0), 'target'));
  setTerrain(s, -3, 2, 'forest');
  setTerrain(s, 4, -3, 'mountain');
  return {
    state: reveal(s),
    items: [],
    focus: id(Math.ceil(range / 2), 0),
    zoom: range > 2 ? 1.05 : 1.4,
  };
}

function terrainScene(): Scene {
  const s = blank();
  const items: SceneItem[] = [];
  const patch = (label: string, q: number, r: number, terrain: Tile['terrain']) => {
    for (let dq = -1; dq <= 1; dq++)
      for (let dr = -1; dr <= 1; dr++) setTerrain(s, q + dq, r + dr, terrain);
    items.push({ label, tile: id(q, r) });
  };
  patch('Rừng', -9, -5, 'forest');
  patch('Núi', -4, -5, 'mountain');
  patch('Đồi', 1, -5, 'hill');
  patch('Cát', 6, -5, 'sand');
  // A bay: deep water in the middle, shallow water and foam along the shore.
  for (let q = 8; q <= 14; q++) for (let r = -2; r <= 4; r++) setTerrain(s, q, r, 'water');
  for (let q = 7; q <= 15; q++) {
    setTerrain(s, q, -3, 'sand');
    setTerrain(s, q, 5, 'sand');
  }
  items.push({ label: 'Biển & bờ', tile: id(11, 1) });
  const improvements: [string, Tile['improvement'], Tile['terrain']][] = [
    ['Ruộng', 'farm', 'grass'],
    ['Ruộng tưới', 'irrigated_farm', 'grass'],
    ['Đồng cỏ', 'pasture', 'grass'],
    ['Mỏ', 'mine', 'hill'],
    ['Mỏ đá', 'quarry', 'hill'],
    ['Trại gỗ', 'lumber', 'forest'],
  ];
  improvements.forEach(([label, improvement, terrain], i) => {
    const t = setTerrain(s, -9 + i * 3, 0, terrain);
    t.improvement = improvement;
    items.push({ label, tile: t.id });
  });
  // Road across a one-tile river with a bridge.
  for (let q = -9; q <= -2; q++) tile(s, q, 4).road = 'player';
  for (let r = 2; r <= 7; r++) setTerrain(s, -5, r, 'water');
  const bridge = tile(s, -5, 4);
  bridge.bridge = 'player';
  delete bridge.road;
  items.push({ label: 'Đường & cầu', tile: id(-5, 4) });
  s.cities.push(city('Bến Đá', id(-1, 4), 'player', 2, 10));
  return { state: reveal(s), items, focus: '0,0', zoom: 0.5 };
}

function citiesScene(): Scene {
  const s = blank();
  const items: SceneItem[] = [];
  const add = (c: City, label: string) => {
    s.cities.push(c);
    items.push({ label, tile: c.tile });
  };
  add(city('Làng trống', id(-8, -4), null, 1, 0), 'Làng trống');
  add(city('Thành cấp 1', id(-4, -4), 'player', 1, 0), 'Cấp 1, chưa có tường');
  add(city('Thành cấp 2', id(0, -4), 'player', 2, 12), 'Cấp 2, có tường');
  add(
    city('Thủ phủ', id(4, -4), 'player', 3, 30, ['tower', 'market', 'forge']),
    'Cấp 3 + tháp, chợ, lò rèn'
  );
  add(city('Bị vây', id(8, -4), 'player', 3, 5), 'Tường sắp vỡ');
  add(
    city('Kinh tế', id(-8, 1), 'player', 2, 10, ['granary', 'lumber', 'farm']),
    'Kho lương, xưởng gỗ, nông trại'
  );
  add(
    city('Quân sự', id(-4, 1), 'player', 2, 10, ['stable', 'siege_workshop']),
    'Chuồng ngựa, xưởng công thành'
  );
  setTerrain(s, 1, 1, 'water');
  setTerrain(s, 1, 2, 'water');
  add(city('Cảng', id(0, 1), 'player', 2, 10, ['port']), 'Cảng');
  (['player', 'enemy', 'enemy2', 'enemy3'] as FactionId[]).forEach((owner, i) =>
    add(
      city(['Hải Lam', 'Hỏa Sơn', 'Ngọc Lâm', 'Kim Sa'][i], id(-6 + i * 4, 6), owner, 3, 30),
      `Màu phe ${i + 1}`
    )
  );
  return { state: reveal(s), items, focus: '0,0', zoom: 0.55 };
}

export function buildScene(scene: SceneId, owner: FactionId, actor: UnitType): Scene {
  if (scene === 'units') return unitsScene(owner);
  if (scene === 'animation') return animationScene(owner, actor);
  if (scene === 'terrain') return terrainScene();
  return citiesScene();
}

export type Action = 'move' | 'attack' | 'retaliate' | 'kill' | 'support';

/** Next state plus the event the world animates; positions are swapped back on the next move. */
export function animate(current: State, action: Action): State {
  const s = structuredClone(current);
  const actor = s.units.find((u) => u.id === 'actor')!;
  const target = s.units.find((u) => u.id === 'target');
  const base = {
    id: ++s.serial,
    actor: actor.id,
    actorType: actor.type,
    owner: actor.owner,
    damage: 0,
    retaliation: 0,
    fortDamage: 0,
    viewers: ['player'] as FactionId[],
    originViewers: ['player'] as FactionId[],
  };
  let event: ActionEvent;
  if (action === 'move') {
    const back = actor.tile !== '0,0';
    const path = back ? ['0,-1', '0,0'] : ['0,-1', '-1,-1'];
    event = { ...base, kind: 'move', from: actor.tile, to: path[1], path };
    actor.tile = path[1];
  } else if (action === 'support') {
    const kind = actor.type === 'paladin' ? 'heal' : actor.type === 'engineer' ? 'repair' : 'build';
    event = {
      ...base,
      kind,
      from: actor.tile,
      to: target?.tile ?? actor.tile,
      target: target?.id,
      damage: kind === 'heal' ? -4 : 0,
    };
  } else {
    event = {
      ...base,
      kind: 'attack',
      from: actor.tile,
      to: target!.tile,
      target: target!.id,
      damage: 4,
      retaliation: action === 'retaliate' ? 3 : 0,
      dead: action === 'kill' ? [target!.id] : undefined,
    };
    if (action === 'kill') s.units = s.units.filter((u) => u.id !== 'target');
  }
  s.event = event;
  s.events = [event];
  return s;
}
