// Activity 4.8 — Ethanoic acid + sodium carbonate / sodium hydrogencarbonate → CO₂, tested with lime water.
import * as THREE from 'three';
import { testTube, watchGlass, powderHeap, granules, spatula as makeSpatula, reagentBottle, pour } from '../engine/apparatus/common.js';
import { TUBE_R, tuneGlass, tubeLevel, openRack, corkDelivery, Froth, bladeHeap } from '../engine/apparatus/carbon.js';

export const config = { camera: { pos: [0, 0.36, 0.68], target: [0, 0.07, 0.03] } };

export const steps = [
  'Put sodium carbonate in test tube A',
  'Pour lime water into test tubes B and D',
  'Add ethanoic acid to test tube A',
  'Fit the cork with the delivery tube',
  'Put sodium hydrogencarbonate in test tube C',
  'Add ethanoic acid to C and fit the cork',
];

const WATER = 0xeef5f8;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const rack = lab.add(openRack({ holes: 5, spacing: 0.036 }), [0, 0, -0.02]);
  const mk = (slot, name) => {
    const t = testTube({ r: TUBE_R, h: 0.15, liquidColor: WATER });
    t.setLiquidColor(WATER, { opacity: 0.09 });
    const s = rack.slots[slot]; t.position.set(s.x, s.y, -0.02); lab.add(t); lab.pickable(t, name); return t;
  };
  const A = mk(0, 'Test tube A'), B = mk(1, 'Test tube B'), C = mk(3, 'Test tube C'), D = mk(4, 'Test tube D');
  const tags = [[A, 'A'], [B, 'B'], [C, 'C'], [D, 'D']].map(([t, l]) => lab.tag(t, l, { offset: [0, 0.112, 0.012], cls: 'mono' }));

  const dish = (x, label) => {
    const g = lab.add(watchGlass({ r: 0.033 }), [x, 0, 0.1]);
    const heap = powderHeap({ r: 0.016, h: 0.009, color: 0xcfcfca }); heap.position.y = 0.004; g.add(heap); g.heap = heap;
    g.tagObj = lab.tag(g, label, { offset: [0, 0.035, 0] });
    return g;
  };
  const dishNa = dish(-0.175, 'Sodium carbonate<br><small>Na₂CO₃</small>');
  const dishHc = dish(0.175, 'Sodium hydrogencarbonate<br><small>NaHCO₃</small>');

  const spat = makeSpatula(); spat.position.set(0.02, 0.0016, 0.112); spat.rotation.y = 0; lab.add(spat);
  const sHeap = bladeHeap(); sHeap.visible = false; spat.add(sHeap);
  lab.pickable(spat, 'Spatula');

  const acid = lab.add(reagentBottle({ title: 'Ethanoic acid', formula: 'CH₃COOH', sub: 'dilute', color: 0xf3f8fb, labelColor: '#9a3412', level: 0.06 }), [-0.25, 0, -0.05]);
  lab.pickable(acid, 'Dilute ethanoic acid');
  const lime = lab.add(reagentBottle({ title: 'Lime water', formula: 'Ca(OH)₂ (aq)', sub: 'freshly prepared', color: 0xf1f6f6, labelColor: '#0f766e', level: 0.065 }), [0.25, 0, -0.05]);
  lab.pickable(lime, 'Lime water');

  // cork + bent delivery tube for each pair, lying flat on the bench (leg along +x, bridge towards the back)
  const dx = rack.slots[1].x - rack.slots[0].x;
  const corkY = 0.012 + 0.15 + 0.003; // cork centre when fitted in a tube in the rack
  const depth = corkY - (0.012 + 0.009); // tip 9 mm above the bottom of the lime-water tube
  const flat = { x: -Math.PI / 2, y: 0, z: Math.PI / 2 };
  const mkCork = (x) => { const c = corkDelivery({ r: TUBE_R, dx, depth }); c.position.set(x, 0.0095, 0.175); c.rotation.set(flat.x, flat.y, flat.z); lab.add(c); lab.pickable(c, 'Cork with delivery tube'); return c; };
  const corkAB = mkCork(-0.16), corkCD = mkCork(0.03);

  const table = ui.table(['Tube', 'Solid taken', 'On adding ethanoic acid', 'Lime water'], { title: 'Observation table' });

  tuneGlass(lab.scene);
  await ui.ready();

  /* ------------------------------------------- helpers */
  const solids = new Map();
  async function addPowder(dishObj, tube) {
    const home = spat.position.clone(), rot = spat.rotation.clone();
    const d = dishObj.position;
    await lab.carry(spat, [d.x - 0.017, 0.03, d.z], { lift: 0.05, duration: 0.9, rotate: { y: 0 } });
    await lab.tween(spat.position, { y: 0.009, duration: 0.35, ease: 'power2.in' });
    sHeap.visible = true; sHeap.scale.set(0.0001, 0.0001, 0.0001);
    lab.tween(sHeap.scale, { x: 0.0095, y: 0.0035, z: 0.0042, duration: 0.35 }).catch(() => {});
    lab.tween(dishObj.heap.scale, { x: 0.88, y: 0.82, z: 0.88, duration: 0.35 }).catch(() => {});
    lab.sfx('click');
    await lab.tween(spat.position, { y: 0.035, duration: 0.3 });
    const m = tube.mouthWorld(), tilt = -0.95;
    const tip = new THREE.Vector3(0.03, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
    await lab.carry(spat, [m.x - tip.x + 0.001, m.y - tip.y + 0.004, m.z], { lift: 0.08, duration: 1.1, rotate: { z: tilt } });
    // tap the spatula: crystals slide into the tube
    const solid = new THREE.Group(); solid.position.y = 0.0016; tube.contents.add(solid); solids.set(tube, solid);
    const heap = powderHeap({ r: 0.0047, h: 0.0045, color: 0xcfcfca }); heap.scale.setScalar(0.01); solid.add(heap);
    const grains = granules({ n: 9, size: 0.0011, spread: 0.004, color: 0xeeeeea, metallic: false });
    grains.position.copy(spat.localToWorld(new THREE.Vector3(0.024, 0.002, 0))); lab.scene.add(grains);
    grains.pieces.forEach((p) => solid.attach(p));
    lab.scene.remove(grains);
    const tl = lab.timeline({ paused: true });
    grains.pieces.forEach((p, i) => {
      const a = i * 2.3, r = 0.0032 * Math.sqrt(((i % 5) + 1) / 5);
      tl.to(p.position, { x: Math.cos(a) * r, y: 0.001 + (i % 3) * 0.0012, z: Math.sin(a) * r, duration: 0.55, ease: 'power2.in' }, i * 0.06);
    });
    tl.to(heap.scale, { x: 1, y: 1, z: 1, duration: 0.6 }, 0.3);
    tl.to(sHeap.scale, { x: 0.0001, y: 0.0001, z: 0.0001, duration: 0.5 }, 0);
    tl.to(spat.rotation, { x: 0.12, duration: 0.08, yoyo: true, repeat: 5 }, 0);
    await lab.play(tl);
    lab.sfx('glass');
    sHeap.visible = false;
    await lab.carry(spat, [home.x, home.y, home.z], { lift: 0.05, duration: 1, rotate: { x: rot.x, y: rot.y, z: rot.z } });
  }

  function startFizz(tube, { rate = 90 } = {}) {
    const srcs = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(Math.cos(i) * 0.0025, 0.004, Math.sin(i) * 0.0025));
    const bub = tube.addBubbles({ rate: 0, sources: srcs, spread: 0.0025, size: 0.0006, speed: 0.05, count: 260 }); lab.track(bub);
    const froth = new Froth(tube, { count: 160, size: 0.0007, height: 0.007, opacity: 0.5 }); tube.add(froth); lab.track(froth);
    return {
      bub, froth,
      go() { bub.rate = rate; lab.tween(froth, { amount: 1, duration: 1.6 }).catch(() => {}); lab.sfx('fizz'); },
    };
  }

  async function fitCork(ck, tube, limeTube) {
    const m = tube.mouthWorld();
    await lab.carry(ck, [m.x, corkY, m.z], { lift: 0.17, duration: 1.4, rotate: { x: 0, y: 0, z: 0 } });
    lab.sfx('glass');
    ck.updateMatrixWorld(true);
    const tipW = ck.localToWorld(ck.tipLocal.clone());
    const tipL = limeTube.worldToLocal(tipW.clone());
    const gas = limeTube.addBubbles({ rate: 0, sources: [new THREE.Vector3(tipL.x, tipL.y + 0.001, tipL.z)], spread: 0.0004, size: 0.0012, speed: 0.055, count: 160 });
    lab.track(gas);
    return gas;
  }

  function milky(limeTube) {
    const ppt = limeTube.addPrecipitate({ color: 0xffffff, count: 320, size: 0.0004 });
    ppt.settleRate = 0.0015; lab.track(ppt);
    ppt.form({ at: limeTube.surfaceY - 0.004, layerHeight: 0.0012 });
    return limeTube.tintTo(0xf2f2ee, 5, { cloudy: 0.82 });
  }

  let fizzLoop = null;
  const fizzSound = () => { let acc = 0; fizzLoop?.(); fizzLoop = lab.onUpdate((dt) => { if ((acc += dt) > 1.4) { acc = 0; lab.sfx('fizz'); } }); };

  /* ------------------------------------------- 1. sodium carbonate into A */
  ui.step(0, 'Drag the <b>spatula</b> to test tube <b>A</b> to add a spatula-full of sodium carbonate.', { sub: 'Or tap the spatula. Use a clean, dry spatula for each solid.' });
  await lab.waitDrop(spat, A, { radius: 0.1 });
  await addPowder(dishNa, A);
  ui.observe('Sodium carbonate is a white powder. It lies at the bottom of test tube A.', { icon: '🥄' });

  /* ------------------------------------------- 2. lime water into B and D */
  ui.step(1, 'Drag the <b>lime water</b> bottle to test tube <b>B</b>. It will fill B and D.', { sub: 'Lime water must be freshly prepared and clear.' });
  await lab.waitDrop(lime, B, { radius: 0.1 });
  const limeHome = lime.position.clone();
  await pour(lab, lime, B, { amount: tubeLevel(5), duration: 1.6, side: 1, back: false });
  await pour(lab, lime, D, { amount: tubeLevel(5), duration: 1.6, side: 1, back: false });
  await lab.carry(lime, [limeHome.x, limeHome.y, limeHome.z], { lift: 0.03, duration: 0.9 });
  lab.unpickable(lime);
  ui.observe('Test tubes B and D now contain about 5 mL of clear, colourless lime water.', { icon: '💧' });

  /* ------------------------------------------- 3. ethanoic acid into A */
  ui.step(2, 'Drag the <b>ethanoic acid</b> bottle to test tube <b>A</b> to add about 2 mL.', { sub: 'Keep your face away from the mouth of the test tube.' });
  await lab.waitDrop(acid, A, { radius: 0.1 });
  await ui.predict({
    q: 'What will you see when ethanoic acid is added to sodium carbonate?',
    options: ['Nothing happens', 'Brisk effervescence (fizzing)', 'A blue colour appears', 'A yellow precipitate forms'],
    answer: 1,
    explain: 'Acids react with carbonates to give a salt, water and carbon dioxide gas — the gas makes it fizz.',
  });
  await lab.focus({ pos: [A.position.x + 0.05, 0.12, 0.26], target: [A.position.x + 0.01, 0.06, -0.02] }, 1.1);
  const fizzA = startFizz(A, { rate: 95 });
  await pour(lab, acid, A, { amount: tubeLevel(2), duration: 1.4, side: -1, back: true, onFlowing: () => lab.wait(0.35).then(() => { fizzA.go(); fizzSound(); }).catch(() => {}) });
  lab.tween(solids.get(A).scale, { x: 0.45, y: 0.4, z: 0.45, duration: 9, ease: 'sine.out' }).catch(() => {});
  await lab.wait(1.2);
  ui.observe('As soon as the acid touches the sodium carbonate there is <b>brisk effervescence</b> — a gas is given off and froth rises in tube A.', { icon: '🫧', highlight: true });

  /* ------------------------------------------- 4. cork + delivery tube */
  ui.step(3, 'Quickly drag the <b>cork with the delivery tube</b> onto test tube <b>A</b>.', { sub: 'The long end must dip into the lime water in tube B.' });
  await lab.waitDrop(corkAB, A, { radius: 0.12 });
  await lab.focus({ pos: [-0.02, 0.2, 0.36], target: [-0.055, 0.09, -0.02] }, 1.1);
  const gasB = await fitCork(corkAB, A, B);
  lab.unpickable(corkAB);
  gasB.rate = 30;
  await lab.focus({ pos: [B.position.x + 0.03, 0.07, 0.2], target: [B.position.x, 0.04, -0.02] }, 1.2);
  ui.readout('lw', 'Lime water B', 'clear');
  await lab.wait(1.2);
  ui.observe('Bubbles of gas come out of the end of the delivery tube and rise through the lime water.', { icon: '🫧' });
  const tB = milky(B);
  await lab.wait(2.5); ui.readout('lw', 'Lime water B', 'turning milky');
  await lab.wait(3); tB.kill();
  ui.readout('lw', 'Lime water B', 'milky', { color: '#e5e7eb' });
  ui.observe('The lime water in tube B turns <b>milky</b>. The gas is <b>carbon dioxide</b>.', { icon: '🥛', highlight: true });
  table.addRow(['A → B', 'Sodium carbonate (Na₂CO₃)', 'Brisk effervescence', 'Turns milky']);
  gasB.rate = 10; fizzA.bub.rate = 25;
  await lab.home(1.2);

  /* ------------------------------------------- 5. sodium hydrogencarbonate into C */
  ui.step(4, 'Now repeat with <b>sodium hydrogencarbonate</b>: drag the <b>spatula</b> to test tube <b>C</b>.', { sub: 'Wipe the spatula clean before taking the second solid.' });
  await lab.waitDrop(spat, C, { radius: 0.1 });
  await addPowder(dishHc, C);
  ui.observe('Sodium hydrogencarbonate (baking soda) is also a white powder.', { icon: '🥄' });

  /* ------------------------------------------- 6. acid into C, fit cork */
  ui.step(5, 'Drag the <b>ethanoic acid</b> to test tube <b>C</b>, then quickly fit the second cork.', { sub: 'Watch the lime water in tube D.' });
  await lab.waitDrop(acid, C, { radius: 0.1 });
  await lab.focus({ pos: [C.position.x + 0.0, 0.12, 0.26], target: [C.position.x + 0.01, 0.06, -0.02] }, 1.1);
  const fizzC = startFizz(C, { rate: 120 });
  await pour(lab, acid, C, { amount: tubeLevel(2), duration: 1.4, side: 1, back: true, onFlowing: () => lab.wait(0.3).then(() => fizzC.go()).catch(() => {}) });
  lab.tween(solids.get(C).scale, { x: 0.35, y: 0.3, z: 0.35, duration: 8, ease: 'sine.out' }).catch(() => {});
  await lab.wait(0.6);
  ui.observe('Sodium hydrogencarbonate also gives <b>brisk effervescence</b> with ethanoic acid.', { icon: '🫧', highlight: true });
  ui.instruct('Quickly drag the second <b>cork with the delivery tube</b> onto test tube <b>C</b>.', { sub: 'The long end dips into the lime water in tube D.' });
  await lab.waitDrop(corkCD, C, { radius: 0.12 });
  const gasD = await fitCork(corkCD, C, D);
  lab.unpickable(corkCD);
  gasD.rate = 34;
  await lab.focus({ pos: [D.position.x - 0.01, 0.07, 0.2], target: [D.position.x, 0.04, -0.02] }, 1.2);
  ui.readout('lw', 'Lime water D', 'clear');
  await lab.wait(1);
  const tD = milky(D);
  await lab.wait(2.5); ui.readout('lw', 'Lime water D', 'turning milky');
  await lab.wait(3); tD.kill();
  ui.readout('lw', 'Lime water D', 'milky', { color: '#e5e7eb' });
  ui.observe('The lime water in tube D also turns <b>milky</b> — this reaction too gives <b>carbon dioxide</b>.', { icon: '🥛', highlight: true });
  table.addRow(['C → D', 'Sodium hydrogencarbonate (NaHCO₃)', 'Brisk effervescence', 'Turns milky']);
  gasD.rate = 10; fizzC.bub.rate = 25;
  await lab.home(1.4);
  ui.clearReadout('lw');
  fizzLoop?.();
  tags.forEach((t) => lab.untag(t)); lab.untag(dishNa.tagObj); lab.untag(dishHc.tagObj);
  ui.observe('Both carbonates react with ethanoic acid in the same way: salt + water + carbon dioxide.', { icon: '📝' });

  await ui.finish({
    equation: '2CH₃COOH + Na₂CO₃ → 2CH₃COONa + H₂O + CO₂↑<br>CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑<br>Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',
    conclusion: 'Ethanoic acid reacts with sodium carbonate and with sodium hydrogencarbonate to give a salt (<b>sodium acetate</b>), water and <b>carbon dioxide</b>, seen as brisk effervescence. The gas turns lime water milky because insoluble white <b>calcium carbonate</b> is formed. This shows that ethanoic acid, though a weak acid, behaves like other acids towards carbonates.',
    quiz: [
      { q: 'Which gas is given off when ethanoic acid reacts with sodium carbonate?', options: ['Hydrogen', 'Oxygen', 'Carbon dioxide', 'Chlorine'], answer: 2, explain: 'Acid + carbonate → salt + water + carbon dioxide.' },
      { q: 'Why does lime water turn milky?', options: ['Sodium acetate is formed', 'Insoluble calcium carbonate is formed', 'Ethanoic acid evaporates', 'The water boils'], answer: 1, explain: 'CO₂ reacts with Ca(OH)₂ to give a white precipitate of CaCO₃ that makes the lime water look milky.' },
      { q: 'What is the salt formed when ethanoic acid reacts with sodium hydrogencarbonate?', options: ['Sodium chloride', 'Sodium ethanoate (sodium acetate)', 'Sodium hydroxide', 'Ethyl ethanoate'], answer: 1, explain: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂; CH₃COONa is sodium ethanoate, commonly called sodium acetate.' },
    ],
  });
}
