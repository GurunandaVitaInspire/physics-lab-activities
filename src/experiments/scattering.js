// Activity 10.3 — Scattering of light: "sunset in a beaker".
// Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + SO₂ + S↓ + H₂O : very fine colloidal sulphur forms over a few minutes.
// Small particles scatter light with strength ∝ 1/λ⁴ (Rayleigh), so the side-scattered light is blue and the light
// transmitted straight through loses blue first: T(λ) = exp(−τ·(550/λ)⁴) — white → yellow → orange → red.
import * as THREE from 'three';
import { saddle, thinLens } from '../engine/apparatus/optics.js';
import { reagentBottle, glassRod } from '../engine/apparatus/common.js';
import { lightBox, slitCard, glassTank, liveScreen, BeamGlow, spectrumSamples, mixSpectrum, freeCam } from '../engine/apparatus/optics2.js';

export const config = { camera: { pos: [0.06, 0.5, 1.12], target: [0.06, 0.06, 0.0] }, benchWidth: 2.0 };

export const steps = [
  'Switch on the lamp and focus the hole on the screen',
  'Dissolve sodium thiosulphate in the water',
  'Your teacher adds a few drops of conc. sulphuric acid',
  'Watch the beam for 3 minutes (time-lapse)',
  'Look at the tank from the side',
  'Look at the light reaching the screen',
];

const BY = 0.07;                 // beam height
const TANK_X = -0.17, TANK = { L: 0.2, W: 0.1, H: 0.12 };
const HOLE_X = -0.02, L2_X = 0.13, F2 = 10; // lens L2, f = 10 cm, hole 15 cm away ⇒ image 30 cm behind L2
const V2 = 1 / (1 / F2 - 1 / ((L2_X - HOLE_X) * 100)); // cm
const SAMPLES = spectrumSamples(40);
const tauAt = (t) => Math.max(0, 4 / (1 + Math.exp(-(t - 90) / 25)) - 4 / (1 + Math.exp(90 / 25)));  // optical depth at 550 nm across the tank
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function transmitted(tau) { return mixSpectrum((l) => Math.exp(-tau * (550 / l) ** 4), SAMPLES); }
function scattered(tau, s) { return mixSpectrum((l) => (550 / l) ** 4 * Math.exp(-tau * s * (550 / l) ** 4), SAMPLES); }
const hueOf = (c) => { const m = Math.max(c.r, c.g, c.b, 1e-6); return [c.r / m, c.g / m, c.b / m]; };
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function colourName(c) {
  const [r, g, b] = hueOf(c);
  if (b > 0.8 && g > 0.85) return 'White';
  if (b > 0.45) return 'Pale yellow';
  if (g > 0.62) return 'Yellow-orange';
  if (g > 0.4) return 'Orange';
  if (g > 0.3) return 'Orange-red';
  return 'Red';
}
function sideName(tau) { if (tau < 0.15) return 'Hardly visible'; const [r, , b] = hueOf(scattered(tau, 0.05)); return b > 0.95 && r < 0.75 ? 'Blue' : b > 0.9 ? 'Bluish white' : 'Whitish'; }

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const lamp = lab.add(lightBox({ beamY: BY }), [-0.53, 0, 0]);
  lab.pickable(lamp, 'Lamp (white light source)');
  const l1Sad = lab.add(saddle({ height: BY }), [-0.39, 0, 0]);
  const L1 = thinLens({ r: 0.03, kind: 'convex' }); l1Sad.mount.add(L1);
  const tank = lab.add(glassTank(TANK), [TANK_X, 0, 0]);
  tank.setLevel(0.1);
  lab.pickable(tank, 'Glass tank with 2 L of water');
  const card = lab.add(slitCard({ beamY: BY, hole: 0.006, w: 0.1, h: 0.1 }), [HOLE_X, 0, 0]);
  const l2Sad = lab.add(saddle({ height: BY }), [L2_X, 0, 0]);
  const L2 = thinLens({ r: 0.03, kind: 'convex' }); l2Sad.mount.add(L2);
  [L1, L2].forEach((L) => { if (L.lens.material.isMeshPhysicalMaterial) L.lens.material.thickness = 0.008; });
  lab.tag(L1, 'L₁', { offset: [0, 0.045, 0], cls: 'mono' }); lab.tag(L2, 'L₂', { offset: [0, 0.045, 0], cls: 'mono' });
  const sSad = lab.add(saddle({ height: BY - 0.05 - 0.004 }), [0.62, 0, 0]);
  const screen = liveScreen({ w: 0.12, h: 0.1 }); screen.position.y = 0.054; sSad.mount.add(screen); sSad.rotation.y = -Math.PI / 2;
  lab.pickable(sSad, 'Screen — drag along the bench');

  const hypo = lab.add(reagentBottle({ title: 'Sodium thiosulphate', formula: 'Na₂S₂O₃', sub: '(hypo) 200 g', color: 0xf3f2ea, solid: true, level: 0.05, kind: 'wide', labelColor: '#0f766e' }), [-0.12, 0, -0.16]);
  lab.pickable(hypo, 'Sodium thiosulphate (hypo) crystals');
  const acid = lab.add(reagentBottle({ title: 'Sulphuric acid', formula: 'H₂SO₄', sub: 'concentrated', color: 0xf8fafc, hazard: true, kind: 'dropper', labelColor: '#b91c1c', level: 0.05 }), [0.0, 0, -0.16]);
  lab.pickable(acid, 'Conc. sulphuric acid (teacher only)');
  const rod = lab.add(glassRod({ len: 0.2 }), [-0.17, 0.003, 0.13]); rod.rotation.z = Math.PI / 2; rod.rotation.y = 0.3;
  lab.pickable(rod, 'Glass rod');

  // light: air beam (faint), beam inside the tank (scattered light), beam to the hole
  const airBeam = new BeamGlow({ radius: 0.01, intensity: 0 }); lab.scene.add(airBeam); airBeam.setGradient([[1, 0.97, 0.9], [1, 0.97, 0.9]]);
  const tankBeam = new BeamGlow({ radius: 0.0098, intensity: 0 }); lab.scene.add(tankBeam);
  const outBeam = new BeamGlow({ radius: 0.006, intensity: 0 }); lab.scene.add(outBeam);
  const xIn = TANK_X - TANK.L / 2 + 0.003, xOut = TANK_X + TANK.L / 2 - 0.003;
  airBeam.between(new THREE.Vector3(-0.385, BY, 0), new THREE.Vector3(xIn - 0.003, BY, 0));
  tankBeam.between(new THREE.Vector3(xIn, BY, 0), new THREE.Vector3(xOut, BY, 0));
  outBeam.between(new THREE.Vector3(xOut + 0.003, BY, 0), new THREE.Vector3(HOLE_X, BY, 0));

  /* ------------------------------------------------------------ state */
  const st = { on: false, tau: 0, simT: 0, running: false };
  const screenCm = () => (sSad.position.x - L2_X) * 100;
  const defocus = () => Math.abs(screenCm() - V2);
  const waterTint = new THREE.Color(0xdff1f7), milky = new THREE.Color(0xe9e4cc);
  function update() {
    const on = st.on, tau = st.tau;
    airBeam.intensity = on ? 0.12 : 0;
    // light scattered sideways inside the tank: brightness ∝ particles, colour ∝ λ⁻⁴ × light left at that depth
    const grad = [], I0 = lum(scattered(Math.max(tau, 1e-3), 0)) || 1;
    for (let k = 0; k < 8; k++) { const c = scattered(Math.max(tau, 1e-3), k / 7); const h = hueOf(c); const f = lum(c) / I0; grad.push(h.map((x) => x * Math.min(1, f * 1.1))); }
    tankBeam.setGradient(grad);
    tankBeam.intensity = on ? 0.04 + 1.7 * (1 - Math.exp(-0.9 * tau)) : 0;
    const T = transmitted(tau), th = hueOf(T), tl = clamp01(lum(T));
    outBeam.setGradient([th, th]); outBeam.intensity = on ? 0.1 * (0.3 + tl) : 0;
    tank.liqMat.color.copy(waterTint).lerp(milky, clamp01(tau / 4)); tank.liqMat.opacity = 0.16 + 0.3 * clamp01(tau / 4);
    // image of the hole on the screen
    screen.clear();
    if (on) {
      const coc = (6 * defocus()) / V2 / 100;      // L2 aperture 6 cm
      const r = 0.006 * (V2 / ((L2_X - HOLE_X) * 100)) + coc / 2;
      const b = Math.max(0.1, tl) / (1 + (coc / 0.012) ** 2);
      const col = th.map((x) => Math.round(255 * clamp01(x * Math.min(1, 0.25 + b))));
      screen.disc({ r, color: `rgb(${col[0]},${col[1]},${col[2]})`, alpha: 1, blur: Math.min(18, (coc * screen.px) / 3), soft: 0.08 });
    }
    screen.commit();
    if (on) {
      ui.readout('s', 'Screen from L₂', screenCm().toFixed(1), { unit: 'cm', color: '#38bdf8' });
      ui.readout('c', 'Light on screen', colourName(T), { color: `rgb(${th.map((x) => Math.round(x * 255)).join(',')})` });
    }
    if (st.running || st.simT > 0) ui.readout('t', 'Time after adding acid', `${Math.floor(st.simT / 60)}:${String(Math.floor(st.simT % 60)).padStart(2, '0')}`, { unit: 'min', color: '#a78bfa' });
  }
  lab.onUpdate(update);
  lab.slider(sSad, { axis: 'x', min: 0.3, max: 0.75, step: 0.0025, label: 'Screen — drag along the bench' });
  const busy = () => !!lab.drag || sSad.userData.moving;
  const until = (cond, act) => lab.waitUntil(cond, { auto: () => { if (!cond()) act(); } });
  const table = ui.table(['Time (min)', 'Beam seen from the side', 'Light on the screen']);

  await ui.ready();

  /* ----------------------------------------------- 1. lamp + focus */
  ui.step(0, 'Tap the <b>lamp</b> to switch it on. It sits at the focus of lens L₁, so a <b>parallel beam</b> passes through the tank of clear water.', { sub: 'The room is darkened. Never look straight into the lamp.' });
  await lab.waitClick(lamp);
  lab.sfx('switch'); lamp.setOn(true); st.on = true;
  await lab.dimLights(0.12);
  ui.instruct('Lens L₂ forms an image of the round hole in the cardboard. Drag the <b>screen</b> until the image of the hole is <b>sharp</b>.');
  await lab.focus({ pos: [0.32, 0.2, 0.4], target: [0.45, BY, 0] }, 1.2);
  await until(() => defocus() < 0.6 && !busy(), () => { sSad.userData.moving = true; lab.tween(sSad.position, { x: L2_X + V2 / 100, duration: 1.4, ease: 'power2.inOut', onComplete: () => { sSad.userData.moving = false; } }); });
  lab.sfx('success');
  ui.observe(`A sharp, round, <b>white</b> patch of light (the image of the hole) forms on the screen ${screenCm().toFixed(0)} cm from L₂. Seen from the side, the beam in the clear water is <b>hardly visible</b>.`, { icon: '⚪' });
  table.addRow(['Water only', 'Hardly visible', 'White']);
  await lab.home(1.2);

  /* ----------------------------------------------- 2. hypo */
  ui.step(1, 'Drag the <b>sodium thiosulphate</b> (hypo) bottle onto the tank to add about 200 g of crystals.');
  await lab.waitDrop(hypo, tank, { radius: 0.15 });
  const hHome = (hypo.userData.restPos || hypo.position).clone();
  await lab.carry(hypo, [TANK_X - 0.02, 0.15, 0.03], { lift: 0.06, duration: 1.0 });
  await lab.tween(hypo.rotation, { z: -1.9, duration: 0.6 });
  const crystals = [];
  const cm = new THREE.MeshStandardMaterial({ color: 0xf8f8f2, roughness: 0.4, transparent: true });
  for (let i = 0; i < 26; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.002, 0.0025), cm); c.position.set(TANK_X + (Math.random() - 0.5) * 0.04, 0.16 + Math.random() * 0.02, 0.03 + (Math.random() - 0.5) * 0.03); lab.scene.add(c); crystals.push(c); }
  lab.sfx('pour');
  await Promise.all(crystals.map((c, i) => lab.tween(c.position, { y: 0.008, x: c.position.x + (Math.random() - 0.5) * 0.04, duration: 0.9 + Math.random() * 0.5, delay: i * 0.02, ease: 'power1.in' })));
  await lab.tween(hypo.rotation, { z: 0, duration: 0.5 });
  lab.carry(hypo, hHome.toArray(), { lift: 0.04, duration: 0.9 }).catch(() => {});
  ui.instruct('Tap the <b>glass rod</b> and stir until all the crystals dissolve.');
  await lab.waitClick(rod);
  const rHome = rod.position.clone(), rRot = rod.rotation.clone();
  await lab.carry(rod, [TANK_X, 0.02, 0.02], { lift: 0.14, duration: 1.0, rotate: { z: 0.2, y: 0 } });
  const o = { a: 0 };
  await lab.tween(o, { a: Math.PI * 6, duration: 2.4, ease: 'none', onUpdate: () => { rod.position.x = TANK_X + Math.cos(o.a) * 0.05; rod.position.z = Math.sin(o.a) * 0.025; crystals.forEach((c) => { c.material.opacity = Math.max(0, 1 - o.a / (Math.PI * 5)); }); } });
  crystals.forEach((c) => lab.scene.remove(c));
  await lab.carry(rod, rHome.toArray(), { lift: 0.14, duration: 1.0, rotate: { z: rRot.z, y: rRot.y } });
  ui.observe('The hypo crystals dissolve completely. The solution stays <b>clear and colourless</b>; the beam inside is still hardly visible and the patch on the screen is still white.', { icon: '🥄' });

  /* ----------------------------------------------- 3. acid */
  ui.step(2, 'Tap the <b>sulphuric acid</b> bottle to ask your teacher to add 1–2 mL of concentrated acid.', { sub: 'Concentrated H₂SO₄ is corrosive: only the teacher handles it, wearing goggles and gloves. SO₂ gas forms — keep the room ventilated.' });
  await lab.waitClick(acid);
  const aHome = acid.position.clone();
  await lab.carry(acid, [TANK_X + 0.03, 0.14, 0.0], { lift: 0.08, duration: 1.0 });
  await lab.tween(acid.rotation, { z: -2.2, duration: 0.6 });
  const tip = acid.localToWorld(acid.lipLocal.clone());
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.6, roughness: 0.05, transparent: true, opacity: 0.8 }));
    d.position.copy(tip); lab.scene.add(d);
    lab.sfx('drop');
    await lab.tween(d.position, { y: 0.1, duration: 0.35, ease: 'power2.in' });
    lab.scene.remove(d);
    await lab.wait(0.25);
  }
  await lab.tween(acid.rotation, { z: 0, duration: 0.5 });
  await lab.carry(acid, aHome.toArray(), { lift: 0.04, duration: 0.9 });
  ui.observe('A few drops of acid are stirred in. At first nothing seems to happen — the reaction needs some time to make sulphur.', { icon: '🧪' });

  /* ----------------------------------------------- 4. time-lapse */
  ui.step(3, 'Very fine particles of sulphur will now slowly form in the water.');
  await ui.predict({ q: 'As more and more tiny sulphur particles form, the patch of light on the screen will turn…', options: ['bluer', 'orange and then red', 'brighter white', 'green'], answer: 1, explain: 'The tiny particles scatter blue light out of the beam most strongly, so the light that gets straight through to the screen is left reddish.' });
  ui.instruct('<b>Hold the stopwatch button</b> to let three minutes pass. Time only runs while you hold. Watch the tank <b>and</b> the screen.');
  const restore = freeCam(lab);
  await lab.focus({ pos: [0.04, 0.3, 0.98], target: [0.06, BY, 0.0] }, 1.2);
  st.running = true;
  const marks = [60, 120, 180]; let next = 0;
  // 180 s of reaction pass in 15 s of holding
  await lab.hold({
    label: 'Hold — stopwatch', seconds: 15,
    onTick: (p) => {
      st.simT = 180 * p; st.tau = tauAt(st.simT);
      if (next < marks.length && st.simT >= marks[next] - 1e-6) {
        table.addRow([`${marks[next] / 60}:00`, sideName(st.tau), colourName(transmitted(st.tau))]);
        lab.sfx('tick'); next++;
      }
    },
  });
  st.running = false;
  ui.observe(`After about a minute the beam inside the tank starts to glow; by 3 minutes the liquid is faintly milky (optical depth τ ≈ ${st.tau.toFixed(1)} for yellow light across the tank).`, { icon: '⏱️' });

  /* ----------------------------------------------- 5. side view */
  ui.step(4, 'Tap the <b>tank</b> to look at the beam from the side.');
  await lab.waitClick(tank);
  await lab.focus({ pos: [TANK_X + 0.02, BY + 0.05, 0.3], target: [TANK_X, BY, 0] }, 1.4);
  await lab.wait(1.5);
  ui.observe('Seen from the <b>sides</b> (and from above), the path of the beam glows <b>blue</b>, brightest where the light enters (farther along it turns paler and yellowish, because blue has already been scattered out). The tiny sulphur particles scatter the short-wavelength <b>blue</b> light much more than red light (∝ 1/λ⁴).', { icon: '🔵', highlight: true });
  await lab.wait(1);

  /* ----------------------------------------------- 6. screen */
  ui.step(5, 'Tap the <b>screen</b> to look at the light that came straight through the tank.');
  await lab.waitClick(sSad);
  await lab.focus({ pos: [sSad.position.x - 0.15, BY + 0.03, 0.12], target: [sSad.position.x, BY, 0] }, 1.4);
  await lab.wait(1.5);
  const Tend = transmitted(st.tau);
  ui.observe(`The patch on the screen has turned from white through orange to <b>${colourName(Tend).toLowerCase()}</b>, and it is dimmer — like the Sun at sunset. Blue light has been scattered out of the beam, so mostly <b>red light passes straight through</b>.`, { icon: '🌇', highlight: true });
  await lab.wait(1.5);
  await lab.home(1.4);
  restore();

  await ui.finish({
    equation: 'Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + SO₂↑ + S↓ + H₂O &nbsp;·&nbsp; scattering ∝ 1/λ⁴',
    conclusion: 'Very fine colloidal sulphur particles <b>scatter</b> light, and they scatter short wavelengths (blue) far more than long wavelengths (red). So the tank glows <b>blue</b> from the sides, while the light that comes straight through is left <b>orange-red</b>. In the same way air molecules scatter blue sunlight all over the sky, so the <b>sky looks blue</b>; at sunrise and sunset sunlight crosses a very long path through the air, most blue is scattered away, and the Sun looks <b>red</b>.',
    quiz: [
      { q: 'Why does the clear sky look blue?', options: ['The sea reflects blue light', 'Air molecules scatter blue light more than red light', 'Blue light is absorbed by air', 'Sunlight is blue'], answer: 1, explain: 'Molecules much smaller than the wavelength scatter blue (short λ) light much more strongly, and this scattered light reaches us from all over the sky.' },
      { q: 'To an astronaut high above the atmosphere, the sky looks…', options: ['blue', 'red', 'dark (black)', 'white'], answer: 2, explain: 'There is no air to scatter sunlight, so no light reaches the eye from the empty sky.' },
      { q: 'Why does the Sun look reddish at sunrise and sunset?', options: ['The Sun is cooler then', 'Light passes through a much thicker layer of air and most blue light is scattered away', 'Red light is scattered most', 'Clouds absorb blue light'], answer: 1, explain: 'Near the horizon sunlight travels a long way through the air; blue is scattered out of the beam and mainly red light reaches us.' },
    ],
  });
}
