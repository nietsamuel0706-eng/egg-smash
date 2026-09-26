# 🥚 EGG SMASHER

An arcade/idle egg-smashing game. Eggs rain down, you swing a hammer, you get coins,
you buy shinier hammers and fancier egg shells. No build step, no dependencies —
plain ES modules, one `<canvas>`, and a lot of animation.

```
smashegg/
├── index.html
├── css/
│   ├── main.css          layout, top bar, buttons, overlays
│   ├── hud.css           stat chips, combo meter, boost timers
│   ├── shop.css          shop cards, rarity, egg codex
│   └── animations.css    every DOM keyframe animation
└── js/
    ├── main.js           bootstrap + UI wiring + game loop kickoff
    ├── core/
    │   ├── game.js       the brain: update loop, smash logic, rewards
    │   ├── loop.js       rAF loop with clamped dt + fps meter
    │   ├── state.js      save file, pub/sub, currency, boosts
    │   ├── stats.js      save file → live gameplay numbers
    │   ├── input.js      keyboard + mouse + touch, one event bus
    │   ├── audio.js      100% synthesised SFX + music loop (no files)
    │   └── utils.js      math, random, formatting helpers
    ├── data/
    │   ├── eggs.js       8 egg tiers (hp, value, weight, unlock)
    │   ├── skins.js      8 hammers + 8 egg skins
    │   └── upgrades.js   9 upgrades, drones, 6 timed boosts
    ├── entities/
    │   ├── egg.js        fall / wobble / crack stages / death
    │   ├── breaker.js    paddle steering + swing animation + hitbox
    │   ├── drone.js      auto-smashing drones
    │   └── golden.js     the timed golden egg
    ├── systems/
    │   ├── spawner.js    spawn rates, tier rolls, golden scheduling
    │   ├── collision.js  paddle contact, swing arc, magnet
    │   ├── combo.js      combo window + multiplier curve
    │   └── renderer.js   draw order for the canvas
    ├── fx/
    │   ├── tween.js      easings, tween + spring engine
    │   ├── camera.js     screen shake, zoom, hit-stop
    │   ├── particles.js  pooled particle system + yolk decals
    │   ├── floaters.js   floating score text
    │   ├── background.js animated kitchen sky
    │   ├── egg-art.js    all egg rendering (used by game AND shop)
    │   └── hammer-art.js hammer + breaker rendering
    └── ui/
        ├── hud.js        purse, chips, combo bar, boost strip
        ├── shop.js       4 shop tabs, buy/equip, live previews
        ├── stats.js      stats grid + egg codex
        └── toast.js      toasts, screen flash, shake, confetti
```

## Run it

Because it uses ES modules, open it through a local server (not `file://`):

```bash
cd ~/smashegg
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How to play

| Input | Action |
|---|---|
| Mouse / touch | move the breaker, tap to swing |
| `A` `D` / `←` `→` | move |
| `Space` | swing (hold to auto-swing) |
| `1` `2` `3` | PLAY / SHOP / STATS tabs |

Eggs that touch your breaker get smashed automatically — the **swing** is what hits
eggs above the paddle and is where crits and combos come from.

- **Coins** from every egg, multiplied by yolk value × combo × crit.
- **Shards** drop from rare eggs and goldens; they gate the premium skins.
- **Combos** need 4 smashes within the combo window, then stack +0.25× every 4, up to ×4.
- **Golden eggs** appear periodically (more often with Luck). Hit the SMASH button or
  press `Space` before the timer runs out or it escapes.

## Shop

- **HAMMERS** — flat damage + crit bonuses, 8 tiers, animated per material.
- **EGG SKINS** — recolours every falling egg and adds a passive yolk bonus.
- **UPGRADES** — power, crit chance, crit damage, yolk value, paddle width, magnet,
  egg rate, combo window, luck. Plus the Auto-Smasher Drone (up to 6).
- **BOOSTS** — consumable timed multipliers, re-buying extends the timer.

Progress autosaves to `localStorage` every 5 seconds and on tab close.

## Deploying to the Raspberry Pi

The game is a pure static site — no build step, no dependencies, no assets — so
deploying is a file copy into a web root.

```bash
./tools/deploy.sh
```

That rebuilds `dist/` (runtime files only), uploads it to the Pi
(`samuels-raspi`, staged in `~/smashegg-deploy/`), copies it into
`/var/www/html/smashegg/`, and then verifies it over **public HTTPS** — the
cert chain, the status codes and the JavaScript MIME type. It asks for the Pi's
SSH password, then its sudo password. `HOST`, `ROOT`, `NAME`, `DOMAIN` and `IP`
can be overridden as environment variables.

## Where it lives

| | |
|---|---|
| Public | <https://samuel-thuis.duckdns.org/smashegg/> |
| LAN | <http://192.168.1.187/smashegg/> |
| Cert | Let's Encrypt, `samuel-thuis.duckdns.org`, renews before 19 Nov 2026 |

The port forward means the game is reachable from the public internet. All game
state lives in `localStorage` on the visitor's own device, so there is no
server-side data to protect — the shop, records and shards are all client-side.


## Notes

- Everything renders with the 2D canvas API; there are **zero image/audio assets**.
  Sound is synthesised with WebAudio oscillators (browsers require a click before audio
  starts — that's the "TAP TO SMASH" screen).
- The page fills the whole window: the top bar sits at the top and the play field takes
  every remaining pixel (the shop and stats panels scroll inside themselves).
- The canvas resizes with the window. Its backing store is sized to the CSS box times
  `devicePixelRatio` (capped at 2) so it stays sharp on hi-dpi screens, and the game world
  is re-scaled (`game.setBounds()`) between 0.85× and 1.75× of the original 960×600
  design — eggs, paddle, hammers, drones, particles and text all grow together, eggs fall
  a little faster in a taller field, and a bigger screen fits proportionally more eggs.
  Resizing mid-game never loses eggs in flight.
- `prefers-reduced-motion` is respected for the DOM animations.
- **Ending a run** — press the red ⏹ in the top bar (or it asks first, so you can't
  lose a run by accident). The field freezes and clears, a results card shows what you
  earned (eggs, coins, shards, best combo, crits, goldens, time, swings) and marks any
  new record. `PLAY AGAIN` starts a fresh run; `SHOP` lets you spend what you earned.
  Coins, gear, upgrades and lifetime stats are never lost by ending a run.
- Debug handle: `window.EGGSMASHER` (state, game, setTab, setCategory, fitCanvas) in the console.
