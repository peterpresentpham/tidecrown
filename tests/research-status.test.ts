import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TECHNOLOGIES, TECHNOLOGY_LOGIC } from '../src/data/technologies';
import { createClassicGame, execute, researchReason } from '../src/game/engine';
import { researchStatus } from '../src/game/research';
test('bright research availability matches actual engine permission for every node', () => {
  const s = createClassicGame();
  for (const t of Object.values(TECHNOLOGIES)) {
    const status = researchStatus(s, 'player', t.id);
    assert.equal(status.reason, researchReason(s, 'player', t.id));
    assert.equal(
      status.kind === 'ready',
      !execute(s, { type: 'research', technology: t.id }).error
    );
    assert.ok(t.requires.length <= 2);
    assert.ok(TECHNOLOGY_LOGIC[t.id]);
  }
});
test('resource shortage, queue, turn, progress and completion remain distinguishable', () => {
  let s = createClassicGame();
  s.resources.player.gold = 0;
  assert.equal(researchStatus(s, 'player', 'recon').kind, 'unaffordable');
  s.resources.player.gold = 100;
  s.resources.player.wood = 0;
  s.technologies.player = ['basic_woodworking', 'mining', 'basic_metalworking'];
  assert.equal(researchStatus(s, 'player', 'siege').kind, 'locked');
  s.technologies.player.push('advanced_woodworking');
  assert.equal(researchStatus(s, 'player', 'siege').kind, 'unaffordable');
  s.resources.player.wood = 100;
  s = execute(s, { type: 'research', technology: 'recon' }).state;
  assert.equal(researchStatus(s, 'player', 'recon').kind, 'researching');
  assert.equal(researchStatus(s, 'player', 'basic_agriculture').kind, 'waiting');
  assert.equal(researchStatus(s, 'player', 'steel').kind, 'locked');
  s = execute(s, { type: 'end' }).state;
  s = execute(s, { type: 'end' }).state;
  assert.equal(researchStatus(s, 'player', 'recon').kind, 'complete');
  assert.equal(researchStatus(s, 'player', 'basic_agriculture').kind, 'ready');
  s = execute(s, { type: 'end' }).state;
  assert.equal(researchStatus(s, 'player', 'basic_agriculture').kind, 'waiting');
});
