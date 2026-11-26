// Experiment page: builds the 3D lab + HUD and runs the experiment script.
import { findExperiment, nextExperiment, credit } from '../data/lessons.js';
import { Lab, LabAborted } from '../engine/Lab.js';
import { LabUI } from '../engine/ui.js';
import { stopSpeech } from '../engine/audio.js';

const modules = import.meta.glob('../experiments/*.js');

export async function renderExperiment(app, id) {
  const meta = findExperiment(id);
  if (!meta) { location.hash = '#/'; return; }
  document.body.className = 'in-lab';
  const next = nextExperiment(id);
  let lab = null, ui = null, disposed = false;

  app.innerHTML = `
  <div class="labpage" style="--accent:${meta.lesson.color}">
    <div class="lt-credit-bar">${credit}</div>
    <header class="lab-top">
      <a class="lt-back" href="#/lesson/${meta.lesson.slug}" title="Back to lesson">←</a>
      <div class="lt-title"><small class="lt-credit">${credit}</small><small>Lesson ${meta.lesson.no} · ${meta.activity}</small><b>${meta.title}</b></div>
      <span class="step-pill"></span>
      <div class="lab-actions">
        <button data-act="voice" title="Voice narration">🗣️</button>
        <button data-act="sound" title="Sound effects">🔊</button>
        <button data-act="reset" title="Restart experiment">↺</button>
        <button data-act="record" class="rec-toggle" title="Lab record">📒</button>
      </div>
    </header>
    <main class="lab-main"><div class="viewport"><div class="loading"><div class="spin"></div>Setting up the bench…</div></div><aside class="record"></aside></main>
  </div>`;
  const root = app.querySelector('.labpage');

  const loader = modules[`../experiments/${id}.js`];
  if (!loader) {
    root.querySelector('.viewport').innerHTML = `<div class="soon"><h2>This lab is being set up</h2><p>${meta.aim}</p><a class="btn primary" href="#/lesson/${meta.lesson.slug}">Back to lesson</a></div>`;
    return () => {};
  }
  const mod = await loader();

  const start = async () => {
    if (disposed) return;
    ui?.dispose(); lab?.dispose();
    const vp = root.querySelector('.viewport');
    vp.innerHTML = '';
    const recEl = root.querySelector('.record'); recEl.innerHTML = '';
    ui = new LabUI(root, meta, {
      next,
      onReset: () => start(),
      onExit: () => { location.hash = `#/lesson/${meta.lesson.slug}`; },
      onNext: () => { if (next) location.hash = `#/lab/${next.id}`; },
    });
    lab = new Lab(vp.querySelector('.lab-host') || vp.appendChild(Object.assign(document.createElement('div'), { className: 'lab-host' })), mod.config || {});
    ui.attach(lab);
    if (mod.steps) ui.setSteps(mod.steps);
    const thisLab = lab;
    if (import.meta.env.DEV) window.__labState = { running: true, id };
    try {
      await mod.default({ lab, ui, meta });
    } catch (err) {
      if (err instanceof LabAborted || !thisLab.alive || err?.message === 'aborted') return;
      console.error(err);
      if (import.meta.env.DEV) window.__labState = { error: String(err?.stack || err), id };
      ui.toast('Something went wrong in this experiment. Press ↺ to restart.', 'warn', 6000);
    }
  };
  start();
  return () => { disposed = true; stopSpeech(); ui?.dispose(); lab?.dispose(); };
}
