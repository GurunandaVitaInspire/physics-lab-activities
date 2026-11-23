import { lessons, school, allExperiments } from '../data/lessons.js';
import { loadProgress } from '../progress.js';
import { icon } from './icons.js';

export async function renderHome(app) {
  const prog = loadProgress();
  const total = allExperiments.length;
  const done = allExperiments.filter((e) => prog[e.id]).length;
  const stars = Object.values(prog).reduce((a, b) => a + b, 0);
  app.innerHTML = `
  <div class="home">
    <header class="site-head">
      <a class="brand" href="#/"><img src="/favicon.svg" alt="" width="34" height="34"><span><b>Smart Science Lab</b><small>${school} · Class X Physical Science</small></span></a>
      <div class="head-stats"><span>⭐ ${stars}</span><span>${done}/${total} done</span></div>
    </header>
    <section class="hero">
      <div class="hero-3d" id="hero3d"></div>
      <div class="hero-copy">
        <div class="eyebrow">Virtual laboratory · NCERT Class X</div>
        <h1>Real apparatus.<br><em>Real reactions.</em></h1>
        <p>Pour acids, light burners, focus candle flames on a screen and close real circuits — every textbook activity rebuilt as a 3D experiment you can do yourself.</p>
        <div class="hero-cta"><a class="btn primary" href="#/lab/zinc-hcl">▶ Try an experiment</a><a class="btn ghost" href="#lessons">Browse lessons</a></div>
        <div class="hero-facts"><div><b>${total}</b><span>experiments</span></div><div><b>8</b><span>lessons</span></div><div><b>3D</b><span>apparatus</span></div></div>
      </div>
    </section>
    <section class="lessons" id="lessons">
      <div class="sec-head"><h2>Choose a lesson</h2><div class="filters"><button class="on" data-f="all">All</button><button data-f="chemistry">Chemistry</button><button data-f="physics">Physics</button></div></div>
      <div class="lesson-grid">
        ${lessons.map((l) => {
          const n = l.experiments.length;
          const d = l.experiments.filter((e) => prog[e.id]).length;
          return `<a class="lesson-card" data-s="${l.subject}" href="#/lesson/${l.slug}" style="--accent:${l.color}">
            <div class="lc-board"><img src="/boards/lesson${l.no}.jpg" alt="Chalkboard summary of ${l.title}" loading="lazy" width="960" height="540"></div>
            <div class="lc-top"><span class="lc-icon">${icon(l.icon, 26)}</span><span class="lc-no">Lesson ${l.no}</span></div>
            <h3>${l.title}</h3>
            <p>${l.blurb}</p>
            <div class="lc-foot"><span>${n} experiment${n > 1 ? 's' : ''} · 🎮 Lab Rush</span><span class="lc-prog"><i style="width:${(d / n) * 100}%"></i></span></div>
          </a>`;
        }).join('')}
      </div>
    </section>
    <footer class="site-foot">Smart Science Lab · ${school} · Built for Class X Physical Science · Always do real experiments under your teacher’s supervision.</footer>
  </div>`;

  app.querySelector('.filters').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    app.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
    app.querySelectorAll('.lesson-card').forEach((c) => { c.style.display = b.dataset.f === 'all' || c.dataset.s === b.dataset.f ? '' : 'none'; });
  });
  app.querySelector('a[href="#lessons"]').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('lessons').scrollIntoView({ behavior: 'smooth' }); });

  // The live 3D hero is decoration: load it after the page is interactive, skip it where it would cost too much,
  // and stop rendering it while it is scrolled out of view.
  let hero = null, io = null, gone = false;
  const el = app.querySelector('#hero3d');
  const lowEnd = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!lowEnd && !reduced) {
    const start = async () => {
      const { buildHero } = await import('./hero.js');
      if (gone || !el.isConnected) return;
      hero = buildHero(el);
      io = new IntersectionObserver(([e]) => hero?.renderer.setAnimationLoop(e.isIntersecting ? hero._loop : null));
      io.observe(el);
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(start, { timeout: 1500 });
  }
  return () => { gone = true; io?.disconnect(); hero?.dispose(); };
}
