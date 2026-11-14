import {
  cityAt,
  type CombatPreview,
  distance,
  execute,
  previewAttack,
  reachable,
  type State,
  tileAt,
  unitAt,
  UNITS,
} from './engine';
import { observe } from './visibility';
export type AttackPlan = {
  actor: string;
  target: string;
  path: string[];
  preview: CombatPreview;
  seenEnemies: string[];
  round: number;
};
/** Pure, fog-limited planner. Its result is a proposal, never permission to bypass execute. */
export function planAttack(raw: State, actor: string, target: string): AttackPlan | null {
  const owner = raw.units.find((u) => u.id === actor)?.owner;
  if (!owner) return null;
  const s = observe(raw, owner),
    u = s.units.find((u) => u.id === actor);
  if (!u || u.acted || u.aboard || s.turn !== owner || s.winner) return null;
  const targetUnit = unitAt(s, target),
    targetCity = cityAt(s, target);
  if (!(targetUnit && targetUnit.owner !== owner) && !(targetCity && targetCity.owner !== owner))
    return null;
  const seenEnemies = s.units.filter((v) => v.owner !== owner).map((v) => v.id);
  const direct = previewAttack(s, u, target);
  if (direct.legal)
    return { actor, target, path: [], preview: direct, seenEnemies, round: s.round };
  if (UNITS[u.type].class === 'siege') return null;
  const choices: Array<{ plan: AttackPlan; score: number }> = [];
  for (const [id, route] of reachable(s, u)) {
    if (!route.path.length) continue;
    let charge = u.charge ?? 0;
    for (const step of route.path)
      charge = ['grass', 'sand'].includes(tileAt(s, step).terrain) ? charge + 1 : 0;
    // Reachability already proves the route; preview the resulting actor without cloning the world per tile.
    const a = { ...u, tile: id, moved: true, stance: undefined, charge };
    const p = previewAttack(s, a, target);
    if (!p.legal) continue;
    const t = tileAt(s, id),
      enemies = s.units.filter(
        (v) => v.owner !== owner && distance(tileAt(s, v.tile), t) <= 1
      ).length;
    const range = distance(t, tileAt(s, target));
    const score =
      -p.retaliation * 5 -
      enemies * 3 -
      route.cost +
      (UNITS[u.type].range > 1 ? range * 4 : 0) +
      (t.terrain === 'forest' ? 1 : 0);
    choices.push({
      plan: { actor, target, path: route.path, preview: p, seenEnemies, round: s.round },
      score,
    });
  }
  choices.sort((a, b) => b.score - a.score || a.plan.path.join().localeCompare(b.plan.path.join()));
  return choices[0]?.plan ?? null;
}
/** Execute one path step, then let the renderer finish before advancing again. */
export function advanceAttack(
  s: State,
  plan: AttackPlan
): { state: State; next: AttackPlan | null; reason?: string } {
  const u = s.units.find((v) => v.id === plan.actor);
  const stop = (reason: string) => ({ state: s, next: null, reason });
  if (!u || u.owner !== s.turn || s.round !== plan.round || s.winner || u.acted)
    return stop('Kế hoạch đã hết hiệu lực.');
  const visible = observe(s, u.owner);
  if (visible.units.some((v) => v.owner !== u.owner && !plan.seenEnemies.includes(v.id)))
    return stop('Phát hiện quân địch mới. Đã dừng để bạn xem lại.');
  if (plan.path.length) {
    const result = execute(s, { type: 'move', unit: u.id, to: plan.path[0] });
    return result.error
      ? stop(result.error)
      : { state: result.state, next: { ...plan, path: plan.path.slice(1) } };
  }
  const p = previewAttack(visible, u, plan.target);
  if (!p.legal) return stop(p.reason);
  if (
    p.retaliation > plan.preview.retaliation ||
    p.damage < plan.preview.damage ||
    p.fortDamage < plan.preview.fortDamage
  )
    return stop('Dự báo đã thay đổi. Hãy xác nhận lại đòn đánh.');
  const result = execute(s, { type: 'attack', unit: u.id, to: plan.target });
  return result.error ? stop(result.error) : { state: result.state, next: null };
}
