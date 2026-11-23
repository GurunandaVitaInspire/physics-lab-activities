// Activity 11.1 — Ohm's law: V across a nichrome wire XY against the current I through it, for 1–4 cells.
// Model: n cells of e.m.f. 1.5 V and internal resistance 0.3 Ω each, nichrome wire R = 5.0 Ω (warms slightly
// while the key is in), ideal meters. I = 1.5n / (R + 0.3n), V = I·R, so V/I = R for every reading.
import * as THREE from 'three';
import {
  circuitBoard, placeMark, batteryHolder, dryCell, plugKey, Meter, RANGE, wireStrip, Lead, WIRE, CurrentFlow, worldPos,
} from '../engine/apparatus/electric.js';

export const config = { camera: { pos: [0, 0.5, 0.6], target: [0, 0.02, 0.04] }, bench: 'epoxy' };

export const steps = [
  'Connect the ammeter in series',
  'Connect the voltmeter across XY',
  'Put one cell in the holder',
  'Insert the key and read the meters',
  'Repeat with 2, 3 and 4 cells',
  'Plot the V–I graph and find R',
];

const R0 = 5.0;       // resistance of the nichrome wire XY (Ω)
const R_CELL = 0.3;   // internal resistance of each dry cell (Ω)
const EMF = 1.5;      // e.m.f. of each cell (V)

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(circuitBoard({ w: 0.64, d: 0.38 }), [0, 0, 0]);
  const T = board.topY;

  const holder = lab.add(batteryHolder({ slots: 4 }), [-0.06, T, -0.125]);
  lab.pickable(holder, 'Cell holder (4 cells in series)');
  const key = lab.add(plugKey(), [0.2, T, -0.125]);
  lab.pickable(key.plug, 'Plug key');

  const xy = lab.add(wireStrip({ len: 0.2, wireR: 0.0008, title: 'Nichrome wire', sub: 'length 20 cm · dia 0.24 mm', ends: ['X', 'Y'] }), [-0.02, T, 0.125]);
  lab.pickable(xy, 'Nichrome wire XY');

  const amm = lab.add(new Meter({ letter: 'A', title: 'DC AMMETER', ranges: [RANGE.A1] }), [0.22, 0, 0.258]);
  const volt = lab.add(new Meter({ letter: 'V', title: 'DC VOLTMETER', ranges: [RANGE.V5] }), [-0.22, 0, 0.258]);
  lab.pickable(amm, 'Ammeter (0–1 A)'); lab.pickable(volt, 'Voltmeter (0–5 V)');
  const markA = lab.add(placeMark({ w: 0.125, d: 0.1, label: 'A' }), [0.2, T, 0.025]);
  const markV = lab.add(placeMark({ w: 0.125, d: 0.1, label: 'V' }), [-0.2, T, 0.025]);

  const cells = [-0.095, -0.045, 0.005, 0.055].map((x) => {
    const c = lab.add(dryCell(), [x, 0.0165, 0.255]);
    c.rotation.y = Math.PI / 2; lab.pickable(c, 'Dry cell, 1.5 V');
    return c;
  });

  /* ------------------------------------------------------------ wiring */
  const P = (obj, local) => worldPos(obj, local);
  const tap = (k) => P(holder, holder.tapLocal(k));
  const keyL = P(key, key.termLocal(0)), keyR = P(key, key.termLocal(1));
  const X = P(xy, xy.endLocal(0)), Y = P(xy, xy.endLocal(1));
  const mk = (color, opt = {}) => lab.add(new Lead({ color, ...opt }));
  const L1 = mk(WIRE.red, { clipB: true });   // battery + (tap k) … key
  const L2 = mk(WIRE.red);                     // key … ammeter +
  const L3 = mk(WIRE.yellow);                  // ammeter − … Y
  const L4 = mk(WIRE.black);                   // X … battery −
  const L5 = mk(WIRE.red, { clipB: true });    // voltmeter + … Y
  const L6 = mk(WIRE.black, { clipB: true });  // voltmeter − … X
  L4.set(X, tap(0), { floorY: T, via: [[-0.16, 0.16], [-0.282, 0.11], [-0.29, -0.03], [-0.24, -0.088]] });
  [L1, L2, L3, L5, L6].forEach((l) => { l.reveal = 0; });

  let n = 0;          // cells in the holder
  let heat = 0;       // 0 … ~1, wire warming while the key is in
  let closedFor = 0, warned = false;
  const Rw = () => R0 * (1 + 0.01 * heat);
  const current = () => (key.closed && n > 0 ? (EMF * n) / (Rw() + R_CELL * n) : 0);

  const flow = lab.add(new CurrentFlow());
  let showFlow = false, metersOn = false;
  const flowPath = () => {
    if (!n) return;
    const pts = [
      ...L1.points(40).reverse(),
      keyL.clone().add(new THREE.Vector3(0, 0.012, 0)), keyR.clone().add(new THREE.Vector3(0, 0.012, 0)),
      ...L2.points(30),
      P(amm, amm.termLocal('+')).add(new THREE.Vector3(0, 0.02, 0)), P(amm, amm.termLocal('-')).add(new THREE.Vector3(0, 0.02, 0)),
      ...L3.points(40), X.clone().setX(Y.x), X.clone(),
      ...L4.points(60),
      P(holder, holder.slotLocal(0)).setX(tap(0).x), P(holder, holder.slotLocal(n - 1)).setX(tap(n).x), tap(n),
    ];
    flow.setPath(pts);
  };
  // NB: X.clone().setX(Y.x) is Y at wire height — current enters the nichrome at Y and leaves at X.

  lab.onUpdate((dt) => {
    const I = current();
    const V = I * Rw();
    amm.setValue(I); volt.setValue(V);
    heat += (I * I * 0.04 - heat * 0.05) * dt;
    if (key.closed) {
      closedFor += dt;
      if (closedFor > 20 && !warned) { warned = true; ui.toast('The wire is getting warm — take the key out between readings!', 'warn'); }
    } else { closedFor = 0; warned = false; }
    flow.on = showFlow && I > 0.01; flow.speed = 0.02 + I * 0.07;
    if (metersOn) {
      ui.readout('I', 'Ammeter', Math.max(0, amm.reading).toFixed(2), { unit: ' A', color: '#ef4444' });
      ui.readout('V', 'Voltmeter', Math.max(0, volt.reading).toFixed(2), { unit: ' V', color: '#38bdf8' });
    }
  });

  ui.control({ type: 'toggle', label: 'Show current direction', value: false, onChange: (v) => { showFlow = v; } });
  const table = ui.table(['Cells', 'Current I (A)', 'P.d. V (V)', 'V / I (Ω)']);
  let graph = null;

  const meterView = (m, d = 0.17) => {
    const c = P(m, [0, 0.04, 0.01]);
    return { pos: [c.x + 0.01, c.y + d * 0.86, c.z + d * 0.52], target: [c.x, c.y - 0.004, c.z] };
  };
  const bothView = { pos: [0, 0.27, 0.34], target: [0, 0.045, 0.03] };

  await ui.ready();

  /* -------------------------------------------- 1. ammeter in series */
  ui.step(0, 'Drag the <b>ammeter</b> onto the board, on the place marked <b>A</b>.', { sub: 'An ammeter is always joined in <b>series</b>, so the whole current flows through it. Its + terminal must face the + side of the battery.' });
  await lab.waitDrop(amm, markA, { radius: 0.1 });
  markA.visible = false;
  await lab.carry(amm, [0.2, T, 0.03], { lift: 0.07, duration: 1.1 });
  lab.sfx('drop');
  L2.set(keyR, P(amm, amm.termLocal('+')), { floorY: T, via: [[0.255, -0.09], [0.262, -0.035]] });
  L3.set(P(amm, amm.termLocal('-')), Y, { floorY: T, via: [[0.13, -0.035], [0.125, 0.06], [0.11, 0.115]] });
  await Promise.all([L2.grow(lab, 0.7), L3.grow(lab, 0.9)]);
  lab.sfx('click');
  ui.observe('The ammeter is joined <b>in series</b>: key → <b>+</b> terminal (red) … <b>−</b> terminal → end Y of the nichrome wire.', { icon: '🔌' });

  /* -------------------------------------------- 2. voltmeter across XY */
  ui.step(1, 'Now drag the <b>voltmeter</b> onto the place marked <b>V</b>.', { sub: 'A voltmeter is joined in <b>parallel</b> — its two leads clip on to the two ends of the wire XY.' });
  await lab.waitDrop(volt, markV, { radius: 0.1 });
  markV.visible = false;
  await lab.carry(volt, [-0.2, T, 0.03], { lift: 0.07, duration: 1.1 });
  lab.sfx('drop');
  L5.set(P(volt, volt.termLocal('+')), Y.clone().add(new THREE.Vector3(0, 0.004, 0)), { floorY: T, via: [[-0.115, -0.035], [-0.01, 0.045], [0.075, 0.088]], liftB: 0.04 });
  L6.set(P(volt, volt.termLocal('-')), X.clone().add(new THREE.Vector3(0, 0.004, 0)), { floorY: T, via: [[-0.255, -0.06], [-0.135, -0.03], [-0.122, 0.07]], liftB: 0.04 });
  await Promise.all([L5.grow(lab, 0.9), L6.grow(lab, 0.9)]);
  lab.sfx('click');
  metersOn = true;
  ui.observe('The voltmeter is joined <b>in parallel across XY</b>: its + lead to Y (where the current enters the wire) and its − lead to X.', { icon: '🔌' });

  /* -------------------------------------------- 3. first cell */
  ui.step(2, 'Drag <b>one dry cell</b> into the cell holder.', { sub: 'Each cell gives 1.5 V. The red clip lead then connects its + terminal to the key.' });
  async function addCell() {
    const c = cells[n];
    await lab.waitDrop(c, holder, { radius: 0.14 });
    const s = P(holder, holder.slotLocal(n));
    await lab.carry(c, [s.x, s.y, s.z], { lift: 0.06, duration: 1.0, rotate: { y: 0 } });
    lab.unpickable(c); lab.sfx('drop');
    holder.cells.push(c);
    n++;
    if (n === 1) { L1.set(keyL, tap(1), { floorY: T }); await L1.grow(lab, 0.7); }
    else {
      const from = tap(n - 1), to = tap(n), o = { t: 0 };
      await lab.tween(o, { t: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: () => L1.set(keyL, from.clone().lerp(to, o.t).add(new THREE.Vector3(0, Math.sin(o.t * Math.PI) * 0.03, 0)), { floorY: T }) });
    }
    lab.sfx('click');
    flowPath();
    ui.readout('n', 'Cells', `${n} × 1.5 V`, { color: '#f59e0b' });
  }
  await addCell();
  ui.observe('One cell is in the holder and its + terminal is clipped to the key. The circuit is still <b>open</b> — both needles stay at zero.', { icon: '🔋' });

  /* -------------------------------------------- 4. readings */
  graph = ui.graph({ xLabel: 'Current I (A)', yLabel: 'Potential difference V (V)', xMax: 1, yMax: 5, title: 'V–I graph for wire XY' });
  graph.add(0, 0);
  const rows = [];

  async function reading(stepIdx) {
    ui.instruct('Tap the <b>plug key</b> to insert it and close the circuit.', { sub: 'Watch both needles swing, overshoot a little and settle.' });
    await lab.waitClick(key.plug);
    await key.insert(lab);
    await lab.focus(bothView, 1.1);
    await lab.waitUntil(() => amm.settled && volt.settled);
    ui.instruct('Tap the <b>meters</b> to take the readings.', { sub: 'Look straight down at each needle so it hides its image in the mirror strip — that removes parallax error.' });
    await lab.waitClick([amm, volt]);
    const I = current(), V = I * Rw();
    const Ir = Math.round(I * 100) / 100, Vr = Math.round(V * 20) / 20;
    await lab.focus(meterView(amm), 0.9);
    const tA = lab.tag(amm, `I = ${Ir.toFixed(2)} A`, { offset: [0, 0.09, 0], cls: 'big' });
    await lab.wait(1.4);
    await lab.focus(meterView(volt), 1.0);
    const tV = lab.tag(volt, `V = ${Vr.toFixed(2)} V`, { offset: [0, 0.09, 0], cls: 'big' });
    await lab.wait(1.4);
    const ratio = Vr / Ir;
    table.addRow([`${n} (${(EMF * n).toFixed(1)} V)`, Ir.toFixed(2), Vr.toFixed(2), ratio.toFixed(2)]);
    graph.add(Ir, Vr);
    rows.push({ n, I: Ir, V: Vr, R: ratio });
    lab.sfx('success');
    await lab.home(1);
    lab.untag(tA); lab.untag(tV);
    ui.instruct('Remove the <b>plug key</b> now.', { sub: 'Current heats the wire; a hot wire has a higher resistance, which would spoil the next reading.' });
    await lab.waitClick(key.plug);
    await key.remove(lab);
    return { I: Ir, V: Vr, ratio };
  }

  ui.step(3, 'Insert the key and read both meters.');
  const r1 = await reading(3);
  ui.observe(`With 1 cell: I = <b>${r1.I.toFixed(2)} A</b> and V = <b>${r1.V.toFixed(2)} V</b>, so V/I = <b>${r1.ratio.toFixed(1)} Ω</b>.`, { icon: '📏', highlight: true });

  ui.step(4, 'Add a <b>second cell</b> to the holder.', { sub: 'Always take the key out before changing the circuit.' });
  await ui.predict({
    q: 'With 2 cells instead of 1, the current through the nichrome wire will…',
    options: ['Become half', 'Stay the same', 'Become about double', 'Become four times'],
    answer: 2,
    explain: 'Doubling the potential difference across the same wire doubles the current through it (V ∝ I).',
  });
  await addCell();
  const r2 = await reading(4);
  ui.observe(`With 2 cells the voltmeter reads <b>${r2.V.toFixed(2)} V</b> and the current is <b>${r2.I.toFixed(2)} A</b> — both about <b>double</b> the first reading; V/I is again ${r2.ratio.toFixed(1)} Ω.`, { icon: '📈', highlight: true });

  for (let k = 3; k <= 4; k++) {
    ui.instruct(`Add cell number <b>${k}</b> to the holder.`, { sub: 'Key out first — then drag the cell in.' });
    await addCell();
    await reading(4);
  }
  const last = rows[rows.length - 1];
  ui.observe(`With 4 cells (6.0 V marked) the voltmeter shows only <b>${last.V.toFixed(2)} V</b> across XY: each cell has a small <b>internal resistance</b> (≈ 0.3 Ω) that uses up a little of its voltage. V/I for the wire is still about ${last.R.toFixed(1)} Ω.`, { icon: '🔋' });

  /* -------------------------------------------- 5. graph & R */
  ui.step(5, 'Look at the V–I graph in your lab record. What is the <b>slope V/I</b> of the line?', { sub: 'Choose the value in the panel below the bench.' });
  await lab.focus({ pos: [0.0, 0.34, 0.42], target: [0, 0.02, 0.05] }, 1.2);
  let choice = null;
  const seg = ui.control({ type: 'segmented', label: 'Slope V / I =', options: [{ value: 0.2, label: '0.2 Ω' }, { value: 1, label: '1 Ω' }, { value: 5, label: '5 Ω' }, { value: 20, label: '20 Ω' }], value: null, onChange: (v) => { choice = v; if (v !== 5) ui.toast('Check again: divide V by I for any row of your table.', 'warn'); } });
  await lab.waitUntil(() => choice === 5, { auto: () => { choice = 5; seg.set(5); } });
  lab.sfx('success');
  const mean = rows.reduce((a, r) => a + r.R, 0) / rows.length;
  ui.observe(`The points lie on a <b>straight line through the origin</b>, so <b>V ∝ I</b>. The constant ratio V/I = <b>${mean.toFixed(1)} Ω</b> is the <b>resistance R</b> of the nichrome wire.`, { icon: '📊', highlight: true });
  await lab.home(1.2);
  ui.clearControls();

  await ui.finish({
    equation: 'V ∝ I &nbsp;⇒&nbsp; V = I R &nbsp;·&nbsp; R = V / I ≈ 5 Ω',
    conclusion: 'The current through the nichrome wire is <b>directly proportional</b> to the potential difference across its ends, provided its temperature does not change — this is <b>Ohm’s law</b>. The V–I graph is a straight line through the origin and its slope V/I is the <b>resistance</b> of the wire (about 5 Ω here). 1 ohm is the resistance of a conductor that carries 1 A when 1 V is applied across it.',
    quiz: [
      { q: 'The potential difference across a resistor is doubled (temperature constant). The current through it…', options: ['Halves', 'Stays the same', 'Doubles', 'Becomes four times'], answer: 2, explain: 'By Ohm’s law I = V/R, so doubling V doubles I.' },
      { q: 'A wire carries 0.5 A when 2.5 V is applied across it. Its resistance is…', options: ['0.2 Ω', '1.25 Ω', '5 Ω', '12.5 Ω'], answer: 2, explain: 'R = V/I = 2.5 V ÷ 0.5 A = 5 Ω.' },
      { q: 'Why is the plug key taken out between readings?', options: ['To protect the voltmeter', 'Current heats the wire and changes its resistance', 'To reverse the current', 'The cells must be recharged'], answer: 1, explain: 'A current heats the wire; the resistance of a hot wire is higher, so Ohm’s law holds only at constant temperature.' },
    ],
  });
}
