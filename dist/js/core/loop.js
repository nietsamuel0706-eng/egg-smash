/* ============================================================
   core/loop.js — requestAnimationFrame loop with a clamped dt
   and a rolling FPS meter.
   ============================================================ */

export function createLoop({ update, render, maxDt = 1 / 20 }) {
  let raf = 0;
  let last = 0;
  let running = false;
  let elapsed = 0;

  const perf = { fps: 60, frames: 0, acc: 0 };

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > maxDt) dt = maxDt;   // never let a tab-switch teleport eggs
    elapsed += dt;

    // fps meter
    perf.frames++;
    perf.acc += dt;
    if (perf.acc >= 0.5) {
      perf.fps = Math.round(perf.frames / perf.acc);
      perf.frames = 0;
      perf.acc = 0;
    }

    try {
      update(dt, elapsed);
    } catch (e) {
      console.error('[loop] update failed', e);
    }
    try {
      render(dt, elapsed);
    } catch (e) {
      console.error('[loop] render failed', e);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() { return running; },
    get elapsed() { return elapsed; },
    perf,
  };
}
