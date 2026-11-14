import { TECHNOLOGIES, type TechnologyId } from '../../src/data/technologies';
import { createClassicGame, type State } from '../../src/game/engine';
import { emptyKnowledge, refreshKnowledge } from '../../src/game/visibility';
import { troop } from './tacticalScenarios';

export function navalScenario(): State {
  const s = createClassicGame();
  s.turn = 'enemy';
  s.settings.map = 'water';
  for (const t of s.tiles) {
    t.terrain = Math.abs(t.q) < 2 ? 'water' : 'grass';
    t.height = 0.22;
  }
  s.cities = s.cities.slice(0, 2);
  Object.assign(s.cities[0], { tile: '8,7' });
  Object.assign(s.cities[1], { tile: '-2,0', buildings: ['port', 'shipyard'] });
  s.cities.push({
    ...s.cities[0],
    id: 'beach-village',
    name: 'Bến đối diện',
    tile: '2,0',
    owner: null,
    fort: 0,
    buildings: [],
  });
  s.units = [
    troop('transport', 'ferry', '-1,0'),
    troop('warship', 'guard', '0,2'),
    troop('clubman', 'landing', '-2,1'),
    troop('clubman', 'home', '-4,-1'),
    troop('archer', 'bow', '-2,-1'),
  ];
  for (const f of s.factions) {
    s.knowledge[f] = emptyKnowledge();
    s.technologies[f] = Object.keys(TECHNOLOGIES) as TechnologyId[];
    s.resources[f] = { gold: 0, food: 100, wood: 0, stone: 0 };
  }
  refreshKnowledge(s);
  return s;
}
