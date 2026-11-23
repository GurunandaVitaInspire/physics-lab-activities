// Activity 1.6 — Heating lead nitrate: 2Pb(NO₃)₂ → 2PbO + 4NO₂ + O₂ (thermal decomposition).
import * as THREE from 'three';
import { boilingTube, bunsenBurner, reagentBottle, spatula, matchbox, powderHeap } from '../engine/apparatus/common.js';
import { Fumes, Sparkles } from '../engine/effects.js';
import { clearGlass, tubeHolder, boilingTubeRack, sediment, gasFill, fumeCupboard, scoopFrom, tipInto, heatPose } from '../engine/apparatus/chem2.js';

export const config = { camera: { pos: [0.0, 0.34, 0.6], target: [-0.02, 0.1, -0.03] } };

export const steps = [
  'Put lead nitrate powder in a boiling tube',
  'Hold the tube with a test-tube holder',
  'Light the burner',
  'Heat the tube over the flame',
  'Turn off the burner and examine the residue',
];

const WHITE = 0xe0ded6; // lead nitrate crystals

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench (inside a fume cupboard) */
  lab.add(fumeCupboard({ w: 0.8, h: 0.66, d: 0.5 }), [0, 0, -0.07]);

  const rack = lab.add(boilingTubeRack({ holes: 2 }), [-0.13, 0, -0.06]);
  const tube = clearGlass(boilingTube({ r: 0.012, h: 0.15 }));
  const slot = rack.localToWorld(rack.slots[0].clone());
  tube.position.set(slot.x, 0.013, slot.z); lab.add(tube);
  lab.pickable(tube, 'Boiling tube');
  const bed = sediment(tube, { color: WHITE, height: 0, crystals: 16, dome: 0.003 });
  bed.mat.roughness = 0.6;

  const burner = lab.add(bunsenBurner(), [0.09, 0, -0.04]);
  lab.pickable(burner, 'Bunsen burner');

  const bottle = lab.add(reagentBottle({ title: 'Lead nitrate', formula: 'Pb(NO₃)₂', sub: 'solid · TOXIC', color: WHITE, labelColor: '#334155', hazard: true, solid: true, level: 0.045 }), [-0.25, 0, 0.05]);
  lab.pickable(bottle, 'Lead nitrate powder');

  const spat = spatula(); spat.position.set(-0.07, 0.003, 0.12); spat.rotation.y = 0.25; lab.add(spat);
  lab.pickable(spat, 'Spatula');
  const heap = powderHeap({ r: 0.0055, h: 0.004, color: WHITE }); heap.position.set(0.018, 0.0005, 0); heap.visible = false; spat.add(heap);

  const holder = tubeHolder({ r: 0.0136 });
  holder.position.set(0.05, 0.0068, 0.13); holder.rotation.y = -0.2; lab.add(holder);
  lab.pickable(holder, 'Test tube holder');

  const box = lab.add(matchbox(), [0.22, 0, 0.1]); box.rotation.y = -0.3; lab.pickable(box, 'Matchbox');

  await ui.ready();

  /* -------------------------------------------- 1. powder into tube */
  ui.step(0, 'Drag the <b>spatula</b> onto the <b>lead nitrate</b> bottle to take some powder.', { sub: 'Lead nitrate is poisonous — use a spatula, never your fingers.' });
  await lab.waitDrop(spat, bottle, { radius: 0.1 });
  spat.rotation.y = 0;
  await scoopFrom(lab, spat, bottle, heap);
  ui.instruct('Now drag the spatula onto the <b>boiling tube</b> and tip the powder in.');
  await lab.waitDrop(spat, tube, { radius: 0.1 });
  await tipInto(lab, spat, heap, tube, { onLand: (k) => bed.setHeight(0.013 * k), home: [-0.07, 0.003, 0.12] });
  lab.unpickable(spat);
  await lab.focus({ pos: [tube.position.x + 0.05, 0.07, tube.position.z + 0.2], target: [tube.position.x, 0.035, tube.position.z] }, 1);
  ui.observe('About 2 g of lead nitrate — a <b>white crystalline powder</b> — is at the bottom of the boiling tube.', { icon: '🧂' });
  await lab.wait(0.6);
  await lab.home(1);

  /* -------------------------------------------- 2. holder */
  ui.step(1, 'Drag the <b>test-tube holder</b> onto the boiling tube.', { sub: 'Grip the tube near its mouth — the glass gets far too hot to touch.' });
  await lab.waitDrop(holder, tube, { radius: 0.1 });
  await lab.carry(holder, [tube.position.x, tube.position.y + 0.125, tube.position.z], { lift: 0.14, duration: 1.2, rotate: { y: 0 } });
  lab.sfx('click');
  tube.attach(holder); lab.unpickable(holder);
  // lift the tube out of the stand
  await lab.carry(tube, [tube.position.x + 0.03, 0.14, tube.position.z + 0.04], { lift: 0.1, duration: 1 });

  /* -------------------------------------------- 3. light burner */
  ui.step(2, 'Tap the <b>matchbox</b> to light the Bunsen burner.', { sub: 'Light the match first, then turn on the gas.' });
  await lab.waitClick(box);
  lab.sfx('strike');
  const flash = new Sparkles({ color: 0xffb347 }); flash.position.set(0.0, 0.02, 0); box.add(flash); lab.track(flash); flash.emit(25, 0.02);
  await lab.wait(0.4);
  burner.flame.on = true; lab.sfx('whoosh');
  await lab.focus({ pos: [burner.position.x + 0.03, 0.2, burner.position.z + 0.3], target: [burner.position.x, 0.12, burner.position.z] }, 1);
  ui.observe('The burner burns with a steady, <b>blue (non-luminous) flame</b>.', { icon: '🔥' });
  await lab.wait(0.5);

  /* -------------------------------------------- 4. heat */
  ui.step(3, 'Drag the <b>boiling tube</b> onto the burner flame to heat the powder.', { sub: 'Keep the mouth of the tube pointing away from yourself and others. Work in the fume cupboard.' });
  await ui.predict({
    q: 'Lead nitrate is a white powder. What do you expect to see when it is heated strongly?',
    options: ['It just melts into a clear liquid', 'Brown fumes are given off', 'It burns with a bright white flame', 'Nothing happens'],
    answer: 1,
    explain: 'Lead nitrate breaks down on heating and one of the products, nitrogen dioxide, is a brown gas.',
  });
  await lab.waitDrop(tube, burner, { radius: 0.12 });
  const pose = heatPose(burner, { tiltZ: 0.5, tiltX: -0.3, height: 0.142 });
  lab.tween(holder.arm.rotation, { z: -0.45, duration: 1.1 }).catch(() => {});
  await lab.carry(tube, pose.pos, { lift: 0.05, duration: 1.2, rotate: pose.rot });
  const bx = pose.pos[0];

  // effects: crackle flecks, brown gas inside, fumes from the mouth
  const flecks = new Sparkles({ color: 0xfff7e6, count: 30 }); flecks.scale.setScalar(0.3); flecks.position.y = 0.012; tube.add(flecks); lab.track(flecks);
  const gas = gasFill(tube, { color: 0x6b3406, from: 0.014 });
  const fumes = new Fumes({ color: 0x8c3c12, count: 80, rate: 0, size: 0.022, rise: 0.06, spread: 0.004, opacity: 0.7, grow: 3.2, life: 3.4, drift: [-0.012, -0.018] });
  lab.add(fumes);
  lab.onUpdate(() => { fumes.position.copy(tube.mouthWorld()); });

  const mid = tube.localToWorld(new THREE.Vector3(0, 0.07, 0));
  await lab.focus({ pos: [mid.x + 0.07, mid.y + 0.03, mid.z + 0.3], target: [mid.x, mid.y - 0.01, mid.z] }, 1.2);
  ui.instruct('Heat the powder — drag the tube gently from side to side in the flame so it heats evenly.', { sub: 'Watch and listen carefully.' });

  let heat = 0, tHeat = 0, crackT = 0, stage = 0;
  const lateral = lab.slider(tube, { axis: 'x', min: bx - 0.03, max: bx + 0.03, step: 0, label: 'Boiling tube — move it in the flame' });
  ui.readout('heat', 'Heating time', '0', { unit: 's', color: '#f97316' });
  const hot = new THREE.Color(0x8a3c12);
  const heatLoop = lab.onUpdate((dt) => {
    const inFlame = Math.abs(tube.position.x - bx) < 0.018 && burner.flame.on;
    if (!inFlame) return;
    tHeat += dt; heat = Math.min(1, heat + dt / 11);
    ui.readout('heat', 'Heating time', tHeat.toFixed(0), { unit: 's', color: '#f97316' });
    // decrepitation: crystals crack and jump with a crackling sound
    if (heat > 0.1 && heat < 0.7 && (crackT += dt) > 0.12 + Math.random() * 0.2) { crackT = 0; lab.sfx('tick'); flecks.emit(2 + (Math.random() * 3 | 0), 0.02); }
    if (heat > 0.32) { gas.material.opacity = Math.min(0.7, (heat - 0.32) * 1.8); fumes.rate = Math.min(14, (heat - 0.32) * 40); }
    if (heat > 0.5) { const k = Math.min(1, (heat - 0.5) / 0.5); bed.mat.color.set(WHITE).lerp(hot, k); bed.setHeight(0.013 - 0.004 * k); }
  });
  const wiggle = () => {
    const tl = lab.timeline();
    tl.to(tube.position, { x: bx - 0.008, duration: 0.6, ease: 'sine.inOut' })
      .to(tube.position, { x: bx + 0.008, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 5 })
      .to(tube.position, { x: bx, duration: 0.6, ease: 'sine.inOut' });
    lab.play(tl).catch(() => {});
  };
  await lab.waitUntil(() => heat >= 0.15 && !lab.drag, { auto: wiggle });
  stage = 1;
  ui.observe('A <b>crackling sound</b> is heard — the crystals crack and jump as they are heated (decrepitation).', { icon: '🔊', highlight: true });
  await lab.waitUntil(() => heat >= 0.48 && !lab.drag, { auto: () => {} });
  const m2 = tube.mouthWorld();
  lab.focus({ pos: [m2.x + 0.06, m2.y + 0.02, m2.z + 0.26], target: [m2.x + 0.02, m2.y - 0.03, m2.z] }, 1.2).catch(() => {});
  ui.observe('<b>Reddish-brown fumes</b> fill the tube and stream out of its mouth. This brown gas is <b>nitrogen dioxide (NO₂)</b>.', { icon: '🟤', highlight: true });
  await lab.waitUntil(() => heat >= 1 && !lab.drag, { auto: () => {} });
  stage = 2; void stage;
  heatLoop(); lateral();
  ui.clearReadout('heat');
  const low = tube.localToWorld(new THREE.Vector3(0, 0.02, 0));
  await lab.focus({ pos: [low.x + 0.05, low.y + 0.03, low.z + 0.19], target: [low.x, low.y - 0.005, low.z] }, 1);
  ui.observe('The white solid shrinks and turns <b>reddish-brown while hot</b>.', { icon: '🟠' });
  await lab.wait(1);

  /* -------------------------------------------- 5. stop and cool */
  ui.step(4, 'Tap the <b>burner</b> to turn off the gas, then put the tube back in the stand to cool.');
  await lab.home(1);
  await lab.waitClick(burner);
  burner.flame.on = false; lab.sfx('switch');
  lab.tween(fumes, { rate: 3, duration: 2 }).catch(() => {});
  ui.instruct('Drag the <b>boiling tube</b> back to the stand.', { sub: 'Do not cool hot glass under the tap — it may crack.' });
  await lab.waitDrop(tube, rack, { radius: 0.12 });
  lab.tween(holder.arm.rotation, { z: 0, duration: 1 }).catch(() => {});
  await lab.carry(tube, [slot.x, 0.013, slot.z], { lift: 0.06, duration: 1.3, rotate: { x: 0, y: 0, z: 0 } });
  lab.sfx('glass');
  // cooling: brown gas escapes, the residue turns yellow
  const yellow = new THREE.Color(0xe0b13a);
  lab.tween(bed.mat.color, { r: yellow.r, g: yellow.g, b: yellow.b, duration: 4 }).catch(() => {});
  lab.tween(gas.material, { opacity: 0.12, duration: 5 }).catch(() => {});
  lab.tween(fumes, { rate: 0, duration: 4 }).catch(() => {});
  await lab.focus({ pos: [slot.x + 0.05, 0.07, slot.z + 0.19], target: [slot.x, 0.03, slot.z] }, 1.2);
  await lab.wait(4.2);
  ui.observe('On cooling, a <b>yellow residue</b> of <b>lead(II) oxide (PbO)</b> is left in the tube. Oxygen gas is also formed, but it is colourless.', { icon: '🟡', highlight: true });
  await lab.wait(1);
  await lab.home(1.2);

  await ui.finish({
    equation: '2Pb(NO₃)₂(s) —heat→ 2PbO(s) + 4NO₂(g) + O₂(g)',
    conclusion: 'On heating, white lead nitrate crackles and breaks down into yellow <b>lead(II) oxide</b>, brown <b>nitrogen dioxide</b> gas and colourless <b>oxygen</b>. One substance splits into simpler substances when heat is supplied, so this is a <b>thermal decomposition reaction</b>. Because NO₂ is toxic, the experiment is done in a fume cupboard.',
    quiz: [
      { q: 'What are the brown fumes seen on heating lead nitrate?', options: ['Oxygen', 'Nitrogen dioxide', 'Carbon dioxide', 'Water vapour'], answer: 1, explain: 'NO₂ is a reddish-brown, poisonous gas.' },
      { q: 'Heating lead nitrate is an example of…', options: ['Combination reaction', 'Thermal decomposition reaction', 'Displacement reaction', 'Double displacement reaction'], answer: 1, explain: 'A single compound breaks into simpler substances on heating.' },
      { q: 'Why do we hear a crackling sound when lead nitrate crystals are heated?', options: ['The glass is breaking', 'Gas bubbles burst in water', 'The crystals crack and split apart on heating (decrepitation)', 'The burner is faulty'], answer: 2, explain: 'Trapped stresses in the crystals make them crack and jump with a crackling noise.' },
    ],
  });
}
