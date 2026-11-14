import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import {
  type Command,
  createClassicGame as createGame,
  execute,
  foundingReason,
  previewAttack,
  reachable,
  type State,
  tileAt,
} from '../src/game/engine';
import {
  currentVision,
  isExplored,
  isVisible,
  observe,
  refreshKnowledge,
} from '../src/game/visibility';
import { loadGame, parseSave, SAVE_KEY } from '../src/persistence/save';
function apply(s: State, c: Command) {
  const r = execute(s, c);
  assert.equal(r.error, undefined, r.error);
  return r.state;
}
function round(s: State) {
  return apply(apply(s, { type: 'end' }), { type: 'end' });
}
function firstStep() {
  const s = createGame();
  return apply(s, { type: 'move', unit: s.units[0].id, to: '-7,3' });
}

test('new games show the home area only, with independent vision per faction', () => {
  const s = createGame(),
    view = observe(s, 'player');
  assert.ok(s.knowledge.player.visible.length > 0 && s.knowledge.player.explored.length < 50);
  assert.equal(view.units.length, 1);
  assert.equal(view.units[0].owner, 'player');
  assert.deepEqual(
    view.cities.map((c) => c.name),
    ['Hải Vân']
  );
  assert.equal(tileAt(view, '10,-4').terrain, 'unknown');
  assert.equal(tileAt(view, '10,-4').height, 0);
  assert.equal(isVisible(s, 'player', '10,-4'), false);
  assert.equal(isVisible(s, 'enemy', '10,-4'), true);
  assert.equal(view.resources.enemy.gold, 0);
  assert.deepEqual(view.technologies.enemy, []);
});
test('movement reveals a new village at the edge of sight', () => {
  const before = createGame();
  assert.equal(
    observe(before, 'player').cities.some((c) => c.tile === '-5,3'),
    false
  );
  const after = firstStep();
  assert.ok(after.knowledge.player.explored.length > before.knowledge.player.explored.length);
  assert.equal(isVisible(after, 'player', '-5,3'), true);
  assert.equal(observe(after, 'player').cities.find((c) => c.tile === '-5,3')?.name, 'Đồng Cỏ');
});
test('retreat keeps terrain and last-seen village data, without revealing hidden upgrades or captures', () => {
  let s = round(firstStep());
  s = apply(s, { type: 'move', unit: s.units[0].id, to: '-8,4' });
  assert.equal(isVisible(s, 'player', '-5,3'), false);
  assert.equal(isExplored(s, 'player', '-5,3'), true);
  const actual = s.cities.find((c) => c.tile === '-5,3')!;
  actual.owner = 'enemy';
  actual.level = 3;
  actual.fort = 40;
  refreshKnowledge(s);
  const stale = observe(s, 'player').cities.find((c) => c.id === actual.id)!;
  assert.equal(stale.owner, null);
  assert.equal(stale.level, 1);
  assert.equal(stale.fort, 0);
  s = round(s);
  s = apply(s, { type: 'move', unit: s.units[0].id, to: '-7,3' });
  const fresh = observe(s, 'player').cities.find((c) => c.id === actual.id)!;
  assert.equal(fresh.owner, 'enemy');
  assert.equal(fresh.level, 3);
  assert.equal(fresh.fort, 40);
});
test('enemy units disappear immediately when leaving sight and never become stale unit markers', () => {
  const s = firstStep();
  const enemy = s.units.find((u) => u.owner === 'enemy')!;
  enemy.tile = '-5,3';
  refreshKnowledge(s);
  assert.ok(observe(s, 'player').units.some((u) => u.id === enemy.id));
  enemy.tile = '3,0';
  enemy.hp = 1;
  refreshKnowledge(s);
  assert.equal(
    observe(s, 'player').units.some((u) => u.owner === 'enemy'),
    false
  );
  assert.ok(!Object.hasOwn(s.knowledge.player, 'units'));
});
test('hidden attacks reveal no HP or fortification information and cannot execute', () => {
  const s = createGame(),
    unit = s.units[0];
  const p = previewAttack(s, unit, '10,-4');
  assert.equal(p.legal, false);
  assert.equal(p.defenderHP, null);
  assert.equal(p.damage, 0);
  assert.equal(p.fortDamage, 0);
  assert.equal(p.capture, false);
  const r = execute(s, { type: 'attack', unit: unit.id, to: '10,-4' });
  assert.match(r.error!, /tầm nhìn/);
  assert.equal(r.state, s);
});
test('move highlighting and forged move commands cannot probe uncharted terrain', () => {
  const s = createGame(),
    u = s.units[0];
  assert.ok([...reachable(s, u).keys()].every((id) => isVisible(s, 'player', id)));
  const r = execute(s, { type: 'move', unit: u.id, to: '0,0' });
  assert.ok(r.error);
  assert.equal(r.state, s);
  const changed = structuredClone(s);
  tileAt(changed, '0,0').terrain = 'mountain';
  tileAt(changed, '0,0').height = 9;
  assert.deepEqual(observe(changed, 'player'), observe(s, 'player'));
  assert.deepEqual([...reachable(changed, changed.units[0])], [...reachable(s, u)]);
});
test('every intermediate movement step contributes permanent exploration', () => {
  const s = createGame(),
    u = s.units[0];
  u.type = 'scout';
  u.moves = 3;
  for (const t of s.tiles)
    if (t.q >= -12 && t.q <= -1 && t.r >= -1 && t.r <= 11) t.terrain = 'grass';
  refreshKnowledge(s);
  const before = new Set(s.knowledge.player.explored);
  const route = reachable(s, u).get('-5,7')!;
  assert.ok(route?.path.length === 3);
  const expected = new Set(before);
  const probe = structuredClone(s);
  for (const id of route.path) {
    probe.units[0].tile = id;
    for (const seen of currentVision(probe, 'player')) expected.add(seen);
  }
  const after = apply(s, { type: 'move', unit: u.id, to: '-5,7' });
  assert.ok([...expected].every((id) => isExplored(after, 'player', id)));
  assert.ok(
    after.knowledge.player.explored.some(
      (id) => !before.has(id) && !isVisible(after, 'player', id)
    ),
    'side areas seen while moving stay remembered'
  );
});
test('destroying a forward scout removes its current vision but preserves explored terrain', () => {
  const s = createGame();
  s.units[0].tile = '0,0';
  refreshKnowledge(s);
  assert.ok(isVisible(s, 'player', '1,0'));
  s.units = s.units.filter((u) => u.owner !== 'player');
  refreshKnowledge(s);
  assert.equal(isVisible(s, 'player', '1,0'), false);
  assert.equal(isExplored(s, 'player', '1,0'), true);
  assert.ok(isVisible(s, 'player', '-9,4'));
});
test('the former owner remembers losing a village even when capture removes its last vision source', () => {
  let s = createGame();
  s.units[0].tile = '0,0';
  s.units[1].tile = '-8,4';
  s.cities[0].fort = 0;
  s.turn = 'enemy';
  refreshKnowledge(s);
  s = apply(s, { type: 'attack', unit: s.units[1].id, to: '-9,4' });
  assert.equal(s.winner, 'enemy');
  assert.equal(isVisible(s, 'player', '-9,4'), false);
  assert.equal(observe(s, 'player').cities.find((c) => c.id === 'c1')?.owner, 'enemy');
});
test('AI decisions do not depend on unseen opposing towns, units, stocks or research', () => {
  const a = createGame();
  a.turn = 'enemy';
  refreshKnowledge(a);
  const b = structuredClone(a);
  b.units[0].tile = '-12,5';
  b.cities[0].tile = '-10,7';
  b.cities[0].level = 3;
  b.cities[0].fort = 40;
  b.serial += 50;
  b.cities.push({ ...b.cities[0], id: 'hidden-fort', tile: '-12,-5' });
  b.resources.player.gold = 9999;
  b.technologies.player = ['basic_agriculture'];
  tileAt(b, '0,0').terrain = 'mountain';
  refreshKnowledge(b);
  assert.deepEqual(observe(a, 'enemy'), observe(b, 'enemy'));
  assert.deepEqual(nextAICommand(a), nextAICommand(b));
});
test('AI actively explores when there are no known enemy or neutral targets', () => {
  let s = createGame();
  s = apply(s, { type: 'end' });
  assert.equal(observe(s, 'enemy').cities.length, 1);
  const count = s.knowledge.enemy.explored.length;
  const c = nextAICommand(s);
  assert.equal(c.type, 'move');
  s = apply(s, c);
  assert.ok(s.knowledge.enemy.explored.length > count);
});
test('observation is detached from mutable own and enemy world data', () => {
  const s = createGame(),
    v = observe(s, 'player');
  v.resources.player.gold = 0;
  v.units[0].hp = 1;
  v.knowledge.player.explored.length = 0;
  assert.equal(s.resources.player.gold, 20);
  assert.equal(s.units[0].hp, 10);
  assert.ok(s.knowledge.player.explored.length > 0);
});
test('fog and last-seen data round-trip with research; old schemas are ignored', () => {
  let s = firstStep();
  s = apply(s, { type: 'research', technology: 'basic_agriculture' });
  s = round(s);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  const old = { ...s, version: 3, knowledge: undefined };
  assert.equal(parseSave(JSON.stringify(old)), null);
  const storage = new Map([['nation-prototype-v3', JSON.stringify(old)]]);
  const loaded = loadGame({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
  });
  assert.equal(loaded.state, null);
  assert.equal(storage.has(SAVE_KEY), false);
});
test('invalid or forged visibility cannot enter a saved game', () => {
  const s = createGame();
  s.knowledge.player.visible.push('10,-4');
  s.knowledge.player.explored.push('10,-4');
  assert.equal(parseSave(JSON.stringify(s)), null);
  const bad = createGame();
  bad.knowledge.player.explored.push('999,999');
  assert.equal(parseSave(JSON.stringify(bad)), null);
});
test('founding requires a surveyed area, so it cannot be used to probe hidden towns', () => {
  const a = createGame();
  a.resources.player = { gold: 500, food: 500, wood: 500, stone: 500 };
  const b = structuredClone(a);
  b.cities.push({ ...b.cities[1], id: 'secret', tile: '-5,4' });
  refreshKnowledge(b);
  assert.equal(isVisible(a, 'player', '-7,4'), true);
  assert.equal(isVisible(a, 'player', '-5,4'), false);
  assert.equal(foundingReason(a, '-7,4'), foundingReason(b, '-7,4'));
  assert.match(foundingReason(a, '-7,4')!, /khảo sát/);
});
