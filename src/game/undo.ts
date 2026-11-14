import type { Command, State } from './engine';
import { observe } from './visibility';
export type MoveUndo = { before: State; after: State };
/** A single immutable snapshot; any intervening command invalidates its identity. */
export function moveUndo(before: State, after: State, cmd: Command): MoveUndo | null {
  if (
    cmd.type !== 'move' ||
    before === after ||
    before.turn !== 'player' ||
    after.turn !== before.turn ||
    after.round !== before.round
  )
    return null;
  if (JSON.stringify(before.knowledge.player) !== JSON.stringify(after.knowledge.player))
    return null;
  const foes = (s: State) => observe(s, 'player').units.filter((u) => u.owner !== 'player');
  if (JSON.stringify(foes(before)) !== JSON.stringify(foes(after))) return null;
  return { before, after };
}
export const undoMove = (s: State, snapshot: MoveUndo | null) =>
  snapshot?.after === s
    ? { ...snapshot.before, serial: s.serial, event: undefined, events: [] }
    : null;
