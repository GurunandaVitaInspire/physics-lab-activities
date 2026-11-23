// Activity 9.7 — Refraction of light through a rectangular glass slab (pin method).
// Physics: Snell's law sin i = n sin r (n = 1.5); parallel faces ⇒ ∠e = ∠i; lateral shift d = t·sin(i − r)/cos r.
import * as THREE from 'three';
import { drawingBoard, glassSlab, PinTracer, v2, dirAt, angOf, traceRay, lineX, DEG } from '../engine/apparatus/optics2.js';

export const config = { camera: { pos: [0, 0.5, 0.45], target: [0, 0, 0.0] } };

export const steps = [
  'Place the slab and trace its outline',
  'Draw the incident ray; fix pins P and Q',
  'Look through the slab; fix pins R and S',
  'Remove the slab and draw the ray path',
  'Measure ∠i, ∠r and ∠e',
  'Repeat for two more angles of incidence',
];

const N = 1.5;                       // refractive index of the glass
const SLAB = { w: 0.1, d: 0.06, h: 0.018 };
const ANGLES = [30, 45, 60];
const OX = { 30: -0.038, 45: -0.016, 60: 0.004 }; // where each ray meets face AB (board x, m)
const SUB = ['₁', '₂', '₃'];

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(drawingBoard(), [0, 0, 0]);
  const top = board.topY;
  const paper = board.paper;
  const slabRest = [-0.2, 0.0164, 0.0];
  const slab = lab.add(glassSlab(SLAB), slabRest); slab.rotation.y = Math.PI / 2;
  lab.pickable(slab, 'Rectangular glass slab (10 cm × 6 cm × 1.8 cm)');
  const T = new PinTracer(lab, ui, { board, glassH: SLAB.h });
  const [pP, pQ, pR, pS] = T.pins;
  const hw = SLAB.w / 2, hd = SLAB.d / 2;
  const poly = [v2(-hw, -hd), v2(hw, -hd), v2(hw, hd), v2(-hw, hd)]; // A B C D (AB = far face, CD = near face)
  const bodies = [{ verts: poly, n: N }];
  const table = ui.table(['∠i', '∠r', '∠e', 'sin i ⁄ sin r', 'Shift d (cm)']);
  const used = [], results = [];

  await ui.ready();

  /* ------------------------------------------- 1. place and trace slab */
  ui.step(0, 'A sheet of white paper is pinned on the drawing board. Tap the <b>glass slab</b> to place it in the middle of the paper.', { sub: 'Hold the slab by its frosted ends so the clear faces stay clean.' });
  await lab.waitClick(slab);
  await lab.carry(slab, [0, top, 0], { lift: 0.06, duration: 1.2, rotate: { y: 0 } });
  lab.sfx('glass');
  ui.instruct('Tap the <b>pencil</b> to trace the outline <b>ABCD</b> of the slab.');
  await lab.waitClick(T.pen);
  await T.draw([{ type: 'poly', pts: poly.map((p) => p.clone()), closed: true, width: 0.0005 }], { speed: 0.18 });
  [['A', -1, -1], ['B', 1, -1], ['C', 1, 1], ['D', -1, 1]].forEach(([t, sx, sz]) => paper.add({ type: 'text', at: v2(sx * (hw + 0.005), sz * (hd + 0.005)), text: t, size: 0.006 }));
  ui.observe('The outline <b>ABCD</b> of the slab is drawn. Light will enter through face <b>AB</b> and leave through the parallel face <b>CD</b>.', { icon: '✏️' });

  /* ------------------------------------------------- the rounds */
  for (let k = 0; k < 3; k++) {
    const sub = SUB[k];
    ui.clearReadout();
    if (k > 0) {
      ui.step(5, `Ray ${k + 1}: tap the <b>glass slab</b> to put it back exactly on its outline ABCD.`);
      await lab.waitClick(slab);
      await lab.carry(slab, [0, top, 0], { lift: 0.06, duration: 1.1, rotate: { y: 0 } });
      lab.sfx('glass');
      ui.instruct(`Ray ${k + 1}: choose a different <b>angle of incidence</b>.`);
    } else {
      ui.step(1, 'Choose the <b>angle of incidence ∠i</b> for your first ray.', { sub: 'You will trace one ray for each angle and compare them.' });
    }
    let chosen = null;
    const seg = ui.control({ type: 'segmented', label: 'Angle of incidence', options: ANGLES.filter((a) => !used.includes(a)).map((a) => ({ value: a, label: `${a}°` })), onChange: (v) => { chosen = v; } });
    await lab.waitUntil(() => chosen !== null, { auto: () => { chosen = ANGLES.find((a) => !used.includes(a)); seg.set(chosen); } });
    seg.remove(); ui.clearControls();
    const i = chosen; used.push(i);
    const O = v2(OX[i], -hd);
    const dI = dirAt(90 - i);              // travelling towards +z (towards the student), at i to the normal
    const P = O.clone().addScaledVector(dI, -0.07), Q = O.clone().addScaledVector(dI, -0.03);

    await lab.focus({ pos: [O.x - 0.03, 0.2, O.y + 0.12], target: [O.x - 0.025, top, O.y - 0.03] }, 1.2);
    ui.instruct(`Tap the <b>pencil</b>: mark a point <b>O</b> on face AB and draw the normal <b>NO</b> at O.`);
    await lab.waitClick(T.pen);
    await T.draw([
      { type: 'line', a: O.clone().add(v2(0, -0.042)), b: O.clone(), dash: [0.002, 0.0014] },
      { type: 'text', at: O.clone().add(v2(-0.004, -0.004)), text: 'O' + sub, size: 0.0048 },
      { type: 'text', at: O.clone().add(v2(0.003, -0.044)), text: 'N', size: 0.0045 },
    ]);
    ui.instruct(`Tap the <b>protractor</b> to mark ∠i = <b>${i}°</b> from the normal at O.`, { sub: 'Its centre goes on O and its 90° mark along the normal.' });
    await lab.waitClick(T.prot);
    await T.measure({ at: O, refDeg: -90, rayDeg: angOf(dI.clone().negate()), label: 'i', key: 'i', roLabel: '∠i (incidence)', arcR: 0.014 });
    paper.add({ type: 'dot', c: O.clone().addScaledVector(dI, -0.047), r: 0.0006 });
    await T.parkProtractor();
    ui.instruct('Tap the <b>pencil</b> to draw the incident ray through the mark to O.');
    await lab.waitClick(T.pen);
    await T.draw([
      { type: 'line', a: O.clone().addScaledVector(dI, -0.088), b: O.clone(), arrow: true, arrowAt: 0.3 },
      { type: 'cross', c: P }, { type: 'cross', c: Q },
    ]);
    ui.instruct('Fix two pins <b>P</b> and <b>Q</b> upright on the incident ray. Drag each pin onto its pencil cross (or tap it).', { sub: 'Keep the pins at least 4 cm apart and push them in vertically. Mind the sharp points.' });
    await T.fixPin(pP, P, 'P' + sub);
    await T.fixPin(pQ, Q, 'Q' + sub);

    /* ------------------------------------------ sighting R, S */
    const tr = traceRay(P, dI, bodies);
    const E = tr.events[1].point, dE = tr.dir;
    const OE = E.clone().sub(O);
    const perp = OE.clone().sub(dI.clone().multiplyScalar(OE.dot(dI)));        // the sideways shift of the ray
    const Rt = E.clone().addScaledVector(dE, 0.03), St = E.clone().addScaledVector(dE, 0.075);
    const R0 = v2(Rt.x + (k % 2 ? -0.011 : 0.012), Rt.y), S0 = v2(St.x + (k % 2 ? 0.013 : -0.014), St.y);
    if (k === 0) {
      ui.step(2, 'Now you will look at P and Q from the other side, through face CD.');
      await ui.predict({ q: 'The ray that comes out of face CD (the emergent ray) will be…', options: ['Along the same line as PQ', 'Parallel to PQ but shifted sideways', 'Bent towards the bottom edge of the paper', 'Perpendicular to CD'], answer: 1, explain: 'The faces AB and CD are parallel, so the ray bends back by the same amount — it comes out parallel to the incident ray, displaced sideways.' });
    }
    ui.instruct('Tap pins <b>R</b> and <b>S</b> to stick them on the near side of the slab, beyond face CD.');
    await T.stickPin(pR, R0, 'R' + sub);
    await T.stickPin(pS, S0, 'S' + sub);
    ui.instruct('Bend down so your eye is level with the slab and look at P and Q <b>through face CD</b>.');
    const [Rm, Sm] = await T.sight({
      imgs: [[pP, P.clone().add(perp)], [pQ, Q.clone().add(perp)]],
      movers: [{ pin: pR, name: 'R' + sub, axis: 'x' }, { pin: pS, name: 'S' + sub, axis: 'x' }],
      E, dE, glassObj: slab, text: (nm) => `Through the glass, the lower parts of P and Q look shifted (the pins appear “broken” at the top of the slab). Move pin <b>${nm}</b> until it hides those images.`,
    });
    if (k === 0) ui.observe('Seen through the slab, the parts of P and Q below its top edge appear <b>shifted sideways</b> from the parts above it. R and S are fixed in line with these images.', { icon: '👁️' });

    /* ---------------------------------- remove slab, draw the path */
    if (k === 0) ui.step(3, 'Tap the <b>glass slab</b> to remove it. The pins are pulled out and their holes circled.');
    else ui.instruct('Tap the <b>glass slab</b> to remove it.');
    await lab.waitClick(slab);
    await lab.carry(slab, slabRest, { lift: 0.06, duration: 1.1, rotate: { y: Math.PI / 2 } });
    const holes = await T.removePins([[pP, 'P' + sub], [pQ, 'Q' + sub], [pR, 'R' + sub, v2(0.006, 0.004)], [pS, 'S' + sub, v2(0.006, 0.004)]]);
    const dEm = Sm.clone().sub(Rm).normalize();
    const O2 = lineX(Rm, dEm, v2(0, hd), v2(1, 0));           // where the emergent ray leaves face CD
    const foot = O.clone().addScaledVector(dI, O2.clone().sub(O).dot(dI));
    const d = O2.distanceTo(foot);
    ui.instruct('Tap the <b>pencil</b>: join S and R up to face CD (point O′), join O to O′, and draw the normal at O′.');
    await lab.waitClick(T.pen);
    await T.draw([
      ...holes,
      { type: 'line', a: O2.clone(), b: Sm.clone().addScaledVector(dEm, 0.014), arrow: true, arrowAt: 0.55 },
      { type: 'line', a: O.clone(), b: O2.clone(), arrow: true, arrowAt: 0.5 },
      { type: 'line', a: O.clone(), b: O.clone().add(v2(0, 0.022)), dash: [0.002, 0.0014] },
      { type: 'line', a: O2.clone().add(v2(0, -0.022)), b: O2.clone().add(v2(0, 0.04)), dash: [0.002, 0.0014] },
      { type: 'text', at: O2.clone().add(v2(-0.005, 0.005)), text: 'O′' + sub, size: 0.0048 },
      { type: 'line', a: O.clone(), b: O.clone().addScaledVector(dI, 0.09), dash: [0.0012, 0.0016], color: 'rgba(90,90,100,0.6)' },
      { type: 'line', a: O2.clone(), b: foot.clone(), color: 'rgba(190,40,40,0.9)', width: 0.0004 },
      { type: 'text', at: O2.clone().lerp(foot, 0.5).add(v2(0.004, -0.003)), text: 'd', size: 0.0045, color: 'rgba(190,40,40,0.95)', italic: true },
    ]);
    if (k === 0) ui.observe('Inside the glass the ray <b>OO′</b> bends <b>towards the normal</b>; at O′ it bends <b>away from the normal</b> as it comes out into air.', { icon: '↘️', highlight: true });

    /* ------------------------------------------------ measure */
    if (k === 0) ui.step(4, 'Tap the <b>protractor</b> to measure ∠r at O and ∠e at O′.', { sub: '∠i you marked earlier — the readings appear at the top right.' });
    else ui.instruct('Tap the <b>protractor</b> to measure ∠r and ∠e.');
    await lab.waitClick(T.prot);
    await lab.focus({ pos: [(O.x + O2.x) / 2, 0.2, 0.15], target: [(O.x + O2.x) / 2, top, 0.0] }, 1.1);
    ui.readout('i', '∠i (incidence)', i.toFixed(1), { unit: '°', color: '#0ea5e9' });
    const mr = await T.measure({ at: O, refDeg: 90, rayDeg: angOf(O2.clone().sub(O)), label: 'r', key: 'r', roLabel: '∠r (refraction)', color: '#a855f7' });
    const me = await T.measure({ at: O2, refDeg: 90, rayDeg: angOf(dEm), label: 'e', key: 'e', roLabel: '∠e (emergence)', color: '#22c55e', arcR: 0.014 });
    await T.parkProtractor();
    const ratio = Math.sin(i * DEG) / Math.sin(mr * DEG);
    ui.readout('n', 'sin i ⁄ sin r', ratio.toFixed(2), { color: '#f59e0b' });
    ui.readout('d', 'Lateral shift d', (d * 100).toFixed(2), { unit: 'cm', color: '#ef4444' });
    table.addRow([`${i}°`, `${mr.toFixed(1)}°`, `${me.toFixed(1)}°`, ratio.toFixed(2), (d * 100).toFixed(2)]);
    results.push({ i, r: mr, e: me, ratio, d });
    lab.sfx('success');
    ui.observe(`For ∠i = ${i}°: ∠r = ${mr.toFixed(1)}°, ∠e = ${me.toFixed(1)}° — the emergent ray is <b>parallel</b> to the incident ray, shifted sideways by ${(d * 100).toFixed(1)} cm.`, { icon: '📐', highlight: k === 0 });
    await lab.wait(1.2);
    await lab.home(1.2);
  }

  /* ------------------------------------------------ conclusions */
  ui.clearReadout();
  const avg = results.reduce((a, r) => a + r.ratio, 0) / results.length;
  ui.observe(`In every case <b>∠e = ∠i</b>, and sin i ⁄ sin r is nearly the same (average <b>${avg.toFixed(2)}</b>) — this constant is the refractive index of glass.`, { icon: '🧮', highlight: true });
  const ds = results.slice().sort((a, b) => a.i - b.i).map((r) => (r.d * 100).toFixed(1));
  ui.observe(`The lateral displacement grows with the angle of incidence: ${ds.join(' cm → ')} cm for 30°, 45°, 60°.`, { icon: '↔️' });
  await lab.focus({ pos: [0, 0.34, 0.2], target: [0, 0, 0] }, 1.4);
  await lab.wait(1.5);
  await lab.home(1.2);

  await ui.finish({
    equation: 'n<sub>glass</sub> = sin i ⁄ sin r ≈ 1.5 &nbsp;·&nbsp; ∠e = ∠i &nbsp;·&nbsp; d = t·sin(i − r) ⁄ cos r',
    conclusion: 'A ray entering the glass slab bends <b>towards the normal</b> (∠r &lt; ∠i) and bends <b>away from the normal</b> when it leaves. Because the opposite faces are parallel, the emergent ray is <b>parallel to the incident ray</b> (∠e = ∠i) but shifted sideways; the shift grows with ∠i. The ratio sin i ⁄ sin r stays constant — Snell’s law — and gives n ≈ 1.5 for glass.',
    quiz: [
      { q: 'A ray enters a glass slab at ∠i = 40°. At what angle does it come out of the opposite parallel face?', options: ['25°', '40°', '50°', '60°'], answer: 1, explain: 'The faces are parallel, so the emergent angle equals the angle of incidence: ∠e = ∠i = 40°.' },
      { q: 'Light goes from air into glass. Inside the glass it…', options: ['speeds up and bends away from the normal', 'slows down and bends towards the normal', 'slows down and does not bend', 'speeds up and bends towards the normal'], answer: 1, explain: 'Glass is optically denser than air, so light slows down and bends towards the normal (r < i).' },
      { q: 'For i = 60° the angle of refraction in glass was 35.3°. The refractive index of the glass is about…', options: ['1.33', '1.50', '1.70', '0.67'], answer: 1, explain: 'n = sin 60° ⁄ sin 35.3° = 0.866 ⁄ 0.578 ≈ 1.50.' },
    ],
  });
}

void THREE;
