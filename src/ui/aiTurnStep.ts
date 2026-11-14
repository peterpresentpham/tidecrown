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
