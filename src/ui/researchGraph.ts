import { type Branch, BRANCHES, TECHNOLOGIES, type TechnologyId } from '../data/technologies';

/** Includes every prerequisite (AND), including technologies already completed. */
export function researchAncestry(
  id: TechnologyId,
  set = new Set<TechnologyId>()
): Set<TechnologyId> {
  if (set.has(id)) return set;
  set.add(id);
  for (const req of TECHNOLOGIES[id].requires) researchAncestry(req, set);
  return set;
}

/** Unfinished prerequisites of a goal in a valid study order (each step after its own requirements). */
export function researchPlan(goal: TechnologyId, done: readonly TechnologyId[]): TechnologyId[] {
  const order: TechnologyId[] = [],
    seen = new Set<TechnologyId>();
  const visit = (id: TechnologyId) => {
    if (seen.has(id) || done.includes(id)) return;
    seen.add(id);
    for (const req of TECHNOLOGIES[id].requires) visit(req);
    order.push(id);
  };
  visit(goal);
  return order;
}

export type LaneNode = {
  id: TechnologyId;
  col: number;
  row: number;
  crossRequires: TechnologyId[];
};
export type LaneEdge = { from: TechnologyId; to: TechnologyId };
export type ResearchLane = {
  branch: Branch;
  columns: number;
  rows: number;
  nodes: LaneNode[];
  edges: LaneEdge[];
};

/** Lanes per branch. Columns follow prerequisites inside the same branch only, so
 * every drawn arrow stays in its lane; requirements from other branches are listed
 * on the card instead of crossing the whole screen. A child takes its parent's row
 * when free, which turns simple chains into straight lines. */
export function researchLayout(): ResearchLane[] {
  const all = Object.values(TECHNOLOGIES);
  return (Object.keys(BRANCHES) as Branch[]).map((branch) => {
    const techs = all.filter((t) => t.branch === branch),
      local = (id: TechnologyId) =>
        TECHNOLOGIES[id].requires.filter((r) => TECHNOLOGIES[r].branch === branch);
    const col = new Map<TechnologyId, number>();
    const columnOf = (id: TechnologyId): number => {
      if (!col.has(id))
        col.set(id, local(id).length ? 1 + Math.max(...local(id).map(columnOf)) : 0);
      return col.get(id)!;
    };
    techs.forEach((t) => columnOf(t.id));
    const columns = Math.max(...techs.map((t) => col.get(t.id)!)) + 1,
      row = new Map<TechnologyId, number>(),
      used = new Set<string>();
    // Tree layout: each root owns a band of rows holding its whole subtree, so
    // connectors from one root never cross another root's cards.
    let band = 0;
    const place = (id: TechnologyId, preferred: number) => {
      if (row.has(id)) return;
      let r = preferred;
      while (used.has(`${col.get(id)}:${r}`)) r++;
      used.add(`${col.get(id)}:${r}`);
      row.set(id, r);
      band = Math.max(band, r + 1);
      for (const child of techs.filter((t) => local(t.id).includes(id))) place(child.id, r);
    };
    for (const root of techs.filter((t) => !local(t.id).length)) place(root.id, band);
    const nodes = techs.map((t) => ({
      id: t.id,
      col: col.get(t.id)!,
      row: row.get(t.id)!,
      crossRequires: t.requires.filter((r) => TECHNOLOGIES[r].branch !== branch),
    }));
    const edges = techs.flatMap((t) => local(t.id).map((from) => ({ from, to: t.id })));
    return { branch, columns, rows: Math.max(...nodes.map((n) => n.row)) + 1, nodes, edges };
  });
}
