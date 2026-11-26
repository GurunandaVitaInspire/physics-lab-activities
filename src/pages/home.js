// Home page: a light, tactile "lab console" hero, classmates' cursors, and a pinned scroll reel of every experiment.
import './home.css';
import { lessons, credit, allExperiments } from '../data/lessons.js';
import { loadProgress } from '../progress.js';
import { icon } from './icons.js';

const SUBJECT = { chemistry: { label: 'Chemistry', color: '#22a55a' }, physics: { label: 'Physics', color: '#2f62e0' } };
const pad = (n) => String(n).padStart(2, '0');

export async function renderHome(app) {
  document.body.classList.add('home-light');
  const prog = loadProgress();
  const total = allExperiments.length;
  const stars = Object.values(prog).reduce((a, b) => a + b, 0);
  const done = allExperiments.filter((e) => prog[e.id]).length;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Dial positions: 8 lessons around the knob, 45° apart, starting at the top.
  const ticks = lessons.map((l, i) => {
    const a = (i / lessons.length) * Math.PI * 2 - Math.PI / 2;
    return `<button class="dial-tick" data-i="${i}" style="--x:${(Math.cos(a) * 41).toFixed(2)}%;--y:${(Math.sin(a) * 41).toFixed(2)}%" aria-label="Lesson ${l.no}: ${l.title}">${l.no}</button>`;
  }).join('');

  const titles = allExperiments.map((e) => `<span><i style="background:${SUBJECT[e.lesson.subject].color}"></i>${e.title}</span>`).join('');

  const cards = allExperiments.map((e, i) => {
    const s = SUBJECT[e.lesson.subject];
    const st = prog[e.id] || 0;
    return `<a class="xcard" href="#/lab/${e.id}" style="--c:${e.lesson.color}">
      <div class="xc-art"><img src="/thumbs/${e.id}.webp" alt="${e.title} — 3D lab" loading="lazy" width="640" height="400"><span class="xc-num">${pad(i + 1)}</span></div>
      <div class="xc-body">
        <div class="xc-meta"><span class="xc-dot" style="background:${s.color}"></span>Lesson ${e.lesson.no} · ${e.activity}</div>
        <h3>${e.title}</h3>
        <p>${e.short}</p>
        <div class="xc-foot"><span class="xc-stars">${[1, 2, 3].map((k) => `<b class="${k <= st ? 'on' : ''}">★</b>`).join('')}</span><span class="xc-go">Enter lab →</span></div>
      </div>
    </a>`;
  }).join('');

  app.innerHTML = `
  <div class="h-page">
    <header class="h-nav">
      <a class="h-logo" href="#/"><img src="/favicon.svg" alt="" width="30" height="30"><span>Smart Science Lab<small>${credit}</small></span></a>
      <nav class="h-pill">
        <a href="#reel">↪ Experiments</a><a href="#lessons">↪ Lessons</a><a href="#how">↪ How it works</a>
      </nav>
      <a class="h-cta" href="#/lab/zinc-hcl">Start a lab</a>
    </header>

    <section class="h-hero" id="top">
      <div class="h-badge">🧪 ${credit} · Class X Physical Science</div>
      <h1 class="h-title"><span>Do real science</span><span>right in your browser</span></h1>

      <div class="console-wrap">
        <div class="console" role="group" aria-label="Lab console: pick a lesson">
          <div class="c-brand"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.5L14 9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>SMART LAB</b><small>CLASS X · MODEL SSL-22</small></div>

          <div class="c-left">
            <div class="dial-dish">
              ${ticks}
              <div class="dial-knob" tabindex="0" aria-label="Turn to choose a lesson"><div class="knob-grip"></div><div class="knob-mark"></div></div>
            </div>
            <span class="c-cap">LESSON</span>
          </div>

          <div class="c-mid">
            <div class="lcd" aria-live="polite">
              <div class="lcd-top"><span class="lcd-led"></span><span class="lcd-sub"></span><span class="lcd-n"></span></div>
              <div class="lcd-title"></div>
              <div class="lcd-bar"><i></i></div>
            </div>
            <div class="c-pills">
              <div><a class="pill-btn" data-go="lab" href="#/">Enter</a><span>Labs</span></div>
              <div><a class="pill-btn" data-go="play" href="#/">Play</a><span>Game</span></div>
            </div>
          </div>

          <div class="c-right">
            <div class="btn-dish">
              <button class="dome g" data-act="chem" aria-label="Next chemistry lesson"><span>C</span></button>
              <button class="dome b" data-act="phys" aria-label="Next physics lesson"><span>P</span></button>
              <button class="dome y" data-act="play" aria-label="Play and Learn game"><span>G</span></button>
              <button class="dome r" data-act="rand" aria-label="Surprise me: random experiment"><span>?</span></button>
              <em class="lbl lt">PHYS</em><em class="lbl ll">CHEM</em><em class="lbl lr">RAND</em><em class="lbl lb">PLAY</em>
            </div>
          </div>
        </div>
        <div class="console-shadow"></div>
      </div>

      <ul class="h-legend">
        <li><i style="background:#22a55a"></i>Chemistry</li>
        <li><i style="background:#2f62e0"></i>Physics</li>
        <li><i style="background:#f0b400"></i>Play &amp; Learn</li>
        <li><i style="background:#e0353b"></i>Surprise me</li>
      </ul>

      <div class="cursor c1" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 2l17 8-7.5 2L9 20z"/></svg><span>Priya · 10A</span></div>
      <div class="cursor c2" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 2l17 8-7.5 2L9 20z"/></svg><span>Arjun</span></div>
    </section>

    <section class="h-stats">
      <div><b data-count="${total}">0</b><span>hands-on experiments</span></div>
      <div><b data-count="${lessons.length}">0</b><span>NCERT lessons</span></div>
      <div><b data-count="148">0</b><span>quiz &amp; game questions</span></div>
      <div><b data-count="100" data-suffix="%">0</b><span>in the browser — nothing to install</span></div>
    </section>

    <section class="h-lessons" id="lessons">
      <div class="sec-top"><div class="h-kicker">Eight lessons</div><h2>Choose where to begin</h2><p>${done ? `You have finished <b>${done}</b> of ${total} experiments and earned <b>${stars}</b> ★.` : 'Every lesson has its digital lab and a Lab Rush game.'}</p></div>
      <div class="lgrid">
        ${lessons.map((l) => {
          const n = l.experiments.length, d = l.experiments.filter((e) => prog[e.id]).length;
          return `<a class="lcard" href="#/lesson/${l.slug}" style="--c:${l.color}">
            <div class="lc-img"><img src="/boards/lesson${l.no}.webp" alt="Chalkboard summary of ${l.title}" loading="lazy" width="960" height="540"></div>
            <div class="lc-row"><span class="lc-ico">${icon(l.icon, 20)}</span><span class="lc-sub">${SUBJECT[l.subject].label} · Lesson ${l.no}</span></div>
            <h3>${l.title}</h3>
            <ul>${l.experiments.map((e) => `<li>${e.title}</li>`).join('')}</ul>
            <div class="lc-end"><span>${n} lab${n > 1 ? 's' : ''} + game</span><span class="lc-meter"><i style="width:${(d / n) * 100}%"></i></span></div>
          </a>`;
        }).join('')}
      </div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="mq-track">${titles}${titles}</div></div>
    <div class="marquee rev" aria-hidden="true"><div class="mq-track">${titles}${titles}</div></div>

    <section class="reel" id="reel">
      <div class="reel-sticky">
        <div class="reel-head">
          <div><div class="h-kicker">The full lab</div><h2>${total} experiments.<br>One scroll.</h2></div>
          <div class="reel-count"><b class="rc-now">01</b><span>/ ${pad(total)}</span><div class="rc-bar"><i></i></div><small class="rc-lesson"></small></div>
        </div>
        <div class="reel-track">${cards}<a class="xcard xend" href="#lessons"><div class="xe-in"><b>${total}</b><span>experiments<br>ready to run</span><em>Browse by lesson ↑</em></div></a></div>
      </div>
    </section>


    <section class="h-how" id="how">
      <div class="sec-top"><div class="h-kicker">How a lab works</div><h2>Not a video. You do it.</h2></div>
      <div class="how-grid">
        <div><b>01</b><h4>Set up the bench</h4><p>Real apparatus in 3D — glassware, burners, optical benches, meters. Look around, zoom in.</p></div>
        <div><b>02</b><h4>Predict first</h4><p>Guess what will happen before you see it. Then pour, heat, slide or switch it on yourself.</p></div>
        <div><b>03</b><h4>Record like a scientist</h4><p>Your lab notebook fills in observations, readings, tables and graphs as you work.</p></div>
        <div><b>04</b><h4>Win the stars</h4><p>Finish with the equation, a conclusion and a 3-question challenge — then race in Lab Rush.</p></div>
      </div>
    </section>

    <footer class="h-foot"><span>Smart Science Lab · ${credit}</span><span>Always do real experiments under your teacher’s supervision.</span></footer>
  </div>`;

  const root = app.querySelector('.h-page');
  const $ = (s) => root.querySelector(s);
  const offs = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };

  /* ------------------------------------------------------------ console */
  let idx = 0;
  const knob = $('.dial-knob');
  let knobAngle = 0;
  const setLesson = (i) => {
    const n = lessons.length;
    const target = ((i % n) + n) % n;
    // turn the shortest way round
    let delta = ((target - idx) % n + n) % n; if (delta > n / 2) delta -= n;
    knobAngle += delta * (360 / n);
    idx = target;
    const l = lessons[idx];
    knob.style.transform = `rotate(${knobAngle}deg)`;
    root.querySelectorAll('.dial-tick').forEach((t, k) => t.classList.toggle('on', k === idx));
    $('.lcd-sub').textContent = `${SUBJECT[l.subject].label.toUpperCase()} · L${pad(l.no)}`;
    $('.lcd-n').textContent = `${l.experiments.length} LAB${l.experiments.length > 1 ? 'S' : ''}`;
    $('.lcd-title').textContent = l.title;
    $('.lcd-bar i').style.width = `${((idx + 1) / n) * 100}%`;
    $('.lcd').style.setProperty('--c', l.color);
    root.querySelector('[data-go="lab"]').href = `#/lesson/${l.slug}`;
    root.querySelector('[data-go="play"]').href = `#/play/${l.slug}`;
    const lcd = $('.lcd'); lcd.classList.remove('flash'); void lcd.offsetWidth; lcd.classList.add('flash');
  };
  setLesson(0);
  root.querySelectorAll('.dial-tick').forEach((t) => on(t, 'click', () => setLesson(+t.dataset.i)));
  on(knob, 'keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setLesson(idx + 1); if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setLesson(idx - 1); });
  // drag the knob round
  let dragging = false;
  const dish = $('.dial-dish');
  const angleAt = (e) => { const r = dish.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
  on(knob, 'pointerdown', (e) => { dragging = true; knob.setPointerCapture(e.pointerId); });
  on(knob, 'pointermove', (e) => {
    if (!dragging) return;
    const a = angleAt(e) + Math.PI / 2; const n = lessons.length;
    const i = Math.round((((a / (Math.PI * 2)) * n) % n + n) % n) % n;
    if (i !== idx) setLesson(i);
  });
  on(knob, 'pointerup', () => { dragging = false; });
  on(knob, 'click', () => { if (!dragging) setLesson(idx + 1); });

  const press = (btn) => { btn.classList.add('down'); setTimeout(() => btn.classList.remove('down'), 160); };
  const nextOf = (subject) => { for (let k = 1; k <= lessons.length; k++) { const j = (idx + k) % lessons.length; if (lessons[j].subject === subject) return j; } return idx; };
  root.querySelectorAll('.dome').forEach((b) => on(b, 'click', () => {
    press(b);
    const act = b.dataset.act;
    if (act === 'chem') setLesson(nextOf('chemistry'));
    else if (act === 'phys') setLesson(nextOf('physics'));
    else if (act === 'play') location.hash = `#/play/${lessons[idx].slug}`;
    else if (act === 'rand') location.hash = `#/lab/${allExperiments[(Math.random() * total) | 0].id}`;
  }));

  // in-page anchors (the router uses the hash, so scroll manually)
  root.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach((a) => on(a, 'click', (e) => {
    e.preventDefault(); root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ------------------------------------------------- classmates' cursors */
  let raf = 0, heroVisible = true;
  const cursors = [...root.querySelectorAll('.cursor')].map((el, k) => ({ el, x: 0.15 + k * 0.6, y: 0.3 + k * 0.1, tx: 0, ty: 0, wait: 1 + k * 1.5, target: null }));
  const hero = $('.h-hero');
  const pickTarget = (c) => {
    const pool = [...root.querySelectorAll('.dome, .dial-tick, .pill-btn, .h-title span')];
    c.target = pool[(Math.random() * pool.length) | 0];
    const hr = hero.getBoundingClientRect(), r = c.target.getBoundingClientRect();
    // keep the name tag on screen
    c.tx = Math.min((hr.width - 150) / hr.width, (r.left + r.width * (0.3 + Math.random() * 0.4) - hr.left) / hr.width);
    c.ty = Math.min((hr.height - 60) / hr.height, (r.top + r.height * (0.3 + Math.random() * 0.4) - hr.top) / hr.height);
  };
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (heroVisible) {
      const W = hero.clientWidth, H = hero.clientHeight;
      for (const c of cursors) {
        if (c.wait > 0) { c.wait -= dt; if (c.wait <= 0) pickTarget(c); }
        else {
          const k = 1 - Math.pow(0.02, dt);
          c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k;
          if (Math.hypot((c.tx - c.x) * W, (c.ty - c.y) * H) < 2) {
            if (c.target?.classList.contains('dome') || c.target?.classList.contains('pill-btn')) press(c.target);
            if (c.target?.classList.contains('dial-tick')) setLesson(+c.target.dataset.i);
            c.wait = 1.6 + Math.random() * 2.4; c.target = null;
          }
        }
        c.el.style.transform = `translate(${c.x * W}px, ${c.y * H}px)`;
      }
    }
    raf = requestAnimationFrame(tick);
  };
  if (!reduced) raf = requestAnimationFrame(tick);
  else cursors.forEach((c) => { c.el.style.display = 'none'; });
  const heroIO = new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }); heroIO.observe(hero);

  /* ------------------------------------------------------- count-ups */
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const b = en.target; countIO.unobserve(b);
    const to = +b.dataset.count, suf = b.dataset.suffix ?? (to === 148 ? '+' : '');
    if (reduced || to === 0) { b.textContent = to + suf; return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suf : ''); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  root.querySelectorAll('[data-count]').forEach((b) => countIO.observe(b));

  /* ---------------------------------------------- pinned horizontal reel */
  const reel = $('.reel'), track = $('.reel-track');
  const xcards = [...track.querySelectorAll('.xcard:not(.xend)')];
  let dist = 0, pinned = false, lastI = -1;
  const layout = () => {
    pinned = window.innerWidth > 760 && !reduced;
    reel.classList.toggle('pinned', pinned);
    if (!pinned) { reel.style.height = ''; track.style.transform = ''; return; }
    dist = Math.max(0, track.scrollWidth - window.innerWidth + 64);
    reel.style.height = `${window.innerHeight + dist}px`;
    onScroll();
  };
  const update = (p) => {
    const i = Math.min(total - 1, Math.round(p * (total - 1)));
    if (i === lastI) return; lastI = i;
    $('.rc-now').textContent = pad(i + 1);
    $('.rc-bar i').style.width = `${((i + 1) / total) * 100}%`;
    const e = allExperiments[i];
    $('.rc-lesson').textContent = `Lesson ${e.lesson.no} · ${e.lesson.title}`;
    xcards.forEach((c, k) => c.classList.toggle('near', Math.abs(k - i) <= 1));
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (pinned) {
        const p = Math.min(1, Math.max(0, (window.scrollY - reel.offsetTop) / Math.max(1, dist)));
        track.style.transform = `translate3d(${-p * dist}px,0,0)`;
        update(p);
      } else {
        update(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth));
      }
    });
  };
  on(window, 'scroll', onScroll, { passive: true });
  on(track, 'scroll', onScroll, { passive: true });
  on(window, 'resize', layout);
  // images change scrollWidth once they load; re-measure after layout settles
  requestAnimationFrame(layout);
  setTimeout(layout, 600);

  /* -------------------------------------------------- reveal on scroll */
  const revealIO = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } }), { threshold: 0.15 });
  root.querySelectorAll('.lcard, .how-grid > div, .sec-top, .h-stats > div').forEach((el) => revealIO.observe(el));

  return () => {
    cancelAnimationFrame(raf);
    heroIO.disconnect(); countIO.disconnect(); revealIO.disconnect();
    offs.forEach((f) => f());
    document.body.classList.remove('home-light');
  };
}
