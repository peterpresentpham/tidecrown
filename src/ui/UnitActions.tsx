import { useEffect, useMemo, useState } from 'react';
import { UNITS, UNIT_UPGRADES, type UnitType } from '../data/units';
import { unitActionBlock, commandBlock, targetAvailability } from './actionReasons';
import './management.css';
import { cargo, cargoUsed, hasTech, distance, tileAt, unitLockReason, unitUpgradeCost, type State, type Unit, type Command, type ImprovementId } from '../game/engine';
export type TargetAction={type:'support'|'board'|'land';unit:string}|{type:'improve';city?:string;unit?:string;improvement:ImprovementId};
export function UnitActions({state,unit,onCommand,onTarget,onSelect,busy}:{state:State;unit:Unit;onCommand:(c:Command)=>boolean;onTarget:(a:TargetAction)=>void;onSelect:(id:string)=>void;busy:boolean}){
 const [upgrade,setUpgrade]=useState('');useEffect(()=>setUpgrade(''),[unit.id,unit.type]);
 const reasons=useMemo(()=>{
  if(unit.owner!=='player')return {} as Record<string,string|null>;
  const result:Record<string,string|null>={};
  const check=(key:string,cmd:Command)=>{result[key]=commandBlock(state,cmd);};
  if(unit.type==='shield')check('guard',{type:'stance',unit:unit.id,stance:'guard'});
  if(unit.type==='pikeman')check('brace',{type:'stance',unit:unit.id,stance:'brace'});
  if(unit.type==='crossbow'&&hasTech(state,'player','marksman'))check('aim',{type:'stance',unit:unit.id,stance:'aim'});
  if(UNITS[unit.type].class==='siege'&&hasTech(state,'player','siege_logistics'))check(unit.deployed?'pack':'deploy',{type:'stance',unit:unit.id,stance:unit.deployed?'pack':'deploy'});
  if(upgrade)check('upgrade',{type:'upgradeUnit',unit:unit.id,unitType:upgrade as UnitType});
  if(['paladin','engineer'].includes(unit.type))result.support=targetAvailability(state,unit,'support').reason;
  if(unit.type==='engineer')result.bridge=targetAvailability(state,unit,'bridge').reason;
  if(unit.aboard)result.land=targetAvailability(state,unit,'land').reason;
  if(!unit.aboard&&UNITS[unit.type].class!=='ship'&&state.units.some(u=>u.owner==='player'&&u.type==='transport'&&distance(tileAt(state,u.tile),tileAt(state,unit.tile))<=1))result.board=targetAvailability(state,unit,'board').reason;
  return result;
 },[state,unit,upgrade]);
 if(unit.owner!=='player')return null;
 const options=(UNIT_UPGRADES[unit.type]??[]).filter(type=>!unitLockReason(state,'player',type));
 const nearShip=!unit.aboard&&UNITS[unit.type].class!=='ship'&&state.units.some(u=>u.owner==='player'&&u.type==='transport'&&distance(tileAt(state,u.tile),tileAt(state,unit.tile))<=1);
 const special=['shield','pikeman','paladin','engineer','transport'].includes(unit.type)||unit.aboard||unit.type==='crossbow'&&hasTech(state,'player','marksman')||UNITS[unit.type].class==='siege'&&hasTech(state,'player','siege_logistics');
 if(!special&&!options.length&&!nearShip)return null;
 const price=upgrade&&options.includes(upgrade as UnitType)?unitUpgradeCost(unit.type,upgrade as UnitType):null;
 const blocked=unitActionBlock({yourTurn:state.turn==='player',acted:unit.acted,busy,finished:!!state.winner}),enabled=!blocked;
 const button=(label:string,cmd:Command)=>{const why=blocked??reasons[cmd.type==='stance'?cmd.stance:cmd.type];return <span className="unit-action-option"><button disabled={!!why} title={why??label} onClick={()=>onCommand(cmd)}>{label}</button>{why&&!blocked&&<small className="reason">{why}</small>}</span>;};
 const targeted=(label:string,key:'support'|'bridge'|'board'|'land',onClick:()=>void)=>{const why=blocked??reasons[key];return <span className="unit-action-option"><button disabled={!!why} title={why??label} onClick={onClick}>{label}</button>{why&&!blocked&&<small className="reason">{why}</small>}</span>;};
 return <div className="unit-actions" aria-label="Hành động đơn vị"><strong>{UNITS[unit.type].name}{unit.type==='transport'?` · ${cargoUsed(state,unit)}/6 chỗ`:unit.aboard?' · Trên tàu':''}</strong>
 {blocked&&<span className="action-block" role="note">{blocked}</span>}
 {unit.type==='shield'&&button('Giữ trận',{type:'stance',unit:unit.id,stance:'guard'})}
 {unit.type==='pikeman'&&button('Dựng thương',{type:'stance',unit:unit.id,stance:'brace'})}
 {unit.type==='crossbow'&&hasTech(state,'player','marksman')&&button('Ngắm bắn',{type:'stance',unit:unit.id,stance:'aim'})}
 {UNITS[unit.type].class==='siege'&&hasTech(state,'player','siege_logistics')&&button(unit.deployed?'Thu máy':'Triển khai',{type:'stance',unit:unit.id,stance:unit.deployed?'pack':'deploy'})}
 {['paladin','engineer'].includes(unit.type)&&targeted(unit.type==='paladin'?'Cứu chữa · 3 lương':'Sửa · 3 gỗ + 3 đá','support',()=>onTarget({type:'support',unit:unit.id}))}
 {unit.type==='engineer'&&targeted('Xây cầu','bridge',()=>onTarget({type:'improve',unit:unit.id,improvement:'bridge'}))}
 {unit.aboard?targeted('Đổ bộ','land',()=>onTarget({type:'land',unit:unit.id})):nearShip&&targeted('Lên tàu','board',()=>onTarget({type:'board',unit:unit.id}))}
 {unit.type==='transport'&&cargo(state,unit).map(p=><button key={p.id} disabled={busy} onClick={()=>onSelect(p.id)}>{UNITS[p.type].name} · chọn đổ bộ</button>)}
 {!unit.aboard&&options.length>0&&<><select aria-label="Loại quân nâng cấp" value={upgrade} onChange={e=>setUpgrade(e.target.value)}><option value="">Nâng loại quân…</option>{options.map(t=><option key={t} value={t}>{UNITS[t].name}</option>)}</select><button disabled={!enabled||!upgrade||!!reasons.upgrade} onClick={()=>onCommand({type:'upgradeUnit',unit:unit.id,unitType:upgrade as Unit['type']})}>Nâng{price?` · ${price.gold} vàng${price.wood?` + ${price.wood} gỗ`:''}${price.stone?` + ${price.stone} đá`:''}`:''}</button>{upgrade&&reasons.upgrade&&!blocked&&<small className="reason">{reasons.upgrade}</small>}</>}
 </div>;
}
