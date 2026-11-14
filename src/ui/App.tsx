import { CityPanel } from './CityPanel';
import { UnitActions, type TargetAction } from './UnitActions';
import { iconFor } from './UnitIcon';
import { NewGameSetup } from './NewGameSetup';
import { DIFFICULTIES, type GameSettings } from '../game/map';
import { observe, isVisible, isExplored } from '../game/visibility';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Castle, Swords, Coins, Wheat, Trees, Flag, ArrowRight, Plus, Minus, RotateCcw, HelpCircle, X, Shield, Footprints, Heart, SkipForward, Focus, Settings, ChevronRight, Mountain, BookOpen } from 'lucide-react';
import { World } from '../render/World';
import { affordable, cityAt, createGame, execute, FACTIONS, FOUND_COST, foundingReason, improvementReason, previewAttack, reachable, recruitTiles, tileAt, UNITS, unitAt, economy, unitLockReason, statsFor, type Command, type State, type UnitType } from '../game/engine';
import { ResearchPanel } from './ResearchPanel';
import { TECHNOLOGIES, UNIT_TECH, type TechnologyId } from '../data/technologies';
import { SAVE_KEY, BACKUP_KEY, loadGame } from '../persistence/save';
import { runAIStep } from './aiTurnStep';
import { aiDecisionDelayMs, busyFallbackMs, busyWatchdogMs, loadUIPreferences, saveUIPreferences, type UIPreferences } from './playbackPolicy';
import { VisualSettingsMenu } from './VisualSettingsMenu';

const terrainNames = { grass: 'Đồng bằng', forest: 'Rừng', hill: 'Đồi', mountain: 'Núi', sand: 'Bờ cát', water: 'Biển', unknown:'Chưa khám phá' };
function storage(){try{return window.localStorage;}catch{return null;}}
function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(query.matches);query.addEventListener('change',update);return ()=>query.removeEventListener('change',update);},[]);
  return reduced;
}
function usePageHidden(){
  const [hidden,setHidden]=useState(()=>document.hidden);
  useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return ()=>document.removeEventListener('visibilitychange',update);},[]);
  return hidden;
}
function initialState() {
  try {
    const loaded=loadGame(localStorage);
    return {...loaded,hadSave:!!loaded.state,state:loaded.state??createGame()};
  } catch { return {hadSave:false,state:createGame(),canSave:false,warning:'Trình duyệt không cho phép tự lưu. Bạn vẫn có thể chơi ván này.'}; }
}
export function App() {
  const [initial] = useState(initialState);
  const [state,setState]=useState<State>(initial.state);
  const [canSave,setCanSave]=useState(initial.canSave);
  const [selectedId, setSelectedId] = useState<string | null>(() => state.units.find(u => u.owner === 'player')?.id ?? null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [researchOpen,setResearchOpen] = useState(false);
  const [technologyFocus,setTechnologyFocus] = useState<TechnologyId>('basic_agriculture');
  const [targetAction,setTargetAction]=useState<TargetAction|null>(null);
  // Id of the visible action event whose animation still holds the UI; null when idle.
  const [busyEvent,setBusyEvent]=useState<number|null>(null);
  const busy=busyEvent!==null;
  const finishedEvent=useRef<number|undefined>(undefined);
  const [preferences,setPreferences]=useState<UIPreferences>(()=>loadUIPreferences(storage()));
  const reducedMotion=useReducedMotion(),pageHidden=usePageHidden();
  const playback={aiSpeed:preferences.aiSpeed,reducedMotion};
  const [hovered, setHovered] = useState<string | null>(null);
  const [founding, setFounding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [restart, setRestart] = useState(!initial.hadSave);
  const started=useRef(initial.hadSave);
  const [worldGeneration,setWorldGeneration]=useState(0);
  const [notice, setNotice] = useState<string | null>(initial.warning);
  const [storageError, setStorageError] = useState(!initial.canSave);
  const [renderError, setRenderError] = useState(false);
  const host = useRef<HTMLDivElement>(null), world = useRef<World | null>(null);
  const clickRef = useRef<(tile: string, city?: boolean) => void>(() => {});
  const view=useMemo(()=>observe(state,'player'),[state]);
  const unit = view.units.find(u => u.id === selectedId);
  const city = view.cities.find(c => c.id === cityId);
  const cityRemembered=!!city&&!isVisible(state,'player',city.tile);
  const army = state.units.filter(u => u.owner === 'player');
  const yourTurn = state.turn === 'player' && !state.winner;
  const ledger = useMemo(()=>economy(state,'player'),[state]);
  const inc=ledger.net;
  const unitStats = unit ? statsFor(state,unit) : null;
  const activeResearch = state.research.player;
  const lastResearch = useRef(state.research.player);
  function openResearch(id?:TechnologyId) { if (id) setTechnologyFocus(id); setResearchOpen(true); setCityId(null); setFounding(false); setMenu(false); setHelp(false); }
  const actionTiles = useMemo(() => targetAction?.type==='improve'?state.tiles.filter(t=>!improvementReason(state,{...targetAction,tile:t.id})).map(t=>t.id):founding ? state.tiles.filter(t => !foundingReason(state, t.id)).map(t => t.id) : [], [state, founding,targetAction]);
  const hoverPreview = unit && hovered && yourTurn ? previewAttack(state, unit, hovered) : null;

  function command(cmd: Command) {
    if (!yourTurn||restart||busy) return false;
    const result = execute(state, cmd);
    if (result.error) { setNotice(result.error); return false; }
    setState(result.state);
    if (cmd.type === 'attack') setNotice(result.state.logs[0]);
    return true;
  }
  function selectUnit(id: string, focus = true) {
    const u = view.units.find(u => u.id === id); if (!u) return;
    setSelectedId(id); setCityId(null); setTargetAction(null); setFounding(false); setResearchOpen(false);
    if (focus) world.current?.focus(u.tile);
  }
  function nextUnit() {
    const active = army.filter(u => !u.acted);
    const list = active.length ? active : army;
    const next = list[(list.findIndex(u => u.id === selectedId) + 1) % list.length];
    if (next) selectUnit(next.id);
  }
  clickRef.current = (id, isCityLabel) => {
    if(busy||restart)return;
    if(targetAction&&yourTurn){
      let cmd:Command;
      if(targetAction.type==='board')cmd={type:'board',unit:targetAction.unit,ship:unitAt(view,id)?.id??''};
      else if(targetAction.type==='improve')cmd={...targetAction,tile:id};
      else cmd={type:targetAction.type as 'support'|'land',unit:targetAction.unit,to:id};
      if(command(cmd))setTargetAction(null);return;
    }
    if (founding && yourTurn) {
      const result = execute(state, {type:'found', tile:id});
      if (result.error) setNotice(result.error);
      else { setState(result.state); setFounding(false); setCityId(cityAt(result.state,id)?.id ?? null); setSelectedId(null); setNotice('Thành mới hoàn tất ở lượt sau.'); }
      return;
    }
    if(!isExplored(state,'player',id)){setNotice('Vùng chưa khám phá. Đưa quân tới gần để mở tầm nhìn.');return;}
    const targetUnit = unitAt(view,id),targetCity=cityAt(view,id);
    if(!isVisible(state,'player',id)){
      if(targetCity){setCityId(targetCity.id);setSelectedId(null);setResearchOpen(false);}
      else setNotice('Vùng đã khám phá nhưng đang ngoài tầm nhìn.');
      return;
    }
    // The same direct action applies to the model, its badge, or its city label.
    if (unit?.owner === 'player' && yourTurn && (!unit.acted||UNITS[unit.type].mobileShot&&unit.moves>0) && id !== unit.tile) {
      const p = previewAttack(state, unit, id);
      if (p.legal) { command({type:'attack', unit:unit.id, to:id}); setCityId(null); return; }
      if (!isCityLabel && reachable(state, unit).has(id)) { command({type:'move', unit:unit.id, to:id}); setCityId(null); return; }
      if ((targetUnit&&targetUnit.owner !== 'player') || (targetCity && targetCity.owner !== 'player')) { setNotice(p.reason === 'Mục tiêu ngoài tầm đánh.' ? 'Mục tiêu còn xa. Chọn ô xanh để đi tới gần trước.' : p.reason); return; }
    }
    if (targetCity && (isCityLabel || !targetUnit)) { setResearchOpen(false); setCityId(targetCity.id); setSelectedId(null); }
    else if (targetUnit) selectUnit(targetUnit.id, false);
    else { setCityId(null); setSelectedId(null); }
  };
  function visualEnded(id:number){finishedEvent.current=id;setBusyEvent(current=>current===id?null:current);}
  // Declared before the World is created/synced: the busy lock must be decided before World can report an end.
  const lastVisual=useRef(state.event?.id);
  useEffect(()=>{
    const id=state.event?.id;
    if(lastVisual.current===id)return;
    lastVisual.current=id;
    // Events outside the player's observation are not replayed and do not hold the UI.
    if(id===undefined||!view.event||finishedEvent.current===id){setBusyEvent(null);return;}
    setBusyEvent(id);
  },[state.event?.id]);
  useEffect(()=>{
    // Watchdog (with renderer) or plain wait (without renderer). Paused while the tab is hidden, since frames stop too.
    if(busyEvent===null||pageHidden)return;
    const owner=state.event?.owner,ms=world.current&&!renderError?busyWatchdogMs(playback,owner):busyFallbackMs(playback,owner);
    const timer=setTimeout(()=>setBusyEvent(current=>current===busyEvent?null:current),ms);
    return ()=>clearTimeout(timer);
  },[busyEvent,pageHidden,renderError]);
  useEffect(() => {
    if (!host.current) return;
    try {
      world.current = new World(host.current, state, (id, city) => clickRef.current(id, city), setHovered, {...playback,quality:preferences.graphics,onVisualEnd:visualEnded});
      // Measurement hook for tests/perf (opt-in by URL); exposes read-only diagnostics, not game state.
      if(new URLSearchParams(location.search).has('debug-world')){const w=world.current;(window as unknown as {__nationWorld?:object}).__nationWorld={diagnostics:()=>w.diagnostics(),visualSettings:()=>w.visualSettings(),isAnimating:()=>w.isAnimating()};}
    }
    catch { setRenderError(true); }
    return () => { world.current?.dispose(); world.current = null; };
  }, [worldGeneration]);
  useEffect(()=>{world.current?.setVisualSettings({quality:preferences.graphics,aiSpeed:preferences.aiSpeed,reducedMotion});},[preferences.graphics,preferences.aiSpeed,reducedMotion,worldGeneration]);
  useEffect(() => { world.current?.sync(state, unit?.id ?? null, city?.tile ?? unit?.tile ?? null, false, actionTiles); }, [state, unit?.id, unit?.tile, city?.tile, actionTiles,worldGeneration]);
  useEffect(()=>{world.current?.setPaused(researchOpen||restart);},[researchOpen,restart,worldGeneration]);
  useEffect(() => {
    if(restart)return;
    if(!canSave){setStorageError(true);return;}
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); setStorageError(false); } catch { setStorageError(true); }
  }, [state,canSave,restart]);
  useEffect(()=>{
    const before=lastResearch.current;
    if(before&&!state.research.player&&state.technologies.player.includes(before.technology)) setNotice(`Đã hoàn tất ${TECHNOLOGIES[before.technology].name}.`);
    lastResearch.current=state.research.player;
  },[state]);
  useEffect(() => {
    // One pending AI timer at most: any change below clears it before a new one is scheduled.
    if (state.turn === 'player' || state.winner||restart||busy||pageHidden) return;
    const timer = setTimeout(() => setState(runAIStep(state)), aiDecisionDelayMs(playback,!!view.event));
    return () => clearTimeout(timer);
  }, [state,restart,busy,pageHidden,preferences.aiSpeed]);
  function updatePreferences(change:Partial<UIPreferences>){
    const next={...preferences,...change};setPreferences(next);
    if(!saveUIPreferences(storage(),next))setNotice('Không lưu được cài đặt trên trình duyệt này; cài đặt vẫn áp dụng cho phiên hiện tại.');
  }
  useEffect(() => {
    if (!notice) return; const timer = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') { setTargetAction(null); setResearchOpen(false); setCityId(null); setFounding(false); setHelp(false); setMenu(false); if(started.current)setRestart(false); }
      if (e.code === 'Tab' && !(e.target as HTMLElement).closest('button,input')) { e.preventDefault(); nextUnit(); }
    }
    window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key);
  });
  function recruit(type: UnitType) {
    if (!city||busy||!yourTurn) return;
    const locked = unitLockReason(state,'player',type);
    if (locked) { openResearch(UNIT_TECH[type]); return; }
    const destination = recruitTiles(state, city,type)[0];
    if (!destination) { setNotice('Không có ô trống cạnh thành.'); return; }
    const result = execute(state, {type:'recruit', city:city.id, unitType:type, to:destination.id});
    if (result.error) { setNotice(result.error); return; }
    setState(result.state); setSelectedId(result.state.units.at(-1)!.id); setCityId(null);
    setNotice('Đã tuyển quân xanh lam. Quân mới đi được từ lượt sau.');
  }
  function newGame(settings:Pick<GameSettings,'seed'|'difficulty'|'aiCount'>) {
    if(started.current)try{localStorage.setItem(BACKUP_KEY,JSON.stringify(state));}catch{}
    const s=createGame(settings);started.current=true;setCanSave(true);setTechnologyFocus('basic_agriculture');setState(s);setSelectedId(s.units[0].id);setCityId(null);setRestart(false);setMenu(false);setHelp(false);setFounding(false);setResearchOpen(false);setHovered(null);setNotice(null);setTargetAction(null);setBusyEvent(null);lastVisual.current=s.event?.id;setRenderError(false);setWorldGeneration(n=>n+1);
  }

  const status = notice ?? (busy?'Đang thực hiện hành động…':targetAction?targetAction.type==='improve'?'Chọn ô vàng để cải tạo · Esc để hủy':targetAction.type==='support'?'Chọn đồng minh bị thương hoặc thành hỏng · Esc để hủy':targetAction.type==='board'?'Chọn tàu vận tải kề bên · Esc để hủy':'Chọn ô bờ trống kề tàu · Esc để hủy':yourTurn&&inc.food<0 ? `Lương ${inc.food}/lượt, còn ${state.resources.player.food}. Phát triển nông nghiệp hoặc chiếm thêm làng.` : founding ? 'Chọn ô vàng để xây thành · Esc để hủy' : !yourTurn ? `${FACTIONS[state.turn].name} đang đi${preferences.aiSpeed==='fast'?' · tốc độ nhanh':''}…` : unit&&unit.owner !== 'player' ? `Quân ${FACTIONS[unit.owner].short.toLowerCase()} là đối thủ · Chọn quân xanh lam để điều khiển` : unit?.acted ? 'Đơn vị đã hành động · Bấm Kết lượt để tiếp tục' : unit?.owner === 'player' ? unit.moves === 0 ? 'Hết bước di chuyển · Có thể đánh mục tiêu viền đỏ hoặc kết lượt' : 'Tiến về vùng đen để khám phá · Chọn ô xanh để đi' : 'Chọn lính xanh để đi · Chọn thành để tuyển quân');

  return <main className="game-screen">
    <div className="world" ref={host} />
    {renderError && <div className="render-error">Không mở được đồ họa 3D. Hãy bật tăng tốc phần cứng hoặc dùng trình duyệt hỗ trợ WebGL 2.</div>}
    <header className="resources" aria-label="Tài nguyên của bạn">{([{key:'gold',Icon:Coins,label:'Vàng'}, {key:'food',Icon:Wheat,label:'Lương'}, {key:'wood',Icon:Trees,label:'Gỗ'},{key:'stone',Icon:Mountain,label:'Đá'}] as const).map(({key,Icon,label}) => <div className={`resource ${key}`} key={key} aria-label={`${label}: ${state.resources.player[key]}, ròng ${inc[key]}/lượt`} title={`${label}: sản xuất +${ledger.production[key]}, duy trì −${ledger.upkeep[key]}, ròng ${inc[key]}/lượt`}><Icon size={29} strokeWidth={2} /><div><strong>{state.resources.player[key]}</strong><small className={inc[key] < 0 ? 'negative' : ''}>{inc[key] >= 0 ? '+' : ''}{inc[key]}</small></div></div>)}</header>
    <div className="player-identity"><span className="blue-flag"><Flag size={16} fill="currentColor" /></span><div><strong>BẠN · XANH LAM</strong><span>{state.cities.filter(c => c.owner === 'player').length} thành · {army.length} lính</span></div></div>
    <div className="top-buttons"><button className="round-button" aria-label="Về quân của bạn" title="Về quân của bạn" onClick={() => { const u = army.find(u => !u.acted) ?? army[0]; world.current?.resetCamera(); if (u) selectUnit(u.id); }}><Focus size={20} /></button><button className={`round-button ${menu ? 'active' : ''}`} aria-label="Menu" title="Menu" onClick={() => { setMenu(!menu); setHelp(false); }}><Settings size={20} /></button></div>
    {menu && <div className="small-menu"><button onClick={() => { setHelp(true); setMenu(false); setResearchOpen(false); }}><HelpCircle size={16} />Cách chơi</button><button onClick={() => { setRestart(true); setMenu(false); }}><RotateCcw size={16} />Ván mới</button><VisualSettingsMenu preferences={preferences} reducedMotion={reducedMotion} onChange={updatePreferences}/><span>{DIFFICULTIES[state.settings.difficulty].name} · {state.settings.aiCount} AI<br/>Mã: {state.settings.seed}</span><span>Chuột phải: kéo bản đồ<br />Cuộn: zoom · Q/E: xoay</span>{storageError && <span className="negative">Không thể tự lưu trên trình duyệt này.</span>}</div>}
    {help && <div className="help-card"><button className="close" aria-label="Đóng hướng dẫn" onClick={() => setHelp(false)}><X size={17} /></button><h2>Chơi như thế nào?</h2><p><b>1.</b> Lính <em>xanh lam</em> là của bạn. Chọn lính rồi chọn ô xanh để đi.</p><p><b>2.</b> Vùng đen chưa khám phá; vùng tối đã đi qua nhưng ngoài tầm nhìn. Đi tới gần để tìm làng và quân địch. Chọn làng trống viền đỏ để chiếm.</p><p><b>3.</b> Chọn thành của bạn để tuyển thêm quân hoặc nâng cấp.</p><p><b>4.</b> Mở biểu tượng sách để nghiên cứu: nuôi quân, mở vũ khí hoặc chuyên môn hóa. Mỗi loại quân có giá và duy trì riêng; 45 công nghệ đều mở được trong cùng ván.</p><p><b>5.</b> Bấm <b>Kết lượt</b> khi đã đi xong. Các AI cũng đánh lẫn nhau. Chiếm hết thành đối thủ để thắng.</p></div>}
    <div className="camera-buttons"><button className="round-button" aria-label="Phóng to" title="Phóng to" onClick={() => world.current?.zoom(1.15)}><Plus size={20} /></button><button className="round-button" aria-label="Thu nhỏ" title="Thu nhỏ" onClick={() => world.current?.zoom(1 / 1.15)}><Minus size={20} /></button></div>
    {city&&<CityPanel state={state} city={city} remembered={cityRemembered} onClose={()=>setCityId(null)} onRecruit={recruit} onResearch={openResearch} onCommand={command} onImprove={id=>{setTargetAction({type:'improve',city:city.id,improvement:id});setCityId(null);}}/>}
    {unit?.owner==='player'&&!city&&!researchOpen&&<UnitActions state={state} unit={unit} busy={busy} onCommand={command} onTarget={setTargetAction} onSelect={selectUnit}/>}
    {researchOpen&&<ResearchPanel state={state} selected={technologyFocus} onSelect={setTechnologyFocus} onClose={()=>setResearchOpen(false)} onResearch={id=>{if(command({type:'research',technology:id})){setResearchOpen(false);setNotice(`Bắt đầu ${TECHNOLOGIES[id].name}: ${TECHNOLOGIES[id].turns} lượt.`);}}}/>}
    {activeResearch&&!researchOpen&&<button className="research-pill" aria-label="Xem tiến độ nghiên cứu" onClick={()=>openResearch(activeResearch.technology)}><BookOpen size={15}/><span>{TECHNOLOGIES[activeResearch.technology].name}</span><b>{activeResearch.remaining} lượt</b><i style={{width:`${(1-activeResearch.remaining/TECHNOLOGIES[activeResearch.technology].turns)*100}%`}}/></button>}
    <div className={`status-line ${notice ? 'notification' : ''}`} role="status">{hoverPreview?.legal ? <><Swords size={15}/>{hoverPreview.capture ? 'Chọn để chiếm làng' : `Chọn để đánh · Gây ${hoverPreview.damage} HP${hoverPreview.fortDamage ? ` · Phá ${hoverPreview.fortDamage} công sự` : ''}${hoverPreview.retaliation ? ` · Phản kích ${hoverPreview.retaliation} HP` : ''}`}</> : <>{state.turn !== 'player' ? <span className="thinking"/> : <ChevronRight size={15}/>} {status}</>}</div>
    <footer className="bottom-hud">
      <section className="unit-hud" aria-label="Quân đang chọn">{unit ? <><button className={`unit-portrait ${unit.owner}`} title="Đến vị trí quân đang chọn" aria-label="Đến vị trí quân đang chọn" onClick={() => { world.current?.resetCamera(); world.current?.focus(unit.tile); }}>{(() => { const Icon=iconFor(unit.type); return <Icon size={31}/>; })()}</button><div className="unit-title"><strong>{UNITS[unit.type].name}</strong><span className={unit.owner}>{unit.owner === 'player' ? 'QUÂN CỦA BẠN' : 'QUÂN ĐỐI THỦ'}{unit.acted ? ' · ĐÃ ĐI' : ''}</span></div><div className="unit-stats"><span title="Sinh lực"><Heart size={20}/><b>{unit.hp}/{UNITS[unit.type].hp}</b></span><span title="Sức tấn công"><Swords size={20}/><b>{unitStats!.attack}</b></span><span title="Giáp"><Shield size={20}/><b>{unitStats!.armor}</b></span><span title="Bước di chuyển còn lại"><Footprints size={20}/><b>{unit.moves}</b></span></div></> : <div className="no-unit"><Shield size={23}/>Chọn lính xanh lam của bạn</div>}</section>
      <div className="turn-controls"><button className="round-button next-unit" title="Chọn lính chưa hành động tiếp theo" aria-label="Lính tiếp theo" onClick={nextUnit} disabled={!army.length}><SkipForward size={19}/></button><button className={`round-button found-button ${founding ? 'active' : ''}`} title="Xây thành mới gần quân của bạn" aria-label="Xây thành mới" disabled={!yourTurn || !affordable(state.resources.player,FOUND_COST)} onClick={() => { setFounding(!founding); setCityId(null); setResearchOpen(false); }}><Castle size={20}/></button><button className={`round-button research-button ${researchOpen?'active':''}`} title="Nghiên cứu" aria-label="Nghiên cứu" onClick={()=>researchOpen?setResearchOpen(false):openResearch()}><BookOpen size={20}/></button><button className="end-turn" aria-label="Kết lượt" disabled={!yourTurn||busy} onClick={() => { setFounding(false); setTargetAction(null); setCityId(null); setNotice(null); command({type:'end'}); }}><span><small>LƯỢT {state.round}</small>{yourTurn ? 'Kết lượt' : 'Đang đi…'}</span><ArrowRight size={25}/></button></div>
    </footer>
    {!activeResearch&&<div className="map-coordinate">{hovered ? `${terrainNames[tileAt(view,hovered).terrain]} · ${hovered}` : 'Đen: chưa khám phá · Tối: ngoài tầm nhìn'}</div>}
    {restart&&<NewGameSetup defaults={state.settings} canCancel={started.current} onCancel={()=>setRestart(false)} onStart={newGame}/>}
    {state.winner&&!restart&&<div className="dialog-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{state.winner==='player'?'Bạn đã chiến thắng!':'Vương quốc đã thất thủ'}</h2><p>{state.winner==='player'?'Bạn đã chinh phục tất cả vương quốc đối địch.':`${FACTIONS[state.winner].name} đã chiếm thành cuối cùng của bạn.`}</p><div><button className="confirm" onClick={()=>setRestart(true)}>Thiết lập ván mới<ArrowRight size={16}/></button></div></section></div>}
    <div className="sr-only" aria-live="polite">Lượt {state.round}, {FACTIONS[state.turn].name}</div>
  </main>;
}
