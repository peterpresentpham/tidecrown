/**
 * Self-play: every faction, including "player", is driven by the production AI through
 * fog-limited observations. Measures whether games reach a result and how they flow,
 * not who is stronger. Simulation rounds are not human play time.
 *
 * npm run selfplay -- [map=random|water] [aiCount=1..3] [difficulty=easy|medium|hard] [games=5] [maxRounds=160]
 * Prints one JSON line per game, then a summary line.
 */
import { nextFactionCommand } from '../src/ai/ai';
import { createGame, execute, type FactionId, type State, UNITS } from '../src/game/engine';
import type { Difficulty } from '../src/game/map';

type Options = {
  seed: string;
  map: 'random' | 'water';
  aiCount: 1 | 2 | 3;
  difficulty: Difficulty;
  maxRounds: number;
};
type FactionStats = {
  turns: number;
  goldFloat: number;
  kills: number;
  losses: number;
  cityCaptures: number;
  villages: number;
  peakUnits: number;
};

export function selfPlay(o: Options) {
  let s: State = createGame({
    seed: o.seed,
    map: o.map,
    aiCount: o.aiCount,
    difficulty: o.difficulty,
  });
  const stats = Object.fromEntries(
    s.factions.map((f) => [
      f,
      { turns: 0, goldFloat: 0, kills: 0, losses: 0, cityCaptures: 0, villages: 0, peakUnits: 0 },
    ])
  ) as Record<FactionId, FactionStats>;
  const cityHistory: { round: number; cities: Record<string, number> }[] = [];
  const combatRounds = new Set<number>();
  let firstCombat: number | null = null,
    firstCityTaken: number | null = null,
    commandsThisTurn = 0;
  const started = performance.now();

  while (!s.winner && s.round <= o.maxRounds) {
    if (++commandsThisTurn > 400) throw new Error(`AI loop ${o.seed} r${s.round} ${s.turn}`);
    const owner = s.turn,
      cmd = nextFactionCommand(s),
      before = s,
      result = execute(s, cmd);
    if (result.error)
      throw new Error(`${o.seed} ${owner} r${s.round} ${JSON.stringify(cmd)}: ${result.error}`);
    s = result.state;

    if (cmd.type === 'attack' && before.units.some((u) => u.tile === cmd.to && u.owner !== owner)) {
      combatRounds.add(s.round);
      firstCombat ??= s.round;
    }
    const alive = new Set(s.units.map((u) => u.id));
    for (const u of before.units)
      if (!alive.has(u.id) && u.owner !== owner && stats[u.owner]) {
        stats[u.owner].losses++;
        stats[owner].kills++;
      }
    for (const c of s.cities) {
      const prev = before.cities.find((x) => x.id === c.id)?.owner;
      if (!c.owner || prev === c.owner) continue;
      if (prev === null || prev === undefined) stats[c.owner].villages++;
      else {
        stats[c.owner].cityCaptures++;
        firstCityTaken ??= s.round;
      }
    }

    if (s.turn !== owner || s.winner) {
      stats[owner].turns++;
      stats[owner].goldFloat += s.resources[owner].gold;
      commandsThisTurn = 0;
      if (s.turn === s.factions[0]) {
        const cities: Record<string, number> = {};
        for (const f of s.factions) {
          cities[f] = s.cities.filter((c) => c.owner === f).length;
          stats[f].peakUnits = Math.max(
            stats[f].peakUnits,
            s.units.filter((u) => u.owner === f).length
          );
        }
        cityHistory.push({ round: s.round, cities });
      }
    }
  }

  let lastCityChange = 0;
  for (let i = 1; i < cityHistory.length; i++)
    if (JSON.stringify(cityHistory[i].cities) !== JSON.stringify(cityHistory[i - 1].cities))
      lastCityChange = cityHistory[i].round;
  return {
    seed: o.seed,
    map: o.map,
    aiCount: o.aiCount,
    difficulty: o.difficulty,
    rounds: s.round,
    winner: s.winner ?? 'round-limit',
    firstCombat,
    firstCityTaken,
    lastCityChange,
    combatRoundsPct: Math.round((100 * combatRounds.size) / s.round),
    simulationMs: Math.round(performance.now() - started),
    finalCities: cityHistory.at(-1)?.cities,
    factions: Object.fromEntries(
      Object.entries(stats).map(([f, p]) => [
        f,
        {
          avgGold: Math.round(p.goldFloat / Math.max(1, p.turns)),
          kills: p.kills,
          losses: p.losses,
          cityCaptures: p.cityCaptures,
          villages: p.villages,
          peakUnits: p.peakUnits,
          // Unit count and summed base attack at the end: a rough army size, not a strength rating.
          units: s.units.filter((u) => u.owner === f).length,
          attack: s.units
            .filter((u) => u.owner === f)
            .reduce((sum, u) => sum + UNITS[u.type].attack, 0),
        },
      ])
    ),
  };
}

const [map = 'random', ai = '1', difficulty = 'medium', games = '5', maxRounds = '160'] =
  process.argv.slice(2);
if (map !== 'random' && map !== 'water') throw new Error('map must be random or water');
if (!['1', '2', '3'].includes(ai)) throw new Error('aiCount must be 1, 2 or 3');
if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new Error('unknown difficulty');

const results = [];
for (let i = 1; i <= Number(games); i++) {
  const r = selfPlay({
    seed: `selfplay-${map}-${ai}-${difficulty}-${i}`,
    map,
    aiCount: Number(ai) as 1 | 2 | 3,
    difficulty: difficulty as Difficulty,
    maxRounds: Number(maxRounds),
  });
  results.push(r);
  console.log(JSON.stringify(r));
}
const finished = results.filter((r) => r.winner !== 'round-limit');
console.log(
  JSON.stringify({
    summary: true,
    games: results.length,
    finished: finished.length,
    medianFinishRound: finished.map((r) => r.rounds).sort((a, b) => a - b)[
      Math.floor(finished.length / 2)
    ],
  })
);
