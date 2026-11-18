# Wispkeeper: Lanterns of the Hollow Tide

An original 2D canvas game for make.fun's best-game-01 bounty.

The reef's five sky lanterns have gone dark and the gloom moths are coming for
the last light — yours. Drift as the lantern keeper, gather golden wisps to
relight all five beacons before your lantern burns out, freeze the moths with
frost wisps, mend hearts with heart wisps, and spend light on flares to
scatter the moths closing in. Light all five beacons to win; run out of light
or hearts and the tide wins.

- **Controls:** arrow keys / WASD, or hold the mouse to drift. Space flares,
  P pauses, M toggles sound, R restarts from the end screen.
- **Tech:** plain static files under `game/` (ES modules, canvas 2D,
  synthesized WebAudio sound), no build step and no network requests.
  `node serve.ts` serves it locally; `MAKEFUN_OUTPUT_DIR=out node main.ts`
  writes the entry output and its `dossier.json`.
