// Synthesized sound for Wispkeeper: every effect is an oscillator or a shaped
// noise burst from the WebAudio API — no audio files, nothing to download.
// One job: own the AudioContext and expose one small function per game event,
// so the world never touches audio and main.js just plays what events ask for.

/** Creates the sound engine. The context wakes on the first user gesture. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let droneNodes = null;

  function ensureContext() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (AudioCtor === undefined) return null;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    return context;
  }

  /** One soft tone with an exponential decay envelope. */
  function tone({ frequency, endFrequency = null, type = 'sine', duration = 0.18, volume = 0.2, delay = 0 }) {
    const ctx = ensureContext();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** A short filtered noise burst, for flares and moth hits. */
  function noiseBurst({ duration = 0.25, volume = 0.25, delay = 0, sweepTo = 300 }) {
    const ctx = ensureContext();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, start);
    filter.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  return {
    /** Call from any click or keypress so the browser lets sound start. */
    unlock() {
      ensureContext();
    },
    /** A two-note chime, brighter for rarer wisps. */
    collect(kind) {
      if (kind === 'heart') {
        tone({ frequency: 660, type: 'triangle', duration: 0.22, volume: 0.22 });
        tone({ frequency: 880, type: 'triangle', duration: 0.3, volume: 0.2, delay: 0.07 });
        tone({ frequency: 1320, type: 'sine', duration: 0.34, volume: 0.14, delay: 0.14 });
      } else if (kind === 'frost') {
        tone({ frequency: 1180, type: 'sine', duration: 0.2, volume: 0.16 });
        tone({ frequency: 1560, type: 'sine', duration: 0.26, volume: 0.12, delay: 0.05 });
      } else {
        tone({ frequency: 880, type: 'sine', duration: 0.16, volume: 0.18 });
        tone({ frequency: 1174, type: 'sine', duration: 0.22, volume: 0.13, delay: 0.05 });
      }
    },
    /** A beacon lights: a small warm chord, low to high. */
    beacon() {
      tone({ frequency: 392, type: 'triangle', duration: 0.5, volume: 0.2 });
      tone({ frequency: 523, type: 'triangle', duration: 0.5, volume: 0.18, delay: 0.08 });
      tone({ frequency: 659, type: 'triangle', duration: 0.6, volume: 0.16, delay: 0.16 });
      tone({ frequency: 784, type: 'sine', duration: 0.7, volume: 0.12, delay: 0.24 });
    },
    /** A moth reaches the keeper: a dull thud and a falling note. */
    hit() {
      noiseBurst({ duration: 0.2, volume: 0.3, sweepTo: 160 });
      tone({ frequency: 220, endFrequency: 70, type: 'sawtooth', duration: 0.3, volume: 0.16 });
    },
    /** The flare: a bright whoosh outward. */
    flare() {
      noiseBurst({ duration: 0.35, volume: 0.22, sweepTo: 3600 });
      tone({ frequency: 520, endFrequency: 1240, type: 'sine', duration: 0.3, volume: 0.1 });
    },
    /** The low-light heartbeat warning: two soft low pulses. */
    heartbeat() {
      tone({ frequency: 82, type: 'sine', duration: 0.14, volume: 0.3 });
      tone({ frequency: 74, type: 'sine', duration: 0.16, volume: 0.24, delay: 0.18 });
    },
    /** Dawn breaks: the win jingle, a rising run into a held chord. */
    win() {
      const notes = [523, 659, 784, 1046, 784, 1046, 1318];
      notes.forEach((frequency, i) => tone({ frequency, type: 'triangle', duration: 0.4, volume: 0.18, delay: i * 0.11 }));
    },
    /** The light goes out: the lose jingle, sinking. */
    lose() {
      const notes = [392, 330, 262, 196];
      notes.forEach((frequency, i) => tone({ frequency, type: 'triangle', duration: 0.45, volume: 0.18, delay: i * 0.16 }));
    },
    click() {
      tone({ frequency: 700, type: 'square', duration: 0.06, volume: 0.06 });
    },
    /** A barely-there night drone under play; start once, stop on the end screen. */
    startDrone() {
      const ctx = ensureContext();
      if (ctx === null || droneNodes !== null) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.2);
      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 110;
      const oscB = ctx.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = 164.8;
      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(master);
      oscA.start();
      oscB.start();
      droneNodes = { gain, oscA, oscB };
    },
    stopDrone() {
      if (droneNodes === null || context === null) return;
      const { gain, oscA, oscB } = droneNodes;
      gain.gain.linearRampToValueAtTime(0.0, context.currentTime + 0.4);
      oscA.stop(context.currentTime + 0.5);
      oscB.stop(context.currentTime + 0.5);
      droneNodes = null;
    },
    toggleMute() {
      muted = !muted;
      if (master !== null && context !== null) master.gain.setValueAtTime(muted ? 0 : 0.5, context.currentTime);
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
