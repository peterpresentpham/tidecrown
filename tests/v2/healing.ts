import {
  type Command,
  createClassicGame,
  execute,
  previewAttack,
  restReason,
  type State,
  UNITS,
  type UnitType,
} from '../../src/game/engine';
import { refreshKnowledge } from '../../src/game/visibility';
import { troop } from '../helpers/tacticalScenarios';
export function healingPressure(attacker: UnitType, city = false) {
  let s = createClassicGame();
  for (const t of s.tiles) t.terrain = 'grass';
  s.cities[0].tile = city ? '0,0' : '-10,0';
  s.cities[1].tile = '10,0';
  s.cities[0].level = 1;
  s.cities[0].buildings = [];
  s.units = [troop('shield', 'defender', '0,0', 'player'), troop(attacker, 'attacker', '2,0')];
  s.units[0].hp = 8;
  refreshKnowledge(s);
  const rows: { round: number; startHP: number; healed: number; damage: number; endHP: number }[] =
    [];
  const apply = (cmd: Command) => {
    const r = execute(s, cmd);
    if (r.error) throw Error(r.error);
    s = r.state;
  };
  for (let i = 0; i < 12; i++) {
    const u = s.units.find((u) => u.id === 'defender');
    if (!u) break;
    const startHP = u.hp;
    if (!restReason(s, u)) apply({ type: 'rest', unit: u.id });
    else apply({ type: 'wait', unit: u.id });
    const healed = s.units.find((u) => u.id === 'defender')!.hp - startHP;
    apply({ type: 'end' });
    const a = s.units.find((u) => u.id === 'attacker')!,
      p = previewAttack(s, a, '0,0');
    if (!p.legal) throw Error(p.reason);
    apply({ type: 'attack', unit: a.id, to: '0,0' });
    rows.push({
      round: i + 1,
      startHP,
      healed,
      damage: p.damage,
      endHP: s.units.find((u) => u.id === 'defender')?.hp ?? 0,
    });
    apply({ type: 'end' });
  }
  return {
    attacker,
    city,
    maxHP: UNITS.shield.hp,
    rows,
    survived: !!s.units.find((u) => u.id === 'defender'),
  };
}
export function pursuit() {
  let s = createClassicGame();
  for (const t of s.tiles) t.terrain = 'grass';
  s.cities[0].tile = '-10,0';
  s.cities[1].tile = '10,0';
  s.units = [troop('shield', 'hurt', '0,0', 'player'), troop('knight', 'pursuer', '2,0')];
  s.units[0].hp = 5;
  refreshKnowledge(s);
  const apply = (state: State, cmd: Command) => {
    const r = execute(state, cmd);
    if (r.error) throw Error(r.error);
    return r.state;
  };
  s = apply(s, { type: 'move', unit: 'hurt', to: '-1,0' });
  const sameTurnRest = restReason(s, s.units[0]);
  s = apply(s, { type: 'end' });
  s = apply(s, { type: 'move', unit: 'pursuer', to: '0,0' });
  s = apply(s, { type: 'end' });
  return {
    sameTurnRest,
    afterPursuitRest: restReason(
      s,
      s.units.find((u) => u.id === 'hurt')!
    ),
  };
}
if (process.argv[1]?.endsWith('/healing.ts'))
  console.log(
    JSON.stringify(
      {
        pressure: ['archer', 'crossbow', 'catapult'].flatMap((t) =>
          [false, true].map((city) => healingPressure(t as UnitType, city))
        ),
        pursuit: pursuit(),
      },
      null,
      2
    )
  );
