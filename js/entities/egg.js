/* ============================================================
   entities/egg.js — a falling egg
   Owns its own wobble/spin animation, crack stages and death.
   ============================================================ */
import { rand, clamp, lerp, TAU, damp } from '../core/utils.js';
import { makeArmored } from '../data/eggs.js';
import { drawEgg } from '../fx/egg-art.js';

let nextId = 1;

export function createEgg(tier, opts = {}) {
  const armored = opts.armored && Math.random() < 0.3;
  const t = armored ? makeArmored(tier) : tier;
  const sizeScale = opts.sizeScale || 1;   // scales the egg's visual size
  const fallScale = opts.fallScale || 1;   // scales fall speed for taller fields

  const egg = {
    id: nextId++,
    tier: t,
    x: opts.x ?? rand(50, 910),
    y: opts.y ?? -t.r * 2 * sizeScale,
    r: t.r * sizeScale,
    vx: 0,
    vy: 0,
    baseFall: (58 + t.speed * 34) * fallScale,   // px/s
    hp: t.hp,
    maxHp: t.hp,
    dead: false,
    missed: false,
    armored,

    // animation state
    phase: rand(0, TAU),
    wobble: rand(0.8, 1.25),       // how fast it sways
    spin: rand(-0.5, 0.5),
    rot: rand(-0.25, 0.25),
    rotVel: 0,
    sizeScale,
    fallScale,
    squash: 1,                     // 1 = normal, <1 = squashed
    popIn: 0,                      // 0..1 spawn pop animation
    flash: 0,                      // white hit flash
    hitPulse: 0,
    bobAmp: rand(4, 10) * sizeScale,
    drift: rand(-16, 16) * sizeScale,
  };

  egg.vy = egg.baseFall;
  return egg;
}

export function updateEgg(egg, dt, t, d, bounds) {
  if (egg.dead) return;

  egg.phase += dt;
  egg.popIn = Math.min(1, egg.popIn + dt * 3.2);

  // gravity-ish acceleration
  egg.vy = lerp(egg.vy, egg.baseFall * d.speedMult * (1 + egg.y / (1400 * egg.fallScale)), 1 - Math.exp(-1.6 * dt));
  egg.y += egg.vy * dt;
  egg.x += egg.drift * dt;

  // gentle horizontal sway as it falls
  egg.x += Math.sin(egg.phase * egg.wobble) * 26 * egg.sizeScale * dt;
  egg.rot += egg.rotVel * dt;
  egg.rotVel = damp(egg.rotVel, egg.spin * Math.cos(egg.phase * egg.wobble), 3, dt);
  egg.rot = clamp(egg.rot, -0.55, 0.55);
  egg.bobAmp = egg.bobAmp || 0;

  // hit flash decay
  egg.flash = Math.max(0, egg.flash - dt * 5);
  egg.hitPulse = Math.max(0, egg.hitPulse - dt * 4);
  egg.squash = lerp(egg.squash, 1, 1 - Math.exp(-8 * dt));

  // wall bounce
  if (egg.x - egg.r < 0) { egg.x = egg.r; egg.drift = Math.abs(egg.drift); }
  if (egg.x + egg.r > bounds.w) { egg.x = bounds.w - egg.r; egg.drift = -Math.abs(egg.drift); }

  // escaped the bottom
  if (egg.y - egg.r > bounds.h + 40) {
    egg.missed = true;
    egg.dead = true;
  }
  void t;
}

/** apply damage, returns true if this blow killed it */
export function damageEgg(egg, amount) {
  egg.hp -= amount;
  egg.flash = 1;
  egg.hitPulse = 1;
  // squish toward the impact
  egg.squash = 0.72;
  egg.rotVel += (Math.random() - 0.5) * 6;
  if (egg.hp <= 0) {
    egg.dead = true;
    return true;
  }
  return false;
}

export function crackAmount(egg) {
  return clamp(1 - egg.hp / egg.maxHp, 0, 1);
}

export function drawEggEntity(ctx, egg, skinId, t) {
  const pop = egg.popIn;
  // pop-in scale with overshoot
  const s = pop < 1 ? 0.6 + 0.4 * pop + Math.sin(pop * Math.PI) * 0.12 : 1;
  const sx = s * (2 - egg.squash);
  const sy = s * egg.squash;

  ctx.save();
  ctx.translate(egg.x, egg.y);
  ctx.rotate(egg.rot);
  ctx.scale(sx, sy);
  ctx.translate(-egg.x, -egg.y);

  drawEgg(ctx, {
    x: egg.x,
    y: egg.y,
    r: egg.r,
    skinId,
    tier: egg.tier,
    t,
    phase: egg.phase,
    crack: crackAmount(egg),
    flash: egg.flash,
    armored: egg.armored,
    scale: 1,
  });

  ctx.restore();
}

/** little health pips above multi-hp eggs so damage reads clearly */
export function drawEggHpBar(ctx, egg) {
  if (egg.maxHp <= 1) return;
  const w = egg.r * 1.6;
  const h = 4;
  const x = egg.x - w / 2;
  const y = egg.y - egg.r * 1.28 - 12;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a2d52';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = egg.hp / egg.maxHp > 0.4 ? '#5ce08a' : '#ff5f6d';
  ctx.fillRect(x, y, w * clamp(egg.hp / egg.maxHp, 0, 1), h);
  ctx.restore();
}
