import { BUILDINGS, createGame, UNITS, type UnitType } from '../../src/game/engine';
import { emptyKnowledge, refreshKnowledge } from '../../src/game/visibility';
import { World } from '../../src/render/World';
import { battle60Fixture } from '../helpers/perfFixture';

const host = document.getElementById('world')!,
  result = document.getElementById('result')!;
let world: World | undefined;
const frame = () => new Promise<number>(requestAnimationFrame);
async function reset() {
  world?.dispose();
  const mode = (document.getElementById('mode') as HTMLSelectElement).value;
  const s = ['sample', 'units', 'buildings'].includes(mode)
    ? createGame({ seed: 'v2-sample' })
    : battle60Fixture();
  if (mode === 'sample') {
    for (const t of s.tiles) {
      t.terrain = t.r < -2 ? 'water' : t.q > 4 ? 'forest' : 'grass';
      t.height = t.terrain === 'water' ? -0.2 : 0.18;
    }
    s.cities = s.cities.slice(0, 3);
    s.cities.forEach((c, i) => {
      c.tile = `${i * 3 - 3},3`;
      c.owner = 'player';
      c.level = i + 1;
    });
    const types: UnitType[] = ['clubman', 'scout', 'swordsman', 'knight', 'catapult', 'warship'];
    s.units = types.map((type, i) => ({
      id: `sample-${type}`,
      type,
      owner: 'player',
      tile: type === 'warship' ? '0,-4' : `${i * 2 - 4},0`,
      hp: UNITS[type].hp,
      moves: UNITS[type].moves,
      acted: false,
      moved: false,
      retaliated: false,
      activeLastTurn: false,
    }));
  }
  if (mode === 'units' || mode === 'buildings') {
    for (const t of s.tiles) {
      t.terrain = 'grass';
      t.height = 0.18;
    }
    const types = Object.keys(UNITS) as UnitType[];
    s.units = types.map((type, i) => {
      const tile = `${(i % 6) * 3 - 8},${Math.floor(i / 6) * 3 - 5}`;
      if (UNITS[type].class === 'ship') s.tiles.find((t) => t.id === tile)!.terrain = 'water';
      return {
        id: `gallery-${type}`,
        type,
        owner: 'player' as const,
        tile,
        hp: UNITS[type].hp,
        moves: UNITS[type].moves,
        acted: false,
        moved: false,
        retaliated: false,
        activeLastTurn: false,
      };
    });
    const base = s.cities[0];
    s.cities = [];
    if (mode === 'buildings') {
      s.units = [];
      s.cities = Object.keys(BUILDINGS).map((id, i) => {
        const tile = `${(i % 5) * 4 - 8},${Math.floor(i / 5) * 4 - 5}`;
        if (['port', 'shipyard'].includes(id))
          s.tiles.find(
            (t) => t.id === `${(i % 5) * 4 - 8 + 1},${Math.floor(i / 5) * 4 - 5}`
          )!.terrain = 'water';
        return {
          ...base,
          id: `building-${id}`,
          name: BUILDINGS[id as keyof typeof BUILDINGS].name,
          tile,
          level: 2,
          buildings: [id as keyof typeof BUILDINGS],
        };
      });
    }
  }
  for (const owner of s.factions) s.knowledge[owner] = emptyKnowledge();
  refreshKnowledge(s);
  if (mode === 'full' || ['sample', 'units', 'buildings'].includes(mode)) {
    // Fixture-only exploration: memory includes every tile, visibility still comes from units/cities.
    s.knowledge.player.explored = s.tiles.map((t) => t.id);
    s.knowledge.player.tiles = Object.fromEntries(s.tiles.map((t) => [t.id, { ...t }]));
  }
  world = new World(
    host,
    s,
    () => {},
    () => {},
    {
      quality: (document.getElementById('quality') as HTMLSelectElement).value as
        'low' | 'medium' | 'normal',
    }
  );
  world.focus(['sample', 'units', 'buildings'].includes(mode) ? '0,0' : s.units[0].tile);
  world.zoom(
    mode === 'full'
      ? 0.4
      : mode === 'sample'
        ? 0.75
        : mode === 'units' || mode === 'buildings'
          ? 0.45
          : 0.8
  );
  const selector = document.getElementById('asset') as HTMLSelectElement;
  selector.replaceChildren(new Option('Cận cảnh asset…', ''));
  for (const item of [
    ...s.units.map((u) => ({ name: UNITS[u.type].name, tile: u.tile })),
    ...s.cities.map((c) => ({ name: c.name, tile: c.tile })),
  ])
    selector.add(new Option(item.name, item.tile));
  result.textContent = JSON.stringify({ mode, units: s.units.length }, null, 2);
}
document.getElementById('reset')!.onclick = () => void reset();
document.getElementById('gray')!.onclick = () => document.body.classList.toggle('gray');
document.getElementById('measure')!.onclick = async () => {
  const w = world!;
  const start = performance.now(),
    count = w.diagnostics().renderedFrames;
  let last = start,
    previous = count,
    draws = 0,
    n = 0;
  const gaps: number[] = [];
  let lastRender = start;
  while (performance.now() - start < 4000) {
    const now = await frame();
    if (document.hidden) {
      result.textContent = 'Hủy: tab ẩn';
      return;
    }
    w.rotate(((now - last) * Math.PI) / 2000);
    last = now;
    const d = w.diagnostics();
    if (d.renderedFrames !== previous) {
      gaps.push(now - lastRender);
      lastRender = now;
      previous = d.renderedFrames;
      draws += d.drawCalls;
      n++;
    }
  }
  gaps.sort((a, b) => a - b);
  const gl = host.querySelector('canvas')!.getContext('webgl2')!,
    ext = gl.getExtension('WEBGL_debug_renderer_info');
  result.textContent = JSON.stringify(
    {
      quality: (document.getElementById('quality') as HTMLSelectElement).value,
      mode: (document.getElementById('mode') as HTMLSelectElement).value,
      fps: ((w.diagnostics().renderedFrames - count) * 1000) / (performance.now() - start),
      p95: gaps[Math.floor(gaps.length * 0.95)],
      drawCalls: draws / Math.max(n, 1),
      diagnostics: w.diagnostics(),
      browser: navigator.userAgent,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
    },
    null,
    2
  );
};
document.getElementById('cycles')!.onclick = async () => {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    await reset();
    const deadline = performance.now() + 3000;
    while (!world!.diagnostics().renderedFrames && performance.now() < deadline) await frame();
    samples.push(world!.diagnostics());
  }
  result.textContent = JSON.stringify({ cycles: samples }, null, 2);
};
void reset();

// Machado 2009 severity 1; linearRGB, see colorspace's CVD documentation.
document.getElementById('vision')!.onchange = (e) => {
  const value = (e.target as HTMLSelectElement).value;
  host.style.filter = value === 'normal' ? '' : `url(#${value})`;
};

document.getElementById('asset')!.onchange = (e) => {
  const tile = (e.target as HTMLSelectElement).value;
  if (tile) {
    world!.resetCamera();
    world!.focus(tile);
    world!.zoom(1.3);
  }
};

const playbackButton = document.createElement('button');
playbackButton.textContent = 'Đo hoạt ảnh / idle (12 cấu hình)';
result.before(playbackButton);
playbackButton.onclick = async () => {
  playbackButton.disabled = true;
  world?.dispose();
  world = undefined;
  result.textContent = 'Đang đo; giữ tab hoạt động…';
  try {
    const { playbackBenchmark } = await import('./playback-benchmark');
    result.textContent = JSON.stringify(await playbackBenchmark(host), null, 2);
  } catch (error) {
    result.textContent = String(error);
  } finally {
    playbackButton.disabled = false;
  }
};
