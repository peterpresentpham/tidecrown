// Isolated localhost fixture. Never import into the production entry.
import '../../src/style.css';

import { createRoot } from 'react-dom/client';

import { TECHNOLOGIES, type TechnologyId } from '../../src/data/technologies';
import { createClassicGame, UNITS, type UnitType } from '../../src/game/engine';
import { emptyKnowledge, refreshKnowledge } from '../../src/game/visibility';
import { SAVE_KEY } from '../../src/persistence/save';
import { App } from '../../src/ui/App';
const s = createClassicGame();
s.cities = s.cities.slice(0, 3);
s.cities[0].tile = '0,2';
s.cities[1].tile = '8,0';
s.cities[2].tile = '2,-2';
s.cities[2].fort = 0;
for (const t of s.tiles) {
  t.terrain = 'grass';
  t.height = 0.22;
}
s.units = (
  [
    { id: 'tester', type: 'swordsman', tile: '0,0', owner: 'player' },
    { id: 'foe', type: 'spear', tile: '2,0', owner: 'enemy' },
    { id: 'scout', type: 'scout', tile: '-2,0', owner: 'player' },
  ] as const
).map((u) => ({
  ...u,
  hp: UNITS[u.type as UnitType].hp,
  moves: UNITS[u.type as UnitType].moves,
  acted: false,
  moved: false,
  retaliated: false,
  activeLastTurn: false,
}));
s.technologies.player = Object.keys(TECHNOLOGIES) as TechnologyId[];
s.resources.player = { gold: 200, food: 200, wood: 200, stone: 200 };
for (const f of s.factions) s.knowledge[f] = emptyKnowledge();
refreshKnowledge(s);
// This explicit test page resets its origin's test save; use port 3012, never the user's 3010 origin.
if (location.port !== '3012') throw new Error('Fixture chỉ chạy trên cổng kiểm thử 3012.');
localStorage.setItem(SAVE_KEY, JSON.stringify(s));
createRoot(document.getElementById('root')!).render(<App />);
