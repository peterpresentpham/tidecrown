// Presentation-only preferences and the single timing policy shared by App (AI scheduling)
// and World (action animation). Nothing here changes game rules or the saved State.
import type { FactionId } from '../game/engine';

export type AISpeed = 'normal' | 'fast';
export type GraphicsQuality = 'normal' | 'medium' | 'low';
export type UIPreferences = { aiSpeed: AISpeed; graphics: GraphicsQuality };

export const UI_PREFERENCES_KEY = 'nation-ui-preferences-v1';
export const DEFAULT_UI_PREFERENCES: UIPreferences = { aiSpeed: 'normal', graphics: 'normal' };

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

/** Reads preferences; any missing, malformed or inaccessible storage falls back to defaults. */
export function loadUIPreferences(storage: ReadableStorage | null | undefined): UIPreferences {
  try {
    const raw = storage?.getItem(UI_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_UI_PREFERENCES };
    const data = JSON.parse(raw) as Partial<Record<keyof UIPreferences, unknown>> | null;
    return {
      aiSpeed: data?.aiSpeed === 'fast' ? 'fast' : 'normal',
      graphics:
        data?.graphics === 'low' ? 'low' : data?.graphics === 'medium' ? 'medium' : 'normal',
    };
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
}

/** Returns false instead of throwing when storage is blocked or full; play must continue. */
export function saveUIPreferences(
  storage: WritableStorage | null | undefined,
  prefs: UIPreferences
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(
      UI_PREFERENCES_KEY,
      JSON.stringify({ aiSpeed: prefs.aiSpeed, graphics: prefs.graphics })
    );
    return true;
  } catch {
    return false;
  }
}

export type PlaybackContext = { aiSpeed: AISpeed; reducedMotion: boolean };

/**
 * Pause before the next AI decision, counted after the previous visible animation has finished.
 * Nothing lingers on actions the player could not see (those run in batches, see aiTurnStep);
 * the minimal timeout still yields to the browser between batches.
 */
export function aiDecisionDelayMs({ aiSpeed }: PlaybackContext, previousWasVisible = true): number {
  if (!previousWasVisible) return 1;
  return aiSpeed === 'fast' ? 60 : 190;
}

/**
 * Length of one action animation in seconds. Fast mode only shortens AI actions; the player's
 * own moves keep the normal pace. Reduced motion always wins because it is an OS accessibility choice.
 */
export function actionSeconds(
  { aiSpeed, reducedMotion }: PlaybackContext,
  actor: FactionId | undefined
): number {
  if (reducedMotion) return 0.16;
  if (aiSpeed === 'fast' && actor && actor !== 'player') return 0.42;
  return 0.8;
}

/**
 * Safety net only: the UI normally unlocks when World reports the animation ended. If the renderer
 * stalls (throttled frames, lost context) the lock is still released after this limit.
 */
export function busyWatchdogMs(context: PlaybackContext, actor: FactionId | undefined): number {
  return Math.round(actionSeconds(context, actor) * 1000 * 3 + 1000);
}

/** Without a working renderer there is no completion signal; wait as long as the animation would. */
export function busyFallbackMs(context: PlaybackContext, actor: FactionId | undefined): number {
  return Math.round(actionSeconds(context, actor) * 1000 + 50);
}
