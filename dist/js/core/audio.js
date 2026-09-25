/* ============================================================
   core/audio.js — 100% synthesised SFX + a tiny music loop
   No audio files: every sound is built from oscillators.
   ============================================================ */
import { state } from './state.js';
import { clamp } from './utils.js';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let musicTimer = null;
let musicStep = 0;
let unlocked = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0.0;
  musicBus.connect(master);
  return ctx;
}

/** must be called from a user gesture */
export function unlock() {
  ensure();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  unlocked = true;
  startMusic();
}

export function setEnabled(on) {
  state.settings.sound = on;
  if (!ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.5 : 0, ctx.currentTime + 0.12);
  if (on) unlock();
}

export function isEnabled() {
  return state.settings.sound !== false;
}

const live = () => (ctx && unlocked && isEnabled() ? ctx : null);

/* ---------------- primitives ---------------- */
function env(node, t0, a, d, peak = 1) {
  const g = node.gain;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
  g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone({ freq = 440, to = null, type = 'sine', dur = 0.18, attack = 0.005, gain = 0.3, delay = 0, bus = null }) {
  const c = live();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  env(g, t0, attack, dur, gain);
  osc.connect(g).connect(bus || sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + attack + 0.05);
}

let noiseBuf = null;
function noiseBuffer() {
  const c = live();
  if (!c) return null;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function noise({ dur = 0.2, gain = 0.3, lp = 2400, hp = 200, delay = 0, sweepTo = null }) {
  const c = live();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer();
  const low = c.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.setValueAtTime(lp, t0);
  if (sweepTo) low.frequency.exponentialRampToValueAtTime(Math.max(80, sweepTo), t0 + dur);
  const high = c.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = hp;
  const g = c.createGain();
  env(g, t0, 0.004, dur, gain);
  src.connect(high).connect(low).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
}

/* ---------------- game sounds ---------------- */
export const sfx = {
  /** egg cracking — pitch rises with combo */
  crack(step = 0, combo = 0) {
    const p = Math.min(12, step * 2);
    tone({ freq: 420 + p * 30, to: 180, type: 'square', dur: 0.07, gain: 0.14 });
    noise({ dur: 0.06, gain: 0.16, lp: 5200, hp: 900 });
  },

  /** egg fully shattering */
  smash(combo = 0) {
    const step = Math.min(14, combo);
    const base = 300 * Math.pow(1.045, step);
    tone({ freq: base, to: base * 0.35, type: 'triangle', dur: 0.16, gain: 0.3 });
    tone({ freq: base * 2, to: base * 0.5, type: 'sine', dur: 0.1, gain: 0.14, delay: 0.01 });
    noise({ dur: 0.22, gain: 0.3, lp: 3600, hp: 300, sweepTo: 400 });
  },

  /** metal clank when a swing misses / armored egg */
  clank() {
    tone({ freq: 900, to: 700, type: 'square', dur: 0.05, gain: 0.09 });
    tone({ freq: 1350, to: 1100, type: 'square', dur: 0.04, gain: 0.06, delay: 0.02 });
  },

  swing() {
    noise({ dur: 0.16, gain: 0.11, lp: 1400, hp: 260, sweepTo: 2600 });
  },

  coin(n = 1) {
    const step = Math.min(8, Math.floor(Math.log2(n + 1)));
    tone({ freq: 880 * Math.pow(1.06, step), type: 'sine', dur: 0.07, gain: 0.1 });
    tone({ freq: 1320 * Math.pow(1.06, step), type: 'sine', dur: 0.1, gain: 0.07, delay: 0.05 });
  },

  crit() {
    tone({ freq: 660, to: 1760, type: 'sawtooth', dur: 0.18, gain: 0.16 });
    tone({ freq: 990, to: 2640, type: 'sine', dur: 0.2, gain: 0.1, delay: 0.03 });
    noise({ dur: 0.3, gain: 0.2, lp: 8000, hp: 1200, sweepTo: 800 });
  },

  buy() {
    tone({ freq: 523, type: 'triangle', dur: 0.1, gain: 0.16 });
    tone({ freq: 659, type: 'triangle', dur: 0.1, gain: 0.16, delay: 0.07 });
    tone({ freq: 784, type: 'triangle', dur: 0.18, gain: 0.16, delay: 0.14 });
  },

  equip() {
    tone({ freq: 392, to: 784, type: 'sine', dur: 0.16, gain: 0.14 });
    noise({ dur: 0.1, gain: 0.06, lp: 6000, hp: 2000 });
  },

  deny() {
    tone({ freq: 180, to: 90, type: 'square', dur: 0.16, gain: 0.12 });
  },

  golden() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.13, delay: i * 0.08 });
      tone({ freq: f * 2, type: 'sine', dur: 0.2, gain: 0.05, delay: i * 0.08 + 0.01 });
    });
  },

  goldenTick(urgency = 0) {
    tone({ freq: 900 + urgency * 500, type: 'sine', dur: 0.05, gain: 0.06 });
  },

  goldenHit() {
    tone({ freq: 220, to: 90, type: 'square', dur: 0.14, gain: 0.16 });
    noise({ dur: 0.18, gain: 0.2, lp: 5000, hp: 600 });
  },

  goldenLost() {
    const notes = [440, 392, 330, 262];
    notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.26, gain: 0.12, delay: i * 0.13 }));
  },

  levelUp() {
    const notes = [523, 784, 1046];
    notes.forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.14, gain: 0.08, delay: i * 0.06 }));
  },

  ui() {
    tone({ freq: 620, type: 'sine', dur: 0.04, gain: 0.05 });
  },

  gameOver() {
    tone({ freq: 200, to: 60, type: 'sawtooth', dur: 0.6, gain: 0.12 });
  },
};

/* ---------------- music ---------------- */
const SCALE = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];
let musicOn = false;

function musicNote() {
  const c = live();
  if (!c || !musicOn) return;
  const semis = SCALE[musicStep % SCALE.length];
  const octave = musicStep % 24 < 12 ? 1 : 2;
  const freq = 130.81 * Math.pow(2, (semis + 12 * (octave - 1)) / 12);
  const t0 = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const g = c.createGain();
  env(g, t0, 0.01, 0.42, 0.16);
  osc.connect(g).connect(musicBus);
  osc.start(t0);
  osc.stop(t0 + 0.5);

  // soft pluck octave up
  const osc2 = c.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  const g2 = c.createGain();
  env(g2, t0, 0.005, 0.16, 0.05);
  osc2.connect(g2).connect(musicBus);
  osc2.start(t0);
  osc2.stop(t0 + 0.25);

  // bass on the downbeat
  if (musicStep % 4 === 0) {
    const b = c.createOscillator();
    b.type = 'sine';
    b.frequency.value = freq / 2;
    const bg = c.createGain();
    env(bg, t0, 0.01, 0.5, 0.12);
    b.connect(bg).connect(musicBus);
    b.start(t0);
    b.stop(t0 + 0.6);
  }

  musicStep++;
}

function startMusic() {
  if (musicTimer || !ctx) return;
  musicOn = true;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
  musicTimer = setInterval(musicNote, 260);
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (ctx) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  }
}

/** loudness helper for the canvas effects (0..1) */
export function volumeScale(v) {
  return clamp(v, 0, 1);
}
