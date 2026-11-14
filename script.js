/* DAY LAYER — main */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const grid = document.getElementById('grid');
const cards = [...document.querySelectorAll('.card')];

/* ── 분류 필터 ── */
(function () {
  const btns = document.querySelectorAll('.filter');
  const empty = document.getElementById('empty');
  function apply(cat) {
    btns.forEach(b => {
      const on = b.dataset.filter === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    let n = 0;
    cards.forEach(c => {
      const show = cat === 'all' || c.dataset.cats.split(' ').includes(cat);
      c.hidden = !show; if (show) n++;
    });
    empty.hidden = n > 0;
    window.dispatchEvent(new Event('resize'));   // 스크롤 막대 길이 갱신
  }
  btns.forEach(b => b.addEventListener('click', () => {
    apply(b.dataset.filter);
    try { history.replaceState(null, '', b.dataset.filter === 'all' ? location.pathname : '#' + b.dataset.filter); } catch (e) {}
  }));
  const h = location.hash.slice(1);
  if ([...btns].some(b => b.dataset.filter === h)) apply(h);
})();

/* ── 격자 / 목록 보기 ── */
(function () {
  const btn = document.getElementById('view-btn');
  if (!btn) return;
  let list = false;
  try { list = localStorage.getItem('dl-view') === 'list'; } catch (e) {}
  function set(v) {
    list = v;
    grid.classList.toggle('is-list', list);
    btn.setAttribute('aria-pressed', list);
    btn.setAttribute('aria-label', list ? '격자로 보기' : '목록으로 보기');
    try { localStorage.setItem('dl-view', list ? 'list' : 'grid'); } catch (e) {}
    window.dispatchEvent(new Event('resize'));
  }
  set(list);
  btn.addEventListener('click', () => set(!list));
})();

/* ── 가운데 홈의 스크롤 막대 (드래그 가능) ── */
(function () {
  const bar = document.getElementById('thumb-bar');
  if (!bar) return;
  const TOP = 79, BOTTOM = 9, MIN = 40;
  let trackH = 0, barH = 0, maxScroll = 0;

  function measure() {
    trackH = window.innerHeight - TOP - BOTTOM;
    maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    barH = Math.max(MIN, trackH * window.innerHeight / document.documentElement.scrollHeight);
    bar.style.height = barH + 'px';
    bar.hidden = maxScroll <= 0;
    place();
  }
  function place() {
    const r = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    bar.style.transform = `translateY(${r * (trackH - barH)}px)`;
  }
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();

  let startY = 0, startScroll = 0;
  bar.addEventListener('pointerdown', e => {
    startY = e.clientY; startScroll = window.scrollY;
    bar.setPointerCapture(e.pointerId); bar.classList.add('is-drag');
    e.preventDefault();
  });
  bar.addEventListener('pointermove', e => {
    if (!bar.classList.contains('is-drag')) return;
    const ratio = maxScroll / Math.max(1, trackH - barH);
    window.scrollTo(0, startScroll + (e.clientY - startY) * ratio);
  });
  const end = () => bar.classList.remove('is-drag');
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
})();

/* ── 오른쪽 패널: Profile / Contact / 프로젝트 상세 ── */
const Side = (function () {
  const side = document.getElementById('side');
  const inner = side.querySelector('.side-inner');
  const tabs = [...document.querySelectorAll('.side-tab')];
  const views = { profile: document.getElementById('panel-profile'), contact: document.getElementById('panel-contact'), detail: document.getElementById('panel-detail') };
  const expandBtn = side.querySelector('.side-expand');
  let current = null;

  // 상세를 닫거나 바꿀 때 재생 중인 영상 소리가 남지 않도록 정지
  function stopMedia() { views.detail.querySelectorAll('video, audio').forEach(m => m.pause()); }

  function show(name) {
    if (name !== 'detail') stopMedia();
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });
    expandBtn.hidden = name !== 'detail';
    if (name !== 'detail') {
      setExpanded(false);
      document.querySelectorAll('.card.is-current').forEach(c => c.classList.remove('is-current'));
      current = null;
    }
    inner.scrollTop = 0;
  }

  function openProject(id, { focus = false } = {}) {
    const tpl = document.getElementById('project-' + id);
    if (!tpl) return false;
    if (current !== id) {
      stopMedia();
      views.detail.replaceChildren(tpl.content.cloneNode(true));
      current = id;
    }
    show('detail');
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('is-current', c.querySelector(`[data-project="${id}"]`) !== null));
    if (focus) views.detail.querySelector('.d-title')?.setAttribute('tabindex', '-1'), views.detail.querySelector('.d-title')?.focus({ preventScroll: true });
    return true;
  }

  // 크게 보기 / 원래대로
  let timer = null;
  function setExpanded(on) {
    const was = side.classList.contains('is-expanded');
    if (on === was) return;
    expandBtn.setAttribute('aria-pressed', on);
    expandBtn.setAttribute('aria-label', on ? '원래 크기로' : '크게 보기');
    clearTimeout(timer);
    if (reduceMotion) {
      side.classList.toggle('is-expanded', on); side.classList.remove('is-collapsing');
      document.body.classList.toggle('is-locked', on);
      return;
    }
    side.classList.add('is-resizing');
    if (on) {
      side.classList.remove('is-collapsing');
      side.classList.add('is-expanded');
      document.body.classList.add('is-locked');
    } else {
      side.classList.remove('is-expanded');
      side.classList.add('is-collapsing');      // 줄어드는 동안은 화면에 고정
      document.body.classList.remove('is-locked');
    }
    timer = setTimeout(() => {
      side.classList.remove('is-collapsing', 'is-resizing');
    }, 620);
  }

  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
  expandBtn.addEventListener('click', () => setExpanded(!side.classList.contains('is-expanded')));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && side.classList.contains('is-expanded') && document.getElementById('search').hidden) setExpanded(false);
  });

  return { openProject, show, setExpanded };
})();

// 카드를 누르면 오른쪽 패널에 상세 표시
document.querySelectorAll('.card-link[data-project]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    if (Side.openProject(a.dataset.project)) {
      try { history.replaceState(null, '', '#' + a.dataset.project); } catch (err) {}
      if (window.matchMedia('(max-width: 900px)').matches) window.dlOpenSide && window.dlOpenSide();
    }
  });
});
// 주소에 #color-safety 처럼 들어오면 바로 열기
(function () {
  const h = location.hash.slice(1);
  if (h && document.getElementById('project-' + h)) Side.openProject(h);
})();

/* ── 모바일: 프로필 패널 열기/닫기 ── */
(function () {
  const side = document.getElementById('side');
  const openBtn = document.querySelector('.profile-open');
  const closeBtn = document.querySelector('.side-close');
  if (!openBtn) return;
  function set(open) {
    side.classList.toggle('is-open', open);
    openBtn.setAttribute('aria-expanded', open);
    document.body.classList.toggle('is-locked', open);
    if (open) closeBtn.focus(); else openBtn.focus();
  }
  openBtn.addEventListener('click', () => { Side.show('profile'); set(true); });
  window.dlOpenSide = () => set(true);
  closeBtn.addEventListener('click', () => set(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('is-open')) set(false); });
})();

/* ── 검색 ── */
(function () {
  const root = document.getElementById('search');
  const openBtn = document.getElementById('search-open');
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  if (!root || !openBtn) return;

  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = cards.map((el, i) => {
    const title = el.querySelector('.card-title').textContent.trim();
    const tags = [...el.querySelectorAll('.tags li')].map(li => li.textContent.trim());
    const label = (el.querySelector('.art--frame span')?.textContent || '').trim();
    return { i, el, title, tags, hay: norm([title, tags.join(' '), label, el.dataset.cats].join(' ')) };
  });
  let active = -1, lastFocus = null;

  const highlight = (t, q) => {
    const i = q ? t.toLowerCase().indexOf(q) : -1;
    return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  };
  function render() {
    const q = norm(input.value); active = -1;
    if (!q) { list.innerHTML = ''; return; }
    const terms = q.split(' ');
    const hits = items.filter(it => terms.every(t => it.hay.includes(t)));
    list.innerHTML = hits.length
      ? hits.map(it => `<li><button type="button" class="result" data-i="${it.i}">
          <span class="result-title">${highlight(it.title, terms[0])}</span>
          <span class="result-tags">${it.tags.map(t => '#' + esc(t)).join(' ')}</span></button></li>`).join('')
      : '<li class="search-empty">검색 결과가 없습니다.</li>';
  }
  function open() {
    lastFocus = document.activeElement; root.hidden = false; document.body.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    setTimeout(() => input.focus(), 50);
  }
  function close(restore = true) {
    root.classList.remove('is-open'); document.body.classList.remove('is-locked');
    setTimeout(() => { root.hidden = true; input.value = ''; render(); }, 300);
    if (restore && lastFocus) lastFocus.focus();
  }
  function go(i) {
    const it = items[i]; if (!it) return;
    close(false);
    if (it.el.hidden) document.querySelector('.filter[data-filter="all"]').click();
    it.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    it.el.classList.remove('is-flash'); void it.el.offsetWidth; it.el.classList.add('is-flash');
    const link = it.el.querySelector('.card-link');
    link.focus({ preventScroll: true });
    if (link.dataset.project) Side.openProject(link.dataset.project);
  }
  function move(d) {
    const b = list.querySelectorAll('.result'); if (!b.length) return;
    active = (active + d + b.length) % b.length;
    b.forEach((x, i) => x.classList.toggle('is-active', i === active));
    b[active].scrollIntoView({ block: 'nearest' });
  }
  openBtn.addEventListener('click', open);
  root.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) close();
    const r = e.target.closest('.result'); if (r) go(+r.dataset.i);
  });
  input.addEventListener('input', render);
  root.querySelector('form').addEventListener('submit', e => e.preventDefault());
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && e.target === input) {
      e.preventDefault();
      const b = list.querySelectorAll('.result'); const x = b[active >= 0 ? active : 0]; if (x) go(+x.dataset.i);
    } else if (e.key === 'Tab') {
      const f = [...root.querySelectorAll('input, button')].filter(x => x.offsetParent);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
})();

/* ── 지구본: Google 번역으로 한국어 ↔ 영어 자동 번역 ── */
(function () {
  const btn = document.getElementById('lang-btn');
  if (!btn) return;
  const SRC = 'https://translate.google.com/translate_a/element.js?cb=dlTranslateInit';
  let state = 'idle';          // idle → loading → ready
  let pending = null;

  const isTranslated = () => /translated-(ltr|rtl)/.test(document.documentElement.className);
  const cookieLang = () => (document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/) || [])[1];

  function sync() {
    const on = isTranslated();
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? '한국어 원문 보기' : '영어로 번역');
    btn.title = on ? '한국어' : 'English';
  }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function toast(msg) {
    let t = document.getElementById('dl-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'dl-toast'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:200;background:#000;color:#fff;font-size:14px;padding:10px 16px;border-radius:4px;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 3000);
  }

  function combo() { return document.querySelector('#gt-element select.goog-te-combo'); }
  function choose(lang, tries = 0) {
    const sel = combo();
    if (!sel || !sel.options.length) {
      if (tries > 50) { btn.classList.remove('is-loading'); toast('번역을 불러오지 못했습니다.'); return; }
      return setTimeout(() => choose(lang, tries + 1), 100);
    }
    sel.value = lang;
    sel.dispatchEvent(new Event('change'));
    // 위젯이 첫 요청을 무시하는 경우가 있어 한 번 더
    setTimeout(() => { if (lang === 'en' && !isTranslated()) { sel.value = lang; sel.dispatchEvent(new Event('change')); } }, 400);
    setTimeout(() => btn.classList.remove('is-loading'), 600);
  }

  function load(then) {
    if (state === 'ready') return then();
    pending = then;
    if (state === 'loading') return;
    state = 'loading';
    btn.classList.add('is-loading');
    window.dlTranslateInit = function () {
      new google.translate.TranslateElement({ pageLanguage: 'ko', includedLanguages: 'en', autoDisplay: false }, 'gt-element');
      state = 'ready';
      if (pending) { const f = pending; pending = null; f(); }
    };
    const s = document.createElement('script');
    s.src = SRC; s.async = true;
    s.onerror = () => { state = 'idle'; btn.classList.remove('is-loading'); toast('번역 서비스에 연결할 수 없습니다.'); };
    document.head.appendChild(s);
  }

  function restore() {
    // 번역 쿠키를 지우고 원문으로 되돌림
    const host = location.hostname;
    ['', '; domain=' + host, '; domain=.' + host.split('.').slice(-2).join('.')].forEach(d => {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
    });
    location.reload();
  }

  btn.addEventListener('click', () => {
    if (isTranslated()) return restore();
    load(() => choose('en'));
  });

  // 이전에 영어로 보고 있었다면 다시 들어와도 영어 유지
  if (cookieLang() === 'en') load(() => {});
  sync();
})();

/* ── Contact: 프로젝트 문의 폼 ──
   FORM_ENDPOINT에 폼 수신 주소(예: Formspree의 https://formspree.io/f/xxxxxx)를 넣으면
   사이트에서 바로 전송됩니다. 비어 있으면 메일 앱을 열어 내용을 채워줍니다. */
const FORM_ENDPOINT = '';
const FORM_MAILTO = 'dayonj@kookmin.ac.kr';

(function () {
  const form = document.getElementById('inquiry');
  if (!form) return;
  const status = document.getElementById('inquiry-status');
  const submit = form.querySelector('.inquiry-submit');
  const MSG = { title: '제목을 입력해주세요', message: '내용을 입력해주세요', name: '이름을 입력해주세요', contact: '연락처를 입력해주세요' };

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = 'inquiry-status' + (kind ? ' is-' + kind : '');
  }
  function check(el) {
    const field = el.closest('.field'); const err = field && field.querySelector('.field-err');
    if (!err) return true;
    const ok = !el.required || el.value.trim() !== '';
    field.classList.toggle('is-invalid', !ok);
    err.textContent = ok ? '' : MSG[el.name] || '필수 항목입니다';
    return ok;
  }
  form.querySelectorAll('input[required], textarea[required]').forEach(el => {
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const required = [...form.querySelectorAll('input[required], textarea[required]')];
    const bad = required.filter(el => !check(el));
    if (bad.length) { bad[0].focus(); setStatus('필수 항목을 확인해주세요.', 'err'); return; }
    if (form._gotcha.value) return;   // 스팸

    const d = Object.fromEntries(new FormData(form));
    delete d._gotcha;

    if (!FORM_ENDPOINT) {
      const body = [
        `담당자 이름: ${d.name}`, `소속: ${d.organization || '-'}`, `연락망: ${d.contact}`,
        `프로젝트 일정: ${d.schedule || '-'}`, '', d.message
      ].join('\n');
      location.href = `mailto:${FORM_MAILTO}?subject=${encodeURIComponent('[포트폴리오 문의] ' + d.title)}&body=${encodeURIComponent(body)}`;
      setStatus(`메일 앱이 열리지 않으면 ${FORM_MAILTO} 로 직접 보내주세요.`);
      return;
    }

    submit.disabled = true; setStatus('보내는 중…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, _subject: '[포트폴리오 문의] ' + d.title })
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      setStatus('문의가 전송되었습니다. 확인 후 연락드리겠습니다.', 'ok');
    } catch (err) {
      setStatus(`전송하지 못했습니다. ${FORM_MAILTO} 로 직접 보내주세요.`, 'err');
    } finally {
      submit.disabled = false;
    }
  });
})();

/* ── Dokkaebi BOB: 휴대폰 화면 시연 (이미지 순서대로, 긴 화면은 끝까지 스크롤) ── */
(function () {
  const HOLD_START = 1200, HOLD_END = 1200, SPEED = 0.3;   // 스크롤 속도: 원본 화면(402px 폭) 기준 px/ms
  let runId = 0;

  function play(screen) {
    const id = ++runId;
    const imgs = [...screen.querySelectorAll('img')];
    const band = screen.closest('.dk-phone');
    let i = 0, anim = null, timer = null, visible = true;

    const alive = () => id === runId && screen.isConnected;
    const wait = ms => new Promise(r => { timer = setTimeout(r, ms); });

    // 화면 일부가 아래에서 잘리므로, 실제로 보이는 높이까지만 스크롤
    function visibleH() {
      const s = screen.getBoundingClientRect(), b = band.getBoundingClientRect();
      return Math.min(s.bottom, b.bottom) - s.top;
    }

    async function step() {
      while (alive()) {
        if (!visible) { await wait(300); continue; }
        const img = imgs[i];
        if (!img.complete || !img.naturalHeight) {
          await Promise.race([new Promise(r => img.addEventListener('load', r, { once: true })), wait(1500)]);
          if (!alive()) return;
          if (!img.naturalHeight) { i = (i + 1) % imgs.length; continue; }
        }
        imgs.forEach(x => x.classList.toggle('is-on', x === img));
        img.style.transform = 'translateY(0)';
        await wait(HOLD_START); if (!alive()) return;
        const dist = img.getBoundingClientRect().height - visibleH();
        if (dist > 4 && !reduceMotion) {
          const scale = img.getBoundingClientRect().width / 402;
          const dur = dist / scale / SPEED;
          anim = img.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }],
                             { duration: dur, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
          await anim.finished.catch(() => {}); if (!alive()) return;
          await wait(HOLD_END); if (!alive()) return;
          anim.cancel(); anim = null;
        } else {
          await wait(HOLD_END + 800); if (!alive()) return;
        }
        i = (i + 1) % imgs.length;
      }
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        visible = e.isIntersecting;
        if (anim) visible ? anim.play() : anim.pause();
      }), { threshold: 0.2 });
      io.observe(band);
    }
    if (reduceMotion) { imgs[0].classList.add('is-on'); return; }
    step();
  }

  // 상세가 열릴 때마다 시작 (패널 내용이 새로 그려짐). 주소(#dokkaebi-bob)로 바로 열린 경우도 처리
  const detail = document.getElementById('panel-detail');
  if (!detail) return;
  function check() {
    const screen = detail.querySelector('.dk-screen');
    if (screen && !screen.dataset.playing) { screen.dataset.playing = '1'; play(screen); }
  }
  new MutationObserver(check).observe(detail, { childList: true, subtree: true });
  check();
})();

