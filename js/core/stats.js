/* ============================================================
   core/stats.js — turns the save file into the numbers the game uses
   ============================================================ */
import { state, boostEffects } from './state.js';
import { HAMMER_BY_ID, SKIN_BY_ID } from '../data/skins.js';
import { UPGRADE_BY_ID } from '../data/upgrades.js';

const lv = (id) => state.upgrades[id] || 0;

/**
 * Everything the game needs, recomputed once per frame.
 * Cheap: a handful of multiplies.
 */
export function derived() {
  const hammer = HAMMER_BY_ID[state.equipped.hammer] || HAMMER_BY_ID.mallet_rubber;
  const skin = SKIN_BY_ID[state.equipped.eggSkin] || SKIN_BY_ID.shell_plain;
  const b = boostEffects();

  const power = 1 + lv('power') + hammer.dmg;
  const critChance = Math.min(0.95, 0.05 + lv('crit') * 0.025 + hammer.crit / 100 + (b.critAdd || 0) / 100);
  const critMult = 2 + lv('critMult') * 0.6;
  const yolkMult = (1 + lv('yolk') * 0.18) * (1 + skin.bonus) * (b.yolkMult || 1);
  const paddleW = 92 + lv('paddle') * 9;
  const magnetR = lv('magnet') * 26;
  const spawnMult = (1 + lv('spawn') * 0.06) * (b.frenzy ? 2 : 1);
  const speedMult = b.frenzy ? 1.25 : 1;
  const comboWindow = 2.2 + lv('combo') * 0.12;
  const luck = (lv('luck') * 0.04 + (b.luckAdd || 0) / 100);
  const autoSmash = (b.autoSmash || 0) > 0;

  return {
    power, critChance, critMult, yolkMult, paddleW, magnetR,
    spawnMult, speedMult, comboWindow, luck, autoSmash,
    drones: state.drones,
    hammer, skin,
  };
}

/** one-shot roll — a crit with a fat extra multiplier */
export function rollDamage(d) {
  const crit = Math.random() < d.critChance;
  return {
    crit,
    damage: d.power * (crit ? d.critMult : 1),
  };
}

/** coins for a smashed egg */
export const CRIT_COIN_BONUS = 1.5;

export function payout(tier, comboMult, crit) {
  const bonus = crit ? CRIT_COIN_BONUS : 1;
  return Math.max(1, Math.round(tier.value * comboMult * bonus));
}

/** levels a stat for the shop UI */
export function upgradeValue(id) {
  const u = UPGRADE_BY_ID[id];
  return u ? u.show(lv(id)) : '?';
}
export function upgradeLevel(id) {
  return lv(id);
}
