import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {BALANCE} from '../src/data/balance';
import {TECHNOLOGIES} from '../src/data/technologies';
import {BUILDINGS} from '../src/data/buildings';
import {DIFFICULTIES} from '../src/game/map';
import {UNITS} from '../src/data/units';
import {balanceCampaign,OPENINGS} from '../tests/helpers/balanceCampaign';
const label=process.argv[2]??'current';
if(label==='prices-before'){
 BALANCE.cityRepair=5;BUILDINGS.farm.cost.wood=10;BUILDINGS.lumber.cost.wood=8;BUILDINGS.siege_workshop.cost.wood=18;UNITS.catapult.cost.wood=25;
 for(const type of ['pikeman','heavy_infantry','crossbow','catapult','trebuchet'] as const)UNITS[type].moves=1;
 Object.assign(DIFFICULTIES.medium,{maxArmy:10});Object.assign(DIFFICULTIES.hard,{maxArmy:16});
 for(const t of Object.values(TECHNOLOGIES)){t.cost.gold=[0,5,12,24,40][t.tier];if(t.tier>=3&&['siege','naval'].includes(t.branch))t.cost.wood=8;}
}
mkdirSync(`artifacts/balance-${label}`,{recursive:true});
const plannerFingerprint=createHash('sha256').update(['src/ai/ai.ts','src/ai/tactics.ts','src/ai/development.ts','tests/helpers/balanceCampaign.ts'].map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex');
const parameters={cityRepair:BALANCE.cityRepair,technologyGold:Object.values(TECHNOLOGIES).filter(t=>['basic_agriculture','naval','siege','trebuchets'].includes(t.id)).map(t=>({id:t.id,gold:t.cost.gold,wood:t.cost.wood,turns:t.turns})),farm:BUILDINGS.farm.cost,lumber:BUILDINGS.lumber.cost,siegeWorkshop:BUILDINGS.siege_workshop.cost,catapult:UNITS.catapult.cost,moves:Object.fromEntries(['pikeman','heavy_infantry','crossbow','catapult','trebuchet'].map(id=>[id,UNITS[id as keyof typeof UNITS].moves])),armyCaps:{medium:DIFFICULTIES.medium.maxArmy,hard:DIFFICULTIES.hard.maxArmy}};
const rows=[];
for(const difficulty of ['medium','hard'] as const)for(const opening of (difficulty==='hard'?['pressure'] as const:OPENINGS))for(const seed of (difficulty==='medium'?['balance-01','balance-02']:['balance-pressure'])){
 if(label==='prices-before'&&(difficulty!=='medium'||opening!=='expansion'))continue;
 const r=balanceCampaign({opening,seed,difficulty,trace:true,validate:true});
 writeFileSync(`artifacts/balance-${label}/${difficulty}-${opening}-${seed}.json`,JSON.stringify(r,null,2)+'\n');
 const {initial,log,snapshots,final,...summary}=r;void initial;void log;void snapshots;rows.push({...summary,playerCities:final.cities.filter(c=>c.owner==='player').length,enemyCities:final.cities.filter(c=>c.owner==='enemy').length});
 console.log(JSON.stringify(rows.at(-1)));
}
mkdirSync('docs/measurements',{recursive:true});writeFileSync(`docs/measurements/step4-${label}.json`,JSON.stringify({plannerFingerprint,parameters,policy:'Fog-limited scripted openings; no extra resources. Simulation time is not human play time.',rows},null,2)+'\n');
