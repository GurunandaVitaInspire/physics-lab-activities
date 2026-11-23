import { findLesson, lessons, school } from '../data/lessons.js';
import { loadProgress } from '../progress.js';
import { icon } from './icons.js';

export async function renderLesson(app, slug) {
  const l = findLesson(slug);
  if (!l) { location.hash = '#/'; return; }
  const prog = loadProgress();
  const i = lessons.indexOf(l);
  const prev = lessons[i - 1], next = lessons[i + 1];
  app.innerHTML = `
  <div class="lesson-page" style="--accent:${l.color}">
    <header class="site-head">
      <a class="brand" href="#/"><img src="/favicon.svg" alt="" width="34" height="34"><span><b>Smart Science Lab</b><small>${school} · Class X Physical Science</small></span></a>
      <a class="btn ghost sm" href="#/">← All lessons</a>
    </header>
    <section class="lesson-hero">
      <div class="lh-icon">${icon(l.icon, 40)}</div>
      <div class="lh-text"><div class="eyebrow">Lesson ${l.no} · ${l.subject === 'physics' ? 'Physics' : 'Chemistry'}</div><h1>${l.title}</h1><p>${l.blurb}</p>
        <div class="lh-actions"><a class="btn primary" href="#/lab/${l.experiments[0].id}">🔬 Digital Lab</a><a class="btn ghost" href="#/play/${l.slug}">🎮 Play &amp; Learn</a></div></div>
      <img class="lh-board" src="/boards/lesson${l.no}.jpg" alt="Chalkboard summary of ${l.title}" width="960" height="540">
    </section>
    <section class="exp-list">
      ${l.experiments.map((e, k) => {
        const s = prog[e.id] || 0;
        return `<a class="exp-card" href="#/lab/${e.id}">
          <div class="ec-thumb"><img src="/thumbs/${e.id}.jpg" alt="${e.title} — 3D lab" loading="lazy" width="640" height="400"><span class="ec-num">${String(k + 1).padStart(2, '0')}</span></div>
          <div class="ec-body">
            <div class="ec-tag">${e.activity}</div>
            <h3>${e.title}</h3>
            <p class="ec-short">${e.short}</p>
            <p class="ec-aim"><b>Aim:</b> ${e.aim}</p>
            <div class="ec-mat">${e.materials.slice(0, 5).map((m) => `<span>${m}</span>`).join('')}${e.materials.length > 5 ? `<span>+${e.materials.length - 5}</span>` : ''}</div>
          </div>
          <div class="ec-side"><div class="stars sm">${[1, 2, 3].map((x) => `<span class="${x <= s ? 'on' : ''}">★</span>`).join('')}</div><span class="btn primary">Enter lab ▸</span></div>
        </a>`;
      }).join('')}
    </section>
    <nav class="lesson-nav">${prev ? `<a href="#/lesson/${prev.slug}">← Lesson ${prev.no}: ${prev.title}</a>` : '<span></span>'}${next ? `<a href="#/lesson/${next.slug}">Lesson ${next.no}: ${next.title} →</a>` : ''}</nav>
  </div>`;
  return () => {};
}
