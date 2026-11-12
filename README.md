# GhostRun Arcade

**Retro games rebuilt as browser games.** The playable showcase for [GhostRun](https://github.com/kdcyberdude/ghostrun), a Hermes Agent plugin that learns a game, trains a player, and supplies a black-box reference to a separate builder.

**[Watch the film](https://kdcyberdude.github.io/ghostrun-arcade/film/)** · **[Play in your browser](https://kdcyberdude.github.io/ghostrun-arcade/)** · [Plugin](https://github.com/kdcyberdude/ghostrun) · [Training lab](https://github.com/kdcyberdude/ghostrun-lab) · [How the pipeline works](https://github.com/kdcyberdude/ghostrun/blob/main/docs/ARCHITECTURE.md)

![Recovered 3D presentation with shared gameplay](games/smb/docs/images/playing-3d.png)

## Games

| Game | Folder | URL | Views |
|---|---|---|---|
| Super Mario Bros. | [`games/smb/`](games/smb/README.md) | site root | 2D and 3D on one shared simulation |

## Play locally

Use Node.js 20 or newer:

```sh
npm ci
npm run dev        # Super Mario Bros. dev server
npm test           # every game's tests
npm run build      # every game, assembled into dist/
npm run preview
```

## Layout

```text
games/<game>/      one self-contained game: index.html, src/, data/, assets/, tests/, tools/, docs/, package.json
site/              site-wide pages (film/)
tools/build-site.mjs
```

The root is an npm workspace over `games/*`, so games share one `node_modules`. `npm run build` builds each game and assembles one static site. The game named in `package.json` → `arcade.rootGame` (`smb`) is served at the site root, so existing links keep working. Every other game is served at `/<game>/`.

## Adding a game

1. Create `games/<id>/` with its own `package.json` (name `@ghostrun-arcade/<id>`) containing `dev`, `build` and `test` scripts. `build` must write a static site to `games/<id>/dist` using relative asset paths (Vite `base: './'`).
2. Run `npm install` at the root to link the workspace.
3. Add a row to the table above. The deploy workflow needs no change.

This repository is the playable showcase; plugin installation does not download it. Future game recreations can join the same showcase without expanding the Hermes catalog submission.

## Attribution

Each game has its own third-party notice (for example [Super Mario Bros.](games/smb/THIRD_PARTY.md)). These are unofficial research recreations, not products of the original publishers.
