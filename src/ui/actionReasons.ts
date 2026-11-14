import {isVisible as isVisibleTile} from '../game/visibility';
// Explains why a management button is unavailable using the engine's own checks, so the UI never
// keeps a second copy of unlock rules. Purely read-only: commands are dry-run on a cloned state.
import { UNITS, isShip, isSiege, maxFort, distance, execute, upgradeReason, repairReason, improvementReason, tileAt, type City, type Command, type ImprovementId, type State } from '../game/engine';

export const WAIT_FOR_TURN = 'Chờ lượt của bạn.';

/** Engine error for a command, or null when it would succeed. `execute` never mutates its input. */
export function commandBlock(state: State, cmd: Command): string | null {
  if (state.turn !== 'player' || state.winner) return state.winner ? 'Ván chơi đã kết thúc.' : WAIT_FOR_TURN;
  if('city' in cmd){const city=state.cities.find(c=>c.id===cmd.city);if(city){if(cmd.type==='repair')return repairReason(state,city);if(cmd.type==='build'&&cmd.building==='upgrade')return upgradeReason(state,city);}}
  return execute(state, cmd).error ?? null;
}

/**
 * A city improvement is usable when at least one tile around the city passes the engine check.
 * Otherwise the most common engine reason across those tiles is shown (e.g. "Mỏ cần ô đồi trống.").
 */
export function improvementAvailability(state: State, city: City, improvement: ImprovementId): { ready: boolean; reason: string | null } {
  if (state.turn !== 'player' || state.winner) return { ready: false, reason: state.winner ? 'Ván chơi đã kết thúc.' : WAIT_FOR_TURN };
  const home = tileAt(state, city.tile), counts = new Map<string, number>();
  for (const t of state.tiles) {
    if (distance(t, home) > 2) continue;
    const why = improvementReason(state, { type: 'improve', city: city.id, improvement, tile: t.id });
    if (!why) return { ready: true, reason: null };
    counts.set(why, (counts.get(why) ?? 0) + 1);
  }
  const reason = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'Không có ô phù hợp quanh thành.';
  return { ready: false, reason };
}

/** Why a selected own unit cannot use its action buttons right now (null when it can). */
export function unitActionBlock({ yourTurn, acted, busy, finished }: { yourTurn: boolean; acted: boolean; busy: boolean; finished: boolean }): string | null {
  if (finished) return 'Ván chơi đã kết thúc.';
  if (!yourTurn) return WAIT_FOR_TURN;
  if (busy) return 'Đang diễn hoạt ảnh…';
  if (acted) return 'Đã hành động lượt này · làm mới ở lượt sau.';
  return null;
}

/** Targeted actions are offered only when a visible, legal target exists. The
 * engine remains the authority for food, capacity, distance and beach rules. */
function targetCommands(state:State,unit:import('../game/engine').Unit,kind:'support'|'board'|'land'|'bridge'):Command[]{
 const own=state.units.filter(u=>u.owner===unit.owner&&!u.aboard&&u.id!==unit.id),near=(id:string)=>distance(tileAt(state,id),tileAt(state,unit.tile))<=1;
 let commands:Command[]=[];
 if(kind==='support'){
  const units=own.filter(u=>near(u.tile)&&u.hp<UNITS[u.type].hp&&(unit.type==='engineer'?isSiege(u):!isShip(u)&&!isSiege(u)));
  const cities=unit.type==='engineer'?state.cities.filter(c=>c.owner===unit.owner&&near(c.tile)&&c.fort<maxFort(c)):[];
  commands=[...units.map(u=>({type:'support' as const,unit:unit.id,to:u.tile})),...cities.map(c=>({type:'support' as const,unit:unit.id,to:c.tile}))];
 }else if(kind==='board')commands=own.filter(u=>u.type==='transport'&&near(u.tile)).map(ship=>({type:'board',unit:unit.id,ship:ship.id}));
 else if(kind==='land')commands=state.tiles.filter(t=>near(t.id)&&t.id!==unit.tile&&isVisibleTile(state,unit.owner,t.id)).map(t=>({type:'land',unit:unit.id,to:t.id}));
 else commands=state.tiles.filter(t=>near(t.id)&&t.terrain==='water').map(t=>({type:'improve',unit:unit.id,tile:t.id,improvement:'bridge'}));
 return commands;
}
export function targetAvailability(state:State,unit:import('../game/engine').Unit,kind:'support'|'board'|'land'|'bridge'):{ready:boolean;reason:string|null}{
 const commands=targetCommands(state,unit,kind);
 let first:string|null=null;
 for(const cmd of commands){const why=commandBlock(state,cmd);if(!why)return {ready:true,reason:null};first??=why;}
 return {ready:false,reason:first??(kind==='support'?'Không có đồng minh bị thương hoặc công sự cần sửa ở ô kề.':kind==='board'?'Cần tàu vận tải của bạn ở ô kề.':kind==='land'?'Chưa có bãi trống kề tàu để đổ bộ.':'Chưa có đoạn nước hẹp hợp lệ ở ô kề để xây cầu.')};
}

/** The same legal commands supply map highlights, so selecting a target is as
 * explicit as movement. No hidden terrain or invalid beaches are highlighted. */
export function legalUnitTargets(state:State,action:{type:'support'|'board'|'land';unit:string}):string[]{
 const unit=state.units.find(u=>u.id===action.unit);if(!unit||unit.owner!=='player')return [];
 return [...new Set(targetCommands(state,unit,action.type).filter(c=>!commandBlock(state,c)).flatMap(c=>'to' in c?[c.to]:c.type==='board'?state.units.filter(u=>u.id===c.ship).map(u=>u.tile):[]))];
}
