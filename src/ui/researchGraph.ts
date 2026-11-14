import {TECHNOLOGIES, type TechnologyId} from '../data/technologies';

/** Includes every prerequisite (AND), including technologies already completed. */
export function researchAncestry(id:TechnologyId,set=new Set<TechnologyId>()):Set<TechnologyId>{
 if(set.has(id))return set;
 set.add(id);
 for(const req of TECHNOLOGIES[id].requires)researchAncestry(req,set);
 return set;
}
export type GraphPoint={x:number;y:number};
export type GraphBox={left:number;top:number;right:number;bottom:number};
const clearance=6;
function segmentBlocked(a:GraphPoint,b:GraphPoint,boxes:GraphBox[]){
 return boxes.some(r=>a.x===b.x
  ?a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom
  :a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right);
}
/** Orthogonal paths use the spaces around cards, so edges never run through card text. */
export function researchEdgePath(from:GraphBox,to:GraphBox,obstacles:GraphBox[],width:number,height:number):string|null{
 const a={x:(from.left+from.right)/2,y:(from.top+from.bottom)/2},b={x:(to.left+to.right)/2,y:(to.top+to.bottom)/2};
 let start:GraphPoint,end:GraphPoint,tail:GraphPoint,tip:GraphPoint;
 if(Math.abs(a.x-b.x)>20){
  const right=b.x>a.x;
  tail={x:right?from.right:from.left,y:a.y};tip={x:right?to.left:to.right,y:b.y};
  start={x:tail.x+(right?10:-10),y:tail.y};end={x:tip.x+(right?-10:10),y:tip.y};
 }else{
  const down=b.y>a.y;
  tail={x:a.x,y:down?from.bottom:from.top};tip={x:b.x,y:down?to.top:to.bottom};
  start={x:tail.x,y:tail.y+(down?10:-10)};end={x:tip.x,y:tip.y+(down?-10:10)};
 }
 const boxes=obstacles.map(r=>({left:r.left-clearance,top:r.top-clearance,right:r.right+clearance,bottom:r.bottom+clearance}));
 const xs=[...new Set([2,width-2,start.x,end.x,...boxes.flatMap(r=>[r.left,r.right])])].sort((x,y)=>x-y);
 const ys=[...new Set([2,height-2,start.y,end.y,...boxes.flatMap(r=>[r.top,r.bottom])])].sort((x,y)=>x-y);
 const cols=xs.length,count=cols*ys.length,index=(p:GraphPoint)=>ys.indexOf(p.y)*cols+xs.indexOf(p.x),point=(i:number)=>({x:xs[i%cols],y:ys[Math.floor(i/cols)]});
 const first=index(start),last=index(end),distance=new Float64Array(count).fill(Infinity),previous=new Int32Array(count).fill(-1);
 // Small priority heap keeps layout work bounded even with the full tree visible.
 const queue:{id:number;score:number}[]=[];
 const push=(id:number,score:number)=>{let i=queue.length;queue.push({id,score});while(i>0){const p=(i-1)>>1;if(queue[p].score<=score)break;queue[i]=queue[p];i=p;}queue[i]={id,score};};
 const pop=()=>{const root=queue[0],tail=queue.pop()!;if(queue.length){let i=0;while(i*2+1<queue.length){let child=i*2+1;if(child+1<queue.length&&queue[child+1].score<queue[child].score)child++;if(queue[child].score>=tail.score)break;queue[i]=queue[child];i=child;}queue[i]=tail;}return root;};
 const heuristic=(p:GraphPoint)=>Math.abs(p.x-end.x)+Math.abs(p.y-end.y);
 distance[first]=0;push(first,heuristic(start));
 while(queue.length){
  const next=pop(),id=next.id,p=point(id);
  if(next.score>distance[id]+heuristic(p)+0.01)continue;
  if(id===last)break;
  const x=id%cols,y=Math.floor(id/cols);
  for(const neighbor of [x>0?id-1:-1,x<cols-1?id+1:-1,y>0?id-cols:-1,y<ys.length-1?id+cols:-1]){
   if(neighbor<0)continue;const q=point(neighbor);
   if(segmentBlocked(p,q,boxes))continue;
   const d=distance[id]+Math.abs(p.x-q.x)+Math.abs(p.y-q.y);
   if(d<distance[neighbor]){distance[neighbor]=d;previous[neighbor]=id;push(neighbor,d+heuristic(q));}
  }
 }
 if(!Number.isFinite(distance[last]))return null;
 const points:GraphPoint[]=[];for(let i=last;i!==-1;i=previous[i])points.push(point(i));points.reverse();points.unshift(tail);points.push(tip);
 const compact=points.filter((p,i)=>i===0||i===points.length-1||!((points[i-1].x===p.x&&points[i+1].x===p.x)||(points[i-1].y===p.y&&points[i+1].y===p.y)));
 return compact.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
}
