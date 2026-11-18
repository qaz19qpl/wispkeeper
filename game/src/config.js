// Wispkeeper: Lanterns of the Hollow Tide — tuning and shared constants.
// One job: every number the rest of the game agrees on lives here, so the
// world, the renderer and the screenshot staging all play by the same rules.

/** The play field, in world units. The renderer scales it to the window. */
export const FIELD = { width: 960, height: 600 };

/** Fixed simulation step, in seconds: the world advances in these slices. */
export const STEP = 1 / 60;

/** localStorage key for the best score a keeper has ever reached. */
export const BEST_KEY = 'wispkeeper-best-score';

/** The keeper: a hooded figure carrying the last lantern of the reef. */
export const PLAYER = {
  radius: 15,
  speed: 268,
  startX: FIELD.width / 2,
  startY: FIELD.height / 2 + 40,
  invulnerableSeconds: 1.6,
};

/** The lantern's light: the game's clock, fuel and health in one meter. */
export const LIGHT = {
  max: 100,
  start: 80,
  drainBase: 1.5, // per second, before any beacon is lit
  drainPerBeacon: 0.45, // each lit beacon makes the night push back harder
  wispGain: 9, // light a gold wisp gives back
  frostGain: 5,
  heartGain: 6,
  flareCost: 16, // a flare burns this much light to scatter the moths
  flareRadius: 138,
  flareCooldownSeconds: 0.9,
  lowWarning: 26, // below this the edges close in and a heartbeat sounds
};

/** Beacons: light all of them before the light dies and dawn breaks (a win). */
export const BEACONS = {
  count: 5,
  wispsPerBeacon: 6, // gold wisps banked to light one beacon
  scoreBonus: 150,
  lightBonus: 10,
};

/** Wisp kinds and what each is worth. */
export const WISP = {
  radius: 9,
  targetCount: 7, // wisps kept drifting on the field
  goldScore: 25,
  frostScore: 40,
  heartScore: 75,
  frostFreezeSeconds: 4,
};

/** Gloom moths: they hunt the light and cost a heart on contact. */
export const MOTH = {
  radius: 16,
  baseSpeed: 64,
  speedPerBeacon: 15,
  maxCount: 5,
  flareScore: 40,
  spawnEdgeMargin: 30,
};

export const HEARTS = { start: 3, max: 3 };

/** Palette: deep reef night, lantern gold, wisp colours. One coherent night. */
export const COLORS = {
  skyTop: '#070b24',
  skyBottom: '#1c2f57',
  waterTop: '#14264a',
  waterBottom: '#060a1c',
  hillFar: '#101c3d',
  hillNear: '#0a142e',
  moon: '#f4ead0',
  gold: '#ffd76a',
  goldDeep: '#f5a83d',
  frost: '#8fd8ff',
  heart: '#ff8fa3',
  mothBody: '#2a2140',
  mothWing: '#4a3a6e',
  mothEye: '#ff5d5d',
  keeperCloak: '#1f7a6d',
  keeperCloakDark: '#14534b',
  keeperFace: '#ffe9c4',
  text: '#f2ead8',
  textDim: '#b9c2d9',
  danger: '#ff6b6b',
};
