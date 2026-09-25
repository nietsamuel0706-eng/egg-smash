/* ============================================================
   fx/particles.js — pooled canvas particle system + yolk decals
   Types: chunk, yolk, spark, ring, smoke, star, confetti
   ============================================================ */
import { rand, randInt, pick, TAU, clamp } from '../core/utils.js';

const MAX = 1400;
const MAX_DECALS = 90;

/** world scale: 1 = the original 960x600 design, up to ~1.7 on big screens */
let S = 1;

export function createParticles() {
  const pool = new Array(MAX);
  for (let i = 0; i < MAX; i++) {
    pool[i] = { alive: false, type: 'chunk', x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 0, rot: 0, spin: 0, color: '#fff', color2: '#fff', grav: 1, drag: 0, glow: 0, text: '' };
  }
  let cursor = 0;
  const decals = [];

  function take() {
    // ring buffer: newest particle always wins
    for (let i = 0; i < MAX; i++) {
      const p = pool[cursor];
      cursor = (cursor + 1) % MAX;
      if (!p.alive) return p;
    }
    return pool[cursor];
  }

  const api = {
    /* ---------------- emitters ---------------- */

    /** shell fragments flying outward */
    chunks(x, y, color, color2, count = 10, speed = 1) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(0, TAU);
        const sp = rand(60, 260) * speed * S;
        p.alive = true; p.type = 'chunk';
        p.x = x + rand(-4, 4) * S; p.y = y + rand(-4, 4) * S;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - rand(30, 110) * S;
        p.grav = 900 * S; p.drag = 0.5;
        p.life = p.max = rand(0.5, 1.05);
        p.size = rand(3, 9) * S; p.rot = rand(0, TAU); p.spin = rand(-9, 9);
        p.color = color; p.color2 = color2; p.glow = 0;
      }
    },

    /** yolk droplets: arc out then splat a decal when they land */
    yolk(x, y, color, count = 12, speed = 1) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(0, TAU);
        const sp = rand(50, 300) * speed * S;
        p.alive = true; p.type = 'yolk';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - rand(60, 180) * S;
        p.grav = 1250 * S; p.drag = 0.15;
        p.life = p.max = rand(0.55, 1.2);
        p.size = rand(2.5, 8) * S; p.rot = 0; p.spin = 0;
        p.color = color; p.glow = 0.35;
      }
    },

    /** speed-line sparks, used for crits */
    sparks(x, y, color, count = 14, speed = 1) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(0, TAU);
        const sp = rand(180, 620) * speed * S;
        p.alive = true; p.type = 'spark';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        p.grav = 120 * S; p.drag = 2.4;
        p.life = p.max = rand(0.2, 0.5);
        p.size = rand(1.5, 4) * S; p.rot = a; p.spin = 0;
        p.color = color; p.glow = 1;
      }
    },

    /** expanding shockwave ring */
    ring(x, y, color, size = 40, grow = 260, width = 5) {
      const p = take();
      p.alive = true; p.type = 'ring';
      p.x = x; p.y = y; p.vx = grow * S; p.vy = Math.max(1, width * S);
      p.grav = 0; p.drag = 0;
      p.life = p.max = 0.42;
      p.size = size * S; p.rot = 0; p.spin = 0;
      p.color = color; p.glow = 1;
    },

    /** soft puffy smoke */
    smoke(x, y, color, count = 6, scale = 1) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(0, TAU);
        p.alive = true; p.type = 'smoke';
        p.x = x + rand(-6, 6) * S; p.y = y + rand(-6, 6) * S;
        p.vx = Math.cos(a) * rand(10, 60) * scale * S;
        p.vy = Math.sin(a) * rand(10, 40) * scale * S - 20 * S;
        p.grav = -30 * S; p.drag = 1.4;
        p.life = p.max = rand(0.5, 1.1);
        p.size = rand(8, 22) * scale * S; p.rot = 0; p.spin = 0;
        p.color = color; p.glow = 0;
      }
    },

    /** 4-point twinkle */
    star(x, y, color, count = 1, scale = 1) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(0, TAU);
        p.alive = true; p.type = 'star';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * rand(20, 90) * scale * S;
        p.vy = Math.sin(a) * rand(20, 90) * scale * S - 30 * S;
        p.grav = 120 * S; p.drag = 1.2;
        p.life = p.max = rand(0.4, 0.9);
        p.size = rand(6, 16) * scale * S;
        p.rot = rand(0, TAU); p.spin = rand(-3, 3);
        p.color = color; p.glow = 1;
      }
    },

    /** victory confetti */
    confetti(x, y, colors, count = 30) {
      for (let i = 0; i < count; i++) {
        const p = take();
        const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
        const sp = rand(120, 420) * S;
        p.alive = true; p.type = 'confetti';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        p.grav = 620 * S; p.drag = 1.1;
        p.life = p.max = rand(1.2, 2.4);
        p.size = rand(4, 9) * S;
        p.rot = rand(0, TAU); p.spin = rand(-12, 12);
        p.color = pick(colors); p.glow = 0.1;
      }
    },

    /* ---------------- composite presets ---------------- */

    /** full egg destruction */
    smash(x, y, tier, power = 1) {
      api.chunks(x, y, tier.shell, tier.shell2, randInt(8, 14), 0.9 + power * 0.25);
      api.yolk(x, y, tier.yolk, randInt(10, 18), 0.9 + power * 0.2);
      api.smoke(x, y, 'rgba(255,255,255,0.16)', 4, 0.7);
      api.ring(x, y, tier.yolk, 16, 300 + power * 60, 4);
      api.addDecal(x, y + tier.r * 0.35, tier.yolk, tier.r * (0.9 + power * 0.12));
    },

    /** crit hit: extra everything */
    crit(x, y, tier) {
      api.sparks(x, y, '#fff6c9', 20, 1.2);
      api.star(x, y, '#ffd75e', 5, 1.2);
      api.ring(x, y, '#ffffff', 20, 520, 7);
      api.ring(x, y, '#ff7ae0', 30, 380, 4);
      api.yolk(x, y, tier.yolk, 16, 1.5);
      api.addDecal(x, y, '#ffd75e', tier.r * 1.5);
    },

    /** golden egg death — go hard */
    goldenBurst(x, y) {
      api.confetti(x, y, ['#ffd75e', '#fff6c9', '#b98bff', '#5ce08a', '#ff7ae0'], 90);
      api.sparks(x, y, '#fff6c9', 40, 1.6);
      api.star(x, y, '#ffd75e', 14, 1.6);
      api.ring(x, y, '#ffd75e', 30, 700, 10);
      api.ring(x, y, '#ffffff', 20, 500, 6);
      api.chunks(x, y, '#fff0b8', '#d4a01c', 26, 1.5);
      api.yolk(x, y, '#ffd75e', 34, 1.6);
      api.smoke(x, y, 'rgba(255,215,94,0.22)', 10, 1.4);
      api.addDecal(x, y, '#ffd75e', 60);
    },

    /* ---------------- decals (yolk splats on the floor) ---------------- */
    addDecal(x, y, color, r) {
      decals.push({ x, y, color, r, life: 1, born: performance.now() });
      if (decals.length > MAX_DECALS) decals.shift();
    },

    /* ---------------- simulation ---------------- */
    update(dt, floorY) {
      for (let i = 0; i < MAX; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; continue; }

        if (p.drag) {
          const f = Math.pow(1 - Math.min(0.95, p.drag * dt), 1);
          p.vx *= f; p.vy *= f;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;

        // yolk droplets splat when they hit the floor
        if (p.type === 'yolk' && p.vy > 0 && p.y > floorY) {
          api.addDecal(p.x, floorY, p.color, p.size * 2.2);
          p.alive = false;
        }
      }
    },

    clear() {
      for (let i = 0; i < MAX; i++) pool[i].alive = false;
      decals.length = 0;
    },

    pool,
    decals,

    /** called on resize so every particle keeps its proportions */
    setScale(v) { S = clamp(v, 0.25, 4); },

    get count() {
      let n = 0;
      for (let i = 0; i < MAX; i++) if (pool[i].alive) n++;
      return n;
    },
  };

  return api;
}

/* ============================================================
   drawing
   ============================================================ */
export function drawParticles(ctx, P) {
  // decals first (on the floor, under everything)
  for (const d of P.decals) {
    const age = (performance.now() - d.born) / 1000;
    const a = clamp(1 - age / 9, 0, 1) * 0.42;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU;
      const rr = d.r * (0.75 + 0.35 * Math.sin(i * 2.7 + d.x));
      const px = d.x + Math.cos(ang) * rr;
      const py = d.y + Math.sin(ang) * rr * 0.32;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < P.pool.length; i++) {
    const p = P.pool[i];
    if (!p.alive) continue;
    const k = clamp(p.life / p.max, 0, 1);

    switch (p.type) {
      case 'chunk': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(k * 1.6, 0, 1);
        const g = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, p.color2);
        ctx.fillStyle = g;
        ctx.beginPath();
        // irregular shard
        ctx.moveTo(-p.size, -p.size * 0.6);
        ctx.lineTo(p.size * 0.8, -p.size);
        ctx.lineTo(p.size, p.size * 0.7);
        ctx.lineTo(-p.size * 0.4, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'yolk': {
        ctx.save();
        ctx.globalAlpha = clamp(k * 1.4, 0, 1);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow * 12;
        ctx.beginPath();
        // teardrop: stretch along velocity
        const sp = Math.hypot(p.vx, p.vy);
        const stretch = clamp(1 + sp / 900, 1, 2.4);
        ctx.ellipse(p.x, p.y, p.size, p.size * stretch, Math.atan2(p.vy, p.vx) - Math.PI / 2, 0, TAU);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'spark': {
        ctx.save();
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'ring': {
        const t = 1 - k;
        const r = p.size + p.vx * t;
        ctx.save();
        ctx.globalAlpha = k * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, p.vy * k);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'smoke': {
        const grow = 1 + (1 - k) * 1.8;
        ctx.save();
        ctx.globalAlpha = k * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * grow, 0, TAU);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'star': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        const s = p.size * (0.4 + k * 0.8);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const rr = i % 2 === 0 ? s : s * 0.28;
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'confetti': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = clamp(k * 1.8, 0, 1);
        ctx.fillStyle = p.color;
        const sq = Math.abs(Math.cos(p.rot * 1.7));
        ctx.fillRect(-p.size / 2, -p.size * sq / 2, p.size, p.size * sq);
        ctx.restore();
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
