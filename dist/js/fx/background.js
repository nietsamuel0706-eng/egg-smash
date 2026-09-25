/* ============================================================
   fx/background.js — animated kitchen-sky backdrop
   Static parts are baked once into an offscreen canvas; only the
   drifting yolk orbs and dust motes are redrawn each frame.
   ============================================================ */
import { TAU, rand, clamp, seeded } from '../core/utils.js';

export function createBackground(w, h) {
  const baked = document.createElement('canvas');
  baked.width = Math.max(1, Math.round(w));
  baked.height = Math.max(1, Math.round(h));
  paintBase(baked.getContext('2d'), baked.width, baked.height);

  const orbs = [];
  for (let i = 0; i < 9; i++) {
    orbs.push({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(40, 150),
      vx: rand(-12, 12),
      vy: rand(-8, 8),
      hue: rand(28, 52),
      alpha: rand(0.03, 0.09),
      spin: rand(-0.1, 0.1),
      a0: rand(0, TAU),
    });
  }

  const motes = [];
  for (let i = 0; i < 40; i++) {
    motes.push({
      x: rand(0, w), y: rand(0, h),
      r: rand(0.6, 2.1),
      vx: rand(-8, 8), vy: rand(-16, -4),
      tw: rand(0, TAU),
    });
  }

  return {
    w, h,
    /** re-bake the static layers for a new canvas size */
    resize(nw, nh) {
      nw = Math.max(1, Math.round(nw));
      nh = Math.max(1, Math.round(nh));
      if (nw === this.w && nh === this.h) return;
      const rx = nw / this.w;
      const ry = nh / this.h;
      this.w = nw; this.h = nh;
      baked.width = nw;
      baked.height = nh;
      paintBase(baked.getContext('2d'), nw, nh);
      for (const o of orbs) { o.x *= rx; o.y *= ry; o.r *= Math.min(rx, ry); }
      for (const m of motes) { m.x *= rx; m.y *= ry; }
    },
    update(dt) {
      for (const o of orbs) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.a0 += o.spin * dt;
        if (o.x < -o.r * 2) o.x = w + o.r;
        if (o.x > w + o.r * 2) o.x = -o.r;
        if (o.y < -o.r * 2) o.y = h + o.r;
        if (o.y > h + o.r * 2) o.y = -o.r;
      }
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.tw += dt * 2.4;
        if (m.y < -4) { m.y = h + 4; m.x = rand(0, w); }
        if (m.x < -4) m.x = w + 4;
        if (m.x > w + 4) m.x = -4;
      }
    },
    draw(ctx, t) {
      ctx.drawImage(baked, 0, 0);

      // drifting yolk orbs
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const o of orbs) {
        const wob = 1 + Math.sin(o.a0) * 0.12;
        const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, o.r * wob);
        g.addColorStop(0, `hsla(${o.hue}, 90%, 65%, ${o.alpha})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * wob, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // dust motes
      ctx.save();
      for (const m of motes) {
        ctx.globalAlpha = 0.18 + Math.abs(Math.sin(m.tw)) * 0.35;
        ctx.fillStyle = '#fff8e7';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      void t;
    },
  };
}

function paintBase(ctx, w, h) {
  // deep gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a1226');
  g.addColorStop(0.55, '#140e20');
  g.addColorStop(1, '#0c0814');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // warm glow from the top (the "stove light")
  const warm = ctx.createRadialGradient(w / 2, -h * 0.15, 20, w / 2, -h * 0.15, h * 1.15);
  warm.addColorStop(0, 'rgba(255,196,90,0.16)');
  warm.addColorStop(1, 'transparent');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  // egg-carton hex grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = 1.5;
  const R = 46;
  for (let row = 0; row * R * 1.5 < h + R; row++) {
    for (let col = 0; col * R * 1.732 < w + R; col++) {
      const cx = col * R * 1.732 + (row % 2 ? R * 0.866 : 0);
      const cy = row * R * 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const px = cx + Math.cos(a) * R * 0.94;
        const py = cy + Math.sin(a) * R * 0.94;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // floor band (where the breaker lives)
  const floor = ctx.createLinearGradient(0, h - 70, 0, h);
  floor.addColorStop(0, 'rgba(60,40,90,0)');
  floor.addColorStop(1, 'rgba(60,40,90,0.35)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h - 70, w, 70);

  // faint speckles so the sky isn't flat
  const rnd = seeded(1234);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 180; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
  }
}

/** vignette drawn last, on top of the world */
export function drawVignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'transparent');
  g.addColorStop(1, `rgba(0,0,0,${clamp(strength, 0, 1)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
