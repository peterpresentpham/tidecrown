import {
  cityShot,
  type Command,
  distance,
  execute,
  hasBuilding,
  hasTech,
  isShip,
  isSiege,
  maxFort,
  previewAttack,
  reachable,
  restReason,
  type State,
  statsFor,
  tileAt,
  type Unit,
  UNITS,
} from '../game/engine';
import { isVisible } from '../game/visibility';
import { explorationRoutes, visiblePathDestination } from './exploration';

export type ArmyIntent = {
  kind: 'defend' | 'fight' | 'siege' | 'expand';
  tile: string;
  city?: string;
};
export const frontline = (u: Unit) =>
  !u.aboard && !isShip(u) && UNITS[u.type].capture && u.type !== 'scout';
const ground = (s: State, reserved?: ReadonlySet<string>) =>
  s.units.filter(
    (u) =>
      u.owner === s.turn && !u.aboard && !isShip(u) && u.type !== 'scout' && !reserved?.has(u.id)
  );
const foes = (s: State) => s.units.filter((u) => u.owner !== s.turn && !u.aboard);
const dist = (s: State, a: string, b: string) => distance(tileAt(s, a), tileAt(s, b));
/** EndTurn, rather than Wait, is how an idle unit actually rests under engine rules. */
export function restingInTown(s: State, u: Unit): boolean {
  return (
    !u.aboard &&
    !u.activeLastTurn &&
    u.hp < UNITS[u.type].hp &&
    s.cities.some((c) => c.owner === u.owner && c.tile === u.tile) &&
    !foes(s).some((e) => dist(s, u.tile, e.tile) <= Math.max(3, statsFor(s, e).range + 1))
  );
}

/** Stable city anchors keep the objective unchanged as individual units move.
 * Only a visible threat, capture, or a different known strategic target changes it. */
export function armyIntent(s: State, reserved?: ReadonlySet<string>): ArmyIntent | null {
  const own = ground(s, reserved),
    cities = s.cities.filter((c) => c.owner === s.turn),
    enemies = foes(s);
  const threats = cities
    .flatMap((c) =>
      enemies
        .filter(
          (e) => !isShip(e) && dist(s, c.tile, e.tile) <= 3 && (e.type !== 'scout' || c.fort === 0)
        )
        .map((e) => ({
          c,
          e,
          score: dist(s, c.tile, e.tile) * 3 + c.fort * 0.1 - UNITS[e.type].attack,
        }))
    )
    .sort(
      (a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id) || a.e.id.localeCompare(b.e.id)
    );
  // A mature siege group must not orbit an undefended frontier town forever.
  // Keep defending the last city and fortified homes; commit the main force to a known fort otherwise.
  const siegeGroup = own.filter(isSiege),
    committed = own.filter(frontline).length >= 3 && siegeGroup.length >= 2;
  const urgent = threats.find((t) => !committed || cities.length === 1 || t.c.fort > 0);
  if (urgent) return { kind: 'defend', tile: urgent.e.tile, city: urgent.c.id };
  if (committed) {
    const fort = s.cities
      .filter((c) => c.owner && c.owner !== s.turn && c.fort > 0)
      .sort(
        (a, b) =>
          Math.min(...siegeGroup.map((u) => dist(s, u.tile, a.tile))) -
            Math.min(...siegeGroup.map((u) => dist(s, u.tile, b.tile))) || a.id.localeCompare(b.id)
      )[0];
    if (fort) return { kind: 'siege', tile: fort.tile, city: fort.id };
  }
  const close = enemies
    .filter(
      (e) =>
        own.some((u) => dist(s, u.tile, e.tile) <= 4) &&
        !s.cities.some((c) => c.owner && c.owner !== s.turn && dist(s, c.tile, e.tile) <= 3)
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (close[0]) return { kind: 'fight', tile: close[0].tile };
  const fromHome = (id: string) => Math.min(...cities.map((c) => dist(s, c.tile, id)), 99);
  const neutral = s.cities
    .filter((c) => c.owner === null)
    .sort((a, b) => fromHome(a.tile) - fromHome(b.tile) || a.id.localeCompare(b.id));
  const hostile = s.cities
    .filter((c) => c.owner && c.owner !== s.turn)
    .sort((a, b) => fromHome(a.tile) - fromHome(b.tile) || a.id.localeCompare(b.id));
  const fort = hostile[0],
    village = neutral[0],
    ready = own.filter(frontline).length >= 2 || own.some(isSiege);
  if (
    fort &&
    (ready || !village) &&
    (s.settings.difficulty === 'hard' ||
      !village ||
      fromHome(fort.tile) <= fromHome(village.tile) + 4)
  )
    return { kind: 'siege', tile: fort.tile, city: fort.id };
  if (village) return { kind: 'expand', tile: village.tile, city: village.id };
  if (fort) return { kind: 'siege', tile: fort.tile, city: fort.id };
  return null;
}
/** Risk is a positioning heuristic, not an alternative combat rules engine. */
export function positionRisk(s: State, u: Unit, id: string): number {
  const enemies = foes(s),
    nearby = enemies.filter((e) => dist(s, id, e.tile) <= 4);
  const pressure = nearby.reduce(
    (sum, e) => sum + (UNITS[e.type].attack * e.hp) / UNITS[e.type].hp,
    0
  );
  const support = s.units
    .filter(
      (a) =>
        a.owner === u.owner && !a.aboard && a.id !== u.id && !isShip(a) && dist(s, a.tile, id) <= 3
    )
    .reduce((sum, a) => sum + (UNITS[a.type].attack * a.hp) / UNITS[a.type].hp, 0);
  const advantage = pressure > 0 ? Math.max(0.4, Math.min(1, pressure / Math.max(1, support))) : 1;
  const cityPressure = s.cities
    .filter(
      (c) => c.owner && c.owner !== u.owner && isVisible(s, u.owner, c.tile) && cityShot(c) > 0
    )
    .reduce((sum, c) => {
      const d = dist(s, id, c.tile),
        range = hasBuilding(c, 'tower') ? 3 : 2;
      return (
        sum +
        (d <= range ? Math.max(1, cityShot(c) - UNITS[u.type].armor) : d === range + 1 ? 0.5 : 0)
      );
    }, 0);
  return (
    cityPressure +
    advantage *
      enemies.reduce((total, e) => {
        const d = dist(s, id, e.tile),
          range = statsFor(s, e).range,
          attack = UNITS[e.type].attack;
        const proximity =
          d <= range
            ? 1
            : d <= range + 1
              ? 0.45
              : d <= range + Math.min(2, UNITS[e.type].moves)
                ? 0.12
                : 0;
        const counter =
          UNITS[u.type].class === 'cavalry' && ['spear', 'pikeman'].includes(e.type) ? 5 : 0;
        return total + (attack + counter) * proximity;
      }, 0)
  );
}
export function nextArmyCommand(s: State, reserved?: ReadonlySet<string>): Command | null {
  const own = ground(s, reserved),
    enemies = foes(s),
    intent = armyIntent(s, reserved);
  if (!own.length || (!intent && !enemies.length && !own.some((u) => u.hp < UNITS[u.type].hp)))
    return null;
  const fronts = own.filter(frontline),
    machines = own.filter(isSiege),
    cities = s.cities.filter((c) => c.owner === s.turn);
  const candidates: { cmd: Command; score: number; key: string }[] = [];
  const add = (cmd: Command, score: number, key: string) => candidates.push({ cmd, score, key });
  const targets = [
    ...new Set([
      ...enemies.map((e) => e.tile),
      ...s.cities.filter((c) => c.owner !== s.turn).map((c) => c.tile),
    ]),
  ];
  const escort = new Map<string, string>();
  for (const machine of machines) {
    const guard = [...fronts].sort(
      (a, b) =>
        dist(s, a.tile, machine.tile) - dist(s, b.tile, machine.tile) || a.id.localeCompare(b.id)
    )[0];
    if (guard) escort.set(guard.id, machine.id);
  }
  for (const u of own) {
    if (u.acted && !(UNITS[u.type].mobileShot && u.moves > 0)) continue;
    const wounded = u.hp <= UNITS[u.type].hp * 0.35,
      riskHere = positionRisk(s, u, u.tile);
    if (riskHere === 0 && !restReason(s, u))
      add({ type: 'rest', unit: u.id }, u.hp <= UNITS[u.type].hp * 0.5 ? 570 : 120, u.id);
    const options = reachable(s, u),
      supporter = own.filter(
        (a) =>
          a.id !== u.id &&
          (u.type === 'engineer' ? isSiege(a) : !isSiege(a)) &&
          a.hp < UNITS[a.type].hp
      );
    if (!u.acted && (u.type === 'paladin' || u.type === 'engineer')) {
      const damaged = [
        ...supporter.map((a) => ({
          tile: a.tile,
          need: UNITS[a.type].hp - a.hp,
          ratio: a.hp / UNITS[a.type].hp,
        })),
        ...(u.type === 'engineer'
          ? cities
              .filter((c) => c.fort < maxFort(c))
              .map((c) => ({ tile: c.tile, need: maxFort(c) - c.fort, ratio: c.fort / maxFort(c) }))
          : []),
      ];
      for (const t of damaged.filter((t) => dist(s, u.tile, t.tile) <= 1)) {
        const cmd: Command = { type: 'support', unit: u.id, to: t.tile };
        if (!execute(s, cmd).error)
          add(cmd, 460 + (1 - t.ratio) * 80 + Math.min(t.need, 5), `${u.id}:${t.tile}`);
      }
    }
    if (!u.acted)
      for (const to of targets) {
        const p = previewAttack(s, u, to);
        if (!p.legal) continue;
        const defender = enemies.find((e) => e.tile === to),
          kill = defender && p.defenderHP === 0;
        // Winning a capture is always useful. Other attacks must leave the attacker alive.
        if (!p.capture && p.attackerHP <= 0) continue;
        if (wounded && !p.capture && !kill && riskHere > 0) continue;
        const focus = defender
          ? (UNITS[defender.type].hp - defender.hp) * 2 +
            own.filter((a) => !a.acted && a.id !== u.id && previewAttack(s, a, to).legal).length * 4
          : 0;
        const score = p.capture
          ? 1000 + (s.cities.find((c) => c.tile === to)?.owner ? 100 : 0)
          : 300 +
            (kill ? 100 : 0) +
            p.damage * 5 +
            p.fortDamage * (intent?.kind === 'siege' ? 8 : 3) -
            p.retaliation * 6 +
            focus +
            (UNITS[u.type].range > 1 ? 25 : 0) +
            (defender &&
            ['spear', 'pikeman'].includes(u.type) &&
            UNITS[defender.type].class === 'cavalry'
              ? 35
              : 0);
        if (
          u.type === 'crossbow' &&
          hasTech(s, u.owner, 'marksman') &&
          !u.moved &&
          u.stance !== 'aim' &&
          previewAttack(s, { ...u, stance: 'aim' }, to).damage > p.damage
        )
          add({ type: 'stance', unit: u.id, stance: 'aim' }, score + 1, `${u.id}:${to}`);
        else add({ type: 'attack', unit: u.id, to }, score, `${u.id}:${to}`);
      }
    const retreat =
      (wounded && (riskHere > 0 || cities.length > 0)) ||
      (u.acted && UNITS[u.type].mobileShot && riskHere > Math.max(2, u.hp * 0.45));
    if (retreat) {
      const refuge = (id: string) =>
        Math.min(
          ...cities.map((c) => dist(s, id, c.tile)),
          ...own
            .filter((a) => a.type === 'paladin' && a.id !== u.id)
            .map((a) => dist(s, id, a.tile)),
          99
        );
      const ranked = [...options]
        .filter(([, r]) => r.path.length)
        .map(([id]) => ({
          id,
          risk: positionRisk(s, u, id),
          score: positionRisk(s, u, id) * 8 + refuge(id),
        }))
        .filter((t) => t.risk < riskHere || (t.risk <= riskHere && refuge(t.id) < refuge(u.tile)))
        .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
      if (ranked[0]) add({ type: 'move', unit: u.id, to: ranked[0].id }, wounded ? 560 : 250, u.id);
      if (!u.acted) add({ type: 'wait', unit: u.id }, 1, u.id);
      continue;
    }
    if (u.acted) continue;
    if (!intent) {
      if (wounded && cities.some((c) => dist(s, u.tile, c.tile) <= 2))
        add({ type: 'wait', unit: u.id }, 0, u.id);
      continue;
    }
    const focus = intent.tile,
      range = statsFor(s, u).range,
      front = fronts.filter((a) => a.id !== u.id);
    if (isSiege(u)) {
      const inRange =
          isVisible(s, s.turn, focus) &&
          dist(s, u.tile, focus) <= range + (u.type === 'trebuchet' ? 0 : 1),
        protectedNow = !front.length || front.some((f) => dist(s, f.tile, u.tile) <= 2);
      if (
        !u.deployed &&
        inRange &&
        protectedNow &&
        !u.moved &&
        hasTech(s, s.turn, 'siege_logistics')
      )
        add({ type: 'stance', unit: u.id, stance: 'deploy' }, 180, u.id);
      const canFire = targets.some((to) => previewAttack(s, u, to).legal),
        idle = s.round - (u.lastFiredRound ?? u.deployedRound ?? s.round - 2);
      if (u.deployed && ((!canFire && idle >= 2) || positionRisk(s, u, u.tile) > UNITS[u.type].hp))
        add({ type: 'stance', unit: u.id, stance: 'pack' }, 150, u.id);
    }
    if (u.moves > 0 && !u.deployed) {
      const escortMachine = machines.find((m) => m.id === escort.get(u.id));
      const desiredSupport =
        u.type === 'engineer'
          ? machines.find((m) => m.hp < UNITS[m.type].hp)
          : u.type === 'paladin'
            ? own.find((a) => a.id !== u.id && a.hp < UNITS[a.type].hp && !isSiege(a))
            : undefined;
      const backline = isSiege(u) || UNITS[u.type].range > 1 || u.type === 'engineer';
      const flank =
        UNITS[u.type].class === 'cavalry' && u.type !== 'paladin'
          ? enemies
              .filter((e) => UNITS[e.type].range > 1 && !isShip(e) && dist(s, u.tile, e.tile) <= 6)
              .sort((a, b) => dist(s, u.tile, a.tile) - dist(s, u.tile, b.tile) || a.hp - b.hp)[0]
          : undefined;
      const target = desiredSupport?.tile ?? flank?.tile ?? focus;
      const value = (id: string) => {
        const d = dist(s, id, target),
          risk = positionRisk(s, u, id),
          ideal = desiredSupport ? 1 : backline ? Math.max(2, range) : 1;
        let score = -Math.abs(d - ideal) * 9 - risk * (backline ? 3 : 1);
        if (intent.kind === 'expand' && !frontline(u)) score -= 8;
        if (backline && front.length) {
          const gap = Math.min(...front.map((f) => dist(s, id, f.tile)));
          score -= Math.max(0, gap - 2) * 14;
          if (
            front.some(
              (f) => dist(s, id, f.tile) <= 2 && dist(s, f.tile, focus) < dist(s, id, focus)
            )
          )
            score += 12;
          else if (
            enemies.length &&
            Math.min(...front.map((f) => dist(s, f.tile, focus))) > dist(s, id, focus)
          )
            score -= 35;
        }
        if (escortMachine) {
          const gap = dist(s, id, escortMachine.tile);
          score -= Math.max(0, gap - 2) * 25;
        }
        if (
          UNITS[u.type].range > 1 &&
          !isSiege(u) &&
          targets.some((to) => previewAttack(s, { ...u, tile: id, moved: true }, to).legal)
        )
          score += 18;
        if (
          u.type === 'pikeman' &&
          enemies.some((e) => UNITS[e.type].class === 'cavalry' && dist(s, id, e.tile) <= 2)
        )
          score += 10;
        return score;
      };
      const baseline = value(u.tile);
      let choices = [...options]
        .filter(([, r]) => r.path.length)
        .map(([id, route]) => ({ id, route, gain: value(id) - baseline }));
      // Keep a fragile weapon within escort distance when advancing into contact.
      if (isSiege(u) && front.length)
        choices = choices.filter(
          (t) =>
            dist(s, t.id, focus) >= dist(s, u.tile, focus) ||
            front.some((f) => dist(s, f.tile, t.id) <= 2)
        );
      choices.sort(
        (a, b) => b.gain - a.gain || a.route.cost - b.route.cost || a.id.localeCompare(b.id)
      );
      let to = choices[0]?.gain > 0.5 ? choices[0].id : null;
      // Outside the engagement area, charted navigation avoids local minima/obstacles.
      if (!to && dist(s, u.tile, target) > Math.max(1, range) && riskHere < UNITS[u.type].hp) {
        const routes = explorationRoutes(s, u),
          goals = [...routes]
            .filter(([, r]) => r.path.length)
            .sort((a, b) => dist(s, a[0], target) - dist(s, b[0], target) || a[1].cost - b[1].cost);
        const route = goals.find(([id]) => dist(s, id, target) < dist(s, u.tile, target));
        if (route) {
          const dest = visiblePathDestination(s, u, route[1].path);
          if (
            dest &&
            positionRisk(s, u, dest) <= Math.max(riskHere, UNITS[u.type].hp * 0.55) &&
            (!isSiege(u) || !front.length || front.some((f) => dist(s, f.tile, dest) <= 2)) &&
            (!escortMachine || dist(s, dest, escortMachine.tile) <= 2)
          )
            to = dest;
        }
      }
      if (to)
        add(
          { type: 'move', unit: u.id, to },
          80 +
            (frontline(u) ? 10 : 0) +
            (intent.kind === 'defend' ? 20 : 0) +
            Math.min(choices[0]?.gain ?? 0, 20),
          u.id
        );
    }
    if (
      u.type === 'shield' &&
      enemies.some((e) => UNITS[e.type].range > 1 && dist(s, u.tile, e.tile) <= 3)
    )
      add({ type: 'stance', unit: u.id, stance: 'guard' }, 75, u.id);
    if (
      u.type === 'pikeman' &&
      enemies.some((e) => UNITS[e.type].class === 'cavalry' && dist(s, u.tile, e.tile) <= 3)
    )
      add({ type: 'stance', unit: u.id, stance: 'brace' }, 140, u.id);
    add({ type: 'wait', unit: u.id }, 0, u.id);
  }
  candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return candidates[0]?.cmd ?? null;
}
