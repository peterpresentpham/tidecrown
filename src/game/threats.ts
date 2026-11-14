import {
  cityShot,
  clearShot,
  distance,
  hasBuilding,
  isSiege,
  reachable,
  type State,
  statsFor,
  tileAt,
  UNITS,
} from './engine';
import { isVisible, observe } from './visibility';
/** Conservative public estimate, not a promise that unmarked tiles are safe. */
export function visibleThreats(raw: State) {
  const s = observe(raw, 'player'),
    current = new Set<string>(),
    potential = new Set<string>();
  const mark = (from: string, range: number, set: Set<string>, lob = false) => {
    for (const t of s.tiles)
      if (
        isVisible(s, 'player', t.id) &&
        distance(tileAt(s, from), t) <= range &&
        (lob || range === 1 || clearShot(s, from, t.id))
      )
        set.add(t.id);
  };
  for (const u of s.units.filter(
    (u) => u.owner !== 'player' && !u.aboard && UNITS[u.type].attack > 0
  )) {
    const range = statsFor(s, u).range;
    mark(u.tile, range, current, ['catapult', 'trebuchet'].includes(u.type));
    if (isSiege(u)) continue;
    const view = { ...s, knowledge: { ...s.knowledge, [u.owner]: s.knowledge.player } },
      fresh = { ...u, moves: UNITS[u.type].moves };
    for (const [id] of reachable(view, fresh)) mark(id, range, potential);
  }
  for (const c of s.cities.filter(
    (c) => c.owner && c.owner !== 'player' && isVisible(s, 'player', c.tile) && cityShot(c) > 0
  ))
    mark(c.tile, hasBuilding(c, 'tower') ? 3 : 2, current, true);
  for (const id of current) potential.delete(id);
  return { current: [...current], potential: [...potential] };
}
