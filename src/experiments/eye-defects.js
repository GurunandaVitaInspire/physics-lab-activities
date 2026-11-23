// Activity (Lesson 10) — Correcting myopia and hypermetropia with a model eye.
// Model: eye lens → retina distance d = 10 cm. Thin lenses in contact add powers: P = P_eye + P_spectacle.
//   Myopic eye (relaxed):            f_eye = 25/3 cm  ⇒ far point  = 50 cm ⇒ concave lens f = −50 cm (−2 D)
//   Hypermetropic eye (accommodated): f_eye = 25/3 cm  ⇒ near point = 50 cm ⇒ convex  lens f = +50 cm (+2 D) to read at 25 cm
// Image distance: 1/v − 1/u = 1/f (u < 0). Blur on the retina: circle of confusion = pupil · |d − v| / v.
import * as THREE from 'three';
import { saddle, thinLens } from '../engine/apparatus/optics.js';
import { RayBundle } from '../engine/effects.js';
import { opticalBench2, modelEye, letterSprite, outdoorSprite, windowView, freeCam } from '../engine/apparatus/optics2.js';

export const config = { camera: { pos: [0.14, 0.37, 0.72], target: [0.14, 0.1, 0.0] }, benchWidth: 2.0 };

export const steps = [
  'A myopic eye looks at a distant tree',
  'Find the far point of the myopic eye',
  'Choose the lens that corrects myopia',
  'A hypermetropic eye looks at a near object',
  'Find the near point of the hypermetropic eye',
  'Choose the lens that corrects hypermetropia',
];

const D_RET = 10;            // eye lens → retina, cm
const F_EYE = 25 / 3;        // cm (both defective eyes in the state used)
const PUPIL = 1.2;           // pupil diameter, cm
const F_CONCAVE = -50, F_CONVEX = 50;
const EYE_CM = 100;          // eye lens on the 100 cm mark
const OBJ_H = 0.02;          // illuminated letter height, m

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const bench = lab.add(opticalBench2({ length: 1.2, cx: -0.08 }));
  lab.add(windowView());
  const Y0 = bench.topY + 0.1;
  const eyeX = bench.xAt(EYE_CM);
  const eSad = lab.add(saddle({ height: 0.04 }), [eyeX + 0.05, bench.topY, 0]);
  const eye = modelEye(); eye.position.y = Y0 - bench.topY - 0.04; eSad.mount.add(eye);
  eye.retina.mesh.rotation.y = -Math.PI / 2 + 0.45; // retina screen turned a little towards the student so its picture can be seen
  lab.pickable(eye, 'Model eye (lens → retina 10 cm)');
  const eyeTag = lab.tag(eye, 'Myopic eye', { offset: [0, 0.085, 0], cls: 'dark' });
  lab.tag(eye.retina.mesh, 'Retina', { offset: [0, -0.034, 0], cls: 'mono' });

  // illuminated letter "F" box (object) on a saddle
  const oSad = lab.add(saddle({ height: Y0 - bench.topY - 0.025 }), [bench.xAt(10), bench.topY, 0]);
  const obox = new THREE.Group(); oSad.mount.add(obox); obox.position.y = 0.025;
  obox.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.5 })));
  const letterTex = new THREE.CanvasTexture(letterSprite('F')); letterTex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), new THREE.MeshBasicMaterial({ map: letterTex, transparent: true, toneMapped: false }));
  face.rotation.y = Math.PI / 2; face.position.x = 0.0105; obox.add(face);
  oSad.visible = false;
  lab.pickable(oSad, 'Illuminated letter F — drag along the bench');

  // spectacle holder in front of the eye + the two trial lenses on the bench
  const holderX = eyeX - 0.02;
  const hSad = lab.add(saddle({ height: 0.07 }), [holderX, bench.topY, 0.0]);
  const mkLens = (kind, f, label, x) => {
    const L = thinLens({ r: 0.022, kind, thick: 0.006 });
    if (L.lens.material.isMeshPhysicalMaterial) L.lens.material.thickness = 0.006;
    L.position.set(x, 0.045, 0.2); L.rotation.y = 0.5; lab.add(L);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })); stand.position.set(x, 0.01, 0.2); lab.add(stand);
    lab.pickable(L, label); L.home = L.position.clone(); L.f = f; L.kind = kind;
    L.tagObj = lab.tag(L, label, { offset: [0, 0.035, 0], cls: 'mono' });
    return L;
  };
  const concave = mkLens('concave', F_CONCAVE, 'Concave lens, −2 D', 0.12);
  const convex = mkLens('convex', F_CONVEX, 'Convex lens, +2 D', 0.2);

  const rays = new RayBundle({ width: 0.0004, intensity: 1.4 }); lab.scene.add(rays);
  const letter = letterSprite('F'), tree = outdoorSprite();

  /* ------------------------------------------------------------ optics */
  const st = { mode: 'far', spec: null, v: 0, coc: 0, sharp: false };
  const u = () => EYE_CM - bench.cmAt(oSad.position.x); // object distance from eye, cm
  const power = () => 1 / F_EYE + (st.spec ? 1 / st.spec.f : 0);  // per cm
  function compute() {
    const P = power();
    let v, m;
    if (st.mode === 'far') { v = 1 / P; m = 0; }
    else { const U = -u(); const inv = P + 1 / U; v = inv <= 1e-6 ? Infinity : 1 / inv; m = v / U; }
    st.v = v; st.m = m;
    const coc = Number.isFinite(v) ? (PUPIL * Math.abs(D_RET - v)) / v : 3;   // cm on the retina
    st.coc = coc; st.sharp = coc < 0.008;
    const r = eye.retina; r.clear();
    const blurPx = Math.min(30, (coc / 100) * r.px * 0.5);
    if (st.mode === 'far') {
      const h = 0.02 + coc / 100 * 0.6;
      r.sprite(tree, { h, blur: blurPx, alpha: 0.85 / (1 + (coc / 0.4) ** 2 * 0.5), rot180: true });
    } else {
      const ho = OBJ_H * Math.abs(D_RET / v * m);
      const h = Math.max(0.002, ho) + coc / 100 * 0.6;
      r.sprite(letter, { h, blur: blurPx, alpha: 0.95 / (1 + (coc / Math.max(0.2, ho * 100)) ** 2 * 0.6), rot180: true });
    }
    r.commit();
  }
  let showRays = true;
  function drawRays() {
    if (!showRays) { rays.draw([]); return; }
    const L = [], lx = eyeX, rx = eyeX + D_RET / 100;
    const rim = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2 + 0.3; return new THREE.Vector3(lx, Y0 + Math.cos(a) * 0.006, Math.sin(a) * 0.006); });
    const I = Number.isFinite(st.v) ? new THREE.Vector3(lx + st.v / 100, Y0 + (st.mode === 'far' ? 0 : (st.m * D_RET) / st.v * 0), 0) : null;
    const col = st.sharp ? 0x86efac : 0xfde68a;
    const close = lab.camera.position.distanceTo(new THREE.Vector3(rx, Y0, 0)) < 0.3; // dim the rays in retina close-ups so the picture shows
    rim.forEach((p) => {
      const start = st.mode === 'far' ? new THREE.Vector3(lx - 0.6, p.y, p.z) : new THREE.Vector3(oSad.position.x + 0.011, Y0, 0);
      if (!I) { L.push({ pts: [start, p, new THREE.Vector3(rx, p.y, p.z)], color: col, intensity: close ? 0.55 : 1.3 }); return; }
      const dir = I.clone().sub(p); const k = (rx - p.x) / dir.x;
      const onRetina = p.clone().addScaledVector(dir, k);
      if (I.x <= rx) L.push({ pts: [start, p, I, onRetina], color: col, intensity: close ? 0.55 : 1.3 });           // meet in front, spread again
      else { L.push({ pts: [start, p, onRetina], color: col, intensity: close ? 0.55 : 1.3 }); L.push({ pts: [onRetina, I], color: col, intensity: 0.7, opacity: 0.3 }); }
    });
    rays.draw(L);
  }
  const quality = () => (st.sharp ? 'Sharp ✓' : st.coc < 0.12 ? 'Slightly blurred' : st.coc < 0.35 ? 'Blurred' : 'Very blurred');
  lab.onUpdate(() => {
    compute(); drawRays();
    if (st.mode === 'near') ui.readout('u', 'Object from eye', u().toFixed(1), { unit: 'cm', color: '#f59e0b' });
    const where = !Number.isFinite(st.v) ? '—' : Math.abs(st.v - D_RET) < 0.03 ? 'on the retina' : st.v < D_RET ? `${(D_RET - st.v).toFixed(2)} cm in front of retina` : `${(st.v - D_RET).toFixed(2)} cm behind retina`;
    ui.readout('img', 'Image forms', where, { color: st.sharp ? '#22c55e' : '#f59e0b' });
    ui.readout('q', 'Picture on retina', quality(), { color: st.sharp ? '#22c55e' : '#94a3b8' });
  });

  lab.slider(oSad, { axis: 'x', min: bench.xAt(5), max: bench.xAt(EYE_CM - 12), step: 0.0025, label: 'Letter F — drag along the bench' });
  const slideTo = (cm) => { oSad.userData.moving = true; return lab.tween(oSad.position, { x: bench.xAt(cm), duration: 1.4, ease: 'power2.inOut', onComplete: () => { oSad.userData.moving = false; } }); };
  const busy = () => !!lab.drag || oSad.userData.moving;
  const until = (cond, act) => lab.waitUntil(cond, { auto: () => { if (!cond()) act(); } });
  const retinaView = () => lab.focus({ pos: [eyeX - 0.01, Y0 + 0.045, 0.17], target: [eyeX + 0.085, Y0 - 0.004, 0] }, 1.3);
  const table = ui.table(['Defect', 'Far / near point', 'Image without lens', 'Correcting lens', 'f, P']);

  async function fitLens(L) {
    if (st.spec) { const old = st.spec; st.spec = null; old.tagObj.el.style.display = ''; await lab.carry(old, old.home.toArray(), { lift: 0.05, duration: 0.8, rotate: { y: 0.5 } }); }
    L.tagObj.el.style.display = 'none';
    await lab.carry(L, [holderX, Y0, 0], { lift: 0.06, duration: 1.0, rotate: { y: 0 } });
    st.spec = L; lab.sfx('click');
  }
  async function removeLens() { if (!st.spec) return; const old = st.spec; st.spec = null; old.tagObj.el.style.display = ''; await lab.carry(old, old.home.toArray(), { lift: 0.05, duration: 0.8, rotate: { y: 0.5 } }); }

  /** Student chooses a lens; a wrong choice makes the picture worse and is put back. */
  async function chooseLens(right, wrong, okText, badText) {
    for (;;) {
      const L = await lab.waitClick([right, wrong]);
      const before = st.coc;
      await fitLens(L);
      await lab.wait(1.2);
      if (L === right) { lab.sfx('success'); ui.observe(okText, { icon: '👓', highlight: true }); return; }
      ui.toast(`Worse! The blur grew from ${before.toFixed(2)} cm to ${st.coc.toFixed(2)} cm.`, 'warn', 3200);
      ui.observe(badText, { icon: '❌' });
      await lab.wait(1.2);
      await removeLens();
      ui.instruct('That lens made the picture <b>more</b> blurred. Tap the <b>other lens</b>.');
    }
  }

  await ui.ready();

  /* ---------------------------------------- 1. myopic eye, distant tree */
  ui.step(0, 'This model eye is <b>myopic</b> (short-sighted). Tap the eye to make it look at the <b>tree outside the window</b>.', { sub: 'Its eye lens is too strongly curved, so its focal length (8.3 cm) is too short for the 10 cm eyeball.' });
  await lab.waitClick(eye);
  eye.setLensBulge(1.35);
  const restore = freeCam(lab);
  await retinaView();
  await lab.wait(1);
  table.addRow(['Myopia', '—', `${(D_RET - st.v).toFixed(2)} cm in front of retina`, '…', '…']);
  ui.observe(`Rays from the distant tree meet <b>${(D_RET - st.v).toFixed(1)} cm in front of the retina</b> and spread out again, so the picture on the retina is <b>blurred</b>.`, { icon: '😵‍💫', highlight: true });
  await lab.wait(1);

  /* ---------------------------------------- 2. far point */
  ui.step(1, 'Bring the illuminated letter <b>F</b> towards the eye until its picture on the retina becomes sharp.', { sub: 'Drag the letter box along the bench and watch the retina.' });
  await lab.home(1);
  st.mode = 'near'; oSad.visible = true;
  await until(() => st.sharp && !busy(), () => slideTo(EYE_CM - 50));
  lab.sfx('success');
  await retinaView();
  const farPt = u();
  ui.observe(`The letter is seen clearly only when it is within <b>${farPt.toFixed(0)} cm</b> of the eye. This is the <b>far point</b> of the myopic eye — anything farther looks blurred.`, { icon: '📏', highlight: true });
  table.setRow(0, ['Myopia', `Far point ${farPt.toFixed(0)} cm`, `${(D_RET - 1 / power()).toFixed(2)} cm in front of retina`, '…', '…']);
  await lab.wait(1);

  /* ---------------------------------------- 3. correct myopia */
  ui.step(2, 'The eye must see the distant tree again. Which spectacle lens will help?');
  st.mode = 'far'; oSad.visible = false;
  await ui.predict({ q: 'The rays meet in front of the retina. To move the image back onto the retina we need a lens that…', options: ['converges the rays (convex lens)', 'diverges the rays (concave lens)', 'any lens will do', 'no lens — a stronger eye lens'], answer: 1, explain: 'A concave (diverging) lens spreads the rays a little before they enter the eye, so they meet farther back — on the retina.' });
  await lab.home(1);
  ui.instruct('Tap the lens you choose to put it in the spectacle holder in front of the eye.');
  await chooseLens(concave, convex,
    'With the <b>concave lens (−2 D)</b> the picture of the distant tree is <b>sharp</b> on the retina. The lens makes parallel rays appear to come from the far point (50 cm), which the eye can focus.',
    'The convex lens made the rays converge even more — they meet still farther in front of the retina.');
  await retinaView();
  await lab.wait(1.2);
  table.setRow(0, ['Myopia', `Far point ${farPt.toFixed(0)} cm`, 'in front of retina', 'Concave', `f = −${farPt.toFixed(0)} cm, P = −${(100 / farPt).toFixed(1)} D`]);
  await removeLens();

  /* ---------------------------------------- 4. hypermetropic eye */
  ui.step(3, 'Tap the eye to change it into a <b>hypermetropic</b> (far-sighted) eye. It will try to read the letter <b>25 cm</b> away.', { sub: 'Even with its eye lens squeezed as much as it can, its focal length is only 8.3 cm — too long to focus 25 cm.' });
  await lab.home(1);
  await lab.waitClick(eye);
  eyeTag.setText('Hypermetropic eye');
  eye.setLensBulge(1.15);
  st.mode = 'near'; oSad.visible = true;
  ui.instruct('Drag the letter <b>F</b> to <b>25 cm</b> from the eye (the normal near point).');
  await until(() => Math.abs(u() - 25) <= 0.6 && !busy(), () => slideTo(EYE_CM - 25));
  await retinaView();
  await lab.wait(1);
  table.addRow(['Hypermetropia', '—', `${(st.v - D_RET).toFixed(2)} cm behind retina`, '…', '…']);
  ui.observe(`Rays from the letter at 25 cm reach the retina <b>before they meet</b> — they would meet ${(st.v - D_RET).toFixed(1)} cm <b>behind the retina</b>. The near letter looks blurred.`, { icon: '😵', highlight: true });

  /* ---------------------------------------- 5. near point */
  ui.step(4, 'Move the letter <b>away</b> from the eye until its picture on the retina becomes sharp.');
  await lab.home(1);
  await until(() => st.sharp && !busy(), () => slideTo(EYE_CM - 50));
  lab.sfx('success');
  const nearPt = u();
  await retinaView();
  ui.observe(`The letter is seen clearly only from <b>${nearPt.toFixed(0)} cm</b> or farther. This is the <b>near point</b> of the hypermetropic eye (a normal eye: 25 cm).`, { icon: '📏', highlight: true });
  table.setRow(1, ['Hypermetropia', `Near point ${nearPt.toFixed(0)} cm`, 'behind retina (at 25 cm)', '…', '…']);
  await lab.wait(1);

  /* ---------------------------------------- 6. correct hypermetropia */
  ui.step(5, 'Bring the letter back to <b>25 cm</b>, then choose the lens that lets the eye read it.');
  await lab.home(1);
  await until(() => Math.abs(u() - 25) <= 0.6 && !busy(), () => slideTo(EYE_CM - 25));
  ui.instruct('Tap the lens you choose to put it in front of the eye.');
  await chooseLens(convex, concave,
    'With the <b>convex lens (+2 D)</b> the letter at 25 cm is <b>sharp</b> on the retina. The lens makes the rays from 25 cm appear to come from the near point (50 cm).',
    'The concave lens spread the rays even more — they would now meet still farther behind the retina.');
  await retinaView();
  await lab.wait(1.2);
  const fc = (25 * nearPt) / (nearPt - 25);
  table.setRow(1, ['Hypermetropia', `Near point ${nearPt.toFixed(0)} cm`, 'behind retina', 'Convex', `f = +${fc.toFixed(0)} cm, P = +${(100 / fc).toFixed(1)} D`]);
  await lab.home(1.2);
  restore();

  await ui.finish({
    equation: 'Myopia: f = −(far point) &nbsp;·&nbsp; Hypermetropia: 1/f = 1/25 − 1/(near point) &nbsp;·&nbsp; P = 100/f(cm) D',
    conclusion: 'In a <b>myopic</b> eye the image of a distant object forms <b>in front of</b> the retina; a <b>concave lens</b> of suitable power (here −2 D for a far point of 50 cm) diverges the rays and corrects it. In a <b>hypermetropic</b> eye the image of a near object would form <b>behind</b> the retina; a <b>convex lens</b> (here +2 D for a near point of 50 cm) converges the rays so the eye can read at 25 cm.',
    quiz: [
      { q: 'A person cannot see distant objects clearly. The defect and the correcting lens are…', options: ['hypermetropia, convex lens', 'myopia, concave lens', 'myopia, convex lens', 'presbyopia, concave lens'], answer: 1, explain: 'Distant objects blurred = myopia; the image forms in front of the retina, corrected by a diverging (concave) lens.' },
      { q: 'The far point of a myopic eye is 80 cm. The power of the lens needed is…', options: ['+1.25 D', '−1.25 D', '−0.8 D', '+0.8 D'], answer: 1, explain: 'f = −80 cm = −0.8 m, so P = 1/f = −1.25 D.' },
      { q: 'In a hypermetropic eye, the image of a nearby object is formed…', options: ['on the retina', 'in front of the retina', 'behind the retina', 'on the eye lens'], answer: 2, explain: 'The eye lens cannot converge the rays enough, so they would meet behind the retina.' },
    ],
  });
}
