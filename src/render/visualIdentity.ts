import type { FactionId } from '../game/engine';
/** Identity is redundant: colour + shape, never colour alone. */
export const FACTION_SYMBOL: Record<FactionId, string> = {
  player: '●',
  enemy: '▲',
  enemy2: '■',
  enemy3: '◆',
};
export const MATERIAL_PALETTE = {
  cloth: '#b09b74',
  leather: '#805b3d',
  iron: '#788b91',
  steel: '#c4d0cc',
  wood: '#9d7549',
  ivory: '#eee3c5',
  forest: '#466b51',
} as const;
