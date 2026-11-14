import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import { explorationPath, explorationRoutes, visiblePathDestination } from '../src/ai/exploration';
import {
  createClassicGame,
  createGame,
  distance,
  execute,
  tileAt,
  type Unit,
  UNITS,
} from '../src/game/engine';
import { isVisible, observe, refreshKnowledge } from '../src/game/visibility';

function arena(type: Unit['type'] = 'clubman') {
  const s = createClassicGame();
  s.turn = 'enemy';
  s.units = s.units.filter((u) => u.owner === 'enemy');
  const u = s.units[0];
  u.type = type;
  u.tile = '0,0';
  u.hp = UNITS[type].hp;
  u.moves = UNITS[type].moves;
  s.cities = s.cities.slice(1, 2);
  s.cities[0].tile = '0,1';
  for (const t of s.tiles) {
    t.terrain = 'grass';
    t.height = 0.22;
  }
  refreshKnowledge(s);
  return s;
}
test('a one-move explorer uses a grass detour instead of planning an impossible forest entry', () => {
  const s = arena();
  tileAt(s, '1,0').terrain = 'forest';
  refreshKnowledge(s);
  const v = observe(s, 'enemy'),
    u = v.units[0],
    routes = explorationRoutes(v, u);
  assert.equal(routes.has('1,0'), false);
  assert.ok(routes.has('2,0'));
  assert.ok(routes.get('2,0')!.path.every((id) => id !== '1,0'));
  const to = visiblePathDestination(v, u, routes.get('2,0')!.path);
  assert.ok(to);
  assert.equal(execute(s, { type: 'move', unit: u.id, to }).error, undefined);
  u.type = 'archer';
  u.moves = 2;
  assert.equal(explorationRoutes(v, u).get('1,0')?.cost, 2);
});
test('frontier navigation uses charted land but executes only visible affordable steps', () => {
  const s = arena('scout'),
    v = observe(s, 'enemy'),
    u = v.units[0],
    routes = explorationRoutes(v, u),
    path = explorationPath(v, u, routes);
  assert.ok(path);
  const to = visiblePathDestination(v, u, path);
  assert.ok(to);
  assert.ok(isVisible(s, 'enemy', to));
  assert.equal(execute(s, { type: 'move', unit: u.id, to }).error, undefined);
  const none = structuredClone(v);
  for (const t of none.tiles) if (t.terrain === 'unknown') t.terrain = 'grass';
  assert.equal(explorationPath(none, u, routes), undefined);
  assert.ok([...routes.keys()].every((id) => v.knowledge.enemy.explored.includes(id)));
});
test('opening exploration makes inward progress without knowing hidden opponents', () => {
  for (let seed = 0; seed < 10; seed++) {
    const s = createGame({ seed: `explore-${seed}` });
    s.turn = 'enemy';
    refreshKnowledge(s);
    const u = s.units.find((u) => u.owner === 'enemy')!,
      cmd = nextAICommand(s);
    assert.equal(cmd.type, 'move');
    if (cmd.type !== 'move') throw new Error('Expected exploration');
    assert.ok(
      distance(tileAt(s, cmd.to), { q: 0, r: 0 }) < distance(tileAt(s, u.tile), { q: 0, r: 0 })
    );
    assert.equal(execute(s, cmd).error, undefined);
    const changed = structuredClone(s);
    const hidden = changed.units.find((u) => u.owner === 'player')!;
    hidden.tile = '-15,-11';
    changed.resources.player.gold = 9999;
    tileAt(changed, '-15,-10').terrain = 'mountain';
    refreshKnowledge(changed);
    assert.deepEqual(observe(changed, 'enemy'), observe(s, 'enemy'));
    assert.deepEqual(nextAICommand(changed), cmd);
  }
});
test('scouts survey instead of wasting their actions on a fortified empty town', () => {
  const s = arena('scout');
  s.cities.push({ ...s.cities[0], id: 'foe', owner: 'player', tile: '1,0', fort: 20 });
  refreshKnowledge(s);
  const cmd = nextAICommand(s);
  assert.notEqual(cmd.type, 'attack');
  assert.equal(execute(s, cmd).error, undefined);
  s.cities[1].fort = 0;
  refreshKnowledge(s);
  const capture = nextAICommand(s);
  assert.equal(capture.type, 'attack');
  if (capture.type === 'attack') assert.equal(capture.to, '1,0');
  s.cities[1].tile = '2,0';
  refreshKnowledge(s);
  const approach = nextAICommand(s);
  assert.equal(approach.type, 'move');
  const advanced = execute(s, approach);
  assert.equal(advanced.error, undefined);
  assert.equal(nextAICommand(advanced.state).type, 'attack');
});
test('an old saved map uses the new explorer without resetting state or depending on new layout', () => {
  let s = createClassicGame();
  s = execute(s, { type: 'end' }).state;
  const c = nextAICommand(s),
    r = execute(s, c);
  assert.equal(r.error, undefined);
  assert.ok(r.state.knowledge.enemy.explored.length > s.knowledge.enemy.explored.length);
});
