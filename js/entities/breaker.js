/* ============================================================
   entities/breaker.js — the paddle + hammer you control
   Passive contact smashing, plus an active swing with an arc hitbox.
   ============================================================ */
import { clamp, damp } from '../core/utils.js';
import { drawHammer, drawBreaker } from '../fx/hammer-art.js';
import { Ease } from '../fx/tween.js';

export function createBreaker(bounds) {
  return {
    x: bounds.w / 2,
    y: bounds.h - 70,
    w: 120,
    h: 22,
    scale: 1,          // world scale, set by setBounds() on resize
    targetX: bounds.w / 2,
    vel: 0,
    bounds,

    // swing animation
    swing: 0,          // 0 = idle, 1 = fully swung
    swinging: false,
    swingDir: 1,
    swingCharge: 0,
    swingCooldown: 0,
    swingT: 0,         // 0..1 through the swing
    hitEggs: new Set(),

    // feel
    lean: 0,
    squash: 1,
    t: 0,
  };
}

export function updateBreaker(b, dt, d, input) {
  b.t += dt;
  b.w = d.paddleW * b.scale;
  b.h = 22 * b.scale;

  // --- steering: pointer wins, keys add on top ---
  const speed = (620 + b.w * 0.6) * b.scale;
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;

  if (dir !== 0) {
    b.targetX += dir * speed * dt;
  } else if (input.pointerActive) {
    b.targetX = input.pointerX;
  }

  const half = b.w / 2;
  b.targetX = clamp(b.targetX, half + 6 * b.scale, b.bounds.w - half - 6 * b.scale);

  const prev = b.x;
  b.x = damp(b.x, b.targetX, 18, dt);
  b.vel = (b.x - prev) / Math.max(dt, 0.0001);
  b.lean = damp(b.lean, clamp(b.vel / 900, -1, 1) * 0.16, 10, dt);
  b.squash = damp(b.squash, 1 + clamp(Math.abs(b.vel) / 4200, 0, 0.12), 12, dt);

  // --- swing animation ---
  b.swingCooldown = Math.max(0, b.swingCooldown - dt);
  if (b.swinging) {
    b.swingT += dt * 5.4;
    if (b.swingT >= 1) {
      b.swinging = false;
      b.swingT = 0;
      b.swing = 0;
    }
  }
  b.swing = b.swinging ? swingCurve(b.swingT) : 0;
  b.swingCharge = b.swinging ? Math.sin(clamp(b.swingT, 0, 1) * Math.PI) : damp(b.swingCharge, 0, 12, dt);
}

function swingCurve(t) {
  // fast wind-up, heavy slam, slow recover
  if (t < 0.28) return Ease.outCubic(t / 0.28) * -0.55;
  if (t < 0.52) return -0.55 + Ease.inCubic((t - 0.28) / 0.24) * 1.55;
  return 1 - Ease.outQuad((t - 0.52) / 0.48);
}

export function trySwing(b) {
  if (b.swingCooldown > 0 || b.swinging) return false;
  b.swinging = true;
  b.swingT = 0;
  b.swingCooldown = 0.16;
  b.swingDir = Math.random() < 0.22 ? -1 : 1;
  b.hitEggs.clear();
  return true;
}

/** world position of the hammer head (where the hitbox lives) */
export function hammerPos(b) {
  const S = b.scale;
  const reach = (62 + b.swing * 22) * S;
  const ang = b.lean * 0.5 + b.swing * 1.15 * b.swingDir;
  return {
    x: b.x + Math.sin(ang) * reach,
    y: b.y - 12 * S - Math.cos(ang) * reach * 0.72 - b.swing * 8 * S,
    angle: ang,
    r: 46 * S,
  };
}

/** is the swing actually in the damage window? */
export function swingActive(b) {
  return b.swinging && b.swingT > 0.24 && b.swingT < 0.86;
}

export function drawBreakerEntity(ctx, b, skinId) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.lean * 0.35);
  ctx.scale(1 / b.squash, b.squash);
  drawBreaker(ctx, { x: 0, y: 0, w: b.w, h: b.h, t: b.t, charge: b.swingCharge, magnet: 0 });
  ctx.restore();

  const hp = hammerPos(b);
  // swing trail
  if (b.swinging) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = b.swingCharge * 0.5;
    ctx.strokeStyle = 'rgba(255,240,190,0.9)';
    ctx.lineWidth = 10 * b.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(b.x, b.y - 12 * b.scale, 70 * b.scale, -1.2, 1.2, false);
    ctx.stroke();
    ctx.restore();
  }

  drawHammer(ctx, {
    x: b.x,
    y: b.y,
    scale: b.scale,
    angle: hp.angle,
    skinId,
    t: b.t,
    charge: b.swingCharge,
    swingK: b.swingCharge,
  });
}

