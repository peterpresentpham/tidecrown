import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityProduction,
  type Command,
  controlled,
  createClassicGame,
  execute,
  isBesieged,
  maxFort,
  previewAttack,
  reachable,
  restReason,
  type State,
  tileAt,
} from '../src/game/engine';
import { visibleThreats } from '../src/game/threats';
import { moveUndo, undoMove } from '../src/game/undo';
import { observe, refreshKnowledge } from '../src/game/visibility';
import { parseSave } from '../src/persistence/save';
import { troop } from './helpers/tacticalScenarios';
function fixture() {
  const s = createClassicGame();
  for (const t of s.tiles) {
    t.terrain = 'grass';
    t.height = 0.22;
  }
  s.cities[0].tile = '-10,0';
  s.cities[1].tile = '10,0';
  s.units = [troop('swordsman', 'a', '0,0', 'player'), troop('spear', 'd', '1,0')];
  refreshKnowledge(s);
  return s;
}
function apply(s: State, c: Command) {
  const r = execute(s, c);
  assert.equal(r.error, undefined);
  return r.state;
}
test('V2 HP-scaled preview equals execution including post-hit retaliation', () => {
  const full = fixture(),
    p = previewAttack(full, full.units[0], '1,0');
  const hit = apply(full, { type: 'attack', unit: 'a', to: '1,0' });
  assert.equal(hit.units.find((u) => u.id === 'd')?.hp, p.defenderHP);
  assert.equal(hit.units.find((u) => u.id === 'a')?.hp, p.attackerHP);
  const weak = fixture();
  weak.units[0].hp = 3;
  const q = previewAttack(weak, weak.units[0], '1,0');
  assert.ok(q.damage < p.damage);
  assert.ok(q.damage > 0);
  const strongerDefender = fixture();
  strongerDefender.units[0].type = 'scout';
  assert.ok(
    previewAttack(strongerDefender, strongerDefender.units[0], '1,0').retaliation >= p.retaliation
  );
});
test('V2 entering melee control stops movement but leaves attack available', () => {
  let s = fixture();
  s.units[0] = troop('knight', 'a', '-2,0', 'player');
  refreshKnowledge(s);
  const routes = reachable(s, s.units[0]);
  assert.ok(routes.has('0,0'));
  assert.ok(!routes.has('0,1') || routes.get('0,1')!.path.at(-1) === '0,1');
  s = apply(s, { type: 'move', unit: 'a', to: '0,0' });
  assert.equal(s.units[0].moves, 0);
  assert.equal(s.units[0].acted, false);
  assert.ok(previewAttack(s, s.units[0], '1,0').legal);
});
test('V2 hidden troops, ranged units and embarked troops do not exert control; forest blocks cavalry control', () => {
  const s = fixture(),
    u = s.units[0];
  s.units[1].type = 'archer';
  assert.equal(controlled(s, u, '0,0'), false);
  s.units[1].type = 'knight';
  tileAt(s, '0,0').terrain = 'forest';
  assert.equal(controlled(s, u, '0,0'), false);
  s.units[1].type = 'spear';
  assert.equal(controlled(s, u, '0,0'), true);
  s.units[1].aboard = 'ship';
  assert.equal(controlled(s, u, '0,0'), false);
  delete s.units[1].aboard;
  s.knowledge.player.visible = [];
  assert.equal(controlled(s, u, '0,0'), false);
});
test('V2 rest rejects contact/movement and consumes the action after healing', () => {
  let s = fixture();
  s.units[0].hp = 2;
  assert.ok(restReason(s, s.units[0]));
  s.units[1].tile = '8,0';
  refreshKnowledge(s);
  assert.equal(restReason(s, s.units[0]), null);
  s = apply(s, { type: 'rest', unit: 'a' });
  assert.equal(s.units[0].hp, 4);
  assert.ok(s.units[0].acted);
  assert.ok(execute(s, { type: 'rest', unit: 'a' }).error);
});
test('V2 siege uses non-empty land approaches and halves production, ships cannot cause land siege', () => {
  const s = fixture(),
    c = s.cities[0];
  c.tile = '0,0';
  s.units = [
    troop('spear', 'e1', '1,0'),
    troop('spear', 'e2', '-1,0'),
    troop('spear', 'e3', '0,1'),
    troop('spear', 'e4', '0,-1'),
  ];
  refreshKnowledge(s);
  assert.ok(isBesieged(s, c));
  const income = cityProduction(s, c).gold;
  s.units = [];
  assert.equal(isBesieged(s, c), false);
  assert.equal(income, Math.floor(cityProduction(s, c).gold / 2));
  for (const t of s.tiles) if (t.id !== '0,0') t.terrain = 'water';
  assert.equal(isBesieged(s, c), false);
  s.units = [troop('warship', 's1', '1,0'), troop('warship', 's2', '-1,0')];
  assert.equal(isBesieged(s, c), false);
});
test('V2 city defense scales, wall retaliation never doubles garrison reaction and siege is exempt', () => {
  const s = fixture(),
    c = s.cities[1];
  c.tile = '1,0';
  c.level = 3;
  c.buildings = ['wall'];
  c.fort = maxFort(c);
  assert.equal(c.fort, 50);
  s.units = s.units.slice(0, 1);
  refreshKnowledge(s);
  const p = previewAttack(s, s.units[0], c.tile);
  assert.equal(p.retaliation, 2);
  s.units[0].type = 'catapult';
  assert.equal(previewAttack(s, s.units[0], c.tile).retaliation, 0);
});
test('V2 multiple city shots are queued exactly once and hidden events are redacted', () => {
  let s = fixture();
  s.turn = 'enemy';
  s.units = [troop('heavy_infantry', 'target', '-9,0')];
  s.cities[0].level = 2;
  s.cities.push({ ...s.cities[0], id: 'c-extra', tile: '-9,1' });
  refreshKnowledge(s);
  s = apply(s, { type: 'end' });
  assert.equal(s.events?.filter((e) => e.kind === 'attack').length, 2);
  assert.equal(new Set(s.events?.map((e) => e.id)).size, 2);
  const view = observe(s, 'enemy2');
  assert.equal(view.events?.length, 0);
});
test('V2 undo requires identical knowledge and exact most recent command identity', () => {
  const s = fixture();
  s.units = s.units.slice(0, 1);
  s.units[0].type = 'scout';
  s.units[0].moves = 3;
  s.cities[0].tile = '2,0';
  refreshKnowledge(s);
  const cmd: Command = { type: 'move', unit: 'a', to: '1,0' };
  let after = apply(s, cmd);
  assert.equal(moveUndo(s, after, cmd), null);
  s.units.push(troop('scout', 'watch', '2,0', 'player'), troop('scout', 'rear', '-2,0', 'player'));
  refreshKnowledge(s);
  after = apply(s, cmd);
  const snapshot = moveUndo(s, after, cmd);
  assert.ok(snapshot);
  assert.deepEqual(undoMove(after, snapshot), {
    ...s,
    serial: after.serial,
    event: undefined,
    events: [],
  });
  assert.equal(undoMove(apply(after, { type: 'wait', unit: 'a' }), snapshot), null);
  assert.equal(undoMove(structuredClone(after), snapshot), null);
});
test('V2 save schema rejects V1 and preserves new state and event queue', () => {
  const s = createClassicGame();
  assert.equal(s.version, 8);
  assert.ok(parseSave(JSON.stringify(s)));
  assert.equal(parseSave(JSON.stringify({ ...s, version: 7 })), null);
  assert.equal(parseSave(JSON.stringify({ ...s, events: [{ kind: 'hidden' }] })), null);
});

test('V2 low HP preserves a meaningful fraction of damage even against heavy armor', () => {
  const s = fixture();
  s.units[1].type = 'heavy_infantry';
  s.units[1].hp = 20;
  const full = previewAttack(s, s.units[0], '1,0').damage;
  s.units[0].hp = 2;
  const hurt = previewAttack(s, s.units[0], '1,0').damage;
  assert.ok(hurt >= Math.round(full * 0.6));
  assert.ok(hurt < full);
});

test('V2 threat overlay is unchanged by hidden enemies and hidden city defenses', () => {
  const s = fixture(),
    before = visibleThreats(s);
  s.units.push(troop('trebuchet', 'hidden', '12,8'));
  s.cities[1].level = 3;
  s.cities[1].buildings = ['tower'];
  refreshKnowledge(s);
  assert.deepEqual(visibleThreats(s), before);
});
