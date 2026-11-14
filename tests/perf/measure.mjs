// Browser benchmark for AI playback time and render FPS. Development tool, not part of npm test.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node tests/perf/measure.mjs <url> <fixture.json> <label> [aiSpeed] [graphics] [runs] [reduced]
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [url, fixturePath, label, aiSpeed = 'normal', graphics = 'normal', runs = '3', reduced = ''] = process.argv.slice(2);
const fixture = readFileSync(fixturePath, 'utf8');
const prefs = JSON.stringify({ aiSpeed, graphics });
const viewport = { width: Number(process.env.VW ?? 1280), height: Number(process.env.VH ?? 720) };

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [];
for (let run = 0; run < Number(runs); run++) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: Number(process.env.DPR ?? 2), reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(([fixture, prefs]) => {
    if (!sessionStorage.getItem('perf-init')) { sessionStorage.setItem('perf-init', '1'); localStorage.clear(); localStorage.setItem('nation-tech-v7', fixture); localStorage.setItem('nation-ui-preferences-v1', prefs); }
    const perf = window.__perf = { draws: 0, frames: [] };
    for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = C.prototype[name]; if (!original) continue;
      C.prototype[name] = function (...args) { perf.draws++; return original.apply(this, args); };
    }
    let last = 0;
    const tick = t => { perf.frames.push([t, perf.draws - last]); last = perf.draws; if (perf.frames.length > 20000) perf.frames.splice(0, 10000); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [fixture, prefs]);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url); await page.waitForSelector('canvas'); await page.waitForTimeout(1500);
  const gpu = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  const windowStats = async (fn) => {
    const start = await page.evaluate(() => performance.now()); const extra = await fn(); const end = await page.evaluate(() => performance.now());
    const stats = await page.evaluate(([a, b]) => {
      const f = window.__perf.frames.filter(([t]) => t >= a && t <= b), rendered = f.filter(([, d]) => d > 0);
      const gaps = []; for (let i = 1; i < rendered.length; i++) gaps.push(rendered[i][0] - rendered[i - 1][0]);
      gaps.sort((x, y) => x - y); const q = p => gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))] * 10) / 10 : null;
      return { seconds: (b - a) / 1000, renderedFrames: rendered.length, fps: Math.round(rendered.length / ((b - a) / 1000) * 10) / 10, frameGapP50: q(.5), frameGapP95: q(.95), drawsPerFrame: rendered.length ? Math.round(rendered.reduce((n, [, d]) => n + d, 0) / rendered.length) : 0 };
    }, [start, end]);
    return { ...stats, ...extra };
  };
  const idle = await windowStats(() => page.waitForTimeout(2000));
  const box = await page.locator('canvas').boundingBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const pan = await windowStats(async () => {
    await page.mouse.move(cx, cy); await page.mouse.down();
    for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 4; await page.mouse.move(cx + Math.cos(a) * 160, cy + Math.sin(a) * 90); await page.waitForTimeout(16); }
    await page.mouse.up(); await page.waitForTimeout(300);
  });
  const ai = await windowStats(async () => {
    const t0 = Date.now();
    await page.click('button.end-turn');
    await page.waitForFunction(() => { const b = document.querySelector('button.end-turn'); return b && !b.disabled && b.textContent.includes('Kết lượt'); }, null, { timeout: 120000, polling: 16 });
    return { aiRoundMs: Date.now() - t0 };
  });
  const units = await page.evaluate(() => document.querySelectorAll('.unit-marker').length);
  results.push({ run, gpu, idle, pan, ai, visibleUnitMarkers: units, errors });
  await context.close();
}
await browser.close();
const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const summary = {
  label, aiSpeed, graphics, reduced: !!reduced, viewport, dpr: Number(process.env.DPR ?? 2), gpu: results[0].gpu, runs: results.length,
  aiRoundMsMedian: med(results.map(r => r.ai.aiRoundMs)), aiRoundMs: results.map(r => r.ai.aiRoundMs),
  aiFpsMedian: med(results.map(r => r.ai.fps)), aiFrameGapP95Median: med(results.map(r => r.ai.frameGapP95)),
  panFpsMedian: med(results.map(r => r.pan.fps)), panFrameGapP95Median: med(results.map(r => r.pan.frameGapP95)), panDrawsPerFrame: med(results.map(r => r.pan.drawsPerFrame)),
  idleRenderedFramesMedian: med(results.map(r => r.idle.renderedFrames)), visibleUnitMarkers: results[0].visibleUnitMarkers,
  errors: results.flatMap(r => r.errors),
};
console.log(JSON.stringify(summary));
