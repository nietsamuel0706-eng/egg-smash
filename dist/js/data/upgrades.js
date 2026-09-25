/* ============================================================
   data/upgrades.js — permanent upgrades, drones, timed boosts
   ============================================================ */
import { costAt } from '../core/utils.js';

/**
 * Every upgrade: levels, exponential cost, a per-level stat bump.
 * `show(lvl)` formats the current → next value for the shop card.
 */
export const UPGRADES = [
  {
    id: 'power', name: 'Raw Power', rarity: 'common', icon: 'POW', max: 80,
    base: 70, growth: 1.52, per: 'flat',
    blurb: 'Damage dealt by every smash.',
    show: (l) => `+${l} dmg`,
  },
  {
    id: 'crit', name: 'Crit Chance', rarity: 'common', icon: 'CRT', max: 40,
    base: 240, growth: 1.62, per: 'flat',
    blurb: 'Odds of a massive crit smash.',
    show: (l) => `${(5 + l * 2.5).toFixed(1)}%`,
  },
  {
    id: 'critMult', name: 'Crit Damage', rarity: 'rare', icon: 'CDM', max: 30,
    base: 1100, growth: 1.72, per: 'flat',
    blurb: 'How hard crits land.',
    show: (l) => `x${(2 + l * 0.6).toFixed(1)}`,
  },
  {
    id: 'yolk', name: 'Yolk Value', rarity: 'common', icon: 'YLK', max: 80,
    base: 160, growth: 1.48, per: 'flat',
    blurb: 'Coins earned per yolk.',
    show: (l) => `x${(1 + l * 0.18).toFixed(2)}`,
  },
  {
    id: 'paddle', name: 'Paddle Width', rarity: 'common', icon: 'PAD', max: 25,
    base: 220, growth: 1.44, per: 'flat',
    blurb: 'Wider breaker. More eggs die.',
    show: (l) => `${92 + l * 9}px`,
  },
  {
    id: 'magnet', name: 'Yolk Magnet', rarity: 'rare', icon: 'MAG', max: 15,
    base: 480, growth: 1.56, per: 'flat',
    blurb: 'Auto-smashes eggs that drift into range.',
    show: (l) => (l === 0 ? 'off' : `${l * 26}px`),
  },
  {
    id: 'spawn', name: 'Egg Rain', rarity: 'common', icon: 'RNG', max: 30,
    base: 340, growth: 1.6, per: 'flat',
    blurb: 'Eggs fall more often.',
    show: (l) => `x${(1 + l * 0.06).toFixed(2)}`,
  },
  {
    id: 'combo', name: 'Combo Window', rarity: 'epic', icon: 'CMB', max: 20,
    base: 620, growth: 1.62, per: 'flat',
    blurb: 'How long a combo stays alive.',
    show: (l) => `${(2.2 + l * 0.12).toFixed(2)}s`,
  },
  {
    id: 'luck', name: 'Luck', rarity: 'epic', icon: 'LCK', max: 25,
    base: 1500, growth: 1.7, per: 'flat',
    blurb: 'Rarer eggs + more golden eggs.',
    show: (l) => `+${(l * 4).toFixed(0)}%`,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** smashing drones — permanent, they find eggs and zap them on their own */
export const DRONES = {
  id: 'drones', name: 'Auto-Smasher Drone', rarity: 'legendary',
  base: 4200, growth: 3.1, max: 6,
  blurb: 'A hovering drone that cracks eggs for you.',
};

/** timed, consumable boosts bought with coins */
export const BOOSTS = [
  { id: 'yolk2', name: 'Double Yolk', rarity: 'common', cost: 600, dur: 60, icon: '2x',
    blurb: 'Double coins for 60s.', effect: 'yolkMult', amount: 2 },
  { id: 'yolk3', name: 'Triple Yolk', rarity: 'rare', cost: 2800, dur: 45, icon: '3x',
    blurb: 'Triple coins for 45s.', effect: 'yolkMult', amount: 3 },
  { id: 'frenzy', name: 'Egg Frenzy', rarity: 'rare', cost: 3400, dur: 40, icon: 'FRZ',
    blurb: 'Twice the egg rate, +25% fall speed.', effect: 'frenzy', amount: 1 },
  { id: 'crits', name: 'Loaded Dice', rarity: 'rare', cost: 1900, dur: 60, icon: 'CRT',
    blurb: '+40% crit chance for 60s.', effect: 'critAdd', amount: 40 },
  { id: 'steady', name: 'Steady Hands', rarity: 'epic', cost: 5200, dur: 30, icon: 'MAG',
    blurb: 'Full auto-smash for 30s.', effect: 'autoSmash', amount: 9999 },
  { id: 'fortune', name: 'Fortune Cookie', rarity: 'epic', cost: 4600, dur: 90, icon: 'LCK',
    blurb: '+35% luck & goldens for 90s.', effect: 'luckAdd', amount: 35 },
];

export const BOOST_BY_ID = Object.fromEntries(BOOSTS.map((b) => [b.id, b]));

export function upgradeCost(u, level) {
  return costAt(u.base, u.growth, level);
}
export function droneCost(level) {
  return costAt(DRONES.base, DRONES.growth, level);
}
