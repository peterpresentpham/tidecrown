import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TECHNOLOGIES, type TechnologyId } from '../src/data/technologies';
import { researchAncestry, researchLayout, researchPlan } from '../src/ui/researchGraph';

test('selection highlights every AND prerequisite, deduplicates shared ancestors and excludes unrelated branches', () => {
  const route = researchAncestry('mounted_archery');
  assert.deepEqual(
    [...route].sort(),
    [
      'mounted_archery',
      'light_cavalry',
      'horses',
      'husbandry',
      'basic_agriculture',
      'archery',
      'basic_woodworking',
    ].sort()
  );
  assert.equal(route.has('rangers'), false);
  const shared = researchAncestry('ballistas');
  assert.equal([...shared].filter((id) => id === 'basic_woodworking').length, 1);
  for (const id of shared) for (const req of TECHNOLOGIES[id].requires) assert.ok(shared.has(req));
  for (const id of Object.keys(TECHNOLOGIES) as TechnologyId[])
    assert.ok(researchAncestry(id).has(id));
});

test('lane layout places every technology once, with in-lane arrows pointing right and no overlapping cards', () => {
  const lanes = researchLayout(),
    ids = lanes.flatMap((l) => l.nodes.map((n) => n.id));
  assert.equal(ids.length, Object.keys(TECHNOLOGIES).length);
  assert.equal(new Set(ids).size, ids.length);
  for (const lane of lanes) {
    const at = new Map(lane.nodes.map((n) => [n.id, n]));
    assert.equal(
      new Set(lane.nodes.map((n) => `${n.col}:${n.row}`)).size,
      lane.nodes.length,
      `${lane.branch} cards overlap`
    );
    for (const e of lane.edges) {
      assert.equal(TECHNOLOGIES[e.from].branch, lane.branch);
      assert.ok(at.get(e.from)!.col < at.get(e.to)!.col, `${e.from}→${e.to} must point right`);
    }
    for (const n of lane.nodes) {
      const requires = TECHNOLOGIES[n.id].requires;
      // Every prerequisite is visible either as an arrow or as a cross-branch label.
      assert.deepEqual(
        [...lane.edges.filter((e) => e.to === n.id).map((e) => e.from), ...n.crossRequires].sort(),
        [...requires].sort()
      );
    }
    assert.ok(lane.columns <= 4, `${lane.branch} needs ${lane.columns} columns`);
  }
});

test('single-parent chains stay on one row', () => {
  const economy = researchLayout().find((l) => l.branch === 'economy')!,
    row = (id: TechnologyId) => economy.nodes.find((n) => n.id === id)!.row;
  assert.equal(row('basic_agriculture'), row('granary'));
});

test('research plan lists only unfinished prerequisites, each after its own requirements', () => {
  const plan = researchPlan('knights', ['basic_agriculture', 'mining']);
  assert.equal(plan.at(-1), 'knights');
  assert.ok(!plan.includes('basic_agriculture') && !plan.includes('mining'));
  for (const [i, id] of plan.entries())
    for (const req of TECHNOLOGIES[id].requires)
      if (plan.includes(req)) assert.ok(plan.indexOf(req) < i, `${req} before ${id}`);
  assert.deepEqual(researchPlan('recon', ['recon']), []);
});
