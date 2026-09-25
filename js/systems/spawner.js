/* ============================================================
   systems/spawner.js — decides when and what falls
   ============================================================ */
import { rand, chance, clamp } from '../core/utils.js';
import { rollTier, TIERS } from '../data/eggs.js';
import { createEgg } from '../entities/egg.js';
import { createGolden } from '../entities/golden.js';

export function createSpawner(bounds) {
  return {
    bounds,
    timer: 0.7,
    goldenTimer: rand(35, 60),   // first golden comes reasonably soon
    golden: null,
    sizeScale: 1,                 // entity size, kept in sync by setBounds()
    fallScale: 1,                 // fall speed, scales with field height
    areaScale: 1,                 // more eggs on a bigger screen
    // the most recent spawn x, so eggs don't stack on top of each other
    lastX: bounds.w / 2,
  };
}

export function updateSpawner(s, dt, d, state, eggs, onGolden) {
  s.timer -= dt;
  if (s.timer <= 0) {
    s.timer = spawnInterval(d, s);
    spawn(s, d, state, eggs);
  }

  // golden egg scheduling
  if (s.golden) {
    const alive = s.golden.active;
    if (!alive) {
      s.golden = null;
      s.goldenTimer = nextGoldenDelay(d);
    }
  } else {
    s.goldenTimer -= dt;
    if (s.goldenTimer <= 0) {
      s.golden = createGolden(s.bounds, d, s.sizeScale);
      if (onGolden) onGolden(s.golden);
    }
  }
}

function spawnInterval(d, s) {
  return clamp(rand(0.55, 1.15) / (d.spawnMult * s.areaScale), 0.08, 2.2);
}

function nextGoldenDelay(d) {
  const base = rand(40, 85);
  return clamp(base / (1 + d.luck * 2.2), 18, 120);
}

function spawn(s, d, state, eggs) {
  if (eggs.length > 90 + s.areaScale * 20) return; // safety valve on very high rates

  const tier = rollTier(state.stats.smashed, d.luck);
  // avoid spawning right on top of the previous egg
  const margin = tier.r * s.sizeScale + 12;
  let x = rand(margin, Math.max(margin + 1, s.bounds.w - margin));
  for (let tries = 0; tries < 4 && Math.abs(x - s.lastX) < 60 * s.sizeScale; tries++) {
    x = rand(margin, Math.max(margin + 1, s.bounds.w - margin));
  }
  s.lastX = x;

  const egg = createEgg(tier, {
    x,
    y: -tier.r * rand(2, 4) * s.sizeScale,
    armored: chance(0.12 + d.luck * 0.1),
    sizeScale: s.sizeScale,
    fallScale: s.fallScale,
  });
  eggs.push(egg);
  return egg;
}

/** top tiers unlock info for the stats screen */
export function unlockedTiers(smashed) {
  return TIERS.filter((t) => smashed >= t.unlock);
}

