// Staged scenes for the screenshots, behind ?shot=start|play|action|end.
// One job: play the real game forward from a fresh, seeded world with a
// simple autopilot — chase the nearest golden wisp, keep clear of moths —
// so each screenshot is a frame a real short game produces, and the same
// seed always produces the same frame. Nothing here draws or fakes a scene.

import { FIELD, LIGHT, STEP } from './config.js';
import {
  createWorld, startRun, stepWorld,
  KIND_GOLD, MODE_AMBIENT, MODE_LOST, MODE_PLAYING,
} from './world.js';
import { createRandom } from './random.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const NO_CONTROL = { moveX: 0, moveY: 0, pointerDown: false, pointerX: 0, pointerY: 0, flare: false };

/** Picks the autopilot's move for this step: toward the best wisp, away from moths. */
function autopilotControl(world, { cowardly = true } = {}) {
  const player = world.player;
  let target = null;
  let targetDistance = Infinity;
  for (const wisp of world.wisps) {
    const d = Math.hypot(wisp.x - player.x, wisp.y - player.y) - (wisp.kind === KIND_GOLD ? 60 : 0);
    if (d < targetDistance) {
      targetDistance = d;
      target = wisp;
    }
  }
  let dx = target === null ? 0 : target.x - player.x;
  let dy = target === null ? 0 : target.y - player.y;
  if (cowardly) {
    for (const moth of world.moths) {
      const mx = player.x - moth.x;
      const my = player.y - moth.y;
      const d = Math.hypot(mx, my);
      if (d < 120 && d > 0.01) {
        const weight = (120 - d) * 2.4;
        dx += (mx / d) * weight;
        dy += (my / d) * weight;
      }
    }
  }
  return { ...NO_CONTROL, moveX: dx, moveY: dy };
}

function simulate(world, seconds, controlFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(world, STEP, controlFor(world, i));
    if (world.mode === MODE_LOST) break;
  }
}

/**
 * Builds the world and screen for a shot name. Returns { world, screen } —
 * main.js paints it and flags the frame ready.
 */
export function stageShot(name, seed) {
  const world = createWorld(createRandom(seed));

  if (name === 'play' || name === 'action') {
    startRun(world);
    simulate(world, name === 'play' ? 30 : 15, (w) => autopilotControl(w));
    if (name === 'action' && world.mode === MODE_PLAYING) {
      // Sail at the nearest moth and flare as it closes in: the burst, caught
      // mid-ring, with the score floater still rising.
      for (let i = 0; i < Math.round(4 / STEP); i += 1) {
        const moth = world.moths[0];
        if (moth === undefined) break;
        const d = Math.hypot(moth.x - world.player.x, moth.y - world.player.y);
        const control = { ...NO_CONTROL, moveX: moth.x - world.player.x, moveY: moth.y - world.player.y };
        if (d < LIGHT.flareRadius - 26) {
          stepWorld(world, STEP, { ...control, flare: true });
          break;
        }
        stepWorld(world, STEP, control);
      }
      simulate(world, 0.16, () => NO_CONTROL);
    }
    return { world, screen: SCREEN_PLAY };
  }

  if (name === 'end') {
    startRun(world);
    // Play honestly for a while, then stop gathering: the lantern starves,
    // the run ends, and the results panel is the game's own.
    simulate(world, 14, (w) => autopilotControl(w));
    simulate(world, 240, () => NO_CONTROL);
    return { world, screen: SCREEN_OVER };
  }

  // 'start' (and anything unrecognised): the title over the drifting reef.
  simulate(world, 5, (w) => ({
    ...NO_CONTROL,
    moveX: Math.sin(w.time * 0.4) * 0.5,
    moveY: Math.cos(w.time * 0.3) * 0.35,
  }));
  world.mode = MODE_AMBIENT;
  // Keep the staged title inside the field the renderer expects.
  world.player.x = Math.min(FIELD.width - 40, Math.max(40, world.player.x));
  return { world, screen: SCREEN_TITLE };
}
