/* ============================================================
   data/eggs.js — egg tiers: hp, value, size, look, spawn weight
   ============================================================ */

/**
 * hp        : base hit points
 * value     : base coins
 * r         : radius in canvas px
 * speed     : fall speed multiplier
 * weight    : relative spawn chance
 * unlock    : eggs smashed before this tier can appear
 * shell/2   : shell gradient stops
 * yolk      : yolk colour
 */
export const TIERS = [
  {
    id: 'common', name: 'Farm Fresh', rarity: 'common',
    hp: 1, value: 1, r: 25, speed: 1.0, weight: 100, unlock: 0,
    shell: '#fff8e7', shell2: '#d7c9a4', yolk: '#ffc93c',
  },
  {
    id: 'speckled', name: 'Speckled Hen', rarity: 'rare',
    hp: 2, value: 5, r: 27, speed: 1.06, weight: 52, unlock: 12,
    shell: '#eaf3ff', shell2: '#a9c2dd', yolk: '#ffd75e',
  },
  {
    id: 'bluebird', name: 'Bluebird', rarity: 'rare',
    hp: 4, value: 16, r: 29, speed: 1.12, weight: 30, unlock: 60,
    shell: '#bfe0ff', shell2: '#5f8dd6', yolk: '#ffe08a',
  },
  {
    id: 'emerald', name: 'Emerald', rarity: 'epic',
    hp: 8, value: 55, r: 30, speed: 1.18, weight: 17, unlock: 260,
    shell: '#b6ffd8', shell2: '#2fae7d', yolk: '#fff2a8',
  },
  {
    id: 'dragon', name: 'Dragon', rarity: 'epic',
    hp: 16, value: 190, r: 32, speed: 1.24, weight: 9, unlock: 900,
    shell: '#d7b6ff', shell2: '#7a3ec9', yolk: '#ffb0f0',
  },
  {
    id: 'titan', name: 'Titan Shell', rarity: 'legendary',
    hp: 34, value: 720, r: 35, speed: 1.3, weight: 4.5, unlock: 3200,
    shell: '#ffe9a8', shell2: '#c99a1e', yolk: '#fff8d0',
  },
  {
    id: 'cosmic', name: 'Cosmic', rarity: 'mythic',
    hp: 70, value: 2800, r: 37, speed: 1.36, weight: 2, unlock: 11000,
    shell: '#8f7bff', shell2: '#241a5e', yolk: '#8ffff0',
  },
  {
    id: 'void', name: 'Void Egg', rarity: 'ultra',
    hp: 150, value: 12000, r: 39, speed: 1.42, weight: 0.8, unlock: 40000,
    shell: '#4a3a63', shell2: '#120c1e', yolk: '#ff4fd8',
  },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

export const RARITY_COLOR = {
  common: '#9fb0c9',
  rare: '#5fb0ff',
  epic: '#c47bff',
  legendary: '#ffc93c',
  mythic: '#ff6b8a',
  ultra: '#7bffd4',
};

/** the armored variant of a tier: 3x hp, 2.4x value, slower */
export function makeArmored(tier) {
  return {
    ...tier,
    id: tier.id + '_armored',
    name: tier.name + ' (Armored)',
    hp: Math.ceil(tier.hp * 3),
    value: Math.round(tier.value * 2.4),
    r: tier.r + 4,
    speed: tier.speed * 0.88,
    armored: true,
    shell: '#8e97a8',
    shell2: '#3a4150',
    yolk: '#ffd0d0',
  };
}

export function tierPool(eggsSmashed, luck = 0) {
  return TIERS.filter((t) => eggsSmashed >= t.unlock);
}

/** luck pushes weight from common towards rare+ */
export function rollTier(eggsSmashed, luck = 0) {
  const pool = tierPool(eggsSmashed).map((t) => {
    const rareBoost = 1 + (TIERS.length - 1 - TIERS.indexOf(t)) * luck * 0.55;
    return { t, weight: t.weight * rareBoost };
  });
  let total = 0;
  for (const p of pool) total += p.weight;
  let roll = Math.random() * total;
  for (const p of pool) {
    roll -= p.weight;
    if (roll <= 0) return p.t;
  }
  return pool[0].t;
}
