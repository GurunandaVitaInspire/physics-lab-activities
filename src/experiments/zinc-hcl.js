// Activity 1.3 — Zinc granules + dilute hydrochloric acid → hydrogen gas (pop test).
import * as THREE from 'three';
import { testTube, testTubeStand, petriDish, granules, reagentBottle, thermometer, splinter, matchbox, pour } from '../engine/apparatus/common.js';
import { Sparkles } from '../engine/effects.js';

export const config = { camera: { pos: [0.0, 0.33, 0.52], target: [0, 0.06, 0.02] } };

export const steps = [
  'Add zinc granules to the test tube',
  'Pour dilute hydrochloric acid',
  'Feel the change in temperature',
  'Light the wooden splinter',
  'Bring the burning splinter to the mouth',
];

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const stand = lab.add(testTubeStand({ holes: 3 }), [0, 0, -0.02]);
  const tube = testTube({ r: 0.0085, h: 0.15 });
  tube.position.set(stand.slots[1].x, 0.013, -0.02);
  lab.add(tube);
  lab.pickable(tube, 'Test tube');

  const dish = lab.add(petriDish({ r: 0.04 }), [-0.17, 0, 0.08]);
  const zinc = granules({ n: 7, size: 0.0032, spread: 0.03, color: 0x9ba4ae });
  zinc.position.y = 0.002; dish.add(zinc);
  lab.pickable(dish, 'Zinc granules');
  const zTag = lab.tag(dish, 'Zinc granules', { offset: [0, 0.03, 0] });

  const hcl = lab.add(reagentBottle({ title: 'Hydrochloric acid', formula: 'HCl', sub: 'dilute (2 M)', color: 0xeef6ff, labelColor: '#b91c1c', hazard: true, level: 0.065 }), [0.17, 0, 0.02]);
  lab.pickable(hcl, 'Dilute hydrochloric acid');

  const thermo = thermometer({ len: 0.2, temp: 30 });
  thermo.rotation.z = -Math.PI / 2; thermo.position.set(0.04, 0.005, 0.15);
  lab.add(thermo); lab.pickable(thermo, 'Thermometer');

  const splint = splinter({ len: 0.13 });
  splint.rotation.z = Math.PI / 2; splint.position.set(-0.03, 0.003, 0.15);
  lab.add(splint); lab.pickable(splint, 'Wooden splinter');
  const box = lab.add(matchbox(), [-0.16, 0, 0.16]);
  box.rotation.y = 0.3; lab.pickable(box, 'Matchbox');

  await ui.ready();

  /* ----------------------------------------------- 1. add zinc granules */
  ui.step(0, 'Drag the dish of <b>zinc granules</b> onto the test tube.', { sub: 'Pick it up and carry it over — a tap only shows you where it goes.' });
  await lab.waitDrop(dish, tube, { radius: 0.09 });
  lab.untag(zTag);
  const mouth = tube.mouthWorld();
  await lab.carry(dish, [mouth.x - 0.035, mouth.y + 0.015, mouth.z], { lift: 0.06, duration: 1.1 });
  await lab.tween(dish.rotation, { z: -1.1, duration: 0.6, ease: 'power2.inOut' });
  // granules tumble into the tube, one after another
  const spots = [];
  zinc.pieces.forEach((p, i) => {
    tube.attach(p);
    const a = i * 2.4, r = 0.0035 * Math.sqrt((i % 4) / 4);
    spots.push(new THREE.Vector3(Math.cos(a) * r, tube.bottomY + 0.003 + Math.floor(i / 3) * 0.004, Math.sin(a) * r));
  });
  await Promise.all(zinc.pieces.map((p, i) => lab.tween(p.position, { x: spots[i].x, y: spots[i].y, z: spots[i].z, duration: 0.7, delay: i * 0.12, ease: 'bounce.out' })));
  lab.sfx('glass');
  await lab.tween(dish.rotation, { z: 0, duration: 0.5 });
  await lab.carry(dish, [-0.17, 0, 0.08], { duration: 0.9 });
  lab.unpickable(dish);
  ui.observe('Grey zinc granules now lie at the bottom of the test tube.', { icon: '🪨' });

  /* --------------------------------------------- 2. pour dilute HCl */
  ui.step(1, 'Drag the <b>dilute HCl</b> bottle to the test tube to pour about 5 mL.', { sub: 'Acid is corrosive — real labs use a dropper or a measuring cylinder.' });
  await lab.waitDrop(hcl, tube, { radius: 0.09 });
  const guess = await ui.predict({
    q: 'What do you think will happen when the acid touches the zinc?',
    options: ['Nothing — zinc does not react', 'Bubbles of a gas will form', 'The liquid turns blue', 'The zinc catches fire'],
    answer: 1,
    explain: 'Zinc is more reactive than hydrogen, so it pushes hydrogen out of the acid as a gas.',
  });
  void guess;
  await lab.focusOn(tube, { dist: 0.26, height: 0.04, duration: 1 });
  const bubbles = tube.addBubbles({ rate: 0, sources: spots, spread: 0.0025, size: 0.0011, speed: 0.045, count: 220 });
  lab.track(bubbles);
  await pour(lab, hcl, tube, {
    amount: 0.055, duration: 2.2, side: 1,
    onFlowing: () => { lab.wait(0.7).then(() => { bubbles.rate = 70; lab.sfx('fizz'); }).catch(() => {}); },
  });
  // vigorous fizzing — the granules jiggle as gas forms on them
  let fizzT = 0;
  const jiggle = lab.onUpdate((dt, t) => {
    zinc.pieces.forEach((p, i) => { p.rotation.x += Math.sin(t * 13 + i) * 0.004; });
    if ((fizzT += dt) > 1.5) { fizzT = 0; lab.sfx('fizz'); }
  });
  await lab.wait(1.5);
  ui.observe('Bubbles of gas form on the surface of the zinc granules and rise rapidly.', { icon: '🫧', highlight: true });

  /* --------------------------------------------- 3. temperature */
  ui.step(2, 'Place the <b>thermometer</b> in the test tube.', { sub: 'Watch the red column carefully.' });
  ui.readout('temp', 'Temperature', thermo.temp.toFixed(1), { unit: '°C', color: '#ef4444' });
  await lab.waitDrop(thermo, tube, { radius: 0.09 });
  const tm = tube.mouthWorld();
  await lab.carry(thermo, [tm.x - 0.0015, tm.y + 0.02, tm.z], { lift: 0.1, duration: 1.1, rotate: { z: 0 } });
  await lab.tween(thermo.position, { y: tube.position.y + tube.bottomY + 0.012, duration: 0.9, ease: 'power2.inOut' });
  lab.sfx('glass');
  await lab.focus({ pos: [tm.x + 0.05, tm.y - 0.02, tm.z + 0.2], target: [tm.x, tm.y - 0.05, tm.z] }, 1.2);
  const tw = thermo.tweenTemp(36.5, 5);
  const ro = lab.onUpdate(() => ui.readout('temp', 'Temperature', thermo.temp.toFixed(1), { unit: '°C', color: '#ef4444' }));
  await lab.wait(5.2); tw.kill(); ro();
  ui.observe('The temperature rises from 30 °C to about 36 °C — the test tube becomes warm. The reaction releases heat (exothermic).', { icon: '🌡️', highlight: true });
  await lab.carry(thermo, [0.06, 0.005, 0.12], { lift: 0.16, duration: 1.2, rotate: { z: -Math.PI / 2 } });
  lab.unpickable(thermo);
  ui.clearReadout('temp');
  await lab.home(1);

  /* --------------------------------------------- 4. light splinter */
  ui.step(3, 'Tap the <b>matchbox</b> to strike a match and light the splinter.');
  await lab.waitClick(box);
  lab.sfx('strike');
  const matchFlash = new Sparkles({ color: 0xffb347 }); matchFlash.position.set(0.03, 0.02, 0); box.add(matchFlash); lab.track(matchFlash);
  matchFlash.emit(25, 0.02);
  await lab.wait(0.3);
  await lab.carry(splint, [-0.08, 0.12, 0.12], { lift: 0.02, duration: 0.9, rotate: { z: 0.9 } });
  splint.flame.on = true;
  ui.observe('The splinter burns with a steady yellow flame.', { icon: '🔥' });

  /* --------------------------------------------- 5. pop test */
  ui.step(4, 'Drag the <b>burning splinter</b> to the mouth of the test tube.', { sub: 'Do not dip it into the acid.' });
  await lab.waitDrop(splint, tube, { radius: 0.1 });
  const m2 = tube.mouthWorld();
  // place the splinter tip right at the mouth, tilted
  const tipOffset = splint.tipLocal.clone().applyEuler(new THREE.Euler(0, 0, 0.9));
  await lab.focus({ pos: [m2.x + 0.04, m2.y + 0.04, m2.z + 0.22], target: [m2.x - 0.01, m2.y + 0.01, m2.z] }, 1);
  await lab.carry(splint, [m2.x - tipOffset.x - 0.001, m2.y - tipOffset.y + 0.006, m2.z], { lift: 0.01, duration: 1 });
  await lab.wait(0.25);
  // POP!
  lab.sfx('pop');
  const flash = new THREE.PointLight(0xfff2c0, 6, 0.5, 2); flash.position.copy(m2); lab.scene.add(flash);
  const burst = new Sparkles({ color: 0xbfdcff, count: 50 }); burst.position.copy(m2); lab.scene.add(burst); lab.track(burst); burst.emit(45, 0.04);
  splint.flame.on = false; splint.charred.visible = true;
  lab.tween(flash, { intensity: 0, duration: 0.5 }).then(() => lab.scene.remove(flash)).catch(() => {});
  lab.tween(lab.camera.position, { x: '+=0.004', duration: 0.05, yoyo: true, repeat: 5 }).catch(() => {});
  await lab.wait(1);
  ui.observe('The gas burns with a “pop” sound and puts out the flame. This is the test for <b>hydrogen gas</b>.', { icon: '💥', highlight: true });
  bubbles.rate = 25;
  await lab.wait(1.2);
  jiggle();

  await ui.finish({
    equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)↑',
    conclusion: 'Zinc reacts with dilute hydrochloric acid to form zinc chloride and <b>hydrogen gas</b>. Bubbles show a gas is formed, the rise in temperature shows the reaction is <b>exothermic</b>, and the pop test confirms the gas is hydrogen. This is a <b>displacement reaction</b>.',
    quiz: [
      { q: 'Which gas burns with a pop sound?', options: ['Oxygen', 'Hydrogen', 'Carbon dioxide', 'Chlorine'], answer: 1, explain: 'Hydrogen burns rapidly in air with a characteristic pop.' },
      { q: 'The test tube became warm. This means the reaction is…', options: ['Endothermic', 'Exothermic', 'A decomposition', 'Not a chemical change'], answer: 1, explain: 'Heat was given out, so it is exothermic.' },
      { q: 'Why does zinc react with dilute HCl?', options: ['Zinc is less reactive than hydrogen', 'Zinc is more reactive than hydrogen', 'HCl is a base', 'Zinc dissolves in all liquids'], answer: 1, explain: 'A more reactive metal displaces hydrogen from an acid.' },
    ],
  });
}
