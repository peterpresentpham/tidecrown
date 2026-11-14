import {World} from '../../src/render/World';
import {aiRoundFixture,battle60Fixture} from './fixture';
import {nextAICommand} from '../../src/ai/ai';
import {observe} from '../../src/game/visibility';
import {execute,type State} from '../../src/game/engine';
import {aiDecisionDelayMs,type AISpeed,type GraphicsQuality} from '../../src/ui/playbackPolicy';
const host=document.getElementById('world')!,status=document.getElementById('status')!,rows=document.getElementById('rows')!,checks=document.getElementById('checks')!;
let world:World|undefined;const results:unknown[]=[];let environment:Record<string,unknown>={};
const frame=()=>new Promise<number>(requestAnimationFrame);
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const percentile=(a:number[],q:number)=>{const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]??0;};
const digest=(s:State)=>{let h=2166136261;for(const c of JSON.stringify(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
async function sample(ms:number,motion:boolean){
 const w=world!,start=performance.now(),count=w.diagnostics().renderedFrames;let last=count,lastDraw=0,lastTick=start;const gaps:number[]=[];let calls=0,frames=0;
 while(performance.now()-start<ms){const t=await frame();if(document.hidden)throw new Error('Tab ẩn: hủy phép đo, hãy đo lại khi tab đang hoạt động.');if(motion)w.rotate((t-lastTick)*Math.PI*2/ms);lastTick=t;const d=w.diagnostics();if(d.renderedFrames!==last){if(lastDraw)gaps.push(t-lastDraw);lastDraw=t;last=d.renderedFrames;calls+=d.drawCalls;frames++;}}
 const elapsed=performance.now()-start;return {fps:+((w.diagnostics().renderedFrames-count)*1000/elapsed).toFixed(2),frames:w.diagnostics().renderedFrames-count,p95:+percentile(gaps,.95).toFixed(2),draws:Math.round(calls/Math.max(1,frames))};
}
async function show(s:State){world!.sync(s,null,null,false);if(!world!.isAnimating())return {ms:0,frames:0};const start=performance.now(),count=world!.diagnostics().renderedFrames;while(world!.isAnimating()){if(document.hidden)throw new Error('Tab ẩn trong phép đo.');if(performance.now()-start>6000)throw new Error('Hoạt ảnh không kết thúc');await frame();}return {ms:performance.now()-start,frames:world!.diagnostics().renderedFrames-count};}
async function runOne(kind:'ai-round'|'battle-60',renderer:'baseline'|'integrated',speed:AISpeed,quality:GraphicsQuality,round:number){
 status.textContent=`Đang đo ${kind} · ${renderer} · ${speed}/${quality} · lần ${round}`;
 world?.dispose();const startState=kind==='battle-60'?battle60Fixture():aiRoundFixture();let s=structuredClone(startState);
 const baselineUrl='/artifacts/step5-baseline/World.ts';
 const C:typeof World=renderer==='baseline'?(await import(/* @vite-ignore */ baselineUrl)).World:World;
 world=new C(host,s,()=>{},()=>{},{quality,aiSpeed:speed,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});world.zoom(.8);await wait(600);
 const gl=host.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');environment={browser:navigator.userAgent,platform:navigator.platform,cores:navigator.hardwareConcurrency,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',visibility:document.visibilityState,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};document.getElementById('environment')!.textContent=JSON.stringify(environment,null,2);
 const visible=world.diagnostics().units,idle=await sample(1000,false),camera=await sample(4000,true);world.resetCamera();world.zoom(.8);await wait(200);
 let commands=0,computationMs=0,animationMs=0,animationFrames=0;const t0=performance.now();s=execute(s,{type:'end'}).state;await show(s);
 while(s.turn!=='player'&&!s.winner){if(++commands>600)throw new Error('AI không kết thúc');const cpu=performance.now(),c=nextAICommand(s),r=execute(s,c);if(r.error)throw new Error(`${JSON.stringify(c)}: ${r.error}`);computationMs+=performance.now()-cpu;s=r.state;
  const animation=await show(s);animationMs+=animation.ms;animationFrames+=animation.frames;
  await wait(aiDecisionDelayMs({aiSpeed:speed,reducedMotion:false},!!observe(s,'player').event));
 }
 const row={scenario:kind,renderer,speed,quality,round,totalUnits:startState.units.length,visibleUnits:visible,idle,camera,aiMs:Math.round(performance.now()-t0),computationMs:Math.round(computationMs),animationFps:animationMs>100?+(animationFrames*1000/animationMs).toFixed(2):null,commands,stateHash:digest(s)};results.push(row);
 const tr=document.createElement('tr');for(const value of [kind,`${renderer} ${speed}/${quality} #${round}`,`${visible}/${startState.units.length}`,camera.fps,row.animationFps??'—',`${row.aiMs} ms`,camera.draws,idle.frames]){const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);}rows.appendChild(tr);return row;
}
async function lifecycle(){
 world?.dispose();let s=battle60Fixture();world=new World(host,s,()=>{},()=>{}, {quality:'normal',aiSpeed:'fast'});await sample(300,false);world.setVisualSettings({quality:'low'});await sample(150,false);world.setVisualSettings({quality:'normal'});await sample(150,false);
 const before=world.diagnostics();
 for(let n=0;n<12;n++){world.setVisualSettings({quality:n%2?'normal':'low'});world.setPaused(true);world.sync(s,null,null,false);world.setPaused(false);await sample(60,false);}
 const after=world.diagnostics(),stable=['geometries','textures','labels','units','trackedGeometries','programs'].every(k=>before[k as keyof typeof before]===after[k as keyof typeof after]);
 const resets:Array<ReturnType<World['diagnostics']>&{canvases:number}>=[];for(let n=0;n<6;n++){world.dispose();s=battle60Fixture();world=new World(host,s,()=>{},()=>{});await sample(80,false);resets.push({...world.diagnostics(),canvases:host.querySelectorAll('canvas').length});}
 const resetStable=resets.every(r=>r.canvases===1&&r.geometries===resets[0].geometries&&r.textures===resets[0].textures&&r.labels===resets[0].labels);
 const hashes=results as {scenario:string;renderer:string;stateHash:string}[];const deterministic=['ai-round','battle-60'].every(kind=>new Set(hashes.filter(r=>r.scenario===kind).map(r=>r.stateHash)).size===1);
 const report={qualityCycles:12,stable,before,after,resets:6,resetStable,sameGameplayAcrossModes:deterministic,resetSnapshots:resets};checks.textContent=JSON.stringify(report,null,2);return report;
}
let lifecycleResult:unknown;
document.getElementById('run')!.onclick=async()=>{const button=document.getElementById('run') as HTMLButtonElement;button.disabled=true;results.length=0;rows.replaceChildren();try{
 for(const round of [1,2]){
  await runOne('battle-60','baseline','normal','normal',round);
  await runOne('battle-60','integrated','normal','normal',round);
  await runOne('battle-60','integrated','fast','low',round);
  await runOne('ai-round','integrated','fast','low',round);
 }
 lifecycleResult=await lifecycle();status.textContent='Đã đo xong · xem JSON và kiểm tra vòng đời';
 }catch(error){status.textContent=`Lỗi: ${String(error)}`;}finally{button.disabled=false;}};
document.getElementById('download')!.onclick=()=>{const text=JSON.stringify({environment,results,lifecycle:lifecycleResult},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='step5-integrated-performance.json';a.click();URL.revokeObjectURL(a.href);};
