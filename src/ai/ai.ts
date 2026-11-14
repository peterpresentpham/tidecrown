import {explorationRoutes,explorationPath,visiblePathDestination} from './exploration';
import { DIFFICULTIES } from '../game/map';
import { observe, isVisible } from '../game/visibility';
import { TECHNOLOGIES, type TechnologyId } from '../data/technologies';
import { BUILDINGS, UNITS, cargo, cargoUsed, isShip, isSiege, improvementReason, buildingReason, hasTech, hasBuilding, recruitReason, income, researchReason, distance, execute, previewAttack, reachable, recruitTiles, tileAt, type Command, type State, type UnitType } from '../game/engine';
export function nextAICommand(raw:State):Command{
 if(raw.turn==='player'||raw.winner)return {type:'end'};
 return plan(observe(raw,raw.turn));
}
function plan(s:State):Command{
 const owner=s.turn,profile=DIFFICULTIES[s.settings.difficulty],own=s.units.filter(u=>u.owner===owner),cities=s.cities.filter(c=>c.owner===owner&&!c.stability&&c.job?.type!=='found');
 const cap=Math.min(profile.maxArmy,Math.max(2,cities.length*profile.armyPerCity));
 const legal=(cmd:Command)=>!execute(s,cmd).error;
 const targets=[...s.units.filter(u=>u.owner!==owner&&!u.aboard).map(u=>u.tile),...s.cities.filter(c=>c.owner!==owner).map(c=>c.tile)];
 for(const u of own.filter(u=>!u.acted||UNITS[u.type].mobileShot&&u.moves>0)){
  if(u.acted){const away=[...reachable(s,u)].filter(([,r])=>r.path.length).sort((a,b)=>Math.min(...targets.map(id=>distance(tileAt(s,b[0]),tileAt(s,id))),99)-Math.min(...targets.map(id=>distance(tileAt(s,a[0]),tileAt(s,id))),99));if(away[0])return {type:'move',unit:u.id,to:away[0][0]};continue;}
  if(u.aboard){
   const choices=s.tiles.filter(t=>isVisible(s,owner,t.id)&&distance(tileAt(s,u.tile),t)<=1).sort((a,b)=>Math.min(...targets.map(id=>distance(a,tileAt(s,id))),999)-Math.min(...targets.map(id=>distance(b,tileAt(s,id))),999));
   for(const t of choices){const c:Command={type:'land',unit:u.id,to:t.id};if(legal(c))return c;}return {type:'wait',unit:u.id};
  }
  if(u.type==='paladin'||u.type==='engineer')for(const id of [...own.filter(e=>e.hp<UNITS[e.type].hp).map(e=>e.tile),...cities.filter(c=>c.fort<20).map(c=>c.tile)]){const c:Command={type:'support',unit:u.id,to:id};if(legal(c))return c;}
  const scouting=u.type==='scout'||u.type==='scout_ship';
  const attacks=[...new Set(targets)].map(id=>({id,p:previewAttack(s,u,id)})).filter(a=>a.p.legal&&(!scouting||a.p.capture||a.p.defenderHP===0&&a.p.retaliation===0)).sort((a,b)=>(Number(b.p.capture)*100+b.p.damage+b.p.fortDamage-b.p.retaliation)-(Number(a.p.capture)*100+a.p.damage+a.p.fortDamage-a.p.retaliation));
  if(attacks.length){
   if(u.type==='crossbow'&&hasTech(s,owner,'marksman')&&!u.moved&&u.stance!=='aim')return {type:'stance',unit:u.id,stance:'aim'};
   return {type:'attack',unit:u.id,to:attacks[0].id};
  }
  if(isSiege(u)){
   const near=targets.some(id=>isVisible(s,owner,id)&&distance(tileAt(s,u.tile),tileAt(s,id))<=UNITS[u.type].range+1);
   if(!u.deployed&&near&&hasTech(s,owner,'siege_logistics'))return {type:'stance',unit:u.id,stance:'deploy'};
   if(u.deployed)return {type:'stance',unit:u.id,stance:'pack'};
  }
  if(u.type==='engineer')for(const t of s.tiles.filter(t=>t.terrain==='water'&&distance(tileAt(s,u.tile),t)<=1)){
   const c:Command={type:'improve',unit:u.id,tile:t.id,improvement:'bridge'};if(!improvementReason(s,c))return c;
  }
  if(u.type==='transport'&&cargoUsed(s,u)<6)for(const p of own.filter(p=>!p.aboard&&!p.acted&&!isShip(p)&&distance(tileAt(s,p.tile),tileAt(s,u.tile))<=1)){
   // Carry troops when an observed village is across water; avoid boarding an entire mainland army.
   if(s.cities.some(c=>c.owner!==owner&&distance(tileAt(s,c.tile),tileAt(s,u.tile))>3)&&cargo(s,u).length<2){const cmd:Command={type:'board',unit:p.id,ship:u.id};if(legal(cmd))return cmd;}
  }
  if(u.moves<=0)return {type:'wait',unit:u.id};
  // Scouts capture empty villages and survey; they do not get stuck chipping walls.
  const movementTargets=scouting?s.cities.filter(c=>c.owner!==owner&&c.fort===0&&!s.units.some(e=>!e.aboard&&e.tile===c.tile&&e.owner!==owner)).map(c=>c.tile):targets;
  const routes=explorationRoutes(s,u),goals=[...routes].filter(([,r])=>r.path.length).map(([id,route])=>({id,route,target:movementTargets.find(target=>distance(tileAt(s,id),tileAt(s,target))<=UNITS[u.type].range)})).filter(g=>g.target&&(!scouting||g.route.cost<=u.moves));
  goals.sort((a,b)=>a.route.cost-b.route.cost||distance(tileAt(s,a.id),{q:0,r:0})-distance(tileAt(s,b.id),{q:0,r:0}));
  const path=goals[0]?.route.path??explorationPath(s,u,routes);
  if(path){const to=visiblePathDestination(s,u,path);if(to)return {type:'move',unit:u.id,to};}
  if(u.type==='shield')return {type:'stance',unit:u.id,stance:'guard'};
  if(u.type==='pikeman')return {type:'stance',unit:u.id,stance:'brace'};
  return {type:'wait',unit:u.id};
 }
 const net=income(s,owner),budget=s.resources[owner];
 if(own.length<cap&&hasTech(s,owner,'recon')&&!own.some(u=>u.type==='scout'))for(const c of cities)if(!recruitReason(s,c,'scout'))return {type:'recruit',city:c.id,unitType:'scout',to:recruitTiles(s,c,'scout')[0].id};
 for(const c of cities)for(const id of ['farm','lumber','granary','market'] as const){if((id==='farm'&&net.food<5||id==='lumber'&&net.wood<3||id==='granary'&&net.food<3||id==='market'&&net.gold<8)&&!buildingReason(s,c,id))return {type:'build',city:c.id,building:id};}
 // Improve terrain under the same per-city action and resource rules as the player.
 for(const c of cities.filter(c=>!c.constructed))for(const t of s.tiles.filter(t=>distance(tileAt(s,c.tile),t)<=2)){
  const improvement=net.food<3?'farm':net.wood<2?'lumber':net.stone<3?'mine':t.improvement==='farm'?'intensive_farm':t.improvement==='mine'?'quarry':null;
  if(improvement){const cmd:Command={type:'improve',city:c.id,tile:t.id,improvement};if(!improvementReason(s,cmd))return cmd;}
 }
 if(!s.research[owner]&&(s.settings.difficulty!=='easy'||s.round%2===0)){
  const priority:TechnologyId[]=['recon','basic_agriculture','basic_woodworking','mining','granary','forestry','basic_metalworking','archery','spearmen','commerce','stoneworking','advanced_agriculture','advanced_woodworking','shields','rangers','ironworking','roads','siege','catapults','crossbows','husbandry','horses','light_cavalry','swords','pikes'];
  const coastal=cities.some(c=>s.tiles.some(t=>t.terrain==='water'&&distance(t,tileAt(s,c.tile))===1));
  const all=[...priority,...Object.keys(TECHNOLOGIES) as TechnologyId[]];
  const id=all.find(id=>(coastal||TECHNOLOGIES[id].branch!=='naval')&&!researchReason(s,owner,id));if(id)return {type:'research',technology:id};
 }
 if(own.length<cap&&(net.food>0||budget.food>16)&&!(s.research[owner]?.technology==='recon'&&!own.some(u=>u.type==='scout'))){
  const desired:UnitType[]=own.some(isSiege)&&!own.some(u=>u.type==='engineer')&&hasTech(s,owner,'engineering')?['engineer','spear','clubman']:!own.some(u=>u.type==='scout')?['scout','spear','clubman']:
   s.cities.some(c=>c.owner!==owner&&c.fort>0)&&!own.some(isSiege)?['trebuchet','catapult','spear','archer','clubman']:
   s.round%3===0?['paladin','heavy_knight','horse_archer','knight','light_cavalry','spear','clubman']:
   s.round%2?['heavy_infantry','swordsman','pikeman','spear','shield','clubman']:['crossbow','ranger','archer','ballista','clubman'];
  for(const c of cities.filter(c=>!c.recruited))for(const type of desired){
   if(type!=='clubman'&&own.filter(u=>u.type===type).length>=Math.max(1,Math.ceil(cap/3))||recruitReason(s,c,type))continue;const to=recruitTiles(s,c,type).sort((a,b)=>distance(a,{q:0,r:0})-distance(b,{q:0,r:0}))[0]?.id;if(to)return {type:'recruit',city:c.id,unitType:type,to};
  }
  for(const c of cities)for(const id of ['forge','iron_forge','workshop','stable','steelworks','siege_workshop','port','shipyard'] as const){
   if(!buildingReason(s,c,id)&&desired.some(t=>UNITS[t].facility===id&&(!UNIT_TECH_LOOKUP[t]||hasTech(s,owner,UNIT_TECH_LOOKUP[t]!))))return {type:'build',city:c.id,building:id};
  }
 }
 // Fortify threatened cities, and build/recruit ships at a functioning port.
 for(const c of cities){
  const threat=s.units.some(u=>u.owner!==owner&&distance(tileAt(s,u.tile),tileAt(s,c.tile))<=4);
  if(threat)for(const id of ['wall','tower'] as const)if(!buildingReason(s,c,id))return {type:'build',city:c.id,building:id};
  if(hasBuilding(c,'port')&&own.length<cap)for(const type of ['heavy_warship','warship','transport','scout_ship'] as const)if(!own.some(u=>u.type===type)&&!recruitReason(s,c,type))return {type:'recruit',city:c.id,unitType:type,to:recruitTiles(s,c,type)[0].id};
  if(budget.food>90&&legal({type:'build',city:c.id,building:'upgrade'}))return {type:'build',city:c.id,building:'upgrade'};
 }
 // Install advanced facilities when affordable even before their unit is selected.
 if(budget.gold>70)for(const c of cities)for(const id of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[])if(!buildingReason(s,c,id))return {type:'build',city:c.id,building:id};
 return {type:'end'};
}
import { UNIT_TECH as UNIT_TECH_LOOKUP } from '../data/units';
