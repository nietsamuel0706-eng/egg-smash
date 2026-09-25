/* ============================================================
   systems/combo.js — the combo meter
   Smashes in quick succession stack a multiplier; letting the
   bar drain resets it. This is the core risk/reward loop.
   ============================================================ */

export function createCombo() {
  return {
    count: 0,
    timer: 0,
    window: 2.2,
    best: 0,
    lastHitAt: 0,
    /** fires when the combo ends */
    onBreak: null,
    brokeAt: 0,
  };
}

/** x1 up to 4 hits, then +0.25 per 4 hits, hard capped at x4 */
export function multFor(count) {
  if (count < 4) return 1;
  return Math.min(4, 1 + Math.floor((count - 4) / 4) * 0.25);
}

export function registerHit(combo, windowSec) {
  combo.count++;
  combo.window = windowSec;
  combo.timer = windowSec;
  combo.best = Math.max(combo.best, combo.count);
  return combo.count;
}

export function updateCombo(combo, dt) {
  if (combo.count === 0) return null;
  combo.timer -= dt;
  if (combo.timer <= 0) {
    const lost = combo.count;
    combo.count = 0;
    combo.timer = 0;
    if (lost >= 4 && combo.onBreak) combo.onBreak(lost);
    return lost >= 4 ? lost : null;
  }
  return null;
}

export function comboRatio(combo) {
  if (combo.count === 0) return 0;
  return Math.max(0, Math.min(1, combo.timer / combo.window));
}
