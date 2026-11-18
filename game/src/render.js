// The renderer for Wispkeeper. One job: paint the world and the screens —
// the reef at night, the keeper and the lantern, wisps, moths, beacons, the
// HUD, and the title, pause and end panels — as a pure picture of the state
// it is handed. It changes nothing; main.js owns the flow, world.js the rules.

import {
  BEACONS, COLORS, FIELD, HEARTS, LIGHT,
} from './config.js';
import { createRandom } from './random.js';
import { MODE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const BODY_FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

/** Stars are fixed dressing: one seeded scatter, drawn every frame. */
const STARS = (() => {
  const rand = createRandom(20261118);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: rand() * FIELD.width, y: rand() * 330, r: 0.6 + rand() * 1.5, phase: rand() * 6.28 });
  }
  return stars;
})();

/** Creates the renderer bound to `canvas`, with its window-fit transform. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.scale = Math.min(view.width / FIELD.width, view.height / FIELD.height);
    view.offsetX = (view.width - FIELD.width * view.scale) / 2;
    view.offsetY = (view.height - FIELD.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  /** Converts a client (mouse) point into field coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.offsetX) / view.scale,
      y: (clientY - rect.top - view.offsetY) / view.scale,
    };
  }

  /** Paints one frame: `screen` picks which panel, if any, sits over the reef. */
  function render(world, screen, info) {
    activeCtx = ctx;
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
    if (world.shake > 0) {
      const s = world.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawReef(world);
    drawBeacons(world);
    drawWisps(world);
    drawMoths(world);
    drawKeeper(world);
    drawParticles(world);
    drawFloaters(world);
    drawDarkness(world, screen);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(world, info);
    if (screen === SCREEN_TITLE) drawTitle(world, info);
    if (screen === SCREEN_PAUSED) drawCentredPanel(world, 'PAUSED', ['The tide holds its breath.', 'Press P or Esc to drift on.']);
    if (screen === SCREEN_OVER) drawEnd(world, info);
    ctx.restore();
  }

  return { render, toField, view };
}

/* ---------- the reef ---------- */

function drawReef(world) {
  const ctx = currentCtx();
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.62, COLORS.skyBottom);
  sky.addColorStop(0.63, COLORS.waterTop);
  sky.addColorStop(1, COLORS.waterBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  for (const star of STARS) {
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(world.time * 0.7 + star.phase));
    ctx.globalAlpha = twinkle * 0.9;
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The moon and its halo.
  const moonX = 822;
  const moonY = 88;
  const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 92);
  halo.addColorStop(0, 'rgba(244,234,208,0.35)');
  halo.addColorStop(1, 'rgba(244,234,208,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - 92, moonY - 92, 184, 184);
  ctx.fillStyle = COLORS.moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 33, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,178,150,0.5)';
  for (const [cx, cy, r] of [[810, 78, 6], [834, 96, 4.5], [818, 102, 3.4]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two hill silhouettes on the horizon, then the water's shimmer.
  hillPath(ctx, 372, 66, COLORS.hillFar);
  hillPath(ctx, 402, 40, COLORS.hillNear);
  ctx.strokeStyle = 'rgba(160,190,255,0.16)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i += 1) {
    const y = 442 + i * 21;
    const drift = Math.sin(world.time * 0.6 + i * 1.7) * 14;
    ctx.beginPath();
    for (let x = 30; x <= FIELD.width - 30; x += 46) {
      const midY = y + Math.sin(world.time * 0.9 + x * 0.02 + i) * 2;
      if (x === 30) ctx.moveTo(x + drift, midY);
      else ctx.lineTo(x + drift, midY);
    }
    ctx.stroke();
  }
}

function hillPath(ctx, baseY, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= FIELD.width; x += 60) {
    ctx.lineTo(x, baseY - Math.abs(Math.sin(x * 0.011 + height)) * height - Math.sin(x * 0.03) * 6);
  }
  ctx.lineTo(FIELD.width, baseY);
  ctx.closePath();
  ctx.fill();
}

/** The five sky lanterns on their wire: lit ones glow, the rest wait dark. */
function drawBeacons(world) {
  const ctx = currentCtx();
  ctx.strokeStyle = 'rgba(200,190,160,0.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(40, 14);
  ctx.quadraticCurveTo(FIELD.width / 2, 46, FIELD.width - 40, 14);
  ctx.stroke();
  for (let i = 0; i < BEACONS.count; i += 1) {
    const x = 160 + i * 160;
    const y = 30 + Math.sin((x / FIELD.width) * Math.PI) * 7;
    const lit = i < world.beaconsLit;
    if (lit) {
      const flicker = 0.85 + 0.15 * Math.sin(world.time * 7 + i * 2.1);
      const glow = ctx.createRadialGradient(x, y + 12, 2, x, y + 12, 34 * flicker);
      glow.addColorStop(0, 'rgba(255,215,106,0.75)');
      glow.addColorStop(1, 'rgba(255,215,106,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 36, y - 24, 72, 72);
    }
    ctx.strokeStyle = lit ? COLORS.gold : 'rgba(160,165,185,0.55)';
    ctx.fillStyle = lit ? 'rgba(255,183,71,0.9)' : 'rgba(30,36,58,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 4);
    ctx.moveTo(x - 8, y + 6);
    ctx.lineTo(x + 8, y + 6);
    ctx.lineTo(x + 6, y + 22);
    ctx.lineTo(x - 6, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (lit) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(x, y + 14, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------- creatures ---------- */

function drawWisps(world) {
  const ctx = currentCtx();
  for (const wisp of world.wisps) {
    const bob = Math.sin(world.time * 2.4 + wisp.phase) * 3;
    const y = wisp.y + bob;
    const color = wisp.kind === 'gold' ? COLORS.gold : wisp.kind === 'frost' ? COLORS.frost : COLORS.heart;
    const glow = ctx.createRadialGradient(wisp.x, y, 1, wisp.x, y, 26);
    glow.addColorStop(0, color + 'aa');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(wisp.x - 26, y - 26, 52, 52);
    if (wisp.kind === 'heart') {
      drawHeart(ctx, wisp.x, y, 8, COLORS.heart);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(wisp.x, y, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8e2';
      ctx.beginPath();
      ctx.arc(wisp.x, y, 2.9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (wisp.kind === 'frost') {
      ctx.strokeStyle = 'rgba(210,240,255,0.9)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i += 1) {
        const a = (i * Math.PI) / 4 + world.time * 0.8;
        ctx.beginPath();
        ctx.moveTo(wisp.x - Math.cos(a) * 11, y - Math.sin(a) * 11);
        ctx.lineTo(wisp.x + Math.cos(a) * 11, y + Math.sin(a) * 11);
        ctx.stroke();
      }
    }
  }
}

function drawMoths(world) {
  const ctx = currentCtx();
  const frozen = world.time < world.freezeUntil;
  for (const moth of world.moths) {
    const flap = frozen ? 0.2 : Math.sin(world.time * 16 + moth.phase) * 0.55;
    ctx.save();
    ctx.translate(moth.x, moth.y);
    ctx.fillStyle = frozen ? '#7d94b8' : COLORS.mothWing;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.5 - flap * 0.5);
      ctx.beginPath();
      ctx.ellipse(13, -3, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = frozen ? '#a9c2e2' : COLORS.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = frozen ? '#eaf4ff' : COLORS.mothEye;
    ctx.beginPath();
    ctx.arc(-3.2, -5, 1.8, 0, Math.PI * 2);
    ctx.arc(3.2, -5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (frozen) {
    ctx.fillStyle = 'rgba(190,230,255,0.95)';
    ctx.font = '600 15px ' + BODY_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`the gloom is frozen — ${Math.max(0, world.freezeUntil - world.time).toFixed(0)}s`, FIELD.width / 2, 84);
  }
}

function drawKeeper(world) {
  const ctx = currentCtx();
  const player = world.player;
  const blink = world.time < player.invulnerableUntil && Math.floor(world.time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (blink) ctx.globalAlpha = 0.35;
  // Soft shadow on the water.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 17, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The lantern's halo, behind the keeper.
  const halo = ctx.createRadialGradient(player.faceX * 15, 1, 2, player.faceX * 15, 1, 30);
  halo.addColorStop(0, 'rgba(255,215,106,0.55)');
  halo.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-46, -30, 92, 62);
  // Cloak: a rounded, hooded robe with a walking sway.
  const sway = Math.sin(player.walkPhase) * 2;
  ctx.fillStyle = COLORS.keeperCloak;
  ctx.beginPath();
  ctx.moveTo(-11, 16);
  ctx.quadraticCurveTo(-13 + sway, -2, -6, -10);
  ctx.quadraticCurveTo(0, -17, 6, -10);
  ctx.quadraticCurveTo(13 + sway, -2, 11, 16);
  ctx.quadraticCurveTo(0, 20, -11, 16);
  ctx.fill();
  ctx.fillStyle = COLORS.keeperCloakDark;
  ctx.beginPath();
  ctx.arc(0, -9, 8.4, Math.PI, 0);
  ctx.fill();
  // Face in the hood.
  ctx.fillStyle = COLORS.keeperFace;
  ctx.beginPath();
  ctx.arc(0, -7.5, 5.4, 0, Math.PI * 2);
  ctx.fill();
  // The lantern itself, held out toward the way the keeper faces.
  const lx = player.faceX * 15;
  ctx.strokeStyle = '#caa25e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(player.faceX * 7, -2);
  ctx.lineTo(lx, -5);
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(lx, 1, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(lx, 1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(world) {
  const ctx = currentCtx();
  for (const p of world.particles) {
    const alpha = 1 - p.life / p.ttl;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The flare's expanding ring, in the third of a second after it fires.
  const since = world.time - world.flarePulseAt;
  if (world.flarePulseAt >= 0 && since >= 0 && since < 0.38) {
    const progress = since / 0.38;
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3.5 * (1 - progress) + 0.5;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, 12 + progress * 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawFloaters(world) {
  const ctx = currentCtx();
  ctx.font = '700 15px ' + BODY_FONT;
  ctx.textAlign = 'center';
  for (const item of world.floaters) {
    ctx.globalAlpha = 1 - item.life / item.ttl;
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalAlpha = 1;
}

/** Night itself: outside the lantern's reach the reef falls dark. */
function drawDarkness(world, screen) {
  const ctx = currentCtx();
  const light = screen === SCREEN_TITLE ? LIGHT.start : world.light;
  const radius = 100 + light * 2.3;
  const { x, y } = world.player;
  const gradient = ctx.createRadialGradient(x, y, radius * 0.45, x, y, radius);
  gradient.addColorStop(0, 'rgba(3,5,16,0)');
  gradient.addColorStop(1, 'rgba(3,5,16,0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (screen === SCREEN_PLAY && world.light <= LIGHT.lowWarning) {
    const pulse = 0.1 + 0.07 * Math.sin(world.time * 5);
    ctx.fillStyle = `rgba(160,20,20,${pulse.toFixed(3)})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}

/* ---------- HUD and panels ---------- */

function drawHud(world, info) {
  const ctx = currentCtx();
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 21px ' + BODY_FONT;
  ctx.fillText(`Score ${world.score}`, 18, FIELD.height - 40);
  ctx.font = '500 13px ' + BODY_FONT;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Best ${Math.max(info.best, world.score)}`, 18, FIELD.height - 20);
  ctx.fillText('Arrows / WASD or hold mouse to drift', 18, 24);

  // Hearts, top right.
  for (let i = 0; i < HEARTS.max; i += 1) {
    const x = FIELD.width - 30 - i * 30;
    drawHeart(ctx, x, 22, 10, i < world.hearts ? COLORS.heart : 'rgba(150,155,175,0.3)');
  }

  // The lantern light bar, bottom centre: the one number that matters most.
  const barWidth = 360;
  const barX = (FIELD.width - barWidth) / 2;
  const barY = FIELD.height - 34;
  ctx.font = '600 12px ' + BODY_FONT;
  ctx.textAlign = 'center';
  ctx.fillStyle = world.light <= LIGHT.lowWarning ? COLORS.danger : COLORS.textDim;
  ctx.fillText('LANTERN LIGHT', FIELD.width / 2, barY - 8);
  ctx.fillStyle = 'rgba(6,10,24,0.75)';
  roundRect(ctx, barX - 3, barY - 3, barWidth + 6, 17, 8);
  ctx.fill();
  const fillWidth = Math.max(0, barWidth * (world.light / LIGHT.max));
  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, '#ff9d5c');
  gradient.addColorStop(0.5, COLORS.gold);
  gradient.addColorStop(1, '#fff0b3');
  ctx.fillStyle = gradient;
  if (fillWidth > 2) {
    roundRect(ctx, barX, barY, fillWidth, 11, 5);
    ctx.fill();
  }
  // Wisps banked toward the next beacon, as pips right under the bar.
  for (let i = 0; i < BEACONS.wispsPerBeacon; i += 1) {
    ctx.fillStyle = i < world.wispsBanked ? COLORS.gold : 'rgba(160,165,185,0.35)';
    ctx.beginPath();
    ctx.arc(FIELD.width / 2 - (BEACONS.wispsPerBeacon - 1) * 9 + i * 18, barY + 26, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.font = '500 13px ' + BODY_FONT;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Space: flare (${LIGHT.flareCost} light)`, FIELD.width - 18, FIELD.height - 40);
  ctx.fillText(info.muted ? 'M: sound off' : 'M: sound on', FIELD.width - 18, FIELD.height - 20);
  ctx.textAlign = 'left';
}

function drawTitle(world, info) {
  const ctx = currentCtx();
  panel(ctx, 190, 96, 580, 392);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = '700 54px ' + TITLE_FONT;
  ctx.fillText('WISPKEEPER', FIELD.width / 2, 168);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 19px ' + TITLE_FONT;
  ctx.fillText('Lanterns of the Hollow Tide', FIELD.width / 2, 200);
  ctx.font = '400 15.5px ' + BODY_FONT;
  ctx.fillStyle = COLORS.textDim;
  const lines = [
    'The reef\'s five sky lanterns have gone dark, and the gloom moths',
    'are coming for the last light — yours.',
    '',
    'Gather golden wisps to relight all 5 beacons before dawn.',
    'Your lantern burns down every second: wisps are its only fuel.',
    'Blue wisps freeze the moths. Pink wisps mend a heart.',
    'A moth\'s touch costs a heart. No light or no hearts, and the tide wins.',
    '',
    'Drift: arrow keys, WASD, or hold the mouse.  Space: flare —',
    'burn 16 light to scatter nearby moths.  P: pause.  M: sound.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 238 + i * 21));
  const blink = Math.floor(world.time * 1.6) % 2 === 0;
  ctx.fillStyle = blink ? COLORS.gold : COLORS.text;
  ctx.font = '700 19px ' + BODY_FONT;
  ctx.fillText('Click, or press Enter, to take up the lantern', FIELD.width / 2, 462);
  if (info.best > 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '500 14px ' + BODY_FONT;
    ctx.fillText(`Best score so far: ${info.best}`, FIELD.width / 2, 540);
  }
}

function drawEnd(world, info) {
  const ctx = currentCtx();
  const won = world.mode === MODE_WON;
  panel(ctx, 240, 120, 480, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? COLORS.gold : COLORS.danger;
  ctx.font = '700 37px ' + TITLE_FONT;
  ctx.fillText(won ? 'DAWN BREAKS' : 'THE LIGHT GOES OUT', FIELD.width / 2, 182);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 16.5px ' + TITLE_FONT;
  const story = won
    ? 'All five beacons burn again. The reef sleeps safe.'
    : world.loseReason === 'hearts'
      ? 'The moths reached the keeper one time too many.'
      : 'The lantern starved in the dark, far from the wisps.';
  ctx.fillText(story, FIELD.width / 2, 214);
  ctx.font = '400 17px ' + BODY_FONT;
  ctx.fillStyle = COLORS.textDim;
  const stats = [
    `Score  ${world.score}      Best  ${Math.max(info.best, world.score)}`,
    `Beacons lit  ${world.beaconsLit} of ${BEACONS.count}      Wisps gathered  ${world.gathered}`,
    `Moths scattered  ${world.mothsScattered}      Flares burned  ${world.flaresUsed}`,
    `Time on the tide  ${Math.floor(world.elapsed / 60)}:${String(Math.floor(world.elapsed % 60)).padStart(2, '0')}`,
  ];
  stats.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 262 + i * 27));
  const blink = Math.floor(world.time * 1.6) % 2 === 0;
  ctx.fillStyle = blink ? COLORS.gold : COLORS.text;
  ctx.font = '700 18px ' + BODY_FONT;
  ctx.fillText('Click, or press R, to keep the light again', FIELD.width / 2, 404);
}

function drawCentredPanel(world, heading, lines) {
  const ctx = currentCtx();
  panel(ctx, 300, 218, 360, 130);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = '700 30px ' + TITLE_FONT;
  ctx.fillText(heading, FIELD.width / 2, 268);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '400 15px ' + BODY_FONT;
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 300 + i * 21));
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(7,11,28,0.82)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.55)';
  ctx.lineWidth = 1.6;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.85);
  ctx.bezierCurveTo(x - size * 1.25, y, x - size * 0.7, y - size * 1.05, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.7, y - size * 1.05, x + size * 1.25, y, x, y + size * 0.85);
  ctx.fill();
}

/** The renderer keeps its context module-local to keep helper signatures short. */
let activeCtx = null;
function currentCtx() {
  return activeCtx;
}
