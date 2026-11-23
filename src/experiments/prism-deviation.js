// Activity 10.1 — Refraction of light through a triangular glass prism; angle of deviation (pin method).
// Physics: Snell's law at both faces (n = 1.5, A = 60°): r1 + r2 = A, D = i + e − A.
import * as THREE from 'three';
import { drawingBoard, glassPrism, PinTracer, v2, dirAt, angOf, traceRay, lineX, DEG } from '../engine/apparatus/optics2.js';

export const config = { camera: { pos: [0, 0.5, 0.45], target: [0, 0, 0.0] } };

export const steps = [
  'Place the prism and trace its outline',
  'Draw the incident ray; fix pins P and Q',
  'Look through the prism; fix pins R and S',
  'Remove the prism and draw the ray path',
  'Measure ∠i, ∠e and the angle of deviation ∠D',
  'Repeat for two more angles of incidence',
];

const N = 1.5, A_DEG = 60, SIDE = 0.06, H = 0.025;
const ANGLES = [35, 45, 60];
const T_ON_AB = { 35: 0.62, 45: 0.52, 60: 0.4 }; // where on face AB each ray enters (fraction from A)
const SUB = ['₁', '₂', '₃'];

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(drawingBoard(), [0, 0, 0]);
  const top = board.topY, paper = board.paper;
  const restPos = [-0.2, 0.0164, 0.0];
  const prism = lab.add(glassPrism({ side: SIDE, h: H }), restPos); prism.rotation.y = 0.3;
  lab.pickable(prism, 'Glass prism (∠A = 60°)');
  const T = new PinTracer(lab, ui, { board, glassH: H });
  const [pP, pQ, pR, pS] = T.pins;
  const [A, B, C] = prism.local.map((p) => p.clone()); // outline when the prism sits at the board centre
  const bodies = [{ verts: [A, B, C], n: N }];
  const nAB = v2(-Math.cos(30 * DEG), -Math.sin(30 * DEG));   // outward normal of face AB (towards the incident side)
  const nAC = v2(Math.cos(30 * DEG), -Math.sin(30 * DEG));    // outward normal of face AC
  const table = ui.table(['∠i', '∠e', '∠D (measured)', 'i + e − A']);
  const used = [], results = [];

  await ui.ready();

  /* ------------------------------------------- 1. place and trace */
  ui.step(0, 'White paper is pinned on the drawing board. Tap the <b>glass prism</b> to place it in the middle of the paper, lying on its triangular face.', { sub: 'Hold the prism by its base; do not smudge the polished faces.' });
  await lab.waitClick(prism);
  await lab.carry(prism, [0, top, 0], { lift: 0.06, duration: 1.2, rotate: { y: 0 } });
  lab.sfx('glass');
  ui.instruct('Tap the <b>pencil</b> to trace the outline <b>ABC</b> of the prism.');
  await lab.waitClick(T.pen);
  await T.draw([{ type: 'poly', pts: [A, B, C].map((p) => p.clone()), closed: true, width: 0.0005 }], { speed: 0.18 });
  paper.add({ type: 'text', at: A.clone().add(v2(0, -0.007)), text: 'A', size: 0.006 });
  paper.add({ type: 'text', at: B.clone().add(v2(-0.006, 0.005)), text: 'B', size: 0.006 });
  paper.add({ type: 'text', at: C.clone().add(v2(0.006, 0.005)), text: 'C', size: 0.006 });
  ui.observe('The outline <b>ABC</b> is drawn. AB and AC are the two <b>refracting faces</b>; the angle between them, ∠A = 60°, is the <b>angle of the prism</b>.', { icon: '✏️' });

  /* ------------------------------------------------- rounds */
  for (let k = 0; k < 3; k++) {
    const sub = SUB[k];
    ui.clearReadout();
    if (k > 0) {
      ui.step(5, `Ray ${k + 1}: tap the <b>prism</b> to put it back exactly on its outline ABC.`);
      await lab.waitClick(prism);
      await lab.carry(prism, [0, top, 0], { lift: 0.06, duration: 1.1, rotate: { y: 0 } });
      lab.sfx('glass');
      ui.instruct(`Ray ${k + 1}: choose a different <b>angle of incidence</b>.`);
    } else {
      ui.step(1, 'Choose the <b>angle of incidence ∠i</b> on face AB.', { sub: 'You will trace three rays and compare how much each is deviated.' });
    }
    let chosen = null;
    const seg = ui.control({ type: 'segmented', label: 'Angle of incidence', options: ANGLES.filter((a) => !used.includes(a)).map((a) => ({ value: a, label: `${a}°` })), onChange: (v) => { chosen = v; } });
    await lab.waitUntil(() => chosen !== null, { auto: () => { chosen = ANGLES.find((a) => !used.includes(a)); seg.set(chosen); } });
    ui.clearControls();
    const i = chosen; used.push(i);
    const O = A.clone().lerp(B, T_ON_AB[i]);
    const dI = dirAt(30 - i);          // inward normal of AB is at +30°; the ray comes up from the base side
    const P = O.clone().addScaledVector(dI, -0.07), Q = O.clone().addScaledVector(dI, -0.03);

    await lab.focus({ pos: [O.x - 0.04, 0.2, O.y + 0.13], target: [O.x - 0.035, top, O.y - 0.005] }, 1.2);
    ui.instruct('Tap the <b>pencil</b>: mark the point <b>E</b> on face AB and draw the normal at E.');
    await lab.waitClick(T.pen);
    await T.draw([
      { type: 'line', a: O.clone().addScaledVector(nAB, 0.04), b: O.clone(), dash: [0.002, 0.0014] },
      { type: 'text', at: O.clone().add(v2(0.0, -0.006)).addScaledVector(nAB, 0.004), text: 'E' + sub, size: 0.0048 },
    ]);
    ui.instruct(`Tap the <b>protractor</b> to mark ∠i = <b>${i}°</b> from the normal at E.`);
    await lab.waitClick(T.prot);
    await T.measure({ at: O, refDeg: angOf(nAB), rayDeg: angOf(dI.clone().negate()), label: 'i', key: 'i', roLabel: '∠i (incidence)', arcR: 0.014 });
    paper.add({ type: 'dot', c: O.clone().addScaledVector(dI, -0.047), r: 0.0006 });
    await T.parkProtractor();
    ui.instruct('Tap the <b>pencil</b> to draw the incident ray to E.');
    await lab.waitClick(T.pen);
    await T.draw([
      { type: 'line', a: O.clone().addScaledVector(dI, -0.085), b: O.clone(), arrow: true, arrowAt: 0.3 },
      { type: 'cross', c: P }, { type: 'cross', c: Q },
    ]);
    ui.instruct('Fix pins <b>P</b> and <b>Q</b> upright on the incident ray. Drag each pin onto its cross (or tap it).', { sub: 'Push the pins in vertically; mind the sharp points.' });
    await T.fixPin(pP, P, 'P' + sub);
    await T.fixPin(pQ, Q, 'Q' + sub);

    /* ------------------------------------------ sighting R, S */
    const tr = traceRay(P, dI, bodies);
    const E = tr.events[1].point, dE = tr.dir;
    const inside = O.distanceTo(E);
    const img = (X) => E.clone().addScaledVector(dE, -(X.distanceTo(O) + inside));
    const axis = Math.abs(dE.x) >= Math.abs(dE.y) ? 'z' : 'x';
    const Rt = E.clone().addScaledVector(dE, 0.03), St = E.clone().addScaledVector(dE, 0.075);
    const nudge = (p, s) => { const q = p.clone(); if (axis === 'x') q.x += s; else q.y += s; return q; };
    const R0 = nudge(Rt, k % 2 ? -0.011 : 0.012), S0 = nudge(St, k % 2 ? 0.014 : -0.013);
    if (k === 0) {
      ui.step(2, 'Now look at P and Q from the other side, through face AC.');
      await ui.predict({ q: 'After passing through the prism, the ray will bend…', options: ['towards the base BC of the prism', 'towards the apex A of the prism', 'not at all — it goes straight', 'back towards P'], answer: 0, explain: 'At both faces the ray bends so that, overall, it is deviated towards the base of the prism.' });
    }
    ui.instruct('Tap pins <b>R</b> and <b>S</b> to stick them on the far side of face AC.');
    await T.stickPin(pR, R0, 'R' + sub);
    await T.stickPin(pS, S0, 'S' + sub);
    ui.instruct('Bend down to the level of the prism and look at P and Q <b>through face AC</b>.');
    const [Rm, Sm] = await T.sight({
      imgs: [[pP, img(P)], [pQ, img(Q)]],
      movers: [{ pin: pR, name: 'R' + sub, axis }, { pin: pS, name: 'S' + sub, axis }],
      E, dE, glassObj: prism, text: (nm) => `Through face AC the lower parts of P and Q appear far to one side of their heads. Move pin <b>${nm}</b> until it hides those images.`,
    });
    if (k === 0) ui.observe('Looking through face AC, the images of P and Q are seen in a <b>quite different direction</b> from the pins themselves — the prism has turned the light.', { icon: '👁️' });

    /* ---------------------------------- remove prism, draw path */
    if (k === 0) ui.step(3, 'Tap the <b>prism</b> to remove it. The pins are pulled out and their holes circled.');
    else ui.instruct('Tap the <b>prism</b> to remove it.');
    await lab.waitClick(prism);
    await lab.carry(prism, restPos, { lift: 0.06, duration: 1.1, rotate: { y: 0.3 } });
    const holes = await T.removePins([[pP, 'P' + sub], [pQ, 'Q' + sub], [pR, 'R' + sub, v2(0.006, 0.004)], [pS, 'S' + sub, v2(0.006, 0.004)]]);
    const dEm = Sm.clone().sub(Rm).normalize();
    const F = lineX(Rm, dEm, A, C.clone().sub(A).normalize());   // exit point on face AC
    const M = lineX(O, dI, F, dEm);                                 // incident & emergent rays produced meet here
    ui.instruct('Tap the <b>pencil</b>: join S and R up to face AC (point F), join E to F, and produce the incident and emergent rays until they meet.');
    await lab.waitClick(T.pen);
    await T.draw([
      ...holes,
      { type: 'line', a: F.clone(), b: Sm.clone().addScaledVector(dEm, 0.014), arrow: true, arrowAt: 0.55 },
      { type: 'line', a: O.clone(), b: F.clone(), arrow: true, arrowAt: 0.5 },
      { type: 'text', at: F.clone().addScaledVector(nAC, 0.006).add(v2(0, -0.004)), text: 'F' + sub, size: 0.0048 },
      { type: 'line', a: O.clone().addScaledVector(nAB, -0.02), b: O.clone(), dash: [0.002, 0.0014] },
      { type: 'line', a: F.clone().addScaledVector(nAC, -0.02), b: F.clone().addScaledVector(nAC, 0.035), dash: [0.002, 0.0014] },
      { type: 'line', a: O.clone(), b: M.clone().addScaledVector(dI, 0.035), dash: [0.0012, 0.0016], color: 'rgba(90,90,100,0.65)' },
      { type: 'line', a: F.clone(), b: M.clone().addScaledVector(dEm, -0.012), dash: [0.0012, 0.0016], color: 'rgba(90,90,100,0.65)' },
    ]);
    if (k === 0) ui.observe('The ray bends <b>towards the normal</b> as it enters at face AB and <b>away from the normal</b> as it leaves at face AC — overall it is bent towards the base.', { icon: '↘️', highlight: true });

    /* ------------------------------------------------- measure */
    if (k === 0) ui.step(4, 'Tap the <b>protractor</b> to measure ∠e at F and the angle of deviation ∠D where the produced rays meet.');
    else ui.instruct('Tap the <b>protractor</b> to measure ∠e and ∠D.');
    await lab.waitClick(T.prot);
    await lab.focus({ pos: [(O.x + F.x) / 2 + 0.02, 0.2, 0.16], target: [(O.x + F.x) / 2 + 0.02, top, 0.0] }, 1.1);
    ui.readout('i', '∠i (incidence)', i.toFixed(1), { unit: '°', color: '#0ea5e9' });
    const me = await T.measure({ at: F, refDeg: angOf(nAC), rayDeg: angOf(dEm), label: 'e', key: 'e', roLabel: '∠e (emergence)', color: '#22c55e', arcR: 0.013 });
    const mD = await T.measure({ at: M, refDeg: angOf(dI), rayDeg: angOf(dEm), label: 'D', key: 'D', roLabel: '∠D (deviation)', color: '#ef4444', arcR: 0.016 });
    await T.parkProtractor();
    const sum = i + me - A_DEG;
    table.addRow([`${i}°`, `${me.toFixed(1)}°`, `${mD.toFixed(1)}°`, `${sum.toFixed(1)}°`]);
    results.push({ i, e: me, D: mD });
    lab.sfx('success');
    ui.observe(`∠i = ${i}°: ∠e = ${me.toFixed(1)}°, angle of deviation <b>∠D = ${mD.toFixed(1)}°</b> (check: i + e − A = ${sum.toFixed(1)}°).`, { icon: '📐', highlight: k === 0 });
    await lab.wait(1.2);
    await lab.home(1.2);
  }

  /* ------------------------------------------------ conclusions */
  ui.clearReadout();
  const sorted = results.slice().sort((a, b) => a.i - b.i);
  ui.observe(`∠D changes with ∠i: ${sorted.map((r) => `${r.D.toFixed(1)}°`).join(', ')} for ∠i = ${sorted.map((r) => `${r.i}°`).join(', ')}. It is least when the ray passes through the prism almost symmetrically (∠i ≈ ∠e).`, { icon: '📉', highlight: true });
  ui.observe('In every case the emergent ray is bent <b>towards the base</b> of the prism, and ∠D = ∠i + ∠e − ∠A.', { icon: '🔺' });
  await lab.focus({ pos: [0, 0.34, 0.2], target: [0, 0, 0] }, 1.4);
  await lab.wait(1.5);
  await lab.home(1.2);

  await ui.finish({
    equation: 'r<sub>1</sub> + r<sub>2</sub> = A &nbsp;·&nbsp; ∠D = ∠i + ∠e − ∠A &nbsp;·&nbsp; A = 60°, n ≈ 1.5',
    conclusion: 'A ray entering a glass prism bends <b>towards the normal</b> at the first face and <b>away from the normal</b> at the second face. Because the two faces are inclined, the emergent ray is <b>not parallel</b> to the incident ray — it is turned towards the base through the <b>angle of deviation</b> ∠D = ∠i + ∠e − ∠A, which depends on the angle of incidence.',
    quiz: [
      { q: 'A ray falls on a 60° prism at ∠i = 50° and emerges at ∠e = 47°. The angle of deviation is…', options: ['37°', '47°', '50°', '157°'], answer: 0, explain: '∠D = i + e − A = 50° + 47° − 60° = 37°.' },
      { q: 'Unlike a glass slab, a prism deviates light because…', options: ['its refracting faces are not parallel', 'glass is denser than air', 'it is thicker', 'it reflects the light'], answer: 0, explain: 'In a slab the second face undoes the bending of the first. In a prism the faces are inclined at angle A, so the bendings add up.' },
      { q: 'Inside the prism the ray travels from glass to air at face AC. There it bends…', options: ['towards the normal', 'away from the normal', 'along the normal', 'back into the glass always'], answer: 1, explain: 'Going from a denser medium (glass) to a rarer one (air), light bends away from the normal.' },
    ],
  });
}

void THREE;
