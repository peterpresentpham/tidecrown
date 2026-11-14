import { BALANCE } from '../data/balance';
import { type BuildingId, BUILDINGS, type ImprovementId, IMPROVEMENTS } from '../data/buildings';
import {
  isShip,
  isSiege,
  RECRUITABLE_UNITS,
  UNIT_UPGRADES,
  UNITS,
  type UnitType,
} from '../data/units';
import { researchStatus } from './research';

export { BUILDINGS, IMPROVEMENTS, isShip, isSiege, UNITS };
export type { BuildingId, ImprovementId, UnitType };
import { TECHNOLOGIES, type TechnologyId, UNIT_TECH } from '../data/technologies';
import { type GameSettings, generateMap, newSeed } from './map';
import {
  emptyKnowledge,
  isExplored,
  isVisible,
  type Knowledge,
  refreshKnowledge,
  rememberCity,
} from './visibility';

export type GridPoint = { q: number; r: number };
export type Terrain = 'grass' | 'forest' | 'hill' | 'mountain' | 'sand' | 'water' | 'unknown';
export const FACTION_IDS = ['player', 'enemy', 'enemy2', 'enemy3'] as const;
export type FactionId = (typeof FACTION_IDS)[number];
export const factionRecord = <T>(make: (id: FactionId) => T): Record<FactionId, T> =>
  Object.fromEntries(FACTION_IDS.map((id) => [id, make(id)])) as Record<FactionId, T>;
export type Specialty = BuildingId;
export type Resource = { gold: number; food: number; wood: number; stone: number };
export type Tile = GridPoint & {
  id: string;
  terrain: Terrain;
  height: number;
  improvement?: Exclude<ImprovementId, 'road' | 'forest' | 'bridge'>;
  road?: FactionId;
  bridge?: FactionId;
};
export type Unit = {
  id: string;
  type: UnitType;
  owner: FactionId;
  tile: string;
  hp: number;
  moves: number;
  acted: boolean;
  moved: boolean;
  retaliated: boolean;
  activeLastTurn: boolean;
  aboard?: string;
  stance?: 'guard' | 'brace' | 'aim';
  deployed?: boolean;
  charge?: number;
  disoriented?: boolean;
  deployedRound?: number;
  lastFiredRound?: number;
};
export type Job = { type: 'upgrade' | 'found' | Specialty; remaining: number };
export type City = {
  id: string;
  name: string;
  tile: string;
  owner: FactionId | null;
  level: number;
  fort: number;
  specialty: Specialty | null;
  job: Job | null;
  recruited: boolean;
  repaired: boolean;
  stability: number;
  buildings?: BuildingId[];
  constructed?: boolean;
};
export type State = {
  knowledge: Record<FactionId, Knowledge>;
  version: 8;
  event?: ActionEvent;
  events?: ActionEvent[];
  settings: GameSettings;
  factions: FactionId[];
  turn: FactionId;
  round: number;
  tiles: Tile[];
  units: Unit[];
  cities: City[];
  resources: Record<FactionId, Resource>;
  logs: string[];
  serial: number;
  winner: FactionId | null;
  bankrupt: Record<FactionId, boolean>;
  technologies: Record<FactionId, TechnologyId[]>;
  research: Record<FactionId, { technology: TechnologyId; remaining: number } | null>;
};
export const FACTIONS = {
  player: { name: 'Liên minh Hải Lam', color: '#2477f3', short: 'BẠN' },
  enemy: { name: 'Gia tộc Hỏa Sơn', color: '#eb4646', short: 'ĐỎ' },
  enemy2: { name: 'Bộ tộc Ngọc Lâm', color: '#51bb72', short: 'LỤC' },
  enemy3: { name: 'Vương triều Kim Sa', color: '#e7b449', short: 'VÀNG' },
};
export const RESOURCE_KEYS = ['gold', 'food', 'wood', 'stone'] as const;
export const FOUND_COST: Resource = { gold: 45, food: 20, wood: 30, stone: 15 };
export const UPGRADE_COST: Resource = { gold: 0, food: 50, wood: 0, stone: 0 };
export const upgradeCost = (s: State, city: City): Resource => ({
  gold: 0,
  food:
    50 *
    city.level *
    (city.owner && s.technologies[city.owner].includes('advanced_agriculture') ? 0.8 : 1),
  wood: 0,
  stone: 0,
});
export const REPAIR_COST: Resource = { gold: 5, food: 0, wood: 0, stone: 5 };
export const DIRECTIONS: GridPoint[] = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: 1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
  { q: -1, r: -1 },
];
export const key = (p: GridPoint) => `${p.q},${p.r}`;
export const distance = (a: GridPoint, b: GridPoint) =>
  Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r));
const tileIndexes = new WeakMap<State, { tiles: Tile[]; index: Map<string, Tile> }>();
function tileIndex(s: State) {
  let cached = tileIndexes.get(s);
  if (!cached || cached.tiles !== s.tiles) {
    cached = { tiles: s.tiles, index: new Map(s.tiles.map((t) => [t.id, t])) };
    tileIndexes.set(s, cached);
  }
  return cached.index;
}
export const tileAt = (s: State, id: string) => tileIndex(s).get(id)!;
export const unitAt = (s: State, id: string) => s.units.find((u) => u.tile === id && !u.aboard);
export const cityAt = (s: State, id: string) => s.cities.find((c) => c.tile === id);
export const passable = (t: Tile) =>
  (t.terrain !== 'water' && t.terrain !== 'mountain' && t.terrain !== 'unknown') || !!t.bridge;
export const terrainCost = (t: Tile) => (t.terrain === 'hill' || t.terrain === 'forest' ? 2 : 1);
export const affordable = (r: Resource, cost: Resource) =>
  RESOURCE_KEYS.every((k) => r[k] >= cost[k]);
export const melee = (u: Unit) => UNITS[u.type].range === 1;
export function neighbors(s: State, id: string): Tile[] {
  const t = tileAt(s, id);
  return DIRECTIONS.map((d) => tileIndex(s).get(`${t.q + d.q},${t.r + d.r}`)).filter(
    (n): n is Tile => !!n
  );
}

function hash(q: number, r: number) {
  const v = Math.sin(q * 127.1 + r * 311.7 + 7.4) * 43758.5453;
  return v - Math.floor(v);
}
export function createClassicGame(): State {
  const cities: City[] = [
    { name: 'Hải Vân', tile: '-9,4', owner: 'player' },
    { name: 'Hỏa Sơn', tile: '10,-4', owner: 'enemy' },
    { name: 'Đồng Cỏ', tile: '-5,3', owner: null },
    { name: 'Thành Cổ', tile: '0,1', owner: null },
    { name: 'Rừng Đông', tile: '5,-2', owner: null },
    { name: 'Bắc Lâm', tile: '-7,-4', owner: null },
    { name: 'Nam Hải', tile: '3,6', owner: null },
  ].map((c, i) => ({
    ...c,
    owner: c.owner as FactionId | null,
    id: `c${i + 1}`,
    level: 1,
    fort: c.owner ? 20 : 0,
    specialty: null,
    job: null,
    recruited: false,
    repaired: false,
    stability: 0,
  }));
  const tiles: Tile[] = [];
  for (let q = -16; q <= 16; q++)
    for (let r = -12; r <= 12; r++) {
      const n = hash(q, r);
      const land = (q * q) / 228 + (r * r) / 85 < 1 + Math.sin(q * 0.7) * 0.08;
      let terrain: Terrain = !land
        ? 'water'
        : n < 0.19
          ? 'forest'
          : n > 0.96
            ? 'mountain'
            : n > 0.86
              ? 'hill'
              : 'grass';
      // Continuous open routes connect the starting forts and neutral villages.
      if (land && (Math.abs(r - (2 - q * 0.28)) < 1.6 || Math.abs(q) < 1.5)) terrain = 'grass';
      if (
        cities.some(
          (c) =>
            distance(
              { q, r },
              { q: Number(c.tile.split(',')[0]), r: Number(c.tile.split(',')[1]) }
            ) <= 1
        )
      )
        terrain = 'grass';
      tiles.push({
        id: key({ q, r }),
        q,
        r,
        terrain,
        height: terrain === 'hill' ? 0.4 : terrain === 'mountain' ? 0.5 : 0.22,
      });
    }
  for (const t of tiles)
    if (
      t.terrain === 'grass' &&
      DIRECTIONS.some(
        (d) => tiles.find((n) => n.q === t.q + d.q && n.r === t.r + d.r)?.terrain === 'water'
      )
    )
      t.terrain = 'sand';
  return initialGame(
    { seed: 'classic', aiCount: 1, difficulty: 'medium', map: 'classic' },
    ['player', 'enemy'],
    tiles,
    cities,
    ['-8,4', '9,-4']
  );
}
function initialGame(
  settings: GameSettings,
  factions: FactionId[],
  tiles: Tile[],
  cities: City[],
  starts: string[]
): State {
  const s: State = {
    version: 8,
    settings,
    factions,
    knowledge: factionRecord(() => emptyKnowledge()),
    turn: 'player',
    round: 1,
    tiles,
    units: [],
    cities,
    resources: factionRecord((id) =>
      factions.includes(id)
        ? { gold: 20, food: 16, wood: 5, stone: 12 }
        : { gold: 0, food: 0, wood: 0, stone: 0 }
    ),
    logs: ['Quân xanh lam là của bạn. Khám phá vùng quanh thành để tìm làng và đối thủ.'],
    serial: 100,
    winner: null,
    bankrupt: factionRecord(() => false),
    technologies: factionRecord(() => []),
    research: factionRecord(() => null),
  };
  factions.forEach((f, i) => addUnit(s, 'clubman', starts[i], f));
  refreshKnowledge(s);
  return s;
}
export function createGame(
  options: Partial<Omit<GameSettings, 'map'>> & { map?: 'random' | 'water' } = {}
): State {
  const settings: GameSettings = {
    seed: options.seed?.trim().slice(0, 32) || newSeed(),
    aiCount: options.aiCount ?? 1,
    difficulty: options.difficulty ?? 'medium',
    map: options.map ?? 'random',
  };
  if (
    !['random', 'water'].includes(settings.map) ||
    ![1, 2, 3].includes(settings.aiCount) ||
    !['easy', 'medium', 'hard'].includes(settings.difficulty)
  )
    throw new Error('Thiết lập ván không hợp lệ.');
  const factions = FACTION_IDS.slice(0, settings.aiCount + 1);
  const { tiles, cities, starts } = generateMap(settings, factions);
  return initialGame(settings, factions, tiles, cities, starts);
}
export const livingFactions = (s: State) =>
  s.factions.filter((f) => s.cities.some((c) => c.owner === f));

export type ActionEvent = {
  id: number;
  kind: 'move' | 'attack' | 'heal' | 'repair' | 'build' | 'board' | 'land';
  actor: string;
  actorType?: UnitType;
  owner: FactionId;
  from: string;
  to: string;
  path?: string[];
  target?: string;
  damage: number;
  retaliation: number;
  fortDamage: number;
  dead?: string[];
  viewers?: FactionId[];
  originViewers?: FactionId[];
};
export const hasTech = (s: State, owner: FactionId, id: TechnologyId) =>
  s.technologies[owner].includes(id);
export const buildingsFor = (c: City): BuildingId[] => [
  ...new Set([...(c.buildings ?? []), ...(c.specialty ? [c.specialty] : [])]),
];
export function hasBuilding(c: City, id: string) {
  const all = buildingsFor(c);
  return (
    all.includes(id as BuildingId) ||
    (id === 'forge' && all.some((b) => ['iron_forge', 'steelworks'].includes(b))) ||
    (id === 'iron_forge' && all.includes('steelworks')) ||
    (id === 'port' && all.includes('shipyard')) ||
    (id === 'wall' && all.includes('tower'))
  );
}
export const maxFort = (c: City) =>
  20 + Math.max(0, c.level - 1) * 5 + (hasBuilding(c, 'wall') ? 20 : 0);
/** At least two hostile ground units block half the accessible land approaches.
 * Water/mountains cannot create an empty-set siege; ships alone cannot surround a city. */
export function isBesieged(s: State, c: City): boolean {
  if (!c.owner) return false;
  const approaches = neighbors(s, c.tile).filter(passable);
  if (approaches.length < 2) return false;
  const enemies = approaches.filter((t) =>
    s.units.some(
      (u) =>
        u.tile === t.id &&
        u.owner !== c.owner &&
        !u.aboard &&
        !isShip(u) &&
        UNITS[u.type].attack > 0
    )
  );
  return enemies.length >= Math.max(2, Math.ceil(approaches.length / 2));
}
export const cityShot = (c: City) =>
  c.owner && c.fort > 0 ? (hasBuilding(c, 'tower') ? 5 : c.level >= 2 ? 3 : 0) : 0;
export function statsFor(_s: State, unit: Pick<Unit, 'type' | 'owner'> & Partial<Unit>) {
  const d = UNITS[unit.type];
  return {
    ...d,
    armor: Math.max(0, d.armor - (unit.disoriented ? 1 : 0)),
    range: d.range + (unit.deployed && unit.type !== 'trebuchet' ? 1 : 0),
  };
}
function addUnit(s: State, type: UnitType, tile: string, owner: FactionId, ready = true) {
  s.units.push({
    id: `u${++s.serial}`,
    type,
    owner,
    tile,
    hp: UNITS[type].hp,
    moves: ready ? UNITS[type].moves : 0,
    acted: !ready,
    moved: !ready,
    retaliated: false,
    activeLastTurn: !ready,
  });
}
export const canOccupy = (s: State, u: Pick<Unit, 'type' | 'owner'>, t: Tile) => {
  if (!t || t.terrain === 'unknown') return false;
  if (!isShip(u)) return passable(t);
  if (t.terrain !== 'water' || t.bridge) return false;
  return hasTech(s, u.owner, 'sailing') || s.tiles.some((n) => passable(n) && distance(n, t) <= 2);
};
export function movementCost(_s: State, u: Unit, t: Tile) {
  if (isShip(u)) return 1;
  if (t.road === u.owner || t.bridge) return 0.5;
  if (u.type === 'ranger' && t.terrain === 'forest') return 1;
  return terrainCost(t);
}
/** Melee fronts stop a unit on entering their eight adjacent cells. Forest ignores cavalry control.
 * Only observed enemies exert control; embarked troops and ranged weapons never do. */
export function controlled(s: State, u: Unit, id: string): boolean {
  const t = tileAt(s, id);
  if (!t) return false;
  return s.units.some(
    (e) =>
      e.owner !== u.owner &&
      !e.aboard &&
      melee(e) &&
      UNITS[e.type].attack > 0 &&
      isShip(e) === isShip(u) &&
      isVisible(s, u.owner, e.tile) &&
      distance(tileAt(s, e.tile), t) <= 1 &&
      !(t.terrain === 'forest' && UNITS[e.type].class === 'cavalry')
  );
}
export const strength = (u: Unit) => 0.6 + 0.4 * Math.max(0, Math.min(1, u.hp / UNITS[u.type].hp));
export function restReason(s: State, u: Unit): string | null {
  if (u.acted || u.moved || u.activeLastTurn || u.aboard)
    return 'Nghỉ cần chưa di chuyển/hành động và không ở trên tàu.';
  if (u.hp >= UNITS[u.type].hp) return 'Sinh lực đã đầy.';
  if (s.bankrupt[u.owner]) return 'Thiếu tiếp tế để nghỉ.';
  if (
    s.units.some(
      (e) =>
        e.owner !== u.owner &&
        !e.aboard &&
        isVisible(s, u.owner, e.tile) &&
        distance(tileAt(s, e.tile), tileAt(s, u.tile)) <= 1
    )
  )
    return 'Cần rời ô kề địch trước khi nghỉ.';
  return null;
}
export function reachable(
  s: State,
  unit: Unit,
  budget = unit.moves,
  charted = false
): Map<string, { cost: number; path: string[] }> {
  const found = new Map([[unit.tile, { cost: 0, path: [] as string[] }]]),
    pending = [unit.tile];
  if (unit.aboard || unit.deployed) return found;
  while (pending.length) {
    pending.sort((a, b) => found.get(a)!.cost - found.get(b)!.cost);
    const id = pending.shift()!,
      prev = found.get(id)!;
    if (id !== unit.tile && controlled(s, unit, id)) continue;
    for (const t of neighbors(s, id)) {
      if (!(charted ? isExplored(s, unit.owner, t.id) : isVisible(s, unit.owner, t.id))) continue;
      const city = cityAt(s, t.id);
      if (
        !canOccupy(s, unit, t) ||
        (unitAt(s, t.id) && t.id !== unit.tile) ||
        (city && city.owner !== unit.owner)
      )
        continue;
      const cost = prev.cost + movementCost(s, unit, t);
      if (cost > budget || (found.has(t.id) && found.get(t.id)!.cost <= cost)) continue;
      found.set(t.id, { cost, path: [...prev.path, t.id] });
      pending.push(t.id);
    }
  }
  return found;
}
export function clearShot(s: State, from: string, to: string) {
  const a = tileAt(s, from),
    b = tileAt(s, to),
    d = distance(a, b);
  for (let i = 1; i < d; i++) {
    const t = tileAt(
      s,
      key({
        q: Math.round(a.q + ((b.q - a.q) * i) / d + 1e-6),
        r: Math.round(a.r + ((b.r - a.r) * i) / d + 1e-6),
      })
    );
    if (!t || t.terrain === 'mountain' || cityAt(s, t.id)) return false;
  }
  return true;
}
function damage(s: State, a: Unit, d: Unit) {
  const ad = statsFor(s, a),
    dd = statsFor(s, d),
    at = tileAt(s, a.tile),
    dt = tileAt(s, d.tile),
    city = cityAt(s, d.tile);
  let bonus = ad.range > 1 && at.terrain === 'hill' ? 1 : 0;
  if (['spear', 'pikeman'].includes(a.type) && dd.class === 'cavalry')
    bonus += a.type === 'pikeman' ? 5 : 3;
  if (a.type === 'swordsman' && dd.class === 'infantry') bonus += 2;
  if (['knight', 'heavy_knight'].includes(a.type) && (a.charge ?? 0) >= 2 && d.stance !== 'brace')
    bonus += a.type === 'knight' ? 3 : 4;
  const pierce = ad.pierce + (a.stance === 'aim' ? 2 : 0),
    guard = d.stance === 'guard' && ad.range > 1 ? 3 : 0;
  return Math.max(
    1,
    Math.round(
      Math.max(
        1,
        ad.attack +
          bonus -
          Math.max(0, dd.armor - pierce) -
          guard -
          (dt.terrain === 'forest' ? 1 : 0) -
          (city && city.fort > 0 ? 2 : 0)
      ) * strength(a)
    )
  );
}
export type CombatPreview = {
  legal: boolean;
  reason: string;
  damage: number;
  retaliation: number;
  fortDamage: number;
  capture: boolean;
  attackerHP: number;
  defenderHP: number | null;
};
export function previewAttack(s: State, a: Unit, target: string): CombatPreview {
  const p: CombatPreview = {
    legal: false,
    reason: '',
    damage: 0,
    retaliation: 0,
    fortDamage: 0,
    capture: false,
    attackerHP: a.hp,
    defenderHP: null,
  };
  const fail = (reason: string) => ({ ...p, reason });
  if (!isVisible(s, a.owner, target)) return fail('Mục tiêu ngoài tầm nhìn.');
  const d = unitAt(s, target),
    c = cityAt(s, target),
    t = tileAt(s, target),
    ad = statsFor(s, a);
  p.defenderHP = d?.hp ?? null;
  if (!t) return fail('Ô không hợp lệ.');
  if (s.winner || a.owner !== s.turn || a.acted || a.aboard)
    return fail('Đơn vị đã hành động hoặc chưa đến lượt.');
  if (ad.attack <= 0) return fail('Tàu vận tải không có vũ khí.');
  if ((!d && !c) || d?.owner === a.owner || (!d && c?.owner === a.owner))
    return fail('Không có mục tiêu đối địch.');
  const range = distance(tileAt(s, a.tile), t);
  if (!range || range > ad.range) return fail('Mục tiêu ngoài tầm đánh.');
  if (isSiege(a) && a.moved) return fail('Máy chiến tranh cần đứng yên trong lượt để bắn.');
  if (a.type === 'trebuchet' && !a.deployed) return fail('Cần triển khai trebuchet trước khi bắn.');
  if (ad.range > 1 && !['catapult', 'trebuchet'].includes(a.type) && !clearShot(s, a.tile, target))
    return fail('Đường bắn bị chắn bởi núi hoặc thành.');
  p.legal = true;
  p.capture = !!c && c.owner !== a.owner && c.fort <= 0 && !d && ad.capture && !isShip(a);
  p.damage = d ? Math.min(d.hp, damage(s, a, d)) : 0;
  p.fortDamage =
    c && c.owner !== a.owner
      ? Math.min(c.fort, Math.max(1, Math.round(ad.fortDamage * strength(a))))
      : 0;
  p.defenderHP = d ? Math.max(0, d.hp - p.damage) : null;
  if (
    d &&
    p.defenderHP! > 0 &&
    melee(d) &&
    range === 1 &&
    !d.retaliated &&
    UNITS[d.type].attack > 0
  )
    p.retaliation = Math.min(a.hp, damage(s, { ...d, hp: p.defenderHP! }, a));
  if (
    c?.owner &&
    c.owner !== a.owner &&
    c.fort > 0 &&
    hasBuilding(c, 'wall') &&
    range === 1 &&
    !isSiege(a)
  )
    p.retaliation = Math.min(a.hp, Math.max(p.retaliation, 2));
  p.attackerHP = a.hp - p.retaliation;
  if (c && !d && c.fort <= 0 && !p.capture)
    return { ...p, legal: false, reason: 'Cần quân cận chiến để chiếm thành đã vỡ công sự.' };
  return p;
}
export type Command =
  | { type: 'move' | 'attack'; unit: string; to: string }
  | { type: 'wait' | 'rest'; unit: string }
  | { type: 'recruit'; city: string; unitType: UnitType; to: string }
  | { type: 'build'; city: string; building: BuildingId | 'upgrade' }
  | { type: 'found'; tile: string }
  | { type: 'repair'; city: string }
  | { type: 'research'; technology: TechnologyId }
  | { type: 'end' }
  | { type: 'stance'; unit: string; stance: 'guard' | 'brace' | 'aim' | 'deploy' | 'pack' }
  | { type: 'support'; unit: string; to: string }
  | { type: 'board'; unit: string; ship: string }
  | { type: 'land'; unit: string; to: string }
  | { type: 'improve'; tile: string; improvement: ImprovementId; city?: string; unit?: string }
  | { type: 'upgradeUnit'; unit: string; unitType: UnitType };
export function territoryCity(s: State, id: string) {
  const t = tileAt(s, id);
  return t
    ? s.cities
        .map((c) => ({ c, d: distance(tileAt(s, c.tile), t) }))
        .filter((x) => x.d <= 2)
        .sort((a, b) => a.d - b.d || a.c.id.localeCompare(b.c.id))[0]?.c
    : undefined;
}
export function foundingReason(s: State, id: string): string | null {
  const t = tileAt(s, id);
  if (!isVisible(s, s.turn, id)) return 'Cần nhìn thấy vị trí để xây thành.';
  if (t && s.tiles.some((n) => distance(n, t) <= 2 && !isVisible(s, s.turn, n.id)))
    return 'Cần khảo sát toàn bộ vùng quanh vị trí xây thành.';
  if (!t || !passable(t) || !['grass', 'sand'].includes(t.terrain))
    return 'Chọn ô đất trống hoặc bãi cát để xây thành.';
  if (s.cities.some((c) => distance(tileAt(s, c.tile), t) < 3))
    return 'Thành mới phải cách mọi thành khác ít nhất 3 ô.';
  if (
    !s.units.some(
      (u) => !u.aboard && !isShip(u) && u.owner === s.turn && distance(tileAt(s, u.tile), t) <= 1
    )
  )
    return 'Cần quân bộ của bạn ở gần.';
  if (s.units.some((u) => !u.aboard && u.owner !== s.turn && distance(tileAt(s, u.tile), t) <= 1))
    return 'Có quân địch quá gần vị trí xây thành.';
  return affordable(s.resources[s.turn], FOUND_COST) ? null : 'Không đủ tài nguyên xây thành.';
}
export function recruitTiles(s: State, c: City, type: UnitType = 'clubman') {
  return [tileAt(s, c.tile), ...neighbors(s, c.tile)].filter(
    (t) =>
      canOccupy(s, { type, owner: c.owner! }, t) &&
      !unitAt(s, t.id) &&
      (!cityAt(s, t.id) || cityAt(s, t.id)!.owner === c.owner)
  );
}
export function unitLockReason(s: State, owner: FactionId, type: UnitType): string | null {
  if (!RECRUITABLE_UNITS.includes(type)) return 'Đơn vị không hợp lệ.';
  const tech = UNIT_TECH[type];
  return tech && !hasTech(s, owner, tech) ? `Cần nghiên cứu ${TECHNOLOGIES[tech].name}.` : null;
}
export function recruitReason(s: State, c: City, type: UnitType): string | null {
  const tech = unitLockReason(s, c.owner!, type);
  if (tech) return tech;
  const facility = UNITS[type].facility as BuildingId | undefined;
  if (facility && !hasBuilding(c, facility))
    return `Cần xây ${BUILDINGS[facility].name} tại thành này.`;
  if (['heavy_knight', 'paladin'].includes(type) && !hasBuilding(c, 'stable'))
    return 'Cần xây Chuồng ngựa tại thành này.';
  if (c.recruited) return 'Mỗi thành chỉ tuyển một đội mỗi lượt.';
  if (c.stability || c.job?.type === 'found') return 'Thành đang ổn định hoặc xây dựng.';
  if (s.bankrupt[c.owner!]) return 'Thiếu lương hoặc vàng đầu lượt; chưa thể tuyển quân.';
  if (!affordable(s.resources[c.owner!], UNITS[type].cost))
    return 'Không đủ tài nguyên tuyển quân.';
  if (!recruitTiles(s, c, type).length) return 'Không có ô trống phù hợp gần thành.';
  return null;
}
export function buildingReason(s: State, c: City, id: BuildingId): string | null {
  const b = BUILDINGS[id];
  if (!b) return 'Công trình không hợp lệ.';
  if (!hasTech(s, c.owner!, b.tech)) return `Cần nghiên cứu ${TECHNOLOGIES[b.tech].name}.`;
  if (hasBuilding(c, id)) return 'Đã có công trình này.';
  if (b.requires && !hasBuilding(c, b.requires))
    return `Cần xây ${BUILDINGS[b.requires].name} trước.`;
  if (c.constructed) return 'Thành đã xây/cải tạo trong lượt này.';
  if (c.job || c.stability) return 'Thành đang ổn định hoặc xây dựng.';
  if (['port', 'shipyard'].includes(id) && !neighbors(s, c.tile).some((t) => t.terrain === 'water'))
    return 'Cảng cần thành giáp biển.';
  const used = buildingsFor(c).filter((id) => BUILDINGS[id].group === b.group).length;
  if (!b.requires && b.group !== 'defense' && used >= 2 + c.level)
    return `Hết chỗ ${b.group === 'economy' ? 'kinh tế' : 'quân sự'}; nâng cấp thành để thêm chỗ.`;
  return affordable(s.resources[c.owner!], b.cost) ? null : 'Không đủ tài nguyên xây dựng.';
}
/** Read-only city action checks shared by execution and the management UI. */
function cityActionReason(s: State, c: City): string | null {
  if (s.winner) return 'Ván chơi đã kết thúc.';
  if (c.owner !== s.turn) return 'Thành này không thuộc phe đang chơi.';
  if (c.stability || c.job?.type === 'found') return 'Thành đang ổn định hoặc xây dựng.';
  return null;
}
export function upgradeReason(s: State, c: City): string | null {
  const why = cityActionReason(s, c);
  if (why) return why;
  if (c.level >= 3) return 'Đã đạt cấp tối đa.';
  if (c.job) return 'Thành đang xây dựng.';
  if (c.constructed) return 'Thành đã xây/cải tạo trong lượt này.';
  return affordable(s.resources[s.turn], upgradeCost(s, c)) ? null : 'Không đủ lương nâng thành.';
}
export function repairReason(s: State, c: City): string | null {
  const why = cityActionReason(s, c);
  if (why) return why;
  if (c.repaired) return 'Thành đã sửa công sự trong lượt này.';
  if (c.fort >= maxFort(c)) return 'Công sự đã đầy.';
  if (
    s.units.some(
      (u) => !u.aboard && u.owner !== c.owner && distance(tileAt(s, u.tile), tileAt(s, c.tile)) <= 1
    )
  )
    return 'Không thể sửa khi có quân địch kề thành.';
  return affordable(s.resources[s.turn], REPAIR_COST) ? null : 'Không đủ tài nguyên sửa thành.';
}
export function improvementReason(
  s: State,
  cmd: Extract<Command, { type: 'improve' }>
): string | null {
  const { tile: id, improvement: kind } = cmd,
    t = tileAt(s, id),
    def = IMPROVEMENTS[kind],
    u = s.units.find((u) => u.id === cmd.unit),
    c = s.cities.find((c) => c.id === cmd.city);
  if (!t || !def || !isVisible(s, s.turn, id)) return 'Cần nhìn thấy vị trí cải tạo.';
  if (!hasTech(s, s.turn, def.tech)) return `Cần nghiên cứu ${TECHNOLOGIES[def.tech].name}.`;
  if (u) {
    if (
      u.owner !== s.turn ||
      u.type !== 'engineer' ||
      u.acted ||
      u.aboard ||
      distance(tileAt(s, u.tile), t) > 1
    )
      return 'Cần công binh chưa hành động ở ô kề.';
  } else if (
    !c ||
    c.owner !== s.turn ||
    c.stability ||
    c.job ||
    c.constructed ||
    territoryCity(s, id)?.owner !== s.turn ||
    distance(tileAt(s, c.tile), t) > 2
  )
    return 'Cần chọn thành sở hữu vùng đất; mỗi lượt cải tạo một ô.';
  if (kind === 'bridge' && !u) return 'Cầu cần công binh ở gần.';
  if (
    s.units.some(
      (e) =>
        e.owner !== s.turn &&
        !e.aboard &&
        isVisible(s, s.turn, e.tile) &&
        distance(tileAt(s, e.tile), t) <= 1
    )
  )
    return 'Có địch quá gần công trường.';
  if (cityAt(s, id) && kind !== 'road') return 'Không cải tạo ô thành.';
  if (kind === 'road') {
    if (!passable(t) || t.road === s.turn) return 'Đường cần ô đất chưa có đường của mình.';
  } else if (kind === 'bridge') {
    const paired = [
      [1, 0],
      [0, 1],
    ].some(([q, r]) => {
      const a = tileAt(s, `${t.q + q},${t.r + r}`),
        b = tileAt(s, `${t.q - q},${t.r - r}`);
      return a && b && passable(a) && passable(b);
    });
    if (t.terrain !== 'water' || t.bridge || unitAt(s, id) || !paired)
      return 'Cầu chỉ bắc qua một ô nước có hai bờ đất đối diện.';
  } else if (kind === 'forest') {
    if (!['grass', 'sand'].includes(t.terrain) || t.improvement || unitAt(s, id))
      return 'Trồng rừng cần đất trống.';
  } else if (kind === 'lumber') {
    if (t.terrain !== 'forest' || t.improvement) return 'Khai thác cần ô rừng trống.';
  } else if (kind === 'mine') {
    if (t.terrain !== 'hill' || t.improvement) return 'Mỏ cần ô đồi trống.';
  } else if (kind === 'quarry') {
    if (t.improvement !== 'mine') return 'Nâng mỏ đồi thành mỏ đá trước.';
  } else if (kind === 'intensive_farm') {
    if (t.improvement !== 'farm') return 'Cần ruộng cơ bản trước.';
  } else if (kind === 'irrigated_farm') {
    if (t.improvement !== 'intensive_farm') return 'Cần ruộng thâm canh trước.';
  } else if (!['grass', 'sand'].includes(t.terrain) || t.improvement)
    return 'Cần ô đồng bằng hoặc đất cát trống.';
  return affordable(s.resources[s.turn], def.cost) ? null : 'Không đủ tài nguyên cải tạo.';
}
function connectedMarkets(s: State, c: City) {
  const seen = new Set([c.tile]),
    pending = [c.tile];
  while (pending.length)
    for (const t of neighbors(s, pending.pop()!))
      if (!seen.has(t.id) && (t.road === c.owner || cityAt(s, t.id)?.owner === c.owner)) {
        seen.add(t.id);
        pending.push(t.id);
      }
  return Math.min(
    4,
    s.cities.filter((other) => other.id !== c.id && other.owner === c.owner && seen.has(other.tile))
      .length * 2
  );
}
export function cityProduction(s: State, c: City): Resource {
  const result = { gold: 0, food: 0, wood: 0, stone: 0 };
  if (!c.owner || c.job?.type === 'found') return result;
  Object.assign(result, {
    gold: c.level * 5,
    food: 3,
    wood: 1 + (hasTech(s, c.owner, 'basic_woodworking') ? 1 : 0),
    stone: 3,
  });
  if (hasBuilding(c, 'farm')) result.food += 4;
  if (hasBuilding(c, 'granary')) result.food++;
  if (hasBuilding(c, 'lumber')) result.wood += 3;
  if (hasBuilding(c, 'workshop')) result.wood += 2;
  if (hasBuilding(c, 'market')) result.gold += 4 + connectedMarkets(s, c);
  for (const t of s.tiles)
    if (
      t.improvement &&
      distance(tileAt(s, c.tile), t) <= 2 &&
      territoryCity(s, t.id)?.id === c.id
    ) {
      const k = t.improvement;
      if (k === 'farm') result.food += 3;
      if (k === 'intensive_farm') result.food += 5;
      if (k === 'irrigated_farm')
        result.food +=
          5 +
          Math.min(
            3,
            neighbors(s, t.id).filter((n) =>
              ['farm', 'intensive_farm', 'irrigated_farm'].includes(n.improvement ?? '')
            ).length
          );
      if (k === 'pasture') result.food += 3;
      if (k === 'lumber') result.wood += 3 + (hasTech(s, c.owner, 'forestry') ? 1 : 0);
      if (k === 'mine') result.stone += 3;
      if (k === 'quarry') result.stone += 5;
    }
  if (isBesieged(s, c)) for (const k of RESOURCE_KEYS) result[k] = Math.floor(result[k] * 0.5);
  if (c.stability) for (const k of RESOURCE_KEYS) result[k] = Math.floor(result[k] * 0.5);
  return result;
}
export function economy(s: State, owner: FactionId) {
  const production: Resource = { gold: 0, food: 0, wood: 0, stone: 0 },
    upkeep: Resource = { gold: 0, food: 0, wood: 0, stone: 0 };
  for (const u of s.units.filter((u) => u.owner === owner))
    for (const k of RESOURCE_KEYS) upkeep[k] += UNITS[u.type].upkeep[k];
  for (const c of s.cities.filter((c) => c.owner === owner && c.job?.type !== 'found')) {
    const p = cityProduction(s, c);
    for (const k of RESOURCE_KEYS) production[k] += p[k];
    upkeep.food += hasBuilding(c, 'granary') ? 0 : 1;
    upkeep.wood++;
    upkeep.stone++;
    if (hasBuilding(c, 'tower')) upkeep.gold++;
  }
  const net = { gold: 0, food: 0, wood: 0, stone: 0 };
  for (const k of RESOURCE_KEYS) net[k] = production[k] - upkeep[k];
  return { production, upkeep, net };
}
export const income = (s: State, owner: FactionId) => economy(s, owner).net;
export function researchReason(s: State, owner: FactionId, id: TechnologyId): string | null {
  return researchStatus(s, owner, id).reason;
}
export function researchPreview(s: State, owner: FactionId, id: TechnologyId) {
  const next = structuredClone(s);
  if (!hasTech(next, owner, id)) next.technologies[owner].push(id);
  return {
    before: income(s, owner),
    after: income(next, owner),
    unlocked: RECRUITABLE_UNITS.filter(
      (type) => unitLockReason(s, owner, type) && !unitLockReason(next, owner, type)
    ),
  };
}
export function unitUpgradeCost(from: UnitType, to: UnitType): Resource {
  const before = UNITS[from].cost,
    after = UNITS[to].cost;
  return {
    gold: Math.max(3, after.gold - before.gold),
    food: Math.max(0, after.food - before.food),
    wood: Math.max(0, after.wood - before.wood),
    stone: Math.max(0, after.stone - before.stone),
  };
}
export function cargo(s: State, ship: Unit) {
  return s.units.filter((u) => u.aboard === ship.id);
}
export const cargoUsed = (s: State, ship: Unit) =>
  cargo(s, ship).reduce((n, u) => n + UNITS[u.type].weight, 0);
function log(s: State, msg: string) {
  s.logs = [msg, ...s.logs].slice(0, 24);
}
function spend(s: State, cost: Resource) {
  for (const k of RESOURCE_KEYS) s.resources[s.turn][k] -= cost[k];
}
function removeDead(s: State) {
  const dead = s.units.filter((u) => u.hp <= 0).map((u) => u.id);
  s.units = s.units.filter((u) => u.hp > 0 && !dead.includes(u.aboard ?? ''));
}
function startTurn(s: State) {
  const owner = s.turn,
    inc = income(s, owner),
    r = s.resources[owner];
  s.bankrupt[owner] = r.gold + inc.gold < 0 || r.food + inc.food < 0;
  for (const k of RESOURCE_KEYS) r[k] = Math.max(0, r[k] + inc[k]);
  const work = s.research[owner];
  if (work && --work.remaining <= 0) {
    s.technologies[owner].push(work.technology);
    log(s, `${FACTIONS[owner].name} hoàn tất ${TECHNOLOGIES[work.technology].name}.`);
    s.research[owner] = null;
  }
  for (const c of s.cities.filter((c) => c.owner === owner)) {
    c.constructed = false;
    c.recruited = false;
    c.repaired = false;
    c.stability = Math.max(0, c.stability - 1);
    if (c.job && --c.job.remaining <= 0) {
      if (c.job.type === 'found') c.fort = maxFort(c);
      else if (c.job.type === 'upgrade') c.level++;
      else c.buildings = [...buildingsFor(c), c.job.type];
      c.job = null;
    }
  }
  for (const u of s.units) {
    u.retaliated = false;
    if (u.owner !== owner) continue;
    const near = s.units.some(
      (e) => !e.aboard && e.owner !== owner && distance(tileAt(s, e.tile), tileAt(s, u.tile)) <= 1
    );
    if (!u.activeLastTurn && cityAt(s, u.tile)?.owner === owner && !near && !s.bankrupt[owner])
      u.hp = Math.min(UNITS[u.type].hp, u.hp + 2);
    u.moves = UNITS[u.type].moves;
    u.acted = false;
    u.moved = false;
    u.activeLastTurn = false;
    delete u.stance;
    u.charge = 0;
    u.disoriented = false;
  }
  refreshKnowledge(s);
  for (const c of s.cities.filter(
    (c) => c.owner === owner && cityShot(c) > 0 && !c.stability && !s.bankrupt[owner]
  )) {
    const target = s.units
      .filter(
        (u) =>
          u.owner !== owner &&
          !u.aboard &&
          isVisible(s, owner, u.tile) &&
          distance(tileAt(s, c.tile), tileAt(s, u.tile)) <= (hasBuilding(c, 'tower') ? 3 : 2)
      )
      .sort((a, b) => a.hp - b.hp)[0];
    if (target) {
      const hit = Math.min(target.hp, Math.max(1, cityShot(c) - UNITS[target.type].armor));
      target.hp -= hit;
      s.event = {
        id: ++s.serial,
        kind: 'attack',
        actor: c.id,
        owner,
        from: c.tile,
        to: target.tile,
        target: target.id,
        damage: hit,
        retaliation: 0,
        fortDamage: 0,
        dead: target.hp <= 0 ? [target.id] : [],
        viewers: s.factions.filter(
          (f) => f === target.owner || isVisible(s, f, target.tile) || isVisible(s, f, c.tile)
        ),
        originViewers: s.factions.filter((f) => isVisible(s, f, c.tile)),
      };
      s.events?.push(s.event);
      log(s, `${c.name}: phòng thủ gây ${hit} sát thương.`);
      removeDead(s);
    }
  }
}
/** All commands are atomic. Research may eventually complete all 45 nodes. */
export function execute(original: State, cmd: Command): { state: State; error?: string } {
  if (original.winner) return { state: original, error: 'Ván chơi đã kết thúc.' };
  const s = structuredClone(original);
  s.events = [];
  refreshKnowledge(s);
  const fail = (error: string) => ({ state: original, error });
  const finish = () => {
    refreshKnowledge(s);
    return { state: s };
  };
  const event = (
    kind: ActionEvent['kind'],
    u: Unit,
    to: string,
    extra: Partial<ActionEvent> = {}
  ) => {
    s.event = {
      id: ++s.serial,
      kind,
      actor: u.id,
      actorType: u.type,
      owner: u.owner,
      from: u.tile,
      to,
      viewers: s.factions.filter(
        (f) => f === u.owner || isVisible(s, f, u.tile) || isVisible(s, f, to)
      ),
      originViewers: s.factions.filter((f) => f === u.owner || isVisible(s, f, u.tile)),
      damage: 0,
      retaliation: 0,
      fortDamage: 0,
      ...extra,
    };
    s.events!.push(s.event);
  };
  const endAction = (u: Unit) => {
    u.acted = true;
    u.moves = 0;
    u.activeLastTurn = true;
  };
  if (cmd.type === 'end') {
    const living = livingFactions(s),
      next = s.factions.slice(s.factions.indexOf(s.turn) + 1).find((f) => living.includes(f));
    s.turn = next ?? living[0];
    if (!next) s.round++;
    startTurn(s);
    log(s, `Lượt ${s.round} · ${FACTIONS[s.turn].name}.`);
    return finish();
  }
  if (cmd.type === 'research') {
    const why = researchReason(s, s.turn, cmd.technology);
    if (why) return fail(why);
    const t = TECHNOLOGIES[cmd.technology];
    spend(s, t.cost);
    s.research[s.turn] = { technology: t.id, remaining: t.turns };
    log(s, `Bắt đầu ${t.name}: ${t.turns} lượt.`);
    return finish();
  }
  if (cmd.type === 'improve') {
    const why = improvementReason(s, cmd);
    if (why) return fail(why);
    const t = tileAt(s, cmd.tile);
    spend(s, IMPROVEMENTS[cmd.improvement].cost);
    if (cmd.improvement === 'forest') t.terrain = 'forest';
    else if (cmd.improvement === 'road') t.road = s.turn;
    else if (cmd.improvement === 'bridge') t.bridge = s.turn;
    else t.improvement = cmd.improvement;
    const u = s.units.find((u) => u.id === cmd.unit);
    if (u) {
      event('build', u, t.id);
      endAction(u);
    } else s.cities.find((c) => c.id === cmd.city)!.constructed = true;
    log(s, `${IMPROVEMENTS[cmd.improvement].name} đã hoàn tất.`);
    return finish();
  }
  if (cmd.type === 'found') {
    const why = foundingReason(s, cmd.tile);
    if (why) return fail(why);
    spend(s, FOUND_COST);
    s.cities.push({
      id: `c${++s.serial}`,
      name: `${FACTIONS[s.turn].short} ${s.cities.filter((c) => c.owner === s.turn).length + 1}`,
      tile: cmd.tile,
      owner: s.turn,
      level: 1,
      fort: 10,
      specialty: null,
      buildings: [],
      job: { type: 'found', remaining: 1 },
      recruited: true,
      repaired: false,
      stability: 0,
    });
    log(s, 'Thành mới hoàn tất đầu lượt sau.');
    return finish();
  }
  if ('unit' in cmd) {
    const u = s.units.find((u) => u.id === cmd.unit);
    if (!u || u.owner !== s.turn) return fail('Bạn không điều khiển được đơn vị này.');
    if (u.acted && !(cmd.type === 'move' && UNITS[u.type].mobileShot && u.moves > 0))
      return fail('Đơn vị đã hành động trong lượt.');
    if (u.aboard && cmd.type !== 'land') return fail('Quân đang trên tàu; chọn lệnh đổ bộ.');
    if (cmd.type === 'rest') {
      const why = restReason(s, u);
      if (why) return fail(why);
      const heal = Math.min(UNITS[u.type].hp - u.hp, cityAt(s, u.tile)?.owner === u.owner ? 3 : 2);
      u.hp += heal;
      event('heal', u, u.tile, { target: u.id, damage: -heal });
      endAction(u);
      return finish();
    }
    if (cmd.type === 'wait') {
      endAction(u);
      return finish();
    }
    if (cmd.type === 'move') {
      const route = reachable(s, u).get(cmd.to);
      if (!route?.path.length) return fail('Không thể đến ô này với điểm di chuyển còn lại.');
      event('move', u, cmd.to, { path: route.path });
      delete u.stance;
      let spent = 0;
      const traversed: string[] = [];
      for (const id of route.path) {
        const t = tileAt(s, id);
        spent += movementCost(s, u, t);
        traversed.push(id);
        u.charge = ['grass', 'sand'].includes(t.terrain) ? (u.charge ?? 0) + 1 : 0;
        u.tile = id;
        for (const p of cargo(s, u)) p.tile = id;
        refreshKnowledge(s);
        if (controlled(s, u, id)) {
          spent = u.moves;
          break;
        }
      }
      if (s.event) {
        s.event.to = u.tile;
        s.event.path = traversed;
      }
      u.moves = Math.max(0, u.moves - spent);
      u.moved = true;
      u.activeLastTurn = true;
      return finish();
    }
    if (cmd.type === 'attack') {
      const p = previewAttack(s, u, cmd.to);
      if (!p.legal) return fail(p.reason);
      const d = unitAt(s, cmd.to),
        c = cityAt(s, cmd.to),
        dead = s.units
          .filter(
            (e) => (e.id === d?.id && p.defenderHP === 0) || (e.id === u.id && p.attackerHP === 0)
          )
          .map((e) => e.id);
      if (isSiege(u)) u.lastFiredRound = s.round;
      event('attack', u, cmd.to, {
        target: d?.id,
        damage: p.damage,
        retaliation: p.retaliation,
        fortDamage: p.fortDamage,
        dead,
      });
      if (p.capture && c) {
        const old = c.owner;
        c.owner = u.owner;
        c.stability = 2;
        c.job = null;
        c.constructed = true;
        c.recruited = true;
        u.tile = c.tile;
        for (const f of s.factions) if (isVisible(s, f, c.tile)) rememberCity(s, f, c);
        log(s, `${FACTIONS[u.owner].name} đã chiếm ${c.name}!`);
        if (old && !s.cities.some((c) => c.owner === old)) {
          s.units = s.units.filter((e) => e.owner !== old);
          if (old === 'player' || livingFactions(s).length === 1) s.winner = u.owner;
        }
      } else {
        if (d) {
          d.hp = p.defenderHP!;
          if (p.retaliation) d.retaliated = true;
        }
        if (c) c.fort -= p.fortDamage;
        u.hp = p.attackerHP;
        removeDead(s);
        log(
          s,
          `${UNITS[u.type].name}: gây ${p.damage} HP${p.fortDamage ? ` · phá ${p.fortDamage} công sự` : ''}${p.retaliation ? ` · nhận ${p.retaliation} phản kích` : ''}.`
        );
      }
      const remaining = u.moves;
      endAction(u);
      if (UNITS[u.type].mobileShot) u.moves = remaining;
      return finish();
    }
    if (cmd.type === 'stance') {
      const st = cmd.stance;
      if (!['guard', 'brace', 'aim', 'deploy', 'pack'].includes(st))
        return fail('Tư thế không hợp lệ.');
      if (
        (st === 'guard' && u.type !== 'shield') ||
        (st === 'brace' && u.type !== 'pikeman') ||
        (st === 'aim' && (u.type !== 'crossbow' || !hasTech(s, u.owner, 'marksman'))) ||
        (['deploy', 'pack'].includes(st) &&
          (!isSiege(u) || !hasTech(s, u.owner, 'siege_logistics')))
      )
        return fail('Đơn vị chưa có hành động này.');
      if (st === 'aim') {
        if (u.moved || u.stance === 'aim')
          return fail('Ngắm bắn cần đứng yên và chỉ chuẩn bị một lần.');
        u.stance = 'aim';
        u.moves = 0;
        u.activeLastTurn = true;
      } else if (st === 'deploy' || st === 'pack') {
        if (u.deployed === (st === 'deploy')) return fail('Máy đã ở trạng thái này.');
        u.deployed = st === 'deploy';
        if (u.deployed) {
          u.deployedRound = s.round;
          delete u.lastFiredRound;
        } else {
          delete u.deployedRound;
          delete u.lastFiredRound;
        }
        endAction(u);
      } else {
        u.stance = st;
        endAction(u);
      }
      return finish();
    }
    if (cmd.type === 'support') {
      if (!isVisible(s, u.owner, cmd.to) || distance(tileAt(s, u.tile), tileAt(s, cmd.to)) > 1)
        return fail('Mục tiêu hỗ trợ phải ở ô kề đang thấy.');
      const target = unitAt(s, cmd.to),
        c = cityAt(s, cmd.to);
      if (u.type === 'paladin') {
        if (
          !target ||
          target.owner !== u.owner ||
          target.id === u.id ||
          isShip(target) ||
          isSiege(target) ||
          target.hp >= UNITS[target.type].hp
        )
          return fail('Chọn đồng minh bộ/kỵ bị thương.');
        if (s.resources[u.owner].food < 3) return fail('Cần 3 lương cứu chữa.');
        s.resources[u.owner].food -= 3;
        const heal = Math.min(4, UNITS[target.type].hp - target.hp);
        target.hp += heal;
        event('heal', u, target.tile, { target: target.id, damage: -heal });
      } else if (u.type === 'engineer') {
        if (!(
          (target &&
            target.owner === u.owner &&
            isSiege(target) &&
            target.hp < UNITS[target.type].hp) ||
          (c && c.owner === u.owner && c.fort < maxFort(c))
        ))
          return fail('Chọn máy chiến tranh hoặc công sự bị hỏng của mình.');
        const cost = { gold: 0, food: 0, wood: 3, stone: 3 };
        if (!affordable(s.resources[u.owner], cost)) return fail('Cần 3 gỗ và 3 đá sửa chữa.');
        spend(s, cost);
        if (
          target &&
          target.owner === u.owner &&
          isSiege(target) &&
          target.hp < UNITS[target.type].hp
        )
          target.hp = Math.min(UNITS[target.type].hp, target.hp + 5);
        else if (c) c.fort = Math.min(maxFort(c), c.fort + 5);
        event('repair', u, cmd.to, { target: target?.id });
      } else return fail('Đơn vị không có khả năng hỗ trợ.');
      endAction(u);
      return finish();
    }
    if (cmd.type === 'board') {
      const ship = s.units.find((e) => e.id === cmd.ship);
      if (
        !ship ||
        ship.owner !== u.owner ||
        ship.type !== 'transport' ||
        isShip(u) ||
        u.moves <= 0 ||
        distance(tileAt(s, u.tile), tileAt(s, ship.tile)) > 1 ||
        cargoUsed(s, ship) + UNITS[u.type].weight > 6
      )
        return fail('Cần tàu vận tải kề bên, đủ chỗ và quân còn bước.');
      event('board', u, ship.tile);
      u.aboard = ship.id;
      u.tile = ship.tile;
      endAction(u);
      return finish();
    }
    if (cmd.type === 'land') {
      const ship = s.units.find((e) => e.id === u.aboard),
        t = tileAt(s, cmd.to);
      if (
        !ship ||
        !t ||
        !isVisible(s, u.owner, t.id) ||
        distance(tileAt(s, ship.tile), t) > 1 ||
        !passable(t) ||
        unitAt(s, t.id) ||
        (cityAt(s, t.id) && cityAt(s, t.id)!.owner !== u.owner)
      )
        return fail('Chọn ô bờ trống kề tàu để đổ bộ.');
      event('land', u, t.id);
      delete u.aboard;
      u.tile = t.id;
      u.disoriented = !hasTech(s, u.owner, 'amphibious');
      endAction(u);
      return finish();
    }
    if (cmd.type === 'upgradeUnit') {
      if (!UNIT_UPGRADES[u.type]?.includes(cmd.unitType))
        return fail('Không có đường nâng cấp này.');
      const c = s.cities.find(
        (c) =>
          c.owner === u.owner &&
          distance(tileAt(s, c.tile), tileAt(s, u.tile)) <= 1 &&
          !unitLockReason(s, u.owner, cmd.unitType) &&
          (!UNITS[cmd.unitType].facility || hasBuilding(c, UNITS[cmd.unitType].facility!)) &&
          (!['heavy_knight', 'paladin'].includes(cmd.unitType) || hasBuilding(c, 'stable')) &&
          c.stability === 0 &&
          c.job?.type !== 'found'
      );
      if (!c)
        return fail('Cần thành gần bên có công nghệ, công trình và tài nguyên tuyển loại mới.');
      if (isShip(u) !== isShip({ type: cmd.unitType }))
        return fail('Không nâng quân bộ thành tàu.');
      const cost = unitUpgradeCost(u.type, cmd.unitType);
      if (!affordable(s.resources[u.owner], cost)) return fail('Không đủ chi phí nâng quân.');
      spend(s, cost);
      u.type = cmd.unitType;
      u.hp = Math.min(u.hp, UNITS[u.type].hp);
      delete u.stance;
      u.deployed = false;
      delete u.deployedRound;
      delete u.lastFiredRound;
      endAction(u);
      return finish();
    }
  }
  if (!('city' in cmd)) return fail('Lệnh không hợp lệ.');
  const c = s.cities.find((c) => c.id === cmd.city);
  if (!c || c.owner !== s.turn) return fail('Thành này không thuộc phe đang chơi.');
  if (c.stability || c.job?.type === 'found') return fail('Thành đang ổn định hoặc xây dựng.');
  if (cmd.type === 'recruit') {
    const why = recruitReason(s, c, cmd.unitType);
    if (why) return fail(why);
    if (!recruitTiles(s, c, cmd.unitType).some((t) => t.id === cmd.to))
      return fail('Chọn ô tuyển hợp lệ tại thành hoặc nước kề cảng.');
    spend(s, UNITS[cmd.unitType].cost);
    c.recruited = true;
    addUnit(s, cmd.unitType, cmd.to, s.turn, false);
    log(s, `${c.name} tuyển ${UNITS[cmd.unitType].name}. Sẵn sàng ở lượt sau.`);
  } else if (cmd.type === 'build') {
    if (cmd.building === 'upgrade') {
      const why = upgradeReason(s, c);
      if (why) return fail(why);
      const cost = upgradeCost(s, c);
      spend(s, cost);
      c.level++;
      c.constructed = true;
      log(s, `${c.name} lên cấp ${c.level}; mở thêm chỗ xây, +5 vàng/lượt.`);
    } else {
      const why = buildingReason(s, c, cmd.building);
      if (why) return fail(why);
      const b = BUILDINGS[cmd.building];
      spend(s, b.cost);
      c.buildings = buildingsFor(c).filter((id) => id !== b.requires);
      c.specialty = null;
      c.buildings.push(cmd.building);
      c.constructed = true;
      if (cmd.building === 'wall') c.fort = Math.min(maxFort(c), c.fort + 20);
      log(s, `${c.name}: hoàn tất ${b.name}.`);
    }
  } else if (cmd.type === 'repair') {
    const why = repairReason(s, c);
    if (why) return fail(why);
    spend(s, REPAIR_COST);
    c.fort = Math.min(maxFort(c), c.fort + BALANCE.cityRepair);
    c.repaired = true;
  }
  return finish();
}
