import { useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Clock3, LockKeyhole, X, Wheat, Trees, Shield, Target, Footprints, Castle, Ship, Search, ArrowRight, Coins, Mountain, Sparkles, Hammer, CircleCheck } from 'lucide-react';
import { BRANCHES, TECHNOLOGIES, TECHNOLOGY_LOGIC, UNIT_TECH, RECRUITABLE_UNITS, type TechnologyId, type Branch } from '../data/technologies';
import { BUILDINGS, IMPROVEMENTS } from '../data/buildings';
import { researchStatus, type ResearchStatusKind } from '../game/research';
import { UNITS, type State, type Resource } from '../game/engine';
import { iconFor } from './UnitIcon';
import {ResearchConnections} from './ResearchConnections';
import {researchAncestry} from './researchGraph';
import './research.css';

const all=Object.values(TECHNOLOGIES),branches=Object.keys(BRANCHES) as Branch[];
const branchIcons={economy:Wheat,materials:Trees,infantry:Shield,ranged:Target,cavalry:Footprints,siege:Castle,naval:Ship};
const phases=['Nền tảng','Phát triển','Chuyên môn','Tinh nhuệ'];
const statusIcons={ready:Sparkles,researching:Clock3,complete:Check,locked:LockKeyhole,unaffordable:Coins,waiting:Clock3};
const normalize=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
function unlocks(id:TechnologyId){return RECRUITABLE_UNITS.filter(type=>UNIT_TECH[type]===id);}
function benefits(id:TechnologyId){
 const units=unlocks(id);if(units.length)return units.map(type=>UNITS[type].name).join(', ');
 const buildings=Object.values(BUILDINGS).filter(b=>b.tech===id).map(b=>b.name);
 if(buildings.length)return buildings.join(', ');
 const improvements=Object.values(IMPROVEMENTS).filter(i=>i.tech===id).map(i=>i.name);
 return improvements.length?improvements.join(', '):id==='siege_logistics'?'Triển khai máy chiến tranh':id==='marksman'?'Ngắm bắn xuyên giáp':'Đổ bộ có tổ chức';
}
function Cost({cost,stock}:{cost:Resource;stock:Resource}){
 return <span className="research-cost">{([{id:'gold',Icon:Coins,name:'vàng'},{id:'wood',Icon:Trees,name:'gỗ'},{id:'stone',Icon:Mountain,name:'đá'},{id:'food',Icon:Wheat,name:'lương'}] as const).filter(({id})=>cost[id]>0).map(({id,Icon,name})=><span key={id} className={stock[id]<cost[id]?'shortfall':''} title={`${cost[id]} ${name}`}><Icon size={12}/>{cost[id]}</span>)}</span>;
}
export function ResearchPanel({state,selected,onSelect,onClose,onResearch}:{state:State;selected:TechnologyId;onSelect:(id:TechnologyId)=>void;onClose:()=>void;onResearch:(id:TechnologyId)=>void}){
 const [query,setQuery]=useState(''),[branch,setBranch]=useState<Branch|'all'>('all'),[filter,setFilter]=useState('all'),[goal,setGoal]=useState<TechnologyId|null>(null);
 const nodes=useRef(new Map<TechnologyId,HTMLElement>()),pendingFocus=useRef<TechnologyId|null>(null);
 const statuses=useMemo(()=>Object.fromEntries(all.map(t=>[t.id,researchStatus(state,'player',t.id)])) as Record<TechnologyId,ReturnType<typeof researchStatus>>,[state]);
 const route=useMemo(()=>goal?researchAncestry(goal):null,[goal]);
 const selectedRoute=useMemo(()=>researchAncestry(selected),[selected]);
 const canvas=useRef<HTMLDivElement>(null);
 const current=state.research.player,done=state.technologies.player,tech=TECHNOLOGIES[selected],status=statuses[selected];
 const ready=all.filter(t=>statuses[t.id].kind==='ready');
 const pick=(id:TechnologyId,ensureVisible=false)=>{
  onSelect(id);
  if(ensureVisible){setBranch('all');setFilter('all');setQuery('');if(route&&!route.has(id))setGoal(null);pendingFocus.current=id;requestAnimationFrame(()=>{const el=nodes.current.get(id);if(el&&pendingFocus.current===id){pendingFocus.current=null;el.scrollIntoView({behavior:'smooth',block:'nearest'});el.querySelector<HTMLButtonElement>('.research-card-select')?.focus({preventScroll:true});}});}
 };
 const attach=(id:TechnologyId,el:HTMLElement|null)=>{
  if(el){nodes.current.set(id,el);if(pendingFocus.current===id){pendingFocus.current=null;requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});el.querySelector<HTMLButtonElement>('.research-card-select')?.focus({preventScroll:true});});}}
  else nodes.current.delete(id);
 };
 const visible=all.filter(t=>(branch==='all'||t.branch===branch)&&(!query||normalize(`${t.name} ${t.effect} ${benefits(t.id)}`).includes(normalize(query)))&&(!route||route.has(t.id))&&(filter==='all'||filter==='ready'&&statuses[t.id].kind==='ready'||filter==='complete'&&statuses[t.id].kind==='complete'||filter==='unlocked'&&!['locked','complete'].includes(statuses[t.id].kind)));
 const hiddenAncestors=[...selectedRoute].filter(id=>!visible.some(t=>t.id===id)).length;
 const future=all.filter(t=>t.requires.includes(selected));
 const renderTechnology=(t:typeof all[number])=>{const st=statuses[t.id],StatusIcon=statusIcons[st.kind],units=unlocks(t.id),Icon=units.length?iconFor(units[0]):t.branch==='economy'?Wheat:t.branch==='materials'?Hammer:branchIcons[t.branch];return <article key={t.id} ref={el=>attach(t.id,el)} data-technology={t.id} data-status={st.kind} className={`research-tech ${st.kind} ${selected===t.id?'selected':''} ${selectedRoute.has(t.id)?'on-route':''}`}>
      <button className="research-card-select" aria-label={`Xem ${t.name}`} aria-pressed={selected===t.id} onClick={()=>pick(t.id)}><span className="research-card-heading"><Icon size={20}/><strong>{t.name}</strong></span><span className="research-status"><StatusIcon size={12}/>{st.label}</span><span className="research-benefit">{benefits(t.id)}</span>{goal&&<span className="research-route-branch">{BRANCHES[t.branch]}</span>}<span className="research-card-price"><Cost cost={t.cost} stock={state.resources.player}/><span><Clock3 size={11}/>{t.turns} lượt</span></span></button>
      {t.requires.length>0&&<div className="research-card-requires"><span>Cần:</span>{t.requires.map(req=><button key={req} className={done.includes(req)?'met':''} aria-label={`Đi tới ${TECHNOLOGIES[req].name}`} onClick={()=>pick(req,true)}>{done.includes(req)&&<Check size={10}/>} {TECHNOLOGIES[req].name}</button>)}</div>}
      {st.kind==='researching'&&<div className="research-node-progress" style={{width:`${(1-current!.remaining/t.turns)*100}%`}}/>}
      </article>;};
 const depth=(id:TechnologyId):number=>TECHNOLOGIES[id].requires.length?1+Math.max(...TECHNOLOGIES[id].requires.map(depth)):0;
 return <section className="research-screen" aria-label="Cây nghiên cứu">
  <header className="research-screen-header"><span className="research-book"><BookOpen size={25}/></span><div><h2>Cây công nghệ</h2><p>{done.length} / {all.length} đã nghiên cứu · Mọi nhánh đều mở được trong cùng một ván</p></div><button className="research-close" aria-label="Đóng nghiên cứu" onClick={onClose}><X size={21}/></button></header>
  <div className="research-main">
   <div className={`research-browser ${goal?'research-focused':''}`}>
    <section className="research-ready" aria-label="Công nghệ nghiên cứu được"><div className="research-ready-heading"><Sparkles size={17}/><h3>{ready.length?'Có thể nghiên cứu ngay':'Tiến độ nghiên cứu'}</h3><span>{ready.length} công nghệ sẵn sàng</span></div>
     {current?<p className="research-current"><Clock3 size={15}/><strong>{TECHNOLOGIES[current.technology].name}</strong> · còn {current.remaining} lượt <button onClick={()=>pick(current.technology,true)}>Xem tiến độ<ArrowRight size={13}/></button></p>:ready.length?<div className="research-ready-list">{ready.map(t=><button key={t.id} onClick={()=>pick(t.id,true)}><CircleCheck size={14}/>{t.name}<span>{t.cost.gold} vàng</span></button>)}</div>:<p className="research-empty-ready">{state.turn!=='player'?'Đợi tới lượt của bạn.':'Xem các nút có điều kiện đã đủ hoặc bổ sung tài nguyên để mở công nghệ tiếp theo.'}</p>}
    </section>
    <div className="research-tools"><label className="research-search"><Search size={16}/><input aria-label="Tìm công nghệ" placeholder="Tìm tên, đơn vị hoặc tác dụng…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Xóa tìm kiếm" onClick={()=>setQuery('')}><X size={14}/></button>}</label><select aria-label="Lọc trạng thái nghiên cứu" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="ready">Nghiên cứu được ngay</option><option value="unlocked">Đã đủ kiến thức nền</option><option value="complete">Đã nghiên cứu</option></select><select aria-label="Đường mở đơn vị" value={goal??''} onChange={e=>{const id=e.target.value as TechnologyId;setGoal(id||null);setBranch('all');setFilter('all');setQuery('');if(id)onSelect(id);}}><option value="">Đường mở đơn vị…</option>{RECRUITABLE_UNITS.filter(type=>UNIT_TECH[type]).map(type=><option key={type} value={UNIT_TECH[type]}>{UNITS[type].name}</option>)}</select></div>
    <nav className="research-branches" aria-label="Nhánh công nghệ"><button className={branch==='all'?'active':''} onClick={()=>setBranch('all')}>Toàn bộ cây <span>{all.length}</span></button>{branches.map(id=>{const Icon=branchIcons[id],count=all.filter(t=>t.branch===id&&statuses[t.id].kind==='ready').length;return <button key={id} className={branch===id?'active':''} onClick={()=>setBranch(id)}><Icon size={15}/>{BRANCHES[id]}{count>0&&<b>{count}</b>}</button>;})}</nav>
    <div className="research-legend" aria-label="Chú giải trạng thái">{[['ready','Nghiên cứu được'],['researching','Đang nghiên cứu'],['complete','Đã mở'],['locked','Chưa đủ điều kiện']].map(([kind,label])=>{const Icon=statusIcons[kind as ResearchStatusKind];return <span key={kind} className={kind}><Icon size={12}/>{label}</span>;})}<small>Các cột thể hiện mức phát triển, không khóa theo thời đại.</small></div>

    <div className="research-route-summary" aria-label="Đường nghiên cứu đang chọn"><Target size={14}/><span>Đường tới <strong>{tech.name}</strong> · {[...selectedRoute].filter(id=>!done.includes(id)).length} chưa học</span><span className="research-route-key"><i/>Cần nghiên cứu <i className="completed"/>Đã hoàn tất</span><button onClick={()=>{setGoal(selected);setBranch('all');setFilter('all');setQuery('');}}> {hiddenAncestors?`Hiện đủ đường (${hiddenAncestors} đang ẩn)`:'Chỉ xem đường này'}<ArrowRight size={12}/></button>{goal&&<button onClick={()=>setGoal(null)}>Bỏ mục tiêu<X size={12}/></button>}</div>
    <div className="research-map" aria-label="Sơ đồ các nhánh công nghệ">{goal?<div className="research-route-direction">Điều kiện trước <ArrowRight size={14}/> Công nghệ sau <small>{visible.length} công nghệ · Mũi tên chỉ chiều mở khóa</small></div>:<div className="research-phase-header">{phases.map((name,i)=><span key={name}><b>{i+1}</b>{name}</span>)}</div>}
     <div className={`research-graph-canvas ${goal?'route-only':''}`} ref={canvas}><ResearchConnections canvas={canvas} nodes={nodes} visibleKey={visible.map(t=>t.id).join(',')} route={selectedRoute} done={done}/>
     {goal?<div className="research-route-grid">{[...visible].sort((a,b)=>depth(a.id)-depth(b.id)).map(renderTechnology)}</div>:branches.filter(id=>visible.some(t=>t.branch===id)).map(id=>{const Icon=branchIcons[id];return <section className="research-lane" key={id} aria-label={BRANCHES[id]}><header><Icon size={18}/><h3>{BRANCHES[id]}</h3><span>{visible.filter(t=>t.branch===id).length} công nghệ</span></header><div className="research-lane-cells">{phases.map((phase,i)=><div className="research-phase" key={phase}><h4>{phase}</h4>{visible.filter(t=>t.branch===id&&t.tier===i+1).map(renderTechnology)}{!visible.some(t=>t.branch===id&&t.tier===i+1)&&<span className="research-phase-empty">—</span>}</div>)}</div></section>;})}
      {!visible.length&&<div className="research-no-results"><Search size={25}/><p>Không có công nghệ khớp bộ lọc.</p><button onClick={()=>{setFilter('all');setBranch('all');setQuery('');setGoal(null);}}>Hiện toàn bộ cây</button></div>}
    </div></div>
   </div>
   <aside className="research-inspector" aria-label={`Chi tiết ${tech.name}`}><div className="research-inspector-scroll"><div className={`research-inspector-state ${status.kind}`}>{(()=>{const Icon=statusIcons[status.kind];return <Icon size={15}/>;})()}{status.label}</div><span className="research-inspector-branch">{BRANCHES[tech.branch]} · {phases[tech.tier-1]}</span><h3>{tech.name}</h3><p className="research-effect">{tech.effect}</p><div className="research-inspector-cost"><Cost cost={tech.cost} stock={state.resources.player}/><span><Clock3 size={14}/>{tech.turns} lượt</span></div>
    <h4>Điều kiện kiến thức</h4>{tech.requires.length?<div className="research-detail-requires">{tech.requires.map(req=><button key={req} className={done.includes(req)?'met':''} onClick={()=>pick(req,true)}>{done.includes(req)?<Check size={15}/>:<LockKeyhole size={14}/>}<span>{TECHNOLOGIES[req].name}<small>{BRANCHES[TECHNOLOGIES[req].branch]}</small></span><ArrowRight size={13}/></button>)}</div>:<p className="research-root-note">Công nghệ nền tảng · Không cần nghiên cứu khác trước.</p>}
    <details className="research-logic" open><summary>Vì sao cần điều kiện này?</summary><p>{TECHNOLOGY_LOGIC[selected]}</p></details>
    {future.length>0&&<div className="research-next"><h4>Dẫn tới</h4>{future.map(t=><button key={t.id} onClick={()=>pick(t.id,true)}>{t.name}<ArrowRight size={12}/></button>)}</div>}
    {status.reason&&<p className="research-block-reason">{status.reason}</p>}
    </div><footer className="research-inspector-footer"><button className={`research-start-button ${status.kind}`} aria-label={`Nghiên cứu ${tech.name}`} disabled={status.kind!=='ready'} onClick={()=>onResearch(selected)}>{status.kind==='ready'?<><Sparkles size={16}/>Nghiên cứu ngay</>:status.kind==='complete'?<><Check size={16}/>Đã nghiên cứu</>:status.kind==='researching'?<><Clock3 size={16}/>Đang nghiên cứu</>:status.label}</button>
    <small className="research-inspector-note">Mọi điều kiện được ghi rõ. Học nhánh này không khóa nhánh khác. Công nghệ mở quyền tuyển/xây; bạn vẫn cần công trình và tài nguyên tương ứng.</small></footer>
   </aside>
  </div>
 </section>;
}
