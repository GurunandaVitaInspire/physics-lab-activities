// Activity 4.6 — Oxidation of ethanol by alkaline potassium permanganate in a water bath.
import * as THREE from 'three';
import { testTube, reagentBottle, dropper as makeDropper, matchbox, pour } from '../engine/apparatus/common.js';
import { TUBE_R, tuneGlass, tubeLevel, openRack, waterBath, dropInto } from '../engine/apparatus/carbon.js';
import { Sparkles } from '../engine/effects.js';

export const config = { camera: { pos: [-0.03, 0.43, 0.78], target: [-0.03, 0.13, 0.0] } };

export const steps = [
  'Pour about 3 mL of ethanol into the test tube',
  'Light the burner to heat the water bath',
  'Place the test tube in the warm water bath',
  'Fill the dropper with alkaline KMnO₄',
  'Add KMnO₄ one drop at a time',
  'Keep adding until the colour stays',
];

const ETHANOL = 0xf3f7fc;
const KMNO4 = 0x56127a;      // deep purple stock solution (5 %)
const PINK = 0x9c27b0;       // a drop spreading through the ethanol
const PERSIST = 0x7b1fa2;    // excess permanganate in the tube

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const BX = 0.06;
  const bath = lab.add(waterBath({ temp: 30 }), [BX, 0, 0]);
  bath.burner.rotation.y = 0.6; // gas hose runs off to the back-right
  lab.pickable(bath.burner, 'Bunsen burner');
  const bk = bath.beaker;

  const rack = lab.add(openRack({ holes: 2, spacing: 0.04 }), [-0.17, 0, 0.0]);
  const tube = testTube({ r: TUBE_R, h: 0.15, liquidColor: ETHANOL });
  tube.setLiquidColor(ETHANOL, { opacity: 0.1 });
  tube.position.set(rack.position.x + rack.slots[0].x, rack.slots[0].y, 0); lab.add(tube);
  lab.pickable(tube, 'Test tube');

  const eth = lab.add(reagentBottle({ title: 'Ethanol', formula: 'C₂H₅OH', sub: 'flammable', color: ETHANOL, labelColor: '#1d4ed8', hazard: true, level: 0.06 }), [-0.31, 0, 0.0]);
  eth.vessel.setLiquidColor(ETHANOL, { opacity: 0.14 });
  lab.pickable(eth, 'Ethanol');
  const kmn = lab.add(reagentBottle({ title: 'Alkaline KMnO₄', formula: 'KMnO₄ 5%', sub: 'in dil. NaOH', color: KMNO4, labelColor: '#7e22ce', level: 0.058 }), [0.22, 0, 0.11]);
  kmn.vessel.setLiquidColor(KMNO4, { opacity: 0.95 });
  lab.pickable(kmn, 'Alkaline potassium permanganate');

  const drp = makeDropper({ color: KMNO4, filled: false });
  drp.rotation.z = Math.PI / 2; drp.position.set(0.14, 0.0076, 0.2); lab.add(drp);
  lab.pickable(drp, 'Dropper');
  const bulb = drp.children[1];

  const box = lab.add(matchbox(), [-0.06, 0, 0.16]); box.rotation.y = -0.25;

  tuneGlass(lab.scene);
  await ui.ready();

  const tubeHome = tube.position.clone();
  const bathTube = bath.localToWorld(bath.tubeBase.clone());

  /* ------------------------------------------- 1. ethanol */
  ui.step(0, 'Drag the <b>ethanol</b> bottle to the test tube to pour about 3 mL.', { sub: 'Ethanol is flammable — keep the bottle closed and away from flames.' });
  await lab.waitDrop(eth, tube, { radius: 0.1 });
  await lab.focusOn(tube, { dist: 0.3, height: 0.05, duration: 1 });
  await pour(lab, eth, tube, { amount: tubeLevel(3), duration: 1.6, side: -1 });
  lab.unpickable(eth);
  ui.observe('About 3 mL of ethanol — a clear, colourless liquid — is now in the test tube.', { icon: '🧪' });
  await lab.home(1);

  /* ------------------------------------------- 2. heat the water bath */
  ui.step(1, 'Tap the <b>Bunsen burner</b> to light it and heat the water bath.', { sub: 'Never heat ethanol directly over a flame — its vapour catches fire easily.' });
  await lab.waitClick(bath.burner);
  lab.sfx('strike');
  const spark = new Sparkles({ color: 0xffb347 }); spark.position.set(BX, 0.13, 0); lab.scene.add(spark); lab.track(spark); spark.emit(20, 0.015);
  await lab.wait(0.3);
  bath.burner.flame.on = true; lab.sfx('hum');
  await lab.focus({ pos: [BX + 0.07, 0.25, 0.3], target: [BX, 0.2, 0] }, 1.2);
  ui.readout('t', 'Water bath', '30.0', { unit: ' °C', color: '#ef4444' });
  const ro = lab.onUpdate(() => ui.readout('t', 'Water bath', bath.thermo.temp.toFixed(1), { unit: ' °C', color: '#ef4444' }));
  ui.instruct('Heating the water bath… (time-lapse: about 4 minutes)', { sub: 'Watch the thermometer.' });
  const tw = bath.thermo.tweenTemp(64, 5);
  lab.wait(2.4).then(() => { bath.steam.rate = 3; }).catch(() => {});
  await lab.wait(5.2); tw.kill();
  ui.observe('The water in the beaker warms up to about 64 °C and gives off a little steam. The water bath heats the ethanol gently and keeps it away from the flame.', { icon: '🌡️' });

  /* ------------------------------------------- 3. tube into the bath */
  ui.step(2, 'Drag the <b>test tube</b> into the clamp so it stands in the warm water bath.', { sub: 'Keep the burner flame low; the water should only be warm.' });
  await lab.home(1);
  await lab.waitDrop(tube, bk, { radius: 0.12 });
  await lab.carry(tube, [bathTube.x, bathTube.y, bathTube.z], { lift: 0.2, duration: 1.6 });
  lab.sfx('glass'); lab.unpickable(tube);
  ui.observe('The test tube of ethanol is held upright by the clamp, dipping into the warm water.', { icon: '♨️' });
  bath.burner.flame.scale.multiplyScalar(0.75);
  ro();

  /* ------------------------------------------- 4. fill dropper */
  ui.step(3, 'Drag the <b>dropper</b> to the KMnO₄ bottle to fill it.', { sub: 'Alkaline KMnO₄ stains skin and clothes — handle it carefully.' });
  await lab.waitDrop(drp, kmn, { radius: 0.1 });
  const st = kmn.stopper;
  await lab.tween(st.position, { y: '+=0.03', duration: 0.35, ease: 'power2.out' });
  await lab.tween(st.position, { x: 0.05, y: 0.01, duration: 0.6, ease: 'power2.inOut' });
  lab.sfx('glass');
  const km = kmn.position;
  await lab.carry(drp, [km.x, 0.13, km.z], { lift: 0.06, duration: 1.1, rotate: { z: 0 } });
  await lab.focus({ pos: [km.x - 0.02, 0.17, km.z + 0.26], target: [km.x, 0.09, km.z] }, 1);
  await lab.tween(drp.position, { y: 0.045, duration: 0.7, ease: 'power2.inOut' });
  await lab.tween(bulb.scale, { x: 1.18, y: 1.05, z: 1.18, duration: 0.25 });
  drp.tube.setLiquidColor(KMNO4, { opacity: 0.92 });
  lab.tween(bulb.scale, { x: 1, y: 1.5, z: 1, duration: 0.6, ease: 'power2.out' }).catch(() => {});
  drp.tube.fill(0.038, 0.8); await lab.wait(0.85);
  await lab.tween(drp.position, { y: 0.14, duration: 0.6, ease: 'power2.inOut' });
  ui.observe('The dropper now holds deep purple alkaline potassium permanganate solution.', { icon: '💜' });
  const m = tube.mouthWorld();
  await lab.carry(drp, [m.x, m.y + 0.012, m.z], { lift: 0.05, duration: 1.3 });

  /* ------------------------------------------- 5. drop by drop */
  const close = { pos: [BX + 0.09, 0.32, 0.42], target: [BX, 0.275, 0] };
  await lab.focus(close, 1.2);
  ui.step(4, 'Tap the <b>dropper bulb</b> to add <b>one drop</b> of KMnO₄ to the warm ethanol.', { sub: 'Add slowly and watch the colour after each drop.' });
  await ui.predict({
    q: 'What will happen to the purple colour of the first drop of KMnO₄ in warm ethanol?',
    options: ['It stays purple', 'It disappears', 'It turns the ethanol blue', 'It forms a white precipitate'],
    answer: 1,
    explain: 'Alkaline KMnO₄ is an oxidising agent. It gives oxygen to ethanol and is used up, so its purple colour vanishes.',
  });
  const table = ui.table(['Drops added', 'Colour on adding', 'After a few seconds'], { title: 'Adding alkaline KMnO₄' });
  let drops = 0;
  ui.readout('d', 'KMnO₄ added', '0', { unit: ' drops', color: '#a855f7' });
  const tip = () => drp.localToWorld(new THREE.Vector3(0, 0, 0));
  const squeeze = () => lab.tween(bulb.scale, { x: 1.2, y: 1.1, z: 1.2, duration: 0.12, yoyo: true, repeat: 1 });
  async function oneDrop({ fade = 1.6, keep = 0 } = {}) {
    squeeze().catch(() => {});
    drp.tube.setLevel(Math.max(0.012, drp.tube.level - 0.0012));
    await dropInto(lab, tip(), tube, {
      color: KMNO4, fall: 0.3, plumeTime: 1.2,
      onSplash: () => {
        tube.setLevel(tube.level + 0.0002);
        tube.tintTo(PINK, 0.25, { opacity: 0.8 });
        const c = new THREE.Color(ETHANOL).lerp(new THREE.Color(PERSIST), keep);
        lab.wait(0.3).then(() => tube.tintTo(c, fade, { opacity: THREE.MathUtils.lerp(0.1, 0.9, keep) })).catch(() => {});
      },
    });
    drops++; ui.readout('d', 'KMnO₄ added', String(drops), { unit: ' drops', color: '#a855f7' });
  }
  for (let i = 0; i < 3; i++) {
    if (i) ui.instruct(`Tap the <b>dropper bulb</b> again to add drop ${i + 1}.`, { sub: 'Shake gently and watch the colour.' });
    await lab.waitClick(drp);
    await oneDrop({ fade: 1.4 });
    await lab.wait(1.2);
    table.addRow([String(drops), 'Purple', 'Colourless — purple disappears']);
    if (i === 0) ui.observe('The purple colour of KMnO₄ <b>disappears</b> as soon as it mixes with the warm ethanol.', { icon: '🫥', highlight: true });
  }
  ui.observe('Each new drop is also decolourised — the permanganate is being used up in oxidising the ethanol.', { icon: '⚗️' });

  /* ------------------------------------------- 6. excess */
  ui.step(5, 'Tap the <b>dropper</b> to keep adding KMnO₄ drop by drop until the colour stays.', { sub: 'This adds several drops, one after another.' });
  await lab.waitClick(drp);
  const fades = [0, 0, 0.05, 0.12, 0.3, 0.55, 0.8, 1];
  for (let i = 0; i < fades.length; i++) {
    await oneDrop({ fade: 1.0 + fades[i], keep: fades[i] });
    await lab.wait(0.35);
    if (i === 4) table.addRow([String(drops), 'Purple', 'Faint pink stays']);
  }
  await lab.wait(1.8);
  table.addRow([String(drops), 'Purple', 'Purple colour stays']);
  ui.observe('Now the <b>purple colour stays</b>. All the ethanol present has been oxidised, so the extra (excess) KMnO₄ is not used up.', { icon: '💜', highlight: true });

  await lab.carry(drp, [0.14, 0.0076, 0.2], { lift: 0.06, duration: 1.3, rotate: { z: Math.PI / 2 } });
  bath.burner.flame.on = false;
  bath.steam.rate = 1;
  ui.clearReadout('t');
  await lab.focus({ pos: [BX + 0.06, 0.26, 0.3], target: [BX, 0.21, 0] }, 1.2);
  ui.observe('Alkaline KMnO₄ has added oxygen to ethanol, converting it into <b>ethanoic acid</b>.', { icon: '📝' });
  await lab.wait(0.8);
  await lab.home(1.2);

  await ui.finish({
    equation: 'CH₃CH₂OH  <small>—— alkaline KMnO₄ + heat ——→</small>  CH₃COOH',
    conclusion: 'Warm ethanol decolourises alkaline potassium permanganate because KMnO₄ acts as an <b>oxidising agent</b>: it gives oxygen to ethanol and is itself used up. Ethanol is oxidised to <b>ethanoic acid</b>. Once all the ethanol has reacted, further KMnO₄ is not used up and its purple colour persists.',
    quiz: [
      { q: 'Why does the purple colour of KMnO₄ disappear at first?', options: ['It evaporates in the warm water', 'It is used up in oxidising ethanol', 'Ethanol is a purple dye remover', 'The water bath bleaches it'], answer: 1, explain: 'KMnO₄ supplies oxygen to oxidise ethanol and is reduced in the process, so its purple colour is lost.' },
      { q: 'What is ethanol converted into in this reaction?', options: ['Ethene', 'Ethanoic acid', 'Ethyl ethanoate', 'Methane'], answer: 1, explain: 'CH₃CH₂OH is oxidised to CH₃COOH (ethanoic acid).' },
      { q: 'Why is ethanol warmed in a water bath and not directly over a flame?', options: ['Water makes it react faster', 'Ethanol is flammable and its vapour can catch fire', 'The flame would turn it purple', 'Ethanol freezes on a flame'], answer: 1, explain: 'Ethanol has a low boiling point and burns easily; a water bath heats it gently with no flame near it.' },
    ],
  });
}
