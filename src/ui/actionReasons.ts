// Explains why a management button is unavailable using the engine's own checks, so the UI never
// keeps a second copy of unlock rules. Purely read-only: commands are dry-run on a cloned state.
import { distance, execute, improvementReason, tileAt, type City, type Command, type ImprovementId, type State } from '../game/engine';

export const WAIT_FOR_TURN = 'Chờ lượt của bạn.';

/** Engine error for a command, or null when it would succeed. `execute` never mutates its input. */
export function commandBlock(state: State, cmd: Command): string | null {
  if (state.turn !== 'player' || state.winner) return state.winner ? 'Ván chơi đã kết thúc.' : WAIT_FOR_TURN;
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
