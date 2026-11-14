// Development-only UI for the same six scenarios used by the automated tests.
import { nextAICommand } from '../src/ai/ai';
import { navalDemand } from '../src/ai/naval';
import { type Command, execute, type FactionId, type State, UNITS } from '../src/game/engine';
import { observe } from '../src/game/visibility';
import { World } from '../src/render/World';
import { navalScenario } from './helpers/navalScenarios';

const SCENARIOS = { convoy: 'Vận tải và hộ tống qua biển' } as const;
const host = document.getElementById('world')!,
  result = document.getElementById('result')!,
  roster = document.getElementById('roster')!,
  intent = document.getElementById('intent')!,
  select = document.getElementById('scenario') as HTMLSelectElement;
for (const [id, label] of Object.entries(SCENARIOS)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = label;
  select.appendChild(option);
}
const swap = (owner: FactionId): FactionId =>
  owner === 'enemy' ? 'player' : owner === 'player' ? 'enemy' : owner;
function spectator(raw: State) {
  const s = structuredClone(raw);
  s.turn = swap(s.turn);
  s.factions = s.factions.map(swap);
  s.winner = s.winner ? swap(s.winner) : null;
  for (const u of s.units) u.owner = swap(u.owner);
  for (const c of s.cities) if (c.owner) c.owner = swap(c.owner);
  for (const record of [s.knowledge, s.technologies, s.resources, s.research, s.bankrupt]) {
    const p = record.player;
    Object.assign(record, { player: record.enemy, enemy: p });
  }
  for (const k of Object.values(s.knowledge))
    for (const c of Object.values(k.cities)) if (c.owner) c.owner = swap(c.owner);
  if (s.event) {
    s.event.owner = swap(s.event.owner);
    s.event.viewers = s.event.viewers?.map(swap);
    s.event.originViewers = s.event.originViewers?.map(swap);
  }
  return s;
}
let state: State,
  world: World | undefined,
  log: string[] = [];
function sync() {
  world!.sync(spectator(state), null, null, false);
  const plan = state.turn === 'enemy' ? navalDemand(observe(state, 'enemy')) : null;
  intent.textContent = `Lượt ${state.round} · ${state.turn === 'enemy' ? 'AI' : 'Đối thủ'} · Mục tiêu: ${state.turn !== 'enemy' ? 'đã kết thúc lượt AI' : plan ? `vận tải → ${plan.targets.map((c) => c.name).join(', ')}` : 'khám phá'}`;
  result.textContent = log.slice(-7).join('\n') || 'Chọn AI: một lệnh để quan sát quyết định.';
  roster.replaceChildren();
  for (const u of state.units.filter((u) => u.id !== 'spotter')) {
    const span = document.createElement('span');
    span.className = u.owner === 'enemy' ? 'ally' : 'foe';
    span.textContent = `${u.id}: ${UNITS[u.type].name} ${u.hp}/${UNITS[u.type].hp} HP @ ${u.tile}${u.stance ? ' · ' + u.stance : ''}`;
    roster.appendChild(span);
  }
}
function run(c: Command) {
  const r = execute(state, c);
  if (r.error) throw new Error(r.error);
  state = r.state;
  log.push(JSON.stringify(c));
}
function reset() {
  world?.dispose();
  state = navalScenario();
  log = [];
  world = new World(
    host,
    spectator(state),
    () => {},
    () => {}
  );
  world.focus('0,0');
  world.zoom(0.75);
  sync();
}
select.onchange = reset;
document.getElementById('reset')!.onclick = reset;
document.getElementById('next')!.onclick = () => {
  if (state.turn === 'enemy' && !state.winner) run(nextAICommand(state));
  sync();
};
document.getElementById('turn')!.onclick = () => {
  let n = 0;
  while (state.turn === 'enemy' && !state.winner && ++n <= 180) run(nextAICommand(state));
  if (n > 180) throw new Error('AI không kết thúc lượt');
  sync();
};
document.getElementById('round')!.onclick = () => {
  if (state.turn === 'player' && !state.winner) run({ type: 'end' });
  sync();
};
reset();
