/* ============================================================
   main.js — bootstrap: load the save, wire the UI, run the loop
   ============================================================ */
import { state, load, save, subscribe, reset } from './core/state.js';
import { createGame, bindHoldKeys } from './core/game.js';
import { unlock as unlockAudio, setEnabled as setSound, sfx, stopMusic } from './core/audio.js';
import { initHud, updateHud, tickHud, hideHint } from './ui/hud.js';
import { initShop, refresh as refreshShop, setCategory, tickShopPreviews } from './ui/shop.js';
import { initStats } from './ui/stats.js';
import { toast, confettiBurst, screenShake } from './ui/toast.js';
import { clamp, fmt, fmtTime } from './core/utils.js';

/* ---------------- dom refs ---------------- */
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const stage = $('stage');
const shopPanel = $('shop');
const statsPanel = $('stats');
const startOverlay = $('startOverlay');
const goldenOverlay = $('goldenOverlay');
const confirmOverlay = $('confirmOverlay');
const endOverlay = $('endOverlay');
const stopBtn = $('stopBtn');

/* ---------------- boot ---------------- */
load();
bindHoldKeys();

initHud();
updateHud();

const statsUI = initStats(() => {
  openConfirm(
    'WIPE EVERYTHING?',
    'All coins, skins, drones and stats will be gone forever.',
    () => {
      state.coins = 0;
      state.shards = 0;
      state.owned = { hammers: ['mallet_rubber'], eggSkins: ['shell_plain'] };
      state.equipped = { hammer: 'mallet_rubber', eggSkin: 'shell_plain' };
      state.upgrades = {};
      state.drones = 0;
      state.boosts = {};
      state.stats = freshStats();
      state.meta = { createdAt: Date.now() };
      game.reset();
      markRunRunning();
      save();
      updateHud();
      refreshShop();
      statsUI.render();
      closeConfirm();
      toast('Progress wiped. Fresh carton.', 'bad', '🗑');
    },
  );
});

const shopUI = initShop();

const game = createGame({
  canvas,
  hooks: {
    onGoldenStart: (g) => {
      goldenOverlay.classList.add('show');
      $('goldenTime').textContent = `${g.time.toFixed(1)}s`;
    },
    onGoldenHit: ({ hp, maxHp }) => {
      const k = clamp(hp / maxHp, 0, 1);
      $('goldenFill').style.transform = `scaleX(${k})`;
    },
    onGoldenEnd: () => {
      goldenOverlay.classList.remove('show');
    },
  },
});

/* ---------------- tabs ---------------- */
const panels = { game: stage, shop: shopPanel, stats: statsPanel };
let currentTab = 'game';

function setTab(tab) {
  if (!panels[tab]) return;
  currentTab = tab;
  for (const key in panels) panels[key].classList.toggle('active', key === tab);
  for (const btn of document.querySelectorAll('.tab[data-tab]')) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  }
  if (tab === 'game') {
    game.resume();
    if (game.isStopped()) endOverlay.classList.add('show');
    scheduleFit();   // the canvas has no size while its panel is hidden
  } else {
    game.pause();
  }
  if (tab === 'shop') { refreshShop(); sfx.ui(); }
  if (tab === 'stats') { statsUI.render(); sfx.ui(); }
}

for (const btn of document.querySelectorAll('.tab[data-tab]')) {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
}

/* ---------------- sound toggle ---------------- */
const soundBtn = $('soundBtn');
soundBtn.addEventListener('click', () => {
  const on = state.settings.sound === false;
  setSound(on);
  soundBtn.textContent = on ? '🔊' : '🔇';
  save();
  if (on) sfx.ui();
});
soundBtn.textContent = state.settings.sound === false ? '🔇' : '🔊';

/* ---------------- reset button (top bar) ---------------- */
$('resetBtn').addEventListener('click', () => {
  setTab('stats');
  openConfirm(
    'WIPE EVERYTHING?',
    'All coins, skins, drones and stats will be gone forever.',
    () => {
      reset();
      game.reset();
      markRunRunning();
      updateHud();
      refreshShop();
      statsUI.render();
      closeConfirm();
      toast('Progress wiped. Fresh carton.', 'bad', '🗑');
    },
  );
});

/* ---------------- overlays ---------------- */
function openConfirm(title, body, onYes) {
  $('confirmTitle').textContent = title;
  $('confirmBody').textContent = body;
  confirmOverlay.classList.add('show');
  const yes = $('confirmYes');
  const no = $('confirmNo');

  const yesHandler = () => { cleanup(); onYes && onYes(); closeConfirm(); };
  const noHandler = () => { cleanup(); closeConfirm(); };
  function cleanup() {
    yes.removeEventListener('click', yesHandler);
    no.removeEventListener('click', noHandler);
  }
  yes.addEventListener('click', yesHandler);
  no.addEventListener('click', noHandler);
}
function closeConfirm() {
  confirmOverlay.classList.remove('show');
}

/* ---------------- start / end a run ---------------- */
function markRunRunning() {
  stopBtn.disabled = false;
  endOverlay.classList.remove('show');
}

function startGame() {
  unlockAudio();
  startOverlay.classList.remove('show');
  endOverlay.classList.remove('show');
  game.start();
  markRunRunning();
  confettiBurst(30);
  sfx.buy();
  setTimeout(hideHint, 9000);
}

function stopGame() {
  if (game.isStopped()) return;
  const r = game.stop();
  stopBtn.disabled = true;
  endOverlay.classList.add('show');
  renderResults(r);
  sfx.buy();
}

/** the results card */
function resultCell(label, value, ico, best) {
  const cell = document.createElement('div');
  cell.className = best ? 'result-cell best' : 'result-cell';
  const l = document.createElement('label');
  l.textContent = label;
  const b = document.createElement('b');
  if (ico) {
    const i = document.createElement('span');
    i.className = ico;
    b.appendChild(i);
  }
  const v = document.createElement('span');
  v.textContent = value;
  b.appendChild(v);
  cell.appendChild(l);
  cell.appendChild(b);
  return cell;
}

function renderResults(r) {
  const grid = $('endGrid');
  grid.textContent = '';
  grid.appendChild(resultCell('SMASHED', fmt(r.smashed), null, r.record.smashed));
  grid.appendChild(resultCell('COINS', fmt(r.coins), 'coin-ico', r.record.coins));
  grid.appendChild(resultCell('SHARDS', fmt(r.shards), 'shard-ico', false));
  grid.appendChild(resultCell('BEST COMBO', `${state.stats.bestCombo}x`, null, false));
  grid.appendChild(resultCell('CRITS', fmt(r.crits), null, false));
  grid.appendChild(resultCell('GOLDENS', fmt(r.goldensCaught), null, false));
  grid.appendChild(resultCell('TIME', fmtTime(r.time), null, r.record.time));
  grid.appendChild(resultCell('SWINGS', fmt(r.clicks), null, false));

  const badges = [];
  if (r.record.coins) badges.push('BEST COIN RUN');
  if (r.record.smashed) badges.push('MOST EGGS');
  if (r.record.time) badges.push('LONGEST RUN');
  const note = $('endTiny');
  note.textContent = badges.length
    ? `★ NEW RECORD: ${badges.join(' · ')}`
    : 'Progress, skins and upgrades are all kept.';
  note.classList.toggle('record-note', badges.length > 0);
  $('endSubtitle').textContent = r.smashed
    ? `Run #${state.stats.runs} — every coin is already in the purse.`
    : 'No eggs this time. The carton is still full.';
}

$('againBtn').addEventListener('click', () => {
  game.newRun();
  markRunRunning();
  confettiBurst(30);
  sfx.buy();
  setTab('game');
});
$('endShopBtn').addEventListener('click', () => {
  endOverlay.classList.remove('show');
  setTab('shop');
});

/* the stop button asks first — an accidental click should not eat a run */
stopBtn.addEventListener('click', () => {
  if (game.isStopped()) return;
  if (currentTab !== 'game') { setTab('game'); }
  openConfirm(
    'END THE RUN?',
    'The field clears and you get your results. Coins, gear and upgrades are all kept.',
    stopGame,
  );
});
stopBtn.disabled = true;   // nothing to stop before the first smash
$('startBtn').addEventListener('click', startGame);
startOverlay.addEventListener('click', (e) => {
  if (e.target === startOverlay) startGame();
});

/* ---------------- golden egg button ---------------- */
$('goldenBtn').addEventListener('click', () => {
  if (!game.golden || !game.golden.active) return;
  game.hitGolden();
});
window.addEventListener('keydown', (e) => {
  if (!goldenOverlay.classList.contains('show')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    game.hitGolden();
  }
});

/* ---------------- golden timer ring ---------------- */
let goldenTick = 0;
setInterval(() => {
  if (!goldenOverlay.classList.contains('show')) return;
  const g = game.golden;
  if (!g) return;
  $('goldenTime').textContent = `${Math.max(0, g.time).toFixed(1)}s`;
  $('goldenFill').style.transform = `scaleX(${clamp(g.time / g.maxTime, 0, 1)})`;
  if (g.time < 4) sfx.goldenTick(1 - g.time / 4);
}, 100);

/* ---------------- state → UI wiring ---------------- */
subscribe((_, reason) => {
  if (reason === 'reset') {
    game.reset();
    markRunRunning();
  }
  updateHud();
  // rebuilding the shop grid is expensive — only do it while it's visible
  if (currentTab === 'shop') refreshShop();
  if (currentTab === 'stats') statsUI.render();
});

/* keep the shop previews and hud ticking every frame */
(function uiLoop(ts) {
  requestAnimationFrame(uiLoop);
  const t = ts / 1000;
  if (currentTab === 'game') {
    tickHud(1 / 60, game.combo, game.comboRatio);
  } else if (currentTab === 'shop') {
    tickShopPreviews(t);
  }
})(0);

/* ---------------- fit the play field to the whole screen ----------------
   The canvas backing store is sized to the CSS box (times device pixel
   ratio) and the game world is re-scaled so a bigger window means a
   bigger play field, not a stretched picture.
   ------------------------------------------------------------- */
const DESIGN_W = 960;
const DESIGN_H = 600;
let cssW = 0;
let cssH = 0;
let fitPending = 0;

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  // the panel is hidden while the shop/stats tab is open — skip until it's back
  if (rect.width < 8 || rect.height < 8) return;

  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  const dpr = clamp((window.devicePixelRatio || 1), 1, 2);
  if (w === cssW && h === cssH && dpr === game.dpr) return;

  cssW = w;
  cssH = h;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  // scale the art with the smaller relative dimension, but keep the
  // play field as large as the window allows
  const scale = clamp(Math.min(w / DESIGN_W, h / DESIGN_H), 0.85, 1.75);
  game.setBounds(w, h, scale, dpr);
}

function scheduleFit() {
  if (fitPending) return;
  fitPending = requestAnimationFrame(() => {
    fitPending = 0;
    fitCanvas();
  });
}

if (typeof ResizeObserver === 'function') {
  new ResizeObserver(scheduleFit).observe(canvas);
} else {
  window.addEventListener('resize', scheduleFit);
}
window.addEventListener('resize', scheduleFit);
window.addEventListener('orientationchange', scheduleFit);

// moving the window between monitors changes devicePixelRatio
try {
  const mq = window.matchMedia && window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  if (mq && mq.addEventListener) mq.addEventListener('change', scheduleFit);
} catch (e) { /* matchMedia unsupported — resize events still work */ }

fitCanvas();

/* ---------------- pause when the tab is hidden ---------------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    stopMusic();
  }
});
window.addEventListener('beforeunload', () => save());

/* ---------------- keyboard shortcuts for tabs ---------------- */
window.addEventListener('keydown', (e) => {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  if (e.key === '1') setTab('game');
  if (e.key === '2') setTab('shop');
  if (e.key === '3') setTab('stats');
});

/* ---------------- dev helper: freshStats mirror ---------------- */
function freshStats() {
  return {
    smashed: 0, coinsEarned: 0, shardsEarned: 0, crits: 0, bestCombo: 0,
    goldensCaught: 0, goldensEscaped: 0, biggestEgg: 0, clicks: 0, playtime: 0,
    runs: 0, longestRun: 0, bestRunCoins: 0, bestRunSmashed: 0,
  };
}

/* expose a tiny debug handle (handy in the console) */
window.EGGSMASHER = { state, game, setTab, shopUI, setCategory, screenShake, fitCanvas };

console.log('%cEGG SMASHER', 'font:900 24px sans-serif;color:#ffc93c', '— press 1/2/3 to switch tabs');
