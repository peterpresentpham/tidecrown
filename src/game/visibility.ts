import { UNITS } from '../data/units';
import { factionRecord, type City, type FactionId, type State, type Tile, type Unit } from './engine';

export type CityMemory = Pick<City,'id'|'name'|'tile'|'owner'|'level'|'fort'|'buildings'> & {seenRound:number};
export type Knowledge = { explored:string[]; visible:string[]; cities:Record<string,CityMemory>;tiles:Record<string,Tile> };
export const emptyKnowledge = ():Knowledge=>({explored:[],visible:[],cities:{},tiles:{}});
export const sightRange = (unit:Pick<Unit,'type'>) => UNITS[unit.type].sight;

const distance=(a:Tile,b:Tile)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r));
export const isVisible=(s:State,owner:FactionId,id:string)=>s.knowledge[owner].visible.includes(id);
export const isExplored=(s:State,owner:FactionId,id:string)=>s.knowledge[owner].explored.includes(id);
export function currentVision(s:State,owner:FactionId):string[] {
  const tiles=new Map(s.tiles.map(t=>[t.id,t]));
  const sources=[...s.units.filter(u=>u.owner===owner&&!u.aboard).map(u=>({tile:tiles.get(u.tile),range:sightRange(u)})),...s.cities.filter(c=>c.owner===owner).map(c=>({tile:tiles.get(c.tile),range:c.buildings?.includes('tower')?3:2}))];
  return s.tiles.filter(t=>sources.some(p=>p.tile&&distance(t,p.tile)<=p.range)).map(t=>t.id);
}
export function rememberCity(s:State,owner:FactionId,c:City) {
  s.knowledge[owner].cities[c.id]={id:c.id,name:c.name,tile:c.tile,owner:c.owner,level:c.level,fort:c.fort,seenRound:s.round,...(c.buildings?{buildings:[...c.buildings]}:{})};
}
/** Refresh after each atomic command, and at every intermediate movement step. */
export function refreshKnowledge(s:State) {
  for(const owner of s.factions){
    const k=s.knowledge[owner];
    k.visible=currentVision(s,owner);
    k.explored=[...new Set([...k.explored,...k.visible])];
    const visible=new Set(k.visible);
    for(const t of s.tiles)if(visible.has(t.id))k.tiles[t.id]={...t};
    for(const c of s.cities) if(visible.has(c.tile)) rememberCity(s,owner,c);
  }
}
/** Public observation. The planner/UI cannot read enemy reserves, research,
 * unseen units, changed hidden forts, or the terrain of uncharted cells. */
export function observe(s:State,owner:FactionId):State {
  const k=s.knowledge[owner],visible=new Set(k.visible),explored=new Set(k.explored);
  const cities:City[]=Object.values(k.cities).map(m=>({id:m.id,name:m.name,tile:m.tile,owner:m.owner,level:m.level,fort:m.fort,buildings:m.buildings?[...m.buildings]:undefined,specialty:null,job:null,recruited:false,repaired:false,stability:0}));
  for(const c of s.cities) if(c.owner===owner||visible.has(c.tile)){
    const index=cities.findIndex(m=>m.id===c.id);
    if(index>=0)cities[index]=structuredClone(c);else cities.push(structuredClone(c));
  }
  return {
    ...s,
    tiles:s.tiles.map(t=>explored.has(t.id)?{...(visible.has(t.id)?t:k.tiles[t.id]??{id:t.id,q:t.q,r:t.r,terrain:t.terrain,height:t.height})}:{id:t.id,q:t.q,r:t.r,terrain:'unknown',height:0}),
    units:s.units.filter(u=>u.owner===owner||(!u.aboard&&visible.has(u.tile))).map(u=>({...u})),cities,
    settings:{...s.settings},factions:[...s.factions],
    resources:factionRecord(id=>id===owner?{...s.resources[id]}:{gold:0,food:0,wood:0,stone:0}),
    technologies:factionRecord(id=>id===owner?[...s.technologies[id]]:[]),
    research:factionRecord(id=>id===owner&&s.research[id]?{...s.research[id]}:null),
    bankrupt:factionRecord(id=>id===owner?s.bankrupt[id]:false),
    knowledge:factionRecord(id=>id===owner?structuredClone(k):emptyKnowledge()),
    event:s.event&&(s.event.viewers?.includes(owner)||visible.has(s.event.from)||visible.has(s.event.to)||s.event.owner===owner)?{...s.event,viewers:undefined,originViewers:undefined,from:s.event.originViewers?.includes(owner)||visible.has(s.event.from)||s.event.owner===owner?s.event.from:s.event.to,actor:s.event.originViewers?.includes(owner)||visible.has(s.event.from)||s.event.owner===owner?s.event.actor:'',actorType:s.event.originViewers?.includes(owner)||visible.has(s.event.from)||s.event.owner===owner?s.event.actorType:undefined,path:s.event.path?.filter(id=>visible.has(id)),dead:s.event.dead?.filter(id=>s.units.find(u=>u.id===id)?.owner===owner||visible.has(s.event!.to))}:undefined,
    serial:0,logs:[],
  };
}
