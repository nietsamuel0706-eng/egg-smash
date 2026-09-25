/* ============================================================
   core/game.js — the brain: update + render + all the smash logic
   ============================================================ */
import { createLoop } from './loop.js';
import { state, addCoins, addShards, bumpStat, raiseStat, beginRun, endRun, getRun, save } from './state.js';
import { derived, rollDamage, payout } from './stats.js';
import { attachInput, pointer, isLeft, isRight } from './input.js';
import { sfx } from './audio.js';
import { clamp, rand, chance } from './utils.js';

import { createCamera, addTrauma, kickZoom, freeze, updateCamera } from '../fx/camera.js';
import { createParticles } from '../fx/particles.js';
import { createFloaters } from '../fx/floaters.js';
import { createBackground } from '../fx/background.js';
import { updateTweens } from '../fx/tween.js';

import { updateEgg, damageEgg, crackAmount } from '../entities/egg.js';
import { createBreaker, updateBreaker, trySwing } from '../entities/breaker.js';
import { createDrone, updateDrone } from '../entities/drone.js';
import { updateGolden, hitGolden } from '../entities/golden.js';

import { createSpawner, updateSpawner } from '../systems/spawner.js';
import { createCombo, registerHit, updateCombo, comboRatio, multFor } from '../systems/combo.js';
import { eggsTouchingBreaker, eggsInSwing, lowestEgg } from '../systems/collision.js';
import { drawFrame } from '../systems/renderer.js';
import { toast, bigHitFx, confettiBurst } from '../ui/toast.js';

export function createGame({ canvas, hooks = {} }) {
  const ctx = canvas.getContext('2d');
  // bounds are in CSS pixels; the context is pre-scaled by the device pixel ratio
  const bounds = { w: canvas.width, h: canvas.height };
  const DESIGN_H = 600;      // the size the numbers below were balanced around
  const DESIGN_W = 960;
  let worldScale = 1;
  let renderDpr = 1;
  let floorY = bounds.h - 70;

  const particles = createParticles();
  const floaters = createFloaters();
  const camera = createCamera();
  const bg = createBackground(bounds.w, bounds.h);
  const breaker = createBreaker(bounds);
  const spawner = createSpawner(bounds);
  const combo = createCombo();

  const eggs = [];
  const drones = [];

  let d = derived();
  let paused = false;
  let stopped = false;   // the run has ended — the field is frozen until PLAY AGAIN
  let started = false;
  let time = 0;
  let saveTimer = 0;
  let hintAlpha = 1;
  let showHint = true;
  let streak = 0;
  let streakLife = 0;

  /* ---------------- combo break feedback ---------------- */
  combo.onBreak = (lost) => {
    const m = multFor(lost);
    if (m > 1) {
      floaters.add({
        x: breaker.x, y: breaker.y - 90, text: `COMBO LOST x${m.toFixed(2)}`,
        color: '#ff7a7a', size: 20, life: 1.2,
      });
    }
    streak = 0;
  };

  /* ---------------- input ---------------- */
  attachInput(canvas, {
    onSmash: () => {
      if (!started) return;
      playerSmash();
    },
  });

  function playerSmash() {
    if (trySwing(breaker)) {
      sfx.swing();
      state.stats.clicks++;
    }
  }

  /* ---------------- core smash ---------------- */

  /**
   * Apply damage to an egg. Handles crits, death, coins, shards,
   * particles, camera and sound. `src` describes what hit it.
   */
  function hitEgg(egg, damage, src) {
    if (egg.dead) return;
    const killed = damageEgg(egg, damage);

    if (!killed) {
      // a partial hit still feels good
      particles.chunks(egg.x, egg.y, egg.tier.shell, egg.tier.shell2, 3, 0.6);
      particles.sparks(egg.x, egg.y, egg.tier.yolk, 4, 0.6);
      addTrauma(camera, 0.06 + damage * 0.002);
      sfx.crack(Math.round(crackAmount(egg) * 4), combo.count);
      floaters.add({
        x: egg.x + rand(-10, 10), y: egg.y - egg.r,
        text: `-${Math.round(damage)}`,
        color: egg.armored ? '#cfd8e3' : '#ffe9a8',
        size: 14, life: 0.6,
      });
      if (egg.armored) sfx.clank();
      return;
    }

    // ---- egg destroyed ----
    const isCrit = src.crit;
    const hits = registerHit(combo, d.comboWindow);
    const mult = multFor(hits);
    const coins = payout(egg.tier, mult, isCrit);

    addCoins(coins);
    bumpStat('smashed');
    raiseStat('biggestEgg', egg.tier.value);
    raiseStat('bestCombo', hits);

    streak++;
    streakLife = 1;

    // --- particles ---
    particles.smash(egg.x, egg.y, egg.tier, 1);
    addTrauma(camera, clamp(0.1 + egg.tier.value / 900 + (isCrit ? 0.25 : 0), 0.08, 0.7));
    if (isCrit) {
      particles.crit(egg.x, egg.y, egg.tier);
      addTrauma(camera, 0.45);
      kickZoom(camera, 0.045);
      freeze(camera, 0.05);
      bigHitFx(true);
      sfx.crit();
      bumpStat('crits');
      floaters.add({
        x: egg.x, y: egg.y - egg.r - 12, text: 'CRIT!',
        color: '#ff7ae0', size: 30, life: 1.1, vy: -70, spin: rand(-0.4, 0.4),
      });
    } else {
      bigHitFx(false);
      sfx.smash(combo.count);
    }

    // --- score popups ---
    floaters.add({
      x: egg.x, y: egg.y - egg.r * 0.4,
      text: `+${coins}`,
      color: isCrit ? '#fff6c9' : '#ffd75e',
      size: isCrit ? 28 : 20 + Math.min(14, egg.tier.value / 40),
      life: 1.05,
    });
    if (mult > 1) {
      floaters.add({
        x: egg.x, y: egg.y + egg.r * 0.7, text: `x${mult.toFixed(2)}`,
        color: '#5ce08a', size: 16, life: 0.95, delay: 0.08,
      });
    }
    if (streak > 1 && streak % 5 === 0) {
      floaters.add({
        x: bounds.w / 2, y: bounds.h * 0.4, text: `${streak} STREAK!`,
        color: '#b98bff', size: 34, life: 1.3, vy: -20,
      });
      confettiBurst(18);
    }

    // --- shards from the fancier eggs ---
    dropShards(egg);

    // --- sound pitch with combo ---
    sfx.coin(coins);

    if (hooks.onSmash) hooks.onSmash({ egg, coins, crit: isCrit, combo: hits });
  }

  function dropShards(egg) {
    const SHARD_CHANCE = { rare: 0.05, epic: 0.14, legendary: 0.32, mythic: 0.5, ultra: 0.7 };
    const p = SHARD_CHANCE[egg.tier.rarity] || 0;
    if (!chance(p)) return;
    addShards(1);
    floaters.add({
      x: egg.x + rand(-16, 16), y: egg.y - egg.r,
      text: '+1 SHARD', color: '#b98bff', size: 16, life: 1.2, delay: 0.12,
    });
    particles.star(egg.x, egg.y, '#b98bff', 4, 1.1);
  }

  /* ---------------- golden egg ---------------- */
  function onGoldenSpawn(g) {
    if (hooks.onGoldenStart) hooks.onGoldenStart(g);
    sfx.golden();
    toast('A GOLDEN EGG APPEARED!', 'gold', '🥚');
  }

  function hitGoldenEgg() {
    const g = spawner.golden;
    if (!g || !g.active) return;
    const { crit, damage } = rollDamage(d);
    const res = hitGolden(g, damage * 2.2);
    addTrauma(camera, 0.3);
    particles.sparks(g.x, g.y, '#fff6c9', 12, 1.1);
    particles.ring(g.x, g.y, '#ffd75e', 24, 320, 4);
    floaters.add({
      x: g.x + rand(-30, 30), y: g.y - g.r,
      text: crit ? `CRIT -${Math.round(damage * 2.2)}` : `-${Math.round(damage * 2.2)}`,
      color: crit ? '#ff7ae0' : '#fff6c9',
      size: crit ? 30 : 22, life: 0.9,
    });
    sfx.goldenHit();
    if (crit) bigHitFx(true);

    if (res === 'kill') {
      const reward = Math.round(g.reward * (crit ? 1.5 : 1));
      addCoins(reward);
      addShards(g.shards);
      bumpStat('goldensCaught');
      particles.goldenBurst(g.x, g.y);
      addTrauma(camera, 0.8);
      kickZoom(camera, 0.07);
      freeze(camera, 0.12);
      confettiBurst(70);
      sfx.golden();
      sfx.crit();
      floaters.add({
        x: g.x, y: g.y, text: `+${reward}`, color: '#ffd75e', size: 44, life: 1.6, vy: -40,
      });
      floaters.add({
        x: g.x, y: g.y + 40, text: `+${g.shards} SHARDS`, color: '#b98bff', size: 24, life: 1.6, delay: 0.2,
      });
      toast(`GOLDEN SMASHED! +${reward} coins, +${g.shards} shards`, 'gold', '💥');
      if (hooks.onGoldenEnd) hooks.onGoldenEnd({ caught: true, reward, shards: g.shards });
    } else if (hooks.onGoldenHit) {
      hooks.onGoldenHit({ hp: g.hp, maxHp: g.maxHp });
    }
  }

  /* ---------------- update ---------------- */
  function update(dt, elapsed) {
    time = elapsed;

    // hit-stop: freeze the world briefly on big hits
    const worldDt = camera.hitStop > 0 ? 0 : dt;

    d = derived();
    updateTweens(dt);
    updateCamera(camera, dt);
    bg.update(worldDt);

    if (paused) {
      particles.update(0, floorY);
      return;
    }

    state.stats.playtime += dt;
    getRun().time += dt;

    // --- spawner (and golden egg) ---
    updateSpawner(spawner, worldDt, d, state, eggs, onGoldenSpawn);

    if (spawner.golden && spawner.golden.active) {
      if (!updateGolden(spawner.golden, worldDt)) {
        // it escaped
        bumpStat('goldensEscaped');
        floaters.add({
          x: spawner.golden.x, y: spawner.golden.y, text: 'IT GOT AWAY...',
          color: '#ff7a7a', size: 26, life: 1.6, vy: -30,
        });
        toast('The golden egg escaped', 'bad', '💨');
        sfx.goldenLost();
        if (hooks.onGoldenEnd) hooks.onGoldenEnd({ caught: false });
      }
    }

    // --- breaker ---
    const input = {
      left: isLeft(),
      right: isRight(),
      pointerActive: pointer.active && pointer.inside,
      pointerX: pointer.x,
    };
    updateBreaker(breaker, worldDt, d, input);
    breaker.y = floorY;

    // auto-swing while the smash key/pointer is held
    const goldenUp = !!(spawner.golden && spawner.golden.active);
    if (!goldenUp && (pointer.down || hasSpace())) {
      playerSmash();
    }

    // --- eggs ---
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i];
      updateEgg(e, worldDt, time, d, bounds);
      if (e.dead) {
        if (e.missed) {
          streak = 0;
          floaters.add({
            x: e.x, y: bounds.h - 40, text: 'MISSED',
            color: 'rgba(255,150,150,0.7)', size: 13, life: 0.8,
          });
        }
        eggs.splice(i, 1);
      }
    }

    // --- passive paddle contact + magnet ---
    for (const e of eggsTouchingBreaker(eggs, breaker, d.magnetR)) {
      const r = rollDamage(d);
      hitEgg(e, r.damage, { crit: r.crit, source: 'paddle' });
    }

    // --- steady-hands auto-smash ---
    if (d.autoSmash) {
      const target = lowestEgg(eggs, floorY);
      if (target) {
        const r = rollDamage(d);
        hitEgg(target, r.damage, { crit: r.crit, source: 'auto' });
      }
    }

    // --- swing hitbox ---
    for (const { egg, hx, hy } of eggsInSwing(eggs, breaker)) {
      breaker.hitEggs.add(egg.id);
      const r = rollDamage(d);
      particles.sparks(hx, hy, '#fff8e7', 6, 0.8);
      hitEgg(egg, r.damage, { crit: r.crit, source: 'swing' });
    }

    // --- drones ---
    syncDrones();
    for (const dr of drones) {
      const hit = updateDrone(dr, worldDt, eggs, bounds, d);
      if (hit) {
        const r = rollDamage(d);
        hitEgg(hit, r.damage, { crit: r.crit, source: 'drone', fromDrone: true });
      }
    }

    // --- particles / floaters / combo ---
    particles.update(worldDt, bounds.h - 4);
    floaters.update(dt);
    updateCombo(combo, dt);

    // --- fx bookkeeping ---
    streakLife = Math.max(0, streakLife - dt * 1.6);
    if (showHint && (state.stats.smashed > 3 || time > 25)) {
      hintAlpha = Math.max(0, hintAlpha - dt * 1.4);
      if (hintAlpha <= 0) showHint = false;
    }

    // --- autosave ---
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      save();
    }
  }

  function hasSpace() {
    // pointer.down already covers click-hold; keyboard hold is checked here
    return spaceHeld;
  }

  /* ---------------- drones keep in sync with the save ---------------- */
  function syncDrones() {
    while (drones.length < d.drones) drones.push(createDrone(drones.length, bounds));
    while (drones.length > d.drones) drones.pop();
    // re-seat them if the count changed
    drones.forEach((dr, i) => {
      dr.homeX = bounds.w * (0.18 + 0.64 * (i / 5));
      dr.homeY = bounds.h * (0.18 + (i % 2) * 0.1);
      dr.r = 15 * worldScale;
      dr.scale = worldScale;
    });
  }

  /* ---------------- render ---------------- */
  function render(dt) {
    // work in CSS pixels, render at device resolution
    ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
    drawFrame(ctx, {
      w: bounds.w,
      h: bounds.h,
      bg, particles, floaters, camera,
      eggs, drones, breaker,
      golden: spawner.golden && spawner.golden.active ? spawner.golden : null,
      skinId: state.equipped.eggSkin,
      t: time,
      floorY,
      showHint,
      hintAlpha,
      streak,
      streakLife,
    });
  }

  const loop = createLoop({ update, render });

  /* ---------------- public API ---------------- */
  return {
    start() { started = true; beginRun(); loop.start(); },
    pause() { paused = true; },
    resume() { if (!stopped) paused = false; },
    isPaused: () => paused,
    isStopped: () => stopped,

    /**
     * End the current run: freeze and clear the field, bank the earnings
     * (they already went into the wallet) and return the results summary.
     */
    stop() {
      if (stopped) return endRun();
      stopped = true;
      paused = true;
      if (spawner.golden && hooks.onGoldenEnd) hooks.onGoldenEnd({ caught: false });
      eggs.length = 0;
      drones.length = 0;
      particles.clear();
      floaters.clear();
      spawner.golden = null;
      combo.count = 0;
      streak = 0;
      const summary = endRun();
      const prev = {
        coins: state.stats.bestRunCoins,
        smashed: state.stats.bestRunSmashed,
        time: state.stats.longestRun,
      };
      state.stats.runs += 1;
      state.stats.longestRun = Math.max(prev.time, summary.time);
      state.stats.bestRunCoins = Math.max(prev.coins, summary.coins);
      state.stats.bestRunSmashed = Math.max(prev.smashed, summary.smashed);
      // a tie is not a record
      summary.record = {
        coins: summary.coins > prev.coins && summary.coins > 0,
        smashed: summary.smashed > prev.smashed && summary.smashed > 0,
        time: summary.time > prev.time && summary.time > 0,
      };
      save();
      return summary;
    },

    /** a brand new run — progress, shop and stats are all kept */
    newRun() {
      stopped = false;
      paused = false;
      eggs.length = 0;
      drones.length = 0;
      particles.clear();
      floaters.clear();
      spawner.golden = null;
      combo.count = 0;
      streak = 0;
      beginRun();
    },
    smash: playerSmash,
    hitGolden: hitGoldenEgg,
    get world() {
      return { eggs, drones, breaker, particles, floaters, camera, spawner, combo, bounds, floorY };
    },
    get combo() { return combo; },
    get comboRatio() { return comboRatio(combo); },
    get golden() { return spawner.golden; },
    get derived() { return d; },
    get streak() { return streak; },
    get streakLife() { return streakLife; },
    get time() { return time; },
    /**
     * Re-fit the play field to a new CSS size. Everything in flight is
     * repositioned proportionally so a resize never loses a run.
     */
    setBounds(nw, nh, nScale, dpr = 1) {
      const oldW = bounds.w;
      const oldH = bounds.h;
      const oldS = worldScale;
      const nextScale = clamp(nScale || 1, 0.6, 2.2);
      if (nw === oldW && nh === oldH && nextScale === oldS && dpr === renderDpr) return;

      const rx = nw / oldW;
      const ry = nh / oldH;
      const rs = nextScale / oldS;

      bounds.w = nw;
      bounds.h = nh;
      worldScale = nextScale;
      renderDpr = dpr;
      floorY = nh - Math.round(70 * nextScale);

      bg.resize(nw, nh);
      particles.setScale(nextScale);
      floaters.setScale(nextScale);

      spawner.sizeScale = nextScale;
      spawner.fallScale = clamp(nh / DESIGN_H, 0.6, 2.2);
      spawner.areaScale = clamp((nw * nh) / (DESIGN_W * DESIGN_H), 1, 2.4);

      breaker.scale = nextScale;
      breaker.w = d.paddleW * nextScale;
      breaker.h = 22 * nextScale;
      breaker.x = clamp(breaker.x * rx, breaker.w / 2, nw - breaker.w / 2);
      breaker.targetX = breaker.x;
      breaker.y = floorY;

      for (const e of eggs) {
        e.r *= rs;
        e.x = clamp(e.x * rx, e.r, Math.max(e.r, nw - e.r));
        e.y *= ry;
        e.baseFall *= clamp(ry, 0.5, 3);
        e.vy *= clamp(ry, 0.5, 3);
        e.sizeScale = nextScale;
        e.fallScale = spawner.fallScale;
        e.drift *= rs;
      }

      for (const dr of drones) {
        dr.x = clamp(dr.x * rx, 0, nw);
        dr.y = clamp(dr.y * ry, 0, nh);
        dr.r *= rs;
        dr.scale = nextScale;
        dr.target = null;
        dr.state = 'idle';
        dr.timer = rand(0.2, 1);
      }

      if (spawner.golden) {
        const g = spawner.golden;
        g.baseW = nw;
        g.baseH = nh;
        g.x = clamp(g.x * rx, 0, nw);
        g.y = clamp(g.y * ry, 0, nh);
        g.r *= rs;
        g.scale = nextScale;
        for (const m of g.motes) m.r *= rs;
      }

      hintAlpha = Math.min(hintAlpha, 1);
    },

    get scale() { return worldScale; },
    get dpr() { return renderDpr; },
    get size() { return { w: bounds.w, h: bounds.h }; },
    get floorY() { return floorY; },
    setDpr(v) { renderDpr = v; },
    save: () => save(),
    reset() {
      stopped = false;
      eggs.length = 0;
      drones.length = 0;
      particles.clear();
      floaters.clear();
      spawner.golden = null;
      combo.count = 0;
      streak = 0;
    },
  };
}

/* keyboard hold tracking for auto-swing */
let spaceHeld = false;
export function bindHoldKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') spaceHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.code === 'Space') spaceHeld = false;
  });
  window.addEventListener('blur', () => { spaceHeld = false; });
}
