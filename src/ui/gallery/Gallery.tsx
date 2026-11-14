import './gallery.css';

import { useEffect, useMemo, useRef, useState } from 'react';

import { type FactionId, FACTIONS, type State, UNITS, type UnitType } from '../../game/engine';
import { World } from '../../render/World';
import type { GraphicsQuality } from '../playbackPolicy';
import { type Action, animate, buildScene, type Scene, type SceneId, UNIT_TYPES } from './scenes';

const TABS: { id: SceneId; label: string }[] = [
  { id: 'units', label: 'Quân lính' },
  { id: 'animation', label: 'Hoạt ảnh' },
  { id: 'terrain', label: 'Cảnh quan' },
  { id: 'cities', label: 'Thành & công trình' },
];
const ACTIONS: { id: Action; label: string; when?: (type: UnitType) => boolean }[] = [
  { id: 'move', label: 'Di chuyển' },
  { id: 'attack', label: 'Tấn công', when: (t) => UNITS[t].attack > 0 },
  { id: 'retaliate', label: 'Bị phản đòn', when: (t) => UNITS[t].attack > 0 },
  { id: 'kill', label: 'Hạ gục mục tiêu', when: (t) => UNITS[t].attack > 0 },
  {
    id: 'support',
    label: 'Chữa / sửa',
    when: (t) => t === 'paladin' || t === 'engineer',
  },
];
const FACTION_IDS: FactionId[] = ['player', 'enemy', 'enemy2', 'enemy3'];

/** /gallery: browse units, action animations, terrain and cities with the real renderer. */
export function Gallery() {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const current = useRef<State | null>(null);
  const restore = useRef<number | undefined>(undefined);
  const [tab, setTab] = useState<SceneId>('units');
  const [faction, setFaction] = useState<FactionId>('player');
  const [actor, setActor] = useState<UnitType>('swordsman');
  const [quality, setQuality] = useState<GraphicsQuality>('normal');
  const scene = useMemo(() => buildScene(tab, faction, actor), [tab, faction, actor]);
  // Remembers which scene the highlighted item belongs to, so a new scene starts unselected.
  const [focus, setFocus] = useState<{ scene: Scene; tile: string } | null>(null);
  const focused = focus?.scene === scene ? focus.tile : null;
  const setFocused = (tile: string | null) => setFocus(tile ? { scene, tile } : null);

  // Rebuild the world for every scene (quality is applied in place below).
  useEffect(() => {
    current.current = scene.state;
    const w = new World(
      host.current!,
      scene.state,
      () => {},
      () => {},
      { quality }
    );
    w.focus(scene.focus);
    w.zoom(scene.zoom);
    world.current = w;
    return () => {
      window.clearTimeout(restore.current);
      w.dispose();
      world.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quality changes must not rebuild
  }, [scene]);

  useEffect(() => {
    world.current?.setVisualSettings({ quality });
  }, [quality]);

  const show = (tile: string) => {
    const w = world.current;
    if (!w) return;
    w.resetCamera();
    w.focus(tile);
    w.zoom(tab === 'units' ? 1.7 : 1.15);
    setFocused(tile);
  };

  const play = (action: Action) => {
    const w = world.current,
      s = current.current;
    if (!w || !s) return;
    window.clearTimeout(restore.current);
    const next = animate(s, action);
    w.sync(next, null, null, false);
    current.current = next;
    if (action === 'kill') {
      // Bring the target back once the death animation has finished.
      restore.current = window.setTimeout(() => {
        const again = buildScene('animation', faction, actor).state;
        again.serial = next.serial;
        again.units.find((u) => u.id === 'actor')!.tile = next.units.find(
          (u) => u.id === 'actor'
        )!.tile;
        current.current = again;
        world.current?.sync(again, null, null, false);
      }, 1600);
    }
  };

  return (
    <div className="gallery">
      <header className="gallery-bar">
        <a className="gallery-back" href="/">
          ← Về game
        </a>
        <h1>Thư viện hình ảnh</h1>
        <nav className="gallery-tabs" aria-label="Nhóm">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <label>
          Phe
          <select value={faction} onChange={(e) => setFaction(e.target.value as FactionId)}>
            {FACTION_IDS.map((f) => (
              <option key={f} value={f}>
                {FACTIONS[f].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Đồ họa
          <select value={quality} onChange={(e) => setQuality(e.target.value as GraphicsQuality)}>
            <option value="normal">Đầy đủ</option>
            <option value="medium">Vừa</option>
            <option value="low">Thấp</option>
          </select>
        </label>
      </header>
      <aside className="gallery-side">
        {tab === 'animation' ? (
          <>
            <h2>Quân thực hiện</h2>
            <select
              className="gallery-actor"
              value={actor}
              onChange={(e) => setActor(e.target.value as UnitType)}
            >
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {UNITS[t].name}
                </option>
              ))}
            </select>
            <h2>Hành động</h2>
            <div className="gallery-actions">
              {ACTIONS.filter((a) => !a.when || a.when(actor)).map((a) => (
                <button key={a.id} onClick={() => play(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="gallery-note">
              Hoạt ảnh giống hệt trong game: quân nhún khi đi, lao tới và vung vũ khí khi đánh, mục
              tiêu giật lùi, quân bị hạ gục ngã xuống.
            </p>
          </>
        ) : (
          <>
            <h2>{TABS.find((t) => t.id === tab)!.label}</h2>
            <ul className="gallery-list">
              {scene.items.map((item) => (
                <li key={item.tile + item.label}>
                  <button
                    className={focused === item.tile ? 'active' : ''}
                    onClick={() => show(item.tile)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="gallery-overview"
              onClick={() => {
                const w = world.current;
                if (!w) return;
                w.resetCamera();
                w.focus(scene.focus);
                w.zoom(scene.zoom);
                setFocused(null);
              }}
            >
              Xem toàn cảnh
            </button>
          </>
        )}
        <p className="gallery-note">Kéo để di chuyển, cuộn để phóng to, Q/E để xoay.</p>
      </aside>
      <div className="gallery-world" ref={host} />
    </div>
  );
}
