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

  // Hovedkategori = første ledd ("Klær / Dame / Bukser" -> "Klær")
  const mainCat = (c) => (c || 'Annet').split('/')[0].trim() || 'Annet';

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
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([c]) => c);
    const cats = ['Alle', ...top];
    chipsEl.innerHTML = cats.map((c) =>
      `<button class="chip${c === state.cat ? ' active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
    ).join('');
  }

  function render() {
    const list = filtered();
    const slice = list.slice(0, state.shown);
    grid.innerHTML = slice.map((p) => `
      <button class="card" data-id="${p.id}">
        <div class="imgbox"><img loading="lazy" src="${esc(img(p.imgs[0], '480w'))}" alt="${esc(p.title)}"></div>
        <div class="title">${esc(p.title)}</div>
        <div class="price">${priceFmt(p.price)}</div>
      </button>`).join('');
    countEl.textContent = list.length.toLocaleString('nb-NO') + ' skatter';
    moreBtn.parentElement.style.display = list.length > state.shown ? '' : 'none';
    emptyEl.hidden = list.length > 0;
  }

  function openProduct(p) {
    const thumbs = p.imgs.length > 1 ? `<div class="thumbs">${p.imgs.map((u, i) =>
      `<button data-i="${i}" class="${i === 0 ? 'active' : ''}"><img loading="lazy" src="${esc(img(u, '480w'))}" alt=""></button>`).join('')}</div>` : '';
    sheetBody.innerHTML = `
      <div class="gallery">
        <div class="main"><img id="mainImg" src="${esc(img(p.imgs[0], '1280w'))}" alt="${esc(p.title)}"></div>
        ${thumbs}
      </div>
      <div class="detail">
        <h2>${esc(p.title)}</h2>
        <div class="price">${priceFmt(p.price)}</div>
        <div class="meta">${esc(p.cat || '')}${p.cond ? ' · ' + esc(p.cond) : ''}</div>
        <div class="desc">${esc(p.desc || '')}</div>
        <div class="actions">
          <a class="btn-finn" href="${finnUrl(p.id)}" target="_blank" rel="noopener">Kjøp trygt på FINN</a>
        </div>
        <p class="safe">Du sendes til den originale FINN-annonsen, der du kan kjøpe med Fiks ferdig eller sende melding.</p>
      </div>`;
    sheetBody.querySelectorAll('.thumbs button').forEach((b) => {
      b.addEventListener('click', () => {
        sheetBody.querySelector('#mainImg').src = img(p.imgs[+b.dataset.i], '1280w');
        sheetBody.querySelectorAll('.thumbs button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeProduct() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (location.hash.startsWith('#p/')) history.pushState('', '', location.pathname);
  }

  // Events
  $('search').addEventListener('input', (e) => { state.q = e.target.value; state.shown = PAGE_SIZE; render(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.shown = PAGE_SIZE; render(); });
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; state.shown = PAGE_SIZE;
    renderChips(); render();
    window.scrollTo({ top: grid.offsetTop - 140, behavior: 'smooth' });
  });
  moreBtn.addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.card'); if (!c) return;
    const p = state.all.find((x) => x.id === +c.dataset.id);
    if (p) { history.pushState('', '', '#p/' + p.id); openProduct(p); }
  });
  $('closeBtn').addEventListener('click', closeProduct);
  $('overlayBackdrop').addEventListener('click', closeProduct);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closeProduct(); });
  $('brandLink').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Init
  fetch('data/products.json')
    .then((r) => r.json())
    .then((data) => {
      state.all = data;
      renderChips();
      render();
      // Åpne direkte produktlenke (#p/12345)
      const m = location.hash.match(/^#p\/(\d+)/);
      if (m) { const p = state.all.find((x) => x.id === +m[1]); if (p) openProduct(p); }
    })
    .catch(() => { emptyEl.hidden = false; emptyEl.textContent = 'Kunne ikke laste produktene.'; });
})();
