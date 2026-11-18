# wispkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/qaz19qpl/wispkeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/qaz19qpl/wispkeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Wispkeeper: Lanterns of the Hollow Tide** — an original 2D canvas game.

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

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. To build the make.fun
entry output instead: `MAKEFUN_OUTPUT_DIR=out node main.ts` writes the game,
the screenshots and `dossier.json` to `out/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=azy0wp0s&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
