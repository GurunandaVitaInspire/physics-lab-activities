// Activity 3.12 — Iron nail in copper sulphate solution: Fe + CuSO₄ → FeSO₄ + Cu (displacement).
import * as THREE from 'three';
import { testTube, testTubeStand, reagentBottle, glassRod, pour } from '../engine/apparatus/common.js';
import { glass } from '../engine/materials.js';
import { clearGlass, ironNail, mottleTexture, sandpaper, threadSeg, colorRamp, stopCameraMoves } from '../engine/apparatus/chem2.js';

export const config = { camera: { pos: [0.0, 0.33, 0.56], target: [0, 0.07, 0.0] } };

export const steps = [
  'Clean the iron nail with sandpaper',
  'Pour copper sulphate solution into two test tubes',
  'Tie the nail with a thread and dip it in tube B',
  'Wait for about 20 minutes',
  'Take out the nail and compare the two tubes',
];

const BLUE = 0x0b63d4;        // copper sulphate solution
const GREEN = 0xb4d9a2;       // pale green iron(II) sulphate solution
const smooth = (x, a, b) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const stand = lab.add(testTubeStand({ holes: 3 }), [0.03, 0, -0.03]);
  const mk = (slot, label) => {
    const t = clearGlass(testTube({ r: 0.0085, h: 0.15, liquidColor: BLUE }));
    t.position.set(stand.position.x + stand.slots[slot].x, 0.013, -0.03); lab.add(t);
    lab.pickable(t, `Test tube ${label}`);
    t.label = lab.tag(t, label, { offset: [0, 0.175, 0], cls: 'big' });
    return t;
  };
  const A = mk(0, 'A'), B = mk(2, 'B');

  const bottle = lab.add(reagentBottle({ title: 'Copper sulphate', formula: 'CuSO₄(aq)', sub: 'solution · harmful', color: BLUE, labelColor: '#1d4ed8', level: 0.065 }), [0.22, 0, 0.05]);
  lab.pickable(bottle, 'Copper sulphate solution');

  // an iron nail with a dull, slightly rusty surface
  const NX = -0.13, NZ = 0.11;
  const nail = ironNail({ len: 0.05, color: 0x6b625b, roughness: 0.75 });
  nail.rotation.set(0, 0.15, Math.PI / 2); nail.position.set(NX + 0.025, 0.0029, NZ);
  lab.add(nail); lab.pickable(nail, 'Iron nail');
  const oxide = nail.coat({ color: 0xffffff, map: mottleTexture('#6a3a1e', '#3e2313', '#85522e', 41, { n: 6000 }), bump: 2, roughness: 1, seed: 51 });
  oxide.set(0.5);
  const copperMap = mottleTexture('#76321a', '#46190a', '#94482a', 43, { n: 7000, size: 2 });
  const NAIL_TIP_Y = 0.024;                      // world y of the tip while hanging in tube B
  const SURF = 0.013 + 0.055;                    // solution surface in tube B (world y)
  const copperCoat = nail.coat({ color: 0xc09888, map: copperMap, bump: 1.5, roughness: 0.85, metalness: 0.15, top: SURF - NAIL_TIP_Y, grow: 0.0003, seed: 52 });

  const paper = sandpaper({ w: 0.034, d: 0.026 });
  paper.position.set(-0.2, 0, 0.03); paper.rotation.y = 0.3; lab.add(paper);
  lab.pickable(paper, 'Sandpaper');

  const rod = glassRod({ len: 0.06 });
  rod.children[0].material = glass({ opacity: 0.18, edge: 0.6, tint: 0xc9d2da });
  rod.rotation.z = Math.PI / 2; rod.position.set(0.06, 0.0025, 0.14); lab.add(rod);
  const thread = threadSeg(); thread.visible = false; lab.scene.add(thread);

  await ui.ready();

  /* --------------------------------------------- 1. sandpaper */
  ui.step(0, 'Drag the <b>sandpaper</b> onto the iron nail.', { sub: 'The nail is dull — a thin layer of oxide and dirt covers it.' });
  stopCameraMoves(lab);
  await lab.focus({ pos: [NX + 0.03, 0.1, NZ + 0.16], target: [NX + 0.01, 0.005, NZ] }, 1.2);
  await lab.waitDrop(paper, nail, { radius: 0.08 });
  await lab.carry(paper, [NX + 0.005, 0.0062, NZ], { lift: 0.04, duration: 0.9, rotate: { y: 0.15 } });
  ui.instruct('<b>Rub</b> the nail: drag the sandpaper back and forth along it until the nail shines.', { sub: 'Rub away from your body.' });
  ui.readout('clean', 'Nail cleaned', '0', { unit: '%', color: '#64748b' });
  let travel = 0, lastX = paper.position.x, tickAcc = 0;
  const dull = new THREE.Color(0x6b625b), shiny = new THREE.Color(0x9a9ea4);
  const rub = lab.slider(paper, { axis: 'x', min: NX - 0.022, max: NX + 0.032, step: 0, label: 'Sandpaper — rub it along the nail' });
  const cleaner = lab.onUpdate(() => {
    const d = Math.abs(paper.position.x - lastX); lastX = paper.position.x;
    travel += d; tickAcc += d;
    if (tickAcc > 0.012) { tickAcc = 0; lab.sfx('tick'); }
    const k = Math.min(1, travel / 0.35);
    oxide.set(0.5 * (1 - k));
    nail.mat.color.copy(dull).lerp(shiny, k); nail.mat.roughness = 0.75 - 0.42 * k;
    ui.readout('clean', 'Nail cleaned', Math.round(k * 100), { unit: '%', color: '#64748b' });
  });
  await lab.waitUntil(() => travel >= 0.35 && !lab.drag, {
    auto: () => {
      const tl = lab.timeline();
      tl.to(paper.position, { x: NX - 0.016, duration: 0.2, ease: 'sine.inOut' })
        .to(paper.position, { x: NX + 0.028, duration: 0.24, ease: 'sine.inOut', yoyo: true, repeat: 11 });
      lab.play(tl).catch(() => {});
    },
  });
  cleaner(); rub(); ui.clearReadout('clean');
  lab.unpickable(paper);
  await lab.carry(paper, [-0.2, 0, 0.03], { lift: 0.03, duration: 0.8 });
  ui.observe('After rubbing with sandpaper the nail is <b>clean and shiny grey</b> — fresh iron is exposed.', { icon: '✨' });
  await lab.wait(0.5);
  await lab.home(1);

  /* --------------------------------------------- 2. pour CuSO4 */
  ui.step(1, 'Drag the <b>copper sulphate</b> bottle onto test tube <b>A</b> to pour about 10 mL.', { sub: 'Copper sulphate is harmful if swallowed.' });
  await lab.waitDrop(bottle, A, { radius: 0.09 });
  await pour(lab, bottle, A, { amount: 0.055, duration: 2, side: 1 });
  ui.instruct('Now pour the same amount into test tube <b>B</b>.');
  await lab.waitDrop(bottle, B, { radius: 0.09 });
  await pour(lab, bottle, B, { amount: 0.055, duration: 2, side: 1 });
  A.label.setText('A · kept aside'); B.label.setText('B');
  ui.observe('Both test tubes contain a clear <b>blue</b> copper sulphate solution of the same colour.', { icon: '🔵' });

  /* --------------------------------------------- 3. hang the nail in B */
  ui.step(2, 'Drag the <b>iron nail</b> onto test tube <b>B</b>. It will be tied with a thread and hung in the solution.', { sub: 'Tube A is kept aside for comparison.' });
  await lab.waitDrop(nail, B, { radius: 0.09 });
  const bw = B.getWorldPosition(new THREE.Vector3());
  const rimW = bw.y + B.rimY;
  // glass rod across the mouth of tube B
  await lab.carry(rod, [bw.x - 0.03, rimW + 0.003, bw.z], { lift: 0.06, duration: 1 });
  lab.sfx('glass');
  // nail upright above the tube, thread tied round its head
  await lab.carry(nail, [bw.x, rimW + 0.03, bw.z], { lift: 0.08, duration: 1.1, rotate: { x: 0, y: 0, z: 0 } });
  const top = new THREE.Vector3(), knot = new THREE.Vector3(bw.x, rimW + 0.003, bw.z);
  const threadUpd = lab.onUpdate(() => { top.set(nail.position.x, nail.position.y + nail.len - 0.0008, nail.position.z); knot.y = rod.position.y; thread.setEnds(knot, top); });
  thread.visible = true;
  lab.focus({ pos: [bw.x + 0.05, 0.1, bw.z + 0.24], target: [bw.x, 0.07, bw.z] }, 1.2).catch(() => {});
  await lab.tween(nail.position, { y: NAIL_TIP_Y, duration: 2, ease: 'power1.inOut' });
  lab.sfx('drop');
  ui.observe('The clean iron nail hangs by a thread with most of it <b>dipped in the blue solution</b>; its head stays above the liquid.', { icon: '🧵' });

  /* --------------------------------------------- 4. wait 20 min */
  ui.step(3, 'Drag the <b>Time</b> slider to leave the nail in the solution for about 20 minutes.');
  await ui.predict({
    q: 'What do you think will happen to the iron nail and the blue solution?',
    options: ['Nothing will change', 'The nail gets a brown coating and the blue colour fades', 'The nail dissolves completely', 'The solution turns red'],
    answer: 1,
    explain: 'Iron is more reactive than copper, so it pushes copper out of the solution; copper deposits on the nail and iron sulphate (pale green) forms.',
  });
  await lab.focus({ pos: [bw.x - 0.03, 0.085, bw.z + 0.22], target: [bw.x - 0.035, 0.045, bw.z] }, 1);
  const col = new THREE.Color();
  let mins = 0;
  const apply = (m) => {
    mins = m;
    const k = smooth(m, 0.5, 18);
    copperCoat.set(Math.min(0.97, k * 1.15));
    B.setLiquidColor(colorRamp([BLUE, 0x4f95c4, 0x86bfae, GREEN], k * 0.92, col), { opacity: THREE.MathUtils.lerp(0.8, 0.38, k) });
    ui.readout('t', 'Time', Math.floor(m + 1e-6), { unit: ' min', color: '#0ea5e9' });
  };
  apply(0);
  const sl = ui.control({ type: 'slider', label: 'Time', min: 0, max: 20, step: 0.1, value: 0, format: (v) => `${Math.floor(v)} min`, onInput: (v) => apply(v) });
  await lab.waitUntil(() => mins >= 20, {
    auto: () => { const o = { v: mins }; lab.tween(o, { v: 20, duration: 6, ease: 'none', onUpdate: () => { sl.set(o.v); apply(o.v); } }).catch(() => {}); },
  });
  apply(20); ui.clearControls();
  ui.observe('The blue colour of the solution in tube B has <b>faded to pale green</b>.', { icon: '🟢', highlight: true });
  await lab.wait(1);

  /* --------------------------------------------- 5. take out + compare */
  ui.step(4, 'Tap the <b>nail</b> to lift it out of the solution and look at it.');
  await lab.waitClick(nail);
  await Promise.all([
    lab.tween(nail.position, { y: NAIL_TIP_Y + 0.155, duration: 1.6, ease: 'power2.inOut' }),
    lab.tween(rod.position, { y: rimW + 0.003 + 0.155, duration: 1.6, ease: 'power2.inOut' }),
  ]);
  const nc = new THREE.Vector3(bw.x, NAIL_TIP_Y + 0.155 + 0.025, bw.z);
  await lab.focus({ pos: [nc.x + 0.03, nc.y + 0.01, nc.z + 0.13], target: [nc.x, nc.y - 0.002, nc.z] }, 1.2);
  ui.observe('The part of the nail that was in the solution is covered with a <b>reddish-brown coating of copper</b>. The part above the liquid is still grey.', { icon: '🟤', highlight: true });
  await lab.wait(1.2);
  ui.instruct('Tap test tube <b>A</b> to compare its colour with tube B.');
  await lab.home(1);
  await lab.waitClick(A);
  const aw = A.getWorldPosition(new THREE.Vector3());
  const cx = (aw.x + bw.x) / 2;
  await lab.focus({ pos: [cx, 0.11, aw.z + 0.3], target: [cx, 0.05, aw.z] }, 1.2);
  const table = ui.table(['Tube', 'Colour of solution', 'Iron nail']);
  table.addRow(['A (kept aside)', 'Blue', '—']);
  table.addRow(['B (nail dipped)', 'Pale green', 'Reddish-brown copper coating']);
  ui.observe('Tube A is still <b>blue</b>; tube B is <b>pale green</b>. Copper sulphate in B has changed into iron sulphate.', { icon: '⚖️', highlight: true });
  await lab.wait(1.5);
  threadUpd();
  thread.visible = false;
  // tidy up: the nail is laid on the bench in front of the rack, the glass rod goes back to its place
  await Promise.all([
    lab.carry(nail, [bw.x + 0.07, 0.003, bw.z + 0.08], { lift: 0.02, duration: 1.3, rotate: { x: 0, y: 0.4, z: Math.PI / 2 } }),
    lab.carry(rod, [0.06, 0.0025, 0.14], { lift: 0.02, duration: 1.3 }),
  ]);
  await lab.home(1.2);

  await ui.finish({
    equation: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)<br><small>grey &nbsp;&nbsp;&nbsp;&nbsp; blue &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; pale green &nbsp;&nbsp; reddish-brown</small>',
    conclusion: 'Iron displaces copper from copper sulphate solution: copper metal deposits on the nail as a <b>reddish-brown coating</b>, and the blue solution turns <b>pale green</b> as iron(II) sulphate forms. This happens because <b>iron is more reactive than copper</b>. It is a <b>displacement reaction</b>.',
    quiz: [
      { q: 'Why does the blue colour of the solution fade?', options: ['The nail absorbs the colour', 'Copper sulphate changes into iron sulphate', 'Water evaporates', 'The thread dyes the solution'], answer: 1, explain: 'Blue Cu²⁺ ions are replaced by pale green Fe²⁺ ions.' },
      { q: 'What is the brown coating on the nail?', options: ['Rust', 'Copper', 'Iron sulphate', 'Dirt from sandpaper'], answer: 1, explain: 'The copper displaced from the solution deposits on the nail.' },
      { q: 'If a copper wire is placed in iron sulphate solution, what happens?', options: ['Iron deposits on the copper', 'The solution turns blue at once', 'No reaction — copper is less reactive than iron', 'Hydrogen gas is given off'], answer: 2, explain: 'A less reactive metal cannot displace a more reactive metal from its salt solution.' },
    ],
  });
}
