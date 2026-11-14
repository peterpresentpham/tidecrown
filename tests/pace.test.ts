import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paceCampaign} from './helpers/paceCampaign';
import {createGame,distance,tileAt} from '../src/game/engine';
import {observe} from '../src/game/visibility';
test('30 fixed seeds meet opening pace without exposing enemies at spawn',()=>{
 const rows=Array.from({length:30},(_,i)=>paceCampaign(`pace-${String(i).padStart(2,'0')}`,1,14));
 const contacts=rows.map(r=>r.firstContact??Infinity).sort((a,b)=>a-b),median=(contacts[14]+contacts[15])/2;
 assert.ok(median>=6&&median<=10,`median first contact ${median}`);
 assert.ok(rows.filter(r=>r.firstContact!==null&&r.firstContact<=14).length>=27);
 assert.ok(rows.every(r=>r.initialContact===null&&r.firstVillage===2));
});
test('ten seeds per multi-AI configuration retain legal campaigns and timely encounters',()=>{
 for(const aiCount of [2,3] as const)for(let i=0;i<10;i++){
  const row=paceCampaign(`pace-${String(i).padStart(2,'0')}`,aiCount,14);assert.equal(row.initialContact,null);assert.notEqual(row.firstVillage,null);assert.ok(row.firstContact!==null&&row.firstContact<=14,JSON.stringify(row));
 }
});
test('center village and equal safe first expansions retain the large map',()=>{
 for(const aiCount of [1,2,3] as const){const s=createGame({seed:'meeting-point',aiCount});assert.equal(s.tiles.length,825);
  const center=s.cities[s.factions.length*2];assert.equal(center.owner,null);assert.ok(Math.abs(tileAt(s,center.tile).q)<=1&&Math.abs(tileAt(s,center.tile).r)<=1);
  s.factions.forEach((f,i)=>{assert.equal(distance(tileAt(s,s.cities[i].tile),tileAt(s,s.cities[i+s.factions.length].tile)),4);assert.ok(observe(s,f).units.every(u=>u.owner===f));});
 }
});

test('the AI reaches an inactive human without relying on a human scout to find it',()=>{
 const row=paceCampaign('pace-02',1,14,'idle');assert.equal(row.firstVillage,null);assert.equal(row.initialContact,null);assert.ok(row.firstContact!==null&&row.firstContact<=14);
});
