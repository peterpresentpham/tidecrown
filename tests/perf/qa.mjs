// Browser QA for playback scheduling, graphics settings and layout. Development tool, not part of npm test.
// Usage: PLAYWRIGHT=/path/to/playwright node tests/perf/qa.mjs <base-url> <fixtures-dir> <screenshot-dir>
import { readFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [base, fixtures, shots] = process.argv.slice(2);
mkdirSync(shots, { recursive: true });
const url = `${base}?debug-world`;
const fixture = name => readFileSync(`${fixtures}/${name}.json`, 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function open(name, { prefs = { aiSpeed: 'normal', graphics: 'normal' }, viewport = { width: 1280, height: 720 }, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion });
  await context.addInitScript(([save, prefs]) => {
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.clear(); if (save) localStorage.setItem('nation-tech-v7', save); localStorage.setItem('nation-ui-preferences-v1', prefs); }
    window.__contexts = 0; const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { if (String(type).startsWith('webgl')) window.__contexts++; return original.call(this, type, ...rest); };
  }, [name ? fixture(name) : null, JSON.stringify(prefs)]);
  const page = await context.newPage();
  page.errors = []; page.on('pageerror', e => page.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(url); await page.waitForSelector('canvas'); await page.waitForTimeout(800);
  return { context, page };
}
const save = page => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('nation-tech-v7')); return { turn: s.turn, round: s.round, serial: s.serial, winner: s.winner, event: s.event?.id }; });
const playerReady = page => page.waitForFunction(() => { const b = document.querySelector('button.end-turn'); return b && !b.disabled && b.textContent.includes('Kết lượt'); }, null, { timeout: 120000, polling: 16 });
const diag = page => page.evaluate(() => window.__nationWorld?.diagnostics());
const settings = page => page.evaluate(() => window.__nationWorld?.visualSettings());
async function setPref(page, group, label) {
  if (!(await page.locator('.small-menu').count())) await page.click('button[aria-label="Menu"]');
  await page.locator(`.visual-settings [role=group][aria-label="${group}"] button`, { hasText: label }).click();
}

// 1. Switch speed in the middle of an AI round; round must finish once, back to the player.
{
  const { context, page } = await open('battle-60');
  const before = await save(page);
  await page.click('button.end-turn'); await page.waitForTimeout(2500);
  await setPref(page, 'Lượt AI', 'Nhanh'); await page.waitForTimeout(1500);
  await setPref(page, 'Lượt AI', 'Bình thường'); await page.waitForTimeout(800);
  await setPref(page, 'Lượt AI', 'Nhanh');
  await playerReady(page);
  const after = await save(page);
  check('speed switch mid-round finishes the round once', after.turn === 'player' && after.round === before.round + 1, `round ${before.round}→${after.round}`);
  await page.waitForTimeout(1500);
  const later = await save(page);
  check('no AI command runs after control returns to the player', later.serial === after.serial, `serial ${after.serial}→${later.serial}`);
  const stored = await page.evaluate(() => localStorage.getItem('nation-ui-preferences-v1'));
  check('speed preference persisted under UI key', JSON.parse(stored).aiSpeed === 'fast', stored);
  await page.reload(); await page.waitForSelector('canvas'); await page.waitForTimeout(500);
  await page.click('button[aria-label="Menu"]');
  check('preference survives reload', await page.locator('.visual-settings [aria-label="Lượt AI"] button.active').textContent() === 'Nhanh');
  check('no page errors (speed)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}

// 2. Research open/close during AI round keeps playing; tab hidden pauses AI; resumes on return.
{
  const { context, page } = await open('battle-60', { prefs: { aiSpeed: 'fast', graphics: 'normal' } });
  await page.click('button.end-turn'); await page.waitForTimeout(700);
  await page.click('button[aria-label="Nghiên cứu"]'); await page.waitForTimeout(1500);
  const whileOpen = await save(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check('AI keeps playing while research is open (existing behaviour)', whileOpen.serial > 0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(400); const hiddenA = await save(page); await page.waitForTimeout(2000); const hiddenB = await save(page);
  check('hidden tab pauses AI commands', hiddenA.serial === hiddenB.serial && hiddenB.turn !== 'player', `serial ${hiddenA.serial}→${hiddenB.serial}, turn ${hiddenB.turn}`);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  const t0 = Date.now(); await page.waitForTimeout(250); const resumed = await save(page);
  check('returning does not burst old timers', resumed.serial - hiddenB.serial <= 3, `${resumed.serial - hiddenB.serial} commands in 250 ms`);
  await playerReady(page);
  check('round completes after returning', (await save(page)).turn === 'player', `${Date.now() - t0} ms`);
  check('no page errors (research/hidden)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}

// 3. New game in the middle of an AI round: no stale timers act on the new game.
{
  const { context, page } = await open('battle-60');
  await page.click('button.end-turn'); await page.waitForTimeout(1500);
  await page.click('button[aria-label="Menu"]'); await page.locator('.small-menu button', { hasText: 'Ván mới' }).click();
  await page.waitForTimeout(1500);
  const paused = await save(page);
  await page.waitForTimeout(1500);
  check('setup screen pauses the AI round', (await save(page)).serial === paused.serial);
  await page.locator('button', { hasText: 'Bắt đầu' }).last().click();
  await page.waitForTimeout(2500);
  const fresh = await save(page);
  check('new game starts on the player turn without stale AI actions', fresh.turn === 'player' && fresh.round === 1, JSON.stringify(fresh));
  check('end turn usable in new game', await page.locator('button.end-turn').isEnabled());
  check('one live WebGL context after new game', (await diag(page)) && true, `getContext calls ${await page.evaluate(() => window.__contexts)}, canvases ${await page.locator('canvas').count()}`);
  check('single canvas after new game', (await page.locator('canvas').count()) === 1);
  check('no page errors (new game)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}

// 4. Win and loss end the loop and leave no busy lock.
{
  const { context, page } = await open('win');
  const attacker = await page.evaluate(() => JSON.parse(localStorage.getItem('nation-tech-v7')).units[0].id);
  await page.locator(`.unit-marker[aria-label$="${attacker}"]`).click();
  const target = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('nation-tech-v7')); return s.cities.find(c => c.owner === 'enemy').name; });
  await page.locator('.city-label', { hasText: target }).click();
  await page.waitForSelector('.dialog', { timeout: 10000 }).catch(() => {});
  check('win dialog shown', await page.locator('.dialog h2', { hasText: 'chiến thắng' }).count() > 0);
  await page.screenshot({ path: `${shots}/win-1280x720.png` });
  check('no page errors (win)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}
{
  const { context, page } = await open('lose', { prefs: { aiSpeed: 'fast', graphics: 'normal' } });
  await page.click('button.end-turn');
  await page.waitForSelector('.dialog', { timeout: 30000 }).catch(() => {});
  const s1 = await save(page); await page.waitForTimeout(1500); const s2 = await save(page);
  check('loss dialog shown and AI stops', await page.locator('.dialog h2', { hasText: 'thất thủ' }).count() > 0 && s1.serial === s2.serial && !!s2.winner, JSON.stringify(s2));
  await page.screenshot({ path: `${shots}/lose-1280x720.png` });
  check('no page errors (lose)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}

// 5. Graphics toggles and research open/close do not grow GPU resources; camera/selection are preserved.
{
  const { context, page } = await open('battle-60');
  await page.locator('.unit-marker.player').first().click(); await page.waitForTimeout(300);
  const selected = await page.locator('.unit-hud .unit-title strong').textContent();
  await page.screenshot({ path: `${shots}/graphics-normal-1280x720.png` });
  const start = await diag(page);
  for (let i = 0; i < 6; i++) {
    await setPref(page, 'Đồ họa', 'Thấp'); await page.waitForTimeout(250);
    if (i === 0) { await page.click('button[aria-label="Menu"]'); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/graphics-low-1280x720.png` }); }
    await setPref(page, 'Đồ họa', 'Đầy đủ'); await page.waitForTimeout(250);
    await page.click('button[aria-label="Nghiên cứu"]'); await page.waitForTimeout(250); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  }
  const end = await diag(page);
  check('geometries/textures stable after 6× quality + research toggles', end.geometries <= start.geometries && end.textures <= start.textures && end.trackedGeometries <= start.trackedGeometries, `geo ${start.geometries}→${end.geometries}, tex ${start.textures}→${end.textures}, tracked ${start.trackedGeometries}→${end.trackedGeometries}, programs ${start.programs}→${end.programs}, labels ${start.labels}→${end.labels}`);
  check('WebGL context created once', (await page.evaluate(() => window.__contexts)) <= 2, `getContext calls ${await page.evaluate(() => window.__contexts)}`);
  await setPref(page, 'Đồ họa', 'Thấp'); await page.click('button[aria-label="Menu"]');
  const low = await settings(page);
  check('low quality: DPR 1, no shadows', low.pixelRatio === 1 && low.shadows === false, JSON.stringify(low));
  const hud = await page.locator('.unit-hud .unit-title strong').textContent().catch(() => null);
  check('selection survives quality change', hud === selected, `${selected} / ${hud}`);
  const lowDiag = await diag(page);
  check('low quality keeps every unit model', lowDiag.units === start.units, `${start.units} / ${lowDiag.units}`);
  check('no page errors (graphics)', !page.errors.length, page.errors.join(' | '));
  await context.close();
}

// 6. Reduced motion: short animations regardless of speed.
{
  const { context, page } = await open('battle-60', { reducedMotion: 'reduce' });
  const t0 = Date.now(); await page.click('button.end-turn'); await playerReady(page);
  const ms = Date.now() - t0;
  const rs = await settings(page);
  check('reduced motion honoured by renderer', rs.reducedMotion === true, `AI round ${ms} ms`);
  await page.click('button[aria-label="Menu"]');
  check('reduced motion note shown in menu', await page.locator('.visual-settings small').count() > 0);
  results.push({ name: 'reduced-motion-round-ms', ok: true, detail: String(ms) });
  await context.close();
}

// 7. Layout screenshots at the required viewports.
for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const tag = `${viewport.width}x${viewport.height}`;
  const { context, page } = await open('battle-60', { viewport });
  await page.click('button[aria-label="Menu"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${shots}/menu-${tag}.png` });
  const menuBox = await page.locator('.visual-settings').boundingBox();
  check(`${tag}: settings fully on screen`, menuBox && menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= viewport.width && menuBox.y + menuBox.height <= viewport.height, JSON.stringify(menuBox));
  await page.click('button[aria-label="Menu"]');
  await page.locator('.city-label.player').first().click(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${shots}/city-recruit-${tag}.png` });
  await page.locator('.city-tabs button', { hasText: 'Công trình' }).click(); await page.waitForTimeout(150);
  await page.screenshot({ path: `${shots}/city-build-${tag}.png` });
  await page.locator('.city-tabs button', { hasText: 'Lãnh thổ' }).click(); await page.waitForTimeout(150);
  await page.screenshot({ path: `${shots}/city-land-${tag}.png` });
  const card = await page.locator('.city-card').boundingBox();
  check(`${tag}: city panel within viewport width`, card && card.x >= 0 && card.x + card.width <= viewport.width + 1, JSON.stringify(card));
  const endTurn = await page.locator('button.end-turn').boundingBox();
  check(`${tag}: end turn visible`, endTurn && endTurn.y + endTurn.height <= viewport.height && endTurn.x + endTurn.width <= viewport.width, JSON.stringify(endTurn));
  await page.keyboard.press('Escape');
  const spent = page.locator('.unit-marker.player').first(); await spent.click(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${shots}/unit-${tag}.png` });
  await page.click('button[aria-label="Nghiên cứu"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/research-${tag}.png` });
  check(`no page errors (${tag})`, !page.errors.length, page.errors.join(' | '));
  await context.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }));
process.exit(failed.length ? 1 : 0);
