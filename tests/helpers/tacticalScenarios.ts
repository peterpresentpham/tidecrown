import { nextAICommand } from '../../src/ai/ai';
import { TECHNOLOGIES, type TechnologyId } from '../../src/data/technologies';
import {
  type Command,
  createClassicGame,
  execute,
  type State,
  type Unit,
  UNITS,
  type UnitType,
} from '../../src/game/engine';
import { emptyKnowledge, refreshKnowledge } from '../../src/game/visibility';

export const SCENARIOS = {
  screen: 'Cung sau bộ binh',
  focus: 'Tập trung hỏa lực',
  escort: 'Máy có hộ tống',
  defend: 'Bảo vệ thành',
  counter: 'Chặn kỵ binh',
  heal: 'Rút và chữa quân',
} as const;
export type TacticalScenario = keyof typeof SCENARIOS;
export function troop(
  type: UnitType,
  id: string,
  tile: string,
  owner: Unit['owner'] = 'enemy'
): Unit {
  return {
    id,
    type,
    tile,
    owner,
    hp: UNITS[type].hp,
    moves: UNITS[type].moves,
    acted: false,
    moved: false,
    retaliated: false,
    activeLastTurn: false,
  };
}
export function tacticalScenario(name: TacticalScenario): State {
  const s = createClassicGame();
  s.turn = 'enemy';
  s.settings.difficulty = 'medium';
  s.cities = s.cities.slice(0, 2);
  s.cities[0].tile = '8,0';
  s.cities[1].tile = '-6,0';
  for (const t of s.tiles) {
    t.terrain = 'grass';
    t.height = 0.22;
  }
  for (const owner of s.factions) {
    s.knowledge[owner] = emptyKnowledge();
    s.resources[owner] = { gold: 120, food: 100, wood: 120, stone: 120 };
    s.technologies[owner] = Object.keys(TECHNOLOGIES) as TechnologyId[];
  }
  const spotter = troop('scout', 'spotter', '1,3');
  spotter.acted = true;
  spotter.moves = 0;
  const foe = (type: UnitType, id: string, tile: string) => troop(type, id, tile, 'player');
  if (name === 'screen')
    s.units = [
      troop('shield', 'front', '1,0'),
      troop('archer', 'bow', '-1,0'),
      foe('heavy_infantry', 'foe', '5,0'),
      spotter,
    ];
  if (name === 'focus') {
    const weak = foe('clubman', 'weak', '2,-1');
    weak.hp = 4;
    s.units = [
      troop('shield', 'front', '0,0'),
      troop('archer', 'bow-a', '0,-1'),
      troop('archer', 'bow-b', '0,1'),
      weak,
      foe('clubman', 'healthy', '2,1'),
      spotter,
    ];
  }
  if (name === 'escort') {
    s.cities[0].tile = '5,0';
    s.units = [
      troop('spear', 'front', '0,0'),
      troop('shield', 'second', '0,1'),
      troop('catapult', 'machine', '-3,0'),
      foe('spear', 'foe', '5,1'),
      spotter,
    ];
  }
  if (name === 'defend') {
    s.cities[1].tile = '0,0';
    s.units = [
      troop('spear', 'front', '4,0'),
      troop('archer', 'bow', '5,1'),
      foe('knight', 'raider', '-2,0'),
      spotter,
    ];
    s.cities.push({ ...s.cities[0], id: 'village', owner: null, fort: 0, tile: '7,3' });
  }
  if (name === 'counter')
    s.units = [
      troop('pikeman', 'front', '0,0'),
      troop('archer', 'bow', '-1,0'),
      foe('knight', 'charger', '3,0'),
      spotter,
    ];
  if (name === 'heal') {
    const hurt = troop('spear', 'hurt', '0,0');
    hurt.hp = 2;
    s.units = [
      hurt,
      troop('paladin', 'healer', '-1,0'),
      foe('heavy_knight', 'foe', '2,0'),
      spotter,
    ];
  }
  refreshKnowledge(s);
  return s;
}
export function finishAITurn(s: State, log: Command[] = [], maxCommands = 180): State {
  const owner = s.turn;
  let steps = 0;
  while (s.turn === owner && !s.winner) {
    if (++steps > maxCommands) throw new Error(`AI did not terminate ${s.round}/${owner}`);
    const c = nextAICommand(s),
      r = execute(s, c);
    if (r.error) throw new Error(`${JSON.stringify(c)}: ${r.error}`);
    log.push(c);
    s = r.state;
  }
  return s;
}
