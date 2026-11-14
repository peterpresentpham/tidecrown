import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import { nextDevelopmentCommand } from '../src/ai/development';
import { landRegions, navalDemand, planNavy } from '../src/ai/naval';
import {
  cargo,
  type Command,
  createGame,
  distance,
  execute,
  neighbors,
  passable,
  reachable,
  type State,
  tileAt,
} from '../src/game/engine';
import { observe, refreshKnowledge } from '../src/game/visibility';
import { parseSave } from '../src/persistence/save';
import { navalScenario } from './helpers/navalScenarios';
import { troop } from './helpers/tacticalScenarios';
const apply = (s: State, c: Command) => {
  const r = execute(s, c);
  assert.equal(r.error, undefined, JSON.stringify(c) + ': ' + r.error);
  return r.state;
};
test('water seeds: two connected banks, separated capitals, coastal ports and reproducible saves', () => {
  for (const aiCount of [1, 2, 3] as const)
    for (let seed = 0; seed < 20; seed++) {
      const s = createGame({ map: 'water', seed: `sea-${seed}`, aiCount }),
        regions = landRegions(s);
      assert.equal(s.tiles.length, 825);
      assert.equal(s.cities.length, (aiCount + 1) * 3 + 3);
      assert.equal(new Set(s.cities.map((c) => regions.get(c.tile))).size, 2);
      assert.ok(s.tiles.filter((t) => Math.abs(t.q) < 2).every((t) => t.terrain === 'water'));
      for (const c of s.cities.filter((c) => c.owner)) {
        assert.ok(neighbors(s, c.tile).some((t) => t.terrain === 'water'));
        const village = s.cities
          .filter((v) => !v.owner)
          .sort(
            (a, b) =>
              distance(tileAt(s, c.tile), tileAt(s, a.tile)) -
              distance(tileAt(s, c.tile), tileAt(s, b.tile))
          )[0];
        assert.equal(distance(tileAt(s, c.tile), tileAt(s, village.tile)), 4);
        assert.equal(regions.get(c.tile), regions.get(village.tile));
        assert.ok(
          s.cities.every(
            (v) => v.id === c.id || distance(tileAt(s, c.tile), tileAt(s, v.tile)) >= 4
          )
        );
        assert.equal(
          observe(s, c.owner!).cities.some((v) => v.owner && v.owner !== c.owner),
          false
        );
      }
      assert.ok(s.cities.every((c) => passable(tileAt(s, c.tile))));
      assert.ok(parseSave(JSON.stringify(s)));
      assert.deepEqual(s, createGame({ map: 'water', seed: `sea-${seed}`, aiCount }));
    }
  assert.throws(() => createGame({ map: 'oops' as 'water' }));
});
test('convoy boards capturers, crosses with escort, lands all cargo and takes the village', () => {
  let s = navalScenario();
  const log: Command[] = [];
  for (let turn = 0; turn < 10; turn++) {
    let n = 0;
    while (s.turn === 'enemy' && !s.winner) {
      assert.ok(++n < 180);
      const c = nextAICommand(s);
      log.push(c);
      s = apply(s, c);
      if (
        c.type === 'move' &&
        c.unit === 'ferry' &&
        cargo(
          s,
          s.units.find((u) => u.id === 'ferry')!
        ).length
      ) {
        assert.ok(
          s.units.some((u) => u.id === 'guard' && distance(tileAt(s, u.tile), tileAt(s, c.to)) <= 2)
        );
      }
      if (c.type === 'board') assert.ok(parseSave(JSON.stringify(s)));
    }
    if (
      s.cities.find((c) => c.id === 'beach-village')!.owner === 'enemy' &&
      !s.units.some((u) => u.aboard)
    )
      break;
    if (s.turn === 'player' && !s.winner) s = apply(s, { type: 'end' });
  }
  assert.ok(
    log.some((c) => c.type === 'board'),
    JSON.stringify(log)
  );
  assert.ok(
    log.some((c) => c.type === 'land'),
    JSON.stringify(log)
  );
  assert.equal(s.cities.find((c) => c.id === 'beach-village')!.owner, 'enemy', JSON.stringify(log));
  assert.equal(
    s.units.some((u) => u.aboard),
    false
  );
  assert.ok(
    log.filter((c) => c.type === 'land').every((c) => c.type === 'land' && tileAt(s, c.to).q >= 2)
  );
});
test('unknown destination: no speculative boarding or empty transport wandering', () => {
  const s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard');
  s.knowledge.enemy.cities = {};
  s.knowledge.enemy.explored = [];
  s.knowledge.enemy.tiles = {};
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.deepEqual(c, { type: 'wait', unit: 'ferry' });
});
test('naval planner cannot read unseen armies, terrain or treasury', () => {
  const a = navalScenario(),
    b = structuredClone(a);
  b.units.push(troop('heavy_warship', 'hidden', '0,-10', 'player'));
  b.resources.player.gold = 9999;
  tileAt(b, '14,-10').terrain = 'mountain';
  refreshKnowledge(b);
  assert.deepEqual(observe(a, 'enemy'), observe(b, 'enemy'));
  assert.deepEqual(nextAICommand(a), nextAICommand(b));
});
test('support cargo lands after its capturer even when the capturer has already left the boat', () => {
  let s = navalScenario();
  s.units.find((u) => u.id === 'ferry')!.tile = '1,0';
  const bow = s.units.find((u) => u.id === 'bow')!;
  bow.aboard = 'ferry';
  bow.tile = '1,0';
  s.units.find((u) => u.id === 'landing')!.tile = '2,1';
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'land');
  if (c) s = apply(s, c);
  assert.equal(s.units.find((u) => u.id === 'bow')!.aboard, undefined);
});
test('empty transport returns to its home shore after dropping the party', () => {
  const s = navalScenario();
  s.units.find((u) => u.id === 'ferry')!.tile = '1,0';
  s.units.find((u) => u.id === 'landing')!.tile = '3,0';
  s.units = s.units.filter((u) => u.id !== 'guard');
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'move');
  if (c?.type === 'move') {
    assert.equal(c.unit, 'ferry');
    assert.ok(tileAt(s, c.to).q < 1);
    apply(s, c);
  }
});
test('ship combat protects loaded transport before moving the convoy', () => {
  const s = navalScenario();
  const p = s.units.find((u) => u.id === 'landing')!;
  p.aboard = 'ferry';
  p.tile = '-1,0';
  s.units.push(troop('scout_ship', 'raider', '1,2', 'player'));
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'attack');
  if (c?.type === 'attack') {
    assert.equal(c.unit, 'guard');
    assert.equal(c.to, '1,2');
    apply(s, c);
  }
});
test('manual transport sequence reaches the opposite shore and captures a village with normal turn rules', () => {
  let s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard' && u.id !== 'bow');
  s = apply(s, { type: 'board', unit: 'landing', ship: 'ferry' });
  s = apply(s, { type: 'move', unit: 'ferry', to: '1,0' });
  assert.ok(
    execute(s, { type: 'land', unit: 'landing', to: '2,1' }).error,
    'boarding uses the troop action'
  );
  s = apply(apply(s, { type: 'end' }), { type: 'end' });
  s = apply(s, { type: 'land', unit: 'landing', to: '2,1' });
  assert.ok(
    execute(s, { type: 'attack', unit: 'landing', to: '2,0' }).error,
    'landing consumes the action'
  );
  s = apply(apply(s, { type: 'end' }), { type: 'end' });
  s = apply(s, { type: 'attack', unit: 'landing', to: '2,0' });
  assert.equal(s.cities.find((c) => c.id === 'beach-village')!.owner, 'enemy');
});
test('blocked beaches hold cargo safely and resume landing when a valid beach becomes free', () => {
  const s = navalScenario(),
    boat = s.units.find((u) => u.id === 'ferry')!,
    p = s.units.find((u) => u.id === 'landing')!;
  boat.tile = '1,0';
  p.aboard = boat.id;
  p.tile = boat.tile;
  s.units = s.units.filter((u) => u.id !== 'guard');
  for (const t of s.tiles) if (t.q >= 2) t.terrain = 'mountain';
  tileAt(s, '2,0').terrain = 'grass';
  tileAt(s, '2,1').terrain = 'grass';
  s.units.push(troop('clubman', 'blocker', '2,1'));
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.notEqual(c?.type, 'land');
  if (c) apply(s, c);
  s.units = s.units.filter((u) => u.id !== 'blocker');
  refreshKnowledge(s);
  const next = planNavy(observe(s, 'enemy')).command;
  assert.equal(next?.type, 'land');
  if (next) apply(s, next);
});
test('a visible lethal warship prevents an unescorted loaded transport from charging', () => {
  const s = navalScenario(),
    p = s.units.find((u) => u.id === 'landing')!;
  p.aboard = 'ferry';
  p.tile = '-1,0';
  s.units = s.units.filter((u) => u.id !== 'guard');
  s.units.push(troop('heavy_warship', 'threat', '1,0', 'player'));
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  if (c?.type === 'move' && c.unit === 'ferry')
    assert.ok(
      distance(tileAt(s, c.to), tileAt(s, '1,0')) > 3,
      'retreat beyond the observed weapon range'
    );
  if (c) apply(s, c);
});
test('water-map opening still captures the first village in two turns', () => {
  for (let seed = 0; seed < 8; seed++) {
    let s = createGame({ map: 'water', seed: `opening-${seed}`, aiCount: 3 });
    const id = s.units[0].id,
      village = s.cities[s.factions.length];
    for (let turn = 0; turn < 2; turn++) {
      const u = s.units.find((u) => u.id === id)!;
      const target = tileAt(s, village.tile);
      const to = [...reachable(s, u).keys()]
        .filter((id) => id !== u.tile)
        .sort((a, b) => distance(tileAt(s, a), target) - distance(tileAt(s, b), target))[0];
      s = apply(s, { type: 'move', unit: id, to });
      if (turn === 0)
        do {
          s = apply(s, { type: 'end' });
        } while (s.turn !== 'player');
    }
    s = apply(s, { type: 'attack', unit: id, to: village.tile });
    assert.equal(s.cities.find((c) => c.id === village.id)!.owner, 'player');
  }
});
test('a normal-resource seeded water campaign builds its fleet and lands without scripted tech or reinforcements', () => {
  let s = createGame({ map: 'water', seed: 'naval-campaign', aiCount: 1, difficulty: 'medium' });
  let boarded = 0,
    landed = 0;
  for (let round = 0; round < 60 && !s.winner; round++) {
    s = apply(s, { type: 'end' });
    let n = 0;
    while (s.turn === 'enemy' && !s.winner) {
      assert.ok(++n < 180);
      const c = nextAICommand(s);
      if (c.type === 'board') boarded++;
      if (c.type === 'land') landed++;
      s = apply(s, c);
    }
    assert.ok(s.factions.every((f) => Object.values(s.resources[f]).every((v) => v >= 0)));
    assert.ok(parseSave(JSON.stringify(s)));
  }
  assert.ok(boarded >= 2);
  assert.ok(landed >= 2);
  assert.equal(s.winner, 'enemy');
});
test('every water-map capital has a navigable sea route to the opposite bank without deep-sea technology', () => {
  for (const aiCount of [1, 2, 3] as const)
    for (let seed = 0; seed < 10; seed++) {
      const s = createGame({ map: 'water', seed: `ports-${seed}`, aiCount });
      for (const c of s.cities.filter((c) => c.owner)) {
        const initial = neighbors(s, c.tile).filter((t) => t.terrain === 'water'),
          seen = new Set(initial.map((t) => t.id)),
          pending = initial.map((t) => t.id);
        while (pending.length)
          for (const t of neighbors(s, pending.pop()!))
            if (
              t.terrain === 'water' &&
              !seen.has(t.id) &&
              s.tiles.some((land) => passable(land) && distance(land, t) <= 2)
            ) {
              seen.add(t.id);
              pending.push(t.id);
            }
        const other = s.cities.find(
          (v) => Math.sign(tileAt(s, v.tile).q) !== Math.sign(tileAt(s, c.tile).q)
        )!;
        const regions = landRegions(s),
          region = regions.get(other.tile);
        assert.ok(
          s.tiles.some(
            (t) =>
              regions.get(t.id) === region &&
              !s.cities.some((v) => v.tile === t.id) &&
              neighbors(s, t.id).some((n) => seen.has(n.id))
          )
        );
      }
    }
});

test('a threatened coast reserves fleet capacity and replaces transport before adding more land troops', () => {
  const s = navalScenario();
  s.settings.difficulty = 'medium';
  const home = s.cities[1];
  home.level = 3;
  home.constructed = true;
  home.buildings = ['farm', 'lumber', 'market', 'granary', 'port', 'shipyard'];
  s.cities.push(
    { ...home, id: 'home-two', tile: '-6,4' },
    { ...home, id: 'home-three', tile: '-6,-4' }
  );
  s.units = [
    troop('scout_ship', 'eyes', '0,2'),
    ...['-3,0', '-3,1', '-3,-1', '-4,0', '-4,1', '-4,-1'].map((tile, i) =>
      troop(i === 0 ? 'scout' : 'shield', `front-${i}`, tile)
    ),
    troop('knight', 'raid', '-2,2', 'player'),
  ];
  s.resources.enemy = { gold: 500, wood: 500, food: 500, stone: 500 };
  refreshKnowledge(s);
  const c = nextDevelopmentCommand(observe(s, 'enemy'));
  assert.equal(c.type, 'recruit');
  if (c.type === 'recruit') assert.equal(c.unitType, 'transport');
  apply(s, c);
});

test('an empty transport near port returns to a boardable shore instead of waiting offshore', () => {
  const s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard');
  s.units.find((u) => u.id === 'ferry')!.tile = '0,0';
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'move');
  if (c?.type === 'move') {
    assert.equal(c.unit, 'ferry');
    const after = apply(s, c);
    assert.ok(neighbors(after, c.to).some(passable));
  }
});

test('a loaded convoy repositions its escort before taking a distracting shore shot', () => {
  let s = navalScenario();
  s.units.find((u) => u.id === 'ferry')!.tile = '-1,5';
  s.units.find((u) => u.id === 'guard')!.tile = '0,5';
  const landing = s.units.find((u) => u.id === 'landing')!;
  landing.aboard = 'ferry';
  landing.tile = '-1,5';
  s.units.push(troop('clubman', 'distraction', '2,6', 'player'));
  refreshKnowledge(s);
  const first = nextAICommand(s);
  assert.equal(first.type, 'move');
  if (first.type === 'move') assert.equal(first.unit, 'guard');
  let transported = false;
  for (let i = 0; i < 8 && s.turn === 'enemy'; i++) {
    const c = nextAICommand(s);
    if (c.type === 'move' && c.unit === 'ferry') transported = true;
    s = apply(s, c);
  }
  assert.ok(transported, 'loaded transport must follow the escort this turn');
});

test('a transport loads siege reinforcement when capturers already hold the opposite shore', () => {
  const s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard' && u.id !== 'bow');
  s.units.find((u) => u.id === 'landing')!.tile = '3,1';
  const city = s.cities.find((c) => c.id === 'beach-village')!;
  city.owner = 'player';
  city.fort = 40;
  s.units.push(troop('catapult', 'reinforcement', '-2,1'));
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.deepEqual(c, { type: 'board', unit: 'reinforcement', ship: 'ferry' });
  apply(s, c);
});

test('capturing an older-numbered port does not strand reinforcements on the original bank', () => {
  const s = navalScenario();
  Object.assign(s.cities[0], { owner: 'enemy', tile: '2,6', buildings: ['port'] });
  refreshKnowledge(s);
  assert.equal(navalDemand(observe(s, 'enemy')).home?.id, 'c2');
});

test('offshore support-only cargo returns home when its landing capturer has been lost', () => {
  const s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard');
  s.units.find((u) => u.id === 'ferry')!.tile = '0,0';
  const bow = s.units.find((u) => u.id === 'bow')!;
  bow.aboard = 'ferry';
  bow.tile = '0,0';
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'move');
  if (c?.type === 'move') {
    assert.equal(c.unit, 'ferry');
    const after = apply(s, c);
    assert.ok(neighbors(after, c.to).some((t) => passable(t) && t.q < 0));
  }
});

test('the embarkation bank follows the army when the last enemy is back across the channel', () => {
  const s = navalScenario();
  s.cities[0].tile = '-5,0';
  const port = s.cities.find((c) => c.id === 'beach-village')!;
  port.owner = 'enemy';
  port.buildings = ['port'];
  s.units.find((u) => u.id === 'landing')!.tile = '2,1';
  s.units.find((u) => u.id === 'home')!.tile = '3,1';
  s.units.find((u) => u.id === 'bow')!.tile = '3,0';
  s.units.push(troop('scout', 'eyes-home', '-4,0'));
  refreshKnowledge(s);
  assert.equal(navalDemand(observe(s, 'enemy')).home?.id, 'beach-village');
});

test('a scout across the channel does not replace infantry for a siege landing', () => {
  const s = navalScenario();
  s.units = s.units.filter((u) => u.id !== 'guard' && u.id !== 'bow' && u.id !== 'landing');
  s.units.push(troop('scout', 'shore-eyes', '3,1'), troop('catapult', 'machine', '-2,1'));
  const city = s.cities.find((c) => c.id === 'beach-village')!;
  city.owner = 'player';
  city.fort = 40;
  refreshKnowledge(s);
  const c = planNavy(observe(s, 'enemy')).command;
  assert.equal(c?.type, 'move');
  if (c?.type === 'move') assert.equal(c.unit, 'home');
  if (c) apply(s, c);
});
