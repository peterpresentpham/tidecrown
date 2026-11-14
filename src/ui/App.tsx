import './v2.css';

import {
  ArrowRight,
  BookOpen,
  Castle,
  ChevronRight,
  Coins,
  Flag,
  Focus,
  Footprints,
  Heart,
  HelpCircle,
  Minus,
  Mountain,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  SkipForward,
  Swords,
  Trees,
  Wheat,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TECHNOLOGIES, type TechnologyId, UNIT_TECH } from '../data/technologies';
import { advanceAttack, type AttackPlan, planAttack } from '../game/actionPlan';
import {
  affordable,
  cityAt,
  type Command,
  createGame,
  economy,
  execute,
  FACTIONS,
  FOUND_COST,
  foundingReason,
  improvementReason,
  previewAttack,
  reachable,
  recruitTiles,
  type State,
  statsFor,
  tileAt,
  unitAt,
  unitLockReason,
  UNITS,
  type UnitType,
} from '../game/engine';
import { DIFFICULTIES, type GameSettings } from '../game/map';
import { visibleThreats } from '../game/threats';
import { type MoveUndo, moveUndo, undoMove } from '../game/undo';
import { isExplored, isVisible, observe } from '../game/visibility';
import { BACKUP_KEY, loadGame, SAVE_KEY } from '../persistence/save';
import { World } from '../render/World';
import { legalUnitTargets } from './actionReasons';
import { runScheduledAIStep } from './aiTurnStep';
import { CityPanel } from './CityPanel';
import { requiresConfirmation } from './interaction';
import { NewGameSetup } from './NewGameSetup';
import {
  aiDecisionDelayMs,
  busyFallbackMs,
  busyWatchdogMs,
  loadUIPreferences,
  saveUIPreferences,
  type UIPreferences,
} from './playbackPolicy';
import { ResearchPanel } from './ResearchPanel';
import { type TargetAction, UnitActions } from './UnitActions';
import { iconFor } from './UnitIcon';
import { VisualSettingsMenu } from './VisualSettingsMenu';

const terrainNames = {
  grass: 'Đồng bằng',
  forest: 'Rừng',
  hill: 'Đồi',
  mountain: 'Núi',
  sand: 'Bờ cát',
  water: 'Biển',
  unknown: 'Chưa khám phá',
};
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)'),
      update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
function usePageHidden() {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}
function initialState() {
  try {
    const loaded = loadGame(localStorage);
    return { ...loaded, hadSave: !!loaded.state, state: loaded.state ?? createGame() };
  } catch {
    return {
      hadSave: false,
      state: createGame(),
      canSave: false,
      warning: 'Trình duyệt không cho phép tự lưu. Bạn vẫn có thể chơi ván này.',
    };
  }
}
export function App() {
  const [initial] = useState(initialState);
  const [state, setState] = useState<State>(initial.state);
  const [canSave, setCanSave] = useState(initial.canSave);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => state.units.find((u) => u.owner === 'player')?.id ?? null
  );
  const [cityId, setCityId] = useState<string | null>(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [technologyFocus, setTechnologyFocus] = useState<TechnologyId>('basic_agriculture');
  const [targetAction, setTargetAction] = useState<TargetAction | null>(null);
  // Id of the visible action event whose animation still holds the UI; null when idle.
  const [busyEvent, setBusyEvent] = useState<number | null>(null);
  const [showDanger, setShowDanger] = useState(false);
  const [undo, setUndo] = useState<MoveUndo | null>(null);
  const [pendingTile, setPendingTile] = useState<{ id: string; city?: boolean } | null>(null);
  const touch = useRef(false);
  const [confirmActions, setConfirmActions] = useState(false);
  const [aiSummary, setAiSummary] = useState<Array<{ id: number; tile: string; text: string }>>([]);
  const summarySeen = useRef<number>(state.serial);
  const [attackPlan, setAttackPlan] = useState<AttackPlan | null>(null);
  const busy = busyEvent !== null || attackPlan !== null;
  const finishedEvent = useRef<number | undefined>(undefined);
  const [preferences, setPreferences] = useState<UIPreferences>(() => loadUIPreferences(storage()));
  const reducedMotion = useReducedMotion(),
    pageHidden = usePageHidden();
  const playback = { aiSpeed: preferences.aiSpeed, reducedMotion };
  const [hovered, setHovered] = useState<string | null>(null);
  const [founding, setFounding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [restart, setRestart] = useState(!initial.hadSave);
  const started = useRef(initial.hadSave);
  const [worldGeneration, setWorldGeneration] = useState(0);
  const [notice, setNotice] = useState<string | null>(initial.warning);
  const [storageError, setStorageError] = useState(!initial.canSave);
  const [renderError, setRenderError] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    world = useRef<World | null>(null);
  const clickRef = useRef<(tile: string, city?: boolean) => void>(() => {});
  const view = useMemo(() => observe(state, 'player'), [state]);
  const seenEnemyIds = useRef(
    new Set(view.units.filter((u) => u.owner !== 'player').map((u) => u.id))
  );
  const unit = view.units.find((u) => u.id === selectedId);
  const city = view.cities.find((c) => c.id === cityId);
  const cityRemembered = !!city && !isVisible(state, 'player', city.tile);
  const army = state.units.filter((u) => u.owner === 'player');
  const yourTurn = state.turn === 'player' && !state.winner;
  const ledger = useMemo(() => economy(state, 'player'), [state]);
  const inc = ledger.net;
  const unitStats = unit ? statsFor(state, unit) : null;
  const activeResearch = state.research.player;
  const lastResearch = useRef(state.research.player);
  function openResearch(id?: TechnologyId) {
    if (id) setTechnologyFocus(id);
    setResearchOpen(true);
    setCityId(null);
    setFounding(false);
    setMenu(false);
    setHelp(false);
  }
  const actionTiles = useMemo(
    () =>
      targetAction?.type === 'improve'
        ? state.tiles
            .filter((t) => !improvementReason(state, { ...targetAction, tile: t.id }))
            .map((t) => t.id)
        : targetAction
          ? legalUnitTargets(state, targetAction)
          : founding
            ? state.tiles.filter((t) => !foundingReason(state, t.id)).map((t) => t.id)
            : [],
    [state, founding, targetAction]
  );
  const hoverPlan = useMemo(
    () => (unit && hovered && yourTurn ? planAttack(state, unit.id, hovered) : null),
    [state, unit?.id, hovered, yourTurn]
  );
  const hoverPreview =
    hoverPlan?.preview ??
    (unit && hovered && yourTurn ? previewAttack(state, unit, hovered) : null);
  useEffect(() => {
    if (!attackPlan || restart || pageHidden || researchOpen || busyEvent !== null) return;
    if (view.event && finishedEvent.current !== view.event.id) return;
    const result = advanceAttack(state, attackPlan);
    setAttackPlan(result.next);
    if (result.state !== state) setState(result.state);
    if (result.reason) setNotice(result.reason);
  }, [state, attackPlan, busyEvent, restart, pageHidden, researchOpen]);

  function command(cmd: Command) {
    if (!yourTurn || restart || busy) return false;
    const result = execute(state, cmd);
    if (result.error) {
      setNotice(result.error);
      return false;
    }
    setUndo(moveUndo(state, result.state, cmd));
    setPendingTile(null);
    setState(result.state);
    if (cmd.type === 'attack') setNotice(result.state.logs[0]);
    return true;
  }
  function selectUnit(id: string, focus = true) {
    const u = view.units.find((u) => u.id === id);
    if (!u) return;
    setSelectedId(id);
    setCityId(null);
    setTargetAction(null);
    setFounding(false);
    setResearchOpen(false);
    setPendingTile(null);
    if (focus) world.current?.focus(u.tile);
  }
  function nextUnit() {
    const active = army.filter((u) => !u.acted);
    const list = active.length ? active : army;
    const next = list[(list.findIndex((u) => u.id === selectedId) + 1) % list.length];
    if (next) selectUnit(next.id);
  }
  const selectTile = (id: string, isCityLabel?: boolean) => {
    if (busy || restart) return;
    setMenu(false);
    setHelp(false);
    if (targetAction && yourTurn) {
      let cmd: Command;
      if (targetAction.type === 'board')
        cmd = { type: 'board', unit: targetAction.unit, ship: unitAt(view, id)?.id ?? '' };
      else if (targetAction.type === 'improve') cmd = { ...targetAction, tile: id };
      else cmd = { type: targetAction.type as 'support' | 'land', unit: targetAction.unit, to: id };
      if (command(cmd)) setTargetAction(null);
      return;
    }
    if (founding && yourTurn) {
      const result = execute(state, { type: 'found', tile: id });
      if (result.error) setNotice(result.error);
      else {
        setState(result.state);
        setFounding(false);
        setCityId(cityAt(result.state, id)?.id ?? null);
        setSelectedId(null);
        setNotice('Thành mới hoàn tất ở lượt sau.');
      }
      return;
    }
    if (!isExplored(state, 'player', id)) {
      setNotice('Vùng chưa khám phá. Đưa quân tới gần để mở tầm nhìn.');
      return;
    }
    const targetUnit = unitAt(view, id),
      targetCity = cityAt(view, id);
    if (!isVisible(state, 'player', id)) {
      if (targetCity) {
        setCityId(targetCity.id);
        setSelectedId(null);
        setResearchOpen(false);
      } else setNotice('Vùng đã khám phá nhưng đang ngoài tầm nhìn.');
      return;
    }
    // The same direct action applies to the model, its badge, or its city label.
    if (
      unit?.owner === 'player' &&
      yourTurn &&
      (!unit.acted || (UNITS[unit.type].mobileShot && unit.moves > 0)) &&
      id !== unit.tile
    ) {
      const p = previewAttack(state, unit, id);
      if (p.legal) {
        command({ type: 'attack', unit: unit.id, to: id });
        setCityId(null);
        return;
      }
      if (!isCityLabel && reachable(state, unit).has(id)) {
        command({ type: 'move', unit: unit.id, to: id });
        setCityId(null);
        return;
      }
      if (
        (targetUnit && targetUnit.owner !== 'player') ||
        (targetCity && targetCity.owner !== 'player')
      ) {
        const plan = planAttack(state, unit.id, id);
        if (plan) {
          const result = advanceAttack(state, plan);
          setState(result.state);
          setAttackPlan(result.next);
          setCityId(null);
          if (result.reason) setNotice(result.reason);
          return;
        }
        setNotice(
          p.reason === 'Mục tiêu ngoài tầm đánh.'
            ? 'Mục tiêu còn xa. Chọn ô xanh để đi tới gần trước.'
            : p.reason
        );
        return;
      }
    }
    if (targetCity && (isCityLabel || !targetUnit)) {
      setResearchOpen(false);
      setCityId(targetCity.id);
      setSelectedId(null);
    } else if (targetUnit) selectUnit(targetUnit.id, false);
    else {
      setCityId(null);
      setSelectedId(null);
    }
  };
  clickRef.current = (id, cityLabel) => {
    const target = unitAt(view, id),
      c = cityAt(view, id);
    const action = requiresConfirmation(
      !!targetAction || founding,
      unit?.owner === 'player',
      id === unit?.tile,
      target?.owner === 'player',
      c?.owner === 'player',
      !!cityLabel
    );
    if ((touch.current || confirmActions) && yourTurn && action && !busy && !restart) {
      setPendingTile({ id, city: cityLabel });
      setHovered(id);
      return;
    }
    setPendingTile(null);
    selectTile(id, cityLabel);
  };
  useEffect(() => {
    const events = view.events ?? (view.event ? [view.event] : []);
    const entries = events
      .filter(
        (e) =>
          e.id > summarySeen.current &&
          e.owner !== 'player' &&
          (['attack', 'land'].includes(e.kind) ||
            (e.kind === 'move' &&
              !seenEnemyIds.current.has(e.actor || unitAt(view, e.to)?.id || '')))
      )
      .map((e) => ({
        id: e.id,
        tile: e.to,
        text:
          e.kind === 'land'
            ? 'Địch đổ bộ'
            : e.kind === 'move'
              ? 'Phát hiện quân địch'
              : !e.damage && !e.fortDamage
                ? 'Địch chiếm thành/làng'
                : `Giao chiến: −${e.damage} HP${e.fortDamage ? ` · −${e.fortDamage} công sự` : ''}${e.dead?.length ? ' · có quân bị hạ' : ''}`,
      }));
    for (const u of view.units) if (u.owner !== 'player') seenEnemyIds.current.add(u.id);
    summarySeen.current = Math.max(summarySeen.current, state.serial);
    if (entries.length) setAiSummary((old) => [...entries, ...old].slice(0, 12));
  }, [state, view]);
  function visualEnded(id: number) {
    finishedEvent.current = id;
    setBusyEvent((current) => (current === id ? null : current));
  }
  // Declared before the World is created/synced: the busy lock must be decided before World can report an end.
  const lastVisual = useRef((view.events ?? (view.event ? [view.event] : [])).at(-1)?.id);
  useEffect(() => {
    const id = (view.events ?? (view.event ? [view.event] : [])).at(-1)?.id;
    if (lastVisual.current === id) return;
    lastVisual.current = id;
    // Events outside the player's observation are not replayed and do not hold the UI.
    if (id === undefined || finishedEvent.current === id) {
      setBusyEvent(null);
      return;
    }
    setBusyEvent(id);
  }, [state.event?.id]);
  useEffect(() => {
    // Watchdog (with renderer) or plain wait (without renderer). Paused while the tab is hidden, since frames stop too.
    if (busyEvent === null || pageHidden) return;
    const owner = state.event?.owner,
      ms =
        world.current && !renderError
          ? busyWatchdogMs(playback, owner) * Math.max(1, view.events?.length ?? 1)
          : busyFallbackMs(playback, owner) * Math.max(1, view.events?.length ?? 1);
    const timer = setTimeout(() => visualEnded(busyEvent), ms);
    return () => clearTimeout(timer);
  }, [busyEvent, pageHidden, renderError]);
  useEffect(() => {
    if (!host.current) return;
    let debugHook: object | undefined;
    try {
      world.current = new World(
        host.current,
        state,
        (id, city) => clickRef.current(id, city),
        setHovered,
        { ...playback, quality: preferences.graphics, onVisualEnd: visualEnded }
      );
      // Measurement hook for tests/perf (opt-in by URL); exposes read-only diagnostics, not game state.
      if (new URLSearchParams(location.search).has('debug-world')) {
        const w = world.current;
        debugHook = {
          diagnostics: () => w.diagnostics(),
          visualSettings: () => w.visualSettings(),
          isAnimating: () => w.isAnimating(),
        };
        (window as unknown as { __nationWorld?: object }).__nationWorld = debugHook;
      }
    } catch {
      setRenderError(true);
    }
    return () => {
      const debugWindow = window as unknown as { __nationWorld?: object };
      if (debugHook && debugWindow.__nationWorld === debugHook) delete debugWindow.__nationWorld;
      world.current?.dispose();
      world.current = null;
    };
  }, [worldGeneration]);
  useEffect(() => {
    world.current?.setVisualSettings({
      quality: preferences.graphics,
      aiSpeed: preferences.aiSpeed,
      reducedMotion,
    });
  }, [preferences.graphics, preferences.aiSpeed, reducedMotion, worldGeneration]);
  useEffect(() => {
    world.current?.sync(
      state,
      unit?.id ?? null,
      city?.tile ?? unit?.tile ?? null,
      false,
      actionTiles
    );
  }, [state, unit?.id, unit?.tile, city?.tile, actionTiles, worldGeneration]);
  const danger = useMemo(
    () => (showDanger ? visibleThreats(state) : { current: [], potential: [] }),
    [state, showDanger]
  );
  useEffect(() => {
    world.current?.setDanger(danger.current, danger.potential);
  }, [danger, worldGeneration]);
  useEffect(() => {
    world.current?.setPreviewPath(hoverPlan?.path ?? []);
  }, [hoverPlan, worldGeneration]);
  useEffect(() => {
    world.current?.setPaused(researchOpen || restart);
  }, [researchOpen, restart, worldGeneration]);
  useEffect(() => {
    if (restart) return;
    if (!canSave) {
      setStorageError(true);
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state, canSave, restart]);
  useEffect(() => {
    const before = lastResearch.current;
    if (before && !state.research.player && state.technologies.player.includes(before.technology))
      setNotice(`Đã hoàn tất ${TECHNOLOGIES[before.technology].name}.`);
    lastResearch.current = state.research.player;
  }, [state]);
  useEffect(() => {
    // One pending AI timer at most: any change below clears it before a new one is scheduled.
    if (state.turn === 'player' || state.winner || restart || busy || pageHidden) return;
    const timer = setTimeout(
      () => {
        if (!document.hidden) setState((current) => runScheduledAIStep(current, state));
      },
      aiDecisionDelayMs(playback, !!view.event)
    );
    return () => clearTimeout(timer);
  }, [state, restart, busy, pageHidden, preferences.aiSpeed]);
  function updatePreferences(change: Partial<UIPreferences>) {
    const next = { ...preferences, ...change };
    setPreferences(next);
    if (!saveUIPreferences(storage(), next))
      setNotice(
        'Không lưu được cài đặt trên trình duyệt này; cài đặt vẫn áp dụng cho phiên hiện tại.'
      );
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPendingTile(null);
        setAttackPlan(null);
        setTargetAction(null);
        setResearchOpen(false);
        setCityId(null);
        setFounding(false);
        setHelp(false);
        setMenu(false);
        if (started.current) setRestart(false);
      }
      if (
        e.code === 'Tab' &&
        !researchOpen &&
        !restart &&
        !menu &&
        !help &&
        !(e.target as HTMLElement).closest('button,input,select,textarea,summary,[contenteditable]')
      ) {
        e.preventDefault();
        nextUnit();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  function recruit(type: UnitType) {
    if (!city || busy || !yourTurn) return;
    const locked = unitLockReason(state, 'player', type);
    if (locked) {
      openResearch(UNIT_TECH[type]);
      return;
    }
    const destination = recruitTiles(state, city, type)[0];
    if (!destination) {
      setNotice('Không có ô trống cạnh thành.');
      return;
    }
    const result = execute(state, {
      type: 'recruit',
      city: city.id,
      unitType: type,
      to: destination.id,
    });
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setState(result.state);
    setSelectedId(result.state.units.at(-1)!.id);
    setCityId(null);
    setNotice('Đã tuyển quân xanh lam. Quân mới đi được từ lượt sau.');
  }
  function newGame(
    settings: Pick<GameSettings, 'seed' | 'difficulty' | 'aiCount'> & { map?: 'random' | 'water' }
  ) {
    if (started.current)
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
      } catch {
        // Backup is best-effort; the new game still starts without it.
      }
    setUndo(null);
    setPendingTile(null);
    setAiSummary([]);
    seenEnemyIds.current = new Set();
    const s = createGame(settings);
    summarySeen.current = s.serial;
    setAttackPlan(null);
    started.current = true;
    setCanSave(true);
    setTechnologyFocus('basic_agriculture');
    setState(s);
    setSelectedId(s.units[0].id);
    setCityId(null);
    setRestart(false);
    setMenu(false);
    setHelp(false);
    setFounding(false);
    setResearchOpen(false);
    setHovered(null);
    setNotice(null);
    setTargetAction(null);
    setBusyEvent(null);
    finishedEvent.current = undefined;
    lastVisual.current = s.event?.id;
    setRenderError(false);
    setWorldGeneration((n) => n + 1);
  }

  const status =
    notice ??
    (busy
      ? 'Đang thực hiện hành động…'
      : targetAction
        ? targetAction.type === 'improve'
          ? 'Chọn ô vàng để cải tạo · Esc để hủy'
          : targetAction.type === 'support'
            ? 'Chọn đồng minh bị thương hoặc thành hỏng · Esc để hủy'
            : targetAction.type === 'board'
              ? 'Chọn tàu vận tải kề bên · Esc để hủy'
              : 'Chọn ô bờ trống kề tàu · Esc để hủy'
        : yourTurn && inc.food < 0
          ? `Lương ${inc.food}/lượt, còn ${state.resources.player.food}. Phát triển nông nghiệp hoặc chiếm thêm làng.`
          : founding
            ? 'Chọn ô vàng để xây thành · Esc để hủy'
            : !yourTurn
              ? `${FACTIONS[state.turn].name} đang đi${preferences.aiSpeed === 'fast' ? ' · tốc độ nhanh' : ''}…`
              : unit && unit.owner !== 'player'
                ? `Quân ${FACTIONS[unit.owner].short.toLowerCase()} là đối thủ · Chọn quân xanh lam để điều khiển`
                : unit?.acted
                  ? 'Đơn vị đã hành động · Bấm Kết lượt để tiếp tục'
                  : unit?.owner === 'player'
                    ? unit.moves === 0
                      ? 'Hết bước di chuyển · Có thể đánh mục tiêu viền đỏ hoặc kết lượt'
                      : 'Tiến về vùng đen để khám phá · Chọn ô xanh để đi'
                    : 'Chọn lính xanh để đi · Chọn thành để tuyển quân');

  return (
    <main
      className={`game-screen${pendingTile ? ' confirming' : ''}${city ? ' managing-city' : ''}${unit?.owner === 'player' ? ' selecting-unit' : ''}`}
    >
      <div
        className="world"
        ref={host}
        onPointerDownCapture={(e) => {
          touch.current = e.pointerType === 'touch';
        }}
      />
      {renderError && (
        <div className="render-error">
          Không mở được đồ họa 3D. Hãy bật tăng tốc phần cứng hoặc dùng trình duyệt hỗ trợ WebGL 2.
        </div>
      )}
      <header className="resources" aria-label="Tài nguyên của bạn">
        {(
          [
            { key: 'gold', Icon: Coins, label: 'Vàng' },
            { key: 'food', Icon: Wheat, label: 'Lương' },
            { key: 'wood', Icon: Trees, label: 'Gỗ' },
            { key: 'stone', Icon: Mountain, label: 'Đá' },
          ] as const
        ).map(({ key, Icon, label }) => (
          <div
            className={`resource ${key}`}
            key={key}
            aria-label={`${label}: ${state.resources.player[key]}, ròng ${inc[key]}/lượt`}
            title={`${label}: sản xuất +${ledger.production[key]}, duy trì −${ledger.upkeep[key]}, ròng ${inc[key]}/lượt`}
          >
            <Icon size={29} strokeWidth={2} />
            <div>
              <strong>{state.resources.player[key]}</strong>
              <small className={inc[key] < 0 ? 'negative' : ''}>
                {inc[key] >= 0 ? '+' : ''}
                {inc[key]}
              </small>
            </div>
          </div>
        ))}
      </header>
      <div className="player-identity">
        <span className="blue-flag">
          <Flag size={16} fill="currentColor" />
        </span>
        <div>
          <strong>BẠN · XANH LAM</strong>
          <span>
            {state.cities.filter((c) => c.owner === 'player').length} thành · {army.length} lính
          </span>
        </div>
      </div>
      <div className="top-buttons">
        <button
          className="round-button"
          aria-label="Về quân của bạn"
          title="Về quân của bạn"
          onClick={() => {
            const u = army.find((u) => !u.acted) ?? army[0];
            world.current?.resetCamera();
            if (u) selectUnit(u.id);
          }}
        >
          <Focus size={20} />
        </button>
        <button
          className={`round-button ${menu ? 'active' : ''}`}
          aria-label="Menu"
          title="Menu"
          aria-expanded={menu}
          onClick={() => {
            if (!menu) {
              setCityId(null);
              setResearchOpen(false);
              setTargetAction(null);
              setFounding(false);
            }
            setMenu(!menu);
            setHelp(false);
          }}
        >
          <Settings size={20} />
        </button>
      </div>
      {menu && (
        <div className="small-menu">
          <button
            onClick={() => {
              setHelp(true);
              setMenu(false);
              setResearchOpen(false);
            }}
          >
            <HelpCircle size={16} />
            Cách chơi
          </button>
          <button
            onClick={() => {
              setRestart(true);
              setMenu(false);
            }}
          >
            <RotateCcw size={16} />
            Ván mới
          </button>
          <label className="confirm-setting">
            <input
              type="checkbox"
              checked={confirmActions}
              onChange={(e) => setConfirmActions(e.target.checked)}
            />
            Xác nhận trước khi đi/đánh
          </label>
          <VisualSettingsMenu
            preferences={preferences}
            reducedMotion={reducedMotion}
            onChange={updatePreferences}
          />
          <span>
            {DIFFICULTIES[state.settings.difficulty].name} · {state.settings.aiCount} AI
            <br />
            Mã: {state.settings.seed}
          </span>
          <span>
            Chuột phải: kéo bản đồ
            <br />
            Cuộn: zoom · Q/E: xoay
          </span>
          {storageError && <span className="negative">Không thể tự lưu trên trình duyệt này.</span>}
        </div>
      )}
      {help && (
        <div className="help-card">
          <button className="close" aria-label="Đóng hướng dẫn" onClick={() => setHelp(false)}>
            <X size={17} />
          </button>
          <h2>Chơi như thế nào?</h2>
          <p>
            <b>1.</b> Lính <em>xanh lam</em> là của bạn. Chọn lính rồi chọn ô xanh để đi.
          </p>
          <p>
            <b>2.</b> Vùng đen chưa khám phá; vùng tối đã đi qua nhưng ngoài tầm nhìn. Đi tới gần để
            tìm làng và quân địch. Chọn làng trống viền đỏ để chiếm.
          </p>
          <p>
            <b>3.</b> Chọn thành của bạn để tuyển thêm quân hoặc nâng cấp.
          </p>
          <p>
            <b>4.</b> Mở biểu tượng sách để nghiên cứu: nuôi quân, mở vũ khí hoặc chuyên môn hóa.
            Mỗi loại quân có giá và duy trì riêng; 45 công nghệ đều mở được trong cùng ván.
          </p>
          <p>
            Chọn địch để xem đường đi–đánh và HP dự kiến; trên cảm ứng bấm Xác nhận. Đi vào ô kề
            quân cận chiến địch sẽ hết bước nhưng vẫn đánh được. Quân bị thương có thể Nghỉ ở nơi
            không kề địch.
          </p>
          <p>
            <b>5.</b> Bấm <b>Kết lượt</b> khi đã đi xong. Các AI cũng đánh lẫn nhau. Chiếm hết thành
            đối thủ để thắng.
          </p>
        </div>
      )}
      <div className="camera-buttons">
        <button
          className="round-button"
          aria-label="Phóng to"
          title="Phóng to"
          onClick={() => world.current?.zoom(1.15)}
        >
          <Plus size={20} />
        </button>
        <button
          className="round-button"
          aria-label="Thu nhỏ"
          title="Thu nhỏ"
          onClick={() => world.current?.zoom(1 / 1.15)}
        >
          <Minus size={20} />
        </button>
      </div>
      {city && (
        <CityPanel
          state={view}
          city={city}
          remembered={cityRemembered}
          onClose={() => setCityId(null)}
          onRecruit={recruit}
          onResearch={openResearch}
          onCommand={command}
          onImprove={(id) => {
            setTargetAction({ type: 'improve', city: city.id, improvement: id });
            setCityId(null);
          }}
        />
      )}
      {unit?.owner === 'player' && !city && !researchOpen && (
        <UnitActions
          state={state}
          unit={unit}
          busy={busy}
          onCommand={command}
          onTarget={setTargetAction}
          onSelect={selectUnit}
        />
      )}
      {researchOpen && (
        <ResearchPanel
          state={state}
          selected={technologyFocus}
          onSelect={setTechnologyFocus}
          onClose={() => setResearchOpen(false)}
          onResearch={(id) => {
            if (command({ type: 'research', technology: id })) {
              setResearchOpen(false);
              setNotice(`Bắt đầu ${TECHNOLOGIES[id].name}: ${TECHNOLOGIES[id].turns} lượt.`);
            }
          }}
        />
      )}
      {activeResearch && !researchOpen && (
        <button
          className="research-pill"
          aria-label="Xem tiến độ nghiên cứu"
          onClick={() => openResearch(activeResearch.technology)}
        >
          <BookOpen size={15} />
          <span>{TECHNOLOGIES[activeResearch.technology].name}</span>
          <b>{activeResearch.remaining} lượt</b>
          <i
            style={{
              width: `${(1 - activeResearch.remaining / TECHNOLOGIES[activeResearch.technology].turns) * 100}%`,
            }}
          />
        </button>
      )}
      <div className={`status-line ${notice ? 'notification' : ''}`} role="status">
        {hoverPreview?.legal ? (
          <>
            <Swords size={15} />
            {hoverPreview.capture
              ? 'Chọn để chiếm làng'
              : `${hoverPlan?.path.length ? `Đi ${hoverPlan.path.length} ô rồi đánh · ` : ''}Gây ${hoverPreview.damage} HP${hoverPreview.fortDamage ? ` · Phá ${hoverPreview.fortDamage} công sự` : ''}${hoverPreview.retaliation ? ` · Phản kích ${hoverPreview.retaliation} HP` : ''}`}
          </>
        ) : (
          <>
            {state.turn !== 'player' ? <span className="thinking" /> : <ChevronRight size={15} />}{' '}
            {status}
          </>
        )}
      </div>
      {hoverPreview?.legal && !city && !researchOpen && (
        <aside className="combat-preview" aria-label="Dự báo giao chiến">
          <div>
            <b>Quân của bạn</b>
            <span>
              HP {unit?.hp} → {hoverPreview.attackerHP}
            </span>
            <small>Phản kích {hoverPreview.retaliation}</small>
          </div>
          <div>
            <b>{hoverPreview.capture ? 'Chiếm thành' : 'Mục tiêu'}</b>
            <span>
              {hoverPreview.defenderHP === null
                ? `Công sự −${hoverPreview.fortDamage}`
                : `HP ${unitAt(view, hovered!)?.hp} → ${hoverPreview.defenderHP}`}
            </span>
            <small>Gây {hoverPreview.damage} HP</small>
          </div>
        </aside>
      )}
      {(founding || targetAction?.type === 'improve') &&
        hovered &&
        isVisible(view, 'player', hovered) && (
          <aside className="build-preview">
            <b>
              {terrainNames[tileAt(view, hovered).terrain]} · {hovered}
            </b>
            <span>
              {founding
                ? (foundingReason(state, hovered) ??
                  'Có thể xây thành · 45 vàng, 20 lương, 30 gỗ, 15 đá · hoàn tất lượt sau')
                : (improvementReason(state, {
                    ...(targetAction as Extract<TargetAction, { type: 'improve' }>),
                    tile: hovered,
                  }) ?? 'Ô hợp lệ · xây xong có hiệu lực ngay')}
            </span>
          </aside>
        )}
      {pendingTile && (
        <div className="touch-confirm" role="group" aria-label="Xác nhận thao tác">
          <span>
            {hoverPreview?.legal
              ? hoverPreview.capture
                ? 'Chiếm thành'
                : 'Tấn công'
              : targetAction
                ? 'Thực hiện lệnh'
                : founding
                  ? 'Xây thành'
                  : 'Di chuyển'}{' '}
            · {pendingTile.id}
          </span>
          <button
            disabled={busy}
            onClick={() => {
              const p = pendingTile;
              setPendingTile(null);
              selectTile(p.id, p.city);
            }}
          >
            Xác nhận
          </button>
          <button
            onClick={() => {
              setPendingTile(null);
              setHovered(null);
            }}
          >
            Hủy
          </button>
        </div>
      )}
      <button
        className="danger-toggle"
        aria-pressed={showDanger}
        onClick={() => setShowDanger((v) => !v)}
      >
        Vùng nguy hiểm{showDanger ? ' ✓' : ''}
      </button>
      {showDanger && (
        <small className="danger-legend">
          Đỏ: tầm hiện tại · Cam: có thể đi rồi đánh.
          <br />
          Chỉ tính địch đã thấy; vùng khác vẫn có thể nguy hiểm.
        </small>
      )}
      {undo?.after === state && !busy && yourTurn && (
        <button
          className="undo-move"
          onClick={() => {
            const previous = undoMove(state, undo);
            if (previous) {
              finishedEvent.current = undefined;
              setState(previous);
              setUndo(null);
              setNotice('Đã hoàn tác di chuyển.');
            }
          }}
        >
          ↶ Hoàn tác đi
        </button>
      )}
      {aiSummary.length > 0 && !city && !researchOpen && (
        <details className="ai-summary">
          <summary>Diễn biến đã thấy · {aiSummary.length}</summary>
          <button onClick={() => setAiSummary([])}>Xóa tóm tắt</button>
          {aiSummary.map((e) => (
            <button key={e.id} onClick={() => world.current?.focus(e.tile)}>
              {e.text} · {e.tile}
            </button>
          ))}
        </details>
      )}
      <footer className="bottom-hud">
        <section className="unit-hud" aria-label="Quân đang chọn">
          {unit ? (
            <>
              <button
                className={`unit-portrait ${unit.owner}`}
                title="Đến vị trí quân đang chọn"
                aria-label="Đến vị trí quân đang chọn"
                onClick={() => {
                  world.current?.resetCamera();
                  world.current?.focus(unit.tile);
                }}
              >
                {(() => {
                  const Icon = iconFor(unit.type);
                  return <Icon size={31} />;
                })()}
              </button>
              <div className="unit-title">
                <strong>{UNITS[unit.type].name}</strong>
                <span className={unit.owner}>
                  {unit.owner === 'player' ? 'QUÂN CỦA BẠN' : 'QUÂN ĐỐI THỦ'}
                  {unit.acted ? ' · ĐÃ ĐI' : ''}
                </span>
              </div>
              <div className="unit-stats">
                <span title="Sinh lực">
                  <Heart size={20} />
                  <b>
                    {unit.hp}/{UNITS[unit.type].hp}
                  </b>
                </span>
                <span title="Công cơ bản · sát thương sau phòng thủ còn nhân 60–100% theo HP">
                  <Swords size={20} />
                  <b>{unitStats!.attack}</b>
                </span>
                <span title="Giáp">
                  <Shield size={20} />
                  <b>{unitStats!.armor}</b>
                </span>
                <span title="Bước di chuyển còn lại">
                  <Footprints size={20} />
                  <b>{unit.moves}</b>
                </span>
              </div>
            </>
          ) : (
            <div className="no-unit">
              <Shield size={23} />
              Chọn lính xanh lam của bạn
            </div>
          )}
        </section>
        <div className="turn-controls">
          <button
            className="round-button next-unit"
            title="Chọn lính chưa hành động tiếp theo"
            aria-label="Lính tiếp theo"
            onClick={nextUnit}
            disabled={!army.length}
          >
            <SkipForward size={19} />
          </button>
          <button
            className={`round-button found-button ${founding ? 'active' : ''}`}
            title="Xây thành mới gần quân của bạn"
            aria-label="Xây thành mới"
            disabled={!yourTurn || !affordable(state.resources.player, FOUND_COST)}
            onClick={() => {
              setFounding(!founding);
              setCityId(null);
              setResearchOpen(false);
            }}
          >
            <Castle size={20} />
          </button>
          <button
            className={`round-button research-button ${researchOpen ? 'active' : ''}`}
            title="Nghiên cứu"
            aria-label="Nghiên cứu"
            onClick={() => (researchOpen ? setResearchOpen(false) : openResearch())}
          >
            <BookOpen size={20} />
          </button>
          <button
            className="end-turn"
            aria-label="Kết lượt"
            disabled={!yourTurn || busy}
            onClick={() => {
              setFounding(false);
              setTargetAction(null);
              setCityId(null);
              setNotice(null);
              command({ type: 'end' });
            }}
          >
            <span>
              <small>LƯỢT {state.round}</small>
              {yourTurn ? 'Kết lượt' : 'Đang đi…'}
            </span>
            <ArrowRight size={25} />
          </button>
        </div>
      </footer>
      {!activeResearch && (
        <div className="map-coordinate">
          {hovered
            ? `${terrainNames[tileAt(view, hovered).terrain]} · ${hovered}`
            : 'Đen: chưa khám phá · Tối: ngoài tầm nhìn'}
        </div>
      )}
      {restart && (
        <NewGameSetup
          defaults={state.settings}
          canCancel={started.current}
          onCancel={() => setRestart(false)}
          onStart={newGame}
        />
      )}
      {state.winner && !restart && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <h2 id="dialog-title">
              {state.winner === 'player' ? 'Bạn đã chiến thắng!' : 'Vương quốc đã thất thủ'}
            </h2>
            <p>
              {state.winner === 'player'
                ? 'Bạn đã chinh phục tất cả vương quốc đối địch.'
                : `${FACTIONS[state.winner].name} đã chiếm thành cuối cùng của bạn.`}
            </p>
            <div>
              <button className="confirm" onClick={() => setRestart(true)}>
                Thiết lập ván mới
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        Lượt {state.round}, {FACTIONS[state.turn].name}
      </div>
    </main>
  );
}
