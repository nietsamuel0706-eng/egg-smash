/* ============================================================
   systems/renderer.js — draw order for the game canvas
   background → decals → golden → eggs → drones → breaker →
   particles → floaters → vignette → HUD overlay
   ============================================================ */
import { drawEggEntity, drawEggHpBar } from '../entities/egg.js';
import { drawBreakerEntity } from '../entities/breaker.js';
import { drawDrone, drawBeam } from '../entities/drone.js';
import { drawGoldenEgg } from '../entities/golden.js';
import { drawParticles } from '../fx/particles.js';
import { drawVignette } from '../fx/background.js';
import { applyCamera } from '../fx/camera.js';
import { clamp } from '../core/utils.js';

export function drawFrame(ctx, ctxState) {
  const {
    w, h,
    bg, particles, floaters, camera, eggs, drones, breaker,
    golden, skinId, t, floorY, showHint, hintAlpha, streak, streakLife,
  } = ctxState;

  ctx.clearRect(0, 0, w, h);

  // --- background (unscaled so the shake doesn't reveal edges) ---
  bg.draw(ctx, t);

  ctx.save();
  applyCamera(camera, ctx, w, h);

  // --- golden egg (behind everything else) ---
  if (golden && golden.active) drawGoldenEgg(ctx, golden, t);

  // --- particles: decals under the eggs ---
  drawParticles(ctx, particles);

  // --- eggs ---
  for (const e of eggs) {
    if (e.dead) continue;
    drawEggHpBar(ctx, e);
    drawEggEntity(ctx, e, skinId, t);
  }

  // --- drones ---
  for (const dr of drones) {
    drawDrone(ctx, dr, t);
    drawBeam(ctx, dr.beam);
  }

  // --- breaker + hammer ---
  if (breaker) drawBreakerEntity(ctx, breaker, skinId);

  // --- floaters (score popups) ---
  floaters.draw(ctx);

  ctx.restore();

  // --- danger line near the bottom ---
  drawDangerLine(ctx, w, h, floorY, t, eggs);

  // --- streak banner ---
  if (streak >= 5 && streakLife > 0.01) {
    drawStreakBanner(ctx, w, h, streak, streakLife);
  }

  // --- vignette ---
  drawVignette(ctx, w, h, 0.5);

  // --- hint fade ---
  if (showHint && hintAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.textAlign = 'center';
    ctx.font = '600 15px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = 'rgba(242,236,255,0.5)';
    ctx.fillText('move to steer  ·  click or SPACE to swing', w / 2, 60);
    ctx.restore();
  }
}

function drawDangerLine(ctx, w, h, floorY, t, eggs) {
  // how close the nearest egg is to the paddle, as a red glow
  let lowest = -Infinity;
  for (const e of eggs) {
    if (e.dead) continue;
    if (e.y > lowest) lowest = e.y;
  }
  const danger = clamp((lowest - floorY) / 220, 0, 1);
  if (danger <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = danger * (0.25 + 0.15 * Math.sin(t * 12));
  const g = ctx.createLinearGradient(0, h - 90, 0, h);
  g.addColorStop(0, 'transparent');
  g.addColorStop(1, `rgba(255,60,80,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 90, w, 90);
  ctx.restore();
}

/** the banner that shouts when you chain smashes together */
function drawStreakBanner(ctx, w, h, streak, life) {
  if (streak <= 0) return;
  const k = clamp(life, 0, 1);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  ctx.font = '900 26px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = '#ffd75e';
  ctx.shadowColor = '#ff8f4a';
  ctx.shadowBlur = 18;
  ctx.fillText(`${streak} IN A ROW!`, w / 2, h - 96);
  ctx.restore();
  ctx.shadowBlur = 0;
}
