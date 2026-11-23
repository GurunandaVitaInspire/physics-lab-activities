// Activity 11.2 — Factors on which the resistance of a conductor depends (length, area of cross-section, material).
// One dry cell (e.m.f. 1.5 V, internal resistance 0.3 Ω), leads + clips 0.02 Ω, ammeter (0–1 A / 0–5 A).
// Wires (R = ρl/A, ρ(nichrome) = 1.10×10⁻⁶ Ω m, ρ(copper) = 1.7×10⁻⁸ Ω m):
//   1: nichrome, l = 10 cm, d = 0.19 mm (A = 2.75×10⁻⁸ m²)  → 4.0 Ω
//   2: nichrome, 2l = 20 cm, same A                          → 8.0 Ω
//   3: nichrome, l, d = 0.26 mm (area 2A)                    → 2.0 Ω
//   4: copper,   l, d = 0.19 mm                              → 0.062 Ω
// I = 1.5 / (R + 0.32).
import * as THREE from 'three';
import {
  circuitBoard, placeMark, batteryHolder, dryCell, plugKey, Meter, RANGE, wireStrip, Lead, WIRE, CurrentFlow, worldPos,
} from '../engine/apparatus/electric.js';

export const config = { camera: { pos: [0, 0.56, 0.76], target: [0, 0.02, 0.1] } };

export const steps = [
  'Connect wire 1 (nichrome, length l)',
  'Close the key and read the current',
  'Replace it with wire 2 (length 2l)',
  'Use wire 3 (length l, but thicker)',
  'Use wire 4 (copper, same size as wire 1)',
  'Compare and conclude',
];

const EMF = 1.5, R_INT = 0.3, R_LEADS = 0.02;
const RHO_NI = 1.1e-6, RHO_CU = 1.7e-8, A0 = 2.75e-8;
const WIRES = [
  { n: 1, title: 'Wire 1 · Nichrome', sub: 'l = 10 cm · d = 0.19 mm', len: 0.1, r: 0.0007, mat: 'nichrome', rho: RHO_NI, L: 0.1, A: A0, desc: ['Nichrome', 'l (10 cm)', 'A (0.19 mm)'], home: [-0.17, 0.245] },
  { n: 2, title: 'Wire 2 · Nichrome', sub: 'l = 20 cm · d = 0.19 mm', len: 0.2, r: 0.0007, mat: 'nichrome', rho: RHO_NI, L: 0.2, A: A0, desc: ['Nichrome', '2l (20 cm)', 'A (0.19 mm)'], home: [0.08, 0.245] },
  { n: 3, title: 'Wire 3 · Nichrome', sub: 'l = 10 cm · d = 0.26 mm', len: 0.1, r: 0.0011, mat: 'nichrome', rho: RHO_NI, L: 0.1, A: 2 * A0, desc: ['Nichrome', 'l (10 cm)', '2A (0.26 mm)'], home: [-0.17, 0.285] },
  { n: 4, title: 'Wire 4 · Copper', sub: 'l = 10 cm · d = 0.19 mm', len: 0.1, r: 0.0007, mat: 'copper', rho: RHO_CU, L: 0.1, A: A0, desc: ['Copper', 'l (10 cm)', 'A (0.19 mm)'], home: [0.04, 0.285] },
];
WIRES.forEach((w) => { w.R = (w.rho * w.L) / w.A; });

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(circuitBoard({ w: 0.64, d: 0.38 }), [0, 0, 0]);
  const T = board.topY;
  const holder = lab.add(batteryHolder({ slots: 1 }), [0.06, T, -0.125]);
  const cell = dryCell(); cell.position.copy(holder.slotLocal(0)); holder.add(cell);
  lab.pickable(holder, 'Dry cell, 1.5 V');
  const key = lab.add(plugKey(), [0.22, T, -0.125]);
  lab.pickable(key.plug, 'Plug key');
  const amm = lab.add(new Meter({ letter: 'A', title: 'DC AMMETER', ranges: [RANGE.A1, RANGE.A5] }), [0.2, T, 0.03]);
  lab.pickable(amm, 'Ammeter (0–1 A and 0–5 A ranges)');
  const gap = lab.add(placeMark({ w: 0.27, d: 0.05, label: 'wire under test' }), [-0.04, T, 0.12]);

  const specs = WIRES.map((w) => {
    const s = lab.add(wireStrip({ len: w.len, wireR: w.r, material: w.mat, title: w.title, sub: w.sub }), [w.home[0], 0, w.home[1]]);
    lab.pickable(s, w.title + ' — ' + w.sub); s.info = w;
    return s;
  });

  /* ------------------------------------------------------------ wiring */
  const P = (o, l) => worldPos(o, l);
  const tap = (k) => P(holder, holder.tapLocal(k));
  const keyL = P(key, key.termLocal(0)), keyR = P(key, key.termLocal(1));
  const L1 = lab.add(new Lead({ color: WIRE.red, clipB: true }));
  const L2 = lab.add(new Lead({ color: WIRE.red }));
  const L3 = lab.add(new Lead({ color: WIRE.yellow, clipB: true })); // ammeter − … right end of the test wire
  const L4 = lab.add(new Lead({ color: WIRE.black, clipB: true }));  // cell − … left end of the test wire
  L1.set(keyL, tap(1), { floorY: T });
  L2.set(keyR, P(amm, amm.termLocal('+')), { floorY: T, via: [[0.255, -0.09], [0.262, -0.035]] });
  const restP = new THREE.Vector3(0.075, T + 0.002, 0.155), restQ = new THREE.Vector3(-0.155, T + 0.002, 0.155);
  const ammMinus = P(amm, amm.termLocal('-'));
  const routeP = (b) => L3.set(ammMinus, b, { floorY: T, via: [[0.13, -0.03], [0.125, 0.06]] });
  const routeQ = (b) => L4.set(tap(0), b, { floorY: T, via: [[0.0, -0.085], [-0.2, -0.06], [-0.255, 0.06]] });
  routeP(restP); routeQ(restQ);

  let cur = null; // specimen in the circuit
  const current = () => (key.closed && cur ? EMF / (cur.info.R + R_INT + R_LEADS) : 0);

  const flow = lab.add(new CurrentFlow());
  let showFlow = false;
  const flowPath = () => {
    if (!cur) return;
    const a = P(cur, cur.endLocal(1)), b = P(cur, cur.endLocal(0));
    flow.setPath([...L1.points(30).reverse(), keyL.clone().setY(keyL.y + 0.012), keyR.clone().setY(keyR.y + 0.012), ...L2.points(30),
      ammMinus.clone().setX(P(amm, amm.termLocal('+')).x).setY(ammMinus.y + 0.02), ammMinus.clone().setY(ammMinus.y + 0.02),
      ...L3.points(40), a, b, ...L4.points(50).reverse(), tap(0), tap(1)]);
  };
  lab.onUpdate(() => {
    const I = current();
    amm.setValue(I);
    flow.on = showFlow && I > 0.01; flow.speed = 0.02 + Math.min(I, 1.5) * 0.06;
    ui.readout('I', 'Ammeter', Math.max(0, amm.reading).toFixed(2), { unit: ' A', color: '#ef4444' });
    ui.readout('rg', 'Range', amm.ranges[amm.range].name, { color: '#94a3b8' });
  });
  ui.control({ type: 'toggle', label: 'Show current direction', value: false, onChange: (v) => { showFlow = v; } });
  const table = ui.table(['Wire', 'Material', 'Length', 'Area', 'Current I (A)', 'R = ρl/A (Ω)']);
  const results = {};

  const ammView = () => { const c = P(amm, [0, 0.04, 0.01]); return { pos: [c.x + 0.01, c.y + 0.15, c.z + 0.09], target: [c.x, c.y - 0.004, c.z] }; };

  async function connect(spec) {
    if (cur) {
      ui.instruct(`Unclip <b>${cur.info.title}</b> … it goes back on the bench.`);
      const old = cur, o = { t: 0 };
      const a0 = P(old, old.endLocal(1)), b0 = P(old, old.endLocal(0));
      await lab.tween(o, { t: 1, duration: 0.6, onUpdate: () => { routeP(a0.clone().lerp(restP, o.t).setY(a0.y + Math.sin(o.t * Math.PI) * 0.03 + (restP.y - a0.y) * o.t)); routeQ(b0.clone().lerp(restQ, o.t).setY(b0.y + Math.sin(o.t * Math.PI) * 0.03 + (restQ.y - b0.y) * o.t)); } });
      await lab.carry(old, [old.info.home[0], 0, old.info.home[1]], { lift: 0.05, duration: 0.9 });
      lab.pickable(old); cur = null; gap.visible = true;
    }
    ui.instruct(`Drag <b>${spec.info.title}</b> (${spec.info.sub}) into the gap between the clips.`, { sub: 'Or tap it.' });
    await lab.waitDrop(spec, gap, { radius: 0.14 });
    gap.visible = false;
    await lab.carry(spec, [-0.04, T, 0.12], { lift: 0.05, duration: 1.0 });
    lab.unpickable(spec); lab.sfx('drop');
    const a1 = P(spec, spec.endLocal(1)).add(new THREE.Vector3(0, 0.004, 0)), b1 = P(spec, spec.endLocal(0)).add(new THREE.Vector3(0, 0.004, 0));
    const o = { t: 0 };
    await lab.tween(o, { t: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: () => { routeP(restP.clone().lerp(a1, o.t).setY(restP.y + (a1.y - restP.y) * o.t + Math.sin(o.t * Math.PI) * 0.03)); routeQ(restQ.clone().lerp(b1, o.t).setY(restQ.y + (b1.y - restQ.y) * o.t + Math.sin(o.t * Math.PI) * 0.03)); } });
    lab.sfx('click');
    cur = spec; flowPath();
  }

  async function reading({ quick = false } = {}) {
    ui.instruct('Tap the <b>plug key</b> to close the circuit.', { sub: quick ? 'Copper: close the key only for a moment — a very large current flows and the cell runs down fast.' : 'Keep the key in only while you read the meter.' });
    await lab.waitClick(key.plug);
    await key.insert(lab);
    await lab.focus(ammView(), 1.0);
    await lab.waitUntil(() => amm.settled);
    ui.instruct('Tap the <b>ammeter</b> to note the current.', { sub: 'Read the scale for the range in use.' });
    await lab.waitClick(amm);
    const I = current();
    const Ir = amm.range === 0 ? Math.round(I * 100) / 100 : Math.round(I * 10) / 10;
    const tg = lab.tag(amm, `I = ${amm.range === 0 ? Ir.toFixed(2) : Ir.toFixed(1)} A`, { offset: [0, 0.09, 0], cls: 'big' });
    await lab.wait(1.4);
    const w = cur.info;
    table.addRow([`${w.n}`, w.desc[0], w.desc[1], w.desc[2], amm.range === 0 ? Ir.toFixed(2) : Ir.toFixed(1), w.R < 0.5 ? w.R.toFixed(3) : w.R.toFixed(1)]);
    results[w.n] = Ir;
    ui.instruct('Take the <b>plug key</b> out.');
    await lab.waitClick(key.plug);
    await key.remove(lab);
    lab.untag(tg);
    await lab.home(1);
    return Ir;
  }

  await ui.ready();

  /* ---------------------------------------------- 1. wire 1 */
  ui.step(0, 'Drag <b>wire 1</b> (nichrome, length <i>l</i> = 10 cm) into the gap between the two crocodile clips.', { sub: 'The circuit is: cell → plug key → ammeter → wire under test → back to the cell.' });
  await connect(specs[0]);
  ui.observe('Wire 1 (nichrome, length l) is clipped into the circuit in series with the cell, the key and the ammeter.', { icon: '🔌' });

  /* ---------------------------------------------- 2. read I1 */
  ui.step(1, 'Close the key and read the ammeter.');
  const I1 = await reading();
  ui.observe(`With wire 1 the ammeter reads <b>I₁ = ${I1.toFixed(2)} A</b>.`, { icon: '📏', highlight: true });

  /* ---------------------------------------------- 3. wire 2 (2l) */
  ui.step(2, 'Replace wire 1 with <b>wire 2</b> — the same nichrome wire, but <b>twice as long</b> (2<i>l</i>).');
  await ui.predict({
    q: 'Wire 2 is twice as long as wire 1 (same thickness, same material). The current will…',
    options: ['Double', 'Stay the same', 'Become about half', 'Become zero'],
    answer: 2,
    explain: 'A longer wire has more resistance (R ∝ l), so less current flows.',
  });
  await connect(specs[1]);
  const I2 = await reading();
  ui.observe(`With the wire of length 2l the current falls to <b>${I2.toFixed(2)} A</b> — about <b>half</b> of I₁. Doubling the length doubles the resistance: <b>R ∝ l</b>. (It is not exactly half because the cell’s own internal resistance stays the same.)`, { icon: '📉', highlight: true });

  /* ---------------------------------------------- 4. thicker */
  ui.step(3, 'Now use <b>wire 3</b>: nichrome, length <i>l</i>, but <b>thicker</b> (twice the area of cross-section).');
  await connect(specs[2]);
  const I3 = await reading();
  ui.observe(`The thicker wire carries <b>${I3.toFixed(2)} A</b> — more than wire 1 (${I1.toFixed(2)} A). A thicker wire has a <b>smaller resistance</b>: R ∝ 1/A.`, { icon: '📈', highlight: true });

  /* ---------------------------------------------- 5. copper */
  ui.step(4, 'Finally use <b>wire 4</b>: <b>copper</b>, the same length and thickness as wire 1.');
  await ui.predict({
    q: 'Copper wire of the same length and thickness as wire 1 will give a current that is…',
    options: ['Smaller than I₁', 'Equal to I₁', 'Much larger than I₁', 'Zero — copper does not conduct'],
    answer: 2,
    explain: 'Copper’s resistivity is about 65 times smaller than nichrome’s, so its resistance is tiny.',
  });
  await connect(specs[3]);
  ui.instruct('The current will be far above 1 A. Tap the <b>range switch</b> on the ammeter to select <b>0–5 A</b> first.', { sub: 'Never pass more current than the range of a meter — the needle would hit the stop and the coil could burn.' });
  await lab.focus(ammView(), 0.9);
  await lab.waitClick(amm.knob);
  amm.setRange(1); lab.sfx('switch');
  ui.observe('The ammeter is switched to its <b>0–5 A</b> range (read the red scale).', { icon: '🎚️' });
  const I4 = await reading({ quick: true });
  ui.observe(`With copper the current jumps to about <b>${I4.toFixed(1)} A</b>. Copper’s resistance (≈ 0.06 Ω) is so small that the current is limited mainly by the cell itself — practically a <b>short circuit</b>. In a real lab add a protective resistor and close the key only for a moment.`, { icon: '⚡', highlight: true });
  amm.setRange(0);

  /* ---------------------------------------------- 6. conclude */
  ui.step(5, 'Compare your readings. Which wire has the <b>largest resistance</b>?', { sub: 'Smallest current ⇒ largest resistance (same cell for every wire).' });
  let choice = null;
  const seg = ui.control({ type: 'segmented', label: 'Largest resistance:', options: [1, 2, 3, 4].map((v) => ({ value: v, label: `Wire ${v}` })), value: null, onChange: (v) => { choice = v; if (v !== 2) ui.toast('Look for the smallest current in your table.', 'warn'); } });
  await lab.waitUntil(() => choice === 2, { auto: () => { choice = 2; seg.set(2); } });
  lab.sfx('success');
  ui.observe(`Resistance: wire 2 (2l) > wire 1 (l) > wire 3 (thicker) ≫ wire 4 (copper). Currents ${I2.toFixed(2)} < ${I1.toFixed(2)} < ${I3.toFixed(2)} < ${I4.toFixed(1)} A. So resistance increases with <b>length</b>, decreases with <b>area of cross-section</b>, and depends on the <b>material</b> (resistivity ρ).`, { icon: '🧾', highlight: true });
  ui.clearControls();

  await ui.finish({
    equation: 'R = ρ l / A &nbsp;·&nbsp; ρ<sub>nichrome</sub> = 1.1×10⁻⁶ Ω m, ρ<sub>copper</sub> = 1.7×10⁻⁸ Ω m',
    conclusion: 'The resistance of a uniform metallic conductor is <b>directly proportional to its length</b> and <b>inversely proportional to its area of cross-section</b>, and it depends on the <b>material</b>: R = ρl/A. Doubling the length doubles R (current about halves), doubling the area halves R, and copper — with a far smaller resistivity than nichrome — has very little resistance. That is why copper is used for connecting wires and nichrome for heating elements.',
    quiz: [
      { q: 'A wire is stretched to twice its length (its volume stays the same, so its area halves). Its resistance becomes…', options: ['Half', 'The same', 'Double', 'Four times'], answer: 3, explain: 'R = ρl/A: l doubles and A halves, so R becomes 2 × 2 = 4 times.' },
      { q: 'Two wires of the same material and length — one thick, one thin. Which has more resistance?', options: ['The thick one', 'The thin one', 'Both the same', 'Depends on the current'], answer: 1, explain: 'R ∝ 1/A, so the thinner wire (smaller area) has the larger resistance.' },
      { q: 'Why are electric heater coils made of nichrome rather than copper?', options: ['Nichrome is cheaper', 'Nichrome has a high resistivity and does not oxidise easily when hot', 'Copper is a poor conductor', 'Nichrome is magnetic'], answer: 1, explain: 'High resistivity gives strong heating, and nichrome alloy does not burn (oxidise) readily at high temperature.' },
    ],
  });
}
