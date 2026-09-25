/* ============================================================
   core/state.js — the save file, mutations and the pub/sub bus
   ============================================================ */
import { UPGRADES, BOOST_BY_ID } from '../data/upgrades.js';

const KEY = 'eggsmasher.save.v1';
const SAVE_VERSION = 1;

function freshSave() {
  const upgrades = {};
  for (const u of UPGRADES) upgrades[u.id] = 0;

  return {
    v: SAVE_VERSION,
    coins: 0,
    shards: 0,
    owned: {
      hammers: ['mallet_rubber'],
      eggSkins: ['shell_plain'],
    },
    equipped: {
      hammer: 'mallet_rubber',
      eggSkin: 'shell_plain',
    },
    upgrades,
    drones: 0,
    boosts: {}, // id -> expiry timestamp (ms)
    stats: {
      smashed: 0,
      coinsEarned: 0,
      shardsEarned: 0,
      crits: 0,
      bestCombo: 0,
      goldensCaught: 0,
      goldensEscaped: 0,
      biggestEgg: 0,
      clicks: 0,
      playtime: 0,
      runs: 0,
      longestRun: 0,
      bestRunCoins: 0,
      bestRunSmashed: 0,
    },
    settings: { sound: true },
    meta: { createdAt: Date.now() },
  };
}

export const state = freshSave();

/* ---------------- pub/sub ---------------- */
const subs = new Set();
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
let emitQueued = false;
/** batched emit so we never spam the DOM from the game loop */
export function emit(reason = 'change') {
  if (emitQueued) return;
  emitQueued = true;
  queueMicrotask(() => {
    emitQueued = false;
    for (const fn of subs) {
      try { fn(state, reason); } catch (e) { console.error('[state] subscriber failed', e); }
    }
  });
}

/* ---------------- persistence ---------------- */
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[state] save failed', e);
  }
}

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn('[state] localStorage blocked', e);
  }
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    const base = freshSave();
    // shallow-merge with defaults so new fields appear after updates
    const merged = {
      ...base,
      ...data,
      owned: { ...base.owned, ...(data.owned || {}) },
      equipped: { ...base.equipped, ...(data.equipped || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      stats: { ...base.stats, ...(data.stats || {}) },
      settings: { ...base.settings, ...(data.settings || {}) },
      meta: { ...base.meta, ...(data.meta || {}) },
      boosts: data.boosts || {},
    };
    // never equip something we don't own
    if (!merged.owned.hammers.includes(merged.equipped.hammer)) merged.equipped.hammer = 'mallet_rubber';
    if (!merged.owned.eggSkins.includes(merged.equipped.eggSkin)) merged.equipped.eggSkin = 'shell_plain';

    Object.assign(state, merged);
    return true;
  } catch (e) {
    console.error('[state] corrupt save, starting fresh', e);
    return false;
  }
}

export function reset() {
  const fresh = freshSave();
  Object.assign(state, fresh);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  try { localStorage.removeItem(KEY); } catch (_) { /* ignore */ }
  beginRun();   // a wipe is a clean session, the loop keeps running
  emit('reset');
  save();
}

/* ---------------- currency helpers ---------------- */
export function addCoins(n, countAsEarned = true) {
  state.coins += n;
  if (countAsEarned) state.stats.coinsEarned += n;
  if (run.active && n > 0) run.coins += n;   // only earnings, not spending
  emit('coins');
}
export function addShards(n) {
  state.shards += n;
  state.stats.shardsEarned += n;
  if (run.active && n > 0) run.shards += n;
  emit('shards');
}
export function canAfford(coins = 0, shards = 0) {
  return state.coins >= coins && state.shards >= shards;
}
export function spend(coins = 0, shards = 0) {
  if (!canAfford(coins, shards)) return false;
  state.coins -= coins;
  state.shards -= shards;
  emit('spend');
  return true;
}
export function bumpStat(key, by = 1) {
  if (typeof state.stats[key] === 'number') state.stats[key] += by;
  if (run.active && typeof run[key] === 'number') run[key] += by;
  if (run.active && key === 'biggestEgg') run.biggestEgg = Math.max(run.biggestEgg, by);
  emit('stats');
}

/** for record-style stats that only ever go up (biggest egg, best combo) */
export function raiseStat(key, value) {
  if (value > (state.stats[key] || 0)) state.stats[key] = value;
  if (run.active && value > run[key]) run[key] = value;
}

/* ---------------- the current run ----------------
   Spending in the shop mid-run must not reduce the run's earnings, so
   the tally is fed from the mutation helpers above and only counts
   positive gains.
   ------------------------------------------------- */
const RUN_KEYS = ['smashed', 'coins', 'shards', 'crits', 'goldensCaught', 'goldensEscaped', 'clicks', 'biggestEgg', 'time'];
const run = { active: false };
for (const k of RUN_KEYS) run[k] = 0;

export function beginRun() {
  for (const k of RUN_KEYS) run[k] = 0;
  run.active = true;
  return run;
}

/** freeze the tally and return a snapshot for the results screen */
export function endRun() {
  run.active = false;
  const snap = {};
  for (const k of RUN_KEYS) snap[k] = run[k];
  return snap;
}
export function getRun() { return run; }

/* ---------------- boosts ---------------- */
/** returns { <effect>: value } for every non-expired boost */
export function boostEffects() {
  const now = Date.now();
  const out = {};
  for (const id in state.boosts) {
    const until = state.boosts[id];
    if (until <= now) continue;
    const def = BOOST_BY_ID[id];
    if (!def) continue;
    if (def.effect === 'yolkMult') {
      out.yolkMult = Math.max(out.yolkMult || 1, def.amount);
    } else {
      out[def.effect] = (out[def.effect] || 0) + def.amount;
    }
  }
  return out;
}

export function activeBoosts() {
  const now = Date.now();
  const out = [];
  for (const id in state.boosts) {
    const until = state.boosts[id];
    if (until > now) out.push({ id, until, def: BOOST_BY_ID[id] });
  }
  return out;
}

export function grantBoost(id, durSec) {
  const until = Date.now() + durSec * 1000;
  // stacking refreshes rather than duplicates, so re-buying is never wasted
  state.boosts[id] = Math.max(state.boosts[id] || 0, until);
  emit('boost');
}
