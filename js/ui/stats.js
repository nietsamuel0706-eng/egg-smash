/* ============================================================
   ui/stats.js — the read-only stats panel + hard reset
   ============================================================ */
import { state, reset, save, emit } from '../core/state.js';
import { derived } from '../core/stats.js';
import { fmt, fmtTime } from '../core/utils.js';
import { TIERS, RARITY_COLOR } from '../data/eggs.js';
import { unlockedTiers } from '../systems/spawner.js';
import { sfx } from '../core/audio.js';

export function initStats(onReset) {
  const grid = document.getElementById('statsGrid');
  const btn = document.getElementById('hardReset');
  const codex = document.getElementById('codex');
  void codex;

  const render = () => {
    const d = derived();
    const s = state.stats;
    const unlocked = unlockedTiers(s.smashed);
    const nextTier = TIERS.find((t) => s.smashed < t.unlock);

    const boxes = [
      { l: 'EGGS SMASHED', v: fmt(s.smashed), hi: true },
      { l: 'COINS EARNED', v: fmt(s.coinsEarned) },
      { l: 'SHARDS EARNED', v: fmt(s.shardsEarned) },
      { l: 'BEST COMBO', v: `${s.bestCombo}x`, hi: true },
      { l: 'CRIT SMASHES', v: fmt(s.crits) },
      { l: 'SWINGS', v: fmt(s.clicks) },
      { l: 'BIGGEST EGG', v: `${fmt(s.biggestEgg)} val` },
      { l: 'GOLDENS CAUGHT', v: fmt(s.goldensCaught), hi: true },
      { l: 'GOLDENS ESCAPED', v: fmt(s.goldensEscaped) },
      { l: 'PLAYTIME', v: fmtTime(s.playtime) },
      { l: 'RUNS ENDED', v: fmt(s.runs || 0) },
      { l: 'LONGEST RUN', v: fmtTime(s.longestRun || 0), hi: true },
      { l: 'BEST COIN RUN', v: fmt(s.bestRunCoins || 0), hi: true },
      { l: 'POWER', v: fmt(d.power) },
      { l: 'CRIT CHANCE', v: `${(d.critChance * 100).toFixed(1)}%` },
      { l: 'CRIT DAMAGE', v: `x${d.critMult.toFixed(1)}` },
      { l: 'YOLK VALUE', v: `x${d.yolkMult.toFixed(2)}` },
      { l: 'LUCK', v: `+${Math.round(d.luck * 100)}%` },
      { l: 'DRONES', v: `${d.drones}` },
      { l: 'TIERS UNLOCKED', v: `${unlocked.length} / ${TIERS.length}` },
      {
        l: 'NEXT TIER',
        v: nextTier ? `${nextTier.name} @ ${fmt(nextTier.unlock)}` : 'ALL UNLOCKED',
      },
    ];

    grid.innerHTML = boxes.map((b, i) => `
      <div class="stat-box ${b.hi ? 'hi' : ''}" style="animation-delay:${(i * 0.025).toFixed(2)}s">
        <label>${b.l}</label><b>${b.v}</b>
      </div>
    `).join('');

    // egg codex — every tier, its value, and how many you need to unlock it
    const codex = document.getElementById('codex');
    if (codex) {
      codex.innerHTML = TIERS.map((t, i) => {
        const got = s.smashed >= t.unlock;
        return `
          <div class="codex-row ${got ? 'got' : ''}" style="animation-delay:${(i * 0.04).toFixed(2)}s">
            <i style="background:${RARITY_COLOR[t.rarity]}"></i>
            <span class="cx-name">${t.name}</span>
            <span class="cx-rarity" style="color:${RARITY_COLOR[t.rarity]}">${t.rarity.toUpperCase()}</span>
            <span class="cx-val">${fmt(t.value)}</span>
            <span class="cx-hp">${t.hp} hp</span>
            <span class="cx-unlock">${got ? 'UNLOCKED' : `${fmt(t.unlock)} smashed`}</span>
          </div>`;
      }).join('');
    }
  };

  render();

  if (btn) {
    btn.addEventListener('click', () => {
      if (onReset) onReset();
    });
  }

  return { render, wipe: () => { reset(); save(); emit('reset'); render(); sfx.gameOver(); } };
}
