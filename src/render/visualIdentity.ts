import type { FactionId } from '../game/engine';

/** Identity is redundant: colour + shape, never colour alone. */
export const FACTION_SYMBOL: Record<FactionId, string> = {
  player: '●',
  enemy: '▲',
  enemy2: '■',
  enemy3: '◆',
};
