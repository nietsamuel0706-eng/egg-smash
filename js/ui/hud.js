/* ============================================================
   ui/hud.js — purse, stat chips, combo meter, boost timers
   ============================================================ */
import { state, activeBoosts } from '../core/state.js';
import { derived } from '../core/stats.js';
import { fmt } from '../core/utils.js';
import { multFor } from '../systems/combo.js';
import { pulseEl } from './toast.js';

let els = {};
let lastCoins = 0;
let lastShards = 0;
let shownCoins = 0;     // for the rolling counter
let rollVel = 0;

export function initHud() {
  els = {
    coins: document.getElementById('coinValue'),
    shards: document.getElementById('shardValue'),
    purseCoins: document.getElementById('purseCoins'),
    purseShards: document.getElementById('purseShards'),
    chipPower: document.getElementById('chipPower'),
    chipCrit: document.getElementById('chipCrit'),
    chipValue: document.getElementById('chipValue'),
    chipLuck: document.getElementById('chipLuck'),
    comboWrap: document.getElementById('comboWrap'),
    comboFill: document.getElementById('comboFill'),
    comboLabel: document.getElementById('comboLabel'),
    boostStrip: document.getElementById('boostStrip'),
    hint: document.getElementById('stageHint'),
  };

  els.chipPower.classList.add('power');
  els.chipCrit.classList.add('crit');
  els.chipValue.classList.add('value');
  els.chipLuck.classList.add('luck');
}

/** hard refresh of every number */
export function updateHud() {
  const d = derived();

  els.coins.textContent = fmt(state.coins);
  els.shards.textContent = fmt(state.shards);

  setChip(els.chipPower, String(d.power));
  setChip(els.chipCrit, `${(d.critChance * 100).toFixed(1)}%`);
  setChip(els.chipValue, `x${d.yolkMult.toFixed(2)}`);
  setChip(els.chipLuck, `+${Math.round(d.luck * 100)}%`);

  if (state.coins > lastCoins) {
    pulseEl(els.purseCoins, 'bump', 380);
  }
  if (state.shards > lastShards) {
    pulseEl(els.purseShards, 'bump', 380);
  }
  lastCoins = state.coins;
  lastShards = state.shards;
  shownCoins = state.coins;

  renderBoosts();
}

function setChip(chip, text) {
  const b = chip.querySelector('b');
  if (b && b.textContent !== text) {
    b.textContent = text;
    pulseEl(chip, 'flash', 560);
  }
}

/** called every frame: combo bar + boost countdowns + coin roll */
export function tickHud(dt, combo, comboRatio) {
  // rolling coin counter (eases toward the real value)
  if (shownCoins !== state.coins) {
    const diff = state.coins - shownCoins;
    shownCoins += diff * Math.min(1, dt * 9);
    if (Math.abs(state.coins - shownCoins) < 1) shownCoins = state.coins;
    els.coins.textContent = fmt(shownCoins);
  }

  // combo meter
  const live = combo.count > 0;
  els.comboWrap.classList.toggle('live', live);
  els.comboWrap.classList.toggle('hot', combo.count >= 12);
  const r = live ? comboRatio : 0;
  els.comboFill.style.width = `${(r * 100).toFixed(1)}%`;
  els.comboLabel.innerHTML = live
    ? `<span>COMBO ${combo.count}</span><span>×${multFor(combo.count).toFixed(2)}</span>`
    : '<span>COMBO</span><span>—</span>';

  // boost countdowns
  for (const b of els.boostStrip.children) {
    const until = Number(b.dataset.until || 0);
    const total = Number(b.dataset.total || 1);
    const left = Math.max(0, (until - Date.now()) / 1000);
    const timeEl = b.querySelector('b');
    if (timeEl) timeEl.textContent = `${left.toFixed(0)}s`;
    const fill = b.querySelector('i.boost-fill');
    if (fill) fill.style.transform = `scaleX(${Math.max(0, left / total)})`;
    b.classList.toggle('expiring', left < 6);
    if (left <= 0) renderBoosts();
  }
  void rollVel;
}

let boostSig = '';
function renderBoosts() {
  const list = activeBoosts();
  const sig = list.map((b) => `${b.id}:${b.until}`).join('|');
  if (sig === boostSig) return;
  boostSig = sig;

  els.boostStrip.innerHTML = '';
  for (const b of list) {
    const el = document.createElement('div');
    el.className = 'boost';
    el.dataset.until = String(b.until);
    el.dataset.total = String(b.def.dur);
    el.innerHTML = `<span>${b.def.icon}</span><span>${b.def.name}</span><b>0s</b><i class="boost-fill"></i>`;
    els.boostStrip.appendChild(el);
  }
}

export function hideHint() {
  if (els.hint) els.hint.classList.add('hide');
}
