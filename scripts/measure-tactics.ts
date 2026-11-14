import {writeFileSync,mkdirSync} from 'node:fs';
import {cpus,platform} from 'node:os';
import {createGame,execute,type State,type Command} from '../src/game/engine';
import {nextAICommand} from '../src/ai/ai';
import {tacticalScenario,SCENARIOS,type TacticalScenario} from '../tests/helpers/tacticalScenarios';
const apply=(s:State,c:Command)=>{const r=execute(s,c);if(r.error)throw new Error(`${JSON.stringify(c)}: ${r.error}`);return r.state;};
const snapshot=(s:State)=>({round:s.round,units:s.units.filter(u=>u.id!=='spotter').map(u=>({id:u.id,type:u.type,tile:u.tile,hp:u.hp,stance:u.stance,deployed:u.deployed})),forts:s.cities.map(c=>({id:c.id,owner:c.owner,fort:c.fort})),resources:s.resources.enemy});
const scenarios=[];
for(const name of Object.keys(SCENARIOS) as TacticalScenario[]){let s=tacticalScenario(name);const before=snapshot(s),commands:Command[]=[];
 for(let round=0;round<(name==='escort'?10:1)&&!s.winner;round++){
  let n=0;while(s.turn==='enemy'&&!s.winner){if(++n>180)throw new Error('AI loop');const c=nextAICommand(s);commands.push(c);s=apply(s,c);}
  if(name==='escort'&&s.turn==='player'&&!s.winner)s=apply(s,{type:'end'});
 }
 scenarios.push({name,label:SCENARIOS[name],before,after:snapshot(s),commands});
}
const campaigns=[];
for(const [aiCount,difficulty] of [[1,'medium'],[2,'easy'],[3,'hard']] as const){let s=createGame({seed:'army-campaign',aiCount,difficulty}),count=0,decisionMs=0,maxDecisionMs=0,rounds=0;
 for(;rounds<30&&!s.winner;rounds++){
  s=apply(s,{type:'end'});let turnSteps=0;
  while(s.turn!=='player'&&!s.winner){const owner=s.turn;if(++turnSteps>180)throw new Error('AI loop');const t=performance.now(),c=nextAICommand(s),dt=performance.now()-t;decisionMs+=dt;maxDecisionMs=Math.max(maxDecisionMs,dt);count++;s=apply(s,c);if(s.turn!==owner)turnSteps=0;}
 }
 campaigns.push({seed:'army-campaign',aiCount,difficulty,rounds,winner:s.winner,commands:count,decisionMs:+decisionMs.toFixed(2),maxDecisionMs:+maxDecisionMs.toFixed(2)});
}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/step2-tactics.json',JSON.stringify({environment:{node:process.version,platform:platform(),cpu:cpus()[0]?.model},scenarios,campaigns},null,2)+'\n');console.log(JSON.stringify({scenarios:scenarios.map(s=>({name:s.name,commands:s.commands.length})),campaigns}));
