// The world of Wispkeeper: state and rules, no drawing and no sound.
// One job: advance the simulation one step at a time — the keeper's movement,
// the draining lantern, drifting wisps, hunting moths, flares, beacons, and
// the win and lose conditions — and report what happened as events, so the
// shell (main.js) can play sounds and the renderer can stay a pure picture.

import {
  BEACONS, FIELD, HEARTS, LIGHT, MOTH, PLAYER, WISP,
} from './config.js';
import { randomRange } from './random.js';

export const MODE_AMBIENT = 'ambient'; // title screen: the reef drifts, nothing is at stake
export const MODE_PLAYING = 'playing';
export const MODE_WON = 'won';
export const MODE_LOST = 'lost';

export const KIND_GOLD = 'gold';
export const KIND_FROST = 'frost';
export const KIND_HEART = 'heart';

export const EVENT_COLLECT = 'collect';
export const EVENT_HIT = 'hit';
export const EVENT_FLARE = 'flare';
export const EVENT_BEACON = 'beacon';
export const EVENT_WIN = 'win';
export const EVENT_LOSE = 'lose';
export const EVENT_HEARTBEAT = 'heartbeat';

const WISP_DRIFT = 14; // wisps wander slowly; the keeper does the travelling
const MOTH_WOBBLE = 2.4; // radians of sway in a moth's hunt, so it feels alive

/** Creates a fresh world in ambient (title) mode around the seeded `rand`. */
export function createWorld(rand) {
  const world = {
    rand,
    mode: MODE_AMBIENT,
    time: 0,
    elapsed: 0,
    player: {
      x: PLAYER.startX, y: PLAYER.startY, faceX: 1, invulnerableUntil: -1, walkPhase: 0,
    },
    light: LIGHT.start,
    hearts: HEARTS.start,
    score: 0,
    wispsBanked: 0, // gold wisps gathered toward the next beacon
    beaconsLit: 0,
    gathered: 0, // total wisps of every kind collected this run
    flaresUsed: 0,
    mothsScattered: 0,
    loseReason: null, // 'light' when the lantern dies, 'hearts' when the moths finish the keeper
    freezeUntil: -1,
    flareReadyAt: 0,
    flarePulseAt: -1, // when the last flare fired, for the renderer's ring
    shake: 0,
    heartbeatAt: 0,
    wisps: [],
    moths: [],
    particles: [],
    floaters: [],
    wispSpawnAt: 0,
    mothSpawnAt: 0,
  };
  for (let i = 0; i < WISP.targetCount; i += 1) spawnWisp(world, true);
  return world;
}

/** Resets the world for a new run and switches it to playing mode. */
export function startRun(world) {
  world.mode = MODE_PLAYING;
  world.elapsed = 0;
  world.player.x = PLAYER.startX;
  world.player.y = PLAYER.startY;
  world.player.faceX = 1;
  world.player.invulnerableUntil = -1;
  world.light = LIGHT.start;
  world.hearts = HEARTS.start;
  world.score = 0;
  world.wispsBanked = 0;
  world.beaconsLit = 0;
  world.gathered = 0;
  world.flaresUsed = 0;
  world.mothsScattered = 0;
  world.loseReason = null;
  world.freezeUntil = -1;
  world.flareReadyAt = 0;
  world.flarePulseAt = -1;
  world.shake = 0;
  world.moths.length = 0;
  world.particles.length = 0;
  world.floaters.length = 0;
  world.mothSpawnAt = world.time + 2.5; // a breath of calm before the first moth
  while (world.wisps.length < WISP.targetCount) spawnWisp(world, true);
}

/** How fast the lantern drains right now: every lit beacon raises it. */
export function lightDrainPerSecond(world) {
  return LIGHT.drainBase + world.beaconsLit * LIGHT.drainPerBeacon;
}

/** How fast a moth hunts right now. */
export function mothSpeed(world) {
  return MOTH.baseSpeed + world.beaconsLit * MOTH.speedPerBeacon;
}

/** How many moths the night wants on the field at this point in the run. */
export function mothTargetCount(world) {
  return Math.min(MOTH.maxCount, 1 + world.beaconsLit + (world.elapsed > 45 ? 1 : 0));
}

function spawnWisp(world, anywhere = false) {
  const roll = world.rand();
  const kind = roll < 0.72 ? KIND_GOLD : roll < 0.87 ? KIND_FROST : KIND_HEART;
  world.wisps.push({
    kind,
    x: randomRange(world.rand, 40, FIELD.width - 40),
    y: anywhere ? randomRange(world.rand, 70, FIELD.height - 40) : randomRange(world.rand, 70, FIELD.height / 2),
    vx: randomRange(world.rand, -WISP_DRIFT, WISP_DRIFT),
    vy: randomRange(world.rand, -WISP_DRIFT / 2, WISP_DRIFT),
    radius: WISP.radius,
    phase: randomRange(world.rand, 0, Math.PI * 2),
    active: true,
  });
}

function spawnMoth(world) {
  // Moths come from the field's edges, never on top of the keeper.
  const side = Math.floor(world.rand() * 4);
  const m = MOTH.spawnEdgeMargin;
  const spots = [
    { x: randomRange(world.rand, m, FIELD.width - m), y: m },
    { x: randomRange(world.rand, m, FIELD.width - m), y: FIELD.height - m },
    { x: m, y: randomRange(world.rand, m, FIELD.height - m) },
    { x: FIELD.width - m, y: randomRange(world.rand, m, FIELD.height - m) },
  ];
  const spot = spots[side];
  world.moths.push({
    x: spot.x,
    y: spot.y,
    radius: MOTH.radius,
    phase: randomRange(world.rand, 0, Math.PI * 2),
    active: true,
  });
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rand() * Math.PI * 2;
    const velocity = randomRange(world.rand, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 20,
      life: 0,
      ttl: randomRange(world.rand, 0.35, 0.8),
      size: randomRange(world.rand, 1.5, 3.5),
      color,
    });
  }
}

function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 0, ttl: 0.9 });
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Advances the world by `dt` seconds under `control`
 * ({ moveX, moveY, pointerDown, pointerX, pointerY, flare }) and returns the
 * events that happened, oldest first, each { type, kind? }.
 */
export function stepWorld(world, dt, control) {
  const events = [];
  world.time += dt;
  const playing = world.mode === MODE_PLAYING;

  stepPlayer(world, dt, control, playing);
  stepWisps(world, dt);
  if (playing) stepRun(world, dt, control, events);
  stepMoths(world, dt, events);
  stepEffects(world, dt);
  return events;
}

function stepPlayer(world, dt, control, playing) {
  const player = world.player;
  let dx = control.moveX;
  let dy = control.moveY;
  if (control.pointerDown) {
    const px = control.pointerX - player.x;
    const py = control.pointerY - player.y;
    if (Math.hypot(px, py) > 8) {
      dx = px;
      dy = py;
    }
  }
  const length = Math.hypot(dx, dy);
  if (length > 0.01) {
    const speed = playing ? PLAYER.speed : PLAYER.speed * 0.4;
    player.x += (dx / length) * speed * dt;
    player.y += (dy / length) * speed * dt;
    player.walkPhase += dt * 9;
    if (Math.abs(dx) > 0.01) player.faceX = dx > 0 ? 1 : -1;
  }
  player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x));
  player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius + 34, player.y));
}

function stepWisps(world, dt) {
  for (const wisp of world.wisps) {
    wisp.x += wisp.vx * dt + Math.sin(world.time * 1.7 + wisp.phase) * 6 * dt;
    wisp.y += wisp.vy * dt + Math.cos(world.time * 1.3 + wisp.phase) * 5 * dt;
    if (wisp.x < 24 || wisp.x > FIELD.width - 24) wisp.vx *= -1;
    if (wisp.y < 56 || wisp.y > FIELD.height - 24) wisp.vy *= -1;
    wisp.x = Math.min(FIELD.width - 20, Math.max(20, wisp.x));
    wisp.y = Math.min(FIELD.height - 20, Math.max(52, wisp.y));
  }
  if (world.wisps.length < WISP.targetCount && world.time >= world.wispSpawnAt) {
    spawnWisp(world);
    world.wispSpawnAt = world.time + 0.7;
  }
}

function stepRun(world, dt, control, events) {
  world.elapsed += dt;

  // The lantern always burns down; wisps are the only way back.
  world.light -= lightDrainPerSecond(world) * dt;
  if (world.light <= LIGHT.lowWarning && world.time >= world.heartbeatAt) {
    world.heartbeatAt = world.time + 1.1;
    events.push({ type: EVENT_HEARTBEAT });
  }

  // A flare: burn light to scatter every moth in reach. A real trade — the
  // light spent is light the keeper may need before the next wisp.
  if (control.flare && world.time >= world.flareReadyAt && world.light > LIGHT.flareCost + 4) {
    world.light -= LIGHT.flareCost;
    world.flareReadyAt = world.time + LIGHT.flareCooldownSeconds;
    world.flarePulseAt = world.time;
    world.flaresUsed += 1;
    events.push({ type: EVENT_FLARE });
    for (const moth of world.moths) {
      if (moth.active && distance(moth.x, moth.y, world.player.x, world.player.y) <= LIGHT.flareRadius) {
        moth.active = false;
        world.mothsScattered += 1;
        world.score += MOTH.flareScore;
        burst(world, moth.x, moth.y, '#c9a7ff', 10, 130);
        floater(world, moth.x, moth.y - 14, `+${MOTH.flareScore}`, '#c9a7ff');
      }
    }
    world.moths = world.moths.filter((moth) => moth.active);
  }

  collectWisps(world, events);
  if (world.mode !== MODE_PLAYING) return; // a beacon may have ended the run

  if (world.light <= 0) {
    world.light = 0;
    endRun(world, MODE_LOST, 'light', events);
  }
}

function collectWisps(world, events) {
  const player = world.player;
  for (const wisp of world.wisps) {
    if (!wisp.active) continue;
    if (distance(wisp.x, wisp.y, player.x, player.y) > wisp.radius + PLAYER.radius + 4) continue;
    wisp.active = false;
    world.gathered += 1;
    events.push({ type: EVENT_COLLECT, kind: wisp.kind });
    if (wisp.kind === KIND_GOLD) {
      world.score += WISP.goldScore;
      world.light = Math.min(LIGHT.max, world.light + LIGHT.wispGain);
      world.wispsBanked += 1;
      burst(world, wisp.x, wisp.y, '#ffd76a', 8, 90);
      floater(world, wisp.x, wisp.y - 12, `+${WISP.goldScore}`, '#ffd76a');
      if (world.wispsBanked >= BEACONS.wispsPerBeacon) lightBeacon(world, events);
    } else if (wisp.kind === KIND_FROST) {
      world.score += WISP.frostScore;
      world.light = Math.min(LIGHT.max, world.light + LIGHT.frostGain);
      world.freezeUntil = world.time + WISP.frostFreezeSeconds;
      burst(world, wisp.x, wisp.y, '#8fd8ff', 10, 100);
      floater(world, wisp.x, wisp.y - 12, 'moths frozen', '#8fd8ff');
    } else {
      world.score += WISP.heartScore;
      world.light = Math.min(LIGHT.max, world.light + LIGHT.heartGain);
      if (world.hearts < HEARTS.max) {
        world.hearts += 1;
        floater(world, wisp.x, wisp.y - 12, '+1 heart', '#ff8fa3');
      } else {
        floater(world, wisp.x, wisp.y - 12, `+${WISP.heartScore}`, '#ff8fa3');
      }
      burst(world, wisp.x, wisp.y, '#ff8fa3', 10, 100);
    }
  }
  world.wisps = world.wisps.filter((wisp) => wisp.active);
}

function lightBeacon(world, events) {
  world.wispsBanked = 0;
  world.beaconsLit += 1;
  world.score += BEACONS.scoreBonus;
  world.light = Math.min(LIGHT.max, world.light + BEACONS.lightBonus);
  events.push({ type: EVENT_BEACON });
  floater(world, world.player.x, world.player.y - 34, `beacon lit! +${BEACONS.scoreBonus}`, '#ffe9a8');
  burst(world, world.player.x, world.player.y, '#ffe9a8', 22, 170);
  if (world.beaconsLit >= BEACONS.count) endRun(world, MODE_WON, null, events);
}

function stepMoths(world, dt, events) {
  const playing = world.mode === MODE_PLAYING;
  if (playing && world.moths.length < mothTargetCount(world) && world.time >= world.mothSpawnAt) {
    spawnMoth(world);
    world.mothSpawnAt = world.time + randomRange(world.rand, 2.2, 4.2);
  }
  const frozen = world.time < world.freezeUntil;
  const speed = mothSpeed(world) * (playing ? 1 : 0.35);
  for (const moth of world.moths) {
    if (!frozen) {
      const angle = Math.atan2(world.player.y - moth.y, world.player.x - moth.x)
        + Math.sin(world.time * 2 + moth.phase) * 0.35 * MOTH_WOBBLE * 0.14;
      moth.x += Math.cos(angle) * speed * dt;
      moth.y += Math.sin(angle) * speed * dt;
    }
    if (!playing || world.mode !== MODE_PLAYING) continue;
    const hitRange = moth.radius + PLAYER.radius - 2;
    if (world.time >= world.player.invulnerableUntil
      && distance(moth.x, moth.y, world.player.x, world.player.y) <= hitRange) {
      moth.active = false;
      world.hearts -= 1;
      world.player.invulnerableUntil = world.time + PLAYER.invulnerableSeconds;
      world.shake = 0.35;
      burst(world, world.player.x, world.player.y, '#ff6b6b', 14, 150);
      events.push({ type: EVENT_HIT });
      if (world.hearts <= 0) endRun(world, MODE_LOST, 'hearts', events);
    }
  }
  world.moths = world.moths.filter((moth) => moth.active);
}

function stepEffects(world, dt) {
  world.shake = Math.max(0, world.shake - dt);
  for (const particle of world.particles) {
    particle.life += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 60 * dt;
  }
  world.particles = world.particles.filter((p) => p.life < p.ttl);
  for (const item of world.floaters) {
    item.life += dt;
    item.y -= 26 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.life < f.ttl);
}

function endRun(world, mode, reason, events) {
  world.mode = mode;
  world.loseReason = reason;
  events.push({ type: mode === MODE_WON ? EVENT_WIN : EVENT_LOSE });
}
