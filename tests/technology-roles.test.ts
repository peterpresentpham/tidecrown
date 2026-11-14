import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TECHNOLOGIES,type TechnologyId} from '../src/data/technologies';
import {UNIT_TECH} from '../src/data/units';
import {BUILDINGS,type BuildingId,type ImprovementId} from '../src/data/buildings';
import {createClassicGame,execute,recruitTiles,income,tileAt,reachable,type State,type Command} from '../src/game/engine';
import {emptyKnowledge,refreshKnowledge} from '../src/game/visibility';
import {troop} from './helpers/tacticalScenarios';
const apply=(s:State,c:Command)=>{const r=execute(s,c);assert.equal(r.error,undefined,JSON.stringify(c)+': '+r.error);return r.state;};
function prerequisites(id:TechnologyId):TechnologyId[]{return [...new Set(TECHNOLOGIES[id].requires.flatMap(req=>[...prerequisites(req),req]))];}
function arena(id:TechnologyId){const s=createClassicGame();s.units=[];s.cities=s.cities.slice(0,2);s.cities[0].tile='0,0';s.cities[0].buildings=[];s.cities[1].tile='12,-8';for(const t of s.tiles){t.terrain=t.r>=1?'water':'grass';t.height=.22;}s.technologies.player=prerequisites(id);s.resources.player={gold:5000,food:5000,wood:5000,stone:5000};s.knowledge.player=emptyKnowledge();refreshKnowledge(s);return s;}
function learn(s:State,id:TechnologyId){s=apply(s,{type:'research',technology:id});for(let n=0;n<TECHNOLOGIES[id].turns;n++)s=apply(apply(s,{type:'end'}),{type:'end'});assert.ok(s.technologies.player.includes(id));return s;}
const covered=new Set<TechnologyId>();
for(const [type,id] of Object.entries(UNIT_TECH)){
 const tech=id!;covered.add(tech);
 test(`role ${tech}: researching enables an actual paid recruit with its required facilities`,()=>{
  let s=arena(tech);const unitType=type as keyof typeof UNIT_TECH;
  const facility=(requiredFacilities(unitType));s.cities[0].buildings=facility;
  const to=recruitTiles(s,s.cities[0],unitType)[0]?.id;assert.ok(to);
  const cmd:Command={type:'recruit',city:'c1',unitType,to};assert.ok(execute(s,cmd).error);
  s=learn(s,tech);const gold=s.resources.player.gold;s=apply(s,cmd);assert.equal(s.units.at(-1)!.type,unitType);assert.ok(s.resources.player.gold<gold);
 });
}
function requiredFacilities(type:keyof typeof UNIT_TECH):BuildingId[]{
 // Facilities are prebuilt only to isolate the technology's own gate; their
 // construction/prerequisites are exercised separately below and in units.test.
 const map:Partial<Record<keyof typeof UNIT_TECH,BuildingId[]>>={spear:['forge'],pikeman:['forge'],swordsman:['iron_forge'],heavy_infantry:['steelworks'],crossbow:['workshop'],light_cavalry:['stable'],horse_archer:['stable'],knight:['stable'],heavy_knight:['stable','steelworks'],paladin:['stable','steelworks'],engineer:['workshop'],ballista:['siege_workshop'],catapult:['siege_workshop'],trebuchet:['siege_workshop'],scout_ship:['port'],transport:['port'],warship:['shipyard'],heavy_warship:['shipyard']};return map[type]??[];
}
const structures:Partial<Record<TechnologyId,BuildingId>>={basic_agriculture:'farm',granary:'granary',horses:'stable',commerce:'market',advanced_woodworking:'workshop',basic_metalworking:'forge',ironworking:'iron_forge',steel:'steelworks',siege:'siege_workshop',walls:'wall',towers:'tower',naval:'port',sailing:'shipyard'};
for(const [key,building] of Object.entries(structures)){
 const id=key as TechnologyId;covered.add(id);
 test(`role ${id}: unlocks usable ${building}, not just a completed icon`,()=>{
  let s=arena(id);const req=BUILDINGS[building!].requires;if(req)s.cities[0].buildings=[req];
  const cmd:Command={type:'build',city:'c1',building:building!};assert.ok(execute(s,cmd).error);s=learn(s,id);
  const before=income(s,'player'),fort=s.cities[0].fort;s=apply(s,cmd);assert.ok(s.cities[0].buildings?.includes(building!));
  if(building==='farm')assert.equal(income(s,'player').food,before.food+4);
  if(building==='granary')assert.equal(income(s,'player').food,before.food+2);
  if(building==='market')assert.equal(income(s,'player').gold,before.gold+4);
  if(building==='workshop')assert.equal(income(s,'player').wood,before.wood+2);
  if(building==='wall')assert.equal(s.cities[0].fort,fort+20);
 });
}
const improvements:Partial<Record<TechnologyId,ImprovementId>>={advanced_agriculture:'intensive_farm',irrigation:'irrigated_farm',husbandry:'pasture',mining:'mine',stoneworking:'quarry',roads:'road'};
for(const [key,kind] of Object.entries(improvements)){
 const id=key as TechnologyId;covered.add(id);
 test(`role ${id}: a real territory action changes yield or movement`,()=>{
  let s=arena(id);const t=tileAt(s,'-1,0');if(kind==='mine'||kind==='quarry')t.terrain='hill';if(kind==='quarry')t.improvement='mine';if(kind==='intensive_farm')t.improvement='farm';if(kind==='irrigated_farm'){t.improvement='intensive_farm';tileAt(s,'-2,0').improvement='farm';}refreshKnowledge(s);
  const cmd:Command={type:'improve',city:'c1',tile:t.id,improvement:kind!};assert.ok(execute(s,cmd).error);s=learn(s,id);
  const before=income(s,'player');s=apply(s,cmd);assert.ok(s.resources.player.gold<5000);
  if(kind==='road'){s.units=[troop('clubman','walker','0,0','player')];refreshKnowledge(s);assert.equal(reachable(s,s.units[0]).get('-1,0')?.cost,.5);}
  else assert.ok(income(s,'player').food>before.food||income(s,'player').stone>before.stone);
 });
}
covered.add('basic_woodworking');test('role basic_woodworking: an existing town immediately produces additional wood',()=>{let s=arena('basic_woodworking');const n=income(s,'player').wood;s=learn(s,'basic_woodworking');assert.equal(income(s,'player').wood,n+1);});
covered.add('forestry');test('role forestry: existing logging improves and replanting becomes usable',()=>{let s=arena('forestry');tileAt(s,'-1,0').terrain='forest';tileAt(s,'-1,0').improvement='lumber';refreshKnowledge(s);const before=income(s,'player').wood;const cmd:Command={type:'improve',city:'c1',tile:'0,-1',improvement:'forest'};assert.ok(execute(s,cmd).error);s=learn(s,'forestry');assert.equal(income(s,'player').wood,before+1);s=apply(s,cmd);assert.equal(tileAt(s,'0,-1').terrain,'forest');});
covered.add('marksman');test('role marksman: unlocks aim for a real crossbow',()=>{let s=arena('marksman');s.units=[troop('crossbow','bow','0,0','player')];refreshKnowledge(s);const cmd:Command={type:'stance',unit:'bow',stance:'aim'};assert.ok(execute(s,cmd).error);s=learn(s,'marksman');s=apply(s,cmd);assert.equal(s.units[0].stance,'aim');assert.equal(s.units[0].moves,0);});
covered.add('siege_logistics');test('role siege_logistics: a machine can deploy and pack',()=>{let s=arena('siege_logistics');s.units=[troop('catapult','siege','0,0','player')];refreshKnowledge(s);const cmd:Command={type:'stance',unit:'siege',stance:'deploy'};assert.ok(execute(s,cmd).error);s=learn(s,'siege_logistics');s=apply(s,cmd);assert.equal(s.units[0].deployed,true);s=apply(apply(s,{type:'end'}),{type:'end'});s=apply(s,{type:'stance',unit:'siege',stance:'pack'});assert.equal(s.units[0].deployed,false);});
covered.add('amphibious');test('role amphibious: landing removes the armor penalty but still spends the action',()=>{
 let s=arena('amphibious');const p=troop('clubman','crew','0,1','player');p.aboard='ship';s.units=[troop('transport','ship','0,1','player'),p];refreshKnowledge(s);const cmd:Command={type:'land',unit:'crew',to:'1,0'};
 const early=apply(s,cmd);assert.equal(early.units[1].disoriented,true);s=learn(s,'amphibious');s=apply(s,cmd);assert.equal(s.units[1].disoriented,false);assert.equal(s.units[1].acted,true);
});
test('role matrix covers every one of the 45 technologies',()=>assert.deepEqual([...covered].sort(),Object.keys(TECHNOLOGIES).sort()));
