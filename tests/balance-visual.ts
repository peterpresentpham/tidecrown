import {World} from '../src/render/World';
import {execute,type State,type Command} from '../src/game/engine';
import {OPENINGS,OPENING_LABELS,type Opening} from './helpers/balanceCampaign';
type Trace={initial:State;log:{round:number;owner:string;command:Command}[];seed:string;opening:Opening;round:number;winner:string|null;firstContact:number|null;firstSiege:number|null;simulationMs:number;research:Record<string,number>};
const host=document.getElementById('world')!,select=document.getElementById('campaign') as HTMLSelectElement,status=document.getElementById('status')!,summary=document.getElementById('summary')!;
for(const opening of OPENINGS)for(const seed of ['balance-01','balance-02']){const option=document.createElement('option');option.value=`medium-${opening}-${seed}`;option.textContent=`${OPENING_LABELS[opening]} · ${seed}`;select.appendChild(option);}
let data:Trace,state:State,world:World|undefined,index=0;
function sync(){world!.sync(state,null,null,false);status.textContent=`Lượt ${state.round} · ${state.turn} · Lệnh ${index}/${data.log.length} · ${state.winner==='player'?'Bạn thắng':state.winner?'AI thắng':'Đang diễn ra'}`;}
function next(){const entry=data.log[index];if(!entry)return;if(state.round!==entry.round||state.turn!==entry.owner)throw new Error('Replay không khớp lượt');const r=execute(state,entry.command);if(r.error)throw new Error(r.error);state=r.state;index++;}
async function load(){try{const response=await fetch(`/artifacts/balance-final/${select.value}.json`);if(!response.ok)throw new Error('Chạy node --import tsx scripts/measure-balance.ts final trước');data=await response.json() as Trace;world?.dispose();index=0;state=structuredClone(data.initial);world=new World(host,state,()=>{},()=>{});world.focus(state.units[0].tile);world.zoom(.7);summary.textContent=`Kết quả: ${data.winner==='player'?'Bạn thắng':data.winner?'AI thắng':'Chạm giới hạn thử'} · ${data.round} lượt\nThấy quân: ${data.firstContact??'—'} · Công thành đầu: ${data.firstSiege??'—'}\nMô phỏng: ${(data.simulationMs/1000).toFixed(1)} giây — không phải thời gian chơi thật.\nCông nghệ: ${Object.keys(data.research).join(', ')}`;sync();}catch(error){status.textContent=String(error);}}
select.onchange=()=>void load();document.getElementById('reset')!.onclick=()=>void load();
document.getElementById('next')!.onclick=()=>{try{next();sync();}catch(error){status.textContent=String(error);}};
document.getElementById('turn')!.onclick=()=>{try{const owner=state.turn;while(index<data.log.length&&state.turn===owner)next();sync();}catch(error){status.textContent=String(error);}};
document.getElementById('finish')!.onclick=async()=>{
 const controls=[...document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select')];controls.forEach(c=>c.disabled=true);
 try{while(index<data.log.length){for(let n=0;n<100&&index<data.log.length;n++)next();status.textContent=`Đang phát lại ${index}/${data.log.length} lệnh…`;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  if(state.winner!==data.winner)throw new Error('Replay khác kết quả đo');world!.focus(state.units.find(u=>u.owner==='player')?.tile??state.cities[0].tile);sync();
 }catch(error){status.textContent=String(error);}finally{controls.forEach(c=>c.disabled=false);}
};
void load();
