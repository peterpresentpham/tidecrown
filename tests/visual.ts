// Development-only visual fixture; not imported by the production entry point.
import { World } from '../src/render/World';
import { UNITS,createClassicGame,execute,type Unit,type UnitType,type State,type Command } from '../src/game/engine';
import { TECHNOLOGIES,RECRUITABLE_UNITS } from '../src/data/technologies';
import {refreshKnowledge} from '../src/game/visibility';
const host=document.getElementById('world')!,status=document.getElementById('result')!,selector=document.getElementById('scenario') as HTMLSelectElement;
let world:World|null=null,state:State;
function unit(type:UnitType,tile:string,enemy=false,id='actor'):Unit{return {id,type,tile,owner:enemy?'enemy':'player',hp:UNITS[type].hp,moves:UNITS[type].moves,acted:false,moved:false,retaliated:false,activeLastTurn:false};}
function reset(){
 world?.dispose();state=createClassicGame();for(const t of state.tiles){t.terrain='grass';t.height=.22;}
 state.cities=state.cities.slice(0,2);state.cities[0].tile='-9,4';state.cities[1].tile='9,-4';state.technologies.player=Object.keys(TECHNOLOGIES) as (keyof typeof TECHNOLOGIES)[];
 const mode=selector.value;
 state.units=[unit(mode==='ranged'?'crossbow':mode==='siege'?'catapult':mode==='cavalry'?'heavy_knight':mode==='naval'?'warship':'swordsman','0,0'),unit(mode==='naval'?'warship':'heavy_infantry',(mode==='melee'||mode==='kill')?'1,0':mode==='siege'?'3,0':'2,0',true,'target')];
 if(mode==='kill')state.units[1].hp=1;
 if(mode==='naval')for(const t of state.tiles)if(Math.abs(t.q)<6&&Math.abs(t.r)<5)t.terrain='water';
 if(mode==='siege'){state.cities[1].tile='3,0';state.units=state.units.slice(0,1);}
 if(mode==='roster'){state.units=RECRUITABLE_UNITS.map((type,i)=>unit(type,`${(i%5)*2-4},${Math.floor(i/5)*2-4}`,false,`display-${type}`));for(const u of state.units.filter(u=>UNITS[u.type].class==='ship')){const t=state.tiles.find(t=>t.id===u.tile)!;t.terrain='water';}}
 refreshKnowledge(state);world=new World(host,state,()=>{},()=>{});world.sync(state,state.units[0].id,null,false);world.focus('0,0');if(mode==='roster')world.zoom(.7);
 status.textContent=mode==='roster'?'23 mô hình · hình học đơn giản · không hoạt ảnh khi đứng yên':'Mô phỏng riêng để kiểm tra hoạt ảnh; không sửa ván lưu.';
}
function run(cmd:Command){const result=execute(state,cmd);if(result.error){status.textContent=result.error;return;}state=result.state;world!.sync(state,'actor',null,false);status.textContent=state.event?`${state.event.kind} · gây ${state.event.damage} HP · phản kích ${state.event.retaliation} HP · công sự ${state.event.fortDamage}`:'Đã thực hiện';}
selector.onchange=reset;document.getElementById('reset')!.onclick=reset;
document.getElementById('attack')!.onclick=()=>run({type:'attack',unit:'actor',to:state.units.find(u=>u.id==='target')?.tile??'3,0'});
document.getElementById('move')!.onclick=()=>run({type:'move',unit:'actor',to:selector.value==='cavalry'?'1,0':'0,1'});
reset();

setInterval(()=>{const m=world?.diagnostics();if(m)document.getElementById('metrics')!.textContent=`${m.units} mô hình · ${m.drawCalls} draw calls · ${m.triangles} tam giác · ${m.effectObjects} hiệu ứng tạm`;},1000);
