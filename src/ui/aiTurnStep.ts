import { execute, type State } from '../game/engine';
import { nextAICommand } from '../ai/ai';

/**
 * Exactly one AI command per call, always through the shared `execute`. An illegal AI command
 * ends that faction's turn instead of stalling the round (same behaviour App had inline).
 */
export function runAIStep(state: State): State {
  const result = execute(state, nextAICommand(state));
  return result.error ? execute(state, { type: 'end' }).state : result.state;
}

/** A cleared timeout may already be queued. Never apply it to a replaced game. */
export function runScheduledAIStep(current:State,scheduled:State):State{
  if(current!==scheduled||current.turn==='player'||current.winner)return current;
  return runAIStep(current);
}
