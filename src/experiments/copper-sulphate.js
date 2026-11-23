// Activity 2.15 — Water of crystallisation: CuSO₄·5H₂O —heat→ CuSO₄ + 5H₂O, and back again with water.
import * as THREE from 'three';
import { AUTO } from '../engine/Lab.js';
import { boilingTube, bunsenBurner, reagentBottle, spatula, matchbox, powderHeap, dropper, beaker } from '../engine/apparatus/common.js';
import { Fumes, Sparkles } from '../engine/effects.js';
import { clearGlass, tubeHolder, boilingTubeRack, sediment, wallDroplets, scoopFrom, tipInto, heatPose, fallingDrop, colorRamp } from '../engine/apparatus/chem2.js';

export const config = { camera: { pos: [0.0, 0.34, 0.58], target: [-0.02, 0.1, -0.02] } };

export const steps = [
  'Put copper sulphate crystals in a dry boiling tube',
  'Hold the tube with a test-tube holder',
  'Light the burner',
  'Heat the crystals',
  'Turn off the burner and let the tube cool',
  'Add 2–3 drops of water',
];

const BLUE = 0x1550c4;   // hydrated copper sulphate, CuSO₄·5H₂O
const PALE = 0x8fb3df;
const WHITE = 0xd3d5cd;  // anhydrous CuSO₄ (greyish-white)

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const rack = lab.add(boilingTubeRack({ holes: 2 }), [-0.13, 0, -0.06]);
  const tube = clearGlass(boilingTube({ r: 0.012, h: 0.15 }));
  const slot = rack.localToWorld(rack.slots[0].clone());
  tube.position.set(slot.x, 0.013, slot.z); lab.add(tube);
  lab.pickable(tube, 'Boiling tube');
  const bed = sediment(tube, { color: BLUE, height: 0, crystals: 22, dome: 0.004 });

  const burner = lab.add(bunsenBurner(), [0.1, 0, -0.04]);
  lab.pickable(burner, 'Bunsen burner');

  const bottle = lab.add(reagentBottle({ title: 'Copper sulphate', formula: 'CuSO₄·5H₂O', sub: 'crystals', color: BLUE, labelColor: '#1d4ed8', solid: true, level: 0.045 }), [-0.25, 0, 0.05]);
  lab.pickable(bottle, 'Copper sulphate crystals');

  const spat = spatula(); spat.position.set(-0.07, 0.003, 0.12); spat.rotation.y = 0.25; lab.add(spat);
  lab.pickable(spat, 'Spatula');
  const heap = powderHeap({ r: 0.0055, h: 0.0045, color: BLUE, crystals: true }); heap.position.set(0.018, 0.0005, 0); heap.visible = false; spat.add(heap);

  const holder = tubeHolder({ r: 0.0136 });
  holder.position.set(0.05, 0.0068, 0.13); holder.rotation.y = -0.2; lab.add(holder);
  lab.pickable(holder, 'Test tube holder');

  const box = lab.add(matchbox(), [0.24, 0, 0.1]); box.rotation.y = -0.3; lab.pickable(box, 'Matchbox');

  const water = clearGlass(beaker({ r: 0.026, h: 0.06, capacity: 100, liquidColor: 0xf0f0f0, level: 0.035 }));
  water.liqMat.opacity = 0.16;
  lab.add(water, [0.2, 0, -0.06]); lab.pickable(water, 'Water');
  const drop = dropper({ color: 0xf0f0f0 });
  drop.tube.liqMat.opacity = 0.25;
  drop.rotation.z = Math.PI / 2; drop.position.set(0.2, 0.0075, 0.03); lab.add(drop);
  lab.pickable(drop, 'Dropper with water');
  const bulb = drop.children[1];

  await ui.ready();

  /* -------------------------------------------- 1. crystals into tube */
  ui.step(0, 'Drag the <b>spatula</b> onto the <b>copper sulphate</b> bottle to take a few crystals.', { sub: 'The boiling tube must be completely dry.' });
  await lab.waitDrop(spat, bottle, { radius: 0.1 });
  spat.rotation.y = 0;
  await scoopFrom(lab, spat, bottle, heap);
  ui.instruct('Drag the spatula onto the <b>boiling tube</b> and tip the crystals in.');
  await lab.waitDrop(spat, tube, { radius: 0.1 });
  await tipInto(lab, spat, heap, tube, { onLand: (k) => bed.setHeight(0.012 * k), home: [-0.07, 0.003, 0.12] });
  lab.unpickable(spat);
  await lab.focus({ pos: [slot.x + 0.05, 0.07, slot.z + 0.19], target: [slot.x, 0.033, slot.z] }, 1);
  ui.observe('Copper sulphate crystals are <b>bright blue</b> and look perfectly dry.', { icon: '💎' });
  await lab.wait(0.6);
  await lab.home(1);

  /* -------------------------------------------- 2. holder */
  ui.step(1, 'Drag the <b>test-tube holder</b> onto the boiling tube.', { sub: 'Hold the tube near its mouth.' });
  await lab.waitDrop(holder, tube, { radius: 0.1 });
  await lab.carry(holder, [tube.position.x, tube.position.y + 0.125, tube.position.z], { lift: 0.14, duration: 1.2, rotate: { y: 0 } });
  lab.sfx('click');
  tube.attach(holder); lab.unpickable(holder);
  await lab.carry(tube, [tube.position.x + 0.04, 0.14, tube.position.z + 0.04], { lift: 0.1, duration: 1 });

  /* -------------------------------------------- 3. burner */
  ui.step(2, 'Tap the <b>matchbox</b> to light the Bunsen burner.');
  await lab.waitClick(box);
  lab.sfx('strike');
  const flash = new Sparkles({ color: 0xffb347 }); flash.position.set(0, 0.02, 0); box.add(flash); lab.track(flash); flash.emit(25, 0.02);
  await lab.wait(0.4);
  burner.flame.on = true; lab.sfx('whoosh');
  await lab.wait(0.6);

  /* -------------------------------------------- 4. heat */
  ui.step(3, 'Drag the <b>boiling tube</b> onto the flame to heat the crystals.', { sub: 'Point the mouth of the tube away from everyone.' });
  await ui.predict({
    q: 'The blue crystals look completely dry. What do you think will happen when they are heated?',
    options: ['They melt into a blue liquid', 'They turn white and water droplets appear in the tube', 'They turn black and catch fire', 'Nothing — dry crystals do not change'],
    answer: 1,
    explain: 'The crystals hold “water of crystallisation”. Heat drives this water out as vapour, which condenses on the cooler part of the tube.',
  });
  await lab.waitDrop(tube, burner, { radius: 0.12 });
  const pose = heatPose(burner, { tiltZ: 0.5, tiltX: -0.3, height: 0.142 });
  lab.tween(holder.arm.rotation, { z: -0.45, duration: 1.1 }).catch(() => {});
  await lab.carry(tube, pose.pos, { lift: 0.05, duration: 1.2, rotate: pose.rot });
  const bx = pose.pos[0];

  const drops = wallDroplets(tube, { count: 90, yMin: 0.075, yMax: 0.142, size: 0.0012 });
  const steam = new Fumes({ color: 0xffffff, count: 40, rate: 0, size: 0.014, rise: 0.07, spread: 0.004, opacity: 0.22, grow: 3, life: 2.2, drift: [-0.01, -0.01] });
  lab.add(steam);
  lab.onUpdate(() => { steam.position.copy(tube.mouthWorld()); });

  const mid = tube.localToWorld(new THREE.Vector3(0, 0.06, 0));
  await lab.focus({ pos: [mid.x + 0.07, mid.y + 0.03, mid.z + 0.3], target: [mid.x, mid.y - 0.01, mid.z] }, 1.2);
  ui.instruct('Keep the tube moving gently from side to side in the flame — it only heats while you keep moving it.');

  let heat = 0;
  const lateral = lab.slider(tube, { axis: 'x', min: bx - 0.03, max: bx + 0.03, step: 0, label: 'Boiling tube — move it in the flame' });
  ui.readout('heat', 'Heating time', '0', { unit: 's', color: '#f97316' });
  let tHeat = 0;
  const col = new THREE.Color();
  // Heating only progresses while the student keeps moving the tube in the flame (as in a real lab).
  let lastX = tube.position.x, still = 0;
  const heatLoop = lab.onUpdate((dt) => {
    const moving = Math.abs(tube.position.x - lastX) > 1e-5; lastX = tube.position.x;
    still = moving ? 0 : still + dt;
    if (!(Math.abs(tube.position.x - bx) < 0.018 && burner.flame.on)) return;
    if (still > 0.6 && !AUTO) { ui.readout('heat', 'Heating time', 'move it!', { unit: '', color: '#e0353b' }); return; }
    tHeat += dt; heat = Math.min(1, heat + dt / 12);
    ui.readout('heat', 'Heating time', tHeat.toFixed(0), { unit: 's', color: '#f97316' });
    drops.set(Math.min(1, heat * 1.8));
    steam.rate = heat > 0.12 && heat < 0.9 ? 6 : 0;
    bed.mat.color.copy(colorRamp([BLUE, BLUE, PALE, WHITE], heat, col));
  });
  const wiggle = () => {
    const tl = lab.timeline();
    tl.to(tube.position, { x: bx - 0.008, duration: 0.6, ease: 'sine.inOut' })
      .to(tube.position, { x: bx + 0.008, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 6 })
      .to(tube.position, { x: bx, duration: 0.6, ease: 'sine.inOut' });
    lab.play(tl).catch(() => {});
  };
  await lab.waitUntil(() => heat >= 0.42 && !lab.drag, { auto: wiggle });
  const up = tube.localToWorld(new THREE.Vector3(0, 0.11, 0));
  lab.focus({ pos: [up.x + 0.05, up.y + 0.03, up.z + 0.2], target: [up.x, up.y, up.z] }, 1).catch(() => {});
  ui.observe('<b>Water droplets</b> appear on the cooler upper wall of the boiling tube.', { icon: '💧', highlight: true });
  await lab.waitUntil(() => heat >= 1 && !lab.drag, { auto: () => {} });
  heatLoop(); lateral(); steam.rate = 0;
  ui.clearReadout('heat');
  const low = tube.localToWorld(new THREE.Vector3(0, 0.015, 0));
  await lab.focus({ pos: [low.x + 0.05, low.y + 0.03, low.z + 0.19], target: [low.x, low.y, low.z] }, 1);
  ui.observe('The blue crystals have turned <b>white</b> — they have lost their water of crystallisation and become <b>anhydrous copper sulphate</b>.', { icon: '⚪', highlight: true });
  await lab.wait(1);

  /* -------------------------------------------- 5. cool */
  ui.step(4, 'Tap the <b>burner</b> to turn off the gas, then put the tube back in the stand to cool.');
  await lab.home(1);
  await lab.waitClick(burner);
  burner.flame.on = false; lab.sfx('switch');
  ui.instruct('Drag the <b>boiling tube</b> back to the stand.');
  await lab.waitDrop(tube, rack, { radius: 0.12 });
  lab.tween(holder.arm.rotation, { z: 0, duration: 1 }).catch(() => {});
  await lab.carry(tube, [slot.x, 0.013, slot.z], { lift: 0.06, duration: 1.3, rotate: { x: 0, y: 0, z: 0 } });
  lab.sfx('glass');
  ui.instruct('Let the tube cool for a minute…');
  lab.scene.attach(holder);
  await lab.carry(holder, [0.05, 0.0068, 0.13], { lift: 0.04, duration: 1.1 });

  /* -------------------------------------------- 6. water drops */
  ui.step(5, 'Drag the <b>dropper</b> to the boiling tube, then tap it to add <b>2–3 drops of water</b>.', { sub: 'Add the water only after the tube has cooled.' });
  await ui.predict({
    q: 'What will happen when a few drops of water fall on the white powder?',
    options: ['It stays white', 'It turns blue again', 'It turns green', 'It dissolves completely and disappears'],
    answer: 1,
    explain: 'Anhydrous copper sulphate takes the water back and becomes blue hydrated copper sulphate again.',
  });
  await lab.waitDrop(drop, tube, { radius: 0.1 });
  const m = tube.mouthWorld();
  await lab.carry(drop, [m.x, m.y + 0.012, m.z], { lift: 0.1, duration: 1.2, rotate: { z: 0 } });
  await lab.focus({ pos: [m.x + 0.07, 0.15, m.z + 0.4], target: [m.x, 0.1, m.z] }, 1);
  const bedTop = () => tube.localToWorld(new THREE.Vector3(0, bed.height + 0.004, 0)).y;
  const after = [0xa9c3e0, 0x5d8fd6, BLUE];
  for (let i = 0; i < 3; i++) {
    ui.instruct(`Tap the <b>dropper</b> to squeeze out drop ${i + 1} of 3.`);
    await lab.waitClick(drop);
    lab.tween(bulb.scale, { x: 0.75, z: 0.75, duration: 0.12, yoyo: true, repeat: 1 }).catch(() => {});
    drop.tube.fill(Math.max(0.005, drop.tube.level - 0.008), 0.3);
    await fallingDrop(lab, drop.localToWorld(new THREE.Vector3(0, -0.001, 0)), bedTop(), { color: 0xe8f0f6, size: 0.0017 });
    lab.sfx('hiss');
    const c = new THREE.Color(after[i]);
    lab.tween(bed.mat.color, { r: c.r, g: c.g, b: c.b, duration: 0.9 }).catch(() => {});
    await lab.wait(0.8);
  }
  await lab.focus({ pos: [slot.x + 0.05, 0.07, slot.z + 0.19], target: [slot.x, 0.033, slot.z] }, 0.8);
  ui.observe('With a few drops of water the white powder <b>turns blue again</b> and the tube feels warm. The water of crystallisation has been restored.', { icon: '🔵', highlight: true });
  await lab.carry(drop, [0.2, 0.0075, 0.03], { lift: 0.06, duration: 1.1, rotate: { z: Math.PI / 2 } });
  await lab.home(1.2);

  await ui.finish({
    equation: 'CuSO₄·5H₂O (blue) ⇌ CuSO₄ (white) + 5H₂O &nbsp;&nbsp;(heat → ; ← add water)',
    conclusion: 'Copper sulphate crystals that look dry actually contain <b>water of crystallisation</b> — five molecules of water for every CuSO₄ unit. On heating this water is driven off (it condenses as droplets), and the blue crystals become <b>white anhydrous copper sulphate</b>. Adding water back restores the blue colour, so the colour of the crystals depends on this water.',
    quiz: [
      { q: 'What is the formula of blue copper sulphate crystals?', options: ['CuSO₄', 'CuSO₄·5H₂O', 'CuSO₄·2H₂O', 'CuO'], answer: 1, explain: 'Each formula unit holds five molecules of water of crystallisation.' },
      { q: 'Where did the water droplets in the boiling tube come from?', options: ['From the air', 'From the burner flame', 'From the crystals themselves', 'From the glass'], answer: 2, explain: 'The water of crystallisation was driven out of the crystals and condensed on the cooler wall.' },
      { q: 'Anhydrous copper sulphate can be used to test for…', options: ['Oxygen', 'Water', 'Carbon dioxide', 'Acids'], answer: 1, explain: 'White anhydrous CuSO₄ turns blue when water is added.' },
    ],
  });
}
