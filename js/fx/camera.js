/* ============================================================
   fx/camera.js — screen shake, kick, zoom, hit-stop
   Every smash shakes the camera a different amount.
   ============================================================ */
import { rand, clamp, damp } from '../core/utils.js';

export function createCamera() {
  return {
    trauma: 0,        // 0..1, decays; shake = trauma^2
    shakeX: 0,
    shakeY: 0,
    zoom: 1,
    zoomTarget: 1,
    rot: 0,
    hitStop: 0,       // seconds of frozen time
    flash: 0,
  };
}

/** add trauma; stacks but is capped */
export function addTrauma(cam, amount) {
  cam.trauma = clamp(cam.trauma + amount, 0, 1);
}

export function kickZoom(cam, amount) {
  cam.zoomTarget = clamp(cam.zoomTarget + amount, 0.9, 1.12);
}

export function freeze(cam, seconds) {
  cam.hitStop = Math.max(cam.hitStop, seconds);
}

export function updateCamera(cam, dt) {
  cam.trauma = Math.max(0, cam.trauma - dt * 1.55);
  const s = cam.trauma * cam.trauma;
  cam.shakeX = rand(-1, 1) * 26 * s;
  cam.shakeY = rand(-1, 1) * 20 * s;
  cam.rot = rand(-1, 1) * 0.012 * s;

  cam.zoomTarget = damp(cam.zoomTarget, 1, 6, dt);
  cam.zoom = damp(cam.zoom, cam.zoomTarget, 12, dt);

  cam.flash = Math.max(0, cam.flash - dt * 3);
  if (cam.hitStop > 0) cam.hitStop = Math.max(0, cam.hitStop - dt);
}

/** apply to a 2d context: call inside save()/restore() */
export function applyCamera(cam, ctx, w, h) {
  ctx.translate(w / 2, h / 2);
  ctx.rotate(cam.rot);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-w / 2 + cam.shakeX, -h / 2 + cam.shakeY);
}

export function resetCamera(cam) {
  cam.trauma = 0; cam.zoom = 1; cam.zoomTarget = 1;
  cam.shakeX = 0; cam.shakeY = 0; cam.rot = 0; cam.hitStop = 0;
}
