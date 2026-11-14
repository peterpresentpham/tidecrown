import assert from 'node:assert/strict';
import test from 'node:test';

import { healingPressure, pursuit } from './v2/healing';
test('sustained ranged pressure beats field rest; crossbows and siege break a resting town defender', () => {
  for (const type of ['archer', 'crossbow', 'catapult'] as const) {
    const r = healingPressure(type);
    assert.equal(r.survived, false);
    assert.ok(r.rows.length <= 12);
    assert.ok(r.rows.every((row) => row.healed <= 2));
  }
  for (const type of ['crossbow', 'catapult'] as const) {
    const r = healingPressure(type, true);
    assert.equal(r.survived, false);
    assert.ok(r.rows.every((row) => row.healed <= 3));
  }
  // Weak bows alone cannot break this town: upgrading or using combined arms matters.
  assert.equal(healingPressure('archer', true).survived, true);
});
test('retreat cannot heal in the same turn and cavalry pursuit denies rest next turn', () => {
  const result = pursuit();
  assert.match(result.sameTurnRest!, /di chuyển/);
  assert.match(result.afterPursuitRest!, /kề địch/);
});
