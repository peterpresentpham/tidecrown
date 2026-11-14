import assert from 'node:assert/strict';
import test from 'node:test';

import { advanceAttack, planAttack } from '../src/game/actionPlan';
import { createClassicGame, type Unit, UNITS } from '../src/game/engine';
import { refreshKnowledge } from '../src/game/visibility';
function fixture() {
  const s = createClassicGame();
  s.cities = [];
  for (const t of s.tiles) {
    t.terrain = 'grass';
    t.height = 0.2;
  }
  const unit = (id: string, tile: string, enemy = false): Unit => ({
    id,
    tile,
    type: 'swordsman',
    owner: enemy ? 'enemy' : 'player',
    hp: 14,
    moves: 2,
    acted: false,
    moved: false,
    retaliated: false,
    activeLastTurn: false,
  });
  s.units = [unit('a', '0,0'), unit('b', '2,0', true)];
  refreshKnowledge(s);
  return s;
}
test('plan executes move then attack with legal intermediate state', () => {
  let s = fixture();
  let p = planAttack(s, 'a', '2,0');
  assert.ok(p?.path.length);
  const original = JSON.stringify(s);
  const first = advanceAttack(s, p);
  assert.notEqual(first.state, s);
  assert.equal(JSON.stringify(s), original);
  assert.equal(first.state.event?.kind, 'move');
  s = first.state;
  p = first.next;
  while (p) {
    const r = advanceAttack(s, p);
    assert.equal(r.reason, undefined);
    s = r.state;
    p = r.next;
  }
  assert.equal(s.event?.kind, 'attack');
  assert.ok(s.units.find((u) => u.id === 'b')!.hp < 14);
});
test('new visible enemy interrupts attack chain', () => {
  const s = fixture(),
    p = planAttack(s, 'a', '2,0')!;
  s.units.push({ ...s.units[1], id: 'ambush', tile: '1,1' });
  refreshKnowledge(s);
  const r = advanceAttack(s, p);
  assert.equal(r.next, null);
  assert.equal(r.state, s);
  assert.match(r.reason!, /mới/);
});
test('planner ignores hidden units and never proposes siege move and shoot', () => {
  const s = fixture(),
    before = planAttack(s, 'a', '2,0');
  s.units.push({ ...s.units[1], id: 'hidden', tile: '10,10' });
  refreshKnowledge(s);
  assert.deepEqual(planAttack(s, 'a', '2,0'), before);
  s.units[0].type = 'catapult';
  s.units[0].hp = UNITS.catapult.hp;
  s.units[1].tile = '4,0';
  refreshKnowledge(s);
  assert.equal(planAttack(s, 'a', '4,0'), null);
});

test('an enemy actually revealed by the first path step stops the queued attack', () => {
  const s = fixture();
  s.units.push({ ...s.units[1], id: 'hidden-nearby', tile: '3,1' });
  refreshKnowledge(s);
  const plan = planAttack(s, 'a', '2,0')!;
  assert.ok(!plan.seenEnemies.includes('hidden-nearby'));
  const moved = advanceAttack(s, plan);
  assert.equal(moved.state.event?.kind, 'move');
  assert.ok(moved.next);
  const stopped = advanceAttack(moved.state, moved.next!);
  assert.equal(stopped.next, null);
  assert.match(stopped.reason!, /mới/);
  assert.equal(stopped.state.units.find((u) => u.id === 'b')!.hp, 14);
});
