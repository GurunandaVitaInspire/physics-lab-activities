// Activities 11.3–11.4 — Resistors in series and in parallel.
// Battery: 4 dry cells, e.m.f. 6.0 V, internal resistance 4 × 0.3 = 1.2 Ω. R1 = 5 Ω, R2 = 10 Ω, R3 = 15 Ω. Ideal meters.
// Series:   Rs = 30 Ω,      I = 6/(30 + 1.2) = 0.192 A, V1 = 0.96, V2 = 1.92, V3 = 2.88, V = 5.77 V.
// Parallel: Rp = 30/11 Ω,   I = 6/(2.727 + 1.2) = 1.528 A, V = 4.17 V, I1 = 0.83, I2 = 0.42, I3 = 0.28 A.
import * as THREE from 'three';
import {
  circuitBoard, placeMark, batteryHolder, dryCell, plugKey, Meter, RANGE, powerResistor, connectorStrip, Lead, WIRE, CurrentFlow, worldPos,
} from '../engine/apparatus/electric.js';

export const config = { camera: { pos: [0, 0.56, 0.7], target: [0, 0.02, 0.06] } };

export const steps = [
  'Join R1, R2 and R3 in series',
  'Close the key and read the current',
  'Move the ammeter to other places in the series',
  'Measure the p.d. across each resistor and across all three',
  'Re-join the resistors in parallel',
  'Measure the total current and the p.d.',
  'Measure the current in each branch',
  'Compare and conclude',
];

const EMF = 6.0, R_INT = 1.2;
const RS = [5, 10, 15];
const SER_X = [-0.13, -0.01, 0.11], SER_Z = 0.03;
const PAR_Z = [-0.04, 0.03, 0.1];

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(circuitBoard({ w: 0.66, d: 0.42 }), [0, 0, 0]);
  const T = board.topY;
  const holder = lab.add(batteryHolder({ slots: 4 }), [0.08, T, -0.155]);
  holder.rotation.y = Math.PI; // + end towards −x
  for (let i = 0; i < 4; i++) { const c = dryCell(); c.position.copy(holder.slotLocal(i)); holder.add(c); }
  lab.pickable(holder, 'Battery: 4 cells (6 V)');
  const key = lab.add(plugKey(), [-0.2, T, -0.155]);
  lab.pickable(key.plug, 'Plug key');
  const amm = lab.add(new Meter({ letter: 'A', title: 'DC AMMETER', ranges: [RANGE.A1, RANGE.A3], plusLeft: true }), [-0.25, T, -0.045]);
  const volt = lab.add(new Meter({ letter: 'V', title: 'DC VOLTMETER', ranges: [RANGE.V10], plusLeft: true }), [0.255, T, 0.08]);
  lab.pickable(amm, 'Ammeter (0–1 A / 0–3 A)'); lab.pickable(volt, 'Voltmeter (0–10 V)');
  const res = RS.map((ohm, i) => {
    const r = lab.add(powerResistor({ ohms: ohm, name: `R${i + 1}` }), [-0.15 + i * 0.15, 0, 0.275]);
    lab.pickable(r, `R${i + 1} = ${ohm} Ω`); return r;
  });
  const serMarks = SER_X.map((x, i) => lab.add(placeMark({ w: 0.1, d: 0.036, label: `R${i + 1}` }), [x, T, SER_Z]));
  const parMarks = PAR_Z.map((z, i) => { const m = lab.add(placeMark({ w: 0.1, d: 0.036, label: `R${i + 1}` }), [0, T, z]); m.visible = false; return m; });
  const ammMarks = { G1: [-0.07, 0.135], G2: [0.05, 0.135], B: [0.15, 0.17], G0: [-0.25, -0.045] };
  const gMarks = ['G1', 'G2'].map((g) => { const m = lab.add(placeMark({ w: 0.12, d: 0.09, label: 'A' }), [ammMarks[g][0], T, ammMarks[g][1] - 0.005]); m.visible = false; return m; });
  const Pstrip = connectorStrip({ n: 4, gap: 0.07 }), Qstrip = connectorStrip({ n: 4, gap: 0.07 });
  lab.add(Pstrip, [-0.085, T, -0.005]); lab.add(Qstrip, [0.085, T, -0.005]);
  Pstrip.scale.setScalar(0.001); Qstrip.scale.setScalar(0.001); Pstrip.visible = Qstrip.visible = false;

  /* ------------------------------------------------------------ wiring */
  const P = (o, l) => worldPos(o, l);
  const up = (v, h = 0.004) => v.clone().add(new THREE.Vector3(0, h, 0));
  const tap = (k) => P(holder, holder.tapLocal(k));
  const keyL = () => P(key, key.termLocal(0)), keyR = () => P(key, key.termLocal(1));
  const rEnd = (i, s) => P(res[i], res[i].endLocal(s));
  const pPost = (i) => P(Pstrip, Pstrip.postLocal(i)), qPost = (i) => P(Qstrip, Qstrip.postLocal(i));
  const aT = (s) => P(amm, amm.termLocal(s)), vT = (s) => P(volt, volt.termLocal(s));

  const state = { mode: 'none', ammAt: 'G0', voltAt: null };
  const leads = new Map();
  const getLead = (name, color, clip) => { if (!leads.has(name)) { const l = lab.add(new Lead({ color, clipB: clip })); l.visible = false; leads.set(name, l); } return leads.get(name); };
  function connections() {
    const c = [{ n: 'bat', a: keyR(), b: tap(4), color: WIRE.red, clip: true }];
    const ret = { n: 'ret', color: WIRE.black, clip: true };
    if (state.mode === 'series') {
      if (state.ammAt === 'G0') c.push({ n: 'g0a', a: keyL(), b: aT('+'), color: WIRE.red }, { n: 'g0b', a: aT('-'), b: rEnd(0, 0), color: WIRE.yellow, via: [[-0.2, -0.0], [-0.185, 0.035]] });
      else c.push({ n: 'g0', a: keyL(), b: rEnd(0, 0), color: WIRE.red, via: [[-0.18, -0.09], [-0.175, -0.0]] });
      for (const [g, i] of [['G1', 0], ['G2', 1]]) {
        if (state.ammAt === g) c.push({ n: g + 'a', a: rEnd(i, 1), b: aT('+'), color: WIRE.yellow }, { n: g + 'b', a: aT('-'), b: rEnd(i + 1, 0), color: WIRE.yellow });
        else c.push({ n: g, a: rEnd(i, 1), b: rEnd(i + 1, 0), color: WIRE.yellow });
      }
      c.push({ ...ret, a: rEnd(2, 1), b: up(tap(0)), via: [[0.17, 0.0], [0.19, -0.1]] });
    } else if (state.mode === 'parallel') {
      if (state.ammAt === 'P0') c.push({ n: 'g0a', a: keyL(), b: aT('+'), color: WIRE.red }, { n: 'p0b', a: aT('-'), b: pPost(0), color: WIRE.yellow, via: [[-0.17, -0.05], [-0.12, -0.1]] });
      else c.push({ n: 'p0', a: keyL(), b: pPost(0), color: WIRE.red });
      for (let k = 0; k < 3; k++) {
        c.push({ n: 'pl' + k, a: pPost(k + 1), b: rEnd(k, 0), color: WIRE.yellow });
        if (state.ammAt === 'B' + k) c.push({ n: 'qa' + k, a: rEnd(k, 1), b: aT('+'), color: WIRE.yellow }, { n: 'qb' + k, a: aT('-'), b: qPost(k + 1), color: WIRE.yellow });
        else c.push({ n: 'ql' + k, a: rEnd(k, 1), b: qPost(k + 1), color: WIRE.yellow });
      }
      c.push({ ...ret, a: qPost(0), b: up(tap(0)) });
    }
    if (state.voltAt) {
      const [pa, pb] = state.voltAt();
      c.push({ n: 'v+', a: vT('+'), b: up(pa, 0.006), color: WIRE.red, clip: true, via: [[0.19, 0.0]] }, { n: 'v-', a: vT('-'), b: up(pb, 0.006), color: WIRE.black, clip: true, via: [[0.3, 0.0], [0.2, -0.02]] });
    }
    return c;
  }
  async function rewire({ grow = true } = {}) {
    const cs = connections(); const names = new Set(cs.map((x) => x.n));
    for (const [n, l] of leads) if (!names.has(n)) l.visible = false;
    const g = [];
    for (const x of cs) {
      const l = getLead(x.n, x.color, x.clip); const was = l.visible;
      l.visible = true; l.set(x.a, x.b, { floorY: T, via: x.via || [], liftB: x.clip ? 0.04 : undefined });
      if (!was && grow) g.push(l.grow(lab, 0.6)); else if (!was) l.reveal = 1;
    }
    await Promise.all(g);
    updateFlows();
  }

  /* ------------------------------------------------------------ physics */
  const solve = () => {
    if (!key.closed) return { I: 0, V: 0, br: [0, 0, 0] };
    if (state.mode === 'series') { const I = EMF / (RS[0] + RS[1] + RS[2] + R_INT); return { I, V: I * 30, br: RS.map((r) => I * r) }; }
    if (state.mode === 'parallel') { const Rp = 1 / RS.reduce((a, r) => a + 1 / r, 0); const I = EMF / (Rp + R_INT); const V = I * Rp; return { I, V, br: RS.map((r) => V / r) }; }
    return { I: 0, V: 0, br: [0, 0, 0] };
  };
  let voltRead = () => 0; // p.d. between the voltmeter clips
  const ammCurrent = (s) => (state.ammAt.startsWith('B') ? s.br[+state.ammAt[1]] / 1 : s.I);
  const flows = [lab.add(new CurrentFlow()), lab.add(new CurrentFlow()), lab.add(new CurrentFlow()), lab.add(new CurrentFlow()), lab.add(new CurrentFlow())];
  let showFlow = false;
  function updateFlows() {
    const L = (n) => (leads.get(n)?.visible ? leads.get(n).points(30) : []);
    if (state.mode === 'series') {
      const pts = [...L('bat').reverse(), up(keyR(), 0.012), up(keyL(), 0.012), ...L('g0a'), ...L('g0b'), ...L('g0')];
      for (let i = 0; i < 3; i++) { pts.push(up(rEnd(i, 0), 0.008), up(rEnd(i, 1), 0.008)); if (i < 2) { const g = 'G' + (i + 1); pts.push(...L(g + 'a'), ...L(g + 'b'), ...L(g)); } }
      pts.push(...L('ret'), tap(0), tap(4));
      flows[0].setPath(pts); flows.forEach((f, k) => { f.use = k === 0 ? 'I' : null; });
    } else if (state.mode === 'parallel') {
      flows[0].setPath([...L('bat').reverse(), up(keyR(), 0.012), up(keyL(), 0.012), ...L('g0a'), ...L('p0b'), ...L('p0'), up(pPost(0), 0.006), up(pPost(3), 0.006)]);
      for (let k = 0; k < 3; k++) flows[k + 1].setPath([up(pPost(k + 1), 0.006), ...L('pl' + k), up(rEnd(k, 0), 0.008), up(rEnd(k, 1), 0.008), ...L('qa' + k), ...L('qb' + k), ...L('ql' + k)]);
      flows[4].setPath([up(qPost(3), 0.006), up(qPost(0), 0.006), ...L('ret'), tap(0), tap(4)]);
      flows.forEach((f, k) => { f.use = k === 0 || k === 4 ? 'I' : k - 1; });
    }
  }
  lab.onUpdate(() => {
    const s = solve();
    amm.setValue(ammCurrent(s));
    volt.setValue(state.voltAt ? voltRead(s) : 0);
    flows.forEach((f) => { const I = f.use === 'I' ? s.I : f.use === null || f.use === undefined ? 0 : s.br[f.use]; f.on = showFlow && I > 0.01; f.speed = 0.02 + I * 0.08; });
    ui.readout('I', 'Ammeter', Math.max(0, amm.reading).toFixed(2), { unit: ' A', color: '#ef4444' });
    ui.readout('V', 'Voltmeter', Math.max(0, volt.reading).toFixed(2), { unit: ' V', color: '#38bdf8' });
  });
  ui.control({ type: 'toggle', label: 'Show current direction', value: false, onChange: (v) => { showFlow = v; } });

  const view = (m, d = 0.17) => { const c = P(m, [0, 0.04, 0.01]); return { pos: [c.x + 0.01, c.y + d * 0.86, c.z + d * 0.52], target: [c.x, c.y - 0.004, c.z] }; };
  const rd = (v, step) => Math.round(v / step) * step;

  async function keyIn() { ui.instruct('Tap the <b>plug key</b> to close the circuit.'); await lab.waitClick(key.plug); await key.insert(lab); }
  async function keyOut(msg = 'Take the <b>plug key</b> out before you re-wire.') { ui.instruct(msg); await lab.waitClick(key.plug); await key.remove(lab); }
  async function readAmm(label) {
    await lab.focus(view(amm), 0.9);
    await lab.waitUntil(() => amm.settled);
    ui.instruct('Tap the <b>ammeter</b> to read it.', { sub: label });
    await lab.waitClick(amm);
    const I = rd(ammCurrent(solve()), 0.01);
    const tg = lab.tag(amm, `I = ${I.toFixed(2)} A`, { offset: [0, 0.09, 0], cls: 'big' });
    await lab.wait(1.3); lab.untag(tg);
    return I;
  }
  async function readVolt(pair, label) {
    state.voltAt = pair; voltRead = (s) => { const [, , v] = pair(); return v(s); };
    await rewire();
    await lab.focus(view(volt), 0.9);
    await lab.waitUntil(() => volt.settled);
    const V = rd(voltRead(solve()), 0.05);
    const tg = lab.tag(volt, `${label}: V = ${V.toFixed(2)} V`, { offset: [0, 0.09, 0], cls: 'big' });
    await lab.wait(1.4); lab.untag(tg);
    return V;
  }
  async function placeResistors(marks, positions) {
    for (let i = 0; i < 3; i++) {
      marks[i].visible = true;
      await lab.waitDrop(res[i], marks[i], { radius: 0.07 });
      await lab.carry(res[i], positions[i], { lift: 0.05, duration: 0.9 });
      marks[i].visible = false; lab.sfx('drop');
    }
  }
  async function moveAmm(to, markObj) {
    if (markObj) { markObj.visible = true; await lab.waitDrop(amm, markObj, { radius: 0.09 }); markObj.visible = false; }
    state.ammAt = to.id;
    await lab.carry(amm, [to.x, T, to.z], { lift: 0.06, duration: 0.9 });
    lab.sfx('drop');
    await rewire();
  }

  const tS = ui.table(['Series circuit', 'I (A)', 'V (V)'], { title: 'Series: R1 = 5 Ω, R2 = 10 Ω, R3 = 15 Ω' });
  await ui.ready();

  /* ------------------------------------------ 1. series */
  ui.step(0, 'Drag <b>R1</b>, <b>R2</b> and <b>R3</b> onto the board, one after another, on the marked places.', { sub: 'End to end — one path for the current: this is a series combination.' });
  await placeResistors(serMarks, SER_X.map((x) => [x, T, SER_Z]));
  state.mode = 'series';
  await rewire();
  lab.sfx('click');
  ui.observe('R1, R2 and R3 are joined <b>end to end</b> in one line with the battery, the plug key and the ammeter — a <b>series</b> circuit.', { icon: '🔗' });

  /* ------------------------------------------ 2. current */
  ui.step(1, 'Close the key and read the ammeter (between the key and R1).');
  await keyIn();
  const I0 = await readAmm('Ammeter between the key and R1.');
  tS.addRow(['Ammeter between key and R1', I0.toFixed(2), '—']);
  ui.observe(`The current in the series circuit is <b>I = ${I0.toFixed(2)} A</b>.`, { icon: '📏', highlight: true });
  await keyOut();
  await lab.home(1);

  /* ------------------------------------------ 3. ammeter elsewhere */
  ui.step(2, 'Drag the <b>ammeter</b> to the place marked <b>A</b> between R1 and R2.');
  await ui.predict({
    q: 'If the ammeter is put between R1 and R2 instead, its reading will be…',
    options: ['Smaller — R1 has used up some current', 'The same', 'Larger', 'Zero'],
    answer: 1,
    explain: 'Charge is not used up. In a series circuit the same current flows through every part.',
  });
  await moveAmm({ id: 'G1', x: ammMarks.G1[0], z: ammMarks.G1[1] }, gMarks[0]);
  await keyIn();
  const I1 = await readAmm('Ammeter between R1 and R2.');
  tS.addRow(['Ammeter between R1 and R2', I1.toFixed(2), '—']);
  await keyOut();
  ui.instruct('Now drag the ammeter to the place between <b>R2 and R3</b>.');
  await lab.home(0.8);
  await moveAmm({ id: 'G2', x: ammMarks.G2[0], z: ammMarks.G2[1] }, gMarks[1]);
  await keyIn();
  const I2 = await readAmm('Ammeter between R2 and R3.');
  tS.addRow(['Ammeter between R2 and R3', I2.toFixed(2), '—']);
  ui.observe(`The ammeter reads <b>${I1.toFixed(2)} A</b> and <b>${I2.toFixed(2)} A</b> — exactly the same as before. <b>The current is the same in every part of a series circuit.</b>`, { icon: '🟰', highlight: true });

  /* ------------------------------------------ 4. voltages */
  ui.step(3, 'With the key in, tap <b>R1</b> to clip the voltmeter across it.', { sub: 'The voltmeter + clip goes to the end where the current enters.' });
  await lab.home(0.8);
  const Vs = [];
  for (let i = 0; i < 3; i++) {
    if (i) ui.instruct(`Now tap <b>R${i + 1}</b>.`);
    await lab.waitClick(res[i]);
    const V = await readVolt(() => [rEnd(i, 0), rEnd(i, 1), (s) => s.br[i]], `R${i + 1}`);
    Vs.push(V); tS.addRow([`Across R${i + 1} (${RS[i]} Ω)`, I2.toFixed(2), V.toFixed(2)]);
    await lab.home(0.7);
  }
  ui.instruct('Now connect the voltmeter across <b>all three</b> — from the left end of R1 to the right end of R3.');
  await ui.waitButton('Clip across R1 + R2 + R3');
  const Vt = await readVolt(() => [rEnd(0, 0), rEnd(2, 1), (s) => s.V], 'R1+R2+R3');
  tS.addRow(['Across R1 + R2 + R3', I2.toFixed(2), Vt.toFixed(2)]);
  const Rs = Vt / I2;
  ui.observe(`V₁ = ${Vs[0].toFixed(2)} V, V₂ = ${Vs[1].toFixed(2)} V, V₃ = ${Vs[2].toFixed(2)} V and across all three V = <b>${Vt.toFixed(2)} V = V₁ + V₂ + V₃</b>. The p.d.s add up, and each is in proportion to its resistance (1 : 2 : 3).`, { icon: '➕', highlight: true });
  ui.observe(`Equivalent resistance R<sub>s</sub> = V/I = ${Vt.toFixed(2)} / ${I2.toFixed(2)} ≈ <b>${Rs.toFixed(0)} Ω = R1 + R2 + R3</b> (5 + 10 + 15).`, { icon: '🧮', highlight: true });
  await keyOut('Take the <b>plug key</b> out — next you will re-join the resistors.');
  state.voltAt = null;

  /* ------------------------------------------ 5. parallel */
  ui.step(4, 'Re-join the resistors <b>in parallel</b>: drag R1, R2 and R3 onto the new marked places, side by side.', { sub: 'Each resistor will connect between the same two connector strips P and Q.' });
  await lab.home(0.8);
  await ui.predict({
    q: 'When the same three resistors are joined in parallel, the total current from the battery will be…',
    options: ['Smaller than in series', 'The same as in series', 'Much larger than in series', 'Zero'],
    answer: 2,
    explain: 'In parallel the current has three paths, so the total resistance is less than even the smallest resistor (5 Ω).',
  });
  state.mode = 'none';
  await rewire({ grow: false });
  await lab.carry(amm, [ammMarks.G0[0], T, ammMarks.G0[1]], { lift: 0.06, duration: 0.9 });
  state.ammAt = 'P0';
  Pstrip.visible = Qstrip.visible = true;
  await Promise.all([lab.tween(Pstrip.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.6)' }), lab.tween(Qstrip.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.6)' })]);
  await placeResistors(parMarks, PAR_Z.map((z) => [0, T, z]));
  state.mode = 'parallel';
  await rewire();
  lab.sfx('click');
  ui.observe('Now one end of every resistor is joined to strip <b>P</b> and the other end to strip <b>Q</b> — three separate paths: a <b>parallel</b> combination.', { icon: '🪜' });
  ui.instruct('The current will be bigger now. Tap the <b>range switch</b> to set the ammeter to <b>0–3 A</b>.', { sub: 'Always choose a range larger than the current you expect.' });
  await lab.focus(view(amm), 0.9);
  await lab.waitClick(amm.knob);
  amm.setRange(1); lab.sfx('switch');

  /* ------------------------------------------ 6. total I and V */
  const tP = ui.table(['Parallel circuit', 'I (A)', 'V (V)'], { title: 'Parallel: same R1, R2, R3' });
  ui.step(5, 'Close the key and read the <b>total current</b>, then the p.d. across the combination.');
  await keyIn();
  const It = await readAmm('Main line, between the key and P (red 0–3 A scale).');
  const Vp = await readVolt(() => [pPost(0), qPost(0), (s) => s.V], 'P–Q');
  tP.addRow(['Main line (total)', It.toFixed(2), Vp.toFixed(2)]);
  ui.observe(`Total current I = <b>${It.toFixed(2)} A</b> — about 8 times the series current — with V = ${Vp.toFixed(2)} V across the combination.`, { icon: '📏', highlight: true });
  await lab.home(0.8);
  ui.instruct('Tap each resistor in turn to clip the voltmeter across it.');
  const Vk = [];
  for (let i = 0; i < 3; i++) {
    await lab.waitClick(res[i]);
    Vk.push(await readVolt(() => [rEnd(i, 0), rEnd(i, 1), (s) => s.V], `R${i + 1}`));
    await lab.home(0.6);
  }
  ui.observe(`Across R1, R2 and R3 the voltmeter reads ${Vk.map((v) => v.toFixed(2)).join(' V, ')} V — <b>the same p.d. across each resistor in parallel</b>.`, { icon: '🟰', highlight: true });
  state.voltAt = null; await rewire();

  /* ------------------------------------------ 7. branch currents */
  ui.step(6, 'Tap <b>R1</b>: the ammeter is moved into the branch of R1 (between R1 and Q).', { sub: 'Your partner takes the key out while the ammeter is re-connected, then puts it back.' });
  const Ib = [];
  for (let i = 0; i < 3; i++) {
    if (i) ui.instruct(`Now tap <b>R${i + 1}</b> to put the ammeter in its branch.`);
    await lab.waitClick(res[i]);
    await key.remove(lab);
    await moveAmm({ id: 'B' + i, x: ammMarks.B[0], z: ammMarks.B[1] });
    await key.insert(lab);
    const I = await readAmm(`Branch current through R${i + 1}.`);
    Ib.push(I); tP.addRow([`Branch R${i + 1} (${RS[i]} Ω)`, I.toFixed(2), Vk[i].toFixed(2)]);
    await lab.home(0.6);
  }
  const sum = Ib.reduce((a, b) => a + b, 0);
  ui.observe(`I₁ = ${Ib[0].toFixed(2)} A, I₂ = ${Ib[1].toFixed(2)} A, I₃ = ${Ib[2].toFixed(2)} A; I₁ + I₂ + I₃ = <b>${sum.toFixed(2)} A = total current</b>. The smallest resistor carries the largest current.`, { icon: '➕', highlight: true });
  await keyOut('Take the <b>plug key</b> out.');

  /* ------------------------------------------ 8. compare */
  const Rp = Vp / It;
  ui.step(7, 'From your parallel readings, what is the equivalent resistance R<sub>p</sub> = V / I?');
  let choice = null;
  const seg = ui.control({ type: 'segmented', label: 'R<sub>p</sub> ≈', options: [{ value: 1, label: '2.7 Ω' }, { value: 2, label: '10 Ω' }, { value: 3, label: '30 Ω' }], value: null, onChange: (v) => { choice = v; if (v !== 1) ui.toast(`Divide V by the total I: ${Vp.toFixed(2)} ÷ ${It.toFixed(2)}.`, 'warn'); } });
  await lab.waitUntil(() => choice === 1, { auto: () => { choice = 1; seg.set(1); } });
  lab.sfx('success');
  ui.observe(`R<sub>p</sub> = ${Vp.toFixed(2)} / ${It.toFixed(2)} ≈ <b>${Rp.toFixed(2)} Ω</b>, and 1/R1 + 1/R2 + 1/R3 = 1/5 + 1/10 + 1/15 = 11/30 gives R<sub>p</sub> = 2.73 Ω — smaller than the smallest resistor.`, { icon: '🧮', highlight: true });
  ui.clearControls();
  await lab.home(1);

  await ui.finish({
    equation: 'Series: R<sub>s</sub> = R₁ + R₂ + R₃ &nbsp;·&nbsp; Parallel: 1/R<sub>p</sub> = 1/R₁ + 1/R₂ + 1/R₃',
    conclusion: 'In <b>series</b> the same current flows through every resistor, the p.d.s add up (V = V₁ + V₂ + V₃) and the total resistance is the sum, 30 Ω. In <b>parallel</b> every resistor has the same p.d., the branch currents add up to the total current (I = I₁ + I₂ + I₃) and the total resistance (≈ 2.7 Ω) is less than the smallest resistor. Household appliances are joined in parallel so each gets the full mains voltage and can be switched on or off on its own.',
    quiz: [
      { q: 'Three resistors of 2 Ω, 3 Ω and 5 Ω are joined in series. The equivalent resistance is…', options: ['0.97 Ω', '5 Ω', '10 Ω', '30 Ω'], answer: 2, explain: 'Rs = 2 + 3 + 5 = 10 Ω.' },
      { q: 'Two 6 Ω resistors are joined in parallel. Their equivalent resistance is…', options: ['12 Ω', '6 Ω', '3 Ω', '1/3 Ω'], answer: 2, explain: '1/Rp = 1/6 + 1/6 = 1/3, so Rp = 3 Ω.' },
      { q: 'In a parallel circuit, which quantity is the same for every resistor?', options: ['The current', 'The potential difference', 'The resistance', 'The power'], answer: 1, explain: 'All branches are connected between the same two points, so each has the same p.d.' },
    ],
  });
}
