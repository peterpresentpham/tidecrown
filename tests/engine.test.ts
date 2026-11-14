import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextAICommand } from '../src/ai/ai';
import { TECHNOLOGIES } from '../src/data/technologies';
import {
  type Command,
  createClassicGame as createCampaign,
  execute,
  income,
  previewAttack,
  reachable,
  recruitTiles,
  type State,
  tileAt,
  type Unit,
  UNITS,
} from '../src/game/engine';
import { refreshKnowledge } from '../src/game/visibility';

// Compact battle fixture isolates combat/economy rules from the larger campaign opening.
function createGame(): State {
  const s = createCampaign();
  s.resources = {
    ...s.resources,
    player: { gold: 100, food: 65, wood: 80, stone: 80 },
    enemy: { gold: 100, food: 65, wood: 80, stone: 80 },
  };
  s.technologies = {
    ...s.technologies,
    player: Object.keys(TECHNOLOGIES) as (keyof typeof TECHNOLOGIES)[],
    enemy: Object.keys(TECHNOLOGIES) as (keyof typeof TECHNOLOGIES)[],
  };
  s.cities = s.cities.slice(0, 3);
  s.cities[0].tile = '-4,2';
  s.cities[1].tile = '4,-2';
  s.cities[2].tile = '0,0';
  for (const c of s.cities) {
    c.fort = 20;
    c.buildings = ['forge'];
  }
  for (const t of s.tiles) if (Math.abs(t.q) <= 5 && Math.abs(t.r) <= 4) t.terrain = 'grass';
  const entries = [
    ['shield', '-2,0', 'player'],
    ['archer', '-3,0', 'player'],
    ['catapult', '-3,1', 'player'],
    ['scout', '-2,2', 'player'],
    ['shield', '2,0', 'enemy'],
    ['archer', '3,-1', 'enemy'],
    ['catapult', '4,-1', 'enemy'],
    ['scout', '2,-2', 'enemy'],
  ] as const;
  s.units = entries.map(([type, tile, owner], i) => ({
    id: `u${i + 1}`,
    type,
    tile,
    owner,
    hp: UNITS[type].hp,
    moves: UNITS[type].moves,
    acted: false,
    moved: false,
    retaliated: false,
    activeLastTurn: false,
  }));
  s.serial = 8;
  refreshKnowledge(s);
  return s;
}

function apply(s: State, c: Command) {
  const result = execute(s, c);
  assert.equal(result.error, undefined, `Command ${JSON.stringify(c)}: ${result.error}`);
  return result.state;
}
function round(s: State) {
  return apply(apply(s, { type: 'end' }), { type: 'end' });
}
function duel(): State {
  const s = createGame();
  s.units = [s.units[0], s.units[4]];
  s.units[0].tile = '-1,1';
  s.units[1].tile = '0,1';
  tileAt(s, '-1,1').terrain = 'grass';
  tileAt(s, '0,1').terrain = 'grass';
  refreshKnowledge(s);
  return s;
}
test('fixed scenario is deterministic and starts on valid non-overlapping tiles', () => {
  const s = createGame();
  assert.deepEqual(s, createGame());
  assert.equal(new Set(s.units.map((u) => u.tile)).size, s.units.length);
  assert.ok(s.units.every((u) => !['water', 'mountain'].includes(tileAt(s, u.tile).terrain)));
  assert.equal(s.tiles.length, 825);
});
test('movement spends terrain cost and cannot walk through a city or occupied tile', () => {
  let s = createGame();
  const u = s.units[0];
  tileAt(s, '-1,0').terrain = 'forest';
  assert.equal(reachable(s, u).get('-1,0')?.cost, 2);
  assert.equal(reachable(s, u).has('0,0'), false);
  assert.equal(reachable(s, u).has('-3,0'), false);
  s = apply(s, { type: 'move', unit: u.id, to: '-1,0' });
  assert.equal(s.units[0].moves, 0);
  assert.equal(s.units[0].acted, false);
});
test('invalid and wrong-owner commands are atomic', () => {
  const s = createGame(),
    snapshot = structuredClone(s);
  assert.equal(execute(s, { type: 'move', unit: s.units[4].id, to: '1,0' }).state, s);
  assert.ok(execute(s, { type: 'move', unit: s.units[0].id, to: '8,0' }).error);
  assert.deepEqual(s, snapshot);
});
test('combat preview and execution agree including retaliation', () => {
  let s = duel();
  const attacker = s.units[0],
    defender = s.units[1];
  const p = previewAttack(s, attacker, defender.tile);
  assert.equal(p.damage, 3);
  assert.equal(p.retaliation, 3);
  s = apply(s, { type: 'attack', unit: attacker.id, to: defender.tile });
  assert.equal(s.units[0].hp, p.attackerHP);
  assert.equal(s.units[1].hp, p.defenderHP);
  assert.equal(s.units[0].moves, 0);
  assert.equal(s.units[0].acted, true);
});
test('a defender retaliates at most once per opposing turn', () => {
  let s = duel();
  const second: Unit = { ...s.units[0], id: 'second', tile: '1,1' };
  s.units.push(second);
  s = apply(s, { type: 'attack', unit: s.units[0].id, to: '0,1' });
  const p = previewAttack(s, second, '0,1');
  assert.equal(p.legal, true);
  assert.equal(p.retaliation, 0);
});
test('killed defenders do not retaliate', () => {
  const s = duel();
  s.units[1].hp = 2;
  const p = previewAttack(s, s.units[0], s.units[1].tile);
  assert.equal(p.defenderHP, 0);
  assert.equal(p.retaliation, 0);
  const after = apply(s, { type: 'attack', unit: s.units[0].id, to: s.units[1].tile });
  assert.equal(after.units.length, 1);
});
test('forest and fortification armor affect preview', () => {
  const s = duel();
  tileAt(s, s.units[1].tile).terrain = 'forest';
  assert.equal(previewAttack(s, s.units[0], s.units[1].tile).damage, 2);
  s.cities[1].tile = s.units[1].tile;
  assert.equal(previewAttack(s, s.units[0], s.units[1].tile).damage, 1);
});
test('catapult destroys six fort points and cannot fire after moving', () => {
  let s = createGame();
  const c = s.units.find((u) => u.type === 'catapult' && u.owner === 'player')!;
  assert.equal(previewAttack(s, c, '0,0').fortDamage, 6);
  s = apply(s, { type: 'attack', unit: c.id, to: '0,0' });
  assert.equal(s.cities[2].fort, 14);
  s = round(s);
  s = apply(s, { type: 'move', unit: c.id, to: '-2,1' });
  assert.match(
    previewAttack(
      s,
      s.units.find((u) => u.id === c.id)!,
      '0,0'
    ).reason,
    /đứng yên/
  );
});
test('archer line of sight is blocked by intermediate city', () => {
  const s = createGame();
  const a = s.units.find((u) => u.type === 'archer' && u.owner === 'player')!;
  a.tile = '-1,0';
  const enemy = s.units.find((u) => u.owner === 'enemy')!;
  enemy.tile = '1,0';
  refreshKnowledge(s);
  assert.match(previewAttack(s, a, '1,0').reason, /Đường bắn/);
});
test('empty fortified city is not capturable; broken city requires melee', () => {
  let s = createGame();
  const shield = s.units[0];
  shield.tile = '-1,0';
  assert.equal(previewAttack(s, shield, '0,0').capture, false);
  s.cities[2].fort = 0;
  const archer = s.units[1];
  assert.equal(previewAttack(s, archer, '0,0').legal, false);
  s = apply(s, { type: 'attack', unit: shield.id, to: '0,0' });
  assert.equal(s.cities[2].owner, 'player');
  assert.equal(s.cities[2].stability, 2);
  assert.equal(s.units[0].tile, '0,0');
});
test('capturing the last enemy city wins and removes enemy troops', () => {
  let s = createGame();
  s.units[0].tile = '3,-2';
  s.cities[1].fort = 0;
  s = apply(s, { type: 'attack', unit: s.units[0].id, to: '4,-2' });
  assert.equal(s.winner, 'player');
  assert.equal(
    s.units.some((u) => u.owner === 'enemy'),
    false
  );
  assert.ok(execute(s, { type: 'end' }).error);
});
test('village upgrade spends shared food immediately and increases income, then respects max level', () => {
  let s = createGame();
  const before = income(s, 'player').gold;
  s = apply(s, { type: 'build', city: 'c1', building: 'upgrade' });
  assert.equal(s.resources.player.gold, 100);
  assert.equal(s.resources.player.food, 25);
  assert.equal(s.cities[0].level, 2);
  assert.equal(s.cities[0].fort, 20);
  assert.equal(income(s, 'player').gold, before + 5);
  assert.ok(execute(s, { type: 'build', city: 'c1', building: 'upgrade' }).error);
  s = round(s);
  s.resources.player.food = 100;
  s = apply(s, { type: 'build', city: 'c1', building: 'upgrade' });
  assert.equal(s.cities[0].level, 3);
  assert.equal(s.cities[0].fort, 20);
  assert.ok(execute(s, { type: 'build', city: 'c1', building: 'upgrade' }).error);
});
test('specialty construction completes and increases income', () => {
  let s = createGame();
  const before = income(s, 'player').gold;
  s = apply(s, { type: 'build', city: 'c1', building: 'market' });
  s = round(s);
  assert.equal(s.cities[0].buildings!.includes('market'), true);
  assert.equal(income(s, 'player').gold, before + 4);
});
test('recruitment chooses valid tile, is limited per city and readies next turn', () => {
  let s = createGame();
  const t = recruitTiles(s, s.cities[0])[0];
  s = apply(s, { type: 'recruit', city: 'c1', unitType: 'spear', to: t.id });
  const recruited = s.units.at(-1)!;
  assert.equal(recruited.acted, true);
  assert.equal(recruited.moves, 0);
  assert.ok(execute(s, { type: 'recruit', city: 'c1', unitType: 'clubman', to: '-4,1' }).error);
  s = round(s);
  assert.equal(s.units.at(-1)!.acted, false);
  assert.equal(s.units.at(-1)!.moves, UNITS.spear.moves);
});
test('new city requires distance, friendly presence and funds, then completes', () => {
  let s = createGame();
  const scout = s.units.find((u) => u.owner === 'player' && u.type === 'scout')!;
  const t = tileAt(s, '-1,3');
  t.terrain = 'grass';
  scout.tile = t.id;
  assert.ok(execute(s, { type: 'found', tile: '-4,2' }).error);
  s = apply(s, { type: 'found', tile: t.id });
  assert.equal(s.cities.length, 4);
  assert.equal(s.resources.player.gold, 55);
  assert.equal(income(s, 'player').gold, 0);
  assert.equal(s.cities.at(-1)!.fort, 10);
  s = round(s);
  assert.equal(s.cities.at(-1)!.fort, 20);
});
test('repair requires no adjacent enemy and respects once per turn', () => {
  let s = createGame();
  s.cities[0].fort = 8;
  s = apply(s, { type: 'repair', city: 'c1' });
  assert.equal(s.cities[0].fort, 10);
  assert.ok(execute(s, { type: 'repair', city: 'c1' }).error);
  s = round(s);
  s.units.find((u) => u.owner === 'enemy')!.tile = '-3,2';
  assert.ok(execute(s, { type: 'repair', city: 'c1' }).error);
});
test('bankruptcy clamps resources and prevents recruitment', () => {
  let s = createGame();
  s.resources.player.gold = 0;
  s.resources.player.food = 0;
  for (let i = 0; i < 10; i++) s.units.push({ ...s.units[0], id: `extra${i}` });
  s = round(s);
  assert.equal(s.bankrupt.player, true);
  assert.equal(s.resources.player.gold, 0);
  const dest = recruitTiles(s, s.cities[0])[0];
  assert.ok(execute(s, { type: 'recruit', city: 'c1', unitType: 'clubman', to: dest.id }).error);
});
test('AI emits valid commands, terminates each turn, and preserves invariants', () => {
  let s = createGame();
  for (let roundIndex = 0; roundIndex < 12 && !s.winner; roundIndex++) {
    s = apply(s, { type: 'end' });
    let steps = 0;
    while (s.turn === 'enemy' && !s.winner) {
      assert.ok(++steps < 80, 'AI must terminate');
      s = apply(s, nextAICommand(s));
      assert.equal(new Set(s.units.map((u) => u.tile)).size, s.units.length);
      assert.ok(s.units.every((u) => u.hp > 0 && u.moves >= 0));
      assert.ok(Object.values(s.resources).every((r) => r.gold >= 0 && r.food >= 0 && r.wood >= 0));
    }
  }
});

test('classic opening has one recognizable army per faction and seven forts on a square map', () => {
  const s = createCampaign();
  assert.equal(s.tiles.length, 33 * 25);
  assert.equal(s.units.filter((u) => u.owner === 'player').length, 1);
  assert.equal(s.units.filter((u) => u.owner === 'enemy').length, 1);
  assert.equal(s.cities.length, 7);
  assert.equal(s.cities.filter((c) => c.owner === null && c.fort === 0).length, 5);
  assert.equal(s.resources.player.gold, 20);
});
test('basic soldier reaches the first village in two turns without research or siege', () => {
  let s = createCampaign();
  const unit = s.units.find((u) => u.owner === 'player')!;
  assert.equal(reachable(s, unit).get('-7,3')?.cost, 1);
  s = apply(s, { type: 'move', unit: unit.id, to: '-7,3' });
  s = round(s);
  s = apply(s, { type: 'move', unit: unit.id, to: '-6,3' });
  assert.equal(
    previewAttack(
      s,
      s.units.find((u) => u.id === unit.id)!,
      '-5,3'
    ).capture,
    true
  );
  s = apply(s, { type: 'attack', unit: unit.id, to: '-5,3' });
  assert.equal(s.cities.find((c) => c.tile === '-5,3')!.owner, 'player');
});
