import {writeFileSync,mkdirSync} from 'node:fs';
import {createGame,execute,type Command} from '../src/game/engine';
import {nextAICommand} from '../src/ai/ai';
const results=[];
for(const [aiCount,difficulty] of [[1,'medium'],[2,'easy'],[3,'hard']] as const){
 let s=createGame({map:'water',seed:'naval-campaign',aiCount,difficulty});const milestones:Record<string,number>={},counts:Record<string,number>={};let commands=0;
 for(let round=0;round<60&&!s.winner;round++){
  s=execute(s,{type:'end'}).state;let n=0;
  while(s.turn!=='player'&&!s.winner){if(++n>600)throw new Error('AI loop');const c:Command=nextAICommand(s),r=execute(s,c);if(r.error)throw new Error(`${s.round} ${s.turn} ${JSON.stringify(c)} ${r.error}`);
   if(c.type==='recruit'&&['scout_ship','transport','warship','heavy_warship'].includes(c.unitType))milestones[c.unitType]??=s.round;
   if(c.type==='board'||c.type==='land'){milestones[c.type]??=s.round;counts[c.type]=(counts[c.type]??0)+1;}
   s=r.state;commands++;
  }
 }
 results.push({aiCount,difficulty,round:s.round,winner:s.winner,commands,milestones,counts,ships:s.units.filter(u=>['scout_ship','transport','warship','heavy_warship'].includes(u.type)).map(u=>({type:u.type,owner:u.owner,tile:u.tile})),tech:s.technologies.enemy,resources:s.resources.enemy});
 console.log(JSON.stringify(results.at(-1)));
}
mkdirSync('docs/measurements',{recursive:true});writeFileSync('docs/measurements/step3-naval-summary.json',JSON.stringify(results,null,2)+'\n');
