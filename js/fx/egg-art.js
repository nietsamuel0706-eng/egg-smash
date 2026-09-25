/* ============================================================
   fx/egg-art.js — every egg is drawn here, so the game canvas and
   the shop preview cards look identical.
   ============================================================ */
import { TAU, seeded, clamp } from '../core/utils.js';
import { SKIN_BY_ID } from '../data/skins.js';

/** the classic egg silhouette */
export function eggPath(ctx, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * 0.95, -ry * 0.7, rx, ry * 0.32, 0, ry);
  ctx.bezierCurveTo(-rx, ry * 0.32, -rx * 0.95, -ry * 0.7, 0, -ry);
  ctx.closePath();
}

/**
 * Draw one egg.
 * @param o {x,y,r,skinId,tier,crack (0..1),t (seconds),phase,flash,armored,scale,alpha}
 */
export function drawEgg(ctx, o) {
  const {
    x, y, r, skinId = 'shell_plain', tier, t = 0, phase = 0,
    crack = 0, flash = 0, armored = false, scale = 1, alpha = 1,
  } = o;
  const skin = SKIN_BY_ID[skinId] || SKIN_BY_ID.shell_plain;
  const rx = r * scale;
  const ry = r * 1.28 * scale;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);

  // rarity aura
  if (tier) {
    const glowCol = tier.id === 'common' ? null : tier.yolk;
    if (glowCol) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + phase);
      ctx.save();
      ctx.globalAlpha *= 0.25 + pulse * 0.2;
      const g = ctx.createRadialGradient(0, 0, rx * 0.6, 0, 0, rx * 2.1);
      g.addColorStop(0, glowCol);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx * 2.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---- body ----
  eggPath(ctx, rx, ry);
  const base1 = skin.tint ? skin.tint[0] : tier ? tier.shell : '#fff8e7';
  const base2 = skin.tint ? skin.tint[1] : tier ? tier.shell2 : '#d7c9a4';
  if (skin.style === 'rainbow') {
    rainbowGradient(ctx, rx, ry, t);
  } else {
    const g = ctx.createLinearGradient(-rx, -ry, rx * 0.8, ry);
    g.addColorStop(0, base1);
    g.addColorStop(1, base2);
    ctx.fillStyle = g;
  }
  ctx.fill();

  // clip patterns + shading to the egg shape
  ctx.save();
  eggPath(ctx, rx, ry);
  ctx.clip();
  drawPattern(ctx, skin.style, rx, ry, t, phase, base1, base2);

  // inner shading (bottom dark, top light)
  const sg = ctx.createRadialGradient(-rx * 0.3, -ry * 0.45, rx * 0.1, 0, ry * 0.2, ry * 1.5);
  sg.addColorStop(0, 'rgba(255,255,255,0.34)');
  sg.addColorStop(0.55, 'rgba(255,255,255,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = sg;
  ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

  // moving specular highlight
  const hx = Math.sin(t * 0.9 + phase) * rx * 0.18;
  const hg = ctx.createRadialGradient(-rx * 0.35 + hx, -ry * 0.42, 1, -rx * 0.35 + hx, -ry * 0.42, rx * 0.62);
  hg.addColorStop(0, 'rgba(255,255,255,0.75)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

  if (crack > 0) drawCracks(ctx, rx, ry, crack, phase);
  if (armored) drawArmor(ctx, rx, ry, t, phase);
  ctx.restore();

  // ---- outline ----
  eggPath(ctx, rx, ry);
  ctx.lineWidth = Math.max(1.4, rx * 0.06);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.stroke();

  if (tier && tier.rarity !== 'common') {
    eggPath(ctx, rx * 1.02, ry * 1.02);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hexA(tier.yolk, 0.55);
    ctx.stroke();
  }

  // hit flash
  if (flash > 0) {
    ctx.save();
    eggPath(ctx, rx, ry);
    ctx.fillStyle = `rgba(255,255,255,${clamp(flash, 0, 1) * 0.8})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/* ---------------- patterns ---------------- */
function drawPattern(ctx, style, rx, ry, t, phase, c1, c2) {
  switch (style) {
    case 'dots': {
      ctx.fillStyle = 'rgba(80,60,110,0.28)';
      const step = rx * 0.62;
      for (let iy = -1; iy <= 1; iy++) {
        for (let ix = -1; ix <= 1; ix++) {
          const px = ix * step + (iy % 2 ? step * 0.5 : 0);
          const py = iy * ry * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, rx * 0.13, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    case 'stripes': {
      ctx.save();
      ctx.rotate(-0.35);
      ctx.fillStyle = 'rgba(255,110,180,0.4)';
      for (let i = -4; i <= 4; i++) {
        ctx.fillRect(-rx * 2, i * ry * 0.42, rx * 4, ry * 0.2);
      }
      ctx.restore();
      break;
    }
    case 'drip': {
      // liquid gold running down
      ctx.fillStyle = 'rgba(255,235,170,0.6)';
      const grad = ctx.createLinearGradient(0, -ry, 0, ry);
      grad.addColorStop(0, 'rgba(255,240,190,0.15)');
      grad.addColorStop(1, 'rgba(255,215,94,0.75)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-rx, -ry * 0.9);
      ctx.lineTo(rx, -ry * 0.9);
      ctx.lineTo(rx, ry);
      for (let i = 4; i >= 0; i--) {
        const px = -rx + (i / 4) * rx * 2;
        const wob = Math.sin(t * 2.4 + i * 1.7 + phase) * rx * 0.06;
        ctx.quadraticCurveTo(px + rx * 0.25 + wob, ry * 1.08, px + wob, ry * 0.86);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'galaxy': {
      // stars
      const rnd = seeded(7);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 26; i++) {
        const px = (rnd() - 0.5) * rx * 1.8;
        const py = (rnd() - 0.5) * ry * 1.9;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        ctx.globalAlpha *= tw;
        ctx.beginPath();
        ctx.arc(px, py, rnd() * rx * 0.05 + 0.6, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha /= 1;
      // nebula swirl
      const ng = ctx.createRadialGradient(rx * 0.2, ry * 0.1, 1, rx * 0.2, ry * 0.1, rx * 1.6);
      ng.addColorStop(0, 'rgba(185,139,255,0.75)');
      ng.addColorStop(0.5, 'rgba(90,60,200,0.35)');
      ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng;
      ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);
      break;
    }
    case 'void': {
      ctx.fillStyle = 'rgba(10,6,20,0.82)';
      ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);
      // cracks of light
      const rnd = seeded(19);
      ctx.strokeStyle = 'rgba(192,75,255,0.9)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#c04bff';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        let px = (rnd() - 0.5) * rx;
        let py = -ry;
        ctx.moveTo(px, py);
        while (py < ry) {
          py += ry * 0.3;
          px += (rnd() - 0.5) * rx * 0.8;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'tint': {
      // soft speckles so tinted shells still have texture
      const rnd = seeded(31);
      ctx.fillStyle = hexA(c2, 0.25);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.arc((rnd() - 0.5) * rx * 1.6, (rnd() - 0.5) * ry * 1.7, rnd() * rx * 0.1 + 1, 0, TAU);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
}

function rainbowGradient(ctx, rx, ry, t) {
  const g = ctx.createLinearGradient(-rx, -ry, rx, ry);
  const shift = (t * 40) % 360;
  const cols = ['#ff5f6d', '#ffc93c', '#5ce08a', '#5fb0ff', '#c47bff', '#ff5f6d'];
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  ctx.fillStyle = g;
  void shift;
}

function drawCracks(ctx, rx, ry, crack, phase) {
  const rnd = seeded(Math.floor(phase * 1000) + 3);
  const lines = Math.max(1, Math.round(crack * 7));
  ctx.save();
  ctx.strokeStyle = `rgba(40,20,10,${0.35 + crack * 0.5})`;
  ctx.lineWidth = Math.max(1, rx * 0.045 * (0.6 + crack));
  ctx.lineCap = 'round';
  for (let i = 0; i < lines; i++) {
    const sx = (rnd() - 0.5) * rx * 1.3;
    const sy = (rnd() - 0.5) * ry * 1.3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let x = sx, y = sy;
    const segs = 2 + Math.floor(rnd() * 3);
    for (let s = 0; s < segs; s++) {
      x += (rnd() - 0.5) * rx * 0.9;
      y += (rnd() - 0.5) * ry * 0.7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // glowing seams once nearly dead
  if (crack > 0.6) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,120,${(crack - 0.6) * 1.6})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawArmor(ctx, rx, ry, t, phase) {
  ctx.save();
  ctx.fillStyle = 'rgba(120,132,150,0.5)';
  ctx.fillRect(-rx, -ry * 0.1, rx * 2, ry * 0.9);
  ctx.strokeStyle = 'rgba(30,36,46,0.7)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const px = (i / 2.4) * rx;
    ctx.beginPath();
    ctx.moveTo(px, -ry * 0.1);
    ctx.lineTo(px, ry * 0.8);
    ctx.stroke();
  }
  // rivets
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  for (let i = -2; i <= 2; i++) {
    const px = (i / 2.4) * rx;
    ctx.beginPath();
    ctx.arc(px, -ry * 0.02 + Math.sin(t * 2 + i + phase) * 0.6, rx * 0.07, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- helpers ---------------- */
export function hexA(hex, a) {
  if (!hex) return `rgba(255,255,255,${a})`;
  if (hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** small helper for the shop: draw a tier egg into a tiny canvas */
export function drawEggPreview(canvas, tier, skinId, t = 0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = Math.min(canvas.width, canvas.height) * 0.28;
  drawEgg(ctx, {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r,
    skinId,
    tier,
    t,
    phase: 0,
    crack: 0,
  });
}

