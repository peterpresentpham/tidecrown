import { nextAICommand, nextFactionCommand } from '../../src/ai/ai';
import { economicUpgradeCommand, facilityHome } from '../../src/ai/development';
import { navalDemand } from '../../src/ai/naval';
import { BUILDINGS } from '../../src/data/buildings';
import { TECHNOLOGIES, type TechnologyId } from '../../src/data/technologies';
import {
  type BuildingId,
  buildingReason,
  type Command,
  createGame,
  distance,
  execute,
  hasBuilding,
  hasTech,
  income,
  isShip,
  isSiege,
  recruitReason,
  recruitTiles,
  researchReason,
  type State,
  unitLockReason,
  UNITS,
  type UnitType,
} from '../../src/game/engine';
import { isVisible, observe } from '../../src/game/visibility';
import { parseSave } from '../../src/persistence/save';
export const OPENINGS = ['expansion', 'economy', 'pressure'] as const;
export type Opening = (typeof OPENINGS)[number];
export const OPENING_LABELS: Record<Opening, string> = {
  expansion: 'Mở rộng và trinh sát',
  economy: 'Kinh tế rồi quân',
  pressure: 'Quân sớm gây sức ép',
};
function nextTech(s: State, id: TechnologyId): TechnologyId | null {
  if (hasTech(s, s.turn, id)) return null;
  for (const req of TECHNOLOGIES[id].requires) {
    const next = nextTech(s, req);
    if (next) return next;
  }
  return id;
}
/** Deterministic, fog-limited player controller. Opening choices are independent
 * of seed/outcome, followed by one common midgame policy. No free resources. */
export function openingDevelopment(s: State, opening: Opening): Command {
  const owner = s.turn,
    own = s.units.filter((u) => u.owner === owner),
    cities = s.cities.filter((c) => c.owner === owner && !c.stability && !c.job),
    net = income(s, owner),
    budget = s.resources[owner];
  const research = (goal: TechnologyId): Command | null => {
    const id = nextTech(s, goal);
    return id && !researchReason(s, owner, id) ? { type: 'research', technology: id } : null;
  };
  const build = (id: BuildingId): Command | null => {
    const c = cities.find((c) => !buildingReason(s, c, id));
    return c ? { type: 'build', city: c.id, building: id } : null;
  };
  const recruit = (types: UnitType[]): Command | null => {
    const cap = 14;
    if (own.length >= cap) return null;
    for (const type of types) {
      if (
        !isShip({ type }) &&
        s.settings.map === 'water' &&
        navalDemand(s).needed &&
        own.length >= cap - Math.max(0, 3 - own.filter(isShip).length)
      )
        continue;
      if (
        unitLockReason(s, owner, type) ||
        (type === 'clubman' && types.includes('shield') && !unitLockReason(s, owner, 'shield'))
      )
        continue;
      if (net.food < UNITS[type].upkeep.food && budget.food < 18) continue;
      for (const c of cities) {
        if (!recruitReason(s, c, type)) {
          const to = recruitTiles(s, c, type).sort(
            (a, b) => distance(a, { q: 0, r: 0 }) - distance(b, { q: 0, r: 0 })
          )[0];
          if (to) return { type: 'recruit', city: c.id, unitType: type, to: to.id };
        }
      }
    }
    return null;
  };
  const ordered = (...commands: (Command | null)[]) =>
    commands.find((c): c is Command => !!c) ?? null;
  if (opening === 'expansion' && s.round <= 5) {
    const c = ordered(
      research('recon'),
      own.filter((u) => u.type === 'scout').length < 2 ? recruit(['scout']) : null
    );
    if (c) return c;
    if (own.filter((u) => u.type === 'scout').length < 2) return { type: 'end' };
  }
  if (opening === 'pressure' && s.round <= 5) {
    const c = ordered(
      own.length < 3 ? recruit(['clubman']) : null,
      research('shields'),
      own.filter((u) => u.type === 'archer').length < 2 ? recruit(['archer']) : null
    );
    if (c) return c;
    return { type: 'end' };
  }
  if (opening === 'economy' && s.round <= 5) {
    const c = ordered(
      research('basic_woodworking'),
      !cities.some((c) => hasBuilding(c, 'lumber')) ? build('lumber') : null,
      research('basic_agriculture'),
      !cities.some((c) => hasBuilding(c, 'farm')) ? build('farm') : null,
      research('recon')
    );
    if (c) return c;
    return { type: 'end' };
  }
  for (const [needed, tech, id] of [
    [net.food < 3, 'basic_agriculture', 'farm'],
    [net.wood < 3, 'basic_woodworking', 'lumber'],
    [net.gold < 5 && s.round > 6, 'commerce', 'market'],
  ] as const)
    if (needed) {
      const c = ordered(research(tech), build(id));
      if (c) return c;
    }
  // The player controller keeps the same 14-unit budget on both maps. Do not
  // delegate recruitment to the AI's 8-unit cap, which would strand its fleet.
  const navy = navalDemand(s);
  if (s.settings.map === 'water' && navy.needed) {
    const progress = ordered(
      research('naval'),
      !cities.some((c) => hasBuilding(c, 'port')) ? build('port') : null
    );
    if (progress) return progress;
    if (!own.some(isShip)) {
      const c = recruit(['scout_ship']);
      return c ?? { type: 'end' };
    }
    if (!own.some((u) => u.type === 'transport')) {
      const c = ordered(research('transports'), recruit(['transport']));
      return c ?? { type: 'end' };
    }
    if (
      (navy.loaded || navy.threatened) &&
      !own.some((u) => u.type === 'warship' || u.type === 'heavy_warship')
    ) {
      const c = ordered(
        research('warships'),
        !cities.some((c) => hasBuilding(c, 'shipyard')) ? build('shipyard') : null,
        recruit(['warship'])
      );
      return c ?? { type: 'end' };
    }
  }
  const upgrade = economicUpgradeCommand(s);
  if (upgrade) return upgrade;
  if (
    !own.some((u) => u.type === 'scout') &&
    (s.round < 12 || !s.cities.some((c) => c.owner && c.owner !== owner))
  ) {
    const c = ordered(research('recon'), recruit(['scout']));
    if (c) return c;
  }
  const fronts = own.filter((u) => UNITS[u.type].capture && u.type !== 'scout'),
    ranged = own.filter((u) => UNITS[u.type].range > 1 && !isSiege(u) && !isShip(u));
  const shieldTech = research('shields');
  if (shieldTech) return shieldTech;
  if (fronts.length < 2) {
    const c = recruit(['swordsman', 'shield', 'clubman']);
    if (c) return c;
    return { type: 'end' };
  }
  const c = ordered(
    research('archery'),
    ranged.length < Math.max(2, fronts.length / 2)
      ? recruit(['crossbow', 'ranger', 'archer'])
      : null
  );
  if (c) return c;
  const goal: TechnologyId =
    opening === 'expansion' ? 'rangers' : opening === 'economy' ? 'heavy_infantry' : 'crossbows';
  const advanced = research(goal);
  if (advanced) return advanced;
  const desired: UnitType =
    opening === 'expansion' ? 'ranger' : opening === 'economy' ? 'heavy_infantry' : 'crossbow';
  const prepare = (type: UnitType): Command | null => {
    if (
      unitLockReason(s, owner, type) ||
      cities.some(
        (c) => !UNITS[type].facility || hasBuilding(c, UNITS[type].facility as BuildingId)
      )
    )
      return null;
    const home = facilityHome(s, type, cities);
    for (const c of home ? [home] : []) {
      let needed = UNITS[type].facility as BuildingId | undefined;
      if (!needed || hasBuilding(c, needed)) continue;
      for (let n = 0; n < 4; n++) {
        const req: BuildingId | undefined = BUILDINGS[needed].requires;
        if (!req || hasBuilding(c, req)) break;
        needed = req;
      }
      if (!buildingReason(s, c, needed)) return { type: 'build', city: c.id, building: needed };
    }
    return null;
  };
  for (const u of own.filter((u) => u.type === 'clubman' && !u.acted)) {
    const c: Command = { type: 'upgradeUnit', unit: u.id, unitType: 'shield' };
    if (!execute(s, c).error) return c;
  }
  // Field the opening's specialised force, then permit a real late-game refit.
  // Replacing two rangers forever is not a full-game development policy.
  if (opening === 'economy' || !hasTech(s, owner, 'steel')) {
    const specialty = ordered(
      prepare(desired),
      own.filter((u) => u.type === desired).length < 2 ? recruit([desired]) : null
    );
    if (specialty) return specialty;
    if (!own.some((u) => u.type === desired)) return { type: 'end' };
  }
  if (s.round >= 60) {
    const late = ordered(research('heavy_infantry'), prepare('heavy_infantry'));
    if (late) return late;
  }

  const fort = s.cities.some((c) => c.owner && c.owner !== owner && c.fort > 0);
  if (
    fort &&
    own.filter(isSiege).length <
      (s.cities.some((c) => c.owner && c.owner !== owner && c.fort >= 30) ? 3 : 2)
  ) {
    const c = ordered(
      research('catapults'),
      !cities.some((c) => hasBuilding(c, 'siege_workshop')) ? build('siege_workshop') : null,
      recruit(['catapult'])
    );
    if (c) return c;
    return { type: 'end' };
  }
  // V2 common midgame: an opening is a starting investment, not a permanent tech lock.
  // A shield-only front cannot indefinitely contest steel armies under the new HP rules.
  if (s.units.some((u) => u.owner !== owner && UNITS[u.type].armor >= 3)) {
    const counter = ordered(research('swords'), prepare('swordsman'));
    if (counter) return counter;
  }
  // One specialised branch per opening, without blocking any other technology.
  if (s.units.some((u) => u.owner !== owner && UNITS[u.type].armor >= 3)) {
    const c = ordered(
      research('crossbows'),
      prepare('crossbow'),
      !own.some((u) => u.type === 'crossbow') ? recruit(['crossbow']) : null
    );
    if (c) return c;
  }
  const trained = recruit(
    fronts.length < Math.max(3, ranged.length)
      ? ['heavy_infantry', 'swordsman', 'shield', 'clubman']
      : ['crossbow', 'ranger', 'archer']
  );
  if (trained) return trained;
  if (own.some(isSiege)) {
    const c = ordered(research('trebuchets'), recruit(['trebuchet']));
    if (c) return c;
  }
  for (const city of cities)
    if (!city.constructed && budget.food > 70) {
      const c: Command = { type: 'build', city: city.id, building: 'upgrade' };
      if (!execute(s, c).error) return c;
    }
  return { type: 'end' };
}
export function balanceCommand(raw: State, opening: Opening): Command {
  const base = nextFactionCommand(raw);
  if ('unit' in base) return base;
  return openingDevelopment(observe(raw, raw.turn), opening);
}
export type CampaignOptions = {
  seed: string;
  opening: Opening;
  difficulty?: 'medium' | 'hard';
  map?: 'random' | 'water';
  maxRounds?: number;
  trace?: boolean;
  validate?: boolean;
};
export function balanceCampaign(options: CampaignOptions) {
  const {
    seed,
    opening,
    difficulty = 'medium',
    map = 'random',
    maxRounds = 240,
    trace = false,
    validate = false,
  } = options;
  let s = createGame({ seed, map, difficulty, aiCount: 1 }),
    commands = 0,
    turnCommands = 0,
    firstContact: number | null = null,
    firstCombat: number | null = null,
    firstVillage: number | null = null,
    firstSiege: number | null = null;
  const research: Record<string, number> = {},
    recruits: Record<string, number> = {},
    fielded: Record<string, number> = {},
    starved = { player: 0, enemy: 0 },
    log: { round: number; owner: string; command: Command }[] = [],
    snapshots: unknown[] = [];
  const initial = structuredClone(s),
    started = performance.now();
  while (!s.winner && s.round <= maxRounds) {
    if (++turnCommands > 180) throw new Error(`Loop ${opening}/${seed}/${s.round}/${s.turn}`);
    if (
      firstContact === null &&
      s.units.some((u) => u.owner !== 'player' && !u.aboard && isVisible(s, 'player', u.tile))
    )
      firstContact = s.round;
    const cmd = s.turn === 'player' ? balanceCommand(s, opening) : nextAICommand(s),
      owner = s.turn,
      round = s.round;
    if (cmd.type === 'attack') {
      if (
        firstCombat === null &&
        s.units.some((u) => u.tile === cmd.to && u.owner !== owner && !u.aboard)
      )
        firstCombat = round;
      if (
        firstSiege === null &&
        'unit' in cmd &&
        isSiege(s.units.find((u) => u.id === cmd.unit)!) &&
        s.cities.some((c) => c.tile === cmd.to && c.fort > 0)
      )
        firstSiege = round;
    }
    if (cmd.type === 'recruit' && owner === 'player') recruits[cmd.unitType] ??= round;
    if (trace) log.push({ round, owner, command: cmd });
    const result = execute(s, cmd);
    if (result.error)
      throw new Error(
        `${opening}/${seed}/${owner}/${round}: ${JSON.stringify(cmd)}: ${result.error}`
      );
    s = result.state;
    if (validate && cmd.type === 'end' && !parseSave(JSON.stringify(s)))
      throw new Error('Campaign save invariant failed');
    commands++;
    if (s.turn !== owner) {
      turnCommands = 0;
      if (s.bankrupt[s.turn]) starved[s.turn as 'player' | 'enemy']++;
      if (s.turn === 'player')
        snapshots.push({
          round: s.round,
          cities: s.cities.reduce(
            (a, c) => ({ ...a, [c.owner ?? 'neutral']: (a[c.owner ?? 'neutral'] ?? 0) + 1 }),
            {} as Record<string, number>
          ),
          units: s.units.reduce(
            (a, u) => ({ ...a, [u.owner]: (a[u.owner] ?? 0) + 1 }),
            {} as Record<string, number>
          ),
          resources: s.resources.player,
          income: income(s, 'player'),
        });
    }
    if (firstVillage === null && s.cities.filter((c) => c.owner === 'player').length > 1)
      firstVillage = round;
    for (const u of s.units.filter((u) => u.owner === 'player')) fielded[u.type] ??= s.round;
    for (const tech of s.technologies.player) research[tech] ??= s.round;
  }
  return {
    seed,
    opening,
    difficulty,
    map,
    round: s.round,
    winner: s.winner,
    result: s.winner ?? 'round-limit',
    firstContact,
    firstCombat,
    firstVillage,
    firstSiege,
    commands,
    simulationMs: Math.round(performance.now() - started),
    research,
    recruits,
    fielded,
    starved,
    final: {
      cities: s.cities.map((c) => ({ id: c.id, owner: c.owner, fort: c.fort, level: c.level })),
      units: s.units.map((u) => ({ owner: u.owner, type: u.type, hp: u.hp, tile: u.tile })),
      resources: s.resources.player,
      enemyResources: s.resources.enemy,
      enemyTech: s.technologies.enemy,
    },
    snapshots,
    log,
    initial: trace ? initial : undefined,
  };
}
