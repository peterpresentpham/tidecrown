// Development-only measurement fixtures (not imported by the game). They build ordinary saves with
// extra armies so the browser benchmark can load the same scene for every run. Rules are untouched.
import {
  canOccupy,
  cityAt,
  createGame,
  distance,
  type FactionId,
  type State,
  tileAt,
  unitAt,
  UNITS,
  type UnitType,
} from '../../src/game/engine';
import { refreshKnowledge } from '../../src/game/visibility';
import { parseSave } from '../../src/persistence/save';

const MIX: UnitType[] = [
  'clubman',
  'spear',
  'archer',
  'swordsman',
  'light_cavalry',
  'shield',
  'crossbow',
  'knight',
  'pikeman',
  'catapult',
];

function place(
  s: State,
  owner: FactionId,
  around: string,
  count: number,
  minDistance = 1,
  maxDistance = 6
) {
  const center = tileAt(s, around);
  const free = s.tiles
    .filter((t) => {
      const d = distance(t, center);
      return d >= minDistance && d <= maxDistance;
    })
    .sort((a, b) => distance(a, center) - distance(b, center) || a.id.localeCompare(b.id));
  let placed = 0;
  for (const t of free) {
    if (placed >= count) break;
    const type = MIX[(placed + s.units.length) % MIX.length];
    if (unitAt(s, t.id) || cityAt(s, t.id) || !canOccupy(s, { type, owner }, t)) continue;
    s.units.push({
      id: `perf-${owner}-${placed}`,
      type,
      owner,
      tile: t.id,
      hp: UNITS[type].hp,
      moves: UNITS[type].moves,
      acted: false,
      moved: false,
      retaliated: false,
      activeLastTurn: false,
    });
    placed++;
  }
  if (placed < count) throw new Error(`Only placed ${placed}/${count} for ${owner}`);
}
const capital = (s: State, owner: FactionId) => s.cities.find((c) => c.owner === owner)!.tile;

/** Roadmap step-1 scenario: three AI with 10 units each, player with 5; AI armies near their own cities. */
export function aiRoundFixture(): State {
  const s = createGame({ seed: 'perf-ai-round', aiCount: 3, difficulty: 'medium' });
  s.units = s.units.filter((u) => u.owner === 'player');
  place(s, 'player', capital(s, 'player'), 5 - s.units.length);
  for (const owner of ['enemy', 'enemy2', 'enemy3'] as const)
    place(s, owner, capital(s, owner), 10);
  refreshKnowledge(s);
  return s;
}

/** 60 units in one visible area around the player's capital, to stress rendering and combat playback. */
export function battle60Fixture(): State {
  const s = createGame({ seed: 'perf-battle-60', aiCount: 3, difficulty: 'medium' });
  const home = capital(s, 'player');
  s.units = s.units.filter((u) => u.owner === 'player');
  place(s, 'player', home, 20 - s.units.length, 1, 3);
  for (const owner of ['enemy', 'enemy2', 'enemy3'] as const)
    place(s, owner, home, owner === 'enemy3' ? 14 : 13, 3, 7);
  refreshKnowledge(s);
  return s;
}

export function serialize(s: State) {
  const raw = JSON.stringify(s);
  if (!parseSave(raw)) throw new Error('Fixture is not a valid save');
  return raw;
}

/** Player to move; one legal capture of the last enemy city wins the match. */
export function winFixture(): State {
  const s = createGame({ seed: 'perf-win', aiCount: 1, difficulty: 'medium' });
  const target = s.cities.find((c) => c.owner === 'enemy')!;
  for (const c of s.cities) if (c.owner === 'enemy' && c !== target) c.owner = null;
  target.fort = 0;
  s.units = s.units.filter((u) => u.owner === 'player');
  const spot = s.tiles.find(
    (t) =>
      distance(t, tileAt(s, target.tile)) === 1 &&
      !cityAt(s, t.id) &&
      canOccupy(s, { type: 'swordsman', owner: 'player' }, t)
  )!;
  s.units = [
    {
      id: 'perf-win-attacker',
      type: 'swordsman',
      owner: 'player',
      tile: spot.id,
      hp: UNITS.swordsman.hp,
      moves: UNITS.swordsman.moves,
      acted: false,
      moved: false,
      retaliated: false,
      activeLastTurn: false,
    },
  ];
  refreshKnowledge(s);
  return s;
}

/** Player's last city is undefended next to an enemy army; ending the turn lets the AI take it. */
export function loseFixture(): State {
  const s = createGame({ seed: 'perf-lose', aiCount: 1, difficulty: 'medium' });
  const home = s.cities.find((c) => c.owner === 'player')!;
  for (const c of s.cities) if (c.owner === 'player' && c !== home) c.owner = null;
  home.fort = 0;
  s.units = s.units.filter((u) => u.owner === 'enemy');
  place(s, 'enemy', home.tile, 4, 1, 1);
  refreshKnowledge(s);
  return s;
}
