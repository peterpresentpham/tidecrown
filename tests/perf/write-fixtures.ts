// Usage: node --import tsx tests/perf/write-fixtures.ts artifacts/perf
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { aiRoundFixture, battle60Fixture, loseFixture, serialize, winFixture } from './fixture';
const out = process.argv[2] ?? 'artifacts/perf';
mkdirSync(out, { recursive: true });
for (const [name, build] of [['ai-round', aiRoundFixture], ['battle-60', battle60Fixture], ['win', winFixture], ['lose', loseFixture]] as const) {
  const s = build();
  writeFileSync(join(out, `${name}.json`), serialize(s));
  console.log(name, s.units.length, 'units', Object.fromEntries(s.factions.map(f => [f, s.units.filter(u => u.owner === f).length])));
}
