import type { City, FactionId, GridPoint, Terrain, Tile } from './engine';
import type { GameSettings } from './map';
const key = (p: GridPoint) => `${p.q},${p.r}`;
const distance = (a: GridPoint, b: GridPoint) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r));
/** Two connected shores separated by a three-tile channel. No land/corner route
 * or single-cell bridge bypass; all starting capitals have a usable coast. */
export function generateWaterMap(settings: GameSettings, factions: FactionId[], rng: () => number) {
  const pick = (n: number) => Math.floor(rng() * n),
    flipQ = rng() < 0.5 ? -1 : 1,
    flipR = rng() < 0.5 ? -1 : 1,
    offsetR = pick(3) - 1;
  const anchors =
    settings.aiCount === 1
      ? [
          [-2, 6],
          [2, -6],
        ]
      : settings.aiCount === 2
        ? [
            [-2, 7],
            [2, -7],
            [-2, -7],
          ]
        : [
            [-2, 7],
            [2, -7],
            [-2, -7],
            [2, 7],
          ];
  const transform = (q: number, r: number) => ({ q: q * flipQ, r: (r + offsetR) * flipR });
  const capitals = anchors.map(([q, r]) => transform(q, r)),
    nearby = anchors.map(([q, r]) => transform(q + Math.sign(q) * 4, r));
  const positions = [...capitals, ...nearby, transform(-2, 0), transform(2, 0)],
    total = factions.length * 3 + 3;
  for (let attempts = 0; positions.length < total && attempts < 3000; attempts++) {
    const side = positions.length % 2 ? 1 : -1,
      p = transform(side * (2 + pick(10)), pick(17) - 8);
    if (positions.every((c) => distance(c, p) >= 4)) positions.push(p);
  }
  if (positions.length !== total) throw new Error('Không tạo đủ vị trí làng trên hai bờ.');
  const names = ['Hải Vân', 'Hỏa Sơn', 'Ngọc Lâm', 'Kim Sa'];
  const cities: City[] = positions.map((p, i) => ({
    id: `c${i + 1}`,
    name: i < factions.length ? names[i] : `Bến ${i - factions.length + 1}`,
    tile: key(p),
    owner: factions[i] ?? null,
    level: 1,
    fort: i < factions.length ? 20 : 0,
    specialty: null,
    job: null,
    recruited: false,
    repaired: false,
    stability: 0,
  }));
  const phase = rng() * Math.PI * 2,
    tiles: Tile[] = [];
  for (let q = -16; q <= 16; q++)
    for (let r = -12; r <= 12; r++) {
      const n = rng(),
        land =
          Math.abs(q) >= 2 &&
          Math.abs(q) <= 12 + Math.sin(r * 0.6 + phase) * 1.2 &&
          Math.abs(r) <= 9;
      const terrain: Terrain = !land
        ? 'water'
        : Math.abs(q) === 2
          ? 'sand'
          : n < 0.22
            ? 'forest'
            : n > 0.96
              ? 'mountain'
              : n > 0.84
                ? 'hill'
                : 'grass';
      tiles.push({
        id: key({ q, r }),
        q,
        r,
        terrain,
        height: terrain === 'hill' ? 0.4 : terrain === 'mountain' ? 0.5 : 0.22,
      });
    }
  const index = new Map(tiles.map((t) => [t.id, t]));
  const clear = (p: GridPoint, radius = 0) => {
    for (let dq = -radius; dq <= radius; dq++)
      for (let dr = -radius; dr <= radius; dr++) {
        const t = index.get(key({ q: p.q + dq, r: p.r + dr }));
        if (t && Math.abs(t.q) >= 2 && Math.abs(t.r) <= 10) {
          t.terrain = Math.abs(t.q) === 2 ? 'sand' : 'grass';
          t.height = 0.22;
        }
      }
  };
  const road = (a: GridPoint, b: GridPoint) => {
    let p = { ...a };
    clear(p);
    while (key(p) !== key(b)) {
      p = { q: p.q + Math.sign(b.q - p.q), r: p.r + Math.sign(b.r - p.r) };
      clear(p);
    }
  };
  for (const side of [-1, 1]) {
    const bank = positions.filter((p) => Math.sign(p.q) === side),
      connected = [bank[0]],
      pending = bank.slice(1);
    while (pending.length) {
      let best = Infinity,
        from = connected[0],
        to = 0;
      for (const a of connected)
        pending.forEach((b, i) => {
          const d = distance(a, b);
          if (d < best) {
            best = d;
            from = a;
            to = i;
          }
        });
      road(from, pending[to]);
      connected.push(pending.splice(to, 1)[0]);
    }
  }
  capitals.forEach((p, i) => road(p, nearby[i]));
  positions.forEach((p) => clear(p, 1));
  const starts = capitals.map((p, i) => key({ q: p.q + Math.sign(nearby[i].q - p.q), r: p.r }));
  return { tiles, cities, starts };
}
