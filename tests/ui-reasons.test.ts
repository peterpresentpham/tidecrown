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

test('repair and upgrade reasons distinguish full, spent, unstable and unaffordable towns',()=>{
 const s=createGame({seed:'reason-detail'}),city=home(s);
 assert.match(commandBlock(s,{type:'repair',city:city.id})!,/đầy/);
 city.fort=8;city.repaired=true;assert.match(commandBlock(s,{type:'repair',city:city.id})!,/trong lượt/);
 city.repaired=false;city.stability=1;assert.match(commandBlock(s,{type:'repair',city:city.id})!,/ổn định/);
 city.stability=0;city.level=3;assert.match(commandBlock(s,{type:'build',city:city.id,building:'upgrade'})!,/tối đa/);
 city.level=1;city.constructed=true;assert.match(commandBlock(s,{type:'build',city:city.id,building:'upgrade'})!,/xây\/cải tạo/);
 city.constructed=false;s.resources.player.food=0;assert.match(commandBlock(s,{type:'build',city:city.id,building:'upgrade'})!,/lương/);
 assert.equal(commandBlock(s,{type:'build',city:city.id,building:'upgrade'}),execute(s,{type:'build',city:city.id,building:'upgrade'}).error);
});

test('targeted actions expose real resource and capacity blockers before selecting a target',async()=>{
 const {targetAvailability}=await import('../src/ui/actionReasons');const {troop}=await import('./helpers/tacticalScenarios');
 const s=createGame({seed:'target-blockers'});s.units=[troop('paladin','healer','0,0','player'),troop('clubman','hurt','1,0','player')];s.units[1].hp=2;s.resources.player.food=2;
 assert.match(targetAvailability(s,s.units[0],'support').reason!,/3 lương/);s.resources.player.food=3;assert.equal(targetAvailability(s,s.units[0],'support').ready,true);
 s.units=[troop('clubman','crew','0,0','player'),troop('transport','ship','1,0','player'),...Array.from({length:6},(_,i)=>({...troop('spear',`cargo-${i}`,'1,0','player'),aboard:'ship'}))];
 assert.equal(targetAvailability(s,s.units[0],'board').ready,false);s.units.pop();assert.equal(targetAvailability(s,s.units[0],'board').ready,true);
});

test('target highlights contain only commands the engine accepts, including safe landing beaches',async()=>{
 const {legalUnitTargets}=await import('../src/ui/actionReasons');const {navalScenario}=await import('./helpers/navalScenarios');const {refreshKnowledge}=await import('../src/game/visibility');
 const s=navalScenario();s.turn='player';s.units.forEach(u=>u.owner='player');s.cities[1].owner='player';s.cities[0].owner='enemy';refreshKnowledge(s);
 assert.ok(legalUnitTargets(s,{type:'board',unit:'landing'}).includes('-1,0'));
 const crew=s.units.find(u=>u.id==='landing')!;crew.aboard='ferry';crew.tile='1,0';s.units.find(u=>u.id==='ferry')!.tile='1,0';refreshKnowledge(s);
 const beaches=legalUnitTargets(s,{type:'land',unit:crew.id});assert.ok(beaches.length>0);assert.ok(!beaches.includes('2,0'),'cannot land directly in the neutral town');
 for(const to of beaches)assert.equal(execute(s,{type:'land',unit:crew.id,to}).error,undefined);
});
