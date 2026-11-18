// Keyboard and mouse input for Wispkeeper. One job: turn raw DOM events into
// a small state the game loop reads — held movement keys, a pointer position
// in field coordinates, and one-shot action presses that fire once per tap.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_FLARE = 'flare';
export const ACTION_MUTE = 'mute';

const KEY_TO_ACTION = {
  Enter: ACTION_CONFIRM,
  NumpadEnter: ACTION_CONFIRM,
  Space: ACTION_FLARE,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

const MOVE_KEYS = {
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
};

/**
 * Creates input bound to `canvas`. `toField(clientX, clientY)` converts a
 * pointer position into field coordinates (the renderer's transform).
 */
export function createInput(canvas, toField) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS[event.code] !== undefined || KEY_TO_ACTION[event.code] !== undefined) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    const action = KEY_TO_ACTION[event.code];
    if (action !== undefined) pressed.add(action);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    pointer.down = false;
  });

  function trackPointer(event) {
    const point = toField(event.clientX, event.clientY);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.seen = true;
  }
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    pointer.down = true;
    clicked = true;
    pressed.add(ACTION_CONFIRM);
    canvas.setPointerCapture?.(event.pointerId);
  });
  window.addEventListener('pointerup', () => {
    pointer.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    pointer,
    /** The held movement keys as one vector (not normalised; the world does that). */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move !== undefined) {
          x += move.x;
          y += move.y;
        }
      }
      return { x, y };
    },
    /** True once per physical press of `action`, until `endFrame` clears it. */
    wasPressed(action) {
      return pressed.has(action);
    },
    /** True once per mouse click or tap, until `endFrame` clears it. */
    wasClicked() {
      return clicked;
    },
    /** Clears the one-shot presses; call once at the end of every frame. */
    endFrame() {
      pressed.clear();
      clicked = false;
    },
  };
}
