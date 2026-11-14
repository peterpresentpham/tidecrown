import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import {
  type Command,
  createGame,
  distance,
  execute,
  FACTION_IDS,
  livingFactions,
  neighbors,
  passable,
  reachable,
  type State,
  tileAt,
} from '../src/game/engine';
import { observe, refreshKnowledge } from '../src/game/visibility';
import { loadGame, parseSave, SAVE_KEY } from '../src/persistence/save';
function apply(s: State, c: Command) {
  const r = execute(s, c);
  assert.equal(r.error, undefined, `${s.turn}: ${JSON.stringify(c)}: ${r.error}`);
  return r.state;
}

test('same seed and AI count reproduce terrain, forts and armies; difficulty does not alter the map or prices', () => {
  const a = createGame({ seed: 'nation-42', aiCount: 3, difficulty: 'easy' }),
    b = createGame({ seed: 'nation-42', aiCount: 3, difficulty: 'hard' });
  assert.deepEqual(a.tiles, b.tiles);
  assert.deepEqual(a.cities, b.cities);
  assert.deepEqual(a.units, b.units);
  assert.deepEqual(a.resources, b.resources);
  assert.deepEqual(a, createGame({ seed: 'nation-42', aiCount: 3, difficulty: 'easy' }));
  assert.notDeepEqual(a.tiles, createGame({ seed: 'another-seed', aiCount: 3 }).tiles);
  assert.notDeepEqual(createGame().settings.seed, createGame().settings.seed);
});
test('many seeds provide separated starts, a fair first village and connected passable forts for every AI count', () => {
  for (const aiCount of [1, 2, 3] as const)
    for (let seed = 0; seed < 30; seed++) {
      const s = createGame({ seed: `map-${seed}`, aiCount });
      assert.equal(s.tiles.length, 825);
      assert.equal(s.units.length, aiCount + 1);
      assert.equal(s.cities.length, (aiCount + 1) * 3 + 3);
      assert.equal(new Set(s.cities.map((c) => c.tile)).size, s.cities.length);
      assert.equal(new Set(s.units.map((u) => u.tile)).size, s.units.length);
      for (const f of s.factions) {
        const capital = s.cities.find((c) => c.owner === f)!,
          u = s.units.find((u) => u.owner === f)!;
        assert.equal(s.units.filter((u) => u.owner === f).length, 1);
        assert.ok(passable(tileAt(s, capital.tile)));
        assert.ok(passable(tileAt(s, u.tile)));
        assert.equal(distance(tileAt(s, capital.tile), tileAt(s, u.tile)), 1);
        const village = s.cities
          .filter((c) => !c.owner)
          .sort(
            (a, b) =>
              distance(tileAt(s, a.tile), tileAt(s, capital.tile)) -
              distance(tileAt(s, b.tile), tileAt(s, capital.tile))
          )[0];
        assert.equal(distance(tileAt(s, capital.tile), tileAt(s, village.tile)), 4);
        assert.equal(observe(s, f).cities.filter((c) => c.owner && c.owner !== f).length, 0);
      }
      const seen = new Set([s.cities[0].tile]),
        pending = [s.cities[0].tile];
      while (pending.length)
        for (const t of neighbors(s, pending.pop()!))
          if (passable(t) && !seen.has(t.id)) {
            seen.add(t.id);
            pending.push(t.id);
          }
      assert.ok(
        s.cities.every((c) => seen.has(c.tile)),
        `unreachable fort in ${seed}/${aiCount}`
      );
      assert.ok(
        s.cities.every((a, i) =>
          s.cities.slice(i + 1).every((b) => distance(tileAt(s, a.tile), tileAt(s, b.tile)) >= 4)
        )
      );
    }
});
test('first village can be captured in two human turns without technology on random maps', () => {
  for (let seed = 0; seed < 12; seed++) {
    let s = createGame({ seed: `opening-${seed}`, aiCount: 3 });
    const unit = s.units[0],
      capital = s.cities[0],
      village = s.cities[4];
    assert.equal(distance(tileAt(s, capital.tile), tileAt(s, village.tile)), 4);
    for (let turn = 0; turn < 2; turn++) {
      const u = s.units.find((u) => u.id === unit.id)!;
      const to = [...reachable(s, u).keys()]
        .filter((id) => id !== u.tile)
        .sort(
          (a, b) =>
            distance(tileAt(s, a), tileAt(s, village.tile)) -
            distance(tileAt(s, b), tileAt(s, village.tile))
        )[0];
      s = apply(s, { type: 'move', unit: u.id, to });
      if (turn === 0) {
        do {
          s = apply(s, { type: 'end' });
        } while (s.turn !== 'player');
      }
    }
    s = apply(s, { type: 'attack', unit: unit.id, to: village.tile });
    assert.equal(s.cities.find((c) => c.id === village.id)?.owner, 'player');
  }
});
test('four-way turns collect income/research only for the next owner, incrementing round once per cycle', () => {
  let s = createGame({ seed: 'turns', aiCount: 3 });
  s = apply(s, { type: 'research', technology: 'basic_agriculture' });
  for (const owner of ['enemy', 'enemy2', 'enemy3'] as const) {
    s = apply(s, { type: 'end' });
    assert.equal(s.turn, owner);
    assert.equal(s.round, 1);
    assert.equal(s.research.player?.remaining, 1);
    assert.equal(s.resources[owner].gold, 24);
  }
  s = apply(s, { type: 'end' });
  assert.equal(s.turn, 'player');
  assert.equal(s.round, 2);
  assert.equal(s.research.player, null);
});
test('conquering one AI eliminates only that faction, skips its turn, and victory waits for all opponents', () => {
  let s = createGame({ seed: 'capture', aiCount: 3 });
  // A compact open encounter, keeping the remaining two kingdoms elsewhere.
  for (const t of s.tiles)
    if (Math.abs(t.q) < 4 && Math.abs(t.r) < 4) {
      t.terrain = 'grass';
      t.height = 0.22;
    }
  s.cities.find((c) => c.owner === 'enemy')!.tile = '0,0';
  s.cities.find((c) => c.owner === 'enemy')!.fort = 0;
  s.units[0].tile = '-1,0';
  s.units.find((u) => u.owner === 'enemy')!.tile = '2,0';
  refreshKnowledge(s);
  s = apply(s, { type: 'attack', unit: s.units[0].id, to: '0,0' });
  assert.equal(s.winner, null);
  assert.equal(
    s.units.some((u) => u.owner === 'enemy'),
    false
  );
  assert.deepEqual(livingFactions(s), ['player', 'enemy2', 'enemy3']);
  s = apply(s, { type: 'end' });
  assert.equal(s.turn, 'enemy2');
  s = apply(s, { type: 'end' });
  assert.equal(s.turn, 'enemy3');
  s = apply(s, { type: 'end' });
  assert.equal(s.turn, 'player');
  assert.equal(s.round, 2);
  for (const f of ['enemy2', 'enemy3'] as const) {
    s.cities.find((c) => c.owner === f)!.tile = f === 'enemy2' ? '1,0' : '2,0';
    s.cities.find((c) => c.owner === f)!.fort = 0;
    s.units = s.units.filter((u) => u.owner !== f);
    const u = s.units.find((u) => u.owner === 'player')!;
    u.acted = false;
    u.moves = 1;
    refreshKnowledge(s);
    s = apply(s, { type: 'attack', unit: u.id, to: f === 'enemy2' ? '1,0' : '2,0' });
    assert.equal(s.winner, f === 'enemy3' ? 'player' : null);
  }
});
test('AI factions fight each other; losing the last human city ends the match', () => {
  let s = createGame({ seed: 'ai-war', aiCount: 3 });
  for (const t of s.tiles) if (Math.abs(t.q) < 4 && Math.abs(t.r) < 4) t.terrain = 'grass';
  s.turn = 'enemy2';
  s.units.find((u) => u.owner === 'enemy2')!.tile = '-1,0';
  s.cities.find((c) => c.owner === 'enemy3')!.tile = '0,0';
  s.cities.find((c) => c.owner === 'enemy3')!.fort = 0;
  refreshKnowledge(s);
  const command = nextAICommand(s);
  assert.equal(command.type, 'attack');
  s = apply(s, command);
  assert.equal(s.cities.find((c) => c.tile === '0,0')!.owner, 'enemy2');
  assert.equal(s.winner, null);
  s.turn = 'enemy';
  s.cities.find((c) => c.owner === 'player')!.tile = '2,1';
  s.cities.find((c) => c.owner === 'player')!.fort = 0;
  s.units.find((u) => u.owner === 'enemy')!.tile = '2,0';
  refreshKnowledge(s);
  s = apply(s, { type: 'attack', unit: s.units.find((u) => u.owner === 'enemy')!.id, to: '2,1' });
  assert.equal(s.winner, 'enemy');
});
test('difficulty affects AI research pace and army capacity while every AI command stays legal', () => {
  const easy = createGame({ seed: 'difficulty', difficulty: 'easy' }),
    hard = createGame({ seed: 'difficulty', difficulty: 'hard' });
  for (const s of [easy, hard]) {
    s.turn = 'enemy';
    s.units.filter((u) => u.owner === 'enemy').forEach((u) => (u.acted = true));
    refreshKnowledge(s);
  }
  assert.notEqual(nextAICommand(easy).type, 'research');
  assert.equal(nextAICommand(hard).type, 'research');
  for (const s of [easy, hard]) {
    const u = s.units.find((u) => u.owner === 'enemy')!;
    const free = s.tiles.filter(
      (t) =>
        passable(t) &&
        !s.units.some((u) => u.tile === t.id) &&
        !s.cities.some((c) => c.tile === t.id)
    );
    s.units.push(
      { ...u, id: 'extra1', tile: free[0].id },
      { ...u, id: 'extra2', tile: free[1].id }
    );
    s.technologies.enemy = ['basic_woodworking', 'archery'];
    s.cities
      .filter((c) => c.owner === 'enemy')
      .forEach((c) => {
        c.constructed = true;
      });
    s.resources.enemy = { gold: 100, food: 50, wood: 50, stone: 50 };
    s.research.enemy = { technology: 'basic_agriculture', remaining: 1 };
    refreshKnowledge(s);
  }
  assert.equal(nextAICommand(easy).type, 'end');
  assert.equal(nextAICommand(hard).type, 'recruit');
  for (const aiCount of [1, 2, 3] as const) {
    let s = createGame({
      seed: 'campaign',
      aiCount,
      difficulty: aiCount === 1 ? 'medium' : aiCount === 2 ? 'easy' : 'hard',
    });
    for (let round = 0; round < 6 && !s.winner; round++) {
      s = apply(s, { type: 'end' });
      let steps = 0;
      while (s.turn !== 'player' && !s.winner) {
        assert.ok(++steps < 180);
        s = apply(s, nextAICommand(s));
      }
      assert.ok(FACTION_IDS.every((f) => Object.values(s.resources[f]).every((n) => n >= 0)));
      assert.equal(new Set(s.units.map((u) => u.tile)).size, s.units.length);
      assert.ok(parseSave(JSON.stringify(s)));
    }
  }
});
test('multi-AI saves resume exact settings, turn and independent fog; obsolete schemas require a new match', () => {
  let s = createGame({ seed: 'resume', aiCount: 3, difficulty: 'hard' });
  s = apply(s, { type: 'end' });
  s = apply(s, { type: 'end' });
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  const old = { ...s, version: 6 };
  assert.equal(parseSave(JSON.stringify(old)), null);
  const storage = new Map([['nation-tech-v6', JSON.stringify(old)]]);
  const loaded = loadGame({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
  });
  assert.equal(loaded.state, null);
  assert.equal(storage.has(SAVE_KEY), false);
  const bad = structuredClone(s);
  bad.settings.aiCount = 1;
  assert.equal(parseSave(JSON.stringify(bad)), null);
  const badTurn = structuredClone(s);
  badTurn.factions = ['player', 'enemy', 'enemy3', 'enemy2'];
  assert.equal(parseSave(JSON.stringify(badTurn)), null);
});
