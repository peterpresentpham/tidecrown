import {navalDemand} from './naval';
import {isVisible} from '../game/visibility';
import {DIFFICULTIES} from '../game/map';
import {TECHNOLOGIES,type TechnologyId} from '../data/technologies';
import {BUILDINGS,UNITS,income,researchReason,unitLockReason,recruitReason,recruitTiles,buildingReason,improvementReason,hasTech,hasBuilding,neighbors,distance,tileAt,maxFort,upgradeCost,execute,isShip,isSiege,type State,type Command,type UnitType,type BuildingId} from '../game/engine';
import {frontline,armyIntent} from './tactics';

/** Role shortages and observed counters, rather than round parity, drive recruitment. */
export function armyComposition(s:State):{types:UnitType[];technology:TechnologyId}{
 const own=s.units.filter(u=>u.owner===s.turn&&!u.aboard&&!isShip(u)&&u.type!=='scout'),fronts=own.filter(frontline),ranged=own.filter(u=>UNITS[u.type].range>1&&!isSiege(u));
 const enemy=s.units.filter(u=>u.owner!==s.turn&&!u.aboard),cavalry=enemy.filter(u=>UNITS[u.type].class==='cavalry').length;
 if(!fronts.length||fronts.length<Math.max(1,ranged.length)||cavalry&&!fronts.some(u=>['spear','pikeman'].includes(u.type)))return cavalry?{types:['pikeman','spear','clubman'],technology:'spearmen'}:{types:['heavy_infantry','swordsman','shield','clubman'],technology:'shields'};
 const fort=s.cities.some(c=>c.owner&&c.owner!==s.turn&&c.fort>0);
 const fortified=s.cities.some(c=>c.owner&&c.owner!==s.turn&&c.fort>=30);
 if(fort&&fronts.length>=2&&own.filter(isSiege).length<(fortified?2:1))return {types:['trebuchet','catapult'],technology:fortified&&own.some(isSiege)?'trebuchets':'catapults'};
 if(!ranged.length||ranged.length*2<fronts.length)return {types:['crossbow','ranger','archer'],technology:enemy.some(u=>UNITS[u.type].armor>=3)?'crossbows':'archery'};
 if(own.some(isSiege)&&!own.some(u=>u.type==='engineer'))return {types:['engineer'],technology:'engineering'};
 if(own.length>=5&&own.filter(u=>u.hp<UNITS[u.type].hp).length>=2&&!own.some(u=>u.type==='paladin'))return {types:['paladin'],technology:'paladins'};
 if(fronts.length<Math.ceil((own.length+1)*.55))return {types:['heavy_infantry','swordsman','pikeman','spear','shield','clubman'],technology:'swords'};
 return {types:['horse_archer','crossbow','ranger','archer'],technology:'mounted_archery'};
}
function nextKnowledge(s:State,id:TechnologyId):TechnologyId|null{
 if(hasTech(s,s.turn,id))return null;
 for(const req of TECHNOLOGIES[id].requires){const next=nextKnowledge(s,req);if(next)return next;}
 return id;
}
/** Continue the most advanced facility chain in one suitable town. A spent
 * construction action is a reason to wait, not to start the chain elsewhere. */
export function facilityHome(s:State,type:UnitType,cities:State['cities']){
 const chain:BuildingId[]=[];let id=UNITS[type].facility as BuildingId|undefined;
 while(id){chain.push(id);id=BUILDINGS[id].requires;}
 if(['heavy_knight','paladin'].includes(type))chain.push('stable');
 const progress=(c:State['cities'][number])=>chain.filter(id=>hasBuilding(c,id)).length;
 return cities.filter(c=>!isShip({type})||neighbors(s,c.tile).some(t=>t.terrain==='water')).sort((a,b)=>progress(b)-progress(a)||a.id.localeCompare(b.id,undefined,{numeric:true}))[0];
}
/** Food reserves can fund existing city levels when gold is the bottleneck. */
export function economicUpgradeCommand(s:State):Command|null{
 const net=income(s,s.turn);if(net.gold>=8||net.food<1)return null;
 const city=s.cities.find(c=>c.owner===s.turn&&c.level<3&&!c.stability&&!c.job&&!c.constructed&&s.resources[s.turn].food>=upgradeCost(s,c).food+18);
 return city?{type:'build',city:city.id,building:'upgrade'}:null;
}
export function nextDevelopmentCommand(s:State):Command{
 const owner=s.turn,profile=DIFFICULTIES[s.settings.difficulty],own=s.units.filter(u=>u.owner===owner),cities=s.cities.filter(c=>c.owner===owner&&!c.stability&&c.job?.type!=='found'),cap=Math.min(profile.maxArmy,Math.max(2,cities.length*profile.armyPerCity));
 const navy=navalDemand(s);
 const net=income(s,owner),budget=s.resources[owner],composition=armyComposition(s),intent=armyIntent(s),emergency=intent?.kind==='defend';
 const build=(id:BuildingId):Command|null=>{for(const c of cities)if(!buildingReason(s,c,id))return {type:'build',city:c.id,building:id};return null;};
 const canResearch=!s.research[owner]&&(s.settings.difficulty!=='easy'||s.round%2===0);
 const research=(id:TechnologyId):Command|null=>canResearch&&!researchReason(s,owner,id)?{type:'research',technology:id}:null;
 const prepare=(c:State['cities'][number],type:UnitType):Command|null=>{
  const facility=(['heavy_knight','paladin'].includes(type)&&!hasBuilding(c,'stable')?'stable':UNITS[type].facility) as BuildingId|undefined;
  if(!facility||hasBuilding(c,facility))return null;
  let needed=facility;
  for(let i=0;i<4;i++){const req=BUILDINGS[needed].requires;if(!req||hasBuilding(c,req))break;needed=req;}
  return !buildingReason(s,c,needed)?{type:'build',city:c.id,building:needed}:null;
 };
 const recruit=(types:UnitType[]):Command|null=>{
  if(own.length>=cap)return null;
  for(const type of types){
   if(unitLockReason(s,owner,type))continue;
   const fleetSlots=navy.needed?Math.max(0,3-own.filter(isShip).length):0;
   if(!isShip({type})&&type!=='scout'&&!emergency&&own.length>=Math.max(2,cap-fleetSlots))continue;
   if(type==='clubman'&&!emergency&&own.some(frontline)&&types.some(t=>t!=='clubman'&&!unitLockReason(s,owner,t)))continue;
   if(net.food-UNITS[type].upkeep.food<0&&budget.food<(emergency?6:14))continue;
   const supplied=cities.filter(c=>(!UNITS[type].facility||hasBuilding(c,UNITS[type].facility as BuildingId))&&(!['heavy_knight','paladin'].includes(type)||hasBuilding(c,'stable')));
   for(const c of supplied.filter(c=>!c.recruited)){
    if(recruitReason(s,c,type))continue;
    const slots=recruitTiles(s,c,type).sort((a,b)=>intent?distance(a,tileAt(s,intent.tile))-distance(b,tileAt(s,intent.tile)):a.id.localeCompare(b.id));
    if(slots[0])return {type:'recruit',city:c.id,unitType:type,to:slots[0].id};
   }
   // One working facility is sufficient. Waiting for the hull/weapon budget must
   // not spend that same budget cloning a workshop in every other city.
   if(!supplied.length){const c=facilityHome(s,type,cities);if(c){const cmd=prepare(c,type);if(cmd)return cmd;}}
  }
  return null;
 };
 if(emergency){const cmd=recruit(composition.types);if(cmd)return cmd;}
 // Keep the opening scout budget ahead of optional research/construction.
 if(!hasTech(s,owner,'recon')){const cmd=research('recon');if(cmd)return cmd;}
 if(!own.some(u=>u.type==='scout')&&(s.round<12||!s.cities.some(c=>c.owner&&c.owner!==owner))){const cmd=recruit(['scout']);if(cmd)return cmd;}
 // Negative/low production gets a real building instead of another hungry army.
 for(const [needed,id] of [[net.food<2,'farm'],[net.wood<3,'lumber'],[net.food<1,'granary'],[net.gold<6,'market']] as const)if(needed){const cmd=build(id);if(cmd)return cmd;}
 const economyUpgrade=economicUpgradeCommand(s);if(economyUpgrade)return economyUpgrade;
 const navalProgress=():Command|null=>{
  if(!navy.needed||emergency)return null;
  if(net.food<1&&!hasTech(s,owner,'basic_agriculture'))return research('basic_agriculture');
  const advance=(goal:TechnologyId)=>{const id=nextKnowledge(s,goal);return id?research(id):null;};
  if(!hasTech(s,owner,'naval'))return advance('naval');
  if(!cities.some(c=>hasBuilding(c,'port'))){const cmd=build('port');if(cmd)return cmd;return null;}
  const fleet=own.filter(isShip);
  if(!fleet.some(u=>u.type!=='transport'))return recruit(['scout_ship']);
  if(!fleet.some(u=>u.type==='transport')){
   if(!hasTech(s,owner,'transports'))return advance('transports');
   const cmd=recruit(['transport']);if(cmd)return cmd;
  }
  if(fleet.some(u=>u.type==='transport')&&navy.captureShortage){const cmd=recruit(['clubman']);if(cmd)return cmd;}
  if((navy.threatened||navy.loaded)&&!fleet.some(u=>['warship','heavy_warship'].includes(u.type))){
   if(!hasTech(s,owner,'warships'))return advance('warships');
   const cmd=recruit(['warship']);if(cmd)return cmd;
  }
  if(navy.threatened&&hasTech(s,owner,'heavy_warships')&&!fleet.some(u=>u.type==='heavy_warship')){const cmd=recruit(['heavy_warship']);if(cmd)return cmd;}
  return null;
 };
 const navalCommand=navalProgress();if(navalCommand)return navalCommand;
 // Save the hull budget instead of spending it every turn on optional buildings/research.
 const fleet=own.filter(isShip);
 if(navy.needed&&!emergency&&(!fleet.some(u=>u.type!=='transport')||!fleet.some(u=>u.type==='transport')||(navy.loaded||navy.threatened)&&!fleet.some(u=>['warship','heavy_warship'].includes(u.type))))return {type:'end'};
  const force=own.filter(u=>!isShip(u)&&u.type!=='scout'),armed=force.filter(frontline);
 const developing=nextKnowledge(s,composition.technology);
 if(!emergency&&force.length>=4&&armed.length>=2&&developing){
  const cmd=research(developing);if(cmd)return cmd;
  if(!s.research[owner]&&budget.gold<TECHNOLOGIES[developing].cost.gold)return {type:'end'};
 }
 const trained=recruit(composition.types);if(trained)return trained;
 // Research just the next prerequisite for the missing role. Economy foundations
 // stay available when production is the bottleneck; no hidden branch privileges.
 const targets:TechnologyId[]=[...(net.food<2?['basic_agriculture' as const]:[]),...(net.wood<3?['basic_woodworking' as const]:[]),composition.technology,...(net.gold<6?['commerce' as const]:[]),'mining'];
 const reserve=emergency||own.filter(frontline).length<2?8:0;
 if(canResearch)for(const goal of targets){const id=nextKnowledge(s,goal);if(!id)continue;
  const essential=['recon','basic_agriculture','basic_woodworking'].includes(id);
  if(!essential&&budget.gold-TECHNOLOGIES[id].cost.gold<reserve)continue;
  const cmd=research(id);if(cmd)return cmd;
 }
 for(const c of cities){
  if(emergency)for(const id of ['wall','tower'] as const){if(!buildingReason(s,c,id))return {type:'build',city:c.id,building:id};}
  if(c.fort<maxFort(c)){const cmd:Command={type:'repair',city:c.id};if(!execute(s,cmd).error)return cmd;}
  if(!navy.needed&&hasBuilding(c,'port')&&!own.some(isShip)){const cmd=recruit(['scout_ship']);if(cmd)return cmd;}
 }
 for(const c of cities.filter(c=>!c.constructed))for(const t of s.tiles.filter(t=>distance(t,tileAt(s,c.tile))<=2)){
  // A hidden fort may own a border tile. Only improve when every position
  // that could beat/tie our closest city is currently surveyed.
  const radius=Math.min(...cities.map(home=>distance(t,tileAt(s,home.tile))));
  if(s.tiles.some(other=>distance(t,other)<=radius&&!isVisible(s,owner,other.id)))continue;
  const improvement=net.food<3?'farm':net.wood<2?'lumber':net.stone<3?'mine':null;
  if(improvement){const cmd:Command={type:'improve',city:c.id,tile:t.id,improvement};if(!improvementReason(s,cmd))return cmd;}
 }
 if(budget.gold>25&&net.gold<10){const cmd=build('market');if(cmd)return cmd;}
 if(canResearch&&budget.gold>=55){
  const coastal=cities.some(c=>s.tiles.some(t=>t.terrain==='water'&&distance(t,tileAt(s,c.tile))===1));
  for(const t of Object.values(TECHNOLOGIES))if((coastal||t.branch!=='naval')&&budget.gold-t.cost.gold>=12){const cmd=research(t.id);if(cmd)return cmd;}
 }
 if(budget.gold>35&&net.gold<12){const cmd=build('market');if(cmd)return cmd;}
 if(budget.food>90)for(const c of cities){const cmd:Command={type:'build',city:c.id,building:'upgrade'};if(!execute(s,cmd).error)return cmd;}
 return {type:'end'};
}
