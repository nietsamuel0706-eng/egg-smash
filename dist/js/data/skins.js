/* ============================================================
   data/skins.js — hammer skins + egg skins (cosmetics w/ bonuses)
   ============================================================ */

/**
 * HAMMERS — damage is the flat bonus on top of the power upgrade.
 * crit adds percentage points of crit chance while equipped.
 */
export const HAMMERS = [
  { id: 'mallet_rubber', name: 'Rubber Mallet', rarity: 'common', cost: 0, dmg: 1, crit: 0,
    desc: 'The trusty kitchen mallet. It has seen things.', head: '#e0464f', head2: '#8f2229', trim: '#f4efe0' },
  { id: 'mallet_wood', name: 'Oakwood Slam', rarity: 'common', cost: 150, dmg: 3, crit: 2,
    desc: 'Barn-fresh oak. Smells like a barn.', head: '#c58c4a', head2: '#7a4f21', trim: '#5b3a17' },
  { id: 'mallet_stone', name: 'Granite Cracker', rarity: 'rare', cost: 1100, dmg: 9, crit: 4,
    desc: 'A literal rock. A literal problem for eggs.', head: '#9aa3b2', head2: '#4a5261', trim: '#2b3038' },
  { id: 'mallet_iron', name: 'Iron Maul', rarity: 'rare', cost: 5200, dmg: 26, crit: 6,
    desc: 'Forged at 4000 degrees. Mostly.', head: '#d7dde6', head2: '#6c7788', trim: '#39404c' },
  { id: 'mallet_gold', name: 'Gilded Hammer', rarity: 'epic', cost: 26000, dmg: 68, crit: 9,
    desc: 'Wealthiest chicken in the world bought this.', head: '#ffe9a8', head2: '#c99a1e', trim: '#7a5a05' },
  { id: 'mallet_plasma', name: 'Plasma Core', rarity: 'epic', cost: 88000, dmg: 170, crit: 13, shards: 12,
    desc: 'Superheated. Slightly illegal.', head: '#8ff0ff', head2: '#1f6fa8', trim: '#0b2c46', glow: '#7fe6ff' },
  { id: 'mallet_crystal', name: 'Prism Maul', rarity: 'legendary', cost: 300000, dmg: 460, crit: 18, shards: 30,
    desc: 'Refracts sunlight into tiny deaths.', head: '#d9c2ff', head2: '#7b4fd6', trim: '#3a2170', glow: '#c9a6ff' },
  { id: 'mallet_void', name: 'The Unmaker', rarity: 'mythic', cost: 950000, dmg: 1250, crit: 26, shards: 70,
    desc: 'Do not look at it while swinging.', head: '#2a1f3d', head2: '#0b0714', trim: '#ff4fd8', glow: '#c04bff' },
];

/**
 * EGG_SKINS — recolour every falling egg and add a passive yolk bonus.
 * style is read by fx/egg-art.js
 */
export const EGG_SKINS = [
  { id: 'shell_plain', name: 'Natural Shell', rarity: 'common', cost: 0, bonus: 0, style: 'plain',
    desc: 'As the chicken intended.', tint: null },
  { id: 'shell_dots', name: 'Polka Pips', rarity: 'common', cost: 320, bonus: 0.06, style: 'dots',
    desc: 'Classic. Suspiciously classic.', tint: null },
  { id: 'shell_stripes', name: 'Candy Stripe', rarity: 'common', cost: 1900, bonus: 0.12, style: 'stripes',
    desc: 'Sweet, crunchy, structurally unsound.', tint: null },
  { id: 'shell_sky', name: 'Sky Blue', rarity: 'rare', cost: 8200, bonus: 0.2, style: 'tint', tint: ['#dff0ff', '#6fa8e8'],
    desc: 'Bought on a clear day.', tintName: '#7fb8f0' },
  { id: 'shell_gold', name: 'Gilded Drip', rarity: 'epic', cost: 30000, bonus: 0.32, style: 'drip', shards: 6, tint: ['#fff0b8', '#d4a01c'],
    desc: 'Liquid money, hard boiled.', tintName: '#ffd75e' },
  { id: 'shell_rainbow', name: 'Rainbow Grille', rarity: 'epic', cost: 105000, bonus: 0.48, style: 'rainbow', shards: 15,
    desc: 'Taste the rainbow. Then break it.', tintName: '#ff7ae0' },
  { id: 'shell_galaxy', name: 'Galaxy Shell', rarity: 'legendary', cost: 320000, bonus: 0.72, style: 'galaxy', shards: 28,
    desc: 'Contains a small, ignorable universe.', tintName: '#8f7bff' },
  { id: 'shell_void', name: 'Voidshell', rarity: 'mythic', cost: 900000, bonus: 1.15, style: 'void', shards: 55,
    desc: 'Do not hold it near your face.', tintName: '#c04bff' },
];

export const HAMMER_BY_ID = Object.fromEntries(HAMMERS.map((h) => [h.id, h]));
export const SKIN_BY_ID = Object.fromEntries(EGG_SKINS.map((s) => [s.id, s]));

export const RARITY_LABEL = {
  common: 'COMMON', rare: 'RARE', epic: 'EPIC',
  legendary: 'LEGENDARY', mythic: 'MYTHIC', ultra: 'ULTRA',
};
