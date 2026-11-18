// A tiny seeded random source (mulberry32). One job: make a run reproducible
// from its seed, so a screenshot staged with ?seed=N is the same frame every
// time, while a fresh game still feels different from the last.

/** Returns a function giving the next random number in [0, 1) for `seed`. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max) drawn from `rand`. */
export function randomRange(rand, min, max) {
  return min + rand() * (max - min);
}

/** A random integer in [min, max] (both ends included) drawn from `rand`. */
export function randomInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}
