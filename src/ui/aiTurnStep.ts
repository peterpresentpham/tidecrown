import { nextAICommand } from '../ai/ai';
import { execute, type State } from '../game/engine';
import { observe } from '../game/visibility';

/**
 * Exactly one AI command per call, always through the shared `execute`. An illegal AI command
 * ends that faction's turn instead of stalling the round (same behaviour App had inline).
 */
export function runAIStep(state: State): State {
  const result = execute(state, nextAICommand(state));
  return result.error ? execute(state, { type: 'end' }).state : result.state;
}

/** Whether the player sees anything of the last command (its events survive the fog filter). */
export function playerSees(state: State): boolean {
  return (observe(state, 'player').events?.length ?? 0) > 0;
}

/**
 * AI commands the player cannot see are applied back to back: there is nothing to watch, so
 * waiting between them only delays the player's next turn. The batch stops after the first
 * visible command (it animates at the chosen pace), when the player's turn begins, or when the
 * frame budget is spent (the next batch is scheduled straight after, keeping the page responsive).
 * Rules are untouched: the result equals running the same commands one by one.
 */
export function runAIBatch(state: State, budgetMs = 12, now = () => performance.now()): State {
  const start = now();
  let s = state;
  do s = runAIStep(s);
  while (s.turn !== 'player' && !s.winner && !playerSees(s) && now() - start < budgetMs);
  return s;
}

/** A cleared timeout may already be queued. Never apply it to a replaced game. */
export function runScheduledAIStep(current: State, scheduled: State): State {
  if (current !== scheduled || current.turn === 'player' || current.winner) return current;
  return runAIBatch(current);
}
