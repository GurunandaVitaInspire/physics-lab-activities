// Activity 10.2 — Dispersion of white light by a glass prism, and recombination by a second, inverted prism.
// Physics: every wavelength is refracted by Snell's law with its own index n(λ) = A + B/λ² (dense flint glass,
// n ≈ 1.615 for red … 1.653 for violet), so violet is deviated most and red least. An identical inverted prism
// undoes the dispersion: together they act like a parallel-sided slab, so all colours leave parallel → white.
import * as THREE from 'three';
import { saddle } from '../engine/apparatus/optics.js';
import { lightBox, slitCard, glassPrism, liveScreen, traceRay, spectrumSamples, wl2rgb, cauchy, v2, DEG, BeamGlow } from '../engine/apparatus/optics2.js';
import { RayBundle } from '../engine/effects.js';
import { wood } from '../engine/materials.js';

export const config = { camera: { pos: [-0.02, 0.42, 0.56], target: [-0.02, 0.05, -0.06] }, benchWidth: 2.0 };

export const steps = [
  'Fix the slit and switch on the light',
  'Put the glass prism in the beam',
  'Catch the light on the screen',
  'Turn the prism for a clear spectrum',
  'Identify the colours (VIBGYOR)',
  'Recombine the colours with a second prism',
];

const BEAM_Y = 0.07;
const SIDE = 0.05, PH = 0.06, TABLE_H = 0.045;
const nOf = cauchy(1.59, 10500);               // dense flint glass, λ in nm
const VIBGYOR = [['Violet', 410], ['Indigo', 440], ['Blue', 470], ['Green', 520], ['Yellow', 575], ['Orange', 600], ['Red', 660]];
const SLIT_X = -0.24, PRISM_X = -0.1, PRISM_Z = 0.016;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const box = lab.add(lightBox({ beamY: BEAM_Y }), [-0.405, 0, 0]);
  lab.pickable(box, 'Light source (switch)');
  const slit = lab.add(slitCard({ beamY: BEAM_Y }), [-0.44, 0, 0.2]); slit.rotation.y = 0.4;
  lab.pickable(slit, 'Cardboard with a narrow slit');
  const slitMark = new THREE.Object3D(); slitMark.position.set(SLIT_X, 0, 0); lab.scene.add(slitMark);

  const table = new THREE.Mesh(new THREE.BoxGeometry(0.15, TABLE_H, 0.13), wood({ base: '#3b2a1d', key: 'prismtable' }));
  table.position.set(PRISM_X + 0.02, TABLE_H / 2, PRISM_Z + 0.01); lab.add(table);
  const prism1 = lab.add(glassPrism({ side: SIDE, h: PH }), [-0.27, 0, 0.22]); prism1.rotation.y = 0.6;
  const prism2 = lab.add(glassPrism({ side: SIDE, h: PH }), [-0.17, 0, 0.24]); prism2.rotation.y = -0.3;
  lab.pickable(prism1, 'Glass prism'); lab.pickable(prism2, 'Second, identical glass prism');
  const p1Mark = new THREE.Object3D(); p1Mark.position.set(PRISM_X, TABLE_H, PRISM_Z); lab.scene.add(p1Mark);

  const sSad = lab.add(saddle({ height: BEAM_Y - 0.05 - 0.004 }), [0.24, 0, 0]);
  const screen = liveScreen({ w: 0.14, h: 0.1, res: 420 });
  screen.position.y = 0.054; sSad.mount.add(screen); sSad.rotation.y = -Math.PI / 2;
  lab.pickable(sSad, 'White screen');

  const rays = new RayBundle({ width: 0.0008, intensity: 2.0 }); lab.scene.add(rays);
  const lampBeam = new BeamGlow({ radius: 0.012, intensity: 0 }); lab.scene.add(lampBeam);
  lampBeam.setGradient([[1, 0.97, 0.9], [1, 0.95, 0.85]]);

  // continuous spectral fan (horizontal sheet of light from the prism to the screen)
  const NS = 60, samples = spectrumSamples(NS);
  const fanGeo = new THREE.BufferGeometry();
  const fanPos = new Float32Array(NS * 2 * 3), fanCol = new Float32Array(NS * 2 * 3);
  const idx = []; for (let k = 0; k < NS - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  fanGeo.setIndex(idx); fanGeo.setAttribute('position', new THREE.BufferAttribute(fanPos, 3)); fanGeo.setAttribute('color', new THREE.BufferAttribute(fanCol, 3));
  samples.forEach((q, k) => { const c = wl2rgb(q.l); for (let j = 0; j < 2; j++) fanCol.set(c.map((x) => x * 0.55), (k * 2 + j) * 3); });
  const fan = new THREE.Mesh(fanGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  fan.frustumCulled = false; fan.visible = false; fan.renderOrder = 9; fan.raycast = () => {}; lab.scene.add(fan);

  /* ------------------------------------------------------------ optics */
  const st = { on: false, slit: false, p1: false, p2: false, phi: 0, hits: [] };
  const body = (pr) => ({ verts: pr.polyWorld(), n: 0 });
  const bodiesFor = (l) => {
    const B = [];
    if (st.p1) B.push({ ...body(prism1), n: nOf(l) });
    if (st.p2) B.push({ ...body(prism2), n: nOf(l) });
    return B;
  };
  const traceL = (l) => traceRay(v2(SLIT_X, 0), v2(1, 0), bodiesFor(l));
  const w3 = (p, y = BEAM_Y) => new THREE.Vector3(p.x, y, p.y);
  /** deviation of wavelength l (deg) — null if it does not emerge from the second face */
  const deviation = (l) => { const t = traceL(l); if (t.events.some((e) => e.type === 'tir') || !t.events.some((e) => e.type === 'out')) return null; return Math.acos(Math.max(-1, Math.min(1, t.dir.x))) / DEG; };

  function screenHit(t) {
    const end = w3(t.end), d3 = new THREE.Vector3(t.dir.x, 0, t.dir.y);
    const sp = screen.getWorldPosition(new THREE.Vector3());
    if (sp.clone().sub(end).dot(d3) <= 0.02) return null;
    screen.updateWorldMatrix(true, false);
    const c = screen.projectAlong(end, d3);
    if (Math.abs(c.x) > screen.cardW / 2 + 0.01) return null;
    const n = new THREE.Vector3(0, 0, 1).transformDirection(screen.matrixWorld);
    const tt = sp.clone().sub(end).dot(n) / d3.dot(n);
    return { c, world: end.clone().addScaledVector(d3, tt), cos: Math.abs(d3.dot(n)) };
  }

  function update() {
    screen.clear();
    const lines = [];
    lampBeam.intensity = st.on ? 0.5 : 0;
    if (!st.on) { fan.visible = false; rays.draw([]); screen.commit(); return; }
    const win = box.localToWorld(box.windowLocal.clone());
    if (!st.slit) {
      // no slit: a broad beam lights a big blurred patch
      lampBeam.between(win, new THREE.Vector3(0.24, BEAM_Y, 0));
      screen.disc({ r: 0.03, color: 'rgba(255,246,225,1)', alpha: 0.6, blur: 10, soft: 0.6 });
      fan.visible = false; rays.draw([]); screen.commit(); return;
    }
    lampBeam.between(win, new THREE.Vector3(SLIT_X, BEAM_Y, 0));
    const g = screen.ctx, px = screen.px;
    let anyFan = false;
    samples.forEach((q, k) => {
      const t = traceL(q.l);
      const hit = screenHit(t);
      const end = hit ? hit.world : w3(t.end).add(new THREE.Vector3(t.dir.x, 0, t.dir.y).multiplyScalar(0.5));
      fanPos.set(w3(t.end).toArray(), k * 6); fanPos.set(end.toArray(), k * 6 + 3);
      if (t.events.length >= 2) anyFan = true;
      if (hit) {
        const [cx, cy] = screen.toCanvas(hit.c.x, 0);
        const halfW = (0.0016 / Math.max(0.3, hit.cos)) * px, hh = 0.034 * px;
        const gain = st.p1 ? 5.5 : 2.4;
        const col = q.w.map((x) => Math.min(255, Math.round(x * gain * 255)));
        const grd = g.createLinearGradient(cx - halfW * 2, 0, cx + halfW * 2, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, `rgb(${col[0]},${col[1]},${col[2]})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = grd;
        g.beginPath(); g.ellipse(cx, cy, halfW * 2, hh / 2, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    });
    fanGeo.attributes.position.needsUpdate = true;
    fan.visible = st.p1 && anyFan;
    // white incident ray and the beam inside the glass
    const t0 = traceL(589);
    lines.push({ pts: [w3(v2(SLIT_X, 0)), w3(t0.pts[1] || t0.end.clone().add(v2(0.5, 0)))], color: 0xfff7e6, intensity: 1.7 });
    if (!st.p1) {
      const hit = screenHit(t0);
      lines[0].pts[1] = hit ? hit.world : w3(v2(0.5, 0));
    } else {
      if (t0.pts.length > 2) lines.push({ pts: t0.pts.slice(1, -1).map((p) => w3(p)).concat([w3(t0.pts[t0.pts.length - 1])]), color: 0xfff7e6, intensity: 1.6, opacity: 0.7 });
      VIBGYOR.forEach(([, l]) => {
        const t = traceL(l); const hit = screenHit(t); const c = wl2rgb(l);
        const pts = t.pts.slice(-1).map((p) => w3(p));
        pts.push(hit ? hit.world : pts[0].clone().add(new THREE.Vector3(t.dir.x, 0, t.dir.y).multiplyScalar(0.45)));
        if (st.p2) { const mid = t.pts.slice(2, -1).map((p) => w3(p)); if (mid.length) lines.push({ pts: [...mid, pts[0]], color: new THREE.Color(...c), intensity: 1.6, opacity: 0.6 }); }
        lines.push({ pts, color: new THREE.Color(...c), intensity: 1.3, opacity: 0.6 });
      });
    }
    rays.draw(lines);
    screen.commit();
  }
  lab.onUpdate(update);

  /* -------------------------- prism 1 orientation for minimum deviation */
  const setPhi = (deg) => { st.phi = deg; prism1.rotation.y = Math.PI + deg * DEG; prism1.updateWorldMatrix(true, false); };
  const placeP1 = () => { prism1.position.set(PRISM_X, TABLE_H, PRISM_Z); prism1.rotation.set(0, Math.PI, 0); };
  placeP1(); st.p1 = true;
  let phiMin = 0, dMin = 999;
  for (let a = -40; a <= 40; a += 0.25) { setPhi(a); const d = deviation(589); if (d !== null && d < dMin) { dMin = d; phiMin = a; } }
  st.p1 = false;
  setPhi(phiMin);
  const tMin = traceRay(v2(SLIT_X, 0), v2(1, 0), [{ verts: prism1.polyWorld(), n: nOf(560) }]);
  const exitN = tMin.events.find((e) => e.type === 'out').normal.clone();
  const dirMin = tMin.dir.clone(), exitMin = tMin.end.clone();
  prism1.position.set(-0.27, 0, 0.22); prism1.rotation.set(0, 0.6, 0);
  const PHI0 = phiMin + 14;

  const busy = () => !!lab.drag;
  const until = (cond, act) => lab.waitUntil(cond, { auto: () => { if (!cond()) act(); } });

  await ui.ready();

  /* ------------------------------------------------ 1. slit + light */
  ui.step(0, 'Drag the <b>cardboard with the narrow slit</b> in front of the light source (or tap it).', { sub: 'The slit lets through only a thin, narrow beam of white light.' });
  await lab.waitDrop(slit, slitMark, { radius: 0.08 });
  await lab.carry(slit, [SLIT_X, 0, 0], { lift: 0.05, duration: 1.0, rotate: { y: 0 } });
  st.slit = true;
  ui.instruct('Tap the <b>light source</b> to switch it on. The room is darkened.', { sub: 'Never look straight into the lamp or at the Sun.' });
  await lab.waitClick(box);
  lab.sfx('switch'); box.setOn(true); st.on = true;
  await lab.dimLights(0.12);
  await lab.focus({ pos: [0.06, 0.16, 0.3], target: [0.2, BEAM_Y, 0] }, 1.2);
  ui.observe('A thin beam of white light passes through the slit and makes a narrow <b>white</b> strip on the screen.', { icon: '💡' });
  await lab.wait(1.2);
  await lab.home(1);

  /* ------------------------------------------------ 2. prism */
  ui.step(1, 'Now a glass prism will be put in the path of the beam.');
  await ui.predict({ q: 'When the narrow white beam passes through the prism, the screen will show…', options: ['a white strip in the same place', 'a band of seven colours', 'nothing at all', 'only a red strip'], answer: 1, explain: 'Glass bends each colour by a different amount, so white light spreads out into a spectrum.' });
  ui.instruct('Drag the <b>glass prism</b> onto the dark prism table in the beam (or tap it).', { sub: 'Hold the prism by its top and bottom faces, not by the polished sides.' });
  await lab.waitDrop(prism1, p1Mark, { radius: 0.08 });
  await lab.carry(prism1, [PRISM_X, TABLE_H, PRISM_Z], { lift: 0.08, duration: 1.2, rotate: { y: Math.PI + PHI0 * DEG } });
  setPhi(PHI0); st.p1 = true; lab.sfx('glass');
  ui.observe('The white strip disappears from the screen — the light coming out of the prism has been <b>bent towards the base</b> of the prism and spread out into a fan of colours.', { icon: '🔺' });

  /* ------------------------------------------------ 3. catch on screen */
  ui.step(2, 'Tap the <b>screen</b> to carry it into the coloured beam.');
  await lab.waitClick(sSad);
  const sc = exitMin.clone().addScaledVector(dirMin, 0.26);
  await lab.carry(sSad, [sc.x, 0, sc.y], { lift: 0.04, duration: 1.3, rotate: { y: Math.atan2(-dirMin.x, -dirMin.y) } });
  lab.sfx('drop');

  /* ------------------------------------------------ 4. turn the prism */
  ui.step(3, 'Slowly <b>turn the prism</b> with the slider. Watch the colours move on the screen — they stop and then move back. Leave the prism where they stop.', { sub: 'This position (minimum deviation) gives the brightest, clearest spectrum.' });
  await lab.focus({ pos: [sc.x - dirMin.x * 0.27 + 0.1, 0.18, sc.y - dirMin.y * 0.27 - 0.03], target: [sc.x - dirMin.x * 0.06, BEAM_Y, sc.y - dirMin.y * 0.06] }, 1.2);
  const turn = ui.control({ type: 'slider', label: 'Turn the prism', min: -20, max: 20, step: 0.5, value: 14, format: (v) => `${v > 0 ? '+' : ''}${v}°`, onInput: (v) => setPhi(phiMin + v) });
  const ro = lab.onUpdate(() => { const d = deviation(589); ui.readout('d', 'Deviation of yellow light', d === null ? '—' : d.toFixed(1), { unit: d === null ? '' : '°', color: '#eab308' }); });
  await until(() => Math.abs(st.phi - phiMin) < 2.2 && !busy(), () => { const o = { v: st.phi - phiMin }; lab.tween(o, { v: 0, duration: 2.5, ease: 'power1.inOut', onUpdate: () => { setPhi(phiMin + o.v); turn.set(Math.round(o.v * 2) / 2); } }); });
  await lab.wait(0.6);
  turn.remove(); ro(); ui.clearReadout('d');
  setPhi(phiMin + Math.round((st.phi - phiMin) * 2) / 2);
  lab.sfx('success');
  ui.observe('A bright band of colours — a <b>spectrum</b> — appears on the screen. Near one position of the prism the band stops moving: this is the position of <b>minimum deviation</b>.', { icon: '🌈', highlight: true });

  /* ------------------------------------------------ 5. colours */
  ui.step(4, 'Tap the <b>screen</b> to look closely at the order of the colours.');
  await lab.waitClick(sSad);
  const spos = sSad.position;
  await lab.focus({ pos: [spos.x - dirMin.x * 0.2 + 0.02, BEAM_Y + 0.04, spos.z - dirMin.y * 0.2 + 0.03], target: [spos.x, BEAM_Y, spos.z] }, 1.3);
  const dataT = ui.table(['Colour', 'λ (nm)', 'n of glass', 'Deviation D']);
  const tags = [];
  for (const [name, l] of VIBGYOR) {
    const t = traceL(l), hit = screenHit(t), D = deviation(l);
    if (hit) tags.push(lab.tag(screen, name[0], { offset: [hit.c.x, -0.042, 0.003], cls: 'mono' }));
    dataT.addRow([name, String(l), nOf(l).toFixed(4), D === null ? '—' : `${D.toFixed(2)}°`]);
    lab.sfx('tick');
    await lab.wait(0.25);
  }
  const Dv = deviation(410), Dr = deviation(660);
  ui.readout('dv', 'Deviation of violet', Dv.toFixed(2), { unit: '°', color: '#8b5cf6' });
  ui.readout('dr', 'Deviation of red', Dr.toFixed(2), { unit: '°', color: '#ef4444' });
  ui.observe(`The colours are always in the order <b>V I B G Y O R</b>. <b>Violet bends the most</b> (D = ${Dv.toFixed(1)}°) and <b>red the least</b> (D = ${Dr.toFixed(1)}°) because the refractive index of glass is larger for violet light.`, { icon: '🎨', highlight: true });
  await lab.wait(2);
  tags.forEach((t) => lab.untag(t)); ui.clearReadout();
  await lab.home(1.2);

  /* ------------------------------------------------ 6. recombine */
  ui.step(5, 'Now an identical prism will be placed <b>upside down</b> (inverted) just after the first one.');
  await ui.predict({ q: 'The colours pass through a second, identical prism placed inverted. On the screen you will see…', options: ['an even wider spectrum', 'white light again', 'only violet', 'the colours in reverse order, spread out'], answer: 1, explain: 'The inverted prism bends each colour back by the same amount, so all the colours come out together and recombine into white light.' });
  const p2Mark = new THREE.Object3D(); lab.scene.add(p2Mark);
  const gap = 0.004, off = 2 * prism1.inradius + gap;
  // centre the inverted prism's face on the point where the coloured light leaves the first prism
  const G = v2(PRISM_X, PRISM_Z), tf = v2(-exitN.y, exitN.x);
  const slide = exitMin.clone().sub(G.clone().addScaledVector(exitN, prism1.inradius)).dot(tf);
  const p2c = G.clone().addScaledVector(exitN, off).addScaledVector(tf, slide);
  const p2pos = new THREE.Vector3(p2c.x, TABLE_H, p2c.y);
  p2Mark.position.copy(p2pos);
  ui.instruct('Drag the <b>second prism</b> next to the first one, inverted, so its face is parallel to the face the colours come out of (or tap it).');
  await lab.waitDrop(prism2, p2Mark, { radius: 0.08 });
  await lab.carry(prism2, p2pos.toArray(), { lift: 0.08, duration: 1.3, rotate: { y: prism1.rotation.y + Math.PI } });
  st.p2 = true; lab.sfx('glass');
  const tW = traceL(560);
  ui.instruct('The colours have disappeared from the screen. Tap the <b>screen</b> to catch the light coming out of the second prism.');
  await lab.waitClick(sSad);
  const zAt = tW.end.y + (tW.dir.y / tW.dir.x) * (0.24 - tW.end.x);
  await lab.carry(sSad, [0.24, 0, zAt], { lift: 0.04, duration: 1.3, rotate: { y: -Math.PI / 2 } });
  await lab.focus({ pos: [0.05, 0.17, 0.3], target: [0.17, BEAM_Y, zAt] }, 1.3);
  const devW = Math.atan2(Math.abs(tW.dir.y), tW.dir.x) / DEG;
  ui.observe(`A <b>white</b> strip appears on the screen again. The light leaving the second prism travels parallel to the original beam (deviation ${devW.toFixed(1)}°) — the seven colours have <b>recombined</b> into white light.`, { icon: '⚪', highlight: true });
  await lab.wait(2);
  await lab.home(1.2);

  await ui.finish({
    equation: 'White light → V I B G Y O R &nbsp;·&nbsp; n<sub>violet</sub> &gt; n<sub>red</sub> ⇒ D<sub>violet</sub> &gt; D<sub>red</sub>',
    conclusion: 'A glass prism splits white light into a band of seven colours, the <b>spectrum</b> (VIBGYOR). This splitting is called <b>dispersion</b>; it happens because each colour travels at a different speed in glass and so bends through a different angle — violet the most, red the least. A second identical prism placed inverted bends the colours back and they <b>recombine into white light</b>, showing that white light is made up of these seven colours (Newton’s experiment).',
    quiz: [
      { q: 'Which colour of white light is deviated the most by a glass prism?', options: ['Red', 'Yellow', 'Green', 'Violet'], answer: 3, explain: 'Glass has the largest refractive index for violet light, so violet bends the most.' },
      { q: 'The splitting of white light into its component colours is called…', options: ['reflection', 'dispersion', 'scattering', 'total internal reflection'], answer: 1, explain: 'Dispersion: different colours are refracted by different amounts.' },
      { q: 'Why does light coming out of two identical prisms (the second one inverted) look white?', options: ['The second prism absorbs the colours', 'The second prism bends every colour back by the same amount, so the colours recombine', 'The light is reflected back', 'The colours mix in air on their own'], answer: 1, explain: 'Together the two prisms act like a parallel-sided slab: all colours emerge parallel and overlap, which we see as white.' },
    ],
  });
}
