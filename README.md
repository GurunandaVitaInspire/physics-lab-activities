# Smart Science Lab — 3D Virtual Laboratory (Class X)

A realistic, interactive 3D lab for **Class X Physical Science (NCERT)** — 22 textbook activities across 8 lessons,
rebuilt so students actually *do* each experiment: pour acids, light burners, slide candles along an optical bench,
close circuits and read analog meters.

Built for ZPHS, Gurajanapalli. Runs entirely in the browser; all apparatus, textures and sounds are generated in code,
so there are no image or audio files to download.

## Lessons and activities

| Lesson | Activities |
|---|---|
| 1 · Chemical Reactions and Equations | Zinc + dilute HCl (1.3) · Lead nitrate + KI (1.2) · Heating lead nitrate (1.6) |
| 2 · Acids, Bases and Salts | Water of crystallisation in copper sulphate (2.15) |
| 3 · Metals and Non-metals | Rusting of iron (3.14) · Iron nail in copper sulphate (3.12) |
| 4 · Carbon and its Compounds | Soap micelles (4.12) · Oxidation of ethanol (4.6) · Esterification (4.7) · Ethanoic acid + carbonates (4.8) |
| 9 · Light – Reflection and Refraction | Concave mirror images (9.2) · Convex lens images (9.8) · Glass slab (9.7) |
| 10 · The Human Eye and the Colourful World | Prism deviation (10.1) · Dispersion (10.2) · Eye defects · Scattering (10.3) |
| 11 · Electricity | Ohm’s law (11.1) · Factors affecting resistance (11.2) · Series and parallel (11.3–11.4) |
| 12 · Magnetic Effects of Electric Current | Field around a current-carrying wire (12.1–12.4) · Force on a conductor (12.7) |

## How a lab works

1. **Cinematic intro** — the camera flies onto the bench while the aim and safety note appear.
2. **Guided steps** — an instruction banner tells the student what to do; the apparatus to use glows. Students drag,
   tap or slide real apparatus; nothing advances on a "Next" button alone.
3. **Predict → observe** — before key moments students predict what will happen, then see it.
4. **Lab record** — a notebook panel fills in the procedure checklist, observations, readings tables and graphs.
5. **Result + challenge** — balanced equation / formula, conclusion, and a 3-question challenge worth up to 3 stars
   (progress is saved in the browser).

Voice narration (browser speech), synthesised sound effects, reset and camera controls are in the top bar.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy to Netlify, GitHub Pages, any static host)
```

## Deploy on Vercel

The site is fully static (all 3D runs in the student's browser), so Vercel serves it from its CDN with no server code.

1. In Vercel: **Add New → Project → Import** this GitHub repository.
2. Vercel detects **Vite** automatically (`vercel.json` pins it): build `npm run build`, output `dist`. Click **Deploy**.
3. Every push to `main` redeploys; pull requests get preview URLs.

Performance built in: the first screen loads ~15 KB (gzipped) and paints immediately; three.js (~135 KB gz) loads in the
background, each lab adds ~5 KB, hashed assets are cached for a year (`vercel.json`), and a service worker keeps opened
labs working offline. Rendering adapts its resolution on slow school devices.

## Project layout

```
src/
  main.js, styles.css         app shell + hash router (#/, #/lesson/<slug>, #/lab/<id>)
  data/lessons.js             curriculum: lessons, activities, aims, materials, safety
  pages/                      home (with live 3D hero), lesson list, experiment page
  engine/
    Lab.js                    renderer, lab room, camera, drag/tap/slide interactions, test driver
    ui.js                     instruction banner, lab record, readouts, predictions, finish + quiz
    materials.js, textures.js PBR glass/liquids/metals, procedural textures (labels, scales, meter dials)
    effects.js                flames, bubbles, fumes, precipitates, pour streams, light rays
    audio.js                  synthesised SFX + speech narration
    apparatus/                glassware, burners, stands, optics bench, circuits, magnets …
  experiments/<id>.js         one script per activity
docs/EXPERIMENT_GUIDE.md      how to write a new experiment, quality bar, QA procedure
```

## QA mode (developers)

Open `http://localhost:5173/?test&auto#/lab/<id>`: `?test` drives a virtual clock (`window.__labTest.advance(sec)`),
`?auto` plays the student’s part, and `window.__labTest.shot(name)` saves the 3D view to `.qa/<name>.png`.
See `docs/EXPERIMENT_GUIDE.md`.

## Tech

Vite · Three.js (r170) · GSAP. Physically based rendering with ACES tone mapping, bloom for flames and light rays,
outline highlighting for interactive apparatus, adaptive resolution for low-end school devices.
