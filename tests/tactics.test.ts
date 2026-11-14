import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import { armyComposition, nextDevelopmentCommand } from '../src/ai/development';
import { armyIntent, frontline, nextArmyCommand, positionRisk } from '../src/ai/tactics';
import { TECHNOLOGIES, type TechnologyId } from '../src/data/technologies';
import {
  type Command,
  createGame,
  distance,
  execute,
  type State,
  tileAt,
  UNITS,
} from '../src/game/engine';
import { observe, refreshKnowledge } from '../src/game/visibility';
import { parseSave } from '../src/persistence/save';
import { finishAITurn, tacticalScenario, troop } from './helpers/tacticalScenarios';
const apply = (s: State, c: Command) => {
  const r = execute(s, c);
  assert.equal(r.error, undefined, JSON.stringify(c));
  return r.state;
};
const gap = (s: State, a: string, b: string) => distance(tileAt(s, a), tileAt(s, b));
test('screen: the infantry advances while archers stay behind and within support distance', () => {
  const before = tacticalScenario('screen'),
    s = finishAITurn(before),
    front = s.units.find((u) => u.id === 'front')!,
    bow = s.units.find((u) => u.id === 'bow')!;
  assert.ok(tileAt(s, front.tile).q > 1);
  assert.ok(tileAt(s, bow.tile).q <= tileAt(s, front.tile).q);
  assert.ok(gap(s, front.tile, bow.tile) <= 2);
  assert.ok(gap(s, bow.tile, '5,0') >= gap(s, front.tile, '5,0'));
});
test('focus fire: ranged units finish the wounded enemy before the first array unit moves', () => {
  let s = tacticalScenario('focus');
  const first = nextAICommand(s);
  assert.equal(first.type, 'attack');
  if (first.type !== 'attack') return;
  assert.equal(first.to, '2,-1');
  assert.ok(first.unit.startsWith('bow-'));
  s = apply(s, first);
  assert.equal(
    s.units.some((u) => u.id === 'weak'),
    false
  );
  const second = nextAICommand(s);
  assert.equal(second.type, 'attack');
  if (second.type === 'attack') {
    assert.ok(second.unit.startsWith('bow-'));
    assert.equal(second.to, '2,1');
  }
});
test('escort: every forward machine move has an escort, and the siege eventually damages the fort', () => {
  let s = tacticalScenario('escort'),
    advances = 0;
  for (let round = 0; round < 10 && !s.winner; round++) {
    let n = 0;
    while (s.turn === 'enemy' && !s.winner) {
      assert.ok(++n < 180);
      const c = nextAICommand(s),
        before = s.units.find((u) => u.id === 'machine');
      s = apply(s, c);
      if (
        c.type === 'move' &&
        c.unit === 'machine' &&
        before &&
        gap(s, c.to, '5,0') < gap(s, before.tile, '5,0')
      ) {
        advances++;
        assert.ok(
          s.units.some((u) => u.owner === 'enemy' && frontline(u) && gap(s, u.tile, c.to) <= 2)
        );
      }
    }
    if (s.turn === 'player' && !s.winner) s = apply(s, { type: 'end' });
  }
  assert.ok(advances > 0);
  assert.equal(s.cities.find((c) => c.id === 'c1')!.fort, 0);
  assert.equal(
    s.cities.find((c) => c.id === 'c1')!.owner,
    'enemy',
    'an escorted siege must progress to infantry capture'
  );
});
test('defense: a visible raid redirects the army from an empty village to its city', () => {
  const before = tacticalScenario('defend');
  assert.equal(armyIntent(observe(before, 'enemy'))?.kind, 'defend');
  const c = nextAICommand(before);
  assert.equal(c.type, 'move');
  const s = apply(before, c),
    front = s.units.find((u) => u.id === 'front')!;
  assert.ok(gap(s, front.tile, '0,0') < 4);
});
test('counter cavalry: pikes brace and remove the knight charge bonus on the next turn', () => {
  let s = tacticalScenario('counter');
  const first = nextAICommand(s);
  assert.deepEqual(first, { type: 'stance', unit: 'front', stance: 'brace' });
  s = finishAITurn(apply(s, first));
  const hp = s.units.find((u) => u.id === 'front')!.hp;
  s = apply(s, { type: 'move', unit: 'charger', to: '1,0' });
  assert.equal(s.units.find((u) => u.id === 'charger')!.charge, 2);
  s = apply(s, { type: 'attack', unit: 'charger', to: '0,0' });
  assert.equal(
    hp - s.units.find((u) => u.id === 'front')!.hp,
    UNITS.knight.attack - UNITS.pikeman.armor
  );
});
test('wounded retreat/healing: retreat before a lethal trade, then spend food to heal safely', () => {
  const before = tacticalScenario('heal'),
    oldRisk = positionRisk(observe(before, 'enemy'), before.units[0], before.units[0].tile),
    c = nextAICommand(before);
  assert.equal(c.type, 'move');
  if (c.type !== 'move') return;
  assert.equal(c.unit, 'hurt');
  const moved = apply(before, c);
  assert.ok(
    positionRisk(
      observe(moved, 'enemy'),
      moved.units.find((u) => u.id === 'hurt')!,
      c.to
    ) < oldRisk
  );
  const log: Command[] = [],
    s = finishAITurn(moved, log);
  assert.ok(s.units.find((u) => u.id === 'hurt')!.hp > 2);
  assert.ok(log.some((c) => c.type === 'support'));
  assert.ok(s.resources.enemy.food <= before.resources.enemy.food - 3);
});
test('stable objective, deterministic replay and no hidden information affect group planning', () => {
  const a = tacticalScenario('escort'),
    b = structuredClone(a);
  b.units.push({ ...b.units.find((u) => u.owner === 'player')!, id: 'hidden', tile: '-15,-10' });
  b.resources.player.gold = 9000;
  tileAt(b, '-14,-10').terrain = 'mountain';
  refreshKnowledge(b);
  assert.deepEqual(observe(a, 'enemy'), observe(b, 'enemy'));
  assert.deepEqual(nextAICommand(a), nextAICommand(b));
  const intent = armyIntent(observe(a, 'enemy')),
    next = apply(a, nextAICommand(a));
  assert.deepEqual(armyIntent(observe(next, 'enemy')), intent);
  assert.deepEqual(finishAITurn(a), finishAITurn(structuredClone(a)));
});
test('development buys missing ranged support before optional research and prepares missing facilities', () => {
  const s = tacticalScenario('screen');
  s.units = s.units.filter((u) => u.owner === 'enemy' && u.id !== 'bow');
  s.units.forEach((u) => {
    u.acted = true;
    u.moves = 0;
  });
  s.cities[1].constructed = true;
  s.resources.enemy = { gold: 24, food: 50, wood: 10, stone: 30 };
  s.technologies.enemy = ['recon', 'basic_woodworking', 'archery'];
  s.research.enemy = null;
  refreshKnowledge(s);
  assert.equal(armyComposition(observe(s, 'enemy')).technology, 'archery');
  const c = nextDevelopmentCommand(observe(s, 'enemy'));
  assert.equal(c.type, 'recruit');
  if (c.type === 'recruit') assert.equal(c.unitType, 'archer');
  assert.equal(execute(s, c).error, undefined);
  s.technologies.enemy = ['recon', 'basic_woodworking', 'mining', 'basic_metalworking', 'spearmen'];
  s.cities[1].constructed = false;
  s.units.push({
    ...s.units[0],
    id: 'hostile-horse',
    owner: 'player',
    type: 'knight',
    tile: '-3,0',
  });
  s.resources.enemy = { gold: 35, food: 50, wood: 12, stone: 30 };
  refreshKnowledge(s);
  const facility = nextDevelopmentCommand(observe(s, 'enemy'));
  assert.equal(facility.type, 'build');
  if (facility.type === 'build') assert.equal(facility.building, 'forge');
  assert.equal(execute(s, facility).error, undefined);
  s.technologies.enemy = [];
  s.cities[1].constructed = true;
  s.resources.enemy.gold = 12;
  refreshKnowledge(s);
  const urgent = nextDevelopmentCommand(observe(s, 'enemy'));
  assert.equal(urgent.type, 'recruit');
  if (urgent.type === 'recruit') assert.equal(urgent.unitType, 'clubman');
});
test('30 rounds per AI count remain legal, bounded, saveable and preserve all resources', () => {
  for (const [aiCount, difficulty] of [
    [1, 'medium'],
    [2, 'easy'],
    [3, 'hard'],
  ] as const) {
    let s = createGame({ seed: 'army-campaign', aiCount, difficulty });
    let turns = 0;
    for (let round = 0; round < 30 && !s.winner; round++) {
      s = apply(s, { type: 'end' });
      while (s.turn !== 'player' && !s.winner) {
        s = finishAITurn(s);
        turns++;
      }
      assert.ok(s.factions.every((f) => Object.values(s.resources[f]).every((v) => v >= 0)));
      assert.equal(
        new Set(s.units.filter((u) => !u.aboard).map((u) => u.tile)).size,
        s.units.filter((u) => !u.aboard).length
      );
      assert.ok(parseSave(JSON.stringify(s)));
    }
    assert.ok(turns >= aiCount);
  }
});

test('border improvements never probe ownership of an unseen competing fort', () => {
  const a = tacticalScenario('screen');
  a.units = a.units.filter((u) => u.id === 'front');
  a.units[0].tile = '-6,0';
  a.units[0].acted = true;
  a.units[0].moves = 0;
  a.cities[1].buildings = ['farm', 'lumber'];
  a.cities[1].recruited = true;
  a.technologies.enemy = ['recon', 'basic_agriculture', 'basic_woodworking', 'mining'];
  a.research.enemy = { technology: 'archery', remaining: 1 };
  tileAt(a, '-8,-2').terrain = 'hill';
  for (const k of Object.values(a.knowledge)) {
    k.cities = {};
    k.tiles = {};
    k.explored = [];
    k.visible = [];
  }
  refreshKnowledge(a);
  const b = structuredClone(a);
  b.cities[0].tile = '-10,-4';
  b.cities[0].id = 'a-hidden';
  refreshKnowledge(b);
  assert.deepEqual(observe(a, 'enemy'), observe(b, 'enemy'));
  const c = nextAICommand(b);
  assert.notEqual(c.type, 'improve');
  assert.equal(execute(b, c).error, undefined);
  assert.deepEqual(c, nextAICommand(a));
});

test('late support recruitment builds the stable required in addition to steelworks', () => {
  const s = tacticalScenario('screen');
  s.units = [
    troop('swordsman', 'f1', '0,0'),
    troop('spear', 'f2', '0,1'),
    troop('shield', 'f3', '1,0'),
    troop('archer', 'b1', '-1,0'),
    troop('archer', 'b2', '-1,1'),
    troop('scout', 'scout', '1,3'),
  ];
  s.units[0].hp = 5;
  s.units[1].hp = 5;
  s.units.forEach((u) => {
    u.acted = true;
    u.moves = 0;
  });
  s.technologies.enemy = Object.keys(TECHNOLOGIES) as TechnologyId[];
  s.cities.push(
    { ...s.cities[1], id: 'own2', tile: '-6,5' },
    { ...s.cities[1], id: 'own3', tile: '-6,-5' }
  );
  for (const c of s.cities.filter((c) => c.owner === 'enemy')) {
    c.buildings = ['farm', 'lumber', 'steelworks'];
    c.constructed = false;
  }
  refreshKnowledge(s);
  assert.equal(armyComposition(observe(s, 'enemy')).technology, 'paladins');
  const cmd = nextDevelopmentCommand(observe(s, 'enemy'));
  assert.equal(cmd.type, 'build');
  if (cmd.type === 'build') assert.equal(cmd.building, 'stable');
  assert.equal(execute(s, cmd).error, undefined);
});

test('V2 wounded unit rests in safety instead of marching home solely to heal', () => {
  const s = tacticalScenario('heal');
  s.units = s.units.filter((u) => u.id === 'hurt' || u.id === 'spotter');
  refreshKnowledge(s);
  const c = nextAICommand(s);
  assert.deepEqual(c, { type: 'rest', unit: 'hurt' });
  const result = execute(s, c);
  assert.equal(result.error, undefined);
  assert.equal(result.state.units.find((u) => u.id === 'hurt')!.hp, 4);
});
test('V2 explicit town rest heals once and does not stack next turn passive healing', () => {
  let s = tacticalScenario('heal');
  s.units = s.units.filter((u) => u.owner === 'enemy');
  s.units[0].tile = '-6,0';
  s.units[0].activeLastTurn = false;
  refreshKnowledge(s);
  const log: Command[] = [];
  s = finishAITurn(s, log);
  assert.ok(log.some((c) => c.type === 'rest' && c.unit === 'hurt'));
  assert.equal(s.units.find((u) => u.id === 'hurt')!.hp, 5);
  s = apply(s, { type: 'end' });
  assert.equal(s.units.find((u) => u.id === 'hurt')!.hp, 5);
});

test('V2 deployed siege waits one quiet turn, then packs instead of camping forever', () => {
  const s = tacticalScenario('escort');
  s.units = [troop('trebuchet', 'machine', '0,0')];
  s.units[0].deployed = true;
  s.units[0].deployedRound = 1;
  s.round = 2;
  s.cities[0].tile = '8,0';
  refreshKnowledge(s);
  assert.deepEqual(nextArmyCommand(observe(s, 'enemy')), { type: 'wait', unit: 'machine' });
  s.round = 3;
  assert.deepEqual(nextArmyCommand(observe(s, 'enemy')), {
    type: 'stance',
    unit: 'machine',
    stance: 'pack',
  });
  s.units[0].lastFiredRound = 2;
  assert.deepEqual(nextArmyCommand(observe(s, 'enemy')), { type: 'wait', unit: 'machine' });
});
