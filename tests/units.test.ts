import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BUILDINGS } from '../src/data/buildings';
import { RECRUITABLE_UNITS, TECHNOLOGIES, type TechnologyId } from '../src/data/technologies';
import {
  buildingReason,
  canOccupy,
  cargoUsed,
  cityProduction,
  type Command,
  createClassicGame,
  execute,
  type FactionId,
  improvementReason,
  income,
  maxFort,
  previewAttack,
  reachable,
  recruitTiles,
  type State,
  tileAt,
  type Unit,
  unitAt,
  UNITS,
  type UnitType,
} from '../src/game/engine';
import { emptyKnowledge, observe, refreshKnowledge } from '../src/game/visibility';
import { parseSave } from '../src/persistence/save';

const apply = (s: State, c: Command) => {
  const r = execute(s, c);
  assert.equal(r.error, undefined, `${JSON.stringify(c)}: ${r.error}`);
  return r.state;
};
const round = (s: State) => apply(apply(s, { type: 'end' }), { type: 'end' });
function army(type: UnitType, tile: string, owner: FactionId = 'player', id = type): Unit {
  return {
    id,
    type,
    tile,
    owner,
    hp: UNITS[type].hp,
    moves: UNITS[type].moves,
    acted: false,
    moved: false,
    retaliated: false,
    activeLastTurn: false,
  };
}
function arena(units: Unit[] = []) {
  const s = createClassicGame();
  for (const t of s.tiles)
    if (Math.abs(t.q) <= 12 && Math.abs(t.r) <= 10) {
      t.terrain = 'grass';
      t.height = 0.22;
    }
  s.cities = s.cities.slice(0, 2);
  s.cities[0].buildings = [];
  s.units = units;
  for (const f of s.factions) {
    s.resources[f] = { gold: 3000, food: 3000, wood: 3000, stone: 3000 };
    s.technologies[f] = Object.keys(TECHNOLOGIES) as TechnologyId[];
    s.knowledge[f] = emptyKnowledge();
  }
  refreshKnowledge(s);
  return s;
}
test('all 23 unit types can be recruited with correct facilities and terrain, then wait until their next turn', () => {
  for (const type of RECRUITABLE_UNITS) {
    let s = arena();
    const c = s.cities[0];
    c.tile = '0,0';
    c.level = 3;
    c.buildings = Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[];
    for (const t of s.tiles) if (t.r >= 1) t.terrain = 'water';
    refreshKnowledge(s);
    const to = recruitTiles(s, c, type)[0];
    assert.ok(to, `${type}: spawn`);
    s = apply(s, { type: 'recruit', city: c.id, unitType: type, to: to.id });
    const u = s.units.at(-1)!;
    assert.equal(u.type, type);
    assert.equal(u.moves, 0);
    assert.equal(u.acted, true);
    assert.equal(tileAt(s, to.id).terrain === 'water', UNITS[type].class === 'ship');
    s = round(s);
    assert.equal(s.units.at(-1)!.moves, UNITS[type].moves);
    assert.ok(parseSave(JSON.stringify(s)), type);
  }
});
test('guard reduces arrows and expires on the defender own next turn', () => {
  let s = arena([army('archer', '0,0'), army('shield', '2,0', 'enemy')]);
  const baseline = previewAttack(s, s.units[0], '2,0').damage;
  s.turn = 'enemy';
  s = apply(s, { type: 'stance', unit: 'shield', stance: 'guard' });
  s = apply(s, { type: 'end' });
  assert.ok(previewAttack(s, s.units[0], '2,0').damage < baseline);
  s = apply(s, { type: 'end' });
  assert.equal(s.units[1].stance, undefined);
});
test('two open movement cells enable charge; braced pikes remove that bonus', () => {
  let s = arena([army('heavy_knight', '-2,0'), army('pikeman', '1,0', 'enemy')]);
  s = apply(s, { type: 'move', unit: 'heavy_knight', to: '0,0' });
  assert.equal(s.units[0].charge, 2);
  const charge = previewAttack(s, s.units[0], '1,0').damage;
  const braced = structuredClone(s);
  braced.units[1].stance = 'brace';
  assert.equal(charge - previewAttack(braced, braced.units[0], '1,0').damage, 4);
  const after = apply(s, { type: 'attack', unit: 'heavy_knight', to: '1,0' });
  assert.equal(after.units[1].hp, UNITS.pikeman.hp - charge);
  assert.ok(after.event?.retaliation);
});
test('spears counter cavalry and swords specialize against infantry', () => {
  const s = arena([army('spear', '0,0'), army('light_cavalry', '1,0', 'enemy')]);
  assert.equal(previewAttack(s, s.units[0], '1,0').damage, 7);
  s.units[0] = army('swordsman', '0,0');
  s.units[1] = army('clubman', '1,0', 'enemy');
  assert.equal(previewAttack(s, s.units[0], '1,0').damage, 8);
});
test('crossbow aim consumes movement, pierces armor and does not globally change archers', () => {
  let s = arena([army('crossbow', '0,0'), army('heavy_infantry', '2,0', 'enemy')]);
  const before = previewAttack(s, s.units[0], '2,0').damage;
  s = apply(s, { type: 'stance', unit: 'crossbow', stance: 'aim' });
  assert.equal(s.units[0].moves, 0);
  assert.equal(s.units[0].acted, false);
  assert.equal(previewAttack(s, s.units[0], '2,0').damage, before + 2);
  s = apply(s, { type: 'attack', unit: 'crossbow', to: '2,0' });
  assert.equal(s.units[1].hp, UNITS.heavy_infantry.hp - before - 2);
  assert.equal(UNITS.archer.moves, 2);
});
test('rangers and horse archers may retreat using remaining movement, but cannot attack twice', () => {
  for (const type of ['ranger', 'horse_archer'] as const) {
    let s = arena([army(type, '0,0'), army('heavy_infantry', '2,0', 'enemy')]);
    s = apply(s, { type: 'attack', unit: type, to: '2,0' });
    const remaining = s.units[0].moves;
    assert.ok(execute(s, { type: 'attack', unit: type, to: '2,0' }).error);
    s = apply(s, { type: 'move', unit: type, to: '-1,0' });
    assert.equal(s.units[0].moves, remaining - 1);
    assert.equal(s.units[0].acted, true);
  }
});
test('rangers cross forests cheaply, while cavalry loses its charge in forest', () => {
  let s = arena([army('ranger', '0,0'), army('knight', '0,2')]);
  tileAt(s, '1,0').terrain = 'forest';
  assert.equal(reachable(s, s.units[0]).get('1,0')?.cost, 1);
  tileAt(s, '1,2').terrain = 'forest';
  s = apply(s, { type: 'move', unit: 'knight', to: '1,2' });
  assert.equal(s.units[1].charge, 0);
});
test('trebuchets require deployment, cannot move while deployed and destroy ten wall points', () => {
  let s = arena([army('trebuchet', '0,0')]);
  s.cities[1].tile = '3,0';
  refreshKnowledge(s);
  assert.match(previewAttack(s, s.units[0], '3,0').reason, /triển khai/);
  s = apply(s, { type: 'stance', unit: 'trebuchet', stance: 'deploy' });
  s = round(s);
  assert.equal(reachable(s, s.units[0]).size, 1);
  s = apply(s, { type: 'attack', unit: 'trebuchet', to: '3,0' });
  assert.equal(s.cities[1].fort, 10);
  assert.equal(s.event?.fortDamage, 10);
});
test('paladins spend food and their attack to heal; engineers spend wood/stone to repair machines', () => {
  let s = arena([army('paladin', '0,0'), army('spear', '1,0')]);
  s.units[1].hp = 3;
  const food = s.resources.player.food;
  s = apply(s, { type: 'support', unit: 'paladin', to: '1,0' });
  assert.equal(s.units[1].hp, 7);
  assert.equal(s.resources.player.food, food - 3);
  assert.equal(s.units[0].acted, true);
  assert.equal(s.event?.kind, 'heal');
  s = arena([army('engineer', '0,0'), army('catapult', '1,0')]);
  s.units[1].hp = 3;
  const wood = s.resources.player.wood;
  s = apply(s, { type: 'support', unit: 'engineer', to: '1,0' });
  assert.equal(s.units[1].hp, 8);
  assert.equal(s.resources.player.wood, wood - 3);
  assert.ok(execute(s, { type: 'support', unit: 'engineer', to: '1,0' }).error);
});
test('farms, irrigation, mines and forestry have real terrain-specific yields', () => {
  let s = arena();
  s.cities[0].tile = '0,0';
  refreshKnowledge(s);
  const base = cityProduction(s, s.cities[0]).food;
  s = apply(s, { type: 'improve', city: 'c1', tile: '1,0', improvement: 'farm' });
  assert.equal(cityProduction(s, s.cities[0]).food, base + 3);
  s = round(s);
  s = apply(s, { type: 'improve', city: 'c1', tile: '1,0', improvement: 'intensive_farm' });
  assert.equal(cityProduction(s, s.cities[0]).food, base + 5);
  s = round(s);
  tileAt(s, '1,1').improvement = 'farm';
  s = apply(s, { type: 'improve', city: 'c1', tile: '1,0', improvement: 'irrigated_farm' });
  assert.equal(cityProduction(s, s.cities[0]).food, base + 9);
  s = round(s);
  tileAt(s, '-1,0').terrain = 'hill';
  s = apply(s, { type: 'improve', city: 'c1', tile: '-1,0', improvement: 'mine' });
  assert.equal(cityProduction(s, s.cities[0]).stone, 6);
  s = round(s);
  s = apply(s, { type: 'improve', city: 'c1', tile: '-1,0', improvement: 'quarry' });
  assert.equal(cityProduction(s, s.cities[0]).stone, 8);
  s = round(s);
  s = apply(s, { type: 'improve', city: 'c1', tile: '0,1', improvement: 'forest' });
  assert.equal(tileAt(s, '0,1').terrain, 'forest');
  s = round(s);
  s = apply(s, { type: 'improve', city: 'c1', tile: '0,1', improvement: 'lumber' });
  assert.equal(cityProduction(s, s.cities[0]).wood, 6);
});
test('roads enable two steps for the basic soldier and connected markets earn a bounded bonus', () => {
  let s = arena([army('clubman', '0,1')]);
  s.cities[0].tile = '0,0';
  for (const id of ['1,1', '2,1']) tileAt(s, id).road = 'player';
  refreshKnowledge(s);
  assert.equal(reachable(s, s.units[0]).get('2,1')?.cost, 1);
  s = apply(s, { type: 'move', unit: 'clubman', to: '2,1' });
  assert.equal(s.units[0].moves, 0);
  s.cities[0].buildings = ['market'];
  s.cities.push({ ...s.cities[0], id: 'connected', tile: '4,0', buildings: [] });
  const before = cityProduction(s, s.cities[0]).gold;
  for (const id of ['1,0', '2,0', '3,0']) tileAt(s, id).road = 'player';
  assert.equal(cityProduction(s, s.cities[0]).gold, before + 2);
});
test('engineers bridge one water tile, but cannot bridge deep water or build for free', () => {
  let s = arena([army('engineer', '0,0')]);
  tileAt(s, '1,0').terrain = 'water';
  refreshKnowledge(s);
  assert.equal(
    improvementReason(s, { type: 'improve', unit: 'engineer', tile: '1,0', improvement: 'bridge' }),
    null
  );
  s = apply(s, { type: 'improve', unit: 'engineer', tile: '1,0', improvement: 'bridge' });
  assert.equal(tileAt(s, '1,0').bridge, 'player');
  assert.ok(canOccupy(s, { type: 'clubman', owner: 'player' }, tileAt(s, '1,0')));
  assert.equal(canOccupy(s, { type: 'scout_ship', owner: 'player' }, tileAt(s, '1,0')), false);
});
test('walls are independent from economic level and towers fire only at visible opposing units', () => {
  let s = arena([army('clubman', '2,0', 'enemy')]);
  s.cities[0].tile = '0,0';
  refreshKnowledge(s);
  const fort = s.cities[0].fort;
  s = apply(s, { type: 'build', city: 'c1', building: 'wall' });
  assert.equal(s.cities[0].fort, fort + 20);
  assert.equal(maxFort(s.cities[0]), 40);
  assert.equal(s.cities[0].level, 1);
  s = round(s);
  s = apply(s, { type: 'build', city: 'c1', building: 'tower' });
  s = round(s);
  assert.equal(s.units[0].hp, 6);
  assert.equal(s.event?.kind, 'attack');
  assert.equal(income(s, 'player').gold, 4);
});
test('ships need water; sailing unlocks deep water and transport cannot attack or capture', () => {
  const s = arena([army('scout_ship', '0,1')]);
  for (const t of s.tiles) if (t.r >= 1) t.terrain = 'water';
  s.technologies.player = ['basic_woodworking', 'naval'];
  refreshKnowledge(s);
  assert.equal(reachable(s, s.units[0]).has('0,3'), false);
  s.technologies.player = Object.keys(TECHNOLOGIES) as TechnologyId[];
  assert.ok(reachable(s, s.units[0]).has('0,3'));
  assert.equal(reachable(s, s.units[0]).has('0,0'), false);
  s.units[0].type = 'transport';
  s.cities[1].tile = '1,0';
  s.cities[1].fort = 0;
  refreshKnowledge(s);
  assert.equal(previewAttack(s, s.units[0], '1,0').legal, false);
});
test('transport capacity, embarkation, passenger visibility, movement and disembarkation survive saves', () => {
  let s = arena([
    army('transport', '0,1'),
    army('heavy_infantry', '0,0'),
    army('catapult', '1,0'),
    army('spear', '-1,0'),
  ]);
  s.cities[0].tile = '-2,0';
  for (const t of s.tiles) if (t.r >= 1) t.terrain = 'water';
  refreshKnowledge(s);
  for (const id of ['heavy_infantry', 'catapult', 'spear'])
    s = apply(s, { type: 'board', unit: id, ship: 'transport' });
  assert.equal(cargoUsed(s, s.units[0]), 6);
  assert.equal(unitAt(s, '0,1')?.id, 'transport');
  s = apply(s, { type: 'move', unit: 'transport', to: '1,1' });
  assert.ok(s.units.every((u) => u.tile === '1,1'));
  assert.ok(observe(s, 'enemy').units.every((u) => !u.aboard));
  assert.ok(parseSave(JSON.stringify(s)));
  s = round(s);
  s = apply(s, { type: 'land', unit: 'spear', to: '1,0' });
  const p = s.units.find((u) => u.id === 'spear')!;
  assert.equal(p.aboard, undefined);
  assert.equal(p.acted, true);
  assert.equal(p.disoriented, false);
});
test('sinking a transport removes its passengers rather than leaving ghost armies on water', () => {
  let s = arena([army('transport', '0,1'), army('spear', '0,0'), army('warship', '2,1', 'enemy')]);
  for (const t of s.tiles) if (t.r >= 1) t.terrain = 'water';
  refreshKnowledge(s);
  s = apply(s, { type: 'board', unit: 'spear', ship: 'transport' });
  s.units[0].hp = 1;
  s.turn = 'enemy';
  refreshKnowledge(s);
  s = apply(s, { type: 'attack', unit: 'warship', to: '0,1' });
  assert.equal(
    s.units.some((u) => u.id === 'transport' || u.id === 'spear'),
    false
  );
});
test('upgrading a unit pays the difference, preserves damage and consumes the action', () => {
  let s = arena([army('clubman', '0,-1')]);
  s.cities[0].tile = '0,0';
  s.cities[0].buildings = ['iron_forge'];
  s.units[0].hp = 4;
  refreshKnowledge(s);
  const gold = s.resources.player.gold;
  s = apply(s, { type: 'upgradeUnit', unit: 'clubman', unitType: 'swordsman' });
  assert.equal(s.units[0].hp, 4);
  assert.equal(s.units[0].type, 'swordsman');
  assert.equal(
    s.resources.player.gold,
    gold - (UNITS.swordsman.cost.gold - UNITS.clubman.cost.gold)
  );
  assert.equal(s.units[0].acted, true);
});
test('hidden shooter events show the hit without revealing the shooter, including loss of the last forward unit', () => {
  let s = arena([army('clubman', '4,0'), army('trebuchet', '0,0', 'enemy')]);
  s.units[1].deployed = true;
  s.units[0].hp = 1;
  s.turn = 'enemy';
  refreshKnowledge(s);
  s = apply(s, { type: 'attack', unit: 'trebuchet', to: '4,0' });
  const view = observe(s, 'player');
  assert.equal(view.event?.actor, '');
  assert.equal(view.event?.actorType, undefined);
  assert.equal(view.event?.from, '4,0');
  assert.ok(view.event?.damage);
  assert.equal(
    view.units.some((u) => u.type === 'trebuchet'),
    false
  );
});
test('facility slots, coast requirements and corrupt action events are enforced', () => {
  const s = arena();
  s.cities[0].tile = '0,0';
  assert.match(buildingReason(s, s.cities[0], 'port')!, /giáp biển/);
  s.cities[0].buildings = ['stable', 'forge', 'workshop'];
  assert.ok(buildingReason(s, s.cities[0], 'siege_workshop'));
  const invalid = structuredClone(s);
  invalid.event = {
    id: 1,
    kind: 'move',
    actor: 'none',
    owner: 'player',
    from: '999,1',
    to: '0,0',
    damage: 0,
    retaliation: 0,
    fortDamage: 0,
  };
  assert.equal(parseSave(JSON.stringify(invalid)), null);
});

test('engineers repair the fort rather than healing a non-machine garrison; bridge construction cannot trap a ship', () => {
  let s = arena([army('engineer', '0,0'), army('spear', '1,0')]);
  s.cities[0].tile = '1,0';
  s.cities[0].fort = 4;
  s.units[1].hp = 2;
  refreshKnowledge(s);
  s = apply(s, { type: 'support', unit: 'engineer', to: '1,0' });
  assert.equal(s.units[1].hp, 2);
  assert.equal(s.cities[0].fort, 9);
  s = arena([army('engineer', '0,0'), army('scout_ship', '1,0')]);
  tileAt(s, '1,0').terrain = 'water';
  refreshKnowledge(s);
  assert.ok(
    execute(s, { type: 'improve', unit: 'engineer', tile: '1,0', improvement: 'bridge' }).error
  );
});

test('save validation rejects malformed animation audiences and remembered improvement geometry', () => {
  const s = arena([army('clubman', '0,0')]);
  const moved = apply(s, { type: 'move', unit: 'clubman', to: '1,0' });
  const badEvent = JSON.parse(JSON.stringify(moved));
  badEvent.event.viewers = {};
  assert.equal(parseSave(JSON.stringify(badEvent)), null);
  const badMemory = JSON.parse(JSON.stringify(moved));
  badMemory.knowledge.player.tiles['0,0'].improvement = 17;
  assert.equal(parseSave(JSON.stringify(badMemory)), null);
});
