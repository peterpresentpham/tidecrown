/** Browser-only animation/idle QA. This uses synthetic presentation events, not a balance campaign. */
import { observe } from '../../src/game/visibility';
import { World } from '../../src/render/World';
import type { AISpeed, GraphicsQuality } from '../../src/ui/playbackPolicy';
import { battle60Fixture } from '../helpers/perfFixture';

const frame = () => new Promise<number>(requestAnimationFrame);
export async function playbackBenchmark(host: HTMLElement) {
  const samples = [];
  for (const quality of ['low', 'medium', 'normal'] as GraphicsQuality[])
    for (const aiSpeed of ['normal', 'fast'] as AISpeed[])
      for (const reducedMotion of [false, true]) {
        const s = battle60Fixture(),
          v = observe(s, 'player'),
          actor = v.units.find((u) => u.owner !== 'player')!,
          target = v.units.find((u) => u.owner === 'player')!;
        const completed: number[] = [];
        const world = new World(
          host,
          s,
          () => {},
          () => {},
          { quality, aiSpeed, reducedMotion, onVisualEnd: (id) => completed.push(id) }
        );
        try {
          world.focus(target.tile);
          await frame();
          await frame();
          // Allow camera damping to settle before measuring idle frames.
          const settle = performance.now() + 1200;
          while (performance.now() < settle) await frame();
          const idleStart = world.diagnostics().renderedFrames,
            idleUntil = performance.now() + 1000;
          while (performance.now() < idleUntil) await frame();
          const idleFrames = world.diagnostics().renderedFrames - idleStart;
          s.events = Array.from({ length: 4 }, () => ({
            id: ++s.serial,
            kind: 'attack' as const,
            actor: actor.id,
            actorType: actor.type,
            owner: actor.owner,
            from: actor.tile,
            to: target.tile,
            target: target.id,
            damage: 1,
            retaliation: 0,
            fortDamage: 0,
            dead: [],
            viewers: ['player' as const],
            originViewers: ['player' as const],
          }));
          s.event = s.events.at(-1);
          const begin = performance.now();
          let previous = world.diagnostics().renderedFrames,
            last = begin;
          const gaps: number[] = [],
            draws: number[] = [];
          world.sync(s, null, null, false);
          while (world.isAnimating()) {
            const now = await frame();
            if (document.hidden) throw Error('Benchmark invalid: tab hidden');
            if (now - begin > 15000) throw Error('Animation queue timeout');
            const d = world.diagnostics();
            if (d.renderedFrames !== previous) {
              gaps.push(now - last);
              last = now;
              previous = d.renderedFrames;
              draws.push(d.drawCalls);
            }
          }
          if (JSON.stringify(completed) !== JSON.stringify(s.events.map((e) => e.id)))
            throw Error('Dropped or duplicated animation event');
          gaps.sort((a, b) => a - b);
          samples.push({
            quality,
            aiSpeed,
            reducedMotion,
            idleFrames,
            completed,
            elapsedMs: performance.now() - begin,
            p95FrameMs: gaps[Math.floor(gaps.length * 0.95)],
            meanDrawCalls: draws.reduce((a, b) => a + b, 0) / draws.length,
            diagnostics: world.diagnostics(),
          });
        } finally {
          world.dispose();
        }
      }
  return {
    scope:
      '60-unit scene; 4 synthetic observed attacks per setting; idle and 12 quality/speed/reduced-motion combinations. Not a phone benchmark.',
    browser: navigator.userAgent,
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    samples,
  };
}
