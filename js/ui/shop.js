/* ============================================================
   ui/shop.js — renders every category, handles buy/equip,
   draws live previews of hammers + egg skins on tiny canvases.
   ============================================================ */
import { state, save, spend, emit, grantBoost } from '../core/state.js';
import { derived } from '../core/stats.js';
import { sfx } from '../core/audio.js';
import { fmt } from '../core/utils.js';
import { HAMMERS, EGG_SKINS, RARITY_LABEL } from '../data/skins.js';
import { UPGRADES, BOOSTS, DRONES, upgradeCost, droneCost } from '../data/upgrades.js';
import { drawEggPreview } from '../fx/egg-art.js';
import { drawHammerPreview } from '../fx/hammer-art.js';
import { toast, pulseEl } from './toast.js';

let activeCat = 'hammers';
let gridEl, coinsEl, shardsEl;
let previewTick = 0;

const CATS = [
  { id: 'hammers', label: 'HAMMERS' },
  { id: 'eggskins', label: 'EGG SKINS' },
  { id: 'upgrades', label: 'UPGRADES' },
  { id: 'boosts', label: 'BOOSTS' },
];

export function initShop() {
  gridEl = document.getElementById('shopGrid');
  coinsEl = document.getElementById('shopCoins');
  shardsEl = document.getElementById('shopShards');

  const catsEl = document.getElementById('shopCats');
  catsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    setCategory(btn.dataset.cat);
    sfx.ui();
  });

  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('.card');
    handleAction(btn.dataset.action, btn.dataset.id, card);
  });

  setCategory('hammers');
  return { refresh, setCategory };
}

export function setCategory(cat) {
  activeCat = cat;
  for (const b of document.querySelectorAll('.cat')) {
    b.classList.toggle('active', b.dataset.cat === cat);
  }
  refresh();
}

export function refresh() {
  if (coinsEl) coinsEl.textContent = fmt(state.coins);
  if (shardsEl) shardsEl.textContent = fmt(state.shards);
  if (!gridEl) return;

  gridEl.innerHTML = '';
  switch (activeCat) {
    case 'hammers': renderHammers(); break;
    case 'eggskins': renderEggSkins(); break;
    case 'upgrades': renderUpgrades(); break;
    case 'boosts': renderBoosts(); break;
    default: renderHammers();
  }
}

/* ---------------- animations for the previews ---------------- */
export function tickShopPreviews(t) {
  // cheap: only redraw the little canvases ~20x/sec
  if (t - previewTick < 0.05) return;
  previewTick = t;
  if (!gridEl) return;
  for (const cv of gridEl.querySelectorAll('canvas[data-preview]')) {
    if (cv.dataset.kind === 'hammer') drawHammerPreview(cv, cv.dataset.id, t);
    else if (cv.dataset.kind === 'egg') drawEggPreview(cv, null, cv.dataset.id, t);
  }
}

/* ============================================================
   HAMMERS
   ============================================================ */
function renderHammers() {
  const d = derived();
  HAMMERS.forEach((h, i) => {
    const owned = state.owned.hammers.includes(h.id);
    const equipped = state.equipped.hammer === h.id;
    const lockedByShards = h.shards && state.shards < h.shards;
    const afford = state.coins >= h.cost && !lockedByShards;

    const card = el('div', `card ${equipped ? 'equipped' : 'owned'} ${!owned && !afford ? 'locked' : ''}`);
    card.style.animationDelay = `${i * 0.035}s`;

    const art = el('div', 'card-art');
    const cv = document.createElement('canvas');
    cv.width = 52; cv.height = 66;
    cv.dataset.preview = '1';
    cv.dataset.kind = 'hammer';
    cv.dataset.id = h.id;
    art.appendChild(cv);

    const meta = el('div', 'card-top');
    const info = el('div');
    info.innerHTML = `
      <div class="card-name">${h.name}</div>
      <div class="card-desc">${h.desc}</div>
      <span class="card-tier t-${h.rarity}">${RARITY_LABEL[h.rarity]}</span>
    `;
    meta.append(art, info);

    const stats = el('div', 'card-stats');
    stats.innerHTML = equipped
      ? `<div><span>Damage</span><b>+${h.dmg}</b></div>
         <div><span>Total power</span><b>${d.power}</b></div>
         <div><span>Crit</span><b>${(d.critChance * 100).toFixed(1)}%</b></div>`
      : `<div><span>Damage</span><b>+${h.dmg}</b></div>
         <div><span>Crit bonus</span><b>+${h.crit}%</b></div>`;

    const foot = el('div', 'card-foot');
    if (equipped) {
      foot.innerHTML = `<span class="price">${'EQUIPPED'}</span>`;
      const b = el('button', 'card-btn equipped-btn', 'IN USE');
      b.disabled = true;
      foot.appendChild(b);
    } else if (owned) {
      foot.innerHTML = `<span class="price">OWNED</span>`;
      const b = el('button', 'card-btn ghost-btn', 'EQUIP');
      b.dataset.action = 'equip-hammer';
      b.dataset.id = h.id;
      foot.appendChild(b);
    } else {
      foot.appendChild(priceTag(h.cost, h.shards || 0, afford));
      const b = el('button', 'card-btn', 'BUY');
      b.dataset.action = 'buy-hammer';
      b.dataset.id = h.id;
      b.disabled = !afford;
      foot.appendChild(b);
    }

    card.append(meta, stats, foot);
    gridEl.appendChild(card);
  });
}

/* ============================================================
   EGG SKINS
   ============================================================ */
function renderEggSkins() {
  const d = derived();
  EGG_SKINS.forEach((s, i) => {
    const owned = state.owned.eggSkins.includes(s.id);
    const equipped = state.equipped.eggSkin === s.id;
    const lockedByShards = s.shards && state.shards < s.shards;
    const afford = state.coins >= s.cost && !lockedByShards;

    const card = el('div', `card ${equipped ? 'equipped' : 'owned'} ${!owned && !afford ? 'locked' : ''}`);
    card.style.animationDelay = `${i * 0.035}s`;

    const art = el('div', 'card-art');
    const cv = document.createElement('canvas');
    cv.width = 52; cv.height = 66;
    cv.dataset.preview = '1';
    cv.dataset.kind = 'egg';
    cv.dataset.id = s.id;
    art.appendChild(cv);

    const meta = el('div', 'card-top');
    const info = el('div');
    info.innerHTML = `
      <div class="card-name">${s.name}</div>
      <div class="card-desc">${s.desc}</div>
      <span class="card-tier t-${s.rarity}">${RARITY_LABEL[s.rarity]}</span>
    `;
    meta.append(art, info);

    const stats = el('div', 'card-stats');
    stats.innerHTML = equipped
      ? `<div><span>Yolk bonus</span><b>+${Math.round(s.bonus * 100)}%</b></div>
         <div><span>Total yolk</span><b>x${d.yolkMult.toFixed(2)}</b></div>`
      : `<div><span>Yolk bonus</span><b>+${Math.round(s.bonus * 100)}%</b></div>`;

    const foot = el('div', 'card-foot');
    if (equipped) {
      foot.innerHTML = `<span class="price">EQUIPPED</span>`;
      const b = el('button', 'card-btn equipped-btn', 'IN USE');
      b.disabled = true;
      foot.appendChild(b);
    } else if (owned) {
      foot.innerHTML = `<span class="price">OWNED</span>`;
      const b = el('button', 'card-btn ghost-btn', 'EQUIP');
      b.dataset.action = 'equip-skin';
      b.dataset.id = s.id;
      foot.appendChild(b);
    } else {
      foot.appendChild(priceTag(s.cost, s.shards || 0, afford));
      const b = el('button', 'card-btn', 'BUY');
      b.dataset.action = 'buy-skin';
      b.dataset.id = s.id;
      b.disabled = !afford;
      foot.appendChild(b);
    }

    card.append(meta, stats, foot);
    gridEl.appendChild(card);
  });
}

/* ============================================================
   UPGRADES + DRONE
   ============================================================ */
function renderUpgrades() {
  UPGRADES.forEach((u, i) => {
    const lvl = state.upgrades[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = upgradeCost(u, lvl);
    const afford = state.coins >= cost;

    const card = el('div', `card ${maxed ? 'owned' : ''} ${!afford && !maxed ? 'locked' : ''}`);
    card.style.animationDelay = `${i * 0.03}s`;

    const icon = el('div', 'card-art');
    icon.innerHTML = `<span style="font-weight:900;font-size:15px;letter-spacing:1px;color:#ffc93c">${u.icon}</span>`;

    const meta = el('div', 'card-top');
    const info = el('div');
    info.innerHTML = `
      <div class="card-name">${u.name}</div>
      <div class="card-desc">${u.blurb}</div>
      <span class="card-tier t-${u.rarity}">${RARITY_LABEL[u.rarity]}</span>
    `;
    meta.append(icon, info);

    const pips = el('div', 'lvl-pips');
    const shown = Math.min(u.max, 12);
    for (let p = 0; p < shown; p++) {
      const pip = el('i', `pip ${p < Math.ceil((lvl / u.max) * shown) ? 'on' : ''}`);
      pips.appendChild(pip);
    }

    const stats = el('div', 'card-stats');
    stats.innerHTML = `
      <div><span>Level</span><b>${lvl} / ${u.max}</b></div>
      <div><span>${maxed ? 'Maxed' : 'Now'}</span><b>${u.show(lvl)}</b></div>
      ${maxed ? '' : `<div><span>Next</span><b>${u.show(lvl + 1)}</b></div>`}
    `;

    const foot = el('div', 'card-foot');
    if (maxed) {
      foot.innerHTML = '<span class="price">MAX LEVEL</span>';
    } else {
      foot.appendChild(priceTag(cost, 0, afford));
      const b = el('button', 'card-btn', 'BUY');
      b.dataset.action = 'buy-upgrade';
      b.dataset.id = u.id;
      b.disabled = !afford;
      foot.appendChild(b);
    }

    card.append(meta, pips, stats, foot);
    gridEl.appendChild(card);
  });

  // the drone lives in the upgrades tab too
  const lvl = state.drones;
  const maxed = lvl >= DRONES.max;
  const cost = droneCost(lvl);
  const afford = state.coins >= cost;
  const card = el('div', `card ${maxed ? 'owned' : ''}`);
  const icon = el('div', 'card-art');
  icon.innerHTML = `<span style="font-size:24px">🛸</span>`;
  const meta = el('div', 'card-top');
  meta.append(icon, el('div', '', `
    <div class="card-name">${DRONES.name}</div>
    <div class="card-desc">${DRONES.blurb}</div>
    <span class="card-tier t-${DRONES.rarity}">${RARITY_LABEL[DRONES.rarity]}</span>
  `));
  const stats = el('div', 'card-stats');
  stats.innerHTML = `<div><span>Owned</span><b>${lvl} / ${DRONES.max}</b></div>`;
  const foot = el('div', 'card-foot');
  if (maxed) foot.innerHTML = '<span class="price">MAX DRONES</span>';
  else {
    foot.appendChild(priceTag(cost, 0, afford));
    const b = el('button', 'card-btn', 'BUY');
    b.dataset.action = 'buy-drone';
    b.disabled = !afford;
    foot.appendChild(b);
  }
  card.append(meta, stats, foot);
  gridEl.appendChild(card);
}

/* ============================================================
   BOOSTS
   ============================================================ */
function renderBoosts() {
  BOOSTS.forEach((b, i) => {
    const until = state.boosts[b.id] || 0;
    const remaining = Math.max(0, (until - Date.now()) / 1000);
    const active = remaining > 0;
    const afford = state.coins >= b.cost;

    const card = el('div', `card boost-card ${active ? 'owned' : ''} ${!afford && !active ? 'locked' : ''}`);
    card.style.setProperty('--p', active ? `${Math.min(100, (remaining / b.dur) * 100)}%` : '0%');
    card.style.animationDelay = `${i * 0.04}s`;

    const icon = el('div', 'card-art');
    icon.innerHTML = `<span style="font-weight:900;font-size:16px;color:#5ce08a">${b.icon}</span>`;

    const meta = el('div', 'card-top');
    meta.append(icon, el('div', '', `
      <div class="card-name">${b.name}</div>
      <div class="card-desc">${b.blurb}</div>
      <span class="card-tier t-${b.rarity}">${RARITY_LABEL[b.rarity]}</span>
    `));

    const stats = el('div', 'card-stats');
    stats.innerHTML = active
      ? `<div><span>Active</span><b>${remaining.toFixed(0)}s left</b></div>`
      : `<div><span>Duration</span><b>${b.dur}s</b></div>`;

    const foot = el('div', 'card-foot');
    if (active) {
      foot.innerHTML = `<span class="price">ACTIVE ${Math.ceil(remaining)}s</span>`;
      const btn = el('button', 'card-btn ghost-btn', 'EXTEND');
      btn.dataset.action = 'buy-boost';
      btn.dataset.id = b.id;
      btn.disabled = !afford;
      foot.appendChild(btn);
    } else {
      foot.appendChild(priceTag(b.cost, 0, afford));
      const btn = el('button', 'card-btn', 'BUY');
      btn.dataset.action = 'buy-boost';
      btn.dataset.id = b.id;
      btn.disabled = !afford;
      foot.appendChild(btn);
    }

    card.append(meta, stats, foot);
    gridEl.appendChild(card);
  });
}

/* ============================================================
   actions
   ============================================================ */
function handleAction(action, id, card) {
  switch (action) {
    case 'buy-hammer': {
      const h = HAMMERS.find((x) => x.id === id);
      if (!h) return;
      if (h.shards && state.shards < h.shards) return deny(card);
      if (state.coins < h.cost) return deny(card);
      spend(h.cost, 0);
      state.owned.hammers.push(h.id);
      state.equipped.hammer = h.id;
      buySuccess(card);
      toast(`${h.name} purchased + equipped`, 'good', '🔨');
      break;
    }
    case 'equip-hammer': {
      if (!state.owned.hammers.includes(id)) return;
      state.equipped.hammer = id;
      sfx.equip();
      toast(`Equipped ${HAMMERS.find((x) => x.id === id).name}`, '', '⚒️');
      break;
    }
    case 'buy-skin': {
      const s = EGG_SKINS.find((x) => x.id === id);
      if (!s) return;
      if (s.shards && state.shards < s.shards) return deny(card);
      if (state.coins < s.cost) return deny(card);
      spend(s.cost, 0);
      state.owned.eggSkins.push(s.id);
      state.equipped.eggSkin = s.id;
      buySuccess(card);
      toast(`${s.name} unlocked!`, 'shard', '🥚');
      break;
    }
    case 'equip-skin': {
      if (!state.owned.eggSkins.includes(id)) return;
      state.equipped.eggSkin = id;
      sfx.equip();
      toast(`Equipped ${EGG_SKINS.find((x) => x.id === id).name}`, '', '🎨');
      break;
    }
    case 'buy-upgrade': {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u) return;
      const lvl = state.upgrades[u.id] || 0;
      if (lvl >= u.max) return;
      const cost = upgradeCost(u, lvl);
      if (state.coins < cost) return deny(card);
      spend(cost, 0);
      state.upgrades[u.id] = lvl + 1;
      buySuccess(card);
      pulseEl(document.getElementById('chipPower'), 'flash');
      sfx.levelUp();
      toast(`${u.name} → lvl ${lvl + 1} (${u.show(lvl + 1)})`, 'good', '⬆️');
      break;
    }
    case 'buy-drone': {
      if (state.drones >= DRONES.max) return;
      const cost = droneCost(state.drones);
      if (state.coins < cost) return deny(card);
      spend(cost, 0);
      state.drones++;
      buySuccess(card);
      sfx.levelUp();
      toast(`Drone ${state.drones} deployed`, 'good', '🛸');
      break;
    }
    case 'buy-boost': {
      const b = BOOSTS.find((x) => x.id === id);
      if (!b) return;
      if (state.coins < b.cost) return deny(card);
      spend(b.cost, 0);
      grantBoost(b.id, b.dur);
      buySuccess(card);
      toast(`${b.name} active for ${b.dur}s`, 'good', '⚡');
      break;
    }
    default:
      break;
  }
  save();
  emit('shop');
  refresh();
}

function buySuccess(card) {
  sfx.buy();
  if (!card) return;
  card.style.animation = 'unlockGlow .7s ease';
  card.classList.add('owned');
  setTimeout(() => { card.style.animation = ''; }, 720);
}

function deny(card) {
  sfx.deny();
  if (!card) return;
  card.style.animation = 'deniedShake .38s ease';
  toast('Not enough coins', 'bad', '💸');
  setTimeout(() => { card.style.animation = ''; }, 420);
}

/* ---------------- helpers ---------------- */
function priceTag(coins, shards, afford) {
  const tag = el('div', `price ${afford ? '' : 'no'}`);
  let html = '';
  if (coins) html += `<span class="coin-ico" style="width:15px;height:15px"></span>${fmt(coins)}`;
  if (shards) html += `<span class="shard-ico" style="width:15px;height:15px"></span>${shards}`;
  tag.innerHTML = html;
  return tag;
}

function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export { CATS };
