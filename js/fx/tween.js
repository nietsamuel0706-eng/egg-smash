/* ============================================================
   fx/tween.js — easing functions + a tiny tween/spring engine
   Used for camera zooms, UI number rolls, egg spawn pop-ins.
   ============================================================ */

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const active = new Set();

/**
 * Tween numeric properties of `target`.
 * tween(obj, { x: 10 }, 0.4, Ease.outCubic, onDone)
 */
export function tween(target, props, dur, ease = Ease.outCubic, onUpdate = null, onDone = null) {
  const from = {};
  for (const k in props) from[k] = target[k];
  const t = {
    target, from, to: props, dur, ease, onUpdate, onDone,
    t: 0, dead: false,
  };
  active.add(t);
  return t;
}

/** fire a callback after `delay` seconds (game-time, driven by the loop) */
export function delay(seconds, fn) {
  const t = { t: 0, dur: seconds, dead: false, onDone: fn, target: null, from: null, to: null, ease: Ease.linear, onUpdate: null };
  active.add(t);
  return t;
}

export function killTween(t) {
  if (t) t.dead = true;
}

export function updateTweens(dt) {
  for (const t of Array.from(active)) {
    t.t += dt;
    const k = t.dur <= 0 ? 1 : Math.min(1, t.t / t.dur);
    if (t.target && t.to) {
      const e = t.ease(k);
      for (const key in t.to) {
        t.target[key] = t.from[key] + (t.to[key] - t.from[key]) * e;
      }
    }
    if (t.onUpdate) t.onUpdate(k, e);
    if (k >= 1) {
      active.delete(t);
      t.dead = true;
      if (t.onDone) t.onDone();
    }
  }
}

export function clearTweens() {
  active.clear();
}

/* ---------------- spring ---------------- */
/** simple critically-damped spring for the breaker + camera zoom */
export function spring(current, target, velocity, stiffness = 120, damping = 18, dt = 0.016) {
  const force = (target - current) * stiffness;
  const v = velocity + force * dt;
  const damped = v * Math.pow(1 - Math.min(0.99, damping * dt), 1);
  return { value: current + damped * dt, velocity: damped };
}
