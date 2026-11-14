import {
  canOccupy,
  cargo,
  cargoUsed,
  type City,
  cityAt,
  cityShot,
  type Command,
  distance,
  hasBuilding,
  hasTech,
  improvementReason,
  isShip,
  neighbors,
  passable,
  previewAttack,
  reachable,
  restReason,
  type State,
  statsFor,
  tileAt,
  type Unit,
  unitAt,
  UNITS,
} from '../game/engine';
import { isVisible } from '../game/visibility';
import {
  explorationPath,
  explorationRoutes,
  type TravelRoute,
  visiblePathDestination,
} from './exploration';

const landingInfantry = (u: Unit) => UNITS[u.type].capture && u.type !== 'scout';
const dist = (s: State, a: string, b: string) => distance(tileAt(s, a), tileAt(s, b));
export function landRegions(s: State): Map<string, string> {
  const regions = new Map<string, string>();
  for (const t of s.tiles)
    if (passable(t) && !regions.has(t.id)) {
      const pending = [t.id];
      regions.set(t.id, t.id);
      while (pending.length) {
        const id = pending.pop()!;
        for (const n of neighbors(s, id))
          if (passable(n) && !regions.has(n.id)) {
            regions.set(n.id, t.id);
            pending.push(n.id);
          }
      }
    }
  return regions;
}
const coast = (s: State, c: City) =>
  neighbors(s, c.tile).some((t) => t.terrain === 'water' && !t.bridge);
function homePort(s: State, regions: Map<string, string>) {
  const combat = s.units.filter(
    (u) => u.owner === s.turn && !u.aboard && !isShip(u) && u.type !== 'scout'
  );
  // Keep a rear port while it has reinforcements to send. After the front changes
  // banks, choose a source on the army's bank instead of stranding the whole army.
  const servesFront = (c: City) =>
    combat.some((u) => regions.get(u.tile) === regions.get(c.tile)) &&
    s.cities.some(
      (t) =>
        t.owner !== s.turn && regions.has(t.tile) && regions.get(t.tile) !== regions.get(c.tile)
    );
  return s.cities
    .filter((c) => c.owner === s.turn && coast(s, c))
    .sort(
      (a, b) =>
        Number(servesFront(b)) - Number(servesFront(a)) ||
        Number(hasBuilding(b, 'port')) - Number(hasBuilding(a, 'port')) ||
        Number(b.id === `c${s.factions.indexOf(s.turn) + 1}`) -
          Number(a.id === `c${s.factions.indexOf(s.turn) + 1}`) ||
        a.id.localeCompare(b.id, undefined, { numeric: true })
    )[0];
}
export function navalDemand(s: State) {
  const regions = landRegions(s),
    home = homePort(s, regions),
    origin = home ? regions.get(home.tile) : undefined;
  const targets = home
    ? s.cities
        .filter((c) => c.owner !== s.turn && regions.has(c.tile) && regions.get(c.tile) !== origin)
        .sort(
          (a, b) =>
            dist(s, home.tile, a.tile) +
              a.fort * 0.4 -
              (dist(s, home.tile, b.tile) + b.fort * 0.4) || a.id.localeCompare(b.id)
        )
    : [];
  const own = s.units.filter((u) => u.owner === s.turn),
    capturers = own.filter(
      (u) => !u.aboard && landingInfantry(u) && regions.get(u.tile) === origin
    );
  return {
    home,
    regions,
    targets,
    needed: !!home && (s.settings.map === 'water' || targets.some((c) => coast(s, c))),
    captureShortage: capturers.length < 2,
    threatened: s.units.some((u) => u.owner !== s.turn && isShip(u) && UNITS[u.type].attack > 0),
    loaded: own.some((u) => u.type === 'transport' && cargo(s, u).length > 0),
  };
}
function seaRisk(s: State, id: string) {
  return (
    s.units
      .filter((e) => e.owner !== s.turn && !e.aboard)
      .reduce((risk, e) => {
        const d = dist(s, id, e.tile),
          range = statsFor(s, e).range;
        return risk + UNITS[e.type].attack * (d <= range ? 1 : d <= range + 2 ? 0.3 : 0);
      }, 0) +
    s.cities
      .filter((c) => c.owner && c.owner !== s.turn && isVisible(s, s.turn, c.tile))
      .reduce(
        (sum, c) =>
          sum + (dist(s, id, c.tile) <= (hasBuilding(c, 'tower') ? 3 : 2) ? cityShot(c) : 0),
        0
      )
  );
}
type Mission = { city: City; beach: string; dock: string; path: string[]; region: string };
function mission(
  s: State,
  boat: Unit,
  targets: City[],
  regions: Map<string, string>,
  routes: Map<string, TravelRoute>
): Mission | null {
  const options: { mission: Mission; score: number }[] = [];
  for (const city of targets) {
    const region = regions.get(city.tile);
    if (!region) continue;
    for (const t of s.tiles)
      if (
        regions.get(t.id) === region &&
        dist(s, t.id, city.tile) <= 4 &&
        !unitAt(s, t.id) &&
        (!cityAt(s, t.id) || cityAt(s, t.id)!.owner === s.turn)
      ) {
        for (const water of neighbors(s, t.id)) {
          if (!canOccupy(s, boat, water)) continue;
          const route = routes.get(water.id);
          if (!route) continue;
          options.push({
            mission: { city, beach: t.id, dock: water.id, path: route.path, region },
            score:
              dist(s, t.id, city.tile) * 4 +
              seaRisk(s, t.id) * 3 +
              seaRisk(s, water.id) * 2 +
              route.cost * 0.6 +
              city.fort * 0.25,
          });
        }
      }
  }
  // Compare all known targets, not just the first coastal city. A defended beach
  // must not pin every convoy while another known landing site is safe.
  options.sort(
    (a, b) =>
      a.score - b.score ||
      a.mission.city.id.localeCompare(b.mission.city.id) ||
      a.mission.beach.localeCompare(b.mission.beach)
  );
  return options[0]?.mission ?? null;
}
export type NavalPlan = { command: Command | null; reserved: Set<string> };
/** A mission is reconstructed from own ports, cargo and observed geography. It
 * never reads hidden forts/armies or stores a second world in the save. */
export function planNavy(s: State): NavalPlan {
  const own = s.units.filter((u) => u.owner === s.turn),
    ships = own.filter(isShip),
    reserved = new Set(own.filter((u) => isShip(u) || u.aboard).map((u) => u.id));
  const result = (command: Command | null): NavalPlan => ({ command, reserved });
  if (!ships.length && !own.some((u) => u.type === 'engineer' && !u.acted && !u.aboard))
    return result(null);
  const demand = navalDemand(s),
    regions = demand.regions;
  const orders: { cmd: Command; score: number; key: string }[] = [];
  const add = (cmd: Command, score: number, key: string) => orders.push({ cmd, score, key });
  for (const ship of ships)
    if (ship.hp < UNITS[ship.type].hp * 0.6 && seaRisk(s, ship.tile) === 0 && !restReason(s, ship))
      add({ type: 'rest', unit: ship.id }, 600, ship.id);
  // A narrow known water gap can be bridged, but the three-wide map channel cannot.
  for (const engineer of own.filter((u) => u.type === 'engineer' && !u.acted && !u.aboard))
    for (const t of neighbors(s, engineer.tile).filter((t) => t.terrain === 'water')) {
      const banks = neighbors(s, t.id).filter(passable),
        parts = new Set(banks.map((t) => regions.get(t.id)));
      if (
        parts.size < 2 ||
        !s.cities.some(
          (c) => c.owner !== s.turn && banks.some((b) => regions.get(b.id) === regions.get(c.tile))
        )
      )
        continue;
      const cmd: Command = {
        type: 'improve',
        unit: engineer.id,
        tile: t.id,
        improvement: 'bridge',
      };
      if (!improvementReason(s, cmd)) add(cmd, 180, engineer.id);
    }
  if (!ships.length) {
    orders.sort((a, b) => b.score - a.score);
    return result(orders[0]?.cmd ?? null);
  }
  const transports = ships.filter((u) => u.type === 'transport'),
    routeCache = new Map<string, Map<string, TravelRoute>>(),
    assignedEscorts = new Set<string>();
  const routes = (ship: Unit) => {
    let r = routeCache.get(ship.id);
    if (!r) {
      r = explorationRoutes(s, ship);
      routeCache.set(ship.id, r);
    }
    return r;
  };
  const attacks = [
    ...new Set([
      ...s.units.filter((u) => u.owner !== s.turn && !u.aboard).map((u) => u.tile),
      ...s.cities.filter((c) => c.owner !== s.turn).map((c) => c.tile),
    ]),
  ];
  for (const ship of ships.filter((u) => !u.acted && UNITS[u.type].attack > 0))
    for (const to of attacks) {
      const p = previewAttack(s, ship, to);
      if (!p.legal || p.attackerHP <= 0) continue;
      const defender = unitAt(s, to),
        protect = transports.some((b) => cargo(s, b).length && dist(s, b.tile, to) <= 3);
      add(
        { type: 'attack', unit: ship.id, to },
        300 +
          p.damage * 5 +
          (p.defenderHP === 0 ? 80 : 0) +
          (protect ? 100 : 0) +
          (protect && defender && isShip(defender) ? 200 : 0) +
          (defender?.type === 'transport' ? 35 : 0),
        `${ship.id}:${to}`
      );
    }
  for (const boat of transports) {
    const passengers = cargo(s, boat),
      hasCapture = passengers.some((u) => landingInfantry(u)),
      origin = demand.home ? regions.get(demand.home.tile) : undefined;
    const destinations = demand.targets.length
      ? demand.targets
      : passengers.length
        ? s.cities
            .filter((c) => c.owner === s.turn)
            .sort((a, b) => dist(s, boat.tile, a.tile) - dist(s, boat.tile, b.tile))
        : [];
    let job = mission(s, boat, destinations, regions, routes(boat));
    // Empty boats return to their original port; never pick up the landing party again.
    const boardingShore = neighbors(s, boat.tile).some(
      (t) => passable(t) && regions.get(t.id) === origin
    );
    let returning =
      !passengers.length &&
      demand.home &&
      (dist(s, boat.tile, demand.home.tile) > 2 || !boardingShore);
    const strandedSupport =
      passengers.length &&
      !hasCapture &&
      job &&
      job.city.owner !== s.turn &&
      !own.some(
        (u) => !u.aboard && !isShip(u) && landingInfantry(u) && regions.get(u.tile) === job!.region
      );
    if (strandedSupport && demand.home) returning = true;
    if (returning) job = mission(s, boat, [demand.home!], regions, routes(boat));
    if (!job) {
      if (!boat.acted) add({ type: 'wait', unit: boat.id }, -5, boat.id);
      continue;
    }
    // Repair a bad cargo mix at home before departing; reserve space for a capturer.
    const shoreParty = own.some(
      (u) => !u.aboard && !isShip(u) && landingInfantry(u) && regions.get(u.tile) === job!.region
    );
    const unloading = hasCapture || job.city.owner === s.turn || shoreParty;
    if (unloading)
      for (const p of passengers.filter((p) => !p.acted)) {
        const beach = neighbors(s, boat.tile)
          .filter(
            (t) =>
              isVisible(s, s.turn, t.id) &&
              regions.get(t.id) === job.region &&
              passable(t) &&
              !unitAt(s, t.id) &&
              (!cityAt(s, t.id) || cityAt(s, t.id)!.owner === s.turn)
          )
          .sort(
            (a, b) =>
              seaRisk(s, a.id) - seaRisk(s, b.id) ||
              dist(s, a.id, job.city.tile) - dist(s, b.id, job.city.tile) ||
              a.id.localeCompare(b.id)
          )[0];
        if (
          beach &&
          (seaRisk(s, beach.id) < p.hp * 0.7 ||
            own.some((u) => !isShip(u) && !u.aboard && dist(s, u.tile, beach.id) <= 2))
        )
          add(
            { type: 'land', unit: p.id, to: beach.id },
            500 + (landingInfantry(p) ? 20 : 0),
            p.id
          );
      }
    const atHome = demand.home && dist(s, boat.tile, demand.home.tile) <= 2;
    const candidates = own.filter(
      (u) =>
        !u.aboard && !isShip(u) && u.hp >= UNITS[u.type].hp * 0.5 && regions.get(u.tile) === origin
    );
    const capacity = 6 - cargoUsed(s, boat);
    const crew = candidates
      .filter((u) => UNITS[u.type].weight <= capacity)
      .sort(
        (a, b) =>
          Number(landingInfantry(b) && !hasCapture && !shoreParty) -
            Number(landingInfantry(a) && !hasCapture && !shoreParty) ||
          Number(UNITS[b.type].class === 'siege' && job!.city.fort > 0) -
            Number(UNITS[a.type].class === 'siege' && job!.city.fort > 0) ||
          dist(s, a.tile, boat.tile) - dist(s, b.tile, boat.tile) ||
          a.id.localeCompare(b.id)
      );
    const recruit =
      !returning && (!passengers.length || (atHome && passengers.length < 2))
        ? crew.find((u) => hasCapture || shoreParty || landingInfantry(u))
        : undefined;
    if (recruit) {
      reserved.add(recruit.id);
      if (!recruit.acted) {
        if (recruit.deployed && hasTech(s, s.turn, 'siege_logistics'))
          add({ type: 'stance', unit: recruit.id, stance: 'pack' }, 230, recruit.id);
        else if (recruit.moves > 0 && dist(s, recruit.tile, boat.tile) <= 1)
          add({ type: 'board', unit: recruit.id, ship: boat.id }, 250, recruit.id);
        else if (recruit.moves > 0) {
          const goals = [...explorationRoutes(s, recruit)]
            .filter(([id]) => dist(s, id, boat.tile) <= 1)
            .sort((a, b) => a[1].cost - b[1].cost);
          const dest = goals[0] ? visiblePathDestination(s, recruit, goals[0][1].path) : null;
          if (dest) add({ type: 'move', unit: recruit.id, to: dest }, 190, recruit.id);
        }
      }
    }
    if (passengers.length && !hasCapture && !shoreParty) {
      // A full load of support/siege cannot take a village. Unload on a safe friendly shore.
      for (const p of passengers.filter((u) => !u.acted)) {
        const homeBeach = neighbors(s, boat.tile).find(
          (t) =>
            regions.get(t.id) === origin &&
            passable(t) &&
            isVisible(s, s.turn, t.id) &&
            !unitAt(s, t.id) &&
            (!cityAt(s, t.id) || cityAt(s, t.id)!.owner === s.turn)
        );
        if (homeBeach) add({ type: 'land', unit: p.id, to: homeBeach.id }, 240, p.id);
      }
    }
    if (
      !returning &&
      (!passengers.length || (!hasCapture && !shoreParty && job.city.owner !== s.turn))
    ) {
      if (!boat.acted) add({ type: 'wait', unit: boat.id }, -5, boat.id);
      continue;
    }
    const step = !boat.acted ? visiblePathDestination(s, boat, job.path) : null,
      planned = step ?? boat.tile;
    const guard = ships
      .filter((u) => u.type !== 'transport' && !assignedEscorts.has(u.id))
      .sort(
        (a, b) =>
          Number(b.type !== 'scout_ship') - Number(a.type !== 'scout_ship') ||
          dist(s, a.tile, boat.tile) - dist(s, b.tile, boat.tile) ||
          a.id.localeCompare(b.id)
      )[0];
    if (guard) {
      assignedEscorts.add(guard.id);
      if (!guard.acted && guard.moves > 0) {
        const blocked = new Set(job.path.slice(0, boat.moves));
        const positions = [...reachable(s, guard)].filter(
          ([id, r]) => r.path.length && !blocked.has(id)
        );
        const value = (id: string) =>
          dist(s, id, planned) * 5 + dist(s, id, job.dock) + seaRisk(s, id) * 0.2;
        positions.sort((a, b) => value(a[0]) - value(b[0]) || a[0].localeCompare(b[0]));
        // Use a charted route when the escort is far away: a bay may require moving
        // away from the transport before coming back around the shoreline.
        const rendezvous =
          dist(s, guard.tile, planned) > 2
            ? [...routes(guard)]
                .filter(([id]) => dist(s, id, planned) <= 2 && !blocked.has(id))
                .sort((a, b) => a[1].cost - b[1].cost || value(a[0]) - value(b[0]))[0]
            : undefined;
        const detour = rendezvous ? visiblePathDestination(s, guard, rendezvous[1].path) : null;
        if (detour && !blocked.has(detour))
          add(
            { type: 'move', unit: guard.id, to: detour },
            passengers.length ? 450 : 210,
            guard.id
          );
        else if (
          positions[0] &&
          (dist(s, guard.tile, planned) > 2 ||
            blocked.has(guard.tile) ||
            value(positions[0][0]) + 1 < value(guard.tile))
        )
          add(
            { type: 'move', unit: guard.id, to: positions[0][0] },
            passengers.length ? 450 : 210,
            guard.id
          );
      }
    }
    if (step) {
      const cover = guard && dist(s, guard.tile, step) <= 2 ? UNITS[guard.type].attack * 0.8 : 0;
      // An escorted healthy hull can weather limited shore fire; demanding zero
      // residual risk makes any single coastal archer block an invasion forever.
      if (
        seaRisk(s, step) <= cover + (guard ? boat.hp * 0.35 : 0) &&
        (!guard || dist(s, guard.tile, step) <= 2 || (returning && seaRisk(s, step) === 0))
      )
        add({ type: 'move', unit: boat.id, to: step }, 170, boat.id);
      else if (seaRisk(s, boat.tile) > 0) {
        const safer = [...reachable(s, boat)]
          .filter(([, r]) => r.path.length)
          .sort((a, b) => seaRisk(s, a[0]) - seaRisk(s, b[0]));
        if (safer[0] && seaRisk(s, safer[0][0]) < seaRisk(s, boat.tile))
          add({ type: 'move', unit: boat.id, to: safer[0][0] }, 260, boat.id);
      }
    }
    if (!boat.acted) add({ type: 'wait', unit: boat.id }, -5, boat.id);
  }
  for (const ship of ships.filter((u) => u.type !== 'transport' && !u.acted)) {
    if (assignedEscorts.has(ship.id)) {
      add({ type: 'wait', unit: ship.id }, -6, ship.id);
      continue;
    }
    const enemies = s.units.filter((e) => e.owner !== s.turn && !e.aboard && isShip(e));
    const goals = [...routes(ship)]
      .filter(
        ([id, r]) =>
          r.path.length && enemies.some((e) => dist(s, id, e.tile) <= UNITS[ship.type].range)
      )
      .sort((a, b) => a[1].cost - b[1].cost);
    const path = goals[0]?.[1].path ?? explorationPath(s, ship, routes(ship));
    const to = path ? visiblePathDestination(s, ship, path) : null;
    if (to) add({ type: 'move', unit: ship.id, to }, 100, ship.id);
    else add({ type: 'wait', unit: ship.id }, -6, ship.id);
  }
  orders.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return result(orders[0]?.cmd ?? null);
}
