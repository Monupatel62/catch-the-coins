# Catch the Coin

A free browser arcade game: move a basket, catch falling coins, build combos and beat your high score. No download, no account, works on desktop, phone and tablet.

**Play it:** https://catchthecoins.netlify.app/ ([Español](https://catchthecoins.netlify.app/es/))

## How to play

- Move the basket with the arrow keys or **A / D** (up and down with **W / S**). On a phone, tap the screen to move toward that point or use the on-screen D-pad.
- Catch gold coins (+10), silver coins (+5) and rare bonus stars (+25).
- Catch coins in a row to raise the combo multiplier: **×2** at 4, **×3** at 7, **×4** at 10. A miss resets it.
- You start with 5 hearts. Every 10 missed coins costs one heart and the run ends at 50 missed coins.
- There is no time limit: the clock counts up and shows how long you survived.
- Difficulty rises through 3 stages of 20 seconds, then stays at the fastest speed.
- **ESC** or **P** pauses, **M** mutes. The game also pauses by itself when you switch tabs.

Your high score and best time are saved in your browser (local storage) and never sent to a server.

## Built with

- TypeScript and the HTML5 Canvas API, bundled with [Vite](https://vite.dev/). No game framework: the fixed-timestep game loop, scenes, input, collisions, particles and Web Audio sound are all in `src/`.
- Plain static pages for the guides in `public/blog/` and the Spanish page in `public/es/`.
- Hosted on Netlify.

Read how it was built: https://catchthecoins.netlify.app/blog/how-catch-the-coin-was-built.html

## Run it locally

Requires Node.js 22.

```bash
npm ci
npm run dev        # development server
npm run build      # type-check, regenerate sitemap and redirects, build to dist/
npm run preview    # serve the production build
npm run lint
```

## Project layout

```
src/engine/      game loop, scenes, input, renderer, collisions
src/entities/    player (basket) and coins
src/managers/    spawning, difficulty, score, combo, sound, storage
src/ui/          HUD, pause and game-over screens, mobile controls
src/scenes/      menu, play and game-over scenes
public/          static pages (blog, about, Spanish page), sitemap, icons
scripts/         sitemap and redirect generators (run automatically on build)
```
