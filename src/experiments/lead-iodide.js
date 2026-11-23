// Activity 1.2 — Lead nitrate solution + potassium iodide solution → yellow lead iodide precipitate.
import * as THREE from 'three';
import { testTube, testTubeStand, reagentBottle, pour } from '../engine/apparatus/common.js';
import { sediment, pourInto, clearGlass } from '../engine/apparatus/chem2.js';

export const config = { camera: { pos: [0.0, 0.31, 0.5], target: [0, 0.075, 0.0] } };

export const steps = [
  'Take lead nitrate solution in a test tube',
  'Take potassium iodide solution in another tube',
  'Add the potassium iodide to the lead nitrate',
  'Shake the tube and let it stand',
];

const PBI2 = 0xf2bd00;   // bright (chrome) yellow of lead iodide
const CLOUD = 0xd09200;  // liquid full of suspended PbI2

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const stand = lab.add(testTubeStand({ holes: 3 }), [0, 0, -0.02]);
  const mkTube = (slot) => {
    const t = clearGlass(testTube({ r: 0.0085, h: 0.15, liquidColor: 0xf0f0f0 }));
    t.position.set(stand.slots[slot].x, 0.013, -0.02); lab.add(t);
    return t;
  };
  const tubeP = mkTube(0), tubeK = mkTube(2);
  tubeK.lipLocal = new THREE.Vector3(-0.0085, 0.15, 0);
  lab.pickable(tubeP, 'Test tube 1'); lab.pickable(tubeK, 'Test tube 2');

  const pbBottle = lab.add(reagentBottle({ title: 'Lead nitrate', formula: 'Pb(NO₃)₂', sub: 'solution · POISON', color: 0xf0f0f0, labelColor: '#334155', hazard: true, level: 0.06 }), [-0.18, 0, 0.04]);
  const kiBottle = lab.add(reagentBottle({ title: 'Potassium iodide', formula: 'KI', sub: 'solution', color: 0xf0f0f0, labelColor: '#7c3aed', level: 0.06 }), [0.18, 0, 0.04]);
  lab.pickable(pbBottle, 'Lead nitrate solution'); lab.pickable(kiBottle, 'Potassium iodide solution');

  // close-up of the liquid in a tube, below the stand's lower plate
  const look = (t, { y = 0.04, d = 0.2, side = 0.045, dur = 1 } = {}) => {
    const p = t.getWorldPosition(new THREE.Vector3());
    return lab.focus({ pos: [p.x + side, y + 0.045, p.z + d], target: [p.x, y, p.z] }, dur);
  };
  // Vessel.tintTo does not update the sheen colour, so set it first (otherwise cloudy liquids look white)
  const tint = (c, sec, cloudy, opacity) => { tubeP.liqMat.sheenColor.set(c); return tubeP.tintTo(c, sec, { cloudy, opacity }); };

  await ui.ready();

  /* ------------------------------------- 1. lead nitrate into tube 1 */
  ui.step(0, 'Drag the <b>lead nitrate</b> bottle onto test tube 1 to pour about 2 mL.', { sub: 'Lead compounds are poisonous — never touch or taste them.' });
  await lab.waitDrop(pbBottle, tubeP, { radius: 0.1 });
  await pour(lab, pbBottle, tubeP, { amount: 0.026, duration: 1.8, side: -1 });
  const tagP = lab.tag(tubeP, 'Pb(NO₃)₂', { offset: [0, 0.172, 0], cls: 'mono' });
  await look(tubeP);
  ui.observe('Lead nitrate solution is <b>clear and colourless</b>.', { icon: '🧪' });
  await lab.wait(0.8);
  await lab.home(1);

  /* ---------------------------------- 2. potassium iodide into tube 2 */
  ui.step(1, 'Drag the <b>potassium iodide</b> bottle onto test tube 2 to pour about 2 mL.');
  await lab.waitDrop(kiBottle, tubeK, { radius: 0.1 });
  await pour(lab, kiBottle, tubeK, { amount: 0.022, duration: 1.6, side: 1 });
  const tagK = lab.tag(tubeK, 'KI', { offset: [0, 0.172, 0], cls: 'mono' });
  ui.observe('Potassium iodide solution is also <b>clear and colourless</b>.', { icon: '🧪' });
  await lab.wait(0.6);

  /* ------------------------------------------------ 3. mix them */
  ui.step(2, 'Drag <b>test tube 2</b> (KI) onto test tube 1 and pour the potassium iodide into the lead nitrate.', { sub: 'Watch the exact moment the two liquids meet.' });
  await lab.waitDrop(tubeK, tubeP, { radius: 0.09 });
  await ui.predict({
    q: 'Both solutions are colourless. What will you see when they are mixed?',
    options: ['Nothing — the mixture stays colourless', 'A bright yellow solid appears', 'Bubbles of gas form', 'The liquid turns blue'],
    answer: 1,
    explain: 'Lead ions and iodide ions combine to form lead iodide, which does not dissolve in water.',
  });
  lab.untag(tagK);

  // the precipitate: a swirling cloud of fine yellow particles + a bed that collects at the bottom
  const prec = tubeP.addPrecipitate({ color: PBI2, count: 650, size: 0.00085, radius: 0.0056 });
  prec.cfg.bottomY = 0.0032; prec.layer.visible = false; prec.settleRate = 0.0025;
  lab.track(prec);
  const bed = sediment(tubeP, { color: 0xeab000, height: 0, dome: 0.0018 });
  let swirl = 0;
  lab.onUpdate((dt) => {
    prec.rotation.y += dt * swirl; swirl *= Math.pow(0.6, dt);
    const settled = prec.p.reduce((a, q) => a + (q.on && q.settled ? 1 : 0), 0) / prec.p.length;
    const h = 0.0075 * settled;
    if (Math.abs(h - bed.height) > 0.0001) bed.setHeight(h);
  });

  lab.focus({ pos: [tubeP.position.x + 0.08, 0.21, 0.31], target: [tubeP.position.x + 0.045, 0.125, -0.02] }, 1.2).catch(() => {});
  await pourInto(lab, tubeK, tubeP, {
    amount: 0.02, duration: 2.2, side: 1,
    onFlowing: () => {
      lab.wait(0.25).then(() => {
        prec.form({ at: tubeP.surfaceY - 0.002, layerHeight: 0.0055 });
        swirl = 2.2; lab.sfx('pour');
        tint(CLOUD, 0.9, 0.9);
      }).catch(() => {});
    },
  });
  await look(tubeP, { y: 0.035, d: 0.17, dur: 0.8 });
  ui.observe('The moment the solutions meet, a <b>bright yellow solid</b> forms throughout the liquid — this is a <b>precipitate</b>.', { icon: '💛', highlight: true });
  await lab.wait(2.5);
  // particles slowly sink; the liquid above clears
  prec.settleRate = 0.009;
  tint(0xf0d77a, 6, 0.1, 0.4);
  ui.instruct('Let the test tube stand and watch the yellow solid…');
  await lab.wait(6.5);
  tint(0xf1f0ea, 2, 0, 0.16);
  ui.observe('The yellow precipitate <b>settles at the bottom</b>; the liquid above (potassium nitrate solution) becomes almost colourless again.', { icon: '⬇️', highlight: true });
  await lab.wait(1);

  /* --------------------------------------------- 4. shake & stand */
  ui.step(3, 'Tap <b>test tube 1</b> to shake it gently. Does the yellow solid dissolve?');
  await lab.waitClick(tubeP);
  lab.sfx('glass');
  look(tubeP, { y: 0.035, d: 0.17, dur: 0.8 }).catch(() => {});
  const tl = lab.timeline();
  tl.to(tubeP.rotation, { z: 0.06, duration: 0.09, yoyo: true, repeat: 9, ease: 'sine.inOut' });
  lab.play(tl).catch(() => {});
  prec.layer.scale.y = 0.0001; prec.settleRate = 0.0025;
  prec.form({ at: tubeP.surfaceY - 0.004, layerHeight: 0.0055 });
  swirl = 3;
  tint(CLOUD, 0.6, 0.85);
  await lab.wait(2.2);
  tubeP.rotation.z = 0;
  ui.observe('On shaking, the yellow solid spreads through the liquid again but <b>does not dissolve</b>.', { icon: '🔄' });
  prec.settleRate = 0.009;
  tint(0xf0d77a, 6, 0.1, 0.4);
  await lab.wait(6.5);
  tint(0xf1f0ea, 2, 0, 0.16);
  await lab.wait(1);
  ui.observe('It settles once more — lead iodide is <b>insoluble in water</b>. Two compounds exchanged their ions: a <b>double displacement (precipitation) reaction</b>.', { icon: '🔁', highlight: true });
  lab.untag(tagP);
  await lab.home(1.2);

  await ui.finish({
    equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)',
    conclusion: 'When colourless lead nitrate and potassium iodide solutions are mixed, a <b>yellow precipitate of lead iodide</b> forms at once and settles, leaving potassium nitrate in solution. The two compounds <b>exchange ions</b>, so this is a <b>double displacement reaction</b>; because an insoluble solid is formed, it is also called a <b>precipitation reaction</b>.',
    quiz: [
      { q: 'What is the colour of the precipitate formed?', options: ['White', 'Yellow', 'Blue', 'Brown'], answer: 1, explain: 'Lead iodide (PbI₂) is a bright yellow, insoluble solid.' },
      { q: 'Which substance stays dissolved in the solution after the reaction?', options: ['Lead iodide', 'Potassium nitrate', 'Lead nitrate only', 'Iodine'], answer: 1, explain: 'KNO₃ is soluble, so it remains in solution while PbI₂ settles.' },
      { q: 'This reaction is an example of…', options: ['Combination reaction', 'Decomposition reaction', 'Double displacement reaction', 'Displacement of a metal by a more reactive metal'], answer: 2, explain: 'Pb²⁺ and K⁺ swap partners: an exchange of ions between two compounds is double displacement.' },
    ],
  });
}
