import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,UNITS,createClassicGame,maxFort,hasBuilding,tileAt,distance,type State,type Command} from '../src/game/engine';
import {TECHNOLOGIES,type TechnologyId} from '../src/data/technologies';
import {parseSave} from '../src/persistence/save';
import {refreshKnowledge,observe,rememberCity} from '../src/game/visibility';
import {nextArmyCommand} from '../src/ai/tactics';
import {nextDevelopmentCommand,economicUpgradeCommand} from '../src/ai/development';
import {nextAICommand} from '../src/ai/ai';
import {balanceCampaign,OPENINGS} from './helpers/balanceCampaign';
import {troop,tacticalScenario} from './helpers/tacticalScenarios';
const apply=(s:State,c:Command)=>{const r=execute(s,c);assert.equal(r.error,undefined,JSON.stringify(c)+': '+r.error);return r.state;};
test('a single catapult makes sustained progress against a town repairing every defender turn',()=>{
 let s=createClassicGame();for(const t of s.tiles){t.terrain='grass';t.height=.22;}s.cities=s.cities.slice(0,2);s.cities[0].tile='-10,-8';s.cities[1].tile='0,0';s.units=[troop('catapult','siege','3,0','player')];s.resources.enemy={gold:500,food:500,wood:500,stone:500};refreshKnowledge(s);
 let attacks=0;while(s.cities[1].fort>0&&attacks<5){s=apply(s,{type:'attack',unit:'siege',to:'0,0'});attacks++;if(!s.cities[1].fort)break;s=apply(s,{type:'end'});s=apply(s,{type:'repair',city:'c2'});s=apply(s,{type:'end'});}
 assert.equal(s.cities[1].fort,0);assert.ok(attacks<=5);
});
test('heavy and siege units can traverse a forest while preserving stand-still firing and deployment',()=>{
 for(const type of ['heavy_infantry','pikeman','crossbow','catapult','trebuchet'] as const){let s=createClassicGame();s.cities=s.cities.slice(0,2);s.units=[troop(type,'traveller','0,0','player')];tileAt(s,'0,0').terrain='grass';tileAt(s,'1,0').terrain='forest';refreshKnowledge(s);s=apply(s,{type:'move',unit:'traveller',to:'1,0'});assert.equal(s.units[0].moves,0);assert.equal(UNITS[type].moves,2);}
});
test('charted routing permits a safe detour that initially goes farther from the enemy fort',()=>{
 const s=tacticalScenario('screen');s.units=[troop('shield','walker','0,2')];s.cities[0].tile='3,0';s.cities[1].tile='-6,0';for(const t of s.tiles)t.terrain=t.q===1&&Math.abs(t.r)<=4?'mountain':'grass';
 const k=s.knowledge.enemy;k.explored=s.tiles.map(t=>t.id);k.tiles=Object.fromEntries(s.tiles.map(t=>[t.id,{...t}]));for(const c of s.cities)rememberCity(s,'enemy',c);refreshKnowledge(s);
 const cmd=nextArmyCommand(observe(s,'enemy'));assert.equal(cmd?.type,'move');if(cmd?.type==='move'){assert.ok(distance(tileAt(s,cmd.to),tileAt(s,'3,0'))>3);apply(s,cmd);}
});
test('a ready workshop is used instead of cloning another while waiting for recruitment funds',()=>{
 const s=tacticalScenario('escort');s.units=s.units.filter(u=>u.owner==='enemy'&&u.id!=='machine');s.units.push(troop('archer','bow','-5,0'));s.units.forEach(u=>{u.acted=true;u.moves=0;});s.cities[1].buildings=['siege_workshop','farm','lumber','market'];s.cities[1].fort=20;s.cities.push({...s.cities[1],id:'second',tile:'-9,-5',buildings:['farm','lumber','market']});s.resources.enemy={gold:35,wood:20,food:80,stone:50};s.technologies.enemy=Object.keys(TECHNOLOGIES) as TechnologyId[];refreshKnowledge(s);
 const c=nextDevelopmentCommand(observe(s,'enemy'));assert.equal(c.type,'recruit');if(c.type==='recruit'){assert.equal(c.city,'c2');assert.equal(c.unitType,'catapult');}apply(s,c);
});
test('healthy veteran equipment refits at home before marching and pays the upgrade cost',()=>{
 let s=tacticalScenario('screen');s.units=[troop('clubman','veteran','-6,-1')];s.cities[1].buildings=['iron_forge'];s.technologies.enemy=['basic_woodworking','mining','basic_metalworking','ironworking','swords','shields'];refreshKnowledge(s);
 const c=nextAICommand(s);assert.equal(c.type,'upgradeUnit');if(c.type==='upgradeUnit')assert.equal(c.unitType,'swordsman');const gold=s.resources.enemy.gold;s=apply(s,c);assert.ok(s.resources.enemy.gold<gold);assert.equal(s.units[0].acted,true);
});
test('a partially built facility chain waits at its best town instead of spending the next upgrade budget elsewhere',()=>{
 const s=tacticalScenario('screen');s.units=[troop('shield','a','-5,0'),troop('shield','b','-5,1'),troop('archer','bow','-4,0'),troop('scout','eyes','-4,-1')];s.cities[1].buildings=['forge','farm','lumber','market'];s.cities[1].constructed=true;s.cities.push({...s.cities[1],id:'second',tile:'-10,-7',constructed:false,buildings:['farm','lumber','market']});s.resources.enemy={gold:70,food:80,wood:60,stone:60};s.technologies.enemy=Object.keys(TECHNOLOGIES) as TechnologyId[];refreshKnowledge(s);
 const c=nextDevelopmentCommand(observe(s,'enemy'));assert.ok(!(c.type==='build'&&c.city==='second'&&['forge','iron_forge','steelworks'].includes(c.building)),JSON.stringify(c));apply(s,c);
});

test('surplus food funds an existing city level while keeping an upkeep reserve',()=>{
 let s=createClassicGame();s.resources.player.food=67;assert.equal(economicUpgradeCommand(observe(s,'player')),null);s.resources.player.food=68;const cmd=economicUpgradeCommand(observe(s,'player'));assert.ok(cmd);s=apply(s,cmd!);assert.equal(s.cities[0].level,2);assert.equal(s.resources.player.food,18);
});
for(const opening of OPENINGS)test(`two complete medium campaigns: ${opening} remains viable and fields its specialised army`,()=>{
 const rows=['balance-01','balance-02'].map(seed=>balanceCampaign({opening,seed,maxRounds:110,validate:true}));
 assert.ok(rows.every(r=>r.winner!==null),JSON.stringify(rows.map(r=>({seed:r.seed,result:r.result,round:r.round}))));
 assert.ok(rows.some(r=>r.winner==='player'));
 const [tech,unit]=opening==='expansion'?['rangers','ranger']:opening==='economy'?['heavy_infantry','heavy_infantry']:['crossbows','crossbow'];
 assert.ok(rows.some(r=>r.research[tech]<r.round&&r.fielded[unit]<r.round));assert.ok(rows.every(r=>r.firstVillage===2&&r.starved.player===0));
});

test('a tower preserves its wall strength and remains saveable after the upgrade',()=>{
 let s=createClassicGame();s.technologies.player=Object.keys(TECHNOLOGIES) as TechnologyId[];s.resources.player={gold:100,food:100,wood:100,stone:100};s=apply(s,{type:'build',city:'c1',building:'wall'});s=apply(apply(s,{type:'end'}),{type:'end'});s=apply(s,{type:'build',city:'c1',building:'tower'});assert.equal(hasBuilding(s.cities[0],'wall'),true);assert.equal(maxFort(s.cities[0]),40);assert.equal(s.cities[0].fort,40);assert.ok(parseSave(JSON.stringify(s)));assert.ok(execute(s,{type:'build',city:'c1',building:'wall'}).error);
});
