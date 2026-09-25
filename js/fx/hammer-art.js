/* ============================================================
   fx/hammer-art.js — the hammer on the breaker, one draw function
   per material. Also used for shop preview cards.
   ============================================================ */
import { TAU, seeded } from '../core/utils.js';
import { HAMMER_BY_ID } from '../data/skins.js';
import { hexA } from './egg-art.js';

/**
 * Draw a hammer whose pivot is at (0,0), head above it.
 * @param o {x,y,scale,angle,skinId,t,charge (0..1 glow on swing)}
 */
export function drawHammer(ctx, o) {
  const { x, y, scale = 1, angle = 0, skinId = 'mallet_rubber', t = 0, charge = 0, swingK = 0 } = o;
  const h = HAMMER_BY_ID[skinId] || HAMMER_BY_ID.mallet_rubber;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ---- handle ----
  const handleGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  handleGrad.addColorStop(0, '#6b4a25');
  handleGrad.addColorStop(0.5, '#a97c46');
  handleGrad.addColorStop(1, '#5a3c1c');
  ctx.fillStyle = handleGrad;
  roundRect(ctx, -5, -46, 10, 66, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // grip wrap
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-5, 2 + i * 5);
    ctx.lineTo(5, 5 + i * 5);
    ctx.stroke();
  }

  // ---- head ----
  const hw = 34, hh = 26;
  const g = ctx.createLinearGradient(-hw, -hh - 46, hw, -46);
  g.addColorStop(0, h.head);
  g.addColorStop(0.5, h.head);
  g.addColorStop(1, h.head2);
  ctx.fillStyle = g;

  if (h.glow) {
    ctx.shadowColor = h.glow;
    ctx.shadowBlur = 18 + charge * 26 + Math.sin(t * 4) * 5;
  }

  roundRect(ctx, -hw, -46 - hh, hw * 2, hh, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // material detail
  drawDetail(ctx, h, hw, hh, t);

  // impact band
  ctx.fillStyle = hexA(h.trim, 0.9);
  roundRect(ctx, -hw, -46 - hh * 0.32, hw * 2, 5, 2.5);
  ctx.fill();

  // charge glow while swinging
  if (charge > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = charge * 0.8;
    const cg = ctx.createRadialGradient(0, -46 - hh * 0.5, 2, 0, -46 - hh * 0.5, hw * 1.8);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.4, h.glow || '#ffd75e');
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, -46 - hh * 0.5, hw * 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // motion arc behind a swinging hammer
  if (swingK > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = swingK * 0.7;
    ctx.strokeStyle = h.glow || 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 74, -1.5, 0.35);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawDetail(ctx, h, hw, hh, t) {
  const top = -46 - hh;
  switch (h.id) {
    case 'mallet_rubber': {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(0, top + hh * 0.42, hh * 0.28, 0, TAU);
      ctx.fill();
      break;
    }
    case 'mallet_wood': {
      ctx.strokeStyle = 'rgba(90,55,20,0.4)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-hw + 6, top + 7 + i * 6);
        ctx.bezierCurveTo(-hw * 0.3, top + 3 + i * 6, hw * 0.3, top + 11 + i * 6, hw - 6, top + 6 + i * 6);
        ctx.stroke();
      }
      break;
    }
    case 'mallet_stone': {
      const rnd = seeded(5);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc((rnd() - 0.5) * hw * 1.7, top + rnd() * hh, rnd() * 4 + 1, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'mallet_iron': {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-hw + 5, top + 4, hw * 2 - 10, 2.5);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-hw + 5, top + 11, hw * 2 - 10, 2.5);
      break;
    }
    case 'mallet_gold': {
      // sparkles
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 4; i++) {
        const px = -hw + 10 + i * ((hw * 2 - 20) / 3);
        const tw = Math.abs(Math.sin(t * 3 + i * 1.3));
        ctx.globalAlpha = tw;
        star(ctx, px, top + hh * 0.4, 3 + tw * 3);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'mallet_plasma': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = h.glow;
      for (let i = 0; i < 3; i++) {
        const px = -hw + 14 + i * ((hw * 2 - 28) / 2);
        const pulse = 0.5 + 0.5 * Math.sin(t * 8 + i);
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.beginPath();
        ctx.arc(px, top + hh * 0.5, 3 + pulse * 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'mallet_crystal': {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * hw * 0.55, top);
        ctx.lineTo(i * hw * 0.2, top + hh);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'mallet_void': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g2 = ctx.createRadialGradient(0, top + hh * 0.5, 1, 0, top + hh * 0.5, hw);
      g2.addColorStop(0, hexA(h.glow, 0.9));
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(-hw, top, hw * 2, hh);
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.3;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/* ---------------- breaker (paddle) art ---------------- */
export function drawBreaker(ctx, { x, y, w, h, t, charge = 0, magnet = 0 }) {
  ctx.save();
  ctx.translate(x, y);

  // magnet radius hint
  if (magnet > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12 + charge * 0.1;
    const mg = ctx.createRadialGradient(0, 0, magnet * 0.4, 0, 0, magnet);
    mg.addColorStop(0, 'rgba(185,139,255,0.0)');
    mg.addColorStop(1, 'rgba(185,139,255,0.5)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(0, 0, magnet, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const hw = w / 2;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#4a3a68');
  g.addColorStop(0.5, '#2a1f3d');
  g.addColorStop(1, '#150f22');
  ctx.fillStyle = g;
  roundRect(ctx, -hw, -h / 2, w, h, h / 2);
  ctx.fill();

  // neon top edge that lights up on charge
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = charge > 0.05 ? `rgba(255,201,60,${0.5 + charge * 0.5})` : 'rgba(157,148,189,0.35)';
  ctx.lineWidth = 2.5;
  roundRect(ctx, -hw + 2, -h / 2 + 2, w - 4, h - 4, (h - 4) / 2);
  ctx.stroke();
  ctx.restore();

  // end caps
  ctx.fillStyle = '#6c5a90';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * (hw - 5), 0, 5, h / 2 - 3, 0, 0, TAU);
    ctx.fill();
  }

  // grip texture
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (hw / 3), -h / 4);
    ctx.lineTo(i * (hw / 3), h / 4);
    ctx.stroke();
  }

  ctx.restore();
}

/** shop preview: a hammer in a small canvas */
export function drawHammerPreview(canvas, skinId, t = 0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  // scale so the whole hammer fits the 52x66 preview
  const s = Math.min(canvas.width / 90, canvas.height / 130);
  drawHammer(ctx, {
    x: canvas.width / 2,
    y: canvas.height * 0.78,
    scale: s,
    angle: 0,
    skinId,
    t,
  });
  ctx.restore();
}

