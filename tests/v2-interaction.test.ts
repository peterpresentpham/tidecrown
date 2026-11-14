import assert from 'node:assert/strict';
import test from 'node:test';

import { type ActionEvent, createClassicGame, execute } from '../src/game/engine';
import { moveUndo, undoMove } from '../src/game/undo';
import { refreshKnowledge } from '../src/game/visibility';
import { World } from '../src/render/World';
import { requiresConfirmation, TapGesture } from '../src/ui/interaction';
import { troop } from './helpers/tacticalScenarios';

const pointer = (pointerId: number, clientX = 0, clientY = 0) => ({
  pointerId,
  clientX,
  clientY,
  button: 0,
});
test('tap differs from pinch, cancelled input and a drag that returns to its origin', () => {
  const t = new TapGesture();
  t.down(pointer(1));
  assert.ok(t.up(pointer(1)));
  t.down(pointer(1));
  t.down(pointer(2, 20));
  assert.equal(t.up(pointer(2, 20)), false);
  assert.equal(t.up(pointer(1)), false);
  t.down(pointer(1));
  t.move(pointer(1, 12));
  t.move(pointer(1));
  assert.equal(t.up(pointer(1)), false);
  t.down(pointer(1));
  t.cancel();
  assert.equal(t.up(pointer(1)), false);
  t.down(pointer(3));
  assert.ok(t.up(pointer(3)));
});
test('friendly city ground confirms movement while its label and friendly troops stay selectable', () => {
  assert.ok(requiresConfirmation(false, true, false, false, true, false));
  assert.equal(requiresConfirmation(false, true, false, false, true, true), false);
  assert.equal(requiresConfirmation(false, true, false, true, false, false), false);
  assert.ok(requiresConfirmation(false, true, false, false, false, false));
  assert.ok(requiresConfirmation(true, false, false, false, true, true));
});
test('undo retains monotonic event IDs and does not replay an earlier action', () => {
  const s = createClassicGame();
  for (const t of s.tiles) t.terrain = 'grass';
  s.cities[0].tile = '2,0';
  s.cities[1].tile = '10,0';
  s.units = [
    troop('scout', 'a', '0,0', 'player'),
    troop('scout', 'watch', '2,0', 'player'),
    troop('scout', 'rear', '-2,0', 'player'),
  ];
  refreshKnowledge(s);
  const cmd = { type: 'move', unit: 'a', to: '1,0' } as const,
    after = execute(s, cmd).state,
    undo = undoMove(after, moveUndo(s, after, cmd));
  assert.ok(undo);
  assert.equal(undo.event, undefined);
  assert.deepEqual(undo.events, []);
  assert.equal(undo.serial, after.serial);
  const next = execute(undo, cmd);
  assert.equal(next.error, undefined);
  assert.ok(next.state.event!.id > after.event!.id);
});
test('renderer drains every queued event in order and reports completion for the final lock', () => {
  // Exercise real renderer queue methods without requiring a WebGL context.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial renderer stub without WebGL
  const world = Object.create(World.prototype) as any;
  const completed: number[] = [],
    started: number[] = [];
  Object.assign(world, {
    visualQueue: [
      { event: { id: 2 }, ghosts: [] },
      { event: { id: 3 }, ghosts: [] },
    ],
    visual: { event: { id: 1 }, labels: [], ghosts: [] },
    effectGroup: {},
    unitModels: new Map(),
    renderer: { shadowMap: {} },
    clearGroup: () => {},
    onVisualEnd: (id: number) => completed.push(id),
    startVisual: (event: ActionEvent) => {
      started.push(event.id);
      world.visual = { event, labels: [], ghosts: [] };
    },
  });
  world.finishVisual();
  assert.deepEqual(started, [2]);
  world.finishVisual();
  assert.deepEqual(started, [2, 3]);
  world.finishVisual();
  assert.deepEqual(completed, [1, 2, 3]);
  assert.equal(world.visual, null);
  assert.equal(world.visualQueue.length, 0);
});
