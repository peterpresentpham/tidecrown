import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import { RECRUITABLE_UNITS, TECHNOLOGIES, type TechnologyId } from '../src/data/technologies';
import { UNIT_TECH } from '../src/data/units';
import {
  type Command,
  createClassicGame,
  economy,
  execute,
  income,
  recruitTiles,
  researchPreview,
  researchReason,
  type State,
  unitLockReason,
  UNITS,
  upgradeCost,
} from '../src/game/engine';
import { BACKUP_KEY, loadGame, parseSave, SAVE_KEY } from '../src/persistence/save';

const apply = (s: State, c: Command) => {
  const r = execute(s, c);
  assert.equal(r.error, undefined, r.error);
  return r.state;
};
const round = (s: State) => apply(apply(s, { type: 'end' }), { type: 'end' });
function rich() {
  const s = createClassicGame();
  s.resources.player = { gold: 10000, food: 10000, wood: 10000, stone: 10000 };
  return s;
}
function unlock(s: State, id: TechnologyId): State {
  for (const req of TECHNOLOGIES[id].requires)
    if (!s.technologies.player.includes(req)) s = unlock(s, req);
  if (s.technologies.player.includes(id)) return s;
  s = apply(s, { type: 'research', technology: id });
  for (let i = 0; i < TECHNOLOGIES[id].turns; i++) s = round(s);
  return s;
}
test('opening retains four resources, upkeep and the basic soldier', () => {
  const s = createClassicGame();
  assert.deepEqual(s.resources.player, { gold: 20, food: 16, wood: 5, stone: 12 });
  assert.deepEqual(economy(s, 'player'), {
    production: { gold: 5, food: 3, wood: 1, stone: 3 },
    upkeep: { gold: 1, food: 2, wood: 1, stone: 1 },
    net: { gold: 4, food: 1, wood: 0, stone: 2 },
  });
});
test('all 45 nodes can be researched in the same match, with no exclusive branch or doctrine', () => {
  let s = rich();
  assert.equal(Object.keys(TECHNOLOGIES).length, 45);
  for (const id of Object.keys(TECHNOLOGIES) as TechnologyId[]) s = unlock(s, id);
  assert.equal(s.technologies.player.length, 45);
  assert.ok(
    s.technologies.player.includes('heavy_infantry') &&
      s.technologies.player.includes('marksman') &&
      s.technologies.player.includes('amphibious')
  );
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
test('all 23 recruits are real definitions and locked by their technology', () => {
  const s = rich();
  assert.equal(RECRUITABLE_UNITS.length, 23);
  for (const type of RECRUITABLE_UNITS) {
    assert.ok(UNITS[type]);
    if (type !== 'clubman') {
      assert.ok(UNIT_TECH[type]);
      assert.match(unitLockReason(s, 'player', type)!, /Cần nghiên cứu/);
      assert.ok(
        execute(s, { type: 'recruit', city: s.cities[0].id, unitType: type, to: s.cities[0].tile })
          .error
      );
    }
  }
});
test('research pays once, rejects invalid/parallel commands atomically, and advances only on own turns', () => {
  let s = rich();
  const before = s.resources.player.gold;
  s = apply(s, { type: 'research', technology: 'basic_agriculture' });
  assert.equal(s.resources.player.gold, before - 5);
  assert.equal(s.research.player?.remaining, 1);
  assert.equal(execute(s, { type: 'research', technology: 'basic_woodworking' }).state, s);
  const enemy = apply(s, { type: 'end' });
  assert.equal(enemy.research.player?.remaining, 1);
  s = apply(enemy, { type: 'end' });
  assert.equal(s.research.player, null);
  assert.equal(execute(s, { type: 'research', technology: 'basic_agriculture' }).state, s);
  assert.ok(execute(s, { type: 'research', technology: 'trebuchets' }).error);
});
test('research alone does not silently upgrade units; basic woodworking supplies its documented base wood', () => {
  let s = rich();
  const before = s.units[0].hp,
    net = income(s, 'player');
  s = unlock(s, 'heavy_infantry');
  s = unlock(s, 'marksman');
  assert.equal(s.units[0].type, 'clubman');
  assert.equal(s.units[0].hp, before);
  assert.deepEqual(income(s, 'player'), { ...net, wood: net.wood + 1 });
  assert.equal(upgradeCost(s, s.cities[0]).food, 50);
  s = unlock(s, 'advanced_agriculture');
  assert.equal(upgradeCost(s, s.cities[0]).food, 40);
});
test('crossbows and siege have cross-branch prerequisite chains, not alternative locks', () => {
  let s = rich();
  s = unlock(s, 'crossbows');
  assert.ok(s.technologies.player.includes('advanced_woodworking'));
  assert.ok(s.technologies.player.includes('basic_metalworking'));
  assert.equal(unitLockReason(s, 'player', 'crossbow'), null);
  assert.ok(unitLockReason(s, 'player', 'ballista'));
  s = unlock(s, 'catapults');
  assert.ok(researchReason(s, 'player', 'trebuchets'));
  s = unlock(s, 'trebuchets');
  assert.equal(s.technologies.player.includes('ballistas'), false);
});
test('facilities are enforced by the engine and research forecast uses current territory', () => {
  let s = unlock(rich(), 'spearmen');
  const c = s.cities[0],
    to = recruitTiles(s, c)[0].id;
  assert.match(execute(s, { type: 'recruit', city: c.id, unitType: 'spear', to }).error!, /Lò rèn/);
  s = apply(s, { type: 'build', city: c.id, building: 'forge' });
  s = apply(s, { type: 'recruit', city: c.id, unitType: 'spear', to });
  assert.equal(s.units.at(-1)!.moves, 0);
  const preview = researchPreview(s, 'player', 'basic_agriculture');
  const next = structuredClone(s);
  next.technologies.player.push('basic_agriculture');
  assert.deepEqual(preview.after, income(next, 'player'));
});
test('economy buildings coexist and technologies unlock tangible construction', () => {
  let s = unlock(rich(), 'commerce');
  s = unlock(s, 'basic_woodworking');
  s = unlock(s, 'granary');
  const before = income(s, 'player');
  s = apply(s, { type: 'build', city: 'c1', building: 'farm' });
  s = round(s);
  s = apply(s, { type: 'build', city: 'c1', building: 'granary' });
  s = round(s);
  s = apply(s, { type: 'build', city: 'c1', building: 'market' });
  assert.ok(s.cities[0].buildings?.includes('farm') && s.cities[0].buildings?.includes('market'));
  assert.equal(income(s, 'player').food, before.food + 6);
  assert.equal(income(s, 'player').gold, before.gold + 4);
});
test('research and complete branch combinations persist without another payment', () => {
  let s = unlock(rich(), 'heavy_infantry');
  s = unlock(s, 'marksman');
  s = apply(s, { type: 'research', technology: 'recon' });
  const saved = parseSave(JSON.stringify(s));
  assert.deepEqual(saved, s);
  const gold = s.resources.player.gold;
  s = round(saved!);
  assert.equal(s.resources.player.gold, gold + income(s, 'player').gold);
});
test('invalid saves are rejected but full tree combinations are accepted', () => {
  assert.equal(parseSave('{broken'), null);
  const s = rich();
  s.resources.player.gold = -1;
  assert.equal(parseSave(JSON.stringify(s)), null);
  const t = rich();
  t.technologies.player = ['marksman'];
  assert.equal(parseSave(JSON.stringify(t)), null);
});
test('AI develops facilities and legal mixed armies over a campaign', () => {
  let s = createClassicGame();
  for (let i = 0; i < 18 && !s.winner; i++) {
    s = apply(s, { type: 'end' });
    let steps = 0;
    while (s.turn !== 'player' && !s.winner) {
      assert.ok(++steps < 120);
      s = apply(s, nextAICommand(s));
    }
  }
  assert.ok(s.technologies.enemy.length >= 5);
  assert.ok(s.units.some((u) => u.owner === 'enemy' && u.type !== 'clubman'));
});
test('corrupt browser saves are backed up or overwriting is disabled', () => {
  const storage = new Map([[SAVE_KEY, 'broken']]);
  const loaded = loadGame({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
  });
  assert.equal(loaded.state, null);
  assert.equal(storage.get(`${BACKUP_KEY}-invalid`), 'broken');
  const blocked = loadGame({
    getItem: () => '{bad',
    setItem: () => {
      throw new Error('quota');
    },
  });
  assert.equal(blocked.canSave, false);
});

test('military paths require relevant skills instead of unrelated unit branches', () => {
  const ancestors = (id: TechnologyId): TechnologyId[] =>
    TECHNOLOGIES[id].requires.flatMap((req) => [req, ...ancestors(req)]);
  const exclusions: Partial<Record<TechnologyId, TechnologyId[]>> = {
    mounted_archery: ['rangers', 'forestry', 'recon'],
    knights: ['swords', 'spearmen', 'recon'],
    paladins: ['heavy_infantry'],
    swords: ['spearmen'],
    advanced_woodworking: ['forestry'],
    engineering: ['siege', 'siege_logistics', 'walls'],
    irrigation: ['siege', 'spearmen'],
    roads: ['commerce'],
  };
  for (const [id, unrelated] of Object.entries(exclusions))
    for (const req of unrelated)
      assert.ok(!ancestors(id as TechnologyId).includes(req), `${id} must not require ${req}`);
  assert.deepEqual(TECHNOLOGIES.mounted_archery.requires, ['light_cavalry', 'archery']);
  let s = unlock(rich(), 'engineering');
  assert.equal(s.technologies.player.includes('siege'), false);
  assert.equal(unitLockReason(s, 'player', 'engineer'), null);
  s = apply(s, { type: 'build', city: 'c1', building: 'workshop' });
  s = apply(s, {
    type: 'recruit',
    city: 'c1',
    unitType: 'engineer',
    to: recruitTiles(s, s.cities[0])[0].id,
  });
  assert.equal(s.units.at(-1)?.type, 'engineer');
});
