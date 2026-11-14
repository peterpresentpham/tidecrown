import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, execute, type State } from '../src/game/engine';
import { runAIStep } from '../src/ui/aiTurnStep';
import { actionSeconds, aiDecisionDelayMs, busyFallbackMs, busyWatchdogMs, DEFAULT_UI_PREFERENCES, loadUIPreferences, saveUIPreferences, UI_PREFERENCES_KEY } from '../src/ui/playbackPolicy';
import { SAVE_KEY } from '../src/persistence/save';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}
const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };

test('UI preferences fall back to defaults on missing, malformed, unknown or blocked storage', () => {
  assert.deepEqual(loadUIPreferences(null), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(loadUIPreferences(memoryStorage()), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(loadUIPreferences(memoryStorage({ [UI_PREFERENCES_KEY]: '{not json' })), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(loadUIPreferences(memoryStorage({ [UI_PREFERENCES_KEY]: 'null' })), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(loadUIPreferences(memoryStorage({ [UI_PREFERENCES_KEY]: '{"aiSpeed":"turbo","graphics":42}' })), DEFAULT_UI_PREFERENCES);
  assert.deepEqual(loadUIPreferences(throwing), DEFAULT_UI_PREFERENCES);
  assert.equal(saveUIPreferences(throwing, { aiSpeed: 'fast', graphics: 'low' }), false);
  assert.equal(saveUIPreferences(null, { aiSpeed: 'fast', graphics: 'low' }), false);
});

test('UI preferences round-trip under their own key and never touch the game save', () => {
  const storage = memoryStorage({ [SAVE_KEY]: 'game' });
  assert.equal(saveUIPreferences(storage, { aiSpeed: 'fast', graphics: 'low' }), true);
  assert.deepEqual(loadUIPreferences(storage), { aiSpeed: 'fast', graphics: 'low' });
  assert.equal(storage.data.get(SAVE_KEY), 'game');
  assert.notEqual(UI_PREFERENCES_KEY, SAVE_KEY);
});

test('fast mode shortens only AI playback; reduced motion always wins; safety limits outlast the animation', () => {
  for (const reducedMotion of [false, true]) {
    const normal = { aiSpeed: 'normal' as const, reducedMotion }, fast = { aiSpeed: 'fast' as const, reducedMotion };
    assert.ok(aiDecisionDelayMs(fast) < aiDecisionDelayMs(normal));
    assert.ok(aiDecisionDelayMs(fast, false) <= aiDecisionDelayMs(fast, true), 'hidden actions never wait longer than visible ones');
    assert.ok(aiDecisionDelayMs(fast, false) > 0, 'still yields to the browser between commands');
    assert.equal(aiDecisionDelayMs(normal, false), aiDecisionDelayMs(normal, true), 'normal speed keeps its pace');
    assert.ok(actionSeconds(fast, 'enemy') <= actionSeconds(normal, 'enemy'));
    assert.equal(actionSeconds(fast, 'player'), actionSeconds(normal, 'player'), 'player actions keep their pace');
    for (const context of [normal, fast]) for (const owner of ['player', 'enemy2'] as const) {
      const action = actionSeconds(context, owner) * 1000;
      assert.ok(action > 0);
      if (reducedMotion) assert.ok(action <= actionSeconds({ aiSpeed: 'fast', reducedMotion: false }, 'enemy') * 1000);
      assert.ok(busyWatchdogMs(context, owner) > action, 'watchdog must not cut a running animation short');
      assert.ok(busyFallbackMs(context, owner) >= action);
    }
  }
  assert.ok(actionSeconds({ aiSpeed: 'fast', reducedMotion: false }, 'enemy') < actionSeconds({ aiSpeed: 'normal', reducedMotion: false }, 'enemy'));
});

function playAIRound(start: State) {
  let s = start, steps = 0;
  while (s.turn !== 'player' && !s.winner) {
    const next = runAIStep(s);
    assert.notEqual(next, s, 'every scheduled step must apply one command');
    assert.notDeepEqual(next, s, `step ${steps} was a no-op and would repeat forever`);
    s = next; steps++;
    assert.ok(steps < 2000, 'AI round did not finish');
  }
  return { state: s, steps };
}

test('one AI step applies exactly one command and a round always returns control to the player', () => {
  let s = createGame({ seed: 'playback-1', aiCount: 3, difficulty: 'medium' });
  for (let round = 0; round < 4 && !s.winner; round++) {
    const ended = execute(s, { type: 'end' });
    assert.equal(ended.error, undefined);
    const played = playAIRound(ended.state);
    assert.ok(played.steps >= 3, 'each of the three AI factions must at least end its turn');
    s = played.state;
    assert.equal(s.turn, 'player');
  }
});

test('playback speed is not an input to the game: the same start replays to an identical state', () => {
  const start = execute(createGame({ seed: 'playback-2', aiCount: 2, difficulty: 'hard' }), { type: 'end' }).state;
  assert.deepEqual(playAIRound(start).state, playAIRound(structuredClone(start)).state);
});

test('queued AI callbacks cannot overwrite a new game, a newer step or the player turn',async()=>{
  const {runScheduledAIStep}=await import('../src/ui/aiTurnStep');
  const opening=createGame({seed:'timer-generation'}),scheduled=execute(opening,{type:'end'}).state;
  const fresh=createGame({seed:'replacement',map:'water'});
  assert.equal(runScheduledAIStep(fresh,scheduled),fresh);
  const next=runScheduledAIStep(scheduled,scheduled);assert.notEqual(next,scheduled);
  assert.equal(runScheduledAIStep(next,scheduled),next,'an already used timeout cannot execute twice');
  assert.equal(runScheduledAIStep(opening,opening),opening,'never end the player turn from an AI timer');
  const finished={...scheduled,winner:'player' as const};assert.equal(runScheduledAIStep(finished,finished),finished);
});
