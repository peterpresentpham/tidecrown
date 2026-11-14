// The real App on a scratch origin. Explicit DOM diagnostics and lifecycle
// controls are not included in the production entry point.
import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {App} from '../../src/ui/App';
import {SAVE_KEY} from '../../src/persistence/save';
import '../../src/style.css';
function hash(raw:string){let h=2166136261;for(const c of raw){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function QA({mounted,toggle}:{mounted:boolean;toggle:()=>void}){
 const [text,setText]=useState(''),[open,setOpen]=useState(false);
 useEffect(()=>{let previous='player',started=0,startRound=0,completed=0,cancelled=0,lastMs:number|null=null,lastRaw='',lastHash='';const timer=setInterval(()=>{
  const raw=localStorage.getItem(SAVE_KEY),s=raw?JSON.parse(raw):null;if(raw&&raw!==lastRaw){lastRaw=raw;lastHash=hash(raw);}
  if(s?.turn!=='player'&&previous==='player'){started=performance.now();startRound=s.round;}
  if(s?.turn==='player'&&previous!=='player'&&started){if(s.round>startRound){completed++;lastMs=Math.round(performance.now()-started);}else cancelled++;started=0;}
  previous=s?.turn??'player';
  const w=(window as unknown as {__nationWorld?:{diagnostics:()=>unknown;visualSettings:()=>unknown;isAnimating:()=>boolean}}).__nationWorld;
  setText(JSON.stringify({port:location.port,round:s?.round,turn:s?.turn,map:s?.settings.map,winner:s?.winner,serial:s?.serial,saveUnits:s?.units.length,stateHash:lastHash,completedAIRounds:completed,cancelledAIRounds:cancelled,lastAIRoundMs:lastMs,pollIntervalMs:100,canvases:document.querySelectorAll('canvas').length,visual:w?.visualSettings(),animating:w?.isAnimating(),memory:w?.diagnostics()},null,2));
 },100);return()=>clearInterval(timer);},[]);
 return <aside style={{position:'fixed',right:8,top:130,zIndex:40,maxWidth:240}}><button onClick={()=>setOpen(!open)} style={{padding:6,background:'#264a43',fontSize:10}}>QA: {open?'Ẩn':'Hiện'} số đo</button>{open&&<><button onClick={toggle} style={{padding:6,background:'#264a43',fontSize:10}}>{mounted?'Tạm tháo game':'Khôi phục game'}</button><pre aria-label="Số đo kiểm thử" style={{maxHeight:'55vh',overflow:'auto',fontSize:10,background:'#122a31ed',padding:8}}>{text}</pre></>}</aside>;
}
function Shell(){const [mounted,setMounted]=useState(true);return <>{mounted&&<App/>}<QA mounted={mounted} toggle={()=>setMounted(x=>!x)}/></>;}
if(location.port==='3012')createRoot(document.getElementById('root')!).render(<Shell/>);else document.body.textContent='Chỉ dùng trên origin kiểm thử cổng 3012.';
