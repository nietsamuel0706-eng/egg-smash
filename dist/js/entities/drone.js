/* ============================================================
   entities/drone.js — auto-smashing drone
   Hovers in formation, dashes to the nearest egg, fires a zap.
   ============================================================ */
import { rand, TAU, damp, clamp } from '../core/utils.js';

export function createDrone(index, bounds) {
  const slotX = bounds.w * (0.18 + 0.64 * (index / 5));
  return {
    index,
    homeX: slotX,
    homeY: bounds.h * (0.2 + (index % 2) * 0.1),
    x: slotX,
    y: bounds.h * 0.2,
    r: 15,
    scale: 1,
    t: rand(0, 10),
    state: 'idle',        // idle | dash | back
    timer: rand(0.4, 2.2),
    target: null,
    zap: 0,               // 0..1 zap flash
    beam: null,           // {x0,y0,x1,y1,life}
    bob: rand(0, TAU),
  };
}

export function updateDrone(drone, dt, eggs, bounds, d) {
  drone.t += dt;
  drone.bob += dt * 1.8;
  drone.zap = Math.max(0, drone.zap - dt * 3.2);
  if (drone.beam) {
    drone.beam.life -= dt;
    if (drone.beam.life <= 0) drone.beam = null;
  }

  switch (drone.state) {
    case 'idle': {
      drone.timer -= dt;
      drone.x = damp(drone.x, drone.homeX, 4, dt);
      drone.y = damp(drone.y, drone.homeY + Math.sin(drone.bob) * 7, 4, dt);
      if (drone.timer <= 0) {
        const target = nearestEgg(drone, eggs);
        if (target) {
          drone.state = 'dash';
          drone.target = target;
          drone.dashSpeed = 900 * drone.scale;
        } else {
          drone.timer = rand(0.5, 1.4);
        }
      }
      break;
    }
    case 'dash': {
      const tgt = drone.target;
      if (!tgt || tgt.dead) { drone.state = 'back'; break; }
      const dx = tgt.x - drone.x;
      const dy = tgt.y - drone.y;
      const dist = Math.hypot(dx, dy) || 1;
      drone.x += (dx / dist) * drone.dashSpeed * dt;
      drone.y += (dy / dist) * drone.dashSpeed * dt;
      drone.angle = Math.atan2(dy, dx) - Math.PI / 2;
      if (dist < tgt.r + drone.r + 6 * drone.scale) {
        drone.beam = { x0: drone.x, y0: drone.y, x1: tgt.x, y1: tgt.y, life: 0.18, scale: drone.scale };
        drone.zap = 1;
        drone.state = 'back';
        return tgt; // caller smashes it
      }
      break;
    }
    case 'back': {
      drone.x = damp(drone.x, drone.homeX, 5, dt);
      drone.y = damp(drone.y, drone.homeY + Math.sin(drone.bob) * 7 * drone.scale, 5, dt);
      drone.angle = damp(drone.angle || 0, 0, 6, dt);
      if (Math.hypot(drone.x - drone.homeX, drone.y - drone.homeY) < 18 * drone.scale) {
        drone.state = 'idle';
        drone.timer = rand(0.5, 1.5) * (d.spawnMult > 1.4 ? 0.6 : 1);
      }
      break;
    }
  }

  drone.x = clamp(drone.x, drone.r, bounds.w - drone.r);
  drone.y = clamp(drone.y, drone.r, bounds.h * 0.75);
  return null;
}

function nearestEgg(drone, eggs) {
  let best = null;
  let bestD = Infinity;
  for (const e of eggs) {
    if (e.dead) continue;
    const dd = (e.x - drone.x) ** 2 + (e.y - drone.y) ** 2;
    if (dd < bestD) { bestD = dd; best = e; }
  }
  return best;
}

export function drawDrone(ctx, drone, t) {
  ctx.save();
  ctx.translate(drone.x, drone.y);
  ctx.rotate(drone.angle || 0);
  ctx.scale(drone.scale, drone.scale);

  // thruster glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 12, 1, 0, 12, 18);
  g.addColorStop(0, 'rgba(185,139,255,0.7)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 12, 18, 0, TAU);
  ctx.fill();
  ctx.restore();

  // body
  const bg = ctx.createLinearGradient(0, -12, 0, 12);
  bg.addColorStop(0, '#6c5a90');
  bg.addColorStop(1, '#241a33');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(13, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // eye / zap core
  const pulse = 0.5 + 0.5 * Math.sin(t * 6 + drone.index);
  ctx.fillStyle = drone.zap > 0.1 ? '#fff6c9' : `rgba(185,139,255,${0.5 + pulse * 0.5})`;
  ctx.shadowColor = '#b98bff';
  ctx.shadowBlur = 8 + drone.zap * 16;
  ctx.beginPath();
  ctx.arc(0, 0, 4 + drone.zap * 2.5, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  // rotor arms
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    const sx = s * 13;
    const spin = t * 30 + drone.index;
    ctx.beginPath();
    ctx.ellipse(sx, 0, 7, 2.4, 0, spin, spin + Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBeam(ctx, beam) {
  if (!beam) return;
  const k = clamp(beam.life / 0.18, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#e7d2ff';
  ctx.lineWidth = 3 * (beam.scale || 1);
  ctx.shadowColor = '#b98bff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(beam.x0, beam.y0);
  ctx.lineTo(beam.x1, beam.y1);
  ctx.stroke();
  ctx.restore();
}

