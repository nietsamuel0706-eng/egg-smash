/* ============================================================
   fx/floaters.js — floating score/coin text drawn on the canvas
   (+1, CRIT!, COMBO x4, MISS)
   ============================================================ */
import { rand, clamp } from '../core/utils.js';
import { Ease } from './tween.js';

const MAX = 90;

export function createFloaters() {
  const items = [];
  let S = 1;
  return {
    /**
     * @param o {x,y,text,color,size,vy,life,pop,stroke}
     */
    add(o) {
      if (items.length >= MAX) items.shift();
      items.push({
        x: o.x, y: o.y,
        x0: o.x, y0: o.y,
        text: o.text,
        color: o.color || '#fff8e7',
        size: (o.size || 18) * S,
        life: o.life || 1.1,
        max: o.life || 1.1,
        vy: o.vy ?? -52,
        vx: o.vx ?? rand(-14, 14),
        pop: o.pop ?? 0.25,
        stroke: o.stroke ?? true,
        rot: o.rot ?? 0,
        spin: o.spin ?? 0,
        delay: o.delay || 0,
      });
    },

    update(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        const f = items[i];
        if (f.delay > 0) { f.delay -= dt; continue; }
        f.life -= dt;
        if (f.life <= 0) { items.splice(i, 1); continue; }
        f.y += f.vy * dt;
        f.x += f.vx * dt;
        f.vy *= Math.pow(0.12, dt); // ease out the rise
        f.rot += f.spin * dt;
      }
    },

    draw(ctx) {
      for (const f of items) {
        if (f.delay > 0) continue;
        const k = clamp(f.life / f.max, 0, 1);
        // pop in with overshoot, fade out at the end
        const inK = 1 - clamp((f.max - f.life) / f.pop, 0, 1);
        const scale = Ease.outBack(inK) * (0.9 + k * 0.1);
        const alpha = k > 0.75 ? (1 - k) / 0.25 : 1;

        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.scale(scale, scale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${f.size}px "Trebuchet MS", Verdana, sans-serif`;

        if (f.stroke) {
          ctx.lineWidth = Math.max(3, f.size * 0.22);
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.lineJoin = 'round';
          ctx.strokeText(f.text, 0, 0);
        }
        ctx.shadowColor = f.color;
        ctx.shadowBlur = f.size * 0.6;
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
    },

    setScale(v) { S = clamp(v, 0.25, 4); },
    clear() { items.length = 0; },
    get count() { return items.length; },
  };
}

