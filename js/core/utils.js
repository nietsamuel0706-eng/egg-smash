/* ============================================================
   utils.js — tiny math / random / formatting helpers
   ============================================================ */

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;

/** frame-rate independent smoothing: moves `a` toward `b` */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** deterministic pseudo-random from an integer seed (for stable crack patterns) */
export function seeded(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/** 12345 -> "12.3K" */
export function fmt(n) {
  n = Math.floor(n || 0);
  if (n < 1000) return String(n);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, s] of units) {
    if (n >= v) {
      const r = n / v;
      return (r >= 100 ? r.toFixed(0) : r >= 10 ? r.toFixed(1) : r.toFixed(2)).replace(/\.?0+$/, '') + s;
    }
  }
  return String(n);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** cartesian helpers */
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const inCircle = (ax, ay, bx, by, r) => dist2(ax, ay, bx, by) <= r * r;

/** weighted pick from [{weight}] */
export function weighted(list, weightKey = 'weight') {
  let total = 0;
  for (const it of list) total += Math.max(0, it[weightKey] || 0);
  if (total <= 0) return list[0];
  let roll = Math.random() * total;
  for (const it of list) {
    roll -= Math.max(0, it[weightKey] || 0);
    if (roll <= 0) return it;
  }
  return list[list.length - 1];
}

/** cost curve: base * growth^level, rounded nicely */
export function costAt(base, growth, level) {
  const raw = base * Math.pow(growth, level);
  if (raw < 1000) return Math.ceil(raw / 5) * 5;
  if (raw < 1e6) return Math.ceil(raw / 50) * 50;
  return Math.ceil(raw / 1000) * 1000;
}

export const nowMs = () => performance.now();
