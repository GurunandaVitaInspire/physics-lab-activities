# Writing an experiment

Every lab activity is one file: `src/experiments/<id>.js`, where `<id>` matches an entry in
`src/data/lessons.js` (that file holds the title, aim, materials and safety note shown in the UI).
The page loader picks the file up automatically (`import.meta.glob`).

Read these two finished experiments first — they are the reference for quality and style:

- `src/experiments/zinc-hcl.js` — chemistry: drag/tap apparatus, pouring, bubbles, temperature, pop test.
- `src/experiments/concave-mirror.js` — physics: sliding apparatus on a bench, live computed image, ray toggle, data table.

## Module shape

```js
import * as THREE from 'three';
import { testTube, reagentBottle, pour } from '../engine/apparatus/common.js';

export const config = { camera: { pos: [0, 0.33, 0.52], target: [0, 0.06, 0.02] } }; // home view (metres)
export const steps = ['Short label for step 1', 'Step 2', ...];                     // shown in the lab record

export default async function run({ lab, ui, meta }) {
  // 1. build the bench (lab.add, lab.pickable, lab.tag)
  // 2. await ui.ready();            <- plays the cinematic intro, waits for "Start"
  // 3. steps: ui.step(i, html) -> await interactions -> animate -> ui.observe(html)
  // 4. await ui.finish({ equation, conclusion, quiz: [3 questions] });
}
```

Units are **metres**, the bench top is **y = 0**, the student looks from **+z**. Typical apparatus spans
x ∈ [-0.3, 0.3], z ∈ [-0.1, 0.18]. Every apparatus factory returns a `THREE.Group` whose origin is its base.

## Lab API (`src/engine/Lab.js`)

| Call | What it does |
|---|---|
| `lab.add(obj, [x,y,z])` | add to the scene; anything with `update(dt,t,camera)` is ticked every frame |
| `lab.track(obj)` | register effects added later as children (so they get updated) |
| `lab.remove(obj)` | remove |
| `lab.pickable(obj, 'Tooltip')` / `lab.unpickable(obj)` | hover tooltip + clickable |
| `lab.tag(obj, html, {offset, cls})` / `lab.untag(tag)` | floating HTML label (cls: `big`, `dark`, `mono`, `warn`) |
| `await lab.waitClick(obj \| [objs])` | glowing outline hint, resolves with the clicked object |
| `await lab.waitDrop(item, target, {radius})` | student drags item onto target **or taps it**; then *you* animate the placement |
| `lab.slider(obj, {axis:'x', min, max, step, label})` | let the student drag an object along an axis (returns a stop fn) |
| `await lab.waitUntil(() => cond, { auto })` | wait for any condition; **`auto` must simulate the student** (used by QA) |
| `await lab.carry(obj, [x,y,z], {lift, duration, rotate})` | lift-move-lower arc |
| `await lab.tween(target, gsapVars)` / `lab.timeline()` + `await lab.play(tl)` | GSAP, auto-killed on reset |
| `await lab.wait(sec)` | **always use this, never setTimeout/setInterval** (lab clock; QA fast-forwards it) |
| `lab.onUpdate((dt, t) => …)` | per-frame callback, returns an unsubscribe fn |
| `await lab.focus({pos, target}, sec)` / `lab.focusOn(obj, {dist, height})` / `lab.home()` | camera moves |
| `lab.dimLights(0.22)` / `lab.dimLights(1)` | darken the room (optics) / restore |
| `lab.sfx(name)` | `click drop glass pour fizz pop strike whoosh hiss switch success step wrong tick hum` |
| `lab.drag` | truthy while the student is dragging (don't advance mid-drag) |

## UI API (`src/engine/ui.js`)

| Call | What it does |
|---|---|
| `await ui.ready()` | intro + Start button. Call once, **after** building the bench |
| `ui.step(i, html, {sub})` | start step i (ticks earlier ones, updates banner, narrates) |
| `ui.instruct(html, {sub})` | change banner text within a step |
| `ui.observe(html, {icon, highlight})` | add to "What I observed" (use `highlight:true` for the key result) |
| `ui.toast(text, 'info'|'warn'|'good')` | transient message (`warn` counts as a mistake) |
| `ui.readout(key, label, value, {unit, color})` / `ui.clearReadout(key)` | live meter box, top-right |
| `ui.control({type:'slider'|'button'|'toggle'|'segmented', ...})` / `ui.clearControls()` | dock under the 3D view |
| `await ui.waitButton(label)` | button in the dock, resolves on press (auto-pressed in QA) |
| `ui.table(headers)` → `.addRow(cells)` | readings table in the lab record |
| `ui.graph({xLabel, yLabel, xMax, yMax})` → `.add(x, y)` | plotted points + best-fit line through origin |
| `await ui.predict({q, options, answer, explain})` | predict-before-you-see question (≥1 per experiment) |
| `await ui.finish({equation, conclusion, quiz})` | result card, then 3-question challenge with stars |

## Apparatus & effects

- `src/engine/apparatus/common.js` — `Vessel` (any glass container with live liquid: `setLevel`, `fill(h, sec)`,
  `setLiquidColor(c, {cloudy})`, `tintTo(c, sec, {cloudy})`, `addBubbles`, `addPrecipitate`, `addFumes`, `mouthWorld()`),
  `testTube`, `boilingTube`, `beaker`, `conicalFlask`, `measuringCylinder`, `chinaDish`, `watchGlass`, `petriDish`,
  `glassRod`, `dropper`, `delivery({points})`, `cork`, `testTubeStand` (`.slots`), `retortStand` (`.clamp`, `.clampPoint`),
  `tripod` (`.topY`), `bunsenBurner` (`.flame.on`), `spiritLamp`, `reagentBottle({title, formula, sub, color, labelColor, hazard, solid, amber})`,
  `thermometer` (`setTemp`, `tweenTemp`), `splinter` (`.flame`, `.charred`), `matchbox`, `tongs`, `testTubeHolder`,
  `granules`, `powderHeap`, `spatula`, `paperStrip` (`setColor`), and `pour(lab, bottle, vessel, {amount, duration, side, onFlowing})`.
- `src/engine/apparatus/optics.js` — `opticalBench` (`xAt(cm)`, `cmAt(x)`, `topY`), `saddle`, `candle`, `sphericalMirror`, `thinLens`, `paperScreen` (`showImage`).
- `src/engine/effects.js` — `Flame`, `Bubbles`, `Fumes` (coloured gas/steam), `Precipitate` (`form()`), `Stream`, `Sparkles` (`emit`), `beam`, `RayBundle` (`draw([{pts, color, intensity, opacity}])`).
- `src/engine/materials.js` — `glass`, `opticalGlass`, `liquid`, `metal`, `chrome`, `brass`, `copper`, `castIron`, `plastic`, `rubber`, `wood`, `paper`, `powder`, `emissive`, `glow`, `mirrorMat`.
- `src/engine/textures.js` — procedural canvas textures (labels, scales, meter faces, live drawing sheets…). No image files.

New apparatus that only your experiments need goes in **your own** file under `src/engine/apparatus/` — do not edit the shared engine files.

## Quality bar

- **Realistic:** real proportions (a test tube is 15 cm × 1.6 cm), PBR materials, real colours of chemicals, real meter scales.
  Numbers must be physically/chemically correct (formulae, readings, colours, sign conventions as in NCERT).
- **Student does the work:** every step needs an action (drag, tap, slide, switch) — never just "Next".
- **Show, then record:** visible change in 3D → `ui.observe()` with the scientific wording a teacher expects.
- **Camera tells the story:** move in close for the key moment, then `lab.home()`. Motion comes from the world/camera, not fades.
- **Engagement:** at least one `ui.predict`, readouts for anything measured, a table or graph when there are readings.
- **Finish:** balanced equation / formula where relevant, 2–3 sentence conclusion, exactly 3 quiz questions with explanations.
- **Safety:** mention real-lab precautions in the instruction `sub` text where relevant.

## QA (required)

Start the dev server (`npm run dev`, port 5173 — it may already be running). Open
`http://localhost:5173/?test&auto#/lab/<id>`:

- `?test` replaces the real-time loop with a virtual clock: `await window.__labTest.advance(seconds)`.
- `?auto` simulates the student: taps every click/drop target, answers predictions, presses dock buttons and calls each `waitUntil`'s `auto()`.
- `await window.__labTest.shot('name')` renders and saves `.qa/name.png` (open it to look at the frame).
- `window.__labState` becomes `{finished:true, obs, quiz}` at the end, or `{error}` if the script threw.

The experiment must reach `finished` with no console errors, and you must look at shots of the key moments.
Run `npx vite build` before finishing to catch import/syntax errors.

## Dev-server notes

- Hot reload is off (`vite.config.js`), because several QA runs often share one server: refresh the page to see changes.
- If a newly created `src/experiments/<id>.js` shows "This lab is being set up" in dev, restart `npm run dev`
  (the dev server can miss new files for `import.meta.glob`; production builds always include them).
- `waitUntil`'s `auto` only runs if the condition is still unmet, so it never undoes what the student already did.

## Audit for misplaced equipment

With the dev server running, open `/?test&auto#/lab/<id>` and run in the console:

```js
const { audit } = await import('/tools/qa-audit.js'); await audit('<id>');
```

The auto-student drops every item on its target like a real drag. The audit reports objects that moved during the lab
and finished intersecting another object or floating in the air, and saves a frame at each key observation
(`.qa/thumb-<id>-<n>.png`). Thumbnails for the home reel and lesson pages live in `public/thumbs/<id>.jpg` (640×400).
