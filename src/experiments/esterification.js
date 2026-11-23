// Activity 4.7 — Esterification: ethanol + ethanoic acid (conc. H₂SO₄ catalyst) → ethyl ethanoate (fruity smell).
import * as THREE from 'three';
import { testTube, reagentBottle, beaker, matchbox, pour } from '../engine/apparatus/common.js';
import { TUBE_R, tuneGlass, tubeLevel, openRack, waterBath, dropInto, gloveHand } from '../engine/apparatus/carbon.js';
import { Fumes, Sparkles } from '../engine/effects.js';
import { glass } from '../engine/materials.js';

export const config = { camera: { pos: [-0.02, 0.43, 0.8], target: [-0.02, 0.13, 0.0] } };

export const steps = [
  'Add 1 mL of absolute ethanol',
  'Add 1 mL of glacial ethanoic acid',
  'Teacher adds a few drops of conc. sulphuric acid',
  'Warm in a water bath for 5 minutes',
  'Pour the mixture into a beaker of water',
  'Waft the vapour towards you and smell',
];

const CLEAR = 0xf2f4f6;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const BX = 0.08;
  const bath = lab.add(waterBath({ temp: 30 }), [BX, 0, 0]);
  lab.pickable(bath.burner, 'Bunsen burner');

  const rack = lab.add(openRack({ holes: 2, spacing: 0.04 }), [-0.16, 0, -0.02]);
  const tube = testTube({ r: TUBE_R, h: 0.15, liquidColor: CLEAR });
  tube.setLiquidColor(CLEAR, { opacity: 0.1 });
  tube.position.set(rack.position.x + rack.slots[0].x, rack.slots[0].y, rack.position.z); lab.add(tube);
  lab.pickable(tube, 'Test tube');
  tube.lipLocal = new THREE.Vector3(TUBE_R, 0.15, 0);

  const bottle = (opts, pos, tip) => { const b = lab.add(reagentBottle({ color: CLEAR, level: 0.058, ...opts }), pos); b.vessel.setLiquidColor(CLEAR, { opacity: 0.14 }); lab.pickable(b, tip); return b; };
  const eth = bottle({ title: 'Absolute ethanol', formula: 'C₂H₅OH', sub: '100% (absolute)', labelColor: '#1d4ed8', hazard: true }, [-0.31, 0, -0.07], 'Absolute ethanol');
  const acid = bottle({ title: 'Glacial ethanoic acid', formula: 'CH₃COOH', sub: 'glacial (pure)', labelColor: '#9a3412', hazard: true }, [-0.3, 0, 0.07], 'Glacial ethanoic acid');
  const h2so4 = bottle({ title: 'Sulphuric acid', formula: 'H₂SO₄', sub: 'concentrated', labelColor: '#b91c1c', hazard: true, kind: 'dropper', level: 0.05 }, [-0.07, 0, 0.12], 'Conc. sulphuric acid — teacher only');
  // glass pipette under the rubber teat of the dropper bottle
  const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0014, 0.07, 14), glass({ opacity: 0.3, edge: 0.92 }));
  pip.position.y = -0.045; pip.renderOrder = 3; h2so4.stopper.add(pip);
  const teacherTag = lab.tag(h2so4, 'Teacher only', { offset: [0, 0.15, 0], cls: 'warn' });

  const wb = beaker({ r: 0.026, h: 0.07, capacity: 100, liquidColor: 0xe4f1fa, level: 0.0195 });
  wb.setLiquidColor(0xe4f1fa, { opacity: 0.1 }); wb.name = 'Beaker of water';
  lab.add(wb, [0.24, 0, 0.19]); lab.pickable(wb, 'Beaker with 40 mL water');
  const wbTag = lab.tag(wb, '40 mL water', { offset: [0, 0.09, 0] });

  const box = lab.add(matchbox(), [-0.02, 0, 0.22]); box.rotation.y = 0.2;

  tuneGlass(lab.scene);
  await ui.ready();

  /* ------------------------------------------- 1. ethanol */
  ui.step(0, 'Drag the <b>absolute ethanol</b> bottle to the test tube to add 1 mL.', { sub: 'Keep all flames away from ethanol bottles.' });
  await lab.waitDrop(eth, tube, { radius: 0.1 });
  await lab.focusOn(tube, { dist: 0.3, height: 0.05, duration: 1 });
  await pour(lab, eth, tube, { amount: tubeLevel(1), duration: 1.2, side: -1 });
  lab.unpickable(eth);
  ui.observe('1 mL of absolute ethanol — a clear, colourless liquid — is in the test tube.', { icon: '🧪' });

  /* ------------------------------------------- 2. glacial ethanoic acid */
  ui.step(1, 'Drag the <b>glacial ethanoic acid</b> bottle to the test tube to add 1 mL.', { sub: 'Glacial ethanoic acid is corrosive and has a sharp vinegar smell.' });
  await lab.waitDrop(acid, tube, { radius: 0.1 });
  await pour(lab, acid, tube, { amount: tubeLevel(2) - tubeLevel(1), duration: 1.2, side: -1 });
  lab.unpickable(acid);
  ui.observe('The two colourless liquids mix completely. The mixture smells of vinegar (ethanoic acid).', { icon: '💧' });

  /* ------------------------------------------- 3. teacher adds conc. H2SO4 */
  ui.step(2, 'Tap the <b>sulphuric acid</b> bottle to ask your teacher to add a few drops.', { sub: '⚠ Concentrated sulphuric acid is highly corrosive. Only your teacher should handle it.' });
  await lab.waitClick(h2so4);
  lab.untag(teacherTag);
  const st = h2so4.stopper, stHome = st.position.clone();
  const m = tube.mouthWorld();
  const above = h2so4.worldToLocal(m.clone().add(new THREE.Vector3(0, 0.092, 0)));
  await lab.tween(st.position, { y: stHome.y + 0.1, duration: 0.6, ease: 'power2.out' });
  await lab.tween(st.position, { x: above.x, z: above.z, y: above.y + 0.03, duration: 1, ease: 'power1.inOut' });
  await lab.tween(st.position, { y: above.y, duration: 0.4 });
  const bulb = st.children[0];
  for (let i = 0; i < 3; i++) {
    lab.tween(bulb.scale, { x: 1.25, z: 1.25, duration: 0.12, yoyo: true, repeat: 1 }).catch(() => {});
    await dropInto(lab, st.localToWorld(new THREE.Vector3(0, -0.08, 0)), tube, { color: 0xf0f0ea, fall: 0.25, plume: false, onSplash: () => tube.setLevel(tube.level + 0.0003) });
    await lab.wait(0.35);
  }
  await lab.tween(st.position, { y: above.y + 0.03, duration: 0.3 });
  await lab.tween(st.position, { x: stHome.x, z: stHome.z, y: stHome.y + 0.1, duration: 1, ease: 'power1.inOut' });
  await lab.tween(st.position, { y: stHome.y, duration: 0.5 });
  lab.unpickable(h2so4);
  ui.observe('Your teacher adds 3 drops of concentrated sulphuric acid. It is a <b>catalyst</b> — it speeds up the reaction without being used up.', { icon: '🧑‍🏫' });
  await lab.home(1);

  /* ------------------------------------------- 4. warm in a water bath */
  ui.step(3, 'Drag the <b>test tube</b> into the clamp over the water bath.', { sub: 'Esters and ethanol are flammable — always warm them in a water bath.' });
  await lab.waitDrop(tube, bath.beaker, { radius: 0.12 });
  const tb = bath.localToWorld(bath.tubeBase.clone());
  await lab.carry(tube, [tb.x, tb.y, tb.z], { lift: 0.2, duration: 1.6 });
  lab.sfx('glass'); lab.unpickable(tube);
  ui.instruct('Tap the <b>Bunsen burner</b> to light it and warm the water bath.', { sub: 'Keep the flame small — the water only needs to be warm (about 60–70 °C).' });
  await lab.waitClick(bath.burner);
  lab.sfx('strike');
  const spark = new Sparkles({ color: 0xffb347 }); spark.position.set(BX, 0.13, 0); lab.scene.add(spark); lab.track(spark); spark.emit(20, 0.015);
  await lab.wait(0.3);
  bath.burner.flame.on = true; lab.sfx('hum');
  await lab.focus({ pos: [BX + 0.1, 0.3, 0.36], target: [BX, 0.23, 0] }, 1.2);
  ui.instruct('Warming for 5 minutes… (time-lapse)', { sub: 'Watch the mixture and the thermometer.' });
  const bub = tube.addBubbles({ rate: 0, spread: 0.004, size: 0.0005, speed: 0.03, count: 60 }); lab.track(bub);
  const vap = tube.addFumes({ color: 0xffffff, rate: 0, size: 0.012, rise: 0.04, spread: 0.003, opacity: 0.12, life: 2.4, drift: [0.004, 0] }); lab.track(vap);
  const tw = bath.thermo.tweenTemp(68, 4.5);
  let secs = 0;
  const clock = lab.onUpdate((dt) => {
    secs = Math.min(300, secs + dt * 50);
    const s = Math.floor(secs);
    ui.readout('clk', 'Time in water bath', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, { unit: ' min', color: '#0ea5e9' });
    ui.readout('t', 'Water bath', bath.thermo.temp.toFixed(0), { unit: ' °C', color: '#ef4444' });
    if (secs > 60) { bub.rate = 6; vap.rate = 2.5; bath.steam.rate = 3; }
  });
  await lab.wait(6.2);
  clock(); tw.kill();
  ui.observe('After 5 minutes in the warm water bath, tiny bubbles rise in the mixture and a little vapour comes out of the test tube. No colour change is seen.', { icon: '♨️' });
  bath.burner.flame.on = false; bub.rate = 0; vap.rate = 0.6;

  /* ------------------------------------------- 5. pour into water */
  ui.step(4, 'Drag the warm <b>test tube</b> to the <b>beaker of water</b> and pour the mixture in.', { sub: 'Hold the test tube with a holder — it is warm.' });
  ui.clearReadout('clk'); ui.clearReadout('t');
  await lab.home(1);
  await lab.waitDrop(tube, wb, { radius: 0.12 });
  lab.untag(wbTag);
  vap.rate = 0;
  await lab.tween(tube.position, { y: tb.y + 0.14, duration: 0.8, ease: 'power2.inOut' });
  await lab.focus({ pos: [0.21, 0.22, 0.52], target: [0.19, 0.08, 0.18] }, 1.1);
  // ester film on the water: a thin iridescent oily layer plus a few lens-shaped drops
  const film = new THREE.Mesh(new THREE.CylinderGeometry(0.0252, 0.0252, 0.0009, 40), new THREE.MeshPhysicalMaterial({ color: 0x1c1a14, transparent: true, opacity: 0, roughness: 0.04, iridescence: 1, iridescenceIOR: 1.38, iridescenceThicknessRange: [220, 620], clearcoat: 1, envMapIntensity: 2.4, depthWrite: false }));
  film.position.y = wb.surfaceY + 0.0006; film.renderOrder = 2; film.scale.set(0.2, 1, 0.2); wb.add(film);
  const lens = [];
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), film.material.clone());
    const a = i * 0.9 + 0.3, r = 0.006 + (i % 3) * 0.0055;
    d.position.set(Math.cos(a) * r, wb.surfaceY + 0.0008, Math.sin(a) * r); d.scale.set(0.0001, 0.0001, 0.0001); d.renderOrder = 2; wb.add(d); lens.push(d);
  }
  await pour(lab, tube, wb, {
    amount: 0.001, duration: 1.4, side: -1, back: false,
    onFlowing: () => {
      tube.setLevel(0);
      lab.tween(film.scale, { x: 1, z: 1, duration: 1.8, ease: 'power2.out' }).catch(() => {});
      lab.tween(film.material, { opacity: 0.38, duration: 1.4 }).catch(() => {});
      lens.forEach((d, i) => {
        const s = 0.0018 + (i % 3) * 0.0008;
        lab.tween(d.scale, { x: s, y: s * 0.35, z: s, duration: 1, delay: 0.3 + i * 0.12 }).catch(() => {});
        lab.tween(d.material, { opacity: 0.55, duration: 1, delay: 0.3 + i * 0.12 }).catch(() => {});
      });
    },
  });
  const slot = rack.localToWorld(rack.slots[0].clone());
  lab.carry(tube, [slot.x, slot.y, slot.z], { lift: 0.06, duration: 1.4 }).catch(() => {});
  await lab.wait(1.2);
  ui.observe('The mixture does not mix fully with the water — a thin oily layer with rainbow colours floats on the surface. This is the <b>ester</b> (ethyl ethanoate), which is only slightly soluble in water.', { icon: '🛢️' });

  /* ------------------------------------------- 6. waft and smell */
  ui.step(5, 'Tap the <b>beaker</b> to waft the vapour gently towards your nose.', { sub: 'Never put your nose directly over a container — always waft.' });
  await ui.predict({
    q: 'What kind of smell do you expect from the beaker now?',
    options: ['Sharp, like vinegar', 'Sweet and fruity', 'Rotten eggs', 'No smell at all'],
    answer: 1,
    explain: 'Esters are sweet-smelling substances. They are used in perfumes and as fruit flavours.',
  });
  await lab.waitClick(wb);
  await lab.focus({ pos: [0.18, 0.25, 0.55], target: [0.22, 0.1, 0.18] }, 1);
  const smell = new Fumes({ color: 0xffd9c2, count: 60, rate: 0, size: 0.03, rise: 0.035, spread: 0.014, opacity: 0.32, life: 3.2, drift: [0, 0.03] });
  smell.position.copy(wb.mouthWorld()); smell.position.y -= 0.02; lab.scene.add(smell); lab.track(smell);
  smell.rate = 6;
  // gloved right hand comes in from the right, fingers over the beaker, and fans the vapour towards the student
  const hand = gloveHand(); hand.rotation.set(0, Math.PI / 2, 0); hand.position.set(0.5, 0.2, 0.1); lab.add(hand);
  const wm = wb.mouthWorld();
  const hx = wm.x + 0.07, hy = wm.y + 0.055, hz = wm.z - 0.03;
  await lab.tween(hand.position, { x: hx, y: hy, z: hz, duration: 1, ease: 'power2.out' });
  for (let i = 0; i < 3; i++) {
    smell.cfg.drift = [0, 0.09]; smell.rate = 14;
    const tl = lab.timeline({ paused: true });
    tl.to(hand.rotation, { x: -0.65, duration: 0.4, ease: 'sine.inOut' }, 0)
      .to(hand.position, { z: hz + 0.07, y: hy + 0.012, duration: 0.4, ease: 'sine.inOut' }, 0)
      .to(hand.rotation, { x: 0, duration: 0.35, ease: 'sine.inOut' }, 0.4)
      .to(hand.position, { z: hz, y: hy, duration: 0.35, ease: 'sine.inOut' }, 0.4);
    await lab.play(tl);
  }
  smell.cfg.drift = [0, 0.04]; smell.rate = 4;
  const sTag = lab.tag(wb, 'Sweet, fruity smell', { offset: [0, 0.13, 0], cls: 'big' });
  await lab.tween(hand.position, { x: 0.52, y: 0.22, z: 0.12, duration: 0.9, ease: 'power2.in' });
  lab.remove(hand);
  ui.observe('A pleasant <b>sweet, fruity smell</b> is noticed. It is the smell of the ester <b>ethyl ethanoate</b>, quite different from the vinegar smell of the acid.', { icon: '🍃', highlight: true });
  await lab.wait(1.5);
  lab.untag(sTag);
  smell.rate = 1.5;
  await lab.home(1.2);

  await ui.finish({
    equation: 'CH₃COOH + CH₃CH₂OH ⇌ CH₃COOC₂H₅ + H₂O<br><small>ethanoic acid + ethanol —(acid catalyst)→ ethyl ethanoate (ester) + water</small>',
    conclusion: 'Ethanoic acid reacts with ethanol in the presence of a few drops of concentrated sulphuric acid (catalyst) to form <b>ethyl ethanoate</b>, an <b>ester</b>, and water. This reaction is called <b>esterification</b>. Esters are sweet-smelling, only slightly soluble in water, and are used in perfumes and flavouring agents.',
    quiz: [
      { q: 'What is the sweet-smelling compound formed in this activity?', options: ['Ethanol', 'An ester (ethyl ethanoate)', 'Ethanoic acid', 'Sulphuric acid'], answer: 1, explain: 'Acid + alcohol → ester + water; here the ester is ethyl ethanoate, CH₃COOC₂H₅.' },
      { q: 'What is the role of concentrated sulphuric acid in esterification?', options: ['It is a reactant used up', 'It acts as a catalyst', 'It gives the fruity smell', 'It neutralises the ethanol'], answer: 1, explain: 'A few drops of conc. H₂SO₄ act as a catalyst (and absorb the water formed), speeding up the reaction.' },
      { q: 'When an ester is heated with sodium hydroxide, it gives back an alcohol and the sodium salt of the acid. This reaction is called…', options: ['Oxidation', 'Hydrogenation', 'Saponification', 'Combustion'], answer: 2, explain: 'Saponification is the alkaline hydrolysis of an ester — it is the reaction used to make soap.' },
    ],
  });
}
