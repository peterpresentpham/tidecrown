import './research.css';

import {
  ArrowRight,
  BookOpen,
  Castle,
  Check,
  Clock3,
  Coins,
  Footprints,
  Hammer,
  Heart,
  LockKeyhole,
  Mountain,
  Move,
  Route,
  Search,
  Shield,
  Ship,
  Sparkles,
  Swords,
  Target,
  Trees,
  Wheat,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BUILDINGS, IMPROVEMENTS } from '../data/buildings';
import {
  type Branch,
  BRANCHES,
  RECRUITABLE_UNITS,
  TECHNOLOGIES,
  TECHNOLOGY_LOGIC,
  type TechnologyId,
  UNIT_TECH,
} from '../data/technologies';
import { type Resource, type State, UNITS } from '../game/engine';
import { type ResearchStatus, researchStatus, type ResearchStatusKind } from '../game/research';
import { researchAncestry, researchLayout, researchPlan } from './researchGraph';
import { iconFor } from './UnitIcon';

const all = Object.values(TECHNOLOGIES),
  branches = Object.keys(BRANCHES) as Branch[],
  lanes = researchLayout();
const branchIcons = {
  economy: Wheat,
  materials: Hammer,
  infantry: Shield,
  ranged: Target,
  cavalry: Footprints,
  siege: Castle,
  naval: Ship,
};
const tiers = ['Cấp I', 'Cấp II', 'Cấp III', 'Cấp IV'];
const statusIcons: Record<ResearchStatusKind, typeof Check> = {
  ready: Sparkles,
  researching: Clock3,
  complete: Check,
  locked: LockKeyhole,
  unaffordable: Coins,
  waiting: Clock3,
};
// Card geometry is shared by the absolutely positioned cards and the SVG connectors.
const W = 192,
  H = 56,
  GAP_X = 36,
  GAP_Y = 10;
const nodeX = (col: number) => col * (W + GAP_X),
  nodeY = (row: number) => row * (H + GAP_Y);
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const unitsOf = (id: TechnologyId) => RECRUITABLE_UNITS.filter((type) => UNIT_TECH[type] === id);
const buildingsOf = (id: TechnologyId) => Object.values(BUILDINGS).filter((b) => b.tech === id);
const improvementsOf = (id: TechnologyId) =>
  Object.values(IMPROVEMENTS).filter((i) => i.tech === id);
function headline(id: TechnologyId) {
  const names = [
    ...unitsOf(id).map((t) => UNITS[t].name),
    ...buildingsOf(id).map((b) => b.name),
    ...improvementsOf(id).map((i) => i.name),
  ];
  return names.length
    ? names.join(', ')
    : ({
        siege_logistics: 'Triển khai máy',
        marksman: 'Ngắm bắn xuyên giáp',
        amphibious: 'Đổ bộ không phạt giáp',
      }[id as string] ?? '');
}
const searchable = Object.fromEntries(
  all.map((t) => [t.id, normalize(`${t.name} ${t.effect} ${headline(t.id)}`)])
) as Record<TechnologyId, string>;
function iconOf(id: TechnologyId) {
  const units = unitsOf(id);
  return units.length ? iconFor(units[0]) : branchIcons[TECHNOLOGIES[id].branch];
}

const RESOURCES = [
  { id: 'gold', Icon: Coins, name: 'vàng' },
  { id: 'wood', Icon: Trees, name: 'gỗ' },
  { id: 'stone', Icon: Mountain, name: 'đá' },
  { id: 'food', Icon: Wheat, name: 'lương' },
] as const;
function Cost({ cost, stock }: { cost: Resource; stock?: Resource }) {
  return (
    <span className="rt-cost">
      {RESOURCES.filter(({ id }) => cost[id] > 0).map(({ id, Icon, name }) => (
        <span
          key={id}
          className={stock && stock[id] < cost[id] ? 'short' : ''}
          title={`${cost[id]} ${name}`}
        >
          <Icon size={12} />
          {cost[id]}
        </span>
      ))}
    </span>
  );
}
/** One line under the name: what the player needs to know about this node right now. */
function CardLine({
  id,
  status,
  state,
  cross,
}: {
  id: TechnologyId;
  status: ResearchStatus;
  state: State;
  cross: TechnologyId[];
}) {
  const t = TECHNOLOGIES[id],
    done = state.technologies.player,
    current = state.research.player;
  if (status.kind === 'complete')
    return (
      <span className="rt-line">
        <Check size={11} />
        Đã nghiên cứu
      </span>
    );
  if (status.kind === 'researching')
    return (
      <span className="rt-line">
        <Clock3 size={11} />
        Còn {current?.remaining} lượt
      </span>
    );
  const missingCross = cross.filter((r) => !done.includes(r));
  if (status.kind === 'locked' && missingCross.length)
    return (
      <span
        className="rt-line rt-cross"
        title={`Cần thêm ${missingCross.map((r) => TECHNOLOGIES[r].name).join(', ')}`}
      >
        <LockKeyhole size={10} />
        Cần {missingCross.map((r) => TECHNOLOGIES[r].name).join(' + ')}
      </span>
    );
  return (
    <span className="rt-line">
      <Cost cost={t.cost} stock={status.kind === 'locked' ? undefined : state.resources.player} />
      <span className="rt-turns">
        <Clock3 size={10} />
        {t.turns}
      </span>
    </span>
  );
}

export function ResearchPanel({
  state,
  selected,
  onSelect,
  onClose,
  onResearch,
}: {
  state: State;
  selected: TechnologyId;
  onSelect: (id: TechnologyId) => void;
  onClose: () => void;
  onResearch: (id: TechnologyId) => void;
}) {
  const [query, setQuery] = useState(''),
    [branch, setBranch] = useState<Branch | 'all'>('all');
  const nodes = useRef(new Map<TechnologyId, HTMLButtonElement>()),
    scroller = useRef<HTMLDivElement>(null);
  const statuses = useMemo(
    () =>
      Object.fromEntries(all.map((t) => [t.id, researchStatus(state, 'player', t.id)])) as Record<
        TechnologyId,
        ResearchStatus
      >,
    [state]
  );
  const done = state.technologies.player,
    current = state.research.player,
    tech = TECHNOLOGIES[selected],
    status = statuses[selected];
  const route = useMemo(() => researchAncestry(selected), [selected]);
  const plan = useMemo(() => researchPlan(selected, done), [selected, done]);
  const ready = all.filter((t) => statuses[t.id].kind === 'ready').length;
  const match = (id: TechnologyId) => !query || searchable[id].includes(normalize(query));
  const focus = (id: TechnologyId) => {
    onSelect(id);
    if (branch !== 'all' && TECHNOLOGIES[id].branch !== branch) setBranch('all');
    requestAnimationFrame(() =>
      nodes.current.get(id)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    );
  };
  // Open on the selected node rather than at the top of a long tree.
  useEffect(() => {
    nodes.current.get(selected)?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const first = plan.find((id) => current?.technology !== id),
    firstStatus = first ? statuses[first] : null;
  const planGold = plan.reduce((sum, id) => sum + TECHNOLOGIES[id].cost.gold, 0),
    planTurns = plan.reduce(
      (sum, id) => sum + (current?.technology === id ? current.remaining : TECHNOLOGIES[id].turns),
      0
    );
  const action =
    status.kind === 'ready'
      ? { label: <>Nghiên cứu ngay</>, id: selected }
      : status.kind !== 'complete' &&
          status.kind !== 'researching' &&
          first &&
          first !== selected &&
          firstStatus?.kind === 'ready'
        ? { label: <>Học bước đầu: {TECHNOLOGIES[first].name}</>, id: first }
        : null;
  const blocked =
    status.kind === 'complete'
      ? 'Đã nghiên cứu'
      : status.kind === 'researching'
        ? `Đang nghiên cứu · còn ${current?.remaining} lượt`
        : first && firstStatus && first !== selected
          ? `${TECHNOLOGIES[first].name}: ${firstStatus.reason ?? firstStatus.label}`
          : (status.reason ?? status.label);
  const leadsTo = all.filter((t) => t.requires.includes(selected));
  const StatusIcon = statusIcons[status.kind];

  return (
    <section className="rt-screen" aria-label="Cây công nghệ">
      <header className="rt-header">
        <span className="rt-book">
          <BookOpen size={20} />
        </span>
        <div className="rt-title">
          <h2>Cây công nghệ</h2>
          <p>
            {done.length}/{all.length} đã học
            {ready > 0 && (
              <>
                {' '}
                · <b>{ready} có thể học ngay</b>
              </>
            )}
          </p>
        </div>
        {current && (
          <button
            className="rt-current"
            onClick={() => focus(current.technology)}
            aria-label={`Đang nghiên cứu ${TECHNOLOGIES[current.technology].name}`}
          >
            <Clock3 size={14} />
            <span>{TECHNOLOGIES[current.technology].name}</span>
            <b>{current.remaining} lượt</b>
            <i
              style={{
                width: `${(1 - current.remaining / TECHNOLOGIES[current.technology].turns) * 100}%`,
              }}
            />
          </button>
        )}
        <label className="rt-search">
          <Search size={15} />
          <input
            aria-label="Tìm công nghệ"
            placeholder="Tìm công nghệ, quân, công trình…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}>
              <X size={13} />
            </button>
          )}
        </label>
        <button className="rt-close" aria-label="Đóng nghiên cứu" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      <nav className="rt-tabs" aria-label="Nhánh công nghệ">
        <button className={branch === 'all' ? 'active' : ''} onClick={() => setBranch('all')}>
          Tất cả
        </button>
        {branches.map((id) => {
          const Icon = branchIcons[id],
            count = all.filter((t) => t.branch === id && statuses[t.id].kind === 'ready').length,
            learned = all.filter((t) => t.branch === id && done.includes(t.id)).length,
            total = all.filter((t) => t.branch === id).length;
          return (
            <button
              key={id}
              data-branch={id}
              className={branch === id ? 'active' : ''}
              onClick={() => setBranch(id)}
            >
              <Icon size={14} />
              {BRANCHES[id]}
              <small>
                {learned}/{total}
              </small>
              {count > 0 && <b title={`${count} có thể học ngay`}>{count}</b>}
            </button>
          );
        })}
      </nav>
      <div className="rt-main">
        <div className="rt-scroll" ref={scroller}>
          {lanes
            .filter((l) => branch === 'all' || l.branch === branch)
            .map((lane) => {
              const Icon = branchIcons[lane.branch],
                width = nodeX(lane.columns) - GAP_X,
                height = nodeY(lane.rows) - GAP_Y;
              return (
                <section
                  className="rt-lane"
                  key={lane.branch}
                  data-branch={lane.branch}
                  aria-label={BRANCHES[lane.branch]}
                >
                  <header>
                    <Icon size={15} />
                    <h3>{BRANCHES[lane.branch]}</h3>
                  </header>
                  <div className="rt-graph" style={{ width, height }}>
                    <svg className="rt-edges" width={width} height={height} aria-hidden="true">
                      {lane.edges.map(({ from, to }) => {
                        const a = lane.nodes.find((n) => n.id === from)!,
                          b = lane.nodes.find((n) => n.id === to)!;
                        const x1 = nodeX(a.col) + W,
                          y1 = nodeY(a.row) + H / 2,
                          x2 = nodeX(b.col) - 4,
                          y2 = nodeY(b.row) + H / 2,
                          bend = Math.min(GAP_X * 0.8, (x2 - x1) / 2);
                        const kind =
                          route.has(to) && route.has(from) && !done.includes(to)
                            ? 'route'
                            : done.includes(from) && done.includes(to)
                              ? 'done'
                              : done.includes(from)
                                ? 'open'
                                : 'base';
                        return (
                          <g
                            key={`${from}-${to}`}
                            className={`rt-edge ${kind}`}
                            data-from={from}
                            data-to={to}
                          >
                            <path
                              d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                            />
                            <path
                              className="rt-arrow"
                              d={`M ${x2 - 5} ${y2 - 4} L ${x2 + 1} ${y2} L ${x2 - 5} ${y2 + 4}`}
                            />
                          </g>
                        );
                      })}
                    </svg>
                    {lane.nodes.map((n) => {
                      const st = statuses[n.id],
                        t = TECHNOLOGIES[n.id],
                        NodeIcon = iconOf(n.id),
                        StIcon = statusIcons[st.kind];
                      return (
                        <button
                          key={n.id}
                          ref={(el) => {
                            if (el) nodes.current.set(n.id, el);
                            else nodes.current.delete(n.id);
                          }}
                          data-technology={n.id}
                          data-status={st.kind}
                          className={`rt-node ${st.kind}${selected === n.id ? ' selected' : ''}${route.has(n.id) && selected !== n.id ? ' on-route' : ''}${match(n.id) ? '' : ' dim'}`}
                          style={{ left: nodeX(n.col), top: nodeY(n.row), width: W, height: H }}
                          aria-pressed={selected === n.id}
                          aria-label={`${t.name}, ${st.label}${headline(n.id) ? `, mở ${headline(n.id)}` : ''}`}
                          onClick={() => onSelect(n.id)}
                        >
                          <span className="rt-node-icon">
                            <NodeIcon size={17} />
                          </span>
                          <span className="rt-node-text">
                            <strong>{t.name}</strong>
                            <CardLine id={n.id} status={st} state={state} cross={n.crossRequires} />
                          </span>
                          <span className="rt-node-status" title={st.label}>
                            <StIcon size={12} />
                          </span>
                          {st.kind === 'researching' && current && (
                            <i
                              className="rt-progress"
                              style={{ width: `${(1 - current.remaining / t.turns) * 100}%` }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          {query && !all.some((t) => match(t.id) && (branch === 'all' || t.branch === branch)) && (
            <p className="rt-empty">
              Không tìm thấy “{query}”.{' '}
              <button
                onClick={() => {
                  setQuery('');
                  setBranch('all');
                }}
              >
                Xóa tìm kiếm
              </button>
            </p>
          )}
        </div>

        <aside className="rt-inspector" aria-label={`Chi tiết ${tech.name}`}>
          <div className="rt-inspector-body">
            <div className="rt-kicker">
              <span className={`rt-pill ${status.kind}`}>
                <StatusIcon size={12} />
                {status.label}
              </span>
              <span>
                {BRANCHES[tech.branch]} · {tiers[tech.tier - 1]}
              </span>
            </div>
            <h3>{tech.name}</h3>
            <p className="rt-effect">{tech.effect}</p>
            <div className="rt-price">
              <Cost cost={tech.cost} stock={state.resources.player} />
              <span>
                <Clock3 size={13} />
                {tech.turns} lượt
              </span>
            </div>

            {(unitsOf(selected).length > 0 ||
              buildingsOf(selected).length > 0 ||
              improvementsOf(selected).length > 0) && (
              <section className="rt-unlocks">
                <h4>Mở khóa</h4>
                {unitsOf(selected).map((type) => {
                  const u = UNITS[type],
                    Icon = iconFor(type);
                  return (
                    <div key={type} className="rt-unlock unit">
                      <span className="rt-unlock-icon">
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{u.name}</strong>
                        <small>{u.role}</small>
                        <span className="rt-stats">
                          <span title="Máu">
                            <Heart size={11} />
                            {u.hp}
                          </span>
                          <span title="Công">
                            <Swords size={11} />
                            {u.attack}
                          </span>
                          <span title="Giáp">
                            <Shield size={11} />
                            {u.armor}
                          </span>
                          <span title="Bước">
                            <Move size={11} />
                            {u.moves}
                          </span>
                          {u.range > 1 && (
                            <span title="Tầm">
                              <Target size={11} />
                              {u.range}
                            </span>
                          )}
                        </span>
                        {u.facility && (
                          <small className="rt-needs">
                            Tuyển tại thành có{' '}
                            {BUILDINGS[u.facility as keyof typeof BUILDINGS].name}
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}
                {buildingsOf(selected).map((b) => (
                  <div key={b.name} className="rt-unlock">
                    <span className="rt-unlock-icon">
                      <Castle size={17} />
                    </span>
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.description}</small>
                    </div>
                  </div>
                ))}
                {improvementsOf(selected).map((i) => (
                  <div key={i.name} className="rt-unlock">
                    <span className="rt-unlock-icon">
                      <Trees size={17} />
                    </span>
                    <div>
                      <strong>{i.name}</strong>
                      <small>Cải tạo ô trong lãnh thổ</small>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {plan.length > 1 && (
              <section className="rt-plan">
                <h4>
                  <Route size={13} />
                  Lộ trình · {plan.length} bước
                </h4>
                <ol>
                  {plan.map((id, i) => (
                    <li
                      key={id}
                      className={
                        current?.technology === id
                          ? 'researching'
                          : statuses[id].kind === 'ready'
                            ? 'ready'
                            : ''
                      }
                    >
                      <button onClick={() => focus(id)}>
                        <b>{i + 1}</b>
                        <span>{TECHNOLOGIES[id].name}</span>
                        <small>
                          {current?.technology === id
                            ? 'đang học'
                            : BRANCHES[TECHNOLOGIES[id].branch]}
                        </small>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="rt-plan-total">
                  <Coins size={12} />
                  {planGold} vàng · khoảng {planTurns} lượt nghiên cứu
                </p>
              </section>
            )}

            {tech.requires.length > 0 && (
              <section className="rt-requires">
                <h4>Điều kiện</h4>
                {tech.requires.map((req) => (
                  <button
                    key={req}
                    className={done.includes(req) ? 'met' : ''}
                    onClick={() => focus(req)}
                  >
                    {done.includes(req) ? <Check size={13} /> : <LockKeyhole size={12} />}
                    <span>{TECHNOLOGIES[req].name}</span>
                    {TECHNOLOGIES[req].branch !== tech.branch && (
                      <small>{BRANCHES[TECHNOLOGIES[req].branch]}</small>
                    )}
                  </button>
                ))}
              </section>
            )}
            {leadsTo.length > 0 && (
              <section className="rt-leads">
                <h4>Dẫn tới</h4>
                <div>
                  {leadsTo.map((t) => (
                    <button key={t.id} onClick={() => focus(t.id)}>
                      {t.name}
                      <ArrowRight size={11} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <details className="rt-why">
              <summary>Vì sao có điều kiện này?</summary>
              <p>{TECHNOLOGY_LOGIC[selected]}</p>
            </details>
          </div>
          <footer className="rt-inspector-footer">
            {action ? (
              <button
                className="rt-start"
                aria-label={`Nghiên cứu ${TECHNOLOGIES[action.id].name}`}
                onClick={() => onResearch(action.id)}
              >
                <Sparkles size={15} />
                {action.label}
              </button>
            ) : (
              <button className={`rt-start ${status.kind}`} disabled>
                {blocked}
              </button>
            )}
          </footer>
        </aside>
      </div>
    </section>
  );
}
