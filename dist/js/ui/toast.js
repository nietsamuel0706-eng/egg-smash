/* ============================================================
   ui/toast.js — DOM feedback: toasts, screen flashes, CSS shake,
   confetti in the browser layer. All the "juice" that isn't canvas.
   ============================================================ */
import { rand, randInt } from '../core/utils.js';
import { sfx } from '../core/audio.js';

const host = () => document.getElementById('toasts');
const fxLayer = () => document.getElementById('fxLayer');

/* ---------------- toasts ---------------- */
export function toast(msg, kind = '', ico = null) {
  const h = host();
  if (!h) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${ico ? `<span>${ico}</span>` : ''}<span>${msg}</span>`;
  h.appendChild(el);
  setTimeout(() => el.remove(), 2600);
  // never stack more than 5 (firstElementChild is always an Element)
  while (h.children.length > 5 && h.firstElementChild) h.firstElementChild.remove();
}

/* ---------------- screen flash ---------------- */
export function flash(kind = 'hit') {
  const layer = fxLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `flash ${kind}`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

/* ---------------- css shake (page-level, subtle) ---------------- */
export function screenShake(power = 1) {
  const layer = fxLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'shake';
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.animationDuration = `${Math.max(0.18, 0.4 - power * 0.2)}s`;
  el.style.setProperty('--k', String(power));
  // amplitude via a wrapper so we can scale the keyframe distance
  el.style.setProperty('--amp', `${Math.min(14, 4 + power * 10)}px`);
  el.style.animationName = 'shakeIt';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

export function zoomPulse() {
  const layer = fxLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'zoom';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 340);
}

/* ---------------- dom confetti burst ---------------- */
export function confettiBurst(count = 40) {
  const layer = fxLayer();
  if (!layer) return;
  const colors = ['#ffd75e', '#b98bff', '#5ce08a', '#ff7ae0', '#fff6c9', '#5fb0ff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'confetti';
    el.style.left = `${rand(0, 100)}%`;
    el.style.top = `${rand(-10, 30)}%`;
    el.style.background = colors[randInt(0, colors.length - 1)];
    el.style.animationDuration = `${rand(1.2, 2.6)}s`;
    el.style.setProperty('--cx', `${rand(-140, 140)}px`);
    el.style.setProperty('--cr', `${randInt(360, 1080)}deg`);
    el.style.opacity = '0.9';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
}

/* ---------------- combined feedback helpers ---------------- */
export function bigHitFx(crit = false) {
  flash(crit ? 'crit' : 'hit');
  if (crit) {
    screenShake(1);
    zoomPulse();
  }
}

/* ---------------- element pulse helpers ---------------- */
export function pulseEl(el, cls = 'flash', ms = 560) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

export function denyFx(el) {
  if (!el) return;
  el.classList.remove('deniedShake');
  void el.offsetWidth;
  el.style.animation = 'deniedShake .38s ease';
  sfx.deny();
  setTimeout(() => { el.style.animation = ''; }, 420);
}
