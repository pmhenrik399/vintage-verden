/* Vintage Verden — produktvisning */
(function () {
  const PAGE_SIZE = 48;
  const state = { all: [], q: '', cat: 'Alle', sort: 'new', shown: PAGE_SIZE };

  const $ = (id) => document.getElementById(id);
  const grid = $('grid'), chipsEl = $('chips'), countEl = $('count');
  const moreBtn = $('more'), emptyEl = $('empty');
  const overlay = $('overlay'), sheetBody = $('sheetBody');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (u, size) => u ? u.replace('/dynamic/default/', '/dynamic/' + size + '/') : '';
  const priceFmt = (p) => p == null ? 'Gis bort' : p.toLocaleString('nb-NO') + ' kr';
  const finnUrl = (id) => 'https://www.finn.no/recommerce/forsale/item/' + id;
  const mainCat = (c) => (c || 'Annet').split('/')[0].trim() || 'Annet';

  /* ---------- Scroll-reveal ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = +e.target.dataset.idx || 0;
        e.target.style.transitionDelay = (i % 4) * 60 + 'ms';
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      }
    }
  }, { rootMargin: '60px' });

  /* ---------- Filtrering ---------- */
  function filtered() {
    const q = state.q.toLowerCase();
    let list = state.all.filter((p) =>
      (state.cat === 'Alle' || mainCat(p.cat) === state.cat) &&
      (!q || p.title.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q))
    );
    if (state.sort === 'cheap') list = list.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (state.sort === 'dear') list = list.slice().sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (state.sort === 'az') list = list.slice().sort((a, b) => a.title.localeCompare(b.title, 'nb'));
    return list;
  }

  function renderChips() {
    const counts = {};
    for (const p of state.all) { const c = mainCat(p.cat); counts[c] = (counts[c] || 0) + 1; }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const cats = [['Alle', state.all.length], ...top];
    chipsEl.innerHTML = cats.map(([c, n]) =>
      `<button class="chip${c === state.cat ? ' active' : ''}" data-cat="${esc(c)}">${esc(c)}<span class="n">${n.toLocaleString('nb-NO')}</span></button>`
    ).join('');
  }

  function cardHtml(p, idx) {
    return `
      <button class="card" data-id="${p.id}" data-idx="${idx}">
        <div class="imgbox">
          <img loading="lazy" src="${esc(img(p.imgs[0], '480w'))}" alt="${esc(p.title)}">
          <div class="glare"></div>
          ${p.imgs.length > 1 ? `<span class="photos">${p.imgs.length} 📷</span>` : ''}
          <div class="img-veil"><span class="see">Se nærmere</span></div>
        </div>
        <div class="title">${esc(p.title)}</div>
        <div class="price">${priceFmt(p.price)}</div>
      </button>`;
  }

  function render() {
    const list = filtered();
    const slice = list.slice(0, state.shown);
    grid.innerHTML = slice.map(cardHtml).join('');
    grid.querySelectorAll('.card').forEach((c) => revealObs.observe(c));
    countEl.textContent = `Viser ${Math.min(state.shown, list.length).toLocaleString('nb-NO')} av ${list.length.toLocaleString('nb-NO')} skatter`;
    moreBtn.parentElement.style.display = list.length > state.shown ? '' : 'none';
    emptyEl.hidden = list.length > 0;
  }

  /* ---------- Hero-collage ---------- */
  function buildCollage() {
    const cols = document.querySelectorAll('.collage-col');
    if (!cols.length) return;
    // plukk produkter med bilder, spredt utover samlingen
    const withImg = state.all.filter((p) => p.imgs.length);
    const picks = [];
    for (let i = 0; i < 6 && withImg.length; i++) {
      picks.push(withImg[Math.floor((i * 997) % withImg.length)]);
    }
    cols.forEach((col, ci) => {
      col.innerHTML = picks.slice(ci * 3, ci * 3 + 3).map((p) =>
        `<div class="collage-tile"><img loading="lazy" src="${esc(img(p.imgs[0], '480w'))}" alt=""></div>`).join('');
    });
    // svak parallax
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 900) return;
      cols.forEach((col) => { col.style.transform = `translateY(${y * +col.dataset.speed}px)`; });
    }, { passive: true });
  }

  /* ---------- Utvalgte ---------- */
  function buildFeatured() {
    const el = $('featuredScroll');
    // mest verdifulle med flere bilder = "stolt av"
    const picks = state.all
      .filter((p) => p.imgs.length >= 3 && p.price >= 200)
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      .slice(0, 14);
    el.innerHTML = picks.map((p) => `
      <button class="feat-card" data-id="${p.id}">
        <div class="imgbox">
          <span class="feat-tag">Utvalgt</span>
          <img loading="lazy" src="${esc(img(p.imgs[0], '480w'))}" alt="${esc(p.title)}">
          <div class="glare"></div>
        </div>
        <div class="feat-info">
          <div class="title">${esc(p.title)}</div>
          <div class="price">${priceFmt(p.price)}</div>
        </div>
      </button>`).join('');
    el.addEventListener('click', (e) => {
      const c = e.target.closest('.feat-card'); if (!c) return;
      const p = state.all.find((x) => x.id === +c.dataset.id);
      if (p) openProduct(p);
    });
    $('featPrev').addEventListener('click', () => el.scrollBy({ left: -640, behavior: 'smooth' }));
    $('featNext').addEventListener('click', () => el.scrollBy({ left: 640, behavior: 'smooth' }));
  }

  /* ---------- Vintage-kvittering ---------- */
  function barcodeHtml(id) {
    const digits = (String(id) + String(id)).split('');
    return digits.map((d) =>
      `<i style="width:${1 + (+d % 4)}px;margin-right:${1 + (+d % 3)}px"></i>`).join('');
  }

  function receiptHtml(p) {
    const short = p.title.length > 26 ? p.title.slice(0, 25).trimEnd() + '…' : p.title;
    return `
      <div class="receipt">
        <div class="r-head">VINTAGE·VERDEN</div>
        <div class="r-sub">— kvittering for en skatt —</div>
        <div class="r-line"></div>
        <div class="r-row"><span>1 × ${esc(short)}</span><span>${priceFmt(p.price)}</span></div>
        ${p.cond ? `<div class="r-row dim"><span>Tilstand</span><span>${esc(p.cond)}</span></div>` : ''}
        <div class="r-row dim"><span>Kategori</span><span>${esc(mainCat(p.cat))}</span></div>
        <div class="r-row dim"><span>Frakt</span><span>Fiks ferdig via FINN</span></div>
        <div class="r-line"></div>
        <div class="r-row total"><span>TOTALT</span><span>${priceFmt(p.price)}</span></div>
        <div class="barcode" aria-hidden="true">${barcodeHtml(p.id)}</div>
        <div class="r-id">#${p.id}</div>
        <div class="r-thanks">✦ TAKK FOR AT DU REDDER SKATTER ✦</div>
      </div>
      <div class="receipt-tear"></div>`;
  }

  /* ---------- Produktdetalj ---------- */
  let galIdx = 0, galProduct = null;

  function setGalImg(i) {
    if (!galProduct) return;
    galIdx = (i + galProduct.imgs.length) % galProduct.imgs.length;
    const main = sheetBody.querySelector('#mainImg');
    if (main) main.src = img(galProduct.imgs[galIdx], '1280w');
    const cnt = sheetBody.querySelector('.gal-count');
    if (cnt) cnt.textContent = (galIdx + 1) + ' / ' + galProduct.imgs.length;
    sheetBody.querySelectorAll('.thumbs button').forEach((b, j) => b.classList.toggle('active', j === galIdx));
  }

  function relatedFor(p) {
    const sameLeaf = state.all.filter((x) => x.id !== p.id && x.cat === p.cat);
    const sameMain = state.all.filter((x) => x.id !== p.id && mainCat(x.cat) === mainCat(p.cat) && x.cat !== p.cat);
    return [...sameLeaf, ...sameMain].slice(0, 4);
  }

  function openProduct(p) {
    galProduct = p; galIdx = 0;
    const multi = p.imgs.length > 1;
    const rel = relatedFor(p);
    sheetBody.innerHTML = `
      <div class="sheet-cols">
        <div class="gallery">
          <div class="main">
            <img id="mainImg" src="${esc(img(p.imgs[0], '1280w'))}" alt="${esc(p.title)}">
            ${multi ? `
              <button class="gal-nav prev" aria-label="Forrige bilde">←</button>
              <button class="gal-nav next" aria-label="Neste bilde">→</button>
              <span class="gal-count">1 / ${p.imgs.length}</span>` : ''}
          </div>
          ${multi ? `<div class="thumbs">${p.imgs.map((u, i) =>
            `<button data-i="${i}" class="${i === 0 ? 'active' : ''}"><img loading="lazy" src="${esc(img(u, '480w'))}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="detail">
          <h2>${esc(p.title)}</h2>
          ${receiptHtml(p)}
          <div class="desc">${esc(p.desc || '')}</div>
          <div class="actions">
            <a class="btn-finn" href="${finnUrl(p.id)}" target="_blank" rel="noopener">Kjøp trygt på FINN →</a>
          </div>
          <p class="safe">Du sendes til den originale FINN-annonsen, der du kan kjøpe med Fiks ferdig eller sende melding.</p>
        </div>
      </div>
      ${rel.length ? `
      <div class="related">
        <h3>Flere skatter du kanskje liker</h3>
        <div class="related-grid">${rel.map((r) => `
          <button class="rel-card" data-id="${r.id}">
            <div class="imgbox"><img loading="lazy" src="${esc(img(r.imgs[0], '480w'))}" alt="${esc(r.title)}"></div>
            <div class="title">${esc(r.title)}</div>
            <div class="price">${priceFmt(r.price)}</div>
          </button>`).join('')}</div>
      </div>` : ''}`;

    if (multi) {
      sheetBody.querySelector('.gal-nav.prev').addEventListener('click', () => setGalImg(galIdx - 1));
      sheetBody.querySelector('.gal-nav.next').addEventListener('click', () => setGalImg(galIdx + 1));
      sheetBody.querySelectorAll('.thumbs button').forEach((b) => b.addEventListener('click', () => setGalImg(+b.dataset.i)));
    }
    sheetBody.querySelectorAll('.rel-card').forEach((b) => b.addEventListener('click', () => {
      const r = state.all.find((x) => x.id === +b.dataset.id);
      if (r) { history.replaceState('', '', '#p/' + r.id); openProduct(r); overlay.querySelector('.sheet').scrollTop = 0; }
    }));
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeProduct() {
    overlay.hidden = true;
    galProduct = null;
    document.body.style.overflow = '';
    if (location.hash.startsWith('#p/')) history.pushState('', '', location.pathname);
  }

  /* ---------- Events ---------- */
  $('search').addEventListener('input', (e) => { state.q = e.target.value; state.shown = PAGE_SIZE; render(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.shown = PAGE_SIZE; render(); });
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; state.shown = PAGE_SIZE;
    renderChips(); render();
  });
  moreBtn.addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.card'); if (!c) return;
    const p = state.all.find((x) => x.id === +c.dataset.id);
    if (p) { history.pushState('', '', '#p/' + p.id); openProduct(p); }
  });
  $('closeBtn').addEventListener('click', closeProduct);
  $('overlayBackdrop').addEventListener('click', closeProduct);
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') closeProduct();
    else if (e.key === 'ArrowLeft' && galProduct) setGalImg(galIdx - 1);
    else if (e.key === 'ArrowRight' && galProduct) setGalImg(galIdx + 1);
  });
  $('brandLink').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  const toTop = $('toTop');
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 800), { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- 3D-tilt med glans ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let tilted = null;
    const resetTilt = (el) => {
      if (!el) return;
      el.style.transform = '';
      el.classList.remove('tilting');
      const g = el.querySelector('.glare');
      if (g) g.style.opacity = 0;
    };
    document.addEventListener('mousemove', (e) => {
      const box = e.target.closest('.imgbox');
      if (box !== tilted) { resetTilt(tilted); tilted = box; }
      if (!box || !box.querySelector('.glare')) return;
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      box.classList.add('tilting');
      box.style.transform = `perspective(700px) rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg) translateY(-3px)`;
      const g = box.querySelector('.glare');
      g.style.opacity = 1;
      g.style.background = `radial-gradient(circle at ${((x + 0.5) * 100).toFixed(1)}% ${((y + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,.32), transparent 62%)`;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { resetTilt(tilted); tilted = null; });
  }

  /* ---------- Tellende statistikk ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.target);
    const dec = +el.dataset.dec || 0;
    const dur = 1400, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toLocaleString('nb-NO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const statsObs = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      document.querySelectorAll('#heroStats .num').forEach(countUp);
      statsObs.disconnect();
    }
  });

  /* ---------- Init ---------- */
  grid.innerHTML = Array.from({ length: 12 }, () => '<div class="skel"></div>').join('');

  fetch('data/products.json')
    .then((r) => r.json())
    .then((data) => {
      state.all = data;
      $('statCount').dataset.target = data.length;
      statsObs.observe($('heroStats'));
      renderChips();
      render();
      buildCollage();
      buildFeatured();
      const m = location.hash.match(/^#p\/(\d+)/);
      if (m) { const p = state.all.find((x) => x.id === +m[1]); if (p) openProduct(p); }
    })
    .catch(() => { grid.innerHTML = ''; emptyEl.hidden = false; emptyEl.textContent = 'Kunne ikke laste produktene.'; });
})();
