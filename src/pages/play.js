// Play & Learn — "Lab Rush": a timed 10-question challenge per lesson with lives, streaks and a time bonus.
import gsap from 'gsap';
import { findLesson, school } from '../data/lessons.js';
import { challenges } from '../data/challenges.js';
import { sfx, unlockAudio, soundOn, setSound, speak, stopSpeech } from '../engine/audio.js';
import { icon } from './icons.js';

const ROUND = 10, TIME = 15, LIVES = 3;
const bestKey = (n) => `ssl.best.${n}`;
const getBest = (n) => { try { return +localStorage.getItem(bestKey(n)) || 0; } catch { return 0; } };
const setBest = (n, v) => { try { localStorage.setItem(bestKey(n), String(v)); } catch { /* storage unavailable */ } };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export async function renderPlay(app, slug) {
  const l = findLesson(slug);
  const bank = l && challenges[l.no];
  if (!l || !bank) { location.hash = '#/'; return; }
  let timer = null, alive = true;
  const stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };

  app.innerHTML = `
  <div class="play-page" style="--accent:${l.color}">
    <header class="site-head">
      <a class="brand" href="#/"><img src="/favicon.svg" alt="" width="34" height="34"><span><b>Smart Science Lab</b><small>${school} · Play & Learn</small></span></a>
      <div class="play-head-actions"><button class="btn ghost sm snd">${soundOn() ? '🔊' : '🔇'}</button><a class="btn ghost sm" href="#/lesson/${l.slug}">← Lesson ${l.no}</a></div>
    </header>
    <main class="play-stage"></main>
  </div>`;
  const stage = app.querySelector('.play-stage');
  app.querySelector('.snd').onclick = (e) => { setSound(!soundOn()); e.currentTarget.textContent = soundOn() ? '🔊' : '🔇'; };

  const intro = () => {
    stop();
    stage.innerHTML = `
      <section class="pl-intro">
        <img class="pl-board" src="/boards/lesson${l.no}.webp" alt="">
        <div class="pl-intro-card">
          <div class="eyebrow">Lesson ${l.no} · Play & Learn</div>
          <h1>Lab Rush</h1>
          <p class="pl-sub">${l.title}</p>
          <ul class="pl-rules">
            <li><b>${ROUND}</b> questions, <b>${TIME} s</b> each</li>
            <li><b>${LIVES}</b> lives — a wrong answer or time-out costs one</li>
            <li>Answer fast for a <b>time bonus</b>, chain answers for a <b>streak multiplier</b></li>
          </ul>
          <div class="pl-best">Best score: <b>${getBest(l.no)}</b></div>
          <button class="btn primary pl-go">▶ Start</button>
          <p class="pl-keys">Tip: use keys 1–4 to answer.</p>
        </div>
      </section>`;
    gsap.from(stage.querySelector('.pl-intro-card'), { y: 30, opacity: 0, duration: 0.5, ease: 'power3.out' });
    stage.querySelector('.pl-go').onclick = () => { unlockAudio(); sfx('whoosh'); game(); };
  };

  const game = () => {
    const qs = shuffle(bank).slice(0, ROUND).map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
    let i = 0, score = 0, lives = LIVES, streak = 0, best = 0, right = 0, shown = 0;
    stage.innerHTML = `
      <section class="pl-game">
        <div class="pl-hud">
          <div class="pl-lives"></div>
          <div class="pl-prog"><span class="pl-n"></span><div class="pl-bar"><i></i></div></div>
          <div class="pl-streak"></div>
          <div class="pl-score"><small>Score</small><b>0</b></div>
        </div>
        <div class="pl-card">
          <svg class="pl-ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg"/><text x="22" y="27" text-anchor="middle"></text></svg>
          <div class="pl-q"></div>
          <div class="pl-opts"></div>
          <div class="pl-ex" hidden></div>
        </div>
      </section>`;
    const $ = (s) => stage.querySelector(s);
    const ring = $('.pl-ring .fg'), ringT = $('.pl-ring text'), C = 2 * Math.PI * 19;
    ring.style.strokeDasharray = C;
    const hud = () => {
      $('.pl-lives').innerHTML = Array.from({ length: LIVES }, (_, k) => `<span class="${k < lives ? 'on' : ''}">♥</span>`).join('');
      $('.pl-n').textContent = `Question ${Math.min(i + 1, ROUND)} / ${ROUND}`;
      $('.pl-bar i').style.width = `${(i / ROUND) * 100}%`;
      $('.pl-streak').innerHTML = streak >= 2 ? `🔥 ×${Math.min(streak, 5)}` : '';
    };
    const countTo = (v) => { const o = { v: shown }; gsap.to(o, { v, duration: 0.6, onUpdate: () => { $('.pl-score b').textContent = Math.round(o.v); } }); shown = v; };

    const ask = () => {
      if (!alive) return;
      hud();
      const q = qs[i];
      $('.pl-q').innerHTML = q.q;
      $('.pl-opts').innerHTML = q.options.map((o, k) => `<button data-k="${k}"><span class="k">${k + 1}</span>${o}</button>`).join('');
      $('.pl-ex').hidden = true;
      gsap.fromTo($('.pl-card'), { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
      gsap.from($('.pl-opts').children, { y: 12, opacity: 0, duration: 0.3, stagger: 0.05, delay: 0.1 });
      let locked = false;
      const t0 = performance.now();
      let lastTick = TIME;
      const tick = () => {
        const left = Math.max(0, TIME - (performance.now() - t0) / 1000);
        ring.style.strokeDashoffset = C * (1 - left / TIME);
        ring.classList.toggle('low', left < 6);
        ringT.textContent = Math.ceil(left);
        if (Math.ceil(left) < lastTick && left < 4.5 && left > 0) { lastTick = Math.ceil(left); sfx('tick'); }
        if (left <= 0) { answer(-1); return; }
        timer = requestAnimationFrame(tick);
      };
      stop(); timer = requestAnimationFrame(tick);

      const answer = (k) => {
        if (locked) return; locked = true; stop();
        const ok = k === q.answer;
        const used = (performance.now() - t0) / 1000;
        $('.pl-opts').querySelectorAll('button').forEach((b) => { b.disabled = true; if (+b.dataset.k === q.answer) b.classList.add('right'); });
        if (ok) {
          right++; streak++; best = Math.max(best, streak);
          const pts = Math.round((100 + Math.max(0, TIME - used) * 10) * (1 + (Math.min(streak, 5) - 1) * 0.25));
          countTo(score += pts);
          sfx('success');
          const pop = document.createElement('div'); pop.className = 'pl-pop'; pop.textContent = `+${pts}`;
          $('.pl-card').appendChild(pop);
          gsap.fromTo(pop, { y: 0, opacity: 1, scale: 0.8 }, { y: -60, opacity: 0, scale: 1.2, duration: 1.1, ease: 'power2.out', onComplete: () => pop.remove() });
        } else {
          streak = 0; lives--;
          sfx('wrong');
          if (k >= 0) $('.pl-opts').querySelector(`[data-k="${k}"]`)?.classList.add('wrong');
          gsap.fromTo($('.pl-card'), { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2,0.3)' });
        }
        hud();
        // "Why?" panel: the verdict, the right answer and the theory behind it — shown and read aloud.
        const ans = q.options[q.answer];
        const verdict = ok ? 'Correct!' : k < 0 ? 'Time’s up!' : 'Not quite.';
        const ex = $('.pl-ex'); ex.hidden = false;
        ex.className = `pl-ex ${ok ? 'ok' : 'no'}`;
        ex.innerHTML = `
          <div class="pl-ex-head"><span class="pl-ex-badge">${ok ? '✓' : k < 0 ? '⏱' : '✗'}</span><b>${verdict}</b>
            <button class="pl-say" type="button" title="Listen to the explanation" aria-label="Listen to the explanation"><span class="pl-say-eq"><i></i><i></i><i></i></span><span class="pl-say-t">Listen</span></button></div>
          ${ok ? '' : `<div class="pl-ex-ans">Correct answer: <b>${ans}</b></div>`}
          <div class="pl-ex-why"><small>Why?</small><p>${q.explain}</p></div>
          <div class="pl-ex-foot"><span class="pl-ex-hint">Enter ↵ for next</span><button class="btn primary sm pl-next">${i + 1 < ROUND && lives > 0 ? 'Next ▸' : 'See result ▸'}</button></div>`;
        const say = ex.querySelector('.pl-say');
        const talk = (force) => speak(`${verdict} ${ok ? `${ans} is right.` : `The correct answer is ${ans}.`} ${q.explain}`, {
          force,
          onStart: () => { say.classList.add('on'); say.querySelector('.pl-say-t').textContent = 'Stop'; },
          onEnd: () => { say.classList.remove('on'); say.querySelector('.pl-say-t').textContent = 'Listen'; },
        });
        say.onclick = () => { unlockAudio(); if (say.classList.contains('on')) stopSpeech(); else talk(true); };
        if (!talk(false)) say.classList.add('muted');
        ex.querySelector('.pl-next').onclick = next;
        gsap.from(ex, { y: 14, opacity: 0, duration: 0.35, ease: 'power2.out' });
        setTimeout(() => { if (alive && !ex.hidden) ex.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 120);
      };
      $('.pl-opts').onclick = (e) => { const b = e.target.closest('button'); if (b) answer(+b.dataset.k); };
      keyHandler = (e) => {
        if (/^[1-4]$/.test(e.key) && !locked) answer(+e.key - 1);
        else if ((e.key === 'Enter' || e.key === ' ') && locked) { e.preventDefault(); next(); }
      };
    };
    const next = () => { stopSpeech(); i++; if (i < ROUND && lives > 0) ask(); else end(); };
    const end = () => {
      stop(); keyHandler = null;
      const acc = right / Math.max(1, Math.min(i, ROUND));
      const stars = right >= 10 ? 3 : right >= 8 ? 2 : right >= 5 ? 1 : 0;
      const prev = getBest(l.no); const isBest = score > prev; if (isBest) setBest(l.no, score);
      stage.innerHTML = `
        <section class="pl-end"><div class="pl-end-card">
          <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}</div>
          <h2>${lives <= 0 ? 'Out of lives!' : 'Round complete!'}</h2>
          <div class="pl-final">${score}</div>${isBest ? '<div class="pl-newbest">New best score!</div>' : `<div class="pl-bestline">Best: ${Math.max(prev, score)}</div>`}
          <div class="pl-stats"><div><b>${right}/${ROUND}</b><span>correct</span></div><div><b>${Math.round(acc * 100)}%</b><span>accuracy</span></div><div><b>${best}</b><span>best streak</span></div></div>
          <div class="fin-actions"><button class="primary pl-again">Play again</button><a class="btn ghost-dark" href="#/lesson/${l.slug}">${icon(l.icon, 18)} Do the experiments</a></div>
        </div></section>`;
      gsap.from(stage.querySelectorAll('.pl-end .stars span'), { scale: 0, rotate: -40, duration: 0.5, stagger: 0.15, ease: 'back.out(2)' });
      sfx(stars >= 2 ? 'success' : 'step');
      stage.querySelector('.pl-again').onclick = () => game();
    };
    ask();
  };

  let keyHandler = null;
  const onKey = (e) => keyHandler?.(e);
  window.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; stop(); stopSpeech(); window.removeEventListener('keydown', onKey); };
}
