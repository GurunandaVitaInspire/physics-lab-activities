// Activities 12.1–12.4 — Magnetic field around a straight current-carrying conductor.
// Battery 6 V (4 cells, 0.15 Ω each), thick copper wire + leads + ammeter 0.1 Ω, rheostat 0.6–10 Ω between B and slider.
// I = 6 / (0.7 + R_rheostat) → 0.56 A … 4.6 A. Field of the wire B = μ0 I / (2π r) = 2×10⁻⁷ I / r (tesla),
// added to the Earth's horizontal field B_H = 3.5×10⁻⁵ T pointing north (−z). Compasses point along the total field.
import * as THREE from 'three';
import {
  circuitBoard, batteryHolder, dryCell, plugKey, Meter, RANGE, rheostat, Lead, WIRE, CurrentFlow, worldPos, bentWire, bindingPost, bakelite,
  cardboardStand, IronFilings, filingsShaker, PlotCompass, arrow3D, curlArrow,
} from '../engine/apparatus/electric.js';
import { wood } from '../engine/materials.js';

export const config = { camera: { pos: [0, 0.62, 0.78], target: [0, 0.05, 0.07] } };

export const steps = [
  'Sprinkle iron filings on the cardboard',
  'Close the key and tap the cardboard',
  'Open the key and clear the filings',
  'Place compass needles around the wire',
  'Close the key — watch the compasses',
  'Reverse the current',
  'Change the current with the rheostat',
  'Move a compass farther from the wire',
];

const EMF = 6.0, R_FIXED = 0.7, B_EARTH = 3.5e-5;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(circuitBoard({ w: 0.72, d: 0.44 }), [0, 0, 0]);
  const T = board.topY;
  const stand = lab.add(cardboardStand({ half: 0.12, h: 0.12 }), [0, T, 0]);
  lab.pickable(stand, 'Cardboard sheet');
  const surf = stand.surface;
  const cardY = T + stand.topY;

  const holder = lab.add(batteryHolder({ slots: 4 }), [-0.18, T, -0.17]);
  holder.rotation.y = Math.PI;
  for (let i = 0; i < 4; i++) { const c = dryCell(); c.position.copy(holder.slotLocal(i)); holder.add(c); }
  lab.pickable(holder, 'Battery (4 cells, 6 V)');
  const key = lab.add(plugKey(), [-0.285, T, 0.03]); key.rotation.y = Math.PI / 2;
  lab.pickable(key.plug, 'Plug key');
  const amm = lab.add(new Meter({ letter: 'A', title: 'DC AMMETER', ranges: [RANGE.A5], plusLeft: true }), [-0.2, T, 0.15]);
  lab.pickable(amm, 'Ammeter (0–5 A)');
  const rheo = lab.add(rheostat({ len: 0.2 }), [0.215, T, -0.165]);
  lab.pickable(rheo.slider, 'Rheostat slider');

  // terminals A (left) and B (right) of the thick copper wire
  const posts = [-0.17, 0.17].map((x) => {
    const blk = lab.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), bakelite()), [x, T + 0.005, 0]);
    const p = bindingPost({ h: 0.014 }); p.position.set(x, T + 0.01, 0); lab.add(p); void blk; return p;
  });
  const postPt = (i) => worldPos(posts[i], [0, posts[i].wireY, 0]);
  const yB = T + 0.034, yTop = 0.31;
  const cu = lab.add(bentWire([[-0.17, T + 0.012, 0], [-0.17, yTop, 0], [0, yTop, 0], [0, yB, 0], [0.17, yB, 0], [0.17, T + 0.012, 0]], { r: 0.0024, bend: 0.014 }));
  lab.pickable(cu, 'Thick copper wire');

  const shaker = lab.add(filingsShaker(), [-0.06, 0, 0.275]);
  lab.pickable(shaker, 'Iron filings');
  const tray = lab.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.03), wood({ base: '#9b6a3c', key: 'standwood' })), [0.1, 0.003, 0.275]);
  lab.pickable(tray, 'Plotting compasses');

  // compasses: 8 on a ring (r = 1.7 cm) + one "far" compass that can be slid outward (south of the wire, +z)
  const ringR = 0.017;
  const ringPos = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * ringR, 0, Math.sin(a) * ringR); });
  const farStart = new THREE.Vector3(0, 0, 0.035);
  const compasses = [...ringPos, farStart].map((p, k) => {
    const c = new PlotCompass({ r: 0.006 });
    c.position.set(0.1 - 0.064 + k * 0.016 - surf.position.x, 0.006 - cardY, 0.275); // resting on the tray (surface-local)
    c.home = p.clone(); surf.add(c); lab.track(c);
    return c;
  });
  const farC = compasses[8];

  const filings = new IronFilings({ count: 3600, half: 0.105 });
  filings.f.forEach((p) => { p.rel = ((p.x0 + 0.105) / 0.21) * 0.85 + Math.random() * 0.15; });
  surf.add(filings); lab.track(filings);

  /* ------------------------------------------------------------ wiring */
  const P = (o, l) => worldPos(o, l);
  const tap = (k) => P(holder, holder.tapLocal(k));
  const kA = P(key, key.termLocal(0)), kB = P(key, key.termLocal(1));
  const L = (c, o) => lab.add(new Lead({ color: c, ...o }));
  const Lbat = L(WIRE.red, { clipB: true }), Lka = L(WIRE.red), Lar = L(WIRE.yellow), Lrw = L(WIRE.yellow, { clipB: true }), Lwb = L(WIRE.black, { clipB: true });
  Lbat.set(kB, tap(4), { floorY: T, via: [[-0.3, -0.08]] });
  Lka.set(kA, P(amm, amm.termLocal('+')), { floorY: T, via: [[-0.27, 0.1]] });
  Lar.set(P(amm, amm.termLocal('-')), P(rheo, rheo.termLocal('B')), { floorY: T, via: [[-0.12, 0.2], [0.12, 0.205], [0.33, 0.12], [0.335, -0.06]] });
  let swapped = false; // false: rheostat → B, A → battery − (current UP through the card)
  const routeRW = (b) => Lrw.set(P(rheo, rheo.termLocal('C')), b, { floorY: T, via: swapped ? [[0.3, 0.02], [0.2, 0.18], [-0.1, 0.19], [-0.2, 0.06]] : [[0.27, -0.06]] });
  const routeWB = (a) => Lwb.set(tap(0), a, { floorY: T, via: swapped ? [[0.0, -0.15], [0.16, -0.13], [0.2, -0.05]] : [[-0.08, -0.13], [-0.17, -0.07]] });
  const tip = (i) => postPt(i).add(new THREE.Vector3(0, 0.004, 0));
  routeRW(tip(1)); routeWB(tip(0));

  /* ------------------------------------------------------------ physics */
  const Rrh = () => 0.6 + 9.4 * (1 - rheo.fraction());
  rheo.setFraction(0.97);
  const current = () => (key.closed ? EMF / (R_FIXED + Rrh()) : 0);
  const dir = () => (swapped ? -1 : 1); // +1 = current upward through the cardboard
  /** horizontal field at card-local (x, z) in units of the Earth's field */
  const field = (x, z) => {
    const r = Math.max(0.004, Math.hypot(x, z)), I = current() * dir();
    const k = (2e-7 * I) / r / r; // B/r
    return { bx: (k * z) / B_EARTH, bz: (-k * x) / B_EARTH - 1 };
  };
  lab.onUpdate(() => {
    amm.setValue(current());
    for (const c of compasses) { const f = field(c.position.x, c.position.z); c.setField(f.bx, f.bz); }
    ui.readout('I', 'Current', Math.max(0, amm.reading).toFixed(2), { unit: ' A', color: '#ef4444' });
    flow.on = showFlow && current() > 0.01; flow.speed = 0.02 + current() * 0.025;
  });

  const flow = lab.add(new CurrentFlow({ spacing: 0.03 }));
  let showFlow = false;
  const flowPath = () => {
    const wirePts = cu.path.getSpacedPoints(120); // A → B
    const mid = swapped ? wirePts : wirePts.slice().reverse();
    flow.setPath([...Lbat.points(30).reverse(), kB.clone().setY(kB.y + 0.012), kA.clone().setY(kA.y + 0.012), ...Lka.points(30), ...Lar.points(60), P(rheo, rheo.termLocal('B')), P(rheo, rheo.termLocal('C')), ...Lrw.points(60), ...mid, ...Lwb.points(50).reverse(), tap(0), tap(4)]);
  };
  flowPath();
  ui.control({ type: 'toggle', label: 'Show current direction', value: false, onChange: (v) => { showFlow = v; } });

  // right-hand thumb rule overlay
  const rhr = new THREE.Group(); rhr.visible = false; surf.add(rhr);
  const thumb = arrow3D({ color: 0xef4444, length: 0.07 }); thumb.position.set(0.011, 0.02, 0.006); rhr.add(thumb);
  const curl = curlArrow({ radius: 0.04, color: 0x3b82f6 }); curl.position.y = 0.012; rhr.add(curl);
  let rhrTags = [];
  const showRule = (on) => {
    rhr.visible = on; rhrTags.forEach((t) => lab.untag(t)); rhrTags = [];
    if (!on) return;
    const up = dir() > 0;
    thumb.rotation.x = up ? 0 : Math.PI; thumb.position.y = up ? 0.02 : 0.1;
    curl.setSense(up ? 1 : -1);
    rhrTags = [lab.tag(rhr, `I — thumb (${up ? 'upward' : 'downward'})`, { offset: [0.012, 0.11, 0], cls: 'dark' }), lab.tag(rhr, `B — curled fingers (${up ? 'anticlockwise' : 'clockwise'} from above)`, { offset: [0.05, 0.016, 0.04], cls: 'dark' })];
  };
  ui.control({ type: 'toggle', label: 'Right-hand thumb rule', value: false, onChange: (v) => showRule(v) });

  const topView = { pos: [0.0, cardY + 0.25, 0.17], target: [0, cardY, 0.005] };
  const ringDefl = () => { const n = compasses[6]; return Math.round(Math.abs(n.deflection)); }; // compass north of the wire (−z)
  const dTxt = (c) => { const d = Math.round(c.deflection); return d === 0 ? '0° (north)' : `${Math.abs(d)}° ${d < 0 ? 'towards W' : 'towards E'}`; };
  let table = null;

  await ui.ready();

  /* -------------------------------------- 1. sprinkle filings */
  ui.step(0, 'Tap the <b>iron filings</b> shaker to sprinkle filings evenly on the cardboard.', { sub: 'The thick copper wire passes vertically through the middle of the cardboard.' });
  await lab.waitClick(shaker);
  await lab.focus({ pos: [0.02, 0.42, 0.42], target: [0, cardY, 0] }, 1.0);
  await lab.carry(shaker, [-0.095, 0.25, 0], { lift: 0.1, duration: 1.0, rotate: { z: -2.4 } });
  const o = { d: 0 };
  lab.sfx('pour');
  await lab.tween(o, { d: 1, duration: 2.6, ease: 'none', onUpdate: () => { filings.drop = o.d; shaker.position.x = -0.095 + 0.19 * o.d; shaker.rotation.x = Math.sin(o.d * 40) * 0.12; shaker.position.z = Math.sin(o.d * 9) * 0.04; } });
  await lab.carry(shaker, [-0.06, 0, 0.275], { lift: 0.05, duration: 1.0, rotate: { z: 0, x: 0 } });
  ui.observe('A thin, even layer of iron filings covers the cardboard. With no current they lie in <b>random directions</b>.', { icon: '🧲' });

  /* -------------------------------------- 2. close key, tap card */
  ui.step(1, 'Insert the <b>plug key</b> to pass a strong current through the wire.', { sub: 'Keep the current on only for a short time — the thick wire heats up.' });
  await ui.predict({
    q: 'When the current flows and you tap the cardboard, the iron filings will arrange themselves in…',
    options: ['Straight lines pointing away from the wire', 'Concentric circles around the wire', 'Parallel lines from left to right', 'They will not move'],
    answer: 1,
    explain: 'The magnetic field lines around a straight current-carrying wire are concentric circles centred on the wire.',
  });
  await lab.home(0.8);
  await lab.waitClick(key.plug);
  await key.insert(lab);
  ui.instruct('Now <b>tap the cardboard</b> gently a few times.', { sub: `Current ≈ ${current().toFixed(1)} A.` });
  await lab.waitClick(stand);
  await lab.focus(topView, 1.0);
  filings.setPattern((x, z) => {
    const r = Math.hypot(x, z), B = (2e-7 * current()) / r;
    return { a: Math.atan2(-x, z), s: Math.min(1, B / 1.6e-5), ring: (rr) => Math.max(0.0065, Math.round(rr / 0.0058) * 0.0058) };
  });
  const tl = lab.timeline({ paused: true });
  tl.to(stand.position, { y: T + 0.0025, duration: 0.05, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 0);
  tl.to(filings, { jitter: 1, duration: 0.2 }, 0).to(filings, { align: 1, duration: 2.4, ease: 'power1.inOut' }, 0.1).to(filings, { jitter: 0, duration: 0.8 }, 1.5);
  lab.sfx('tick');
  await lab.play(tl);
  stand.position.y = T;
  await lab.wait(0.6);
  await lab.focus({ pos: [0.0, cardY + 0.16, 0.08], target: [0, cardY, 0.0] }, 1.0);
  ui.observe('The filings arrange themselves in a pattern of <b>concentric circles</b> around the wire — these are the <b>magnetic field lines</b>. The circles are closest together (field strongest) near the wire.', { icon: '⭕', highlight: true });
  await lab.wait(1.2);

  /* -------------------------------------- 3. open key, clear */
  ui.step(2, 'Take the <b>plug key</b> out, then tap the cardboard to brush the filings back into the bottle.', { sub: 'Iron filings show the shape of the field, but not its direction — for that you need a compass.' });
  await lab.home(0.8);
  await lab.waitClick(key.plug);
  await key.remove(lab);
  await lab.waitClick(stand);
  await lab.tween(filings, { fade: 1, duration: 1.0, ease: 'power1.in' });
  filings.visible = false;

  /* -------------------------------------- 4. compasses */
  ui.step(3, 'Drag the tray of <b>compass needles</b> onto the cardboard.', { sub: 'They are placed in a ring close to the wire; one extra compass sits a little farther out.' });
  await lab.waitDrop(tray, stand, { radius: 0.16 });
  await lab.focus({ pos: [0.0, cardY + 0.2, 0.2], target: [0, cardY, 0.01] }, 1.0);
  await Promise.all(compasses.map((c, k) => {
    const tl2 = lab.timeline({ paused: true });
    tl2.to(c.position, { y: 0.06, duration: 0.35, ease: 'power2.out', delay: k * 0.08 }).to(c.position, { x: c.home.x, z: c.home.z, duration: 0.6, ease: 'power1.inOut' }).to(c.position, { y: 0, duration: 0.3, ease: 'power2.in' });
    return lab.play(tl2);
  }));
  lab.sfx('drop');
  tray.visible = false; lab.unpickable(tray);
  await lab.wait(2.5);
  table = ui.table(['Situation', 'I (A)', 'Compass', 'Deflection of N end']);
  table.addRow(['Key open', '0', 'north of wire, 1.7 cm', dTxt(compasses[6])]);
  ui.observe('With no current, <b>every compass needle points north</b> (away from you) — along the Earth’s magnetic field.', { icon: '🧭' });

  /* -------------------------------------- 5. close key */
  ui.step(4, 'Insert the <b>plug key</b> and watch the compass needles.');
  await lab.home(0.6);
  await lab.waitClick(key.plug);
  await key.insert(lab);
  await lab.focus({ pos: [0.0, cardY + 0.16, 0.12], target: [0, cardY, 0.005] }, 1.0);
  await lab.wait(3);
  showRule(true);
  const d1 = ringDefl();
  table.addRow(['Current upward', current().toFixed(1), 'north of wire, 1.7 cm', dTxt(compasses[6])]);
  ui.observe(`The needles swing round and line up along a <b>circle</b> around the wire, pointing <b>anticlockwise</b> (seen from above) when the current flows <b>upward</b>. The compass to the <b>left (west)</b> of the wire turns right round to point south. (Needle north of the wire: deflected ${d1}°.)`, { icon: '🔄', highlight: true });
  ui.observe('<b>Right-hand thumb rule:</b> hold the wire in your right hand with the thumb along the current — your curled fingers give the direction of the magnetic field lines.', { icon: '👍', highlight: true });
  await lab.wait(1.5);
  showRule(false);

  /* -------------------------------------- 6. reverse */
  ui.step(5, 'Reverse the current: take the key out, then tap terminal <b>A</b> to swap the two leads on the wire.');
  await ui.predict({
    q: 'If the current through the wire is reversed (now flowing downward), the compass needles will…',
    options: ['Not change', 'Point in the opposite direction around the circle', 'All point north', 'Point towards the wire'],
    answer: 1,
    explain: 'Reversing the current reverses the magnetic field, so the needles turn to point clockwise.',
  });
  await lab.home(0.8);
  await lab.waitClick(key.plug);
  await key.remove(lab);
  lab.pickable(posts[0], 'Terminal A');
  await lab.waitClick(posts[0]);
  {
    const a0 = tip(0), b0 = tip(1), t = { k: 0 };
    await lab.tween(t, { k: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: () => {
      const lift = new THREE.Vector3(0, Math.sin(t.k * Math.PI) * 0.06, 0);
      routeRW(b0.clone().lerp(a0, t.k).add(lift)); routeWB(a0.clone().lerp(b0, t.k).add(lift));
    } });
    swapped = true; routeRW(a0); routeWB(b0); flowPath();
  }
  lab.sfx('click');
  ui.instruct('Leads swapped. Insert the <b>plug key</b> again.');
  await lab.waitClick(key.plug);
  await key.insert(lab);
  await lab.focus({ pos: [0.0, cardY + 0.16, 0.12], target: [0, cardY, 0.005] }, 1.0);
  await lab.wait(3.5);
  showRule(true);
  table.addRow(['Current downward', current().toFixed(1), 'north of wire, 1.7 cm', dTxt(compasses[6])]);
  ui.observe('Every needle has <b>reversed</b>: with the current flowing <b>downward</b> the needles point <b>clockwise</b> round the wire. The direction of the field depends on the direction of the current.', { icon: '🔁', highlight: true });
  await lab.wait(1.5);
  showRule(false);

  /* -------------------------------------- 7. rheostat */
  ui.step(6, 'Slide the <b>rheostat</b> to the left to <b>reduce</b> the current to about 1 A.', { sub: 'Drag the black knob on the rheostat. Watch the compass needles and the ammeter.' });
  await lab.focus({ pos: [0.1, 0.42, 0.4], target: [0.08, 0.08, -0.06] }, 1.0);
  lab.slider(rheo.slider, { axis: 'x', min: rheo.minX, max: rheo.maxX, label: 'Rheostat slider — drag' });
  const slideTo = (f) => lab.tween(rheo.slider.position, { x: rheo.minX + f * (rheo.maxX - rheo.minX), duration: 1.6, ease: 'power1.inOut' });
  await lab.waitUntil(() => current() < 1.2 && !lab.drag, { auto: () => slideTo(0.5) });
  await lab.focus({ pos: [0.0, cardY + 0.16, 0.12], target: [0, cardY, 0.005] }, 1.0);
  await lab.wait(3);
  const dLow = ringDefl(), iLow = current();
  table.addRow(['Small current (downward)', iLow.toFixed(1), 'north of wire, 1.7 cm', dTxt(compasses[6])]);
  ui.observe(`With a small current (${iLow.toFixed(1)} A) the needles turn only a little away from north (${dLow}°) — the Earth’s field wins. The needle to the west of the wire points north again.`, { icon: '🔅' });
  ui.instruct('Now slide the rheostat all the way to the right to make the current <b>as large as possible</b>.');
  await lab.focus({ pos: [0.1, 0.42, 0.4], target: [0.08, 0.08, -0.06] }, 0.9);
  await lab.waitUntil(() => current() > 4.2 && !lab.drag, { auto: () => slideTo(1) });
  await lab.focus({ pos: [0.0, cardY + 0.16, 0.12], target: [0, cardY, 0.005] }, 1.0);
  await lab.wait(3);
  const dHigh = ringDefl(), iHigh = current();
  table.addRow(['Large current (downward)', iHigh.toFixed(1), 'north of wire, 1.7 cm', dTxt(compasses[6])]);
  table.addRow(['Large current (downward)', iHigh.toFixed(1), 'south of wire, 3.5 cm', dTxt(farC)]);
  ui.observe(`With ${iHigh.toFixed(1)} A the deflection grows to <b>${dHigh}°</b>. <b>A larger current produces a stronger magnetic field.</b>`, { icon: '🔆', highlight: true });

  /* -------------------------------------- 8. distance */
  ui.step(7, 'Drag the <b>outer compass</b> (in front of the wire) farther away from the wire, to about 10 cm.', { sub: 'Watch its deflection in the readout.' });
  lab.slider(farC, { axis: 'z', min: 0.03, max: 0.11, label: 'Compass — drag away from the wire' });
  const ro = lab.onUpdate(() => {
    ui.readout('r', 'Compass distance', (Math.hypot(farC.position.x, farC.position.z) * 100).toFixed(1), { unit: ' cm', color: '#f59e0b' });
    ui.readout('d', 'Its deflection', Math.round(Math.abs(farC.deflection)), { unit: '°', color: '#a78bfa' });
  });
  const dNear = Math.round(Math.abs(farC.deflection));
  await lab.focus({ pos: [0.0, cardY + 0.2, 0.25], target: [0, cardY, 0.06] }, 1.0);
  await lab.waitUntil(() => farC.position.z > 0.095 && !lab.drag, { auto: () => lab.tween(farC.position, { z: 0.105, duration: 2, ease: 'power1.inOut' }) });
  await lab.wait(3);
  const dFar = Math.round(Math.abs(farC.deflection));
  table.addRow(['Large current (downward)', current().toFixed(1), `south of wire, ${(farC.position.z * 100).toFixed(1)} cm`, dTxt(farC)]);
  ui.observe(`At 3.5 cm the needle was deflected about ${dNear}°; at ${(farC.position.z * 100).toFixed(1)} cm only about <b>${dFar}°</b>. <b>The field becomes weaker as we move away from the wire</b> (B ∝ 1/r) — the circles of field lines are farther apart.`, { icon: '📏', highlight: true });
  ro();
  ui.instruct('Take the plug key out to stop the current.');
  await lab.waitClick(key.plug);
  await key.remove(lab);
  await lab.home(1);
  ui.clearControls();

  await ui.finish({
    equation: 'B = μ₀ I / (2π r) &nbsp;·&nbsp; B ∝ I, B ∝ 1/r',
    conclusion: 'A current-carrying straight wire produces a magnetic field whose lines are <b>concentric circles</b> centred on the wire. The direction of the field reverses when the current reverses and is given by the <b>right-hand thumb rule</b>. The field is <b>stronger for a larger current</b> and <b>weaker farther from the wire</b>. With no current the compasses simply follow the Earth’s field and point north.',
    quiz: [
      { q: 'A current flows vertically upward in a wire. Seen from above, the magnetic field lines around it are…', options: ['Clockwise circles', 'Anticlockwise circles', 'Straight lines outward', 'Parallel to the wire'], answer: 1, explain: 'Right-hand thumb rule: thumb up, fingers curl anticlockwise when viewed from above.' },
      { q: 'How does the magnetic field at a point near a wire change if the current is doubled?', options: ['It halves', 'It stays the same', 'It doubles', 'It reverses'], answer: 2, explain: 'The field is directly proportional to the current (B ∝ I).' },
      { q: 'Why do iron filings alone not tell us the direction of the field?', options: ['They are too small', 'Each filing becomes a tiny magnet that lines up along the field but has no marked north end', 'They are not magnetic', 'They point only north'], answer: 1, explain: 'Filings show the shape of the field lines; a compass needle (with a marked N end) is needed to show direction.' },
    ],
  });
}
