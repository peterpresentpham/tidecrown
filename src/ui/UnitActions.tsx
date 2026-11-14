import { useEffect, useState } from 'react';
import { UNITS, UNIT_UPGRADES, type UnitType } from '../data/units';
import { unitActionBlock } from './actionReasons';
import './management.css';
import { cargo, cargoUsed, hasTech, distance, tileAt, unitLockReason, unitUpgradeCost, type State, type Unit, type Command, type ImprovementId } from '../game/engine';
export type TargetAction={type:'support'|'board'|'land';unit:string}|{type:'improve';city?:string;unit?:string;improvement:ImprovementId};
export function UnitActions({state,unit,onCommand,onTarget,onSelect,busy}:{state:State;unit:Unit;onCommand:(c:Command)=>boolean;onTarget:(a:TargetAction)=>void;onSelect:(id:string)=>void;busy:boolean}){
 const [upgrade,setUpgrade]=useState('');useEffect(()=>setUpgrade(''),[unit.id,unit.type]);if(unit.owner!=='player')return null;
 const options=(UNIT_UPGRADES[unit.type]??[]).filter(type=>!unitLockReason(state,'player',type));
 const nearShip=!unit.aboard&&UNITS[unit.type].class!=='ship'&&state.units.some(u=>u.owner==='player'&&u.type==='transport'&&distance(tileAt(state,u.tile),tileAt(state,unit.tile))<=1);
 const special=['shield','pikeman','paladin','engineer','transport'].includes(unit.type)||unit.aboard||unit.type==='crossbow'&&hasTech(state,'player','marksman')||UNITS[unit.type].class==='siege'&&hasTech(state,'player','siege_logistics');
 if(!special&&!options.length&&!nearShip)return null;
 const price=upgrade&&options.includes(upgrade as UnitType)?unitUpgradeCost(unit.type,upgrade as UnitType):null;
 const blocked=unitActionBlock({yourTurn:state.turn==='player',acted:unit.acted,busy,finished:!!state.winner}),enabled=!blocked;
 const button=(label:string,cmd:Command)=><button disabled={!enabled} onClick={()=>onCommand(cmd)}>{label}</button>;
 return <div className="unit-actions" aria-label="Hành động đơn vị"><strong>{UNITS[unit.type].name}{unit.type==='transport'?` · ${cargoUsed(state,unit)}/6 chỗ`:unit.aboard?' · Trên tàu':''}</strong>
 {blocked&&<span className="action-block" role="note">{blocked}</span>}
 {unit.type==='shield'&&button('Giữ trận',{type:'stance',unit:unit.id,stance:'guard'})}
 {unit.type==='pikeman'&&button('Dựng thương',{type:'stance',unit:unit.id,stance:'brace'})}
 {unit.type==='crossbow'&&hasTech(state,'player','marksman')&&button('Ngắm bắn',{type:'stance',unit:unit.id,stance:'aim'})}
 {UNITS[unit.type].class==='siege'&&hasTech(state,'player','siege_logistics')&&button(unit.deployed?'Thu máy':'Triển khai',{type:'stance',unit:unit.id,stance:unit.deployed?'pack':'deploy'})}
 {['paladin','engineer'].includes(unit.type)&&<button disabled={!enabled} onClick={()=>onTarget({type:'support',unit:unit.id})}>{unit.type==='paladin'?'Cứu chữa · 3 lương':'Sửa · 3 gỗ + 3 đá'}</button>}
 {unit.type==='engineer'&&<button disabled={!enabled} onClick={()=>onTarget({type:'improve',unit:unit.id,improvement:'bridge'})}>Xây cầu</button>}
 {unit.aboard?<button disabled={!enabled} onClick={()=>onTarget({type:'land',unit:unit.id})}>Đổ bộ</button>:nearShip&&<button disabled={!enabled} onClick={()=>onTarget({type:'board',unit:unit.id})}>Lên tàu</button>}
 {unit.type==='transport'&&cargo(state,unit).map(p=><button key={p.id} disabled={busy} onClick={()=>onSelect(p.id)}>{UNITS[p.type].name} · chọn đổ bộ</button>)}
 {!unit.aboard&&options.length>0&&<><select aria-label="Loại quân nâng cấp" value={upgrade} onChange={e=>setUpgrade(e.target.value)}><option value="">Nâng loại quân…</option>{options.map(t=><option key={t} value={t}>{UNITS[t].name}</option>)}</select><button disabled={!enabled||!upgrade} onClick={()=>onCommand({type:'upgradeUnit',unit:unit.id,unitType:upgrade as Unit['type']})}>Nâng{price?` · ${price.gold} vàng${price.wood?` + ${price.wood} gỗ`:''}${price.stone?` + ${price.stone} đá`:''}`:''}</button></>}
 </div>;
}
