import { BUILDINGS, IMPROVEMENTS } from '../data/buildings';
import { TECHNOLOGIES } from '../data/technologies';
import {
  canOccupy,
  cargoUsed,
  FACTION_IDS,
  maxFort,
  passable,
  RESOURCE_KEYS,
  type State,
  UNITS,
} from '../game/engine';
import { currentVision } from '../game/visibility';

export const SAVE_KEY = 'nation-tech-v8';
export const BACKUP_KEY = 'nation-tech-v8-backup';
const factions = FACTION_IDS;
const nonnegativeInt = (x: unknown): x is number =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
/** Development snapshots are versioned; older rulesets intentionally start a new match. */
export function parseSave(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const s = data as State;
    if (
      !s.settings ||
      !['easy', 'medium', 'hard'].includes(s.settings.difficulty) ||
      ![1, 2, 3].includes(s.settings.aiCount) ||
      typeof s.settings.seed !== 'string' ||
      s.settings.seed.length < 1 ||
      s.settings.seed.length > 32 ||
      !['random', 'water', 'classic'].includes(s.settings.map)
    )
      return null;
    if (s.settings.map === 'classic' && s.settings.aiCount !== 1) return null;
    if (
      !Array.isArray(s.factions) ||
      s.factions.length !== s.settings.aiCount + 1 ||
      s.factions.some((f, i) => f !== FACTION_IDS[i]) ||
      !s.factions.includes(s.turn)
    )
      return null;
    if (
      s.version !== 8 ||
      !factions.includes(s.turn) ||
      (s.winner !== null && !s.factions.includes(s.winner)) ||
      !nonnegativeInt(s.round) ||
      s.round < 1 ||
      !nonnegativeInt(s.serial)
    )
      return null;
    if (
      !Array.isArray(s.tiles) ||
      s.tiles.length !== 825 ||
      !Array.isArray(s.units) ||
      !Array.isArray(s.cities) ||
      !Array.isArray(s.logs) ||
      !s.logs.every((l) => typeof l === 'string')
    )
      return null;
    const tiles = new Map(s.tiles.map((t) => [t.id, t]));
    if (
      tiles.size !== s.tiles.length ||
      s.tiles.some(
        (t) =>
          !Number.isInteger(t.q) ||
          !Number.isInteger(t.r) ||
          t.id !== `${t.q},${t.r}` ||
          t.q < -16 ||
          t.q > 16 ||
          t.r < -12 ||
          t.r > 12 ||
          !['grass', 'forest', 'hill', 'mountain', 'sand', 'water'].includes(t.terrain) ||
          !Number.isFinite(t.height)
      )
    )
      return null;
    for (const f of factions) {
      if (
        !s.resources?.[f] ||
        !RESOURCE_KEYS.every((k) => nonnegativeInt(s.resources[f][k])) ||
        typeof s.bankrupt?.[f] !== 'boolean'
      )
        return null;
      const done = s.technologies?.[f];
      if (
        !Array.isArray(done) ||
        new Set(done).size !== done.length ||
        done.some((t) => !Object.hasOwn(TECHNOLOGIES, t))
      )
        return null;
      if (done.some((id) => !TECHNOLOGIES[id].requires.every((req) => done.includes(req))))
        return null;
      const current = s.research?.[f];
      if (
        current !== null &&
        (!current ||
          !Object.hasOwn(TECHNOLOGIES, current.technology) ||
          !nonnegativeInt(current.remaining) ||
          current.remaining < 1 ||
          current.remaining > TECHNOLOGIES[current.technology].turns ||
          done.includes(current.technology) ||
          !TECHNOLOGIES[current.technology].requires.every((id) => done.includes(id)))
      )
        return null;
    }
    if (s.events !== undefined && (!Array.isArray(s.events) || s.events.length > 100)) return null;
    for (const e of [...(s.event ? [s.event] : []), ...(s.events ?? [])]) {
      if (
        !nonnegativeInt(e.id) ||
        e.id > s.serial ||
        !['move', 'attack', 'heal', 'repair', 'build', 'board', 'land'].includes(e.kind) ||
        !s.factions.includes(e.owner) ||
        typeof e.actor !== 'string' ||
        !tiles.has(e.from) ||
        !tiles.has(e.to) ||
        (e.actorType !== undefined && !Object.hasOwn(UNITS, e.actorType)) ||
        ![e.damage, e.retaliation, e.fortDamage].every(
          (n) => typeof n === 'number' && Number.isFinite(n)
        ) ||
        (e.path !== undefined && (!Array.isArray(e.path) || e.path.some((id) => !tiles.has(id)))) ||
        (e.dead !== undefined &&
          (!Array.isArray(e.dead) || e.dead.some((id) => typeof id !== 'string'))) ||
        (e.target !== undefined && typeof e.target !== 'string') ||
        [e.viewers, e.originViewers].some(
          (list) =>
            list !== undefined &&
            (!Array.isArray(list) || list.some((id) => !s.factions.includes(id)))
        )
      )
        return null;
    }
    const unitTiles = new Set<string>(),
      unitIds = new Set<string>(),
      cityTiles = new Set<string>(),
      cityIds = new Set<string>();
    for (const u of s.units) {
      if (
        !u ||
        !Object.hasOwn(UNITS, u.type) ||
        !s.factions.includes(u.owner) ||
        !tiles.has(u.tile) ||
        (!u.aboard && !canOccupy(s, u, tiles.get(u.tile)!)) ||
        typeof u.id !== 'string' ||
        unitIds.has(u.id) ||
        (!u.aboard && unitTiles.has(u.tile)) ||
        !nonnegativeInt(u.hp) ||
        u.hp < 1 ||
        u.hp > UNITS[u.type].hp ||
        !(typeof u.moves === 'number' && Number.isFinite(u.moves) && u.moves >= 0) ||
        u.moves > UNITS[u.type].moves
      )
        return null;
      if (![u.acted, u.moved, u.retaliated, u.activeLastTurn].every((b) => typeof b === 'boolean'))
        return null;
      if (
        (u.aboard !== undefined && typeof u.aboard !== 'string') ||
        (u.disoriented !== undefined && typeof u.disoriented !== 'boolean')
      )
        return null;
      if (
        (u.stance !== undefined && !['guard', 'brace', 'aim'].includes(u.stance)) ||
        (u.deployed !== undefined && typeof u.deployed !== 'boolean') ||
        (u.charge !== undefined && (!nonnegativeInt(u.charge) || u.charge > 100))
      )
        return null;
      if (
        [u.deployedRound, u.lastFiredRound].some(
          (n) => n !== undefined && (!nonnegativeInt(n) || n > s.round)
        )
      )
        return null;
      unitIds.add(u.id);
      if (!u.aboard) unitTiles.add(u.tile);
    }
    for (const u of s.units)
      if (u.aboard) {
        const ship = s.units.find((p) => p.id === u.aboard);
        if (
          !ship ||
          ship.type !== 'transport' ||
          ship.owner !== u.owner ||
          ship.tile !== u.tile ||
          UNITS[u.type].class === 'ship' ||
          cargoUsed(s, ship) > 6
        )
          return null;
      }
    for (const t of s.tiles) {
      if (
        (t.improvement && !Object.hasOwn(IMPROVEMENTS, t.improvement)) ||
        (t.road && !s.factions.includes(t.road)) ||
        (t.bridge && (!s.factions.includes(t.bridge) || t.terrain !== 'water'))
      )
        return null;
    }
    for (const c of s.cities) {
      if (
        !c ||
        typeof c.id !== 'string' ||
        typeof c.name !== 'string' ||
        cityIds.has(c.id) ||
        cityTiles.has(c.tile) ||
        !tiles.has(c.tile) ||
        !passable(tiles.get(c.tile)!) ||
        (c.owner !== null && !s.factions.includes(c.owner)) ||
        !nonnegativeInt(c.level) ||
        c.level < 1 ||
        c.level > 3 ||
        !nonnegativeInt(c.fort) ||
        c.fort > maxFort(c) ||
        !nonnegativeInt(c.stability) ||
        c.stability > 2 ||
        typeof c.recruited !== 'boolean' ||
        typeof c.repaired !== 'boolean' ||
        (c.specialty !== null && !Object.hasOwn(BUILDINGS, c.specialty))
      )
        return null;
      if (c.constructed !== undefined && typeof c.constructed !== 'boolean') return null;
      if (
        c.buildings !== undefined &&
        (!Array.isArray(c.buildings) ||
          new Set(c.buildings).size !== c.buildings.length ||
          c.buildings.some((b) => !Object.hasOwn(BUILDINGS, b)))
      )
        return null;
      if (
        c.job !== null &&
        ((!['upgrade', 'found'].includes(c.job.type) && !Object.hasOwn(BUILDINGS, c.job.type)) ||
          !nonnegativeInt(c.job.remaining) ||
          c.job.remaining < 1 ||
          c.job.remaining > 3)
      )
        return null;
      cityIds.add(c.id);
      cityTiles.add(c.tile);
    }
    for (const f of factions) {
      const k = s.knowledge?.[f];
      if (
        !k ||
        !Array.isArray(k.explored) ||
        !Array.isArray(k.visible) ||
        !k.cities ||
        typeof k.cities !== 'object' ||
        !k.tiles ||
        typeof k.tiles !== 'object'
      )
        return null;
      if (
        new Set(k.explored).size !== k.explored.length ||
        new Set(k.visible).size !== k.visible.length ||
        k.explored.some((id) => !tiles.has(id)) ||
        k.visible.some((id) => !k.explored.includes(id))
      )
        return null;
      for (const [id, t] of Object.entries(k.tiles))
        if (
          !t ||
          t.id !== id ||
          !tiles.has(id) ||
          !k.explored.includes(id) ||
          !Number.isInteger(t.q) ||
          !Number.isInteger(t.r) ||
          id !== `${t.q},${t.r}` ||
          !['grass', 'forest', 'hill', 'mountain', 'sand', 'water'].includes(t.terrain) ||
          !Number.isFinite(t.height) ||
          (t.improvement !== undefined && !Object.hasOwn(IMPROVEMENTS, t.improvement)) ||
          (t.road !== undefined && !s.factions.includes(t.road)) ||
          (t.bridge !== undefined && (!s.factions.includes(t.bridge) || t.terrain !== 'water'))
        )
          return null;
      const expected = currentVision(s, f);
      if (expected.length !== k.visible.length || expected.some((id) => !k.visible.includes(id)))
        return null;
      for (const [id, m] of Object.entries(k.cities)) {
        if (
          m.buildings !== undefined &&
          (!Array.isArray(m.buildings) || m.buildings.some((b) => !Object.hasOwn(BUILDINGS, b)))
        )
          return null;
        if (
          !m ||
          m.id !== id ||
          typeof m.name !== 'string' ||
          !tiles.has(m.tile) ||
          !k.explored.includes(m.tile) ||
          !s.cities.some((c) => c.id === id && c.tile === m.tile) ||
          (m.owner !== null && !factions.includes(m.owner)) ||
          !nonnegativeInt(m.level) ||
          m.level < 1 ||
          m.level > 3 ||
          !nonnegativeInt(m.fort) ||
          m.fort > 50 ||
          !nonnegativeInt(m.seenRound) ||
          m.seenRound < 1 ||
          m.seenRound > s.round
        )
          return null;
      }
    }
    return s;
  } catch {
    return null;
  }
}

export function loadGame(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  try {
    const current = storage.getItem(SAVE_KEY);
    const raw = current;
    if (!raw) return { state: null, canSave: true, warning: null };
    const state = parseSave(raw);
    if (state) return { state, canSave: true, warning: null };
    try {
      storage.setItem(`${BACKUP_KEY}-invalid`, raw);
      return {
        state: null,
        canSave: true,
        warning: 'Ván lưu không hợp lệ. Đã giữ bản cũ trong backup và mở ván mới.',
      };
    } catch {
      return {
        state: null,
        canSave: false,
        warning: 'Ván lưu không đọc được; bản cũ vẫn được giữ. Tạm tắt tự lưu để tránh ghi đè.',
      };
    }
  } catch {
    return {
      state: null,
      canSave: false,
      warning: 'Trình duyệt không cho phép lưu cục bộ. Bạn vẫn có thể chơi ván này.',
    };
  }
}
