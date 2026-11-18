// Wispkeeper's shell: boot, the frame loop and the flow between screens.
// One job: read input, advance the world in fixed steps, play the sounds its
// events ask for, hand the state to the renderer, and move between title,
// play, pause and the end screen. The rules live in world.js; the pictures
// in render.js; this file only connects them.
//
// ?seed=N fixes a run's pattern. ?shot=start|play|action|end (with &seed=N)
// stages that scene instead of running the loop, paints it and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  createWorld, startRun, stepWorld,
  EVENT_BEACON, EVENT_COLLECT, EVENT_FLARE, EVENT_HEARTBEAT, EVENT_HIT, EVENT_LOSE, EVENT_WIN,
  MODE_LOST, MODE_PLAYING, MODE_WON,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_FLARE, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas, (x, y) => renderer.toField(x, y));
const audio = createAudio();
const world = createWorld(createRandom(seed));

let screen = SCREEN_TITLE;
let best = readBest();
let lastStatus = '';

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  best = Math.max(best, value);
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function announce(text) {
  if (text === lastStatus) return;
  lastStatus = text;
  status.textContent = text;
}

function beginRun() {
  startRun(world);
  // The Space press that starts a run must not also fire its first flare.
  world.flareReadyAt = world.time + 0.35;
  screen = SCREEN_PLAY;
  audio.unlock();
  audio.click();
  audio.startDrone();
  announce('The run begins. Gather golden wisps and light all five beacons before the lantern dies.');
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === EVENT_COLLECT) audio.collect(event.kind);
    else if (event.type === EVENT_HIT) audio.hit();
    else if (event.type === EVENT_FLARE) audio.flare();
    else if (event.type === EVENT_BEACON) audio.beacon();
    else if (event.type === EVENT_HEARTBEAT) audio.heartbeat();
    else if (event.type === EVENT_WIN) {
      audio.stopDrone();
      audio.win();
    } else if (event.type === EVENT_LOSE) {
      audio.stopDrone();
      audio.lose();
    }
  }
}

function currentControl() {
  const move = input.moveVector();
  return {
    moveX: move.x,
    moveY: move.y,
    pointerDown: input.pointer.down,
    pointerX: input.pointer.x,
    pointerY: input.pointer.y,
    flare: input.wasPressed(ACTION_FLARE),
  };
}

function ambientControl() {
  // On the title and end screens the keeper drifts in a slow figure, so the
  // reef behind the panels is alive but nothing is at stake.
  return {
    moveX: Math.sin(world.time * 0.35) * 0.6,
    moveY: Math.cos(world.time * 0.27) * 0.45,
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    flare: false,
  };
}

function handleActions() {
  if (input.wasPressed(ACTION_MUTE)) {
    audio.unlock();
    announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
  }
  if (screen === SCREEN_TITLE) {
    if (input.wasPressed(ACTION_CONFIRM) || input.wasPressed(ACTION_FLARE)) beginRun();
  } else if (screen === SCREEN_PLAY) {
    if (input.wasPressed(ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      audio.click();
      announce('Paused.');
    }
  } else if (screen === SCREEN_PAUSED) {
    if (input.wasPressed(ACTION_PAUSE) || input.wasPressed(ACTION_CONFIRM)) {
      screen = SCREEN_PLAY;
      audio.click();
      announce('The run resumes.');
    }
  } else if (screen === SCREEN_OVER) {
    if (input.wasPressed(ACTION_RESTART) || input.wasPressed(ACTION_CONFIRM)) beginRun();
  }
}

let previous = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(MAX_FRAME, (now - previous) / 1000);
  previous = now;
  accumulator += elapsed;

  handleActions();
  while (accumulator >= STEP) {
    if (screen === SCREEN_PLAY) {
      playEvents(stepWorld(world, STEP, currentControl()));
      if (world.mode === MODE_WON || world.mode === MODE_LOST) {
        saveBest(world.score);
        screen = SCREEN_OVER;
        announce(world.mode === MODE_WON
          ? `Dawn breaks. Final score ${world.score}.`
          : `The light goes out. Final score ${world.score}.`);
      }
    } else if (screen !== SCREEN_PAUSED) {
      stepWorld(world, STEP, ambientControl());
    } else {
      world.time += STEP; // panels still shimmer while the run is held
    }
    accumulator -= STEP;
  }
  if (screen === SCREEN_PLAY) {
    announce(`Score ${world.score}. Light ${Math.ceil(world.light)}. Hearts ${world.hearts}. Beacons lit ${world.beaconsLit} of 5.`);
  }
  renderer.render(world, screen, { best, muted: audio.isMuted() });
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shot !== null) {
  const staged = stageShot(shot, seed);
  Object.assign(world, staged.world);
  screen = staged.screen;
  renderer.render(world, screen, { best, muted: false });
  requestAnimationFrame(() => {
    renderer.render(world, screen, { best, muted: false });
    window.__shotReady = true;
  });
} else {
  requestAnimationFrame(frame);
}
