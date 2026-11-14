import { UNIT_UPGRADES } from '../data/units';
import {
  type Command,
  distance,
  execute,
  hasTech,
  improvementReason,
  isSiege,
  previewAttack,
  type State,
  tileAt,
  UNITS,
} from '../game/engine';
import { isVisible, observe } from '../game/visibility';
import { nextDevelopmentCommand } from './development';
import { explorationPath, explorationRoutes, visiblePathDestination } from './exploration';
import { planNavy } from './naval';
import { nextArmyCommand, restingInTown } from './tactics';
export function nextAICommand(raw: State): Command {
  if (raw.turn === 'player' || raw.winner) return { type: 'end' };
  return nextFactionCommand(raw);
}
/** Same observed rules for an offline benchmark controller; UI still uses nextAICommand. */
export function nextFactionCommand(raw: State): Command {
  if (raw.winner) return { type: 'end' };
  return plan(observe(raw, raw.turn));
}
function plan(s: State): Command {
  const owner = s.turn,
    own = s.units.filter((u) => u.owner === owner),
    cities = s.cities.filter((c) => c.owner === owner && !c.stability && c.job?.type !== 'found');
  // Upgrade healthy equipment at home before consuming its action on another
  // march; preserve scouts/roles and never perform an expensive refit in contact.
  for (const u of own.filter(
    (u) => !u.acted && !u.aboard && u.type !== 'scout' && u.hp >= UNITS[u.type].hp * 0.7
  )) {
    if (!cities.some((c) => distance(tileAt(s, c.tile), tileAt(s, u.tile)) <= 1)) continue;
    if (
      s.units.some(
        (e) => e.owner !== owner && !e.aboard && distance(tileAt(s, e.tile), tileAt(s, u.tile)) <= 4
      )
    )
      continue;
    for (const type of [...(UNIT_UPGRADES[u.type] ?? [])].reverse()) {
      const cmd: Command = { type: 'upgradeUnit', unit: u.id, unitType: type };
      if (!execute(s, cmd).error) return cmd;
    }
  }
  const navy = planNavy(s);
  if (navy.command) return navy.command;
  const tactical = nextArmyCommand(s, navy.reserved);
  if (tactical) return tactical;
  const legal = (cmd: Command) => !execute(s, cmd).error;
  const targets = [
    ...s.units.filter((u) => u.owner !== owner && !u.aboard).map((u) => u.tile),
    ...s.cities.filter((c) => c.owner !== owner).map((c) => c.tile),
  ];
  for (const u of own.filter(
    (u) =>
      !navy.reserved.has(u.id) &&
      !restingInTown(s, u) &&
      (!u.acted || (UNITS[u.type].mobileShot && u.moves > 0))
  )) {
    // Tactical planner already evaluated withdrawal; do not force every mobile archer to abandon its screen.
    if (u.acted) continue;
    if (u.type === 'paladin' || u.type === 'engineer')
      for (const id of [
        ...own.filter((e) => e.hp < UNITS[e.type].hp).map((e) => e.tile),
        ...cities.filter((c) => c.fort < 20).map((c) => c.tile),
      ]) {
        const c: Command = { type: 'support', unit: u.id, to: id };
        if (legal(c)) return c;
      }
    const scouting = u.type === 'scout' || u.type === 'scout_ship';
    const attacks = [...new Set(targets)]
      .map((id) => ({ id, p: previewAttack(s, u, id) }))
      .filter(
        (a) =>
          a.p.legal && (!scouting || a.p.capture || (a.p.defenderHP === 0 && a.p.retaliation === 0))
      )
      .sort(
        (a, b) =>
          Number(b.p.capture) * 100 +
          b.p.damage +
          b.p.fortDamage -
          b.p.retaliation -
          (Number(a.p.capture) * 100 + a.p.damage + a.p.fortDamage - a.p.retaliation)
      );
    if (attacks.length) {
      if (u.type === 'crossbow' && hasTech(s, owner, 'marksman') && !u.moved && u.stance !== 'aim')
        return { type: 'stance', unit: u.id, stance: 'aim' };
      return { type: 'attack', unit: u.id, to: attacks[0].id };
    }
    if (isSiege(u)) {
      const near = targets.some(
        (id) =>
          isVisible(s, owner, id) &&
          distance(tileAt(s, u.tile), tileAt(s, id)) <= UNITS[u.type].range + 1
      );
      if (!u.deployed && near && hasTech(s, owner, 'siege_logistics'))
        return { type: 'stance', unit: u.id, stance: 'deploy' };
      if (u.deployed) return { type: 'stance', unit: u.id, stance: 'pack' };
    }
    if (u.type === 'engineer')
      for (const t of s.tiles.filter(
        (t) => t.terrain === 'water' && distance(tileAt(s, u.tile), t) <= 1
      )) {
        const c: Command = { type: 'improve', unit: u.id, tile: t.id, improvement: 'bridge' };
        if (!improvementReason(s, c)) return c;
      }
    if (u.moves <= 0) return { type: 'wait', unit: u.id };
    // Scouts capture empty villages and survey; they do not get stuck chipping walls.
    const movementTargets = scouting
      ? s.cities
          .filter(
            (c) =>
              c.owner !== owner &&
              c.fort === 0 &&
              !s.units.some((e) => !e.aboard && e.tile === c.tile && e.owner !== owner)
          )
          .map((c) => c.tile)
      : targets;
    const routes = explorationRoutes(s, u),
      goals = [...routes]
        .filter(([, r]) => r.path.length)
        .map(([id, route]) => ({
          id,
          route,
          target: movementTargets.find(
            (target) => distance(tileAt(s, id), tileAt(s, target)) <= UNITS[u.type].range
          ),
        }))
        .filter((g) => g.target && (!scouting || g.route.cost <= u.moves));
    goals.sort(
      (a, b) =>
        a.route.cost - b.route.cost ||
        distance(tileAt(s, a.id), { q: 0, r: 0 }) - distance(tileAt(s, b.id), { q: 0, r: 0 })
    );
    const path = goals[0]?.route.path ?? explorationPath(s, u, routes);
    if (path) {
      const to = visiblePathDestination(s, u, path);
      if (to) return { type: 'move', unit: u.id, to };
    }
    if (u.type === 'shield') return { type: 'stance', unit: u.id, stance: 'guard' };
    if (u.type === 'pikeman') return { type: 'stance', unit: u.id, stance: 'brace' };
    return { type: 'wait', unit: u.id };
  }
  return nextDevelopmentCommand(s);
}
