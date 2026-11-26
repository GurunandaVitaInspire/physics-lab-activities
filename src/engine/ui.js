// Experiment HUD: instruction banner, lab record notebook, readouts, controls, predictions, finish + quiz.
import gsap from 'gsap';
import { sfx, speak, stopSpeech, setSound, soundOn, setVoice, voiceOn, unlockAudio } from './audio.js';
import { saveProgress } from '../progress.js';
import { AUTO } from './Lab.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export class LabUI {
  /**
   * @param {HTMLElement} root   page root (already contains .viewport and .record placeholders)
   * @param {object} meta        experiment metadata from data/lessons.js
   * @param {object} hooks       { onReset, onExit, onNext, lesson }
   */
  constructor(root, meta, hooks = {}) {
    this.root = root; this.meta = meta; this.hooks = hooks;
    this.stepEls = []; this.current = -1; this.obsCount = 0; this.mistakes = 0; this.predictScore = [0, 0];
    this.viewport = root.querySelector('.viewport');
    this._build();
  }

  attach(lab) {
    this.lab = lab; lab.ui = this; lab.sfx = sfx;
  }

  _build() {
    const m = this.meta;
    const vp = this.viewport;
    this.banner = h('div', 'banner', `<div class="banner-num">1</div><div class="banner-body"><div class="banner-text">Get ready…</div><div class="banner-sub"></div></div>`);
    vp.appendChild(this.banner);
    this.readouts = h('div', 'readouts'); vp.appendChild(this.readouts);
    this.dock = h('div', 'dock'); vp.appendChild(this.dock);
    this.toasts = h('div', 'toasts'); vp.appendChild(this.toasts);
    const cam = h('div', 'camtools', `
      <button data-act="home" title="Reset view" aria-label="Reset view"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button>
      <button data-act="in" title="Zoom in" aria-label="Zoom in"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
      <button data-act="out" title="Zoom out" aria-label="Zoom out"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>`);
    cam.addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.act; if (!a || !this.lab) return;
      if (a === 'home') this.lab.home(1).catch(() => {});
      else { const c = this.lab.camera, t = this.lab.controls.target; const k = a === 'in' ? 0.8 : 1.25; const p = c.position.clone().sub(t).multiplyScalar(k).add(t); this.lab.focus({ pos: p, target: t.clone() }, 0.5).catch(() => {}); }
    });
    vp.appendChild(cam);
    const hint = h('div', 'navhint', '<b>Drag</b> to look around · <b>Scroll/pinch</b> to zoom · <b>Tap</b> glowing apparatus');
    vp.appendChild(hint); setTimeout(() => hint.classList.add('fade'), 9000);

    // Lab record notebook
    const rec = this.root.querySelector('.record');
    rec.innerHTML = `
      <div class="rec-head"><span class="rec-icon">📒</span><div><div class="rec-title">Lab record</div><div class="rec-sub">${m.activity} · ${m.title}</div></div></div>
      <div class="rec-sec"><div class="rec-label">Aim</div><p class="rec-aim">${m.aim}</p></div>
      ${m.materials?.length ? `<div class="rec-sec"><div class="rec-label">You need</div><div class="chips">${m.materials.map((x) => `<span class="chip">${x}</span>`).join('')}</div></div>` : ''}
      <div class="rec-sec"><div class="rec-label">Procedure</div><ol class="steps"></ol></div>
      <div class="rec-sec rec-data" hidden><div class="rec-label">Readings</div><div class="data-slot"></div></div>
      <div class="rec-sec"><div class="rec-label">What I observed</div><ul class="obs"><li class="obs-empty">Your observations will appear here as you work.</li></ul></div>
      <div class="rec-sec rec-result" hidden><div class="rec-label">Conclusion</div><div class="result-slot"></div></div>`;
    this.stepsOl = rec.querySelector('.steps');
    this.obsUl = rec.querySelector('.obs');
    this.dataSec = rec.querySelector('.rec-data'); this.dataSlot = rec.querySelector('.data-slot');
    this.resultSec = rec.querySelector('.rec-result'); this.resultSlot = rec.querySelector('.result-slot');
    this.recordEl = rec;

    // Topbar buttons
    const tb = this.root.querySelector('.lab-actions');
    const voiceBtn = tb.querySelector('[data-act="voice"]'), soundBtn = tb.querySelector('[data-act="sound"]');
    const sync = () => { voiceBtn.classList.toggle('off', !voiceOn()); soundBtn.classList.toggle('off', !soundOn()); };
    voiceBtn.onclick = () => { setVoice(!voiceOn()); sync(); };
    soundBtn.onclick = () => { setSound(!soundOn()); sync(); };
    tb.querySelector('[data-act="reset"]').onclick = () => this.hooks.onReset?.();
    tb.querySelector('[data-act="record"]').onclick = () => this.root.classList.toggle('show-record');
    sync();
    this.stepPill = this.root.querySelector('.step-pill');
  }

  /* --------------------------------------------------------- steps */
  setSteps(labels) {
    this.labels = labels;
    this.stepsOl.innerHTML = '';
    this.stepEls = labels.map((l, i) => { const li = h('li', 'step', `<span class="dot">${i + 1}</span><span>${l}</span>`); this.stepsOl.appendChild(li); return li; });
    this._pill();
  }
  _pill() { if (this.stepPill) this.stepPill.textContent = this.labels ? `Step ${Math.max(1, Math.min(this.current + 1, this.labels.length))} / ${this.labels.length}` : ''; }

  /** Begin step i (0-based) with an instruction. Earlier steps are ticked. */
  step(i, text, { sub = '', say } = {}) {
    if (this.current >= 0 && i > this.current) sfx('step');
    this.current = i;
    this.stepEls.forEach((el, k) => { el.classList.toggle('done', k < i); el.classList.toggle('now', k === i); });
    this.stepEls[i]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    this._pill();
    this.instruct(text, { sub, num: i + 1, say });
  }
  /** Update the banner text without changing step. */
  instruct(text, { sub = '', num, say } = {}) {
    const b = this.banner;
    if (num !== undefined) b.querySelector('.banner-num').textContent = num;
    const t = b.querySelector('.banner-text'), s = b.querySelector('.banner-sub');
    gsap.fromTo(b, { y: -8, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    t.innerHTML = text; s.innerHTML = sub; s.style.display = sub ? '' : 'none';
    speak(say ?? text);
  }
  completeAll() { this.stepEls.forEach((el) => { el.classList.add('done'); el.classList.remove('now'); }); this.current = this.labels?.length ?? 0; }

  /* -------------------------------------------------- observations */
  observe(text, { icon = '👁️', highlight = false } = {}) {
    this.obsUl.querySelector('.obs-empty')?.remove();
    const li = h('li', 'ob' + (highlight ? ' key' : ''), `<span class="ob-i">${icon}</span><span>${text}</span>`);
    this.obsUl.appendChild(li);
    gsap.from(li, { x: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
    li.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    this.obsCount++;
    const chip = h('div', 'obs-flash', `<span>${icon}</span> ${text}`);
    this.viewport.appendChild(chip);
    gsap.timeline({ onComplete: () => chip.remove() }).from(chip, { y: 20, opacity: 0, duration: 0.4, ease: 'back.out(1.6)' }).to(chip, { opacity: 0, y: -10, duration: 0.5, delay: 3.2 });
    sfx('glass');
  }

  /** One message at a time: a new toast replaces the old one instead of stacking up. */
  toast(text, type = 'info', ms = 2600) {
    if (type === 'warn') { sfx('wrong'); this.mistakes++; }
    if (this._toast) { this._toastTl?.kill(); this._toast.remove(); }
    const t = this._toast = h('div', 'toast ' + type, text); this.toasts.appendChild(t);
    this._toastTl = gsap.timeline({ onComplete: () => { t.remove(); if (this._toast === t) this._toast = null; } })
      .from(t, { y: 10, opacity: 0, duration: 0.25 }).to(t, { opacity: 0, duration: 0.35, delay: ms / 1000 });
  }

  /* ------------------------------------------------------ readouts */
  readout(key, label, value, { unit = '', color } = {}) {
    this._ro ||= {};
    let el = this._ro[key];
    if (!el) { el = this._ro[key] = h('div', 'ro', `<span class="ro-l"></span><span class="ro-v"></span>`); this.readouts.appendChild(el); }
    el.querySelector('.ro-l').textContent = label;
    el.querySelector('.ro-v').innerHTML = `${value}<small>${unit}</small>`;
    if (color) el.style.setProperty('--c', color);
    return el;
  }
  clearReadout(key) { if (key) { this._ro?.[key]?.remove(); delete this._ro?.[key]; } else { this.readouts.innerHTML = ''; this._ro = {}; } }

  /* ------------------------------------------------------ controls */
  /**
   * Add a control to the dock under the 3D view.
   * {type:'slider', label, min, max, step, value, unit, onInput} -> {el, value, set(v)}
   * {type:'button', label, onClick, primary}
   * {type:'toggle', label, value, onChange}
   * {type:'segmented', label, options:[{value,label}], value, onChange}
   */
  control(c) {
    this.dock.classList.add('show');
    let el;
    if (c.type === 'slider') {
      el = h('label', 'ctl ctl-slider', `<span class="ctl-l">${c.label}</span><input type="range" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${c.value ?? c.min}"><output></output>`);
      const inp = el.querySelector('input'), out = el.querySelector('output');
      const fmt = (v) => (c.format ? c.format(v) : `${v}${c.unit ?? ''}`);
      out.textContent = fmt(+inp.value);
      inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); c.onInput?.(+inp.value); });
      inp.addEventListener('change', () => c.onChange?.(+inp.value));
      el.set = (v) => { inp.value = v; out.textContent = fmt(+inp.value); };
      Object.defineProperty(el, 'value', { get: () => +inp.value });
      el.input = inp;
    } else if (c.type === 'button') {
      el = h('button', 'ctl ctl-btn' + (c.primary ? ' primary' : ''), c.label);
      el.onclick = () => { sfx('click'); c.onClick?.(); };
    } else if (c.type === 'toggle') {
      el = h('button', 'ctl ctl-toggle' + (c.value ? ' on' : ''), `<span class="sw"></span>${c.label}`);
      el.onclick = () => { el.classList.toggle('on'); sfx('switch'); c.onChange?.(el.classList.contains('on')); };
      el.set = (v) => el.classList.toggle('on', !!v);
    } else if (c.type === 'segmented') {
      el = h('div', 'ctl ctl-seg', `${c.label ? `<span class="ctl-l">${c.label}</span>` : ''}<div class="seg">${c.options.map((o) => `<button data-v="${o.value}" class="${o.value === c.value ? 'on' : ''}">${o.label}</button>`).join('')}</div>`);
      el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); sfx('click'); c.onChange?.(isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v); });
      el.set = (v) => el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v == v));
    }
    if (c.disabled) el.classList.add('disabled');
    this.dock.appendChild(el);
    return el;
  }
  /**
   * Big press-and-hold button (also Space bar). Returns { held, set(progress, holding), remove() }.
   * Used by lab.hold() for processes that should only run while the student keeps acting.
   */
  holdButton(label = 'Hold') {
    this._hold?.remove();
    const el = h('button', 'hold-btn', `<span class="hb-ring"></span><span class="hb-label">${label}</span><span class="hb-sub">or hold Space</span>`);
    this.viewport.appendChild(el);
    gsap.from(el, { y: 30, opacity: 0, duration: 0.35, ease: 'back.out(1.6)' });
    const api = {
      held: false, el,
      set: (p, holding) => { el.style.setProperty('--p', p); el.classList.toggle('on', holding); },
      remove: () => { off(); el.remove(); if (this._hold === api) this._hold = null; },
    };
    const down = (e) => { e.preventDefault(); api.held = true; el.setPointerCapture?.(e.pointerId); };
    const up = () => { api.held = false; };
    const kd = (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.held = true; } };
    const ku = (e) => { if (e.code === 'Space') api.held = false; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', up);
    const off = () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', up); };
    this._hold = api;
    return api;
  }

  clearControls() { this.dock.innerHTML = ''; this.dock.classList.remove('show'); }
  /** Wait for a button in the dock to be pressed. */
  waitButton(label, { primary = true } = {}) {
    return new Promise((res, rej) => {
      const b = this.control({ type: 'button', label, primary, onClick: () => { b.remove(); if (!this.dock.children.length) this.dock.classList.remove('show'); res(); } });
      this._abortables.push(rej);
      if (AUTO) setTimeout(() => b.click(), 0);
    });
  }
  get _abortables() { return (this.__ab ||= []); }

  /* ------------------------------------------------------- tables */
  table(headers, { title } = {}) {
    this.dataSec.hidden = false;
    const wrap = h('div', 'tbl-wrap', `${title ? `<div class="tbl-title">${title}</div>` : ''}<table class="tbl"><thead><tr>${headers.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody></tbody></table>`);
    this.dataSlot.appendChild(wrap);
    const tb = wrap.querySelector('tbody');
    return {
      el: wrap,
      addRow(cells) { const tr = h('tr', '', cells.map((c) => `<td>${c}</td>`).join('')); tb.appendChild(tr); gsap.from(tr, { backgroundColor: '#fde68a', duration: 1.2 }); tr.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); return tr; },
      setRow(i, cells) { const tr = tb.children[i]; if (tr) tr.innerHTML = cells.map((c) => `<td>${c}</td>`).join(''); },
      clear() { tb.innerHTML = ''; },
      get rows() { return tb.children.length; },
    };
  }

  /** Simple line/scatter graph in the record. */
  graph({ xLabel = 'x', yLabel = 'y', xMax = 1, yMax = 1, title, line = true } = {}) {
    this.dataSec.hidden = false;
    const wrap = h('div', 'graph-wrap', `${title ? `<div class="tbl-title">${title}</div>` : ''}<canvas width="560" height="380"></canvas>`);
    this.dataSlot.appendChild(wrap);
    const cv = wrap.querySelector('canvas'), g = cv.getContext('2d');
    const pts = []; const P = { l: 64, r: 18, t: 16, b: 52 };
    const draw = () => {
      const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const X = (x) => P.l + (x / xMax) * (W - P.l - P.r), Y = (y) => H - P.b - (y / yMax) * (H - P.t - P.b);
      g.strokeStyle = '#e2e8f0'; g.lineWidth = 1;
      for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(X((xMax * i) / 10), Y(0)); g.lineTo(X((xMax * i) / 10), Y(yMax)); g.stroke(); g.beginPath(); g.moveTo(X(0), Y((yMax * i) / 10)); g.lineTo(X(xMax), Y((yMax * i) / 10)); g.stroke(); }
      g.strokeStyle = '#0f172a'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y(yMax)); g.lineTo(X(0), Y(0)); g.lineTo(X(xMax), Y(0)); g.stroke();
      g.fillStyle = '#334155'; g.font = '600 18px Inter, sans-serif'; g.textAlign = 'center';
      g.fillText(xLabel, (W + P.l) / 2, H - 12);
      g.save(); g.translate(18, (H - P.b) / 2); g.rotate(-Math.PI / 2); g.fillText(yLabel, 0, 0); g.restore();
      g.font = '500 14px Inter, sans-serif';
      for (let i = 0; i <= 5; i++) { g.fillText(+(xMax * i / 5).toFixed(2), X((xMax * i) / 5), Y(0) + 20); g.textAlign = 'right'; g.fillText(+(yMax * i / 5).toFixed(2), X(0) - 8, Y((yMax * i) / 5) + 5); g.textAlign = 'center'; }
      if (line && pts.length > 1) {
        // best-fit through origin
        const k = pts.reduce((a, p) => a + p[0] * p[1], 0) / Math.max(1e-9, pts.reduce((a, p) => a + p[0] * p[0], 0));
        g.strokeStyle = '#0ea5e9'; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(0), Y(0)); const xe = Math.min(xMax, yMax / Math.max(k, 1e-9)); g.lineTo(X(xe), Y(k * xe)); g.stroke(); g.setLineDash([]);
      }
      for (const p of pts) { g.fillStyle = '#e11d48'; g.beginPath(); g.arc(X(p[0]), Y(p[1]), 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    };
    draw();
    return { add(x, y) { pts.push([x, y]); draw(); }, clear() { pts.length = 0; draw(); }, points: pts, canvas: cv };
  }

  /* --------------------------------------------- predict (POE) */
  /**
   * Ask the student to predict before observing. Resolves with { correct, choice }.
   * Never blocks progress on a wrong answer — it explains instead.
   */
  predict({ q, options, answer, explain = '' }) {
    return new Promise((res) => {
      const ov = h('div', 'predict', `<div class="pc-card"><div class="pc-tag">🤔 Predict first</div><div class="pc-q">${q}</div><div class="pc-opts">${options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div><div class="pc-ex" hidden></div></div>`);
      this.viewport.appendChild(ov);
      speak(q);
      gsap.from(ov.querySelector('.pc-card'), { y: 30, opacity: 0, duration: 0.5, ease: 'power3.out' });
      if (AUTO) setTimeout(() => { ov.querySelector(`button[data-i="${answer}"]`)?.click(); setTimeout(() => ov.querySelector('.pc-go')?.click(), 0); }, 0);
      ov.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]'); if (!b || ov.dataset.done) return;
        ov.dataset.done = '1';
        const i = +b.dataset.i, ok = i === answer;
        this.predictScore[1]++; if (ok) this.predictScore[0]++;
        ov.querySelectorAll('button[data-i]').forEach((x) => { x.disabled = true; if (+x.dataset.i === answer) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        sfx(ok ? 'success' : 'wrong');
        const ex = ov.querySelector('.pc-ex'); ex.hidden = false;
        ex.innerHTML = `<b>${ok ? 'Good prediction!' : 'Let’s see what really happens.'}</b> ${ok ? explain : 'Watch carefully in the next step.'}<button class="pc-go">Continue ▸</button>`;
        ex.querySelector('.pc-go').onclick = () => { gsap.to(ov, { opacity: 0, duration: 0.3, onComplete: () => ov.remove() }); res({ correct: ok, choice: i }); };
      });
    });
  }

  /** Call once the bench is built: plays the cinematic intro and waits for "Start". */
  ready() {
    if (this._ready) return this._ready;
    const loading = this.viewport.querySelector('.loading');
    if (loading) loading.lastChild.textContent = 'Preparing the 3D lab…';
    return (this._ready = Promise.resolve(this.lab?.warm?.()).then(() => { loading?.remove(); return this.intro(this.lab); }));
  }

  /* ------------------------------------------------------- intro */
  /** Cinematic intro: kinetic title over a camera dolly, then the aim + safety card. */
  intro(lab) {
    const m = this.meta;
    return new Promise((res) => {
      const ov = h('div', 'intro', `
        <div class="intro-title"><div class="intro-tag">${m.activity}</div><h1>${m.title.split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join(' ')}</h1></div>
        <div class="intro-card">
          <div class="ic-row"><div class="ic-label">Aim</div><p>${m.aim}</p></div>
          ${m.safety ? `<div class="ic-safe">🥽 ${m.safety}</div>` : ''}
          <button class="ic-start">▶ Start experiment</button>
        </div>`);
      this.viewport.appendChild(ov);
      const tl = gsap.timeline();
      tl.from(ov.querySelector('.intro-tag'), { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' })
        .from(ov.querySelectorAll('.w > span'), { yPercent: 110, duration: 0.7, stagger: 0.06, ease: 'power4.out' }, '-=0.2')
        .from(ov.querySelector('.intro-card'), { y: 40, opacity: 0, duration: 0.6, ease: 'power3.out' }, '+=0.3');
      // camera dolly from wide establishing shot
      if (lab) {
        const hv = lab.homeView; const t = hv.target;
        lab.camera.position.set(t.x + 0.9, t.y + 0.75, t.z + 1.5);
        lab.controls.target.copy(t);
        lab.focus({ pos: hv.pos, target: hv.target }, 3.2, 'power2.inOut').catch(() => {});
      }
      ov.querySelector('.ic-start').onclick = () => {
        unlockAudio(); sfx('whoosh');
        gsap.to(ov, { opacity: 0, duration: 0.45, onComplete: () => { ov.remove(); res(); } });
      };
      if (AUTO) { ov.remove(); res(); }
    });
  }

  /* ------------------------------------------------------- finish */
  /**
   * { conclusion: html, equation?: html, quiz: [{q, options, answer, explain}] }
   */
  finish({ conclusion, equation, quiz = [] }) {
    this.completeAll(); this._pill();
    this.instruct('Experiment complete! Review your record, then take the challenge.', { num: '✓' });
    this.resultSec.hidden = false;
    this.resultSlot.innerHTML = `${equation ? `<div class="eq">${equation}</div>` : ''}<p>${conclusion}</p>`;
    sfx('success');
    return new Promise((res) => {
      const ov = h('div', 'finish', `<div class="fin-card">
        <div class="fin-badge">🏅</div><h2>Well done, scientist!</h2>
        ${equation ? `<div class="eq big">${equation}</div>` : ''}
        <p class="fin-c">${conclusion}</p>
        <div class="fin-actions">${quiz.length ? '<button class="primary fin-quiz">Take the 3-question challenge ▸</button>' : ''}<button class="fin-close">Look around the bench</button></div></div>`);
      this.viewport.appendChild(ov);
      gsap.from(ov.querySelector('.fin-card'), { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.5)' });
      ov.querySelector('.fin-close').onclick = () => { ov.remove(); this._finishedBar(quiz, res); };
      ov.querySelector('.fin-quiz')?.addEventListener('click', () => { ov.remove(); this.runQuiz(quiz).then(res); });
      if (import.meta.env.DEV) window.__labState = { finished: true, id: this.meta.id, obs: this.obsCount, quiz: quiz.length };
      if (AUTO) { ov.remove(); res({ auto: true }); }
    });
  }
  _finishedBar(quiz, res) {
    this.clearControls();
    if (quiz.length) this.control({ type: 'button', label: '🏆 Take the challenge', primary: true, onClick: () => { this.clearControls(); this.runQuiz(quiz).then(res); } });
    if (this.hooks.next) this.control({ type: 'button', label: `Next: ${this.hooks.next.title} ▸`, onClick: () => this.hooks.onNext?.() });
  }

  runQuiz(quiz) {
    return new Promise((res) => {
      let i = 0, score = 0;
      const ov = h('div', 'quiz'); this.viewport.appendChild(ov);
      const show = () => {
        const q = quiz[i];
        ov.innerHTML = `<div class="qz-card"><div class="qz-top"><span>Challenge</span><span>${i + 1} / ${quiz.length}</span></div>
          <div class="qz-bar"><i style="width:${(i / quiz.length) * 100}%"></i></div>
          <div class="qz-q">${q.q}</div><div class="qz-opts">${q.options.map((o, k) => `<button data-k="${k}"><span class="qz-l">${'ABCD'[k]}</span>${o}</button>`).join('')}</div><div class="qz-ex" hidden></div></div>`;
        gsap.from(ov.querySelector('.qz-card'), { x: 30, opacity: 0, duration: 0.4, ease: 'power3.out' });
        speak(q.q);
        ov.querySelector('.qz-opts').onclick = (e) => {
          const b = e.target.closest('button'); if (!b || ov.dataset.lock) return; ov.dataset.lock = '1';
          const k = +b.dataset.k, ok = k === q.answer; if (ok) score++;
          ov.querySelectorAll('.qz-opts button').forEach((x) => { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          sfx(ok ? 'success' : 'wrong');
          const ex = ov.querySelector('.qz-ex'); ex.hidden = false;
          ex.innerHTML = `<b>${ok ? 'Correct!' : 'Not quite.'}</b> ${q.explain || ''}<button class="primary qz-next">${i + 1 < quiz.length ? 'Next ▸' : 'See my result ▸'}</button>`;
          ex.querySelector('.qz-next').onclick = () => { delete ov.dataset.lock; i++; i < quiz.length ? show() : done(); };
        };
      };
      const done = () => {
        const stars = score === quiz.length ? 3 : score >= Math.ceil(quiz.length / 2) ? 2 : 1;
        saveProgress(this.meta.id, stars);
        ov.innerHTML = `<div class="qz-card qz-done"><div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}</div>
          <h2>${score} / ${quiz.length} correct</h2><p>${stars === 3 ? 'Perfect! You really understood this experiment.' : stars === 2 ? 'Good work! Re-read your lab record to get all three stars.' : 'Keep going — try the experiment again and watch closely.'}</p>
          <div class="fin-actions">${this.hooks.next ? `<button class="primary qz-nextexp">Next experiment ▸</button>` : ''}<button class="qz-again">Do it again</button><button class="qz-back">Back to lesson</button></div></div>`;
        gsap.from(ov.querySelectorAll('.stars span'), { scale: 0, rotate: -40, duration: 0.5, stagger: 0.15, ease: 'back.out(2)' });
        sfx('success');
        ov.querySelector('.qz-nextexp')?.addEventListener('click', () => this.hooks.onNext?.());
        ov.querySelector('.qz-again').onclick = () => this.hooks.onReset?.();
        ov.querySelector('.qz-back').onclick = () => this.hooks.onExit?.();
        res({ score, stars });
      };
      show();
    });
  }

  dispose() { this._hold?.remove(); stopSpeech(); this._abortables.forEach((r) => r(new Error('aborted'))); }
}
