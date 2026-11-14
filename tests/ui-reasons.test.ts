import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, execute, improvementReason, distance, tileAt, type State } from '../src/game/engine';
import { commandBlock, improvementAvailability, unitActionBlock, WAIT_FOR_TURN } from '../src/ui/actionReasons';

const home = (s: State) => s.cities.find(c => c.owner === 'player')!;

test('management reasons are the engine errors and dry-runs never mutate the game', () => {
  const s = createGame({ seed: 'reasons-1', aiCount: 1, difficulty: 'medium' }), before = structuredClone(s), city = home(s);
  for (const cmd of [{ type: 'build', city: city.id, building: 'upgrade' }, { type: 'repair', city: city.id }] as const)
    assert.equal(commandBlock(s, cmd), execute(s, cmd).error ?? null);
  assert.deepEqual(s, before);
  s.resources.player = { gold: 0, food: 0, wood: 0, stone: 0 };
  assert.equal(commandBlock(s, { type: 'build', city: city.id, building: 'upgrade' }), execute(s, { type: 'build', city: city.id, building: 'upgrade' }).error);
  assert.ok(commandBlock(s, { type: 'build', city: city.id, building: 'upgrade' }));
});

test('outside the player turn every management action explains that it waits for the turn', () => {
  const s = execute(createGame({ seed: 'reasons-2', aiCount: 1, difficulty: 'medium' }), { type: 'end' }).state, city = home(s);
  assert.equal(commandBlock(s, { type: 'repair', city: city.id }), WAIT_FOR_TURN);
  assert.deepEqual(improvementAvailability(s, city, 'road'), { ready: false, reason: WAIT_FOR_TURN });
});

test('an improvement is ready exactly when some tile near the city passes improvementReason', () => {
  const s = createGame({ seed: 'reasons-3', aiCount: 1, difficulty: 'medium' }), city = home(s);
  for (const kind of ['road', 'farm', 'mine', 'lumber', 'quarry'] as const) {
    const around = s.tiles.filter(t => distance(t, tileAt(s, city.tile)) <= 2);
    const anyLegal = around.some(t => !improvementReason(s, { type: 'improve', city: city.id, improvement: kind, tile: t.id }));
    const result = improvementAvailability(s, city, kind);
    assert.equal(result.ready, anyLegal, kind);
    if (!anyLegal) assert.ok(around.some(t => improvementReason(s, { type: 'improve', city: city.id, improvement: kind, tile: t.id }) === result.reason), `${kind}: reason must be an engine reason`);
  }
});

test('unit action reasons prioritise end of game, turn, animation, then spent unit', () => {
  assert.equal(unitActionBlock({ yourTurn: true, acted: false, busy: false, finished: false }), null);
  assert.match(unitActionBlock({ yourTurn: true, acted: true, busy: false, finished: false })!, /Đã hành động/);
  assert.match(unitActionBlock({ yourTurn: true, acted: true, busy: true, finished: false })!, /hoạt ảnh/);
  assert.equal(unitActionBlock({ yourTurn: false, acted: true, busy: true, finished: false }), WAIT_FOR_TURN);
  assert.match(unitActionBlock({ yourTurn: true, acted: false, busy: false, finished: true })!, /kết thúc/);
});
