/* ============================================================
   entities/golden.js — the timed golden egg boss
   Spawns periodically (more often with luck), hovers centre-stage,
   takes several hits before bursting into confetti.
   ============================================================ */
import { TAU, rand, clamp, lerp, damp } from '../core/utils.js';
import { drawEgg, hexA } from '../fx/egg-art.js';

export const GOLDEN_TIER = {
  id: 'golden', name: 'Golden Egg', rarity: 'legendary',
  hp: 24, value: 4200, r: 54, speed: 0,
  shell: '#fff0b8', shell2: '#d4a01c', yolk: '#ffd75e',
};

export function createGolden(bounds, d, sizeScale = 1) {
  const hp = Math.round(GOLDEN_TIER.hp * (0.5 + d.power * 0.55));
  return {
    active: true,
    baseW: bounds.w,
    baseH: bounds.h,
    scale: sizeScale,
    x: bounds.w / 2,
    y: bounds.h * 0.36,
    r: GOLDEN_TIER.r * sizeScale,
    hp,
    maxHp: hp,
    time: 12,
    maxTime: 12,
    t: 0,
    phase: rand(0, TAU),
    flash: 0,
    hitShake: 0,
    angle: 0,
    reward: Math.round(GOLDEN_TIER.value * (1 + d.yolkMult - 1) * (1 + d.luck * 2)),
    shards: 3 + Math.floor(rand(0, 4) + d.luck * 6),
    /** orbit sparks for the aura */
    motes: Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * TAU,
      r: rand(70, 105) * sizeScale,
      speed: rand(0.6, 1.5) * (i % 2 ? 1 : -1),
      size: rand(2, 5) * sizeScale,
    })),
  };
}

export function updateGolden(g, dt) {
  g.t += dt;
  g.flash = Math.max(0, g.flash - dt * 4.5);
  g.hitShake = damp(g.hitShake, 0, 9, dt);
  g.x = lerp(g.x, gBaseX(g) + Math.sin(g.t * 1.6) * 26 * g.scale, 1 - Math.exp(-3 * dt));
  g.y = gBaseY(g) + Math.sin(g.t * 2.2 + g.phase) * 9 * g.scale;
  g.angle = Math.sin(g.t * 1.1) * 0.12;
  g.time -= dt;
  for (const m of g.motes) m.a += m.speed * dt;
  if (g.time <= 0) g.active = false;
  return g.time > 0;
}

function gBaseX(g) { return (g.baseW || 960) / 2; }
function gBaseY(g) { return (g.baseH || 600) * 0.36; }

/** one hit from the player; returns 'hit' | 'kill' */
export function hitGolden(g, damage) {
  g.hp -= damage;
  g.flash = 1;
  g.hitShake = 10;
  if (g.hp <= 0) {
    g.active = false;
    return 'kill';
  }
  return 'hit';
}

export function drawGoldenEgg(ctx, g, t) {
  const shakeX = (Math.random() - 0.5) * g.hitShake;
  const shakeY = (Math.random() - 0.5) * g.hitShake;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // aura
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  const ag = ctx.createRadialGradient(g.x, g.y, g.r * 0.4, g.x, g.y, g.r * 3);
  ag.addColorStop(0, hexA('#ffd75e', 0.4 * pulse));
  ag.addColorStop(0.5, hexA('#b98bff', 0.18 * pulse));
  ag.addColorStop(1, 'transparent');
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r * 3, 0, TAU);
  ctx.fill();

  // orbiting coins/sparks
  for (const m of g.motes) {
    const px = g.x + Math.cos(m.a) * m.r;
    const py = g.y + Math.sin(m.a) * m.r * 0.6;
    ctx.fillStyle = hexA(m.size > 3.5 ? '#fff6c9' : '#b98bff', 0.9);
    ctx.beginPath();
    ctx.arc(px, py, m.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // the egg itself (drawn a little bigger than the breaker can handle)
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.translate(-g.x, -g.y);
  drawEgg(ctx, {
    x: g.x, y: g.y, r: g.r,
    skinId: 'shell_plain',
    tier: GOLDEN_TIER,
    t,
    phase: g.phase,
    crack: clamp(1 - g.hp / g.maxHp, 0, 1),
    flash: g.flash,
    scale: 1,
  });
  ctx.restore();

  // hp bar under the egg
  const w = g.r * 2.6, h = 9;
  const x = g.x - w / 2, y = g.y + g.r * 1.55;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#2b2140';
  ctx.fillRect(x, y, w, h);
  const k = clamp(g.hp / g.maxHp, 0, 1);
  const grd = ctx.createLinearGradient(x, 0, x + w, 0);
  grd.addColorStop(0, '#ffd75e');
  grd.addColorStop(1, '#fff6c9');
  ctx.fillStyle = grd;
  ctx.fillRect(x, y, w * k, h);
  // segment ticks
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w / 8) * i, y);
    ctx.lineTo(x + (w / 8) * i, y + h);
    ctx.stroke();
  }
  ctx.restore();

  // urgency pulse when time is short
  if (g.time < 3) {
    const blink = Math.sin(t * (14 + (3 - g.time) * 6)) * 0.5 + 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = blink * 0.35;
    ctx.strokeStyle = '#ff5f6d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r * 2.1, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
