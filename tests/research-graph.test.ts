import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TECHNOLOGIES,type TechnologyId} from '../src/data/technologies';
import {researchAncestry,researchEdgePath,type GraphBox,type GraphPoint} from '../src/ui/researchGraph';

test('selection highlights every AND prerequisite, deduplicates shared ancestors and excludes unrelated branches',()=>{
 const route=researchAncestry('mounted_archery');
 assert.deepEqual([...route].sort(),['mounted_archery','light_cavalry','horses','husbandry','basic_agriculture','archery','basic_woodworking'].sort());
 assert.equal(route.has('rangers'),false);
 const shared=researchAncestry('ballistas');assert.equal([...shared].filter(id=>id==='basic_woodworking').length,1);
 for(const id of shared)for(const req of TECHNOLOGIES[id].requires)assert.ok(shared.has(req));
 for(const id of Object.keys(TECHNOLOGIES) as TechnologyId[])assert.ok(researchAncestry(id).has(id));
});
function assertClear(path:string,boxes:GraphBox[]){
 const numbers=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),points:GraphPoint[]=[];
 for(let i=0;i<numbers.length;i+=2)points.push({x:numbers[i],y:numbers[i+1]});
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];assert.ok(a.x===b.x||a.y===b.y,'connector must be orthogonal');
  for(const r of boxes){const intersects=a.x===b.x?a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom:a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right;assert.equal(intersects,false,'connector must not cross card text');}
 }
}
test('cross-branch connectors navigate around intervening cards in both directions',()=>{
 const boxes=[{left:20,top:20,right:170,bottom:150},{left:205,top:20,right:355,bottom:150},{left:390,top:20,right:540,bottom:150},{left:205,top:180,right:355,bottom:310}];
 for(const [from,to] of [[0,2],[2,0],[0,3],[3,1]]){const path=researchEdgePath(boxes[from],boxes[to],boxes,560,330);assert.ok(path);assertClear(path,boxes);}
});
test('wrapped mobile rows retain valid links after card dimensions change',()=>{
 for(const width of [140,210]){
  const boxes=Array.from({length:7},(_,i)=>({left:15+i%2*(width+28),right:15+i%2*(width+28)+width,top:20+Math.floor(i/2)*180,bottom:170+Math.floor(i/2)*180}));
  for(let i=1;i<boxes.length;i++){const path=researchEdgePath(boxes[i-1],boxes[i],boxes,width*2+60,740);assert.ok(path);assertClear(path,boxes);}
 }
});
