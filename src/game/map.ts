import type { City, FactionId, GridPoint, Tile, Terrain } from './engine';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameSettings = { seed:string; aiCount:1|2|3; difficulty:Difficulty; map:'random'|'classic' };
export const DIFFICULTIES = {
  easy:{name:'Dễ',description:'Ít quân hơn, nghiên cứu chậm. Phù hợp làm quen.',armyPerCity:2,maxArmy:6},
  medium:{name:'Vừa',description:'Phát triển và mở rộng đều, đội quân đa dạng.',armyPerCity:3,maxArmy:10},
  hard:{name:'Khó',description:'Đông quân, ưu tiên mục tiêu yếu và bảo vệ thành.',armyPerCity:4,maxArmy:16},
} as const;
export const newSeed=()=>Math.random().toString(36).slice(2,10);
export function randomSource(seed:string){
  let h=2166136261;
  for(const c of seed) h=Math.imul(h^c.charCodeAt(0),16777619);
  return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
const key=(p:GridPoint)=>`${p.q},${p.r}`;
const distance=(a:GridPoint,b:GridPoint)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r));
const names=['Đồng Cỏ','Thành Cổ','Bắc Lâm','Nam Hải','Trúc Sơn','Bình Minh','Vân Hồ','An Khê','Thanh Hà','Đông Lâm','Tây Giang','Ngọc Sơn'];
/** Seeded mainland: every fort is joined by walkable roads before coast decoration. */
export function generateMap(settings:GameSettings,factions:FactionId[]):{tiles:Tile[];cities:City[];starts:string[]}{
  const rng=randomSource(settings.seed),pick=(n:number)=>Math.floor(rng()*n);
  const flipQ=rng()<.5?-1:1,flipR=rng()<.5?-1:1;
  // Shared jitter preserves equal safe openings. The center village creates a
  // contested inland route; the rest of the 825-cell map remains open to flanking.
  const offset={q:pick(3)-1,r:pick(3)-1};
  const anchors=settings.aiCount===1?[[-10,3],[10,-3]]:settings.aiCount===2?[[-8,5],[8,5],[0,-8]]:[[-8,6],[8,-6],[8,6],[-8,-6]];
  const transform=(q:number,r:number)=>({q:(q+offset.q)*flipQ,r:(r+offset.r)*flipR});
  const capitals=anchors.map(([q,r])=>transform(q,r));
  const nearby=anchors.map(([q,r])=>Math.abs(q)>=Math.abs(r)?transform(q-Math.sign(q)*4,r):transform(q,r-Math.sign(r)*4));
  const center=transform(0,0),positions=[...capitals,...nearby,center];
  for(let attempts=0;positions.length<factions.length*3+3&&attempts<3000;attempts++){
    const p={q:pick(23)-11,r:pick(17)-8};
    if(positions.every(other=>distance(p,other)>=4))positions.push(p);
  }
  const cityNames=[...names]; // Fisher–Yates keeps generation portable and deterministic.
  for(let i=cityNames.length-1;i>0;i--){const j=pick(i+1);[cityNames[i],cityNames[j]]=[cityNames[j],cityNames[i]];}
  const capitalNames=['Hải Vân','Hỏa Sơn','Ngọc Lâm','Kim Sa'];
  const cities:City[]=positions.map((p,i)=>({id:`c${i+1}`,name:i<factions.length?capitalNames[i]:cityNames[(i-factions.length)%cityNames.length],tile:key(p),owner:factions[i]??null,level:1,fort:i<factions.length?20:0,specialty:null,job:null,recruited:false,repaired:false,stability:0}));
  const phase=rng()*Math.PI*2,phase2=rng()*Math.PI*2;
  const tiles:Tile[]=[];
  for(let q=-16;q<=16;q++)for(let r=-12;r<=12;r++){
    const angle=Math.atan2(r/10,q/15),radius=q*q/225+r*r/100;
    const land=radius<.98+Math.sin(angle*3+phase)*.15+Math.sin(angle*5+phase2)*.08;
    const n=rng();const terrain:Terrain=!land?'water':n<.24?'forest':n>.96?'mountain':n>.85?'hill':'grass';
    tiles.push({id:key({q,r}),q,r,terrain,height:terrain==='hill'?.4:terrain==='mountain'?.5:.22});
  }
  const index=new Map(tiles.map(t=>[t.id,t]));
  const clear=(p:GridPoint,radius=0)=>{for(let dq=-radius;dq<=radius;dq++)for(let dr=-radius;dr<=radius;dr++){const t=index.get(key({q:p.q+dq,r:p.r+dr}));if(t){t.terrain='grass';t.height=.22;}}};
  const road=(a:GridPoint,b:GridPoint)=>{let p={...a};clear(p);while(key(p)!==key(b)){p={q:p.q+Math.sign(b.q-p.q),r:p.r+Math.sign(b.r-p.r)};clear(p);}};
  // Nearest-neighbor spanning tree ensures no village or starting army is stranded.
  const connected=[positions[0]],pending=positions.slice(1);
  while(pending.length){let best=Infinity,from=connected[0],to=0;for(const a of connected)pending.forEach((b,i)=>{const d=distance(a,b);if(d<best){best=d;from=a;to=i;}});road(from,pending[to]);connected.push(pending.splice(to,1)[0]);}
  capitals.forEach((p,i)=>{road(p,nearby[i]);road(nearby[i],center);});positions.forEach(p=>clear(p,1));
  for(const t of tiles)if(t.terrain==='grass'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([q,r])=>index.get(`${t.q+q},${t.r+r}`)?.terrain==='water'))t.terrain='sand';
  const starts=capitals.map((p,i)=>key({q:p.q+Math.sign(nearby[i].q-p.q),r:p.r+Math.sign(nearby[i].r-p.r)}));
  return {tiles,cities,starts};
}
