import {useId,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {TECHNOLOGIES,type TechnologyId} from '../data/technologies';
import {researchEdgePath,type GraphBox} from './researchGraph';

type Edge={from:TechnologyId;to:TechnologyId;path:string};
export function ResearchConnections({canvas,nodes,visibleKey,route,done}:{canvas:RefObject<HTMLDivElement|null>;nodes:RefObject<Map<TechnologyId,HTMLElement>>;visibleKey:string;route:Set<TechnologyId>;done:TechnologyId[]}){
 const marker=useId().replace(/:/g,''),frame=useRef(0);
 const [graph,setGraph]=useState<{width:number;height:number;edges:Edge[]}>({width:0,height:0,edges:[]});
 useLayoutEffect(()=>{
  const root=canvas.current;if(!root)return;
  const measure=()=>{
   const bounds=root.getBoundingClientRect(),rects=new Map<TechnologyId,GraphBox>();
   for(const [id,node] of nodes.current){const r=node.getBoundingClientRect();rects.set(id,{left:r.left-bounds.left,right:r.right-bounds.left,top:r.top-bounds.top,bottom:r.bottom-bounds.top});}
   const boxes=[...rects.values()],edges:Edge[]=[];
   for(const [to,target] of rects)for(const from of TECHNOLOGIES[to].requires){
    const source=rects.get(from);if(!source)continue;
    const path=researchEdgePath(source,target,boxes,bounds.width,bounds.height);
    if(path)edges.push({from,to,path});
   }
   setGraph({width:bounds.width,height:bounds.height,edges});
  };
  const schedule=()=>{cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);observer.observe(root);for(const node of nodes.current.values())observer.observe(node);
  schedule();
  return()=>{cancelAnimationFrame(frame.current);observer.disconnect();};
 },[canvas,nodes,visibleKey]);
 const active=(edge:Edge)=>route.has(edge.to)&&route.has(edge.from);
 return <svg className="research-connections" width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width||1} ${graph.height||1}`} aria-hidden="true">
  <defs>{[['base','#6f969e'],['required','#ffd77e'],['done','#93c9ff']].map(([name,color])=><marker key={name} id={`${marker}-${name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color}/></marker>)}</defs>
  {[...graph.edges].sort((a,b)=>Number(active(a))-Number(active(b))).map(edge=>{const highlighted=active(edge),complete=done.includes(edge.from)&&done.includes(edge.to),kind=highlighted?(complete?'done':'required'):'base';return <path key={`${edge.from}-${edge.to}`} data-from={edge.from} data-to={edge.to} data-highlighted={highlighted} className={`research-edge ${kind}`} d={edge.path} markerEnd={`url(#${marker}-${kind})`}/>;})}
 </svg>;
}
