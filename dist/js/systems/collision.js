/* ============================================================
   systems/collision.js — who hits what
   Passive paddle contact, the swing arc, the magnet ring and
   the steady-hands auto-smash all funnel through here.
   ============================================================ */
import { inCircle, clamp } from '../core/utils.js';
import { hammerPos, swingActive } from '../entities/breaker.js';

/** topmost egg overlapping the paddle's contact band */
export function eggsTouchingBreaker(eggs, b, magnetR) {
  const out = [];
  const half = b.w / 2;
  for (const e of eggs) {
    if (e.dead) continue;
    // vertical band: the paddle is short, so use a forgiving thickness
    const dy = e.y - b.y;
    if (dy < -e.r * 0.6 || dy > e.r + b.h * 0.9) continue;
    const dx = Math.abs(e.x - b.x);
    const reach = half + e.r * 0.85;
    if (dx <= reach) { out.push(e); continue; }
    // magnet: a soft pull-and-pop radius around the paddle
    if (magnetR > 0 && inCircle(e.x, e.y, b.x, b.y, magnetR + e.r)) out.push(e);
  }
  return out;
}

/** eggs inside the swinging hammer's hitbox that this swing hasn't hit yet */
export function eggsInSwing(eggs, b) {
  if (!swingActive(b)) return [];
  const hp = hammerPos(b);
  const out = [];
  for (const e of eggs) {
    if (e.dead || b.hitEggs.has(e.id)) continue;
    if (inCircle(e.x, e.y, hp.x, hp.y, hp.r + e.r * 0.8)) {
      out.push({ egg: e, hx: hp.x, hy: hp.y });
    }
  }
  return out;
}

/** the highest-priority egg for drones / auto-smash: closest to the floor */
export function lowestEgg(eggs, y) {
  let best = null;
  for (const e of eggs) {
    if (e.dead) continue;
    if (!best || e.y > best.y) best = e;
  }
  void y;
  return best;
}

/** keeps the breaker inside the canvas */
export function clampBreaker(b, w) {
  const half = b.w / 2;
  b.x = clamp(b.x, half, w - half);
}
