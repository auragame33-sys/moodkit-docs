/* Mood Kit documentation: navigation, search, reading aids and the interactive pictures. No libraries. */
(() => {
  'use strict';
  window.MK_READY = true;
  const d = document, root = d.documentElement, body = d.body;
  const ROOT = root.dataset.root || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const json = (el) => { try { return JSON.parse(el.textContent); } catch (e) { return null; } };
  const seen = (el, fn, margin = '0px 0px -8% 0px') => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fn(); o.disconnect(); } }), { rootMargin: margin, threshold: .15 });
    o.observe(el);
  };

  /* ---------- Theme ---------- */
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => { root.dataset.theme = next; store.set('mk-theme', next); };
    if (d.startViewTransition && !reduce) d.startViewTransition(apply); else apply();
  }));

  /* ---------- Navigation ---------- */
  const setNav = open => {
    body.classList.toggle('nav-open', open);
    $$('.menu-btn').forEach(b => b.setAttribute('aria-expanded', String(open)));
  };
  $$('.menu-btn').forEach(b => b.addEventListener('click', () => setNav(!body.classList.contains('nav-open'))));
  $('.scrim')?.addEventListener('click', () => setNav(false));
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('nav-open')) setNav(false); });
  $$('.nav-group').forEach(g => {
    const key = 'mk-nav-' + g.dataset.group;
    const btn = $('.nav-group-btn', g);
    if (store.get(key) === 'closed' && !$('[aria-current]', g)) g.classList.add('closed');
    btn.setAttribute('aria-expanded', String(!g.classList.contains('closed')));
    btn.addEventListener('click', () => {
      const closed = g.classList.toggle('closed');
      btn.setAttribute('aria-expanded', String(!closed));
      store.set(key, closed ? 'closed' : 'open');
    });
  });
  const sidebar = $('.sidebar'), current = $('.sidebar [aria-current="page"]');
  if (sidebar && current) {
    const saved = Number(store.get('mk-side') || 0);
    sidebar.scrollTop = saved || Math.max(0, current.offsetTop - sidebar.clientHeight / 2);
    addEventListener('pagehide', () => store.set('mk-side', String(sidebar.scrollTop)));
  }

  /* ---------- Reading progress, back to top, table of contents ---------- */
  const progress = $('.progress'), toTop = $('.to-top');
  const tocLinks = $$('.toc a[href^="#"]');
  const heads = tocLinks.map(a => d.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = root.scrollHeight - innerHeight;
    progress?.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : '0');
    toTop?.classList.toggle('show', scrollY > 900);
    if (heads.length) {
      let active = heads[0];
      for (const el of heads) { if (el.getBoundingClientRect().top < 150) active = el; else break; }
      if (innerHeight + scrollY >= root.scrollHeight - 4) active = heads[heads.length - 1];
      tocLinks.forEach(a => a.classList.toggle('active', a.hash.slice(1) === active.id));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  $$('.toc-inline a').forEach(a => a.addEventListener('click', () => a.closest('details')?.removeAttribute('open')));
  $$('[data-copy-link]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href.split('#')[0]).then(() => {
      const t = b.querySelector('span'); const old = t.textContent; t.textContent = 'Link copied'; setTimeout(() => { t.textContent = old; }, 1600);
    }).catch(() => {});
  }));
  $$('.anchor').forEach(a => a.addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href.split('#')[0] + a.getAttribute('href')).catch(() => {});
  }));

  /* ---------- Reveal on scroll ---------- */
  $$('.steps').forEach(s => Array.from(s.children).forEach((li, i) => li.style.setProperty('--i', i)));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    $$('.reveal, .diagram, .steps').forEach(el => io.observe(el));
  } else {
    $$('.reveal, .diagram, .steps').forEach(el => el.classList.add('in'));
  }

  /* Cards light up where the pointer is. */
  d.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card, .feature');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  if (lb) {
    const img = $('img', lb), cap = $('.lightbox-cap', lb);
    let back = null;
    const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); back?.focus({ preventScroll: true }); };
    d.addEventListener('click', e => {
      const z = e.target.closest('.zoomable');
      if (!z || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      back = z;
      const pic = $('img', z);
      img.src = z.getAttribute('href') || pic.currentSrc || pic.src;
      img.alt = pic ? pic.alt : '';
      cap.textContent = z.dataset.caption || '';
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      $('.lightbox-close', lb).focus({ preventScroll: true });
    });
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lightbox-close') || e.target === img) close(); });
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }

  /* ---------- Compare slider ---------- */
  $$('.compare').forEach(c => {
    const input = $('input', c);
    const set = v => c.style.setProperty('--x', v + '%');
    input.addEventListener('input', () => set(input.value));
    input.addEventListener('pointerdown', () => c.classList.add('drag'));
    addEventListener('pointerup', () => c.classList.remove('drag'));
    if (!reduce) seen(c, () => c.classList.add('hint'), '0px 0px -25% 0px');
  });

  /* ---------- Particles over a still picture ---------- */
  function Particles(canvas) {
    const ctx = canvas.getContext('2d');
    let kind = 'none', parts = [], w = 0, h = 0, raf = 0, running = false, tint = '255,255,255';
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const make = (k, first) => {
      const p = { x: rnd(0, w), y: first ? rnd(0, h) : (k === 'embers' ? h + 10 : -20), a: rnd(.15, .55), s: rnd(.6, 1.8), t: rnd(0, 6.28) };
      if (k === 'dust') { p.vx = rnd(-.12, .12); p.vy = rnd(-.08, .1); p.y = rnd(0, h); }
      if (k === 'ash') { p.vx = rnd(-.25, .15); p.vy = rnd(.25, .7); p.s = rnd(1, 2.6); p.a = rnd(.35, .75); }
      if (k === 'snow') { p.vx = rnd(-.3, .3); p.vy = rnd(.5, 1.3); p.s = rnd(1.2, 3); p.a = rnd(.5, .95); }
      if (k === 'embers') { p.vx = rnd(-.25, .25); p.vy = rnd(-1.1, -.35); p.s = rnd(.8, 1.8); p.a = rnd(.5, 1); }
      if (k === 'rain') { p.vx = -2.6; p.vy = rnd(15, 22); p.l = rnd(12, 26); p.a = rnd(.12, .32); }
      return p;
    };
    const counts = { dust: 46, ash: 70, snow: 90, embers: 26, rain: 130 };
    const frame = () => {
      raf = 0;
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const k of kind.split('+')) {
        const list = parts[k] || [];
        for (const p of list) {
          p.t += .02;
          p.x += p.vx + (k === 'ash' || k === 'snow' ? Math.sin(p.t) * .3 : 0);
          p.y += p.vy;
          const out = p.y > h + 30 || p.y < -30 || p.x < -30 || p.x > w + 30;
          if (out) Object.assign(p, make(k, k === 'dust'));
          if (k === 'rain') {
            ctx.strokeStyle = `rgba(205,222,255,${p.a})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 1.4, p.y + p.l); ctx.stroke();
          } else {
            const glow = k === 'embers';
            const col = glow ? '255,150,60' : (k === 'ash' ? tint : (k === 'snow' ? '240,244,252' : tint));
            const a = glow ? p.a * (.6 + .4 * Math.sin(p.t * 6)) : p.a;
            ctx.fillStyle = `rgba(${col},${a})`;
            if (glow) { ctx.shadowColor = 'rgba(255,140,40,.9)'; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    return {
      set(next, color) {
        kind = next || 'none'; tint = color || '255,255,255';
        size();
        parts = {};
        for (const k of kind.split('+')) if (counts[k]) parts[k] = Array.from({ length: counts[k] }, () => make(k, true));
        if (kind === 'none') ctx.clearRect(0, 0, w, h);
        this.run(running);
      },
      run(on) {
        running = on && kind !== 'none' && !reduce;
        if (running && !raf) raf = requestAnimationFrame(frame);
        if (!running) { cancelAnimationFrame(raf); raf = 0; }
      },
      resize: size
    };
  }

  /* ---------- Home: the mood showcase ---------- */
  const show = $('.show');
  if (show) {
    const moods = json($('#mk-moods')) || [];
    const hero = $('.hero');
    const frame = $('.show-frame', show);
    const layers = $$('img.layer:not(.base)', frame), base = $('img.base', frame);
    const ambient = $$('.hero-ambient img');
    const label = $('.show-label', show), nameEl = $('.show-name', show), sumEl = $('.show-sum', show), wxEl = $('.show-wx', show);
    const chips = $$('.show-chips button', show), strip = $('.show-chips', show);
    const fx = Particles($('.show-fx', show));
    const DURATION = 4200;
    let index = 0, front = 0, timer = 0, autoplay = !reduce, visible = true, hovering = false;

    const preload = src => { const im = new Image(); im.decoding = 'async'; im.src = src; };
    const swapTo = (pair, src, cls) => new Promise(done => {
      const next = pair[1 - pair.f], prev = pair[pair.f];
      const finish = () => { next.classList.add(cls); prev.classList.remove(cls); pair.f = 1 - pair.f; done(); };
      if (next.getAttribute('src') === src) { finish(); return; }
      next.src = src;
      (next.decode ? next.decode() : Promise.resolve()).then(finish, finish);
    });
    layers.f = 0; ambient.f = 0;

    const schedule = () => {
      clearTimeout(timer);
      if (autoplay && visible && !hovering) timer = setTimeout(() => go(index + 1), DURATION);
    };
    const restartChip = () => {
      const c = chips[index]; if (!c) return;
      c.setAttribute('aria-pressed', 'false'); void c.offsetWidth; c.setAttribute('aria-pressed', 'true');
    };
    function go(n) {
      index = (n + moods.length) % moods.length;
      const m = moods[index];
      swapTo(layers, ROOT + m.img, 'on');
      if (ambient.length) swapTo(ambient, ROOT + m.thumb, 'on');
      base.src = ROOT + m.base;
      frame.dataset.mood = m.id;
      hero.style.setProperty('--mood', m.color);
      show.style.setProperty('--mood', m.color);
      label.classList.add('swap');
      setTimeout(() => {
        nameEl.textContent = m.name; sumEl.textContent = m.summary; wxEl.textContent = m.weather;
        label.classList.remove('swap');
      }, 320);
      chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === index)));
      const chip = chips[index];
      if (chip) strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
      fx.set(m.fx, m.tint);
      preload(ROOT + moods[(index + 1) % moods.length].img);
      schedule();
    }
    chips.forEach((c, k) => c.addEventListener('click', () => {
      autoplay = false; show.classList.add('paused'); go(k);
    }));
    frame.addEventListener('pointerenter', () => { hovering = true; clearTimeout(timer); show.classList.add('paused'); });
    frame.addEventListener('pointerleave', () => {
      hovering = false; frame.style.setProperty('--rx', '0deg'); frame.style.setProperty('--ry', '0deg');
      if (autoplay) { show.classList.remove('paused'); restartChip(); schedule(); }
    });
    if (!reduce) frame.addEventListener('pointermove', e => {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 5).toFixed(2) + 'deg');
      frame.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 4).toFixed(2) + 'deg');
    });
    const hold = $('.show-hold', show);
    const on = () => frame.classList.add('compare'), off = () => frame.classList.remove('compare');
    hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture(e.pointerId); on(); });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'keyup'].forEach(t => hold.addEventListener(t, off));
    hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } });
    hold.addEventListener('contextmenu', e => e.preventDefault());
    if ('IntersectionObserver' in window) new IntersectionObserver(es => {
      visible = es[0].isIntersecting; fx.run(visible); if (visible) schedule(); else clearTimeout(timer);
    }, { threshold: .2 }).observe(frame);
    d.addEventListener('visibilitychange', () => { visible = !d.hidden; fx.run(visible); if (visible) schedule(); else clearTimeout(timer); });
    addEventListener('resize', () => fx.resize());
    if (reduce) show.classList.add('paused');
    go(0);
  }

  /* ---------- Moods page: grid, filter and viewer ---------- */
  const grid = $('.mood-grid[data-viewer]');
  if (grid && $('.viewer')) {
    const moods = json($('#mk-moods')) || [];
    const cards = $$('.mood-card', grid);
    const search = $('.mood-search'), filters = $$('.mood-filter button');
    let kind = 'all';
    const apply = () => {
      const q = (search?.value || '').trim().toLowerCase();
      cards.forEach((c, i) => {
        const m = moods[i];
        const hit = (!q || (m.name + ' ' + m.summary + ' ' + m.weather + ' ' + m.see).toLowerCase().includes(q)) && (kind === 'all' || m.place === kind);
        c.classList.toggle('hide', !hit);
      });
    };
    search?.addEventListener('input', apply);
    filters.forEach(b => b.addEventListener('click', () => {
      kind = b.dataset.kind; filters.forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply();
    }));

    const v = $('.viewer');
    // The page area is its own layer for page transitions, so the viewer moves out of it to cover the top bar too.
    body.appendChild(v);
    const media = $('.viewer-media', v), pic = $('img.pic', v), basePic = $('img.base', v);
    let at = 0, view = 'best', back = null;
    const views = $$('.viewer .seg button[data-view]');
    const render = () => {
      const m = moods[at];
      const which = view === 'best' ? m.place : view;
      pic.src = ROOT + (which === 'inside' ? m.lab : m.open);
      basePic.src = ROOT + (which === 'inside' ? m.labBase : m.openBase);
      pic.alt = m.name + (which === 'inside' ? ' in the Mood Lab corridor' : ' on an open level');
      views.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === which)));
      $('h3', v).textContent = m.name;
      $('.sm', v).textContent = m.summary;
      $('.see', v).textContent = m.see;
      $('.f-weather', v).textContent = m.weather;
      $('.f-asset', v).textContent = m.asset;
      $('.f-best', v).textContent = m.place === 'inside' ? 'Indoors, in rooms and corridors' : 'Outdoors, under the sky';
      v.style.setProperty('--mood', m.color);
      [(at + 1) % moods.length, (at + moods.length - 1) % moods.length].forEach(k => { const im = new Image(); im.src = ROOT + (view === 'outside' || (view === 'best' && moods[k].place === 'outside') ? moods[k].open : moods[k].lab); });
    };
    const open = i => {
      at = i; view = 'best'; back = d.activeElement; render();
      v.classList.add('open'); v.setAttribute('aria-hidden', 'false'); body.style.overflow = 'hidden';
      $('.viewer-close', v).focus({ preventScroll: true });
    };
    const close = () => {
      v.classList.remove('open'); v.setAttribute('aria-hidden', 'true'); body.style.overflow = '';
      media.classList.remove('compare'); back?.focus({ preventScroll: true });
    };
    const step = n => {
      const shown = cards.map((c, i) => c.classList.contains('hide') ? -1 : i).filter(i => i >= 0);
      const pos = shown.indexOf(at);
      at = shown[(pos + n + shown.length) % shown.length];
      render();
    };
    cards.forEach((c, i) => c.addEventListener('click', () => open(i)));
    $('.viewer-close', v).addEventListener('click', close);
    $('.viewer-nav.prev', v).addEventListener('click', () => step(-1));
    $('.viewer-nav.next', v).addEventListener('click', () => step(1));
    v.addEventListener('click', e => { if (e.target === v) close(); });
    views.forEach(b => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
    const hold = $('.viewer .hold');
    const on = () => media.classList.add('compare'), off = () => media.classList.remove('compare');
    hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture(e.pointerId); on(); });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'keyup'].forEach(t => hold.addEventListener(t, off));
    hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } });
    hold.addEventListener('contextmenu', e => e.preventDefault());
    d.addEventListener('keydown', e => {
      if (!v.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  }

  /* ---------- Fit tab demo: real pictures blend as the slider moves ---------- */
  $$('.demo').forEach(demo => {
    const series = json($('script[type="application/json"]', demo)) || [];
    const mediaBox = $('.demo-media', demo), range = $('input[type="range"]', demo), out = $('output', demo);
    const labelEl = $('.ue-slider label', demo), note = $('.demo-note', demo), tabs = $$('.demo-tabs button', demo);
    let imgs = [], s = null;
    const fmt = (v, kind) => kind === 'stops' ? (v > 0 ? '+' : '') + v.toFixed(1) : Math.round(v * 100) + '%';
    const update = () => {
      const t = Number(range.value) / 100 * (imgs.length - 1);
      imgs.forEach((im, k) => { im.style.opacity = String(Math.max(0, 1 - Math.abs(t - k))); });
      const lo = Math.floor(t), hi = Math.min(s.values.length - 1, lo + 1), f = t - lo;
      out.textContent = fmt(s.values[lo] + (s.values[hi] - s.values[lo]) * f, s.kind);
      range.style.setProperty('--f', range.value + '%');
    };
    const use = k => {
      s = series[k];
      tabs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
      mediaBox.innerHTML = s.images.map((src, i) => `<img src="${ROOT + src}" alt="${esc(s.mood)} with ${esc(s.label)} at ${esc(fmt(s.values[i], s.kind))}" decoding="async" loading="lazy">`).join('');
      imgs = $$('img', mediaBox);
      labelEl.textContent = s.label;
      note.innerHTML = s.note;
      range.value = String(s.start);
      update();
    };
    range.addEventListener('input', update);
    tabs.forEach((b, i) => b.addEventListener('click', () => use(i)));
    use(0);
    // The other sliders' pictures load early, so a tab switch never shows an empty frame.
    seen(demo, () => series.slice(1).forEach(s => s.images.forEach(src => { const im = new Image(); im.src = ROOT + src; })));
  });

  /* ---------- Weather picker ---------- */
  $$('.wx-picker').forEach(p => {
    const list = json($('script[type="application/json"]', p)) || [];
    const imgs = $$('.wx-media img', p), btns = $$('.wx-list button', p);
    const title = $('.wx-info h4', p), text = $('.wx-info p', p), bars = $$('.bar', p);
    let front = 0;
    const pick = k => {
      const w = list[k];
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
      const next = imgs[1 - front];
      const done = () => { next.classList.add('on'); imgs[front].classList.remove('on'); front = 1 - front; };
      next.src = ROOT + w.img; next.alt = w.label + ' on Moonlit Exposure, in the Mood Lab courtyard';
      (next.decode ? next.decode() : Promise.resolve()).then(done, done);
      title.textContent = w.label; text.textContent = w.summary;
      bars.forEach(b => {
        const val = w.bars[b.dataset.key] || 0;
        b.style.setProperty('--v', Math.round(Math.min(1, val / Number(b.dataset.max)) * 100) + '%');
        $('b', b).textContent = b.dataset.unit === '%' ? Math.round(val * 100) + '%' : (Math.round(val * 10) / 10) + b.dataset.unit;
      });
    };
    btns.forEach((b, i) => b.addEventListener('click', () => pick(i)));
    imgs[0].classList.add('on');
    pick(Number(p.dataset.start || 0));
  });

  /* ---------- Hotspots on panel pictures ---------- */
  $$('.hotspots').forEach(h => {
    const tip = $('.hs-tip', h), spots = $$('.hs', h);
    const legend = h.parentElement.querySelector('.hs-legend');
    const items = legend ? $$('li', legend) : [];
    let pinned = -1;
    const show = k => {
      const s = spots[k]; if (!s) return;
      spots.forEach((x, i) => x.classList.toggle('on', i === k));
      items.forEach((x, i) => x.classList.toggle('on', i === k));
      tip.innerHTML = `<b>${esc(s.dataset.title)}</b>${esc(s.dataset.text)}`;
      const hr = h.getBoundingClientRect(), sr = s.getBoundingClientRect();
      const tw = Math.min(280, hr.width * .7);
      let left = sr.left - hr.left + sr.width / 2 - tw / 2;
      left = Math.max(10, Math.min(hr.width - tw - 10, left));
      tip.style.width = tw + 'px';
      tip.style.left = left + 'px';
      const below = sr.top - hr.top < hr.height * .55;
      tip.style.top = below ? (sr.bottom - hr.top + 12) + 'px' : '';
      tip.style.bottom = below ? '' : (hr.bottom - sr.top + 12) + 'px';
      tip.classList.add('on');
    };
    const hide = () => { if (pinned >= 0) { show(pinned); return; } tip.classList.remove('on'); spots.forEach(x => x.classList.remove('on')); items.forEach(x => x.classList.remove('on')); };
    spots.forEach((s, k) => {
      s.addEventListener('pointerenter', () => show(k));
      s.addEventListener('pointerleave', hide);
      s.addEventListener('focus', () => show(k));
      s.addEventListener('blur', hide);
      s.addEventListener('click', () => { pinned = pinned === k ? -1 : k; if (pinned >= 0) show(k); else hide(); });
    });
    items.forEach((li, k) => {
      li.addEventListener('pointerenter', () => show(k));
      li.addEventListener('pointerleave', hide);
    });
    h.addEventListener('pointerleave', () => { if (pinned < 0) hide(); });
  });

  /* ---------- Reference filter ---------- */
  $$('.filter-box input').forEach(input => {
    const scope = input.closest('.prose') || d;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      $$('.ref-group', scope).forEach(g => {
        let any = false;
        $$('.ref-row', g).forEach(r => { const hit = !q || r.textContent.toLowerCase().includes(q); r.classList.toggle('hide', !hit); any = any || hit; });
        g.classList.toggle('hide', !any);
      });
    });
  });

  /* ---------- FAQ: one open at a time feels calmer ---------- */
  $$('.faq').forEach(f => f.addEventListener('toggle', () => {
    if (f.open) $$('.faq').forEach(o => { if (o !== f && o.parentElement === f.parentElement) o.open = false; });
  }));

  /* ---------- Copy code ---------- */
  $$('.prose pre').forEach(pre => {
    const b = d.createElement('button');
    b.className = 'icon-btn copy-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Copy'); b.innerHTML = icon('copy');
    b.addEventListener('click', () => navigator.clipboard?.writeText(pre.innerText).then(() => { b.innerHTML = icon('check'); setTimeout(() => { b.innerHTML = icon('copy'); }, 1400); }).catch(() => {}));
    pre.style.position = 'relative'; pre.appendChild(b);
  });

  /* ---------- Search ---------- */
  const S = $('.search');
  if (S) {
    const input = $('input', S), results = $('.search-results', S);
    const index = (window.MK_SEARCH || []).map(e => ({ ...e, hay: [e.p, e.s, e.x].join(' ').toLowerCase() }));
    let items = [], active = 0, back = null;
    const terms = q => q.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const mark = (text, ts) => {
      let out = esc(text);
      ts.forEach(t => { if (t.length > 1) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
      return out;
    };
    const snippet = (text, ts) => {
      if (!text) return '';
      const low = text.toLowerCase();
      let at = -1;
      for (const t of ts) { at = low.indexOf(t); if (at >= 0) break; }
      if (at < 60) return text.slice(0, 150) + (text.length > 150 ? '…' : '');
      return '…' + text.slice(at - 50, at + 110) + (text.length > at + 110 ? '…' : '');
    };
    const score = (e, ts) => {
      let total = 0;
      const title = (e.s || e.p).toLowerCase(), page = e.p.toLowerCase();
      for (const t of ts) {
        if (!e.hay.includes(t)) return 0;
        if (title === t) total += 40;
        else if (title.startsWith(t)) total += 24;
        else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(title)) total += 16;
        else if (title.includes(t)) total += 10;
        if (page.includes(t)) total += 4;
        if (e.x && e.x.toLowerCase().includes(t)) total += 2;
      }
      if (e.k === 'page') total += 6;
      if (e.k === 'value') total -= 3;
      return total;
    };
    const kindIcon = e => e.k === 'page' ? 'file' : (e.k === 'value' ? 'table' : 'hash');
    const render = () => {
      const q = input.value.trim(), ts = terms(q);
      if (!ts.length) {
        items = index.filter(e => e.k === 'page');
        results.innerHTML = `<div class="search-group">Try</div><div class="search-suggest">${['Apply', 'Weather', 'Save as My Mood', 'Interior volume', 'Set Mood', 'Lightning', 'Fill a Row', 'Fog'].map(s => `<button type="button">${s}</button>`).join('')}</div><div class="search-group">Pages</div>` +
          items.map((e, i) => `<a class="search-item${i === active ? ' active' : ''}" href="${ROOT + e.u}" data-i="${i}">${icon(e.i || 'file')}<div><div class="si-title">${esc(e.p)}</div><div class="si-text">${esc(e.x)}</div></div></a>`).join('');
        $$('.search-suggest button', results).forEach(b => b.addEventListener('click', () => { input.value = b.textContent; active = 0; render(); input.focus(); }));
        return;
      }
      items = index.map(e => ({ e, s: score(e, ts) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 40).map(r => r.e);
      if (!items.length) { results.innerHTML = `<div class="search-empty">Nothing found for “${esc(q)}”. Try fewer or other words.</div>`; return; }
      const groups = new Map();
      items.forEach((e, i) => { if (!groups.has(e.p)) groups.set(e.p, []); groups.get(e.p).push([e, i]); });
      let html = '';
      groups.forEach((list, page) => {
        html += `<div class="search-group">${esc(page)}</div>`;
        list.forEach(([e, i]) => {
          html += `<a class="search-item${i === active ? ' active' : ''}" href="${ROOT + e.u}" data-i="${i}">${icon(kindIcon(e))}<div><div class="si-title">${mark(e.s || e.p, ts)}${e.k === 'value' ? '<span class="si-path">value</span>' : ''}</div><div class="si-text">${mark(snippet(e.x, ts), ts)}</div></div></a>`;
        });
      });
      results.innerHTML = html;
      // Keep the order on screen the same as the arrow keys follow.
      const order = $$('.search-item', results).map(a => Number(a.dataset.i));
      items = order.map(i => items[i]);
      $$('.search-item', results).forEach((a, k) => { a.dataset.i = k; a.classList.toggle('active', k === active); });
    };
    const move = n => {
      const list = $$('.search-item', results); if (!list.length) return;
      active = (active + n + list.length) % list.length;
      list.forEach((a, k) => a.classList.toggle('active', k === active));
      list[active].scrollIntoView({ block: 'nearest' });
    };
    const open = () => {
      back = d.activeElement; S.classList.add('open'); S.setAttribute('aria-hidden', 'false');
      active = 0; render(); setTimeout(() => input.focus(), 20); setNav(false);
    };
    const close = () => { S.classList.remove('open'); S.setAttribute('aria-hidden', 'true'); back?.focus?.({ preventScroll: true }); };
    $$('.search-btn').forEach(b => b.addEventListener('click', open));
    S.addEventListener('click', e => { if (e.target === S) close(); });
    results.addEventListener('mousemove', e => {
      const a = e.target.closest('.search-item'); if (!a) return;
      const k = Number(a.dataset.i); if (k !== active) { active = k; $$('.search-item', results).forEach((x, i) => x.classList.toggle('active', i === active)); }
    });
    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { const a = $$('.search-item', results)[active]; if (a) { e.preventDefault(); location.href = a.href; close(); } }
    });
    d.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(d.activeElement?.tagName) || d.activeElement?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); S.classList.contains('open') ? close() : open(); }
      else if (e.key === '/' && !typing && !S.classList.contains('open')) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && S.classList.contains('open')) close();
    });
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $$('.search-btn kbd').forEach(k => { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
  }

  /* ---------- Tabs that group content, such as node categories ---------- */
  $$('[data-tabs]').forEach(t => {
    const btns = $$('[role="tab"]', t), panels = $$('[role="tabpanel"]', t);
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach((x, k) => x.setAttribute('aria-selected', String(k === i)));
      panels.forEach((p, k) => { p.hidden = k !== i; });
    }));
  });
})();
