// Dev-only QA audit (served by the Vite dev server, never part of the build).
// Usage in a page opened with ?test&auto:  const { audit } = await import('/tools/qa-audit.js'); await audit('zinc-hcl');
// - runs the experiment to the end with the auto-student (which drops items on their targets like a real drag)
// - flags objects that moved during the lab and finish intersecting another object or floating in the air
// - saves a frame at every key observation (.qa/thumb-<id>-<n>.png) as thumbnail candidates
import * as THREE from 'three';

// bounds of visible meshes only (spent effects such as match sparks stay invisible and must not count)
const box = (o) => {
  const b = new THREE.Box3(); o.updateWorldMatrix(true, true);
  const walk = (n) => { if (!n.visible) return; if (n.isMesh && n.geometry) { n.geometry.computeBoundingBox(); b.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld)); } n.children.forEach(walk); };
  walk(o); return b.isEmpty() ? new THREE.Box3().setFromCenterAndSize(o.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(1e-3, 1e-3, 1e-3)) : b;
};
const vol = (b) => { const s = b.getSize(new THREE.Vector3()); return Math.max(1e-9, s.x * s.y * s.z); };
const label = (o) => o.userData.pickLabel || o.name || o.type;

function tracked(lab) {
  const skip = new Set([lab.room]);
  return lab.scene.children.filter((o) => !skip.has(o) && !o.isLight && !o.isCamera && o.visible && (() => {
    let mesh = false; o.traverse((c) => { if (c.isMesh && c.visible) mesh = true; }); return mesh;
  })() && o.position.y < 2); // ignore far-away sub-scenes (e.g. molecular views)
}

export async function audit(id, { maxSec = 300 } = {}) {
  const T = window.__labTest; const lab = T.lab;
  await T.advance(1);
  const objs = tracked(lab);
  const start = new Map(objs.map((o) => [o, { p: o.getWorldPosition(new THREE.Vector3()), b: box(o) }]));
  const startOverlap = new Set();
  for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
    if (start.get(objs[i]).b.intersectsBox(start.get(objs[j]).b)) startOverlap.add(objs[i].id + ':' + objs[j].id);
  }
  // key-moment frames
  let n = 0;
  const ui = lab.ui; const orig = ui.observe.bind(ui);
  ui.observe = (text, opts = {}) => { orig(text, opts); if (opts.highlight) T.shot(`thumb-${id}-${++n}`); };
  let t = 0;
  while (t < maxSec && !(window.__labState?.finished || window.__labState?.error)) { await T.advance(2); t += 2; }
  await T.advance(1.5);
  await T.shot(`end-${id}`);
  const issues = [];
  const now = tracked(lab);
  for (const o of now) {
    const s = start.get(o); if (!s) continue;
    const p = o.getWorldPosition(new THREE.Vector3()), b = box(o);
    const moved = p.distanceTo(s.p) > 0.015;
    if (!moved) continue;
    for (const q of now) {
      if (q === o) continue;
      const key = o.id < q.id ? o.id + ':' + q.id : q.id + ':' + o.id;
      if (startOverlap.has(key)) continue;
      const qb = box(q); if (!b.intersectsBox(qb)) continue;
      const inter = b.clone().intersect(qb);
      const frac = vol(inter) / Math.min(vol(b), vol(qb));
      if (frac > 0.12) issues.push(`${label(o)} overlaps ${label(q)} (${Math.round(frac * 100)}%), moved ${(p.distanceTo(s.p) * 100).toFixed(0)} cm`);
    }
    if (b.min.y > 0.012) {
      const below = now.some((q) => q !== o && (() => { const qb = box(q); return qb.max.y <= b.min.y + 0.01 && qb.max.y > b.min.y - 0.06 && qb.min.x < b.max.x && qb.max.x > b.min.x && qb.min.z < b.max.z && qb.max.z > b.min.z; })());
      if (!below) issues.push(`${label(o)} left floating ${(b.min.y * 100).toFixed(1)} cm above the bench`);
    }
  }
  return { id, ok: !!window.__labState?.finished, error: window.__labState?.error, keyShots: n, issues };
}
