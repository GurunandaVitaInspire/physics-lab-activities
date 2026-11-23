// Activity 12.7 — Force on a current-carrying conductor in a magnetic field (Fleming's left-hand rule).
// Light aluminium tube (L = 11 cm, mass 3 g) hung by two flexible wires (14.4 cm) between the poles of a horseshoe magnet
// (B ≈ 0.1 T across pole faces 2.6 cm wide). Battery 6 V (internal 1.2 Ω) + 2.7 Ω protective resistor + rod/leads 0.1 Ω
// → I = 1.5 A. F = B I L = 0.1 × 1.5 × 0.026 ≈ 3.9 mN ≈ 0.13 mg → the rod swings out by about 1.5–2 cm.
// Directions: x → right, y → up, z → towards the student. F = I L × B.
import * as THREE from 'three';
import {
  circuitBoard, batteryHolder, dryCell, plugKey, powerResistor, Lead, WIRE, CurrentFlow, worldPos,
  swingStand, aluminiumRod, horseshoeMagnet, arrow3D,
} from '../engine/apparatus/electric.js';
import { wood, copper } from '../engine/materials.js';

export const config = { camera: { pos: [0.06, 0.42, 0.58], target: [0, 0.1, 0.0] } };

export const steps = [
  'Place the horseshoe magnet around the rod',
  'Close the key — watch the rod',
  'Reverse the current',
  'Turn the magnet upside down',
  'Reverse the current once more',
  'Apply Fleming’s left-hand rule',
];

const EMF = 6.0, R_TOTAL = 4.0, B0 = 0.1, L_EFF = 0.026, MASS = 0.003, G = 9.8;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const board = lab.add(circuitBoard({ w: 0.62, d: 0.42 }), [0, 0, 0]);
  const T = board.topY;
  const Z0 = 0.02;
  const stand = lab.add(swingStand({ h: 0.24, span: 0.11, pillarX: -0.14 }), [0, T, Z0]);
  const yP = T + 0.24 - 0.006, LW = 0.144, yR = yP - LW;
  const rod = lab.add(aluminiumRod({ L: 0.11 }), [0, yR, Z0]);
  lab.pickable(rod, 'Aluminium rod AB');
  const hangMat = copper();
  const hangers = [-1, 1].map(() => lab.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 8), hangMat)));
  const A_END = new THREE.Vector3(0, 0, -0.045), B_END = new THREE.Vector3(0, 0, 0.045); // A at the back, B at the front

  const block = lab.add(new THREE.Mesh(new THREE.BoxGeometry(0.23, yR - 0.032 - T, 0.045), wood({ base: '#9b6a3c', key: 'standwood' })), [0.115, T + (yR - 0.032 - T) / 2, Z0]);
  void block;
  const magHold = lab.add(new THREE.Group(), [0.13, yR, Z0]); magHold.rotation.y = Math.PI; // opening faces −x (towards the pillar)
  const magnet = horseshoeMagnet({}); magHold.add(magnet); lab.track(magHold);
  lab.pickable(magHold, 'Horseshoe magnet');
  const holder = lab.add(batteryHolder({ slots: 4 }), [-0.07, T, -0.16]);
  for (let i = 0; i < 4; i++) { const c = dryCell(); c.position.copy(holder.slotLocal(i)); holder.add(c); }
  lab.pickable(holder, 'Battery (4 cells, 6 V)');
  const key = lab.add(plugKey(), [0.21, T, -0.16]);
  lab.pickable(key.plug, 'Plug key');
  const resistor = lab.add(powerResistor({ ohms: 2.7, watts: 10, name: 'R' }), [0.2, T, -0.06]);
  lab.pickable(resistor, 'Protective resistor 2.7 Ω');

  /* ------------------------------------------------------------ wiring */
  const P = (o, l) => worldPos(o, l);
  const tap = (k) => P(holder, holder.tapLocal(k));
  const kL = P(key, key.termLocal(0)), kR = P(key, key.termLocal(1));
  const post = (i) => P(stand, stand.postLocal(i)).add(new THREE.Vector3(0, 0.004, 0)); // 0 = back (A side), 1 = front (B side)
  const mk = (c, o) => lab.add(new Lead({ color: c, ...o }));
  const L1 = mk(WIRE.red, { clipB: true }), L2 = mk(WIRE.red), L3 = mk(WIRE.red, { clipB: true }), L4 = mk(WIRE.black, { clipB: true });
  L1.set(kL, tap(4), { floorY: T });
  L2.set(kR, P(resistor, resistor.endLocal(1)), { floorY: T, via: [[0.26, -0.1]] });
  let swapped = false; // false: current enters at the back post → flows A→B (towards the student, +z)
  const route3 = (b) => L3.set(P(resistor, resistor.endLocal(0)), b, { floorY: T, via: [[0.12, -0.045], [-0.09, -0.045], [-0.129, T + 0.03, -0.004], [-0.129, T + 0.215, -0.004], [-0.06, T + 0.247, -0.006]], liftB: 0.04 });
  const route4 = (b) => L4.set(tap(0), b, { floorY: T, via: [[-0.23, -0.07], [-0.2, 0.06], [-0.151, T + 0.03, 0.034], [-0.151, T + 0.215, 0.034], [-0.06, T + 0.247, 0.046]], liftB: 0.04 });
  route3(post(0)); route4(post(1));

  /* ------------------------------------------------------------ physics */
  let theta = 0, omega = 0, bSign = 1, magnetIn = false;
  const iSign = () => (swapped ? -1 : 1); // +1: current along +z (towards the student)
  const current = () => (key.closed ? EMF / R_TOTAL : 0);
  const Bat = (x) => { // field magnitude at the rod's x (magnet gap centre at x = 0, U interior towards +x)
    if (!magnetIn) return 0;
    if (x < -0.011) return B0 * Math.exp(-(((x + 0.011) / 0.01) ** 2));
    if (x > 0.011) return B0 * (0.9 - Math.min(0.4, (x - 0.011) * 6));
    return B0;
  };
  const rodX = () => LW * Math.sin(theta);
  const force = () => -iSign() * bSign * Bat(rodX()) * current() * L_EFF; // F_x = (I ẑ × B ŷ)·x̂ = −I B
  lab.onUpdate((dt) => {
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const acc = (-G * Math.sin(theta) + (force() / MASS) * Math.cos(theta)) / LW - 1.6 * omega;
      omega += acc * h; theta += omega * h;
    }
    rod.position.set(rodX(), yP - LW * Math.cos(theta), Z0);
    rod.rotation.z = 0;
    hangers.forEach((m, k) => {
      const top = new THREE.Vector3(0, yP, Z0 + (k ? 0.045 : -0.045));
      const bot = new THREE.Vector3(rod.position.x, rod.position.y + 0.003, Z0 + (k ? 0.045 : -0.045));
      m.position.copy(top).add(bot).multiplyScalar(0.5);
      m.scale.set(1, top.distanceTo(bot), 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    });
    const x = rodX() * 100;
    ui.readout('x', 'Rod displacement', `${Math.abs(x).toFixed(1)} cm ${Math.abs(x) < 0.05 ? '' : x < 0 ? '← left' : 'right →'}`, { color: '#22c55e' });
    ui.readout('I', 'Current', key.closed ? `${current().toFixed(1)} A ${iSign() > 0 ? 'A→B' : 'B→A'}` : '0 A', { color: '#ef4444' });
    if (flh.visible) flh.position.copy(rod.position);
    flow.on = showFlow && key.closed; flow.speed = 0.08;
  });

  const flow = lab.add(new CurrentFlow({ spacing: 0.024 }));
  let showFlow = false;
  const flowPath = () => {
    const a = new THREE.Vector3(0, yP, Z0 - 0.045), b = new THREE.Vector3(0, yP, Z0 + 0.045);
    const ra = new THREE.Vector3(0, yR, Z0 - 0.045), rb = new THREE.Vector3(0, yR, Z0 + 0.045);
    const rodPath = swapped ? [b, rb, ra, a] : [a, ra, rb, b];
    flow.setPath([...L1.points(30).reverse(), kL.clone().setY(kL.y + 0.012), kR.clone().setY(kR.y + 0.012), ...L2.points(30),
      P(resistor, resistor.endLocal(1)), P(resistor, resistor.endLocal(0)), ...L3.points(50), ...rodPath, ...L4.points(60).reverse(), tap(0), tap(4)]);
  };
  flowPath();
  ui.control({ type: 'toggle', label: 'Show current direction', value: false, onChange: (v) => { showFlow = v; } });

  // Fleming's left-hand rule overlay at the rod
  const flh = new THREE.Group(); flh.visible = false; lab.add(flh);
  const aF = arrow3D({ color: 0x22c55e, length: 0.06 }), aB = arrow3D({ color: 0x3b82f6, length: 0.06 }), aI = arrow3D({ color: 0xef4444, length: 0.06 });
  flh.add(aF, aB, aI);
  let flhTags = [];
  const setFLH = (on) => {
    flhTags.forEach((t) => lab.untag(t)); flhTags = [];
    flh.visible = on; if (!on) return;
    const s = -iSign() * bSign; // force direction along x
    aF.rotation.set(0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); // +y → ±x
    aB.rotation.set(bSign > 0 ? 0 : Math.PI, 0, 0);
    aI.rotation.set(iSign() > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0); // +y → ±z
    [aF, aB, aI].forEach((a) => { a.scale.setScalar(0.01); lab.tween(a.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.7)' }).catch(() => {}); });
    flhTags = [
      lab.tag(aF, 'F — thumb (motion)', { offset: [0, 0.07, 0], cls: 'dark' }),
      lab.tag(aB, 'B — first finger (field)', { offset: [0, 0.07, 0], cls: 'dark' }),
      lab.tag(aI, 'I — second finger (current)', { offset: [0, 0.07, 0], cls: 'dark' }),
    ];
  };
  ui.control({ type: 'toggle', label: 'Fleming’s left-hand rule', value: false, onChange: (v) => setFLH(v) });

  const table = ui.table(['Case', 'Current in rod', 'Magnetic field', 'Rod displaced']);
  const closeView = { pos: [-0.02, yR + 0.12, 0.3], target: [0.0, yR, Z0] };
  const curTxt = () => (iSign() > 0 ? 'A → B (towards you)' : 'B → A (away from you)');
  const fieldTxt = () => (bSign > 0 ? 'Upward (N pole below)' : 'Downward (N pole above)');

  async function trial(n, sub) {
    ui.instruct('Tap the <b>plug key</b> to pass the current.', { sub });
    await lab.focus(closeView, 1.0);
    await lab.waitClick(key.plug);
    await key.insert(lab);
    await lab.wait(3.2);
    const x = rodX();
    const dirTxt = x < 0 ? 'Left — pushed out of the magnet' : 'Right — pushed into the magnet';
    table.addRow([`${n}`, curTxt(), fieldTxt(), `${dirTxt} (${Math.abs(x * 100).toFixed(1)} cm)`]);
    lab.sfx('success');
    return { x, dirTxt };
  }
  async function keyOut() {
    ui.instruct('Take the <b>plug key</b> out — the rod swings back to rest.');
    await lab.waitClick(key.plug);
    await key.remove(lab);
    await lab.wait(1.5);
  }
  async function swapLeads() {
    lab.pickable(stand, 'Terminals on the stand');
    ui.instruct('Tap the <b>terminals on the stand</b> to interchange the two leads (this reverses the current in the rod).');
    await lab.waitClick(stand);
    lab.unpickable(stand);
    const a0 = post(0), b0 = post(1), t = { k: 0 };
    const from3 = swapped ? b0 : a0, to3 = swapped ? a0 : b0, from4 = swapped ? a0 : b0, to4 = swapped ? b0 : a0;
    await lab.tween(t, { k: 1, duration: 1.0, ease: 'power2.inOut', onUpdate: () => {
      const lift = new THREE.Vector3(0.02 * Math.sin(t.k * Math.PI), 0.04 * Math.sin(t.k * Math.PI), 0);
      route3(from3.clone().lerp(to3, t.k).add(lift));
      route4(from4.clone().lerp(to4, t.k).add(lift.clone().multiplyScalar(-0.5)));
    } });
    swapped = !swapped;
    route3(swapped ? b0 : a0); route4(swapped ? a0 : b0); flowPath();
    lab.sfx('click');
  }

  await ui.ready();

  /* -------------------------------------- 1. magnet */
  ui.step(0, 'Slide the <b>horseshoe magnet</b> so that the aluminium rod lies between its poles.', { sub: 'Drag the magnet towards the rod (or tap it). The N pole is below the rod, so the field between the poles points upward.' });
  await lab.waitDrop(magHold, rod, { radius: 0.1 });
  await lab.tween(magHold.position, { x: 0, y: yR, z: Z0, duration: 1.2, ease: 'power2.inOut' });
  magnetIn = true; lab.sfx('drop');
  ui.observe('The rod AB hangs horizontally between the poles of the horseshoe magnet: <b>N pole below, S pole above</b>, so the magnetic field is <b>vertically upward</b>, at right angles to the rod.', { icon: '🧲' });

  /* -------------------------------------- 2. close key */
  ui.step(1, 'Close the key and watch the rod.', { sub: 'The current flows through the rod from A (back) to B (front, towards you).' });
  await ui.predict({
    q: 'When the current flows through the rod, what will happen?',
    options: ['Nothing — aluminium is not magnetic', 'The rod is pushed sideways', 'The rod is pulled up to the S pole', 'The rod gets attracted to the N pole'],
    answer: 1,
    explain: 'A current-carrying conductor in a magnetic field feels a force at right angles to both the current and the field.',
  });
  const r1 = await trial(1, 'Watch the rod closely.');
  ui.observe(`The rod is <b>displaced to the left</b> by about ${Math.abs(r1.x * 100).toFixed(1)} cm — out of the gap between the poles. A force acts on the current-carrying rod <b>perpendicular to both the rod and the field</b>. (Aluminium is not magnetic: the force comes from the current.)`, { icon: '↔️', highlight: true });
  await keyOut();

  /* -------------------------------------- 3. reverse current */
  ui.step(2, 'Reverse the direction of current in the rod.');
  await swapLeads();
  const r2 = await trial(2, 'Current now flows from B to A.');
  ui.observe(`With the current reversed the rod is displaced in the <b>opposite direction</b> (to the right, ${Math.abs(r2.x * 100).toFixed(1)} cm). The direction of the force depends on the direction of the current.`, { icon: '🔁', highlight: true });
  await keyOut();

  /* -------------------------------------- 4. flip magnet */
  ui.step(3, 'Tap the <b>magnet</b> to turn it upside down (N pole on top).', { sub: 'This reverses the direction of the magnetic field.' });
  await lab.home(0.8);
  await lab.waitClick(magHold);
  magnetIn = false;
  await lab.tween(magHold.position, { x: 0.13, duration: 0.9, ease: 'power2.inOut' });
  const tl = lab.timeline({ paused: true });
  tl.to(magHold.position, { y: yR + 0.07, duration: 0.4, ease: 'power2.out' }).to(magnet.rotation, { x: magnet.rotation.x + Math.PI, duration: 0.8, ease: 'power2.inOut' }).to(magHold.position, { y: yR, duration: 0.4, ease: 'power2.in' });
  await lab.play(tl);
  bSign = -1;
  await lab.tween(magHold.position, { x: 0, duration: 0.9, ease: 'power2.inOut' });
  magnetIn = true; lab.sfx('drop');
  const r3 = await trial(3, 'Field now points downward; current still B → A.');
  ui.observe(`With the field reversed (and the current still B → A) the rod moves <b>left</b> again (${Math.abs(r3.x * 100).toFixed(1)} cm). Reversing the field reverses the force.`, { icon: '🔃', highlight: true });
  await keyOut();

  /* -------------------------------------- 5. reverse current again */
  ui.step(4, 'Reverse the current once more (A → B) with the magnet still upside down.');
  await lab.home(0.8);
  await swapLeads();
  const r4 = await trial(4, 'Current A → B, field downward.');
  ui.observe(`Now the rod moves <b>right</b> (${Math.abs(r4.x * 100).toFixed(1)} cm) — the same way as in case 2, where <b>both</b> the current and the field were the other way round. Reversing only one of them reverses the force; reversing both leaves it unchanged.`, { icon: '✅', highlight: true });

  /* -------------------------------------- 6. Fleming */
  ui.step(5, 'Stretch the thumb, first finger and second finger of your <b>left hand</b> at right angles. Tap the rod to see the rule.', { sub: 'First finger → Field, seCond finger → Current, thuMb → Motion (force).' });
  await lab.waitClick(rod);
  setFLH(true);
  await lab.focus({ pos: [-0.09, yR + 0.14, 0.27], target: [0.0, yR + 0.01, Z0] }, 1.2);
  await lab.wait(2.5);
  ui.observe('<b>Fleming’s left-hand rule:</b> with the first finger along the field (B) and the second finger along the current (I), the thumb points along the force (F) — exactly the direction in which the rod moved.', { icon: '🖐️', highlight: true });
  ui.instruct('Use the rule: in case 1 the current was towards you and the field upward. Which way was the force?');
  let choice = null;
  const seg = ui.control({ type: 'segmented', label: 'Force in case 1:', options: [{ value: 'L', label: 'Left' }, { value: 'R', label: 'Right' }, { value: 'U', label: 'Up' }, { value: 'D', label: 'Down' }], value: null, onChange: (v) => { choice = v; if (v !== 'L') ui.toast('Point the first finger up and the second finger towards you — where does the thumb point?', 'warn'); } });
  await lab.waitUntil(() => choice === 'L', { auto: () => { choice = 'L'; seg.set('L'); } });
  lab.sfx('success');
  await keyOut();
  setFLH(false);
  ui.clearControls();
  await lab.home(1);

  await ui.finish({
    equation: 'F = B I L (I ⟂ B) &nbsp;·&nbsp; Fleming’s left-hand rule: First finger – Field, seCond finger – Current, thuMb – Motion',
    conclusion: 'A current-carrying conductor placed in a magnetic field experiences a <b>force</b>. The force is perpendicular to both the current and the field, and its direction <b>reverses</b> when either the current or the field is reversed. Its direction is given by <b>Fleming’s left-hand rule</b>. This is the principle of the electric motor.',
    quiz: [
      { q: 'In Fleming’s left-hand rule the first finger points along the…', options: ['Current', 'Force', 'Magnetic field', 'Motion of electrons'], answer: 2, explain: 'First finger – Field, seCond finger – Current, thuMb – Motion.' },
      { q: 'A current-carrying rod in a magnetic field moves left. If both the current and the field are reversed, it will move…', options: ['Left', 'Right', 'Up', 'It will not move'], answer: 0, explain: 'Each reversal flips the force; two reversals bring it back to the original direction.' },
      { q: 'When is the force on a current-carrying conductor in a magnetic field zero?', options: ['When it is perpendicular to the field', 'When it is parallel to the field', 'When the current is large', 'When the magnet is strong'], answer: 1, explain: 'The force is maximum when the current is perpendicular to the field and zero when it is parallel.' },
    ],
  });
}
