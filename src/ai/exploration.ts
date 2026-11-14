import {
  canOccupy,
  controlled,
  distance,
  movementCost,
  neighbors,
  type State,
  tileAt,
  type Unit,
  UNITS,
} from '../game/engine';
import { isVisible, sightRange } from '../game/visibility';
export type TravelRoute = { cost: number; path: string[] };

/** The input is an observation, never the raw world. Avoid edges the unit cannot
 * pay for even with a fresh turn (e.g. a one-move clubman entering forest). */
export function explorationRoutes(s: State, u: Unit): Map<string, TravelRoute> {
  const routes = new Map([[u.tile, { cost: 0, path: [] as string[] }]]);
  if (u.aboard || u.deployed) return routes;
  const explored = new Set(s.knowledge[u.owner].explored),
    blocked = new Set([
      ...s.units.filter((t) => !t.aboard && t.id !== u.id).map((t) => t.tile),
      ...s.cities.filter((c) => c.owner !== u.owner).map((c) => c.tile),
    ]),
    pending = [u.tile];
  while (pending.length) {
    pending.sort((a, b) => routes.get(a)!.cost - routes.get(b)!.cost);
    const id = pending.shift()!,
      prev = routes.get(id)!;
    for (const t of neighbors(s, id)) {
      if (!explored.has(t.id) || blocked.has(t.id) || !canOccupy(s, u, t)) continue;
      const step = movementCost(s, u, t);
      if (step > UNITS[u.type].moves) continue;
      const cost = prev.cost + step;
      if (routes.has(t.id) && routes.get(t.id)!.cost <= cost) continue;
      routes.set(t.id, { cost, path: [...prev.path, t.id] });
      pending.push(t.id);
    }
  }
  return routes;
}
export function visiblePathDestination(s: State, u: Unit, path: string[]): string | null {
  let spent = 0,
    to = u.tile;
  for (const id of path) {
    if (!isVisible(s, u.owner, id)) break;
    spent += movementCost(s, u, tileAt(s, id));
    if (spent > u.moves) break;
    to = id;
    if (controlled(s, u, id)) break;
  }
  return to === u.tile ? null : to;
}
/** Scout across the public map center from home, then survey all directions.
 * Map coordinates/bounds are public; no hidden starting positions or seed decoding. */
export function explorationPath(
  s: State,
  u: Unit,
  routes: Map<string, TravelRoute>
): string[] | undefined {
  const unknown = new Set(s.tiles.filter((t) => t.terrain === 'unknown').map((t) => t.id));
  if (!unknown.size) return;
  const radius = sightRange(u),
    here = tileAt(s, u.tile),
    enemies = s.units.filter((t) => t.owner !== u.owner && !t.aboard);
  const minQ = Math.min(...s.tiles.map((t) => t.q)),
    maxQ = Math.max(...s.tiles.map((t) => t.q)),
    minR = Math.min(...s.tiles.map((t) => t.r)),
    maxR = Math.max(...s.tiles.map((t) => t.r));
  const center = { q: (minQ + maxQ) / 2, r: (minR + maxR) / 2 };
  const home = tileAt(s, s.cities.find((c) => c.owner === u.owner)?.tile ?? u.tile),
    scale = Math.max(1, distance(home, center));
  const heading = { q: (center.q - home.q) / scale, r: (center.r - home.r) / scale },
    forwardWeight = s.round <= 16 ? 1.2 : 0.2;
  let best = -Infinity,
    path: string[] | undefined;
  for (const [id, route] of routes) {
    if (!route.path.length || !visiblePathDestination(s, u, route.path)) continue;
    const t = tileAt(s, id);
    let gain = 0;
    for (let q = t.q - radius; q <= t.q + radius; q++)
      for (let r = t.r - radius; r <= t.r + radius; r++) if (unknown.has(`${q},${r}`)) gain++;
    if (!gain) continue;
    const danger = enemies.reduce(
      (n, e) => n + (distance(t, tileAt(s, e.tile)) <= UNITS[e.type].range + 1 ? 1 : 0),
      0
    );
    const forward = (t.q - here.q) * heading.q + (t.r - here.r) * heading.r;
    const score =
      gain / (route.cost + 2) +
      forward * forwardWeight +
      (distance(here, center) - distance(t, center)) * 0.25 -
      route.cost * 0.12 -
      danger * (u.type === 'scout' ? 10 : 3);
    if (score > best) {
      best = score;
      path = route.path;
    }
  }
  return path;
}
