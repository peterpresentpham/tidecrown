import {createGame,execute,distance,reachable,tileAt,previewAttack,recruitReason,recruitTiles,unitAt,type State,type Command} from '../../src/game/engine';
import {observe,isVisible} from '../../src/game/visibility';
import {nextAICommand} from '../../src/ai/ai';

/** Fixed benchmark player: first village, one scout, then visible villages/frontiers inward.
 * It never reads unobserved opponents and is intentionally independent of the production AI. */
export function openingCommand(raw:State):Command{
 const s=observe(raw,'player'),own=s.units.filter(u=>u.owner==='player'&&!u.aboard);
 for(const u of own.filter(u=>!u.acted)){
  const targets=[...new Set([...s.units.filter(t=>t.owner!=='player').map(t=>t.tile),...s.cities.filter(c=>c.owner!=='player').map(c=>c.tile)])];
  const attack=targets.map(to=>({to,p:previewAttack(s,u,to)})).filter(t=>t.p.legal).sort((a,b)=>Number(b.p.capture)*100+b.p.damage-b.p.retaliation-(Number(a.p.capture)*100+a.p.damage-a.p.retaliation))[0];
  if(attack)return {type:'attack',unit:u.id,to:attack.to};
  const villages=s.cities.filter(c=>c.owner===null).sort((a,b)=>distance(tileAt(s,u.tile),tileAt(s,a.tile))-distance(tileAt(s,u.tile),tileAt(s,b.tile)));
  const target=villages[0]?tileAt(s,villages[0].tile):{q:0,r:0};
  const unknown=s.tiles.filter(t=>t.terrain==='unknown');
  const score=(id:string)=>-distance(tileAt(s,id),target)*10-distance(tileAt(s,id),{q:0,r:0})*.5+unknown.filter(t=>distance(t,tileAt(s,id))<= (u.type==='scout'?4:2)).length*.1;
  const options=[...reachable(s,u)].filter(([,p])=>p.path.length).sort((a,b)=>score(b[0])-score(a[0])||a[0].localeCompare(b[0]));
  if(options[0]&&score(options[0][0])>score(u.tile))return {type:'move',unit:u.id,to:options[0][0]};
  return {type:'wait',unit:u.id};
 }
 if(!s.technologies.player.includes('recon')&&!s.research.player&&s.resources.player.gold>=5)return {type:'research',technology:'recon'};
 if(!own.some(u=>u.type==='scout'))for(const c of s.cities.filter(c=>c.owner==='player'))if(!recruitReason(s,c,'scout'))return {type:'recruit',city:c.id,unitType:'scout',to:recruitTiles(s,c,'scout')[0].id};
 return {type:'end'};
}
export function paceCampaign(seed:string,aiCount:1|2|3=1,maxRound=20,policy:'inward'|'idle'='inward'){
 let s=createGame({seed,aiCount,difficulty:'medium'}),firstVillage:number|null=null,firstContact:number|null=null,firstCombat:number|null=null;
 let aiCommands=0,decisionMs=0,executionMs=0,maxDecisionMs=0,steps=0,turnSteps=0;
 const observeContact=()=>{if(firstContact===null&&s.units.some(u=>u.owner!=='player'&&!u.aboard&&isVisible(s,'player',u.tile)))firstContact=s.round;};
 observeContact();const initialContact=firstContact;
 while(s.round<=maxRound&&!s.winner){
  if(++turnSteps>180)throw new Error(`AI/player loop ${seed}/${aiCount}/${s.round}/${s.turn}`);
  const ai=s.turn!=='player',start=performance.now(),cmd=ai?nextAICommand(s):policy==='idle'?{type:'end'} as Command:openingCommand(s),elapsed=performance.now()-start;
  if(ai){aiCommands++;decisionMs+=elapsed;maxDecisionMs=Math.max(maxDecisionMs,elapsed);}
  const actor='unit' in cmd?s.units.find(u=>u.id===cmd.unit):undefined,defender=cmd.type==='attack'?unitAt(s,cmd.to):undefined;
  if(cmd.type==='attack'&&actor&&defender&&actor.owner!==defender.owner&&(actor.owner==='player'||defender.owner==='player')&&firstCombat===null)firstCombat=s.round;
  const beforeTurn=s.turn,round=s.round,t=performance.now(),result=execute(s,cmd);if(result.error)throw new Error(`${seed}/${aiCount}/${s.round}/${s.turn}: ${JSON.stringify(cmd)}: ${result.error}`);
  executionMs+=performance.now()-t;s=result.state;steps++;if(s.turn!==beforeTurn)turnSteps=0;
  if(firstVillage===null&&s.cities.filter(c=>c.owner==='player').length>1)firstVillage=round;
  observeContact();
 }
 return {seed,aiCount,initialContact,firstVillage,firstContact,firstCombat,aiCommands,steps,decisionMs:+decisionMs.toFixed(2),maxDecisionMs:+maxDecisionMs.toFixed(2),executionMs:+executionMs.toFixed(2),winner:s.winner,explored:s.knowledge.enemy.explored.length,aiCities:s.cities.filter(c=>c.owner==='enemy').length};
}
