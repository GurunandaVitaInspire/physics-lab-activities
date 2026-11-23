// Activity 3.14 — Conditions for rusting: A (air + water), B (water, no air), C (dry air).
import * as THREE from 'three';
import { testTube, testTubeStand, petriDish, granules, reagentBottle, cork, pour } from '../engine/apparatus/common.js';
import { clearGlass, ironNail, mottleTexture, liquidLayer, sediment } from '../engine/apparatus/chem2.js';

export const config = { camera: { pos: [0.0, 0.34, 0.6], target: [0, 0.07, 0.0] } };

export const steps = [
  'Put clean iron nails in tubes A, B and C',
  'Tube A: add some tap water',
  'Tube B: boiled distilled water, a layer of oil, cork',
  'Tube C: anhydrous calcium chloride, cork',
  'Leave the tubes for a few days',
  'Examine the nails in each tube',
];

const smooth = (x, a, b) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const stand = lab.add(testTubeStand({ holes: 3 }), [0, 0, -0.03]);
  const names = ['A', 'B', 'C'];
  const tubes = names.map((n, i) => {
    const t = clearGlass(testTube({ r: 0.0085, h: 0.15, liquidColor: 0xf0f0f0 }));
    t.position.set(stand.slots[i].x, 0.013, -0.03); lab.add(t);
    lab.pickable(t, `Test tube ${n}`);
    t.label = lab.tag(t, n, { offset: [0, 0.175, 0], cls: 'big' });
    return t;
  });
  const [A, B, C] = tubes;

  // clean iron nails in a petri dish
  const dish = lab.add(petriDish({ r: 0.045 }), [-0.16, 0, 0.1]);
  lab.pickable(dish, 'Clean iron nails');
  const rustMap = mottleTexture('#5e260b', '#341404', '#8a4216', 21, { n: 7000, size: 3 });
  const nails = [];
  for (let i = 0; i < 6; i++) {
    const n = ironNail({ len: 0.05 });
    n.rotation.set(0, 0.3 * (i % 3) - 0.3, Math.PI / 2 + (i % 2 ? 0.02 : -0.02));
    n.position.set(0.025, 0.0045, -0.025 + i * 0.01);
    dish.add(n);
    n.rust = n.coat({ color: 0xffffff, map: rustMap, bump: 3, roughness: 1, grow: 0.0003, seed: 30 + i });
    nails.push(n);
  }
  const nTag = lab.tag(dish, 'Iron nails (cleaned)', { offset: [0, 0.03, 0] });

  const tap = lab.add(reagentBottle({ title: 'Tap water', formula: 'H₂O', sub: 'contains dissolved air', color: 0xf0f0f0, labelColor: '#0284c7', level: 0.065 }), [0.17, 0, 0.07]);
  const boiled = lab.add(reagentBottle({ title: 'Boiled distilled water', formula: 'H₂O', sub: 'boiled & cooled — no air', color: 0xf0f0f0, labelColor: '#0f766e', level: 0.065 }), [0.24, 0, -0.04]);
  const oil = lab.add(reagentBottle({ title: 'Oil', formula: '', sub: 'keeps air out', color: 0xd9a514, labelColor: '#a16207', level: 0.05 }), [-0.24, 0, -0.04]);
  lab.pickable(tap, 'Tap water'); lab.pickable(boiled, 'Boiled distilled water'); lab.pickable(oil, 'Oil');
  [tap, boiled, oil].forEach((b) => { b.vessel.liqMat.opacity = b === oil ? 0.72 : 0.16; });

  const caDish = lab.add(petriDish({ r: 0.035 }), [-0.09, 0, 0.14]);
  const ca = granules({ n: 11, size: 0.0028, spread: 0.035, color: 0xe2e2dc, metallic: false });
  ca.position.y = 0.0015; caDish.add(ca);
  lab.pickable(caDish, 'Anhydrous calcium chloride');
  const caTag = lab.tag(caDish, 'Anhydrous CaCl₂', { offset: [0, 0.025, 0] });

  const corks = [0, 1].map((i) => {
    const c = cork({ r: 0.009, h: 0.016 }); c.rotation.z = Math.PI / 2;
    c.position.set(0.06 + i * 0.03, 0.0095, 0.14); lab.add(c); lab.pickable(c, 'Cork');
    return c;
  });

  await ui.ready();
  lab.untag(nTag);

  /* --------------------------------------------- 1. nails into the tubes */
  ui.step(0, 'Drag the dish of <b>iron nails</b> onto tube <b>A</b>.', { sub: 'The nails were rubbed with sandpaper so their surface is clean.' });
  for (let i = 0; i < 3; i++) {
    const t = tubes[i];
    if (i > 0) ui.instruct(`Now drag the nails onto tube <b>${names[i]}</b>.`);
    await lab.waitDrop(dish, t, { radius: 0.06 });
    const m = t.mouthWorld();
    await lab.carry(dish, [m.x - 0.05, m.y + 0.02, m.z + 0.02], { lift: 0.05, duration: 1 });
    await lab.tween(dish.rotation, { z: -0.45, duration: 0.35 });
    const pair = nails.slice(i * 2, i * 2 + 2);
    await Promise.all(pair.map((n, k) => {
      t.attach(n);
      const s = k ? 1 : -1;
      const tl = lab.timeline();
      tl.to(n.position, { x: s * 0.0026, y: t.rimY + 0.012, z: 0, duration: 0.45, ease: 'power1.inOut' }, k * 0.3);
      tl.to(n.rotation, { x: 0, y: 0, z: -s * 0.05, duration: 0.45 }, k * 0.3);
      tl.to(n.position, { y: 0.001, duration: 0.42, ease: 'power2.in' }, k * 0.3 + 0.45);
      tl.call(() => lab.sfx('glass'), null, k * 0.3 + 0.86);
      return lab.play(tl);
    }));
    await lab.tween(dish.rotation, { z: 0, duration: 0.3 });
  }
  await lab.carry(dish, [-0.16, 0, 0.1], { duration: 0.9 });
  lab.unpickable(dish);
  ui.observe('Two clean, shiny iron nails are placed in each of the test tubes A, B and C.', { icon: '🔩' });

  /* --------------------------------------------- 2. tube A: tap water */
  ui.step(1, 'Drag the <b>tap water</b> onto tube <b>A</b>. Fill it only part-way so the nails are in both water and air.');
  await lab.waitDrop(tap, A, { radius: 0.08 });
  await pour(lab, tap, A, { amount: 0.03, duration: 1.8, side: 1 });
  A.label.setText('A · air + water');
  ui.observe('Tube A: the nails are partly in tap water and partly in air — they get <b>both air and water</b>.', { icon: '💧' });

  /* --------------------------------------------- 3. tube B: boiled water + oil + cork */
  ui.step(2, 'Drag the <b>boiled distilled water</b> onto tube <b>B</b> to cover the nails completely.', { sub: 'Boiling removes the air dissolved in water.' });
  await lab.waitDrop(boiled, B, { radius: 0.08 });
  await pour(lab, boiled, B, { amount: 0.066, duration: 2.2, side: 1 });
  ui.instruct('Now drag the <b>oil</b> onto tube B to pour a thin layer on top of the water.', { sub: 'The oil floats and stops air from dissolving in the water again.' });
  await lab.waitDrop(oil, B, { radius: 0.08 });
  const oilLayer = liquidLayer(B, { color: 0xd9a514, opacity: 0.78 });
  const ol = { t: 0 };
  await pour(lab, oil, B, {
    amount: 0, duration: 1.6, side: -1,
    onFlowing: () => { lab.tween(ol, { t: 0.009, duration: 1.6, onUpdate: () => oilLayer.setThickness(ol.t) }).catch(() => {}); },
  });
  const bw = B.getWorldPosition(new THREE.Vector3());
  lab.focus({ pos: [bw.x + 0.05, 0.12, bw.z + 0.2], target: [bw.x, 0.08, bw.z] }, 1).catch(() => {});
  ui.instruct('Drag a <b>cork</b> onto tube B to seal it.');
  await lab.waitDrop(corks[0], B, { radius: 0.08 });
  await lab.carry(corks[0], [bw.x, B.rimY + bw.y - 0.0055, bw.z], { lift: 0.08, duration: 1.1, rotate: { z: 0 } });
  lab.sfx('click'); lab.unpickable(corks[0]);
  B.label.setText('B · water, no air');
  ui.observe('Tube B: the nails are under boiled water, sealed by a <b>layer of oil</b> and a cork — water but <b>no air</b>.', { icon: '🛢️' });
  await lab.home(1);

  /* --------------------------------------------- 4. tube C: CaCl2 + cork */
  ui.step(3, 'Drag the <b>anhydrous calcium chloride</b> onto tube <b>C</b>.', { sub: 'Calcium chloride absorbs moisture from the air. It irritates skin — do not touch it.' });
  await lab.waitDrop(caDish, C, { radius: 0.07 });
  lab.untag(caTag);
  const cm = C.mouthWorld();
  await lab.carry(caDish, [cm.x + 0.04, cm.y + 0.016, cm.z], { lift: 0.05, duration: 1 });
  await lab.tween(caDish.rotation, { z: 1.0, duration: 0.5, ease: 'power2.inOut' });
  const spots = ca.pieces.map((p, i) => { const a = i * 2.1 + 0.4, r = 0.0058 * (0.5 + 0.5 * ((i * 7) % 5) / 4); return new THREE.Vector3(Math.cos(a) * r, 0.003 + Math.floor(i / 4) * 0.0035, Math.sin(a) * r); });
  ca.pieces.forEach((p) => C.attach(p));
  await Promise.all(ca.pieces.map((p, i) => {
    const tl = lab.timeline();
    tl.to(p.position, { x: 0, z: 0, y: C.rimY - 0.01, duration: 0.25, ease: 'power1.in' }, i * 0.07);
    tl.to(p.position, { x: spots[i].x, y: spots[i].y, z: spots[i].z, duration: 0.45, ease: 'bounce.out' }, i * 0.07 + 0.25);
    return lab.play(tl);
  }));
  lab.sfx('glass');
  await lab.tween(caDish.rotation, { z: 0, duration: 0.4 });
  await lab.carry(caDish, [-0.09, 0, 0.14], { duration: 0.8 });
  lab.unpickable(caDish);
  ui.instruct('Drag the other <b>cork</b> onto tube C to keep moist air out.');
  const cw = C.getWorldPosition(new THREE.Vector3());
  await lab.waitDrop(corks[1], C, { radius: 0.08 });
  await lab.carry(corks[1], [cw.x, C.rimY + cw.y - 0.0055, cw.z], { lift: 0.08, duration: 1.1, rotate: { z: 0 } });
  lab.sfx('click'); lab.unpickable(corks[1]);
  C.label.setText('C · dry air');
  ui.observe('Tube C: white anhydrous calcium chloride keeps the corked tube dry — the nails have <b>air but no moisture</b>.', { icon: '🧂' });

  /* --------------------------------------------- 5. time-lapse */
  ui.step(4, 'Drag the <b>Days</b> slider to leave the tubes undisturbed for a week.');
  await ui.predict({
    q: 'After a few days, in which tube(s) will the iron nails rust?',
    options: ['Tube A only', 'Tube B only', 'Tube C only', 'All three tubes'],
    answer: 0,
    explain: 'Rusting needs both oxygen (air) and water. Only tube A provides both.',
  });
  await lab.focus({ pos: [0, 0.14, 0.38], target: [0, 0.05, -0.03] }, 1.2);
  const rustBed = sediment(A, { color: 0x5a2509, height: 0, dome: 0.001 });
  const dayTag = lab.tag(stand, 'Day 0', { offset: [0, 0.205, 0], cls: 'dark' });
  const key = lab.keyLight, base = key.intensity, hemi = lab.hemi, hBase = hemi.intensity;
  const waterCol = new THREE.Color(), clear = new THREE.Color(0xf0f0f0), rusty = new THREE.Color(0xb7864f);
  const iron = new THREE.Color(0x8f9399), dull = new THREE.Color(0x5b4a40);
  let days = 0;
  const apply = (d) => {
    days = d;
    const k = smooth(d, 0.6, 6.2);
    nails.slice(0, 2).forEach((n) => { n.rust.set(0.66 * k); n.mat.color.copy(iron).lerp(dull, k); n.mat.roughness = 0.34 + 0.4 * k; });
    A.setLiquidColor(waterCol.copy(clear).lerp(rusty, k * 0.8), { opacity: 0.16 + 0.2 * k });
    rustBed.setHeight(0.0022 * k);
    dayTag.setText(`Day ${Math.floor(d + 1e-6)}`);
    ui.readout('days', 'Time passed', Math.floor(d + 1e-6), { unit: d >= 1 && d < 2 ? ' day' : ' days', color: '#a16207' });
    const night = 0.5 - 0.5 * Math.cos(2 * Math.PI * d); // 0 at whole days
    key.intensity = base * (1 - 0.55 * night); hemi.intensity = hBase * (1 - 0.45 * night);
  };
  apply(0);
  const sl = ui.control({ type: 'slider', label: 'Days', min: 0, max: 7, step: 0.05, value: 0, format: (v) => `${Math.floor(v)} d`, onInput: (v) => apply(v) });
  await lab.waitUntil(() => days >= 7, {
    auto: () => { const o = { v: days }; lab.tween(o, { v: 7, duration: 5, ease: 'none', onUpdate: () => { sl.set(o.v); apply(o.v); } }).catch(() => {}); },
  });
  apply(7); key.intensity = base; hemi.intensity = hBase;
  ui.clearControls();
  ui.observe('A week has passed. The nails in one tube look very different from the others…', { icon: '📅' });
  lab.untag(dayTag);

  /* --------------------------------------------- 6. examine */
  ui.step(5, 'Tap each test tube to examine its nails closely.');
  const table = ui.table(['Tube', 'Conditions', 'Nails after a week']);
  const info = {
    A: ['Air + water', '<b>Rusted</b> — reddish-brown flakes', 'Tube A: the nails are covered with a <b>reddish-brown, flaky coating of rust</b>. Rust also floats in the water.'],
    B: ['Water, no air', 'No rust — still shiny', 'Tube B: the nails are <b>still shiny</b>. Without air (oxygen), iron does not rust even under water.'],
    C: ['Dry air, no water', 'No rust — still shiny', 'Tube C: the nails are <b>still shiny</b>. Without moisture, iron does not rust even in air.'],
  };
  const left = [...tubes];
  while (left.length) {
    const t = await lab.waitClick(left);
    left.splice(left.indexOf(t), 1);
    const n = names[tubes.indexOf(t)];
    const p = t.getWorldPosition(new THREE.Vector3());
    await lab.focus({ pos: [p.x + 0.035, 0.07, p.z + 0.16], target: [p.x, 0.038, p.z] }, 1);
    table.addRow([n, info[n][0], info[n][1]]);
    ui.observe(info[n][2], { icon: n === 'A' ? '🟤' : '✨', highlight: n === 'A' });
    await lab.wait(1.4);
    if (left.length) await lab.focus({ pos: [0, 0.14, 0.38], target: [0, 0.05, -0.03] }, 0.9);
  }
  ui.clearReadout('days');
  await lab.home(1.2);

  await ui.finish({
    equation: '4Fe + 3O₂ + 2xH₂O → 2Fe₂O₃·xH₂O &nbsp;(rust)',
    conclusion: 'Only the nails in tube A, which had <b>both air and water</b>, rusted. In tube B (no air) and tube C (no moisture) the nails stayed shiny. So iron rusts only when <b>both oxygen (air) and water (moisture)</b> are present. Rust is hydrated iron(III) oxide, a reddish-brown flaky solid.',
    quiz: [
      { q: 'Why was the water in tube B boiled?', options: ['To kill germs', 'To remove dissolved air', 'To make it hot for rusting', 'To remove salts'], answer: 1, explain: 'Boiling drives out dissolved air (oxygen), so the nails get water without air.' },
      { q: 'What is the job of anhydrous calcium chloride in tube C?', options: ['It adds oxygen', 'It absorbs moisture and keeps the air dry', 'It dissolves the rust', 'It coats the nails'], answer: 1, explain: 'Calcium chloride is a drying agent; it removes water vapour from the air in the tube.' },
      { q: 'Which of these will best prevent an iron gate from rusting?', options: ['Keeping it wet', 'Painting it', 'Placing it in sunlight', 'Rubbing it with sandpaper'], answer: 1, explain: 'Paint keeps both air and water away from the iron surface.' },
    ],
  });
}
