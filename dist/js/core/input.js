/* ============================================================
   core/input.js — keyboard, mouse, touch → one tiny event bus
   ============================================================ */

const listeners = new Map();
export const keys = new Set();

export const pointer = {
  x: 0, y: 0,      // canvas space
  down: false,
  inside: false,
  active: false,   // has the user taken control
};

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, data) {
  const set = listeners.get(evt);
  if (!set) return;
  for (const fn of set) fn(data);
}

/* ---------------- mapping ---------------- */
const MOVE_LEFT = new Set(['a', 'A', 'ArrowLeft']);
const MOVE_RIGHT = new Set(['d', 'D', 'ArrowRight']);
const SMASH = new Set([' ', 'Spacebar', 'Enter']);

/**
 * @param canvas the game canvas (used to map pointer coords)
 * @param hooks  { onLeft, onRight, onSmash, onTap, onMove }
 */
export function attachInput(canvas, hooks = {}) {
  const toCanvas = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const move = (x, y) => {
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    pointer.active = true;
    emit('move', pointer);
    hooks.onMove && hooks.onMove(x, y);
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key;
    if (k === ' ' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
    }
    if (MOVE_LEFT.has(k)) { emit('left'); hooks.onLeft && hooks.onLeft(); }
    if (MOVE_RIGHT.has(k)) { emit('right'); hooks.onRight && hooks.onRight(); }
    if (SMASH.has(k)) {
      pointer.active = true;
      emit('smash', { source: 'key' });
      hooks.onSmash && hooks.onSmash('key');
    }
    keys.add(k);
  }, { passive: false });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    move(p.x, p.y);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    move(p.x, p.y);
    pointer.down = true;
    emit('smash', { source: 'pointer' });
    hooks.onSmash && hooks.onSmash('pointer');
  });

  window.addEventListener('pointerup', () => { pointer.down = false; });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // touch: drag anywhere on the canvas to steer + auto-smash on touch
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const p = toCanvas(t.clientX, t.clientY);
    move(p.x, p.y);
    emit('smash', { source: 'touch' });
    hooks.onSmash && hooks.onSmash('touch');
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const p = toCanvas(t.clientX, t.clientY);
    move(p.x, p.y);
    e.preventDefault();
  }, { passive: false });
}

export function isLeft() {
  for (const k of keys) if (MOVE_LEFT.has(k)) return true;
  return false;
}
export function isRight() {
  for (const k of keys) if (MOVE_RIGHT.has(k)) return true;
  return false;
}
