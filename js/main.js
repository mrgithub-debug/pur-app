// Pur. – Einstieg, Router und Ansichten.
import { AppError } from './errors.js';
import { SOURCES, getProduct, searchProducts } from './api.js';
import { isDigits, VALID_LENGTHS, checksumOk, cleanCode, gs1Region } from './barcode.js';
import { taxonomyNames, wikidataBrand, enrichError, wikipediaLinks, wikipediaSearchUrl } from './enrich.js';
import { productCitations, wikidataCitation, searchCitation, scannerCitation, wikiCitation, LICENSES } from './sources.js';
import * as store from './store.js';
import * as scan from './scanner.js';
import { permissionHelp } from './browser.js';
import { esc, safeUrl, icon, citeBtn, errorCard, openSheet, closeSheet, citationHtml, toast, GRADE_COLORS, gradeLabel, pinCard } from './ui.js';
import { prettyTag, tagName, ANALYSIS, NOVA, NUTRIENTS, LCA_STAGES, GREEN_ADJ, MISSING, num } from './labels.js';

const view = document.getElementById('view');
const OFF = SOURCES.off.base;

// Zustand der aktuellen Ansicht
let current = { cleanup: null, actions: {}, citations: {}, retry: null };
const setCitations = (c) => { current.citations = { ...current.citations, ...c }; };

// ---------------------------------------------------------------------------
// Router
const routes = [
  [/^#?\/?$/, homeView],
  [/^#\/suche(?:\?(.*))?$/, searchView],
  [/^#\/produkt\/([^?/]+)$/, productView],
  [/^#\/scan$/, scanView],
  [/^#\/merkliste$/, savedView],
  [/^#\/quellen$/, sourcesView]
];

let navCount = 0;
function route() {
  navCount++;
  closeSheet();
  if (current.cleanup) { try { current.cleanup(); } catch { /* ignorieren */ } }
  current = { cleanup: null, actions: {}, citations: {}, retry: null };
  const hash = location.hash || '#/';
  const hit = routes.find(([re]) => re.test(hash)) || routes[0];
  const m = hash.match(hit[0]) || [];
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === (hash.split(/[/?]/)[1] || '')));
  window.scrollTo(0, 0);
  Promise.resolve(hit[1](...m.slice(1))).catch(showUnexpected);
}
window.addEventListener('hashchange', route);

// ---------------------------------------------------------------------------
// Globale Ereignisse
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-cite]');
  if (c) { e.preventDefault(); openSheet(citationHtml(current.citations[c.dataset.cite]), 'Quelle'); return; }
  const a = e.target.closest('[data-action]');
  if (a) {
    const name = a.dataset.action;
    if (name === 'retry' && current.retry) { e.preventDefault(); current.retry(); return; }
    if (name === 'back') { e.preventDefault(); if (navCount > 1) history.back(); else location.hash = '#/'; return; }
    if (current.actions[name]) { e.preventDefault(); current.actions[name](a, e); }
  }
});

// Bilder, die nicht laden: Platzhalter statt kaputtem Bild
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  const box = img.parentElement;
  img.remove();
  if (box && box.classList.contains('hero')) {
    box.insertAdjacentHTML('afterbegin', `<span class="hero-ph">${icon.image}</span>`);
    const note = box.querySelector('.hero-note');
    if (note) note.innerHTML = `<button type="button" class="linklike" data-action="imgerr">Foto nicht geladen – warum?</button>`;
    current.actions.imgerr = () => openSheet(errorCard(new AppError('IMAGE_LOAD_FAILED')), 'Hinweis');
  } else if (box) {
    box.insertAdjacentHTML('afterbegin', `<span class="pin-ph">${icon.image}</span>`);
  }
}, true);

const netBanner = document.getElementById('net-banner');
function updateNet() {
  if (navigator.onLine) { netBanner.hidden = true; netBanner.innerHTML = ''; }
  else { netBanner.hidden = false; netBanner.innerHTML = errorCard(new AppError('NETWORK_OFFLINE'), { compact: true }); }
}
window.addEventListener('online', () => { updateNet(); toast('Wieder online'); });
window.addEventListener('offline', updateNet);

function showUnexpected(err) {
  if (err && err.name === 'AbortError') return;
  console.error(err);
  const box = document.getElementById('global-msg');
  box.hidden = false;
  box.innerHTML = errorCard(err instanceof AppError ? err : new AppError('APP_UNEXPECTED', { detail: err && err.message }), { actions: [{ label: 'Seite neu laden', action: 'reload' }, { label: 'Ausblenden', action: 'dismissGlobal' }] });
  current.actions.reload = () => location.reload();
  current.actions.dismissGlobal = () => { box.hidden = true; box.innerHTML = ''; };
  if (!current.retry) current.retry = () => { box.hidden = true; route(); };
}
window.addEventListener('unhandledrejection', (e) => showUnexpected(e.reason));
window.addEventListener('error', (e) => {
  if (e.filename && !e.filename.startsWith(location.origin)) return; // Erweiterungen o. Ä.
  if (e.error) showUnexpected(e.error);
});

// ---------------------------------------------------------------------------
// Bausteine
const CATS = [['alle', 'Alle'], ['lebensmittel', 'Lebensmittel'], ['kosmetik', 'Kosmetik'], ['haushalt', 'Haushalt'], ['tierbedarf', 'Tierbedarf']];
let lastCat = 'alle';

function searchForm(q = '', cat = lastCat, autofocus = false) {
  return `<form class="search" role="search" data-search>
      <label class="search-field">
        <span class="sr-only">Produkt, Marke oder Barcode-Nummer</span>
        ${icon.search}
        <input name="q" type="search" value="${esc(q)}" placeholder="Produkt, Marke oder Barcode" autocomplete="off" enterkeyhint="search" ${autofocus ? 'autofocus' : ''}>
        <a class="search-scan" href="#/scan" aria-label="Barcode mit der Kamera scannen">${icon.barcode}</a>
      </label>
      <div class="chips" role="radiogroup" aria-label="Kategorie">
        ${CATS.map(([id, label]) => `<button type="button" class="chip" role="radio" aria-checked="${id === cat}" data-cat="${id}">${label}</button>`).join('')}
      </div>
    </form>`;
}
function bindSearch(root) {
  const form = root.querySelector('[data-search]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = form.q.value.trim();
    const cat = form.querySelector('.chip[aria-checked="true"]').dataset.cat;
    location.hash = `#/suche?${new URLSearchParams({ q, cat })}`;
  });
  form.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    form.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    lastCat = b.dataset.cat;
    if (form.q.value.trim()) form.requestSubmit();
  }));
}

const masonry = (items) => `<div class="masonry">${items.map(pinCard).join('')}</div>`;

function storageNotice() {
  return store.storageAvailable() ? '' : errorCard(new AppError('STORAGE_UNAVAILABLE'), { compact: true });
}

// ---------------------------------------------------------------------------
// Startseite
function homeView() {
  const hist = store.getHistory();
  view.innerHTML = `<div class="page">
    <header class="top">
      <div><p class="wordmark">Pur<span>.</span></p><h1 class="display">Nur das, was drin ist.</h1><p class="kicker">Inhaltsstoffe, Umwelt &amp; Lieferkette – mit offenen Daten</p></div>
      <a class="icon-btn soft" href="#/quellen" aria-label="Quellen und Informationen">${icon.info}</a>
    </header>
    ${searchForm()}
    ${storageNotice()}
    ${hist.length ? `
      <div class="section-head"><h2>Zuletzt geprüft</h2><button class="linklike" type="button" data-action="clearHist">Verlauf leeren</button></div>
      ${masonry(hist)}` : `
      <div class="section-head"><h2>So funktioniert’s</h2></div>
      <div class="masonry">
        <div class="pin intro"><div class="pin-img" style="background:#F3D9CF;min-height:150px"><span class="pin-ph">${icon.search}</span></div><div class="pin-body"><span class="pin-name">Suchen</span><span class="pin-meta">Nach Name, Marke oder der Nummer unter dem Barcode.</span></div></div>
        <div class="pin intro"><div class="pin-img" style="background:#DCE8DA;min-height:118px"><span class="pin-ph">${icon.camera}</span></div><div class="pin-body"><span class="pin-name">Scannen</span><span class="pin-meta">Barcode mit der Kamera erfassen – die Bilder bleiben auf deinem Gerät.</span></div></div>
        <div class="pin intro"><div class="pin-img" style="background:#E9E2F0;min-height:128px"><span class="pin-ph">${icon.leaf}</span></div><div class="pin-body"><span class="pin-name">Verstehen</span><span class="pin-meta">Zutaten, Zusatzstoffe, Green-Score, CO₂ entlang der Lieferkette.</span></div></div>
        <div class="pin intro"><div class="pin-img" style="background:#F6E3C8;min-height:160px"><span class="pin-ph">${icon.source}</span></div><div class="pin-body"><span class="pin-name">Nachprüfen</span><span class="pin-meta">Hinter jeder Angabe steckt ein „Quelle“-Knopf mit Link und Lizenz.</span></div></div>
      </div>`}
  </div>`;
  bindSearch(view);
  current.actions.clearHist = () => { store.clearHistory(); route(); };
}

// ---------------------------------------------------------------------------
// Suche
async function searchView(qs = '') {
  const params = new URLSearchParams(qs);
  const q = (params.get('q') || '').trim();
  const cat = CATEGORY_IDS.includes(params.get('cat')) ? params.get('cat') : lastCat;
  lastCat = cat;
  view.innerHTML = `<div class="page">
    <header class="top"><h1 class="display">Suche</h1></header>
    ${searchForm(q, cat, !q)}
    <div id="results"></div>
  </div>`;
  bindSearch(view);
  const out = view.querySelector('#results');
  if (!q) { out.innerHTML = `<p class="muted pad">Gib einen Produktnamen, eine Marke oder die Barcode-Nummer ein.</p>`; return; }

  const code = cleanCode(q);
  if (isDigits(code)) {
    if (!VALID_LENGTHS.includes(code.length)) {
      out.innerHTML = errorCard(new AppError('INVALID_BARCODE_LENGTH', { length: code.length }));
      return;
    }
    if (!checksumOk(code)) {
      out.innerHTML = errorCard(new AppError('INVALID_BARCODE_CHECKSUM', { code }), { actions: [{ label: 'Trotzdem suchen', href: `#/produkt/${code}` }] });
      return;
    }
    location.replace(`#/produkt/${code}`);
    return;
  }
  if (q.length < 2) { out.innerHTML = errorCard(new AppError('SEARCH_TOO_SHORT')); return; }

  const ctrl = new AbortController();
  current.cleanup = () => ctrl.abort();
  const run = async () => {
    out.innerHTML = loadingPins('Suche läuft … die offenen Datenbanken brauchen manchmal ein paar Sekunden.');
    try {
      const res = await searchProducts(q, { category: cat, signal: ctrl.signal });
      setCitations({ search: searchCitation(res) });
      const scope = cat === 'alle' ? 'den vier Datenbanken' : SOURCES[{ lebensmittel: 'off', kosmetik: 'obf', haushalt: 'opf', tierbedarf: 'opff' }[cat]].name;
      const partial = res.partial ? errorCard(res.partial, { compact: true }) : '';
      if (!res.products.length) {
        out.innerHTML = partial + errorCard(new AppError('SEARCH_NO_RESULTS', { query: q, scope }), { actions: [{ label: 'Barcode scannen', href: '#/scan' }] });
        return;
      }
      out.innerHTML = `${partial}
        <div class="section-head"><h2>${res.products.length} Treffer</h2>${citeBtn('search')}</div>
        ${masonry(res.products.map((p) => store.summary(p)))}`;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      out.innerHTML = errorCard(err);
    }
  };
  current.retry = run;
  run();
}
const CATEGORY_IDS = CATS.map((c) => c[0]);

const loadingPins = (msg) => `<p class="muted pad" role="status">${esc(msg)}</p><div class="masonry" aria-hidden="true">${[150, 120, 180, 130].map((h) => `<div class="pin skeleton"><div class="pin-img" style="min-height:${h}px"></div><div class="pin-body"><span class="sk-line"></span><span class="sk-line short"></span></div></div>`).join('')}</div>`;

// ---------------------------------------------------------------------------
// Produktdetail
async function productView(rawCode) {
  const code = cleanCode(decodeURIComponent(rawCode));
  const ctrl = new AbortController();
  current.cleanup = () => ctrl.abort();
  const run = async () => {
    view.innerHTML = `<div class="page detail-loading"><button type="button" class="icon-btn soft" data-action="back" aria-label="Zurück">${icon.back}</button>
      <div class="hero skeleton"></div><p class="muted pad" role="status">Produkt ${esc(code)} wird in den offenen Datenbanken gesucht …</p></div>`;
    let result;
    try { result = await getProduct(code, { signal: ctrl.signal }); }
    catch (err) {
      if (err && err.name === 'AbortError') return;
      const actions = [];
      if (err.code === 'PRODUCT_NOT_FOUND' || err.code === 'PRODUCT_NOT_FOUND_PARTIAL') {
        actions.push({ label: 'Bei Open Food Facts anlegen', href: `${OFF}/cgi/product.pl?type=search_or_add&action=process&code=${encodeURIComponent(code)}`, external: true });
        actions.push({ label: 'Nummer neu eingeben', href: `#/suche?${new URLSearchParams({ q: code })}` });
        actions.push({ label: 'Erneut scannen', href: '#/scan' });
      }
      view.innerHTML = `<div class="page"><header class="top"><button type="button" class="icon-btn soft" data-action="back" aria-label="Zurück">${icon.back}</button></header>${errorCard(err, { actions })}</div>`;
      return;
    }
    renderProduct(result);
    store.addHistory(store.summary(result.product, result.sourceId));
    enrich(result, ctrl.signal);
  };
  current.retry = run;
  run();
}

function scoreTile(id, value, label, color, sub) {
  return `<button type="button" class="score" data-cite="${id}" aria-label="${esc(label)}: ${esc(value || 'unbekannt')} – Erklärung und Quelle">
    <span class="score-val" style="background:${color || '#8A7A77'}">${esc(value || '?')}</span>
    <span class="score-label">${esc(label)}</span>${sub ? `<span class="score-sub">${esc(sub)}</span>` : ''}</button>`;
}

function renderProduct(result) {
  const { product: p, sourceId } = result;
  const src = SOURCES[sourceId];
  const cites = productCitations(result);
  setCitations({ ...cites, wiki: wikiCitation() });
  const name = p.product_name_de || p.product_name || 'Unbenanntes Produkt';
  const img = p.image_front_url || p.image_url;
  const isFood = sourceId === 'off';
  const greenGrade = p.environmental_score_grade || p.ecoscore_grade;
  const nutri = p.nutriscore_grade;
  const saved = store.isSaved(p.code);

  const tiles = isFood ? `<div class="scores">
      ${scoreTile('greenscore', gradeLabel(greenGrade), 'Green-Score', GRADE_COLORS[greenGrade], gradeLabel(greenGrade) ? null : 'nicht berechnet')}
      ${scoreTile('nutriscore', gradeLabel(nutri), 'Nutri-Score', GRADE_COLORS[nutri], gradeLabel(nutri) ? null : 'nicht berechnet')}
      ${scoreTile('nova', p.nova_group ? String(p.nova_group) : null, 'NOVA-Gruppe', p.nova_group ? ['', '#2F7A4A', '#4E8A3A', '#9A6A12', '#B5462F'][p.nova_group] : null, p.nova_group ? null : 'nicht berechnet')}
    </div>` : `<p class="note">Für ${esc(src.kind)} berechnen die offenen Datenbanken keinen Green-, Nutri- oder NOVA-Score. Unten findest du alle erfassten Inhaltsstoffe, Verpackungs- und Herkunftsangaben.</p>`;

  const tabs = [['inhalt', 'Inhaltsstoffe'], ['umwelt', 'Umwelt'], ['kette', 'Lieferkette']];
  if (p.nutriments && Object.keys(p.nutriments).some((k) => k.endsWith('_100g'))) tabs.push(['naehrwerte', 'Nährwerte']);

  view.innerHTML = `<article class="detail">
    <div class="hero" style="background:#F3D9CF">
      ${img ? `<img src="${safeUrl(img)}" alt="Produktfoto: ${esc(name)}" referrerpolicy="no-referrer">` : `<span class="hero-ph">${icon.image}</span>`}
      <button type="button" class="icon-btn hero-back" data-action="back" aria-label="Zurück">${icon.back}</button>
      <button type="button" class="icon-btn hero-save ${saved ? 'is-on' : ''}" data-action="save" aria-pressed="${saved}" aria-label="${saved ? 'Von Merkliste entfernen' : 'Auf Merkliste speichern'}">${saved ? icon.heartFill : icon.heart}</button>
      <span class="hero-note">${img ? `Foto: Mitwirkende von ${esc(src.name)} ${citeBtn('image', 'Quelle & Lizenz')}` : 'Kein Foto vorhanden'}</span>
    </div>
    <div class="detail-card">
      <p class="meta-line">${esc([p.brands && p.brands.split(',')[0], p.quantity, `EAN ${p.code}`].filter(Boolean).join(' · '))}</p>
      <h1 class="display detail-title">${esc(name)}</h1>
      <div class="meta-row"><span class="tag">${esc(src.kind)}</span>${p.generic_name_de || p.generic_name ? `<span class="muted small">${esc(p.generic_name_de || p.generic_name)}</span>` : ''}${citeBtn('product')}</div>
      ${tiles}
      <div class="tabs" role="tablist" aria-label="Produktinformationen">
        ${tabs.map(([id, label], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}
      </div>
      <section id="panel-inhalt" role="tabpanel" aria-labelledby="tab-inhalt">${panelIngredients(p, src)}</section>
      <section id="panel-umwelt" role="tabpanel" aria-labelledby="tab-umwelt" hidden>${panelEnvironment(p, src, isFood)}</section>
      <section id="panel-kette" role="tabpanel" aria-labelledby="tab-kette" hidden>${panelSupplyChain(p, src)}</section>
      ${tabs.length > 3 ? `<section id="panel-naehrwerte" role="tabpanel" aria-labelledby="tab-naehrwerte" hidden>${panelNutrition(p)}</section>` : ''}
      <footer class="detail-foot">
        <button type="button" class="btn btn-ghost" data-action="allSources">Alle Quellen dieser Seite</button>
        <a class="btn btn-ghost" href="${safeUrl(`${src.base}/product/${encodeURIComponent(p.code)}`)}" target="_blank" rel="noopener">Angaben bei ${esc(src.name)} ergänzen ${icon.ext}</a>
        <p class="muted small">Daten: ${esc(src.name)} und Mitwirkende, lizenziert unter <a href="${LICENSES.odbl.url}" target="_blank" rel="noopener">ODbL</a>. Angaben ohne Gewähr – maßgeblich ist die Verpackung.</p>
      </footer>
    </div>
  </article>`;

  // Tabs
  const tabBtns = [...view.querySelectorAll('[role="tab"]')];
  const select = (btn) => {
    tabBtns.forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; document.getElementById(b.getAttribute('aria-controls')).hidden = !on; });
    btn.focus();
  };
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select(tabBtns[(i + 1) % tabBtns.length]);
      if (e.key === 'ArrowLeft') select(tabBtns[(i - 1 + tabBtns.length) % tabBtns.length]);
    });
  });

  current.actions.save = (btn) => {
    const on = store.toggleSaved(store.summary(p, sourceId));
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? 'Von Merkliste entfernen' : 'Auf Merkliste speichern');
    btn.innerHTML = on ? icon.heartFill : icon.heart;
    toast(on ? 'Auf der Merkliste gespeichert' : 'Von der Merkliste entfernt');
  };
  current.actions.allSources = () => {
    const list = Object.entries(current.citations).map(([id, c]) => `<li><button type="button" class="src-row" data-src-id="${esc(id)}"><span>${esc(c.title)}</span><span class="muted small">${esc(c.provider)}</span></button></li>`).join('');
    openSheet(`<p class="sheet-kicker">Quellenverzeichnis</p><h2 class="sheet-title">Alle Quellen dieser Seite</h2><ul class="src-list">${list}</ul>`, 'Quellenverzeichnis');
    document.querySelectorAll('.src-row').forEach((b) => b.addEventListener('click', () => openSheet(citationHtml(current.citations[b.dataset.srcId]), 'Quelle')));
  };
}

const chip = (text, tone = 'neutral') => `<span class="pill pill-${tone}">${esc(text)}</span>`;
const box = (title, citeId, body, extra = '') => `<div class="box"><div class="box-head"><h2>${esc(title)}</h2>${citeId ? citeBtn(citeId) : ''}</div>${body}${extra}</div>`;
const empty = (text, src, p) => `<p class="empty">${esc(text)} <a href="${safeUrl(`${src.base}/product/${encodeURIComponent(p.code)}`)}" target="_blank" rel="noopener">Bei ${esc(src.name)} ergänzen</a></p>`;

// Link zu einer Beschreibung bei Wikipedia: zuerst Wikipedia-Suche, nach der Anreicherung direkter Artikel
const wikiLink = (tag, label, tt = 'ingredients') => `<a class="wiki" href="${esc(wikipediaSearchUrl(label))}" target="_blank" rel="noopener" data-wiki="${esc(tag || '')}" data-wiki-tt="${tt}" aria-label="${esc(label)} bei Wikipedia nachschlagen (Suche)" title="Bei Wikipedia nachschlagen">W</a>`;
const wikiNote = `<p class="wiki-note muted small"><span class="wiki wiki-demo" aria-hidden="true">W</span> öffnet eine Beschreibung bei Wikipedia. ${citeBtn('wiki', 'Quelle der Links')}</p>`;

function panelIngredients(p, src) {
  const analysis = (p.ingredients_analysis_tags || []).map((t) => ANALYSIS[t]).filter(Boolean);
  const allergens = p.allergens_tags || [];
  const traces = p.traces_tags || [];
  const additives = p.additives_tags || [];
  const ingr = Array.isArray(p.ingredients) ? p.ingredients : [];
  const text = p.ingredients_text_de || p.ingredients_text;
  const addSet = new Set(additives);
  const rows = ingr.slice(0, 40).map((i) => {
    const pct = i.percent !== undefined ? `${num(i.percent)} %` : (i.percent_estimate !== undefined && i.percent_estimate > 0 ? `ca. ${num(i.percent_estimate)} %` : '');
    const flags = [];
    if (addSet.has(i.id)) flags.push('<span class="flag flag-add">Zusatzstoff</span>');
    if (i.from_palm_oil === 'yes') flags.push('<span class="flag flag-warn">Palmöl</span>');
    if (i.vegan === 'no') flags.push('<span class="flag">nicht vegan</span>');
    const label = i.text || prettyTag(i.id);
    return `<li><span class="ing">${esc(label)}${wikiLink(i.id, label)}</span><span class="row-right">${flags.join('')}<span class="muted">${esc(pct)}</span></span></li>`;
  }).join('');
  return `
    ${analysis.length ? `<div class="pills-row">${analysis.map((a) => chip(a.text, a.tone)).join('')}${citeBtn('analysis')}</div>` : ''}
    ${box('Allergene & Spuren', 'allergens', allergens.length || traces.length ? `
      ${allergens.length ? `<p><strong>Enthält:</strong> <span data-tax="allergens">${allergens.map((t) => `<span class="tx" data-tag="${esc(t)}">${esc(prettyTag(t))}</span>`).join(', ')}</span></p>` : ''}
      ${traces.length ? `<p><strong>Kann Spuren enthalten von:</strong> ${traces.map((t) => `<span class="tx" data-tag="${esc(t)}">${esc(prettyTag(t))}</span>`).join(', ')}</p>` : ''}`
      : '<p class="muted">Keine Allergene erfasst. Das heißt nicht, dass keine enthalten sind – bitte die Verpackung prüfen.</p>')}
    ${box(`Zusatzstoffe (${additives.length})`, 'additives', additives.length
      ? `<ul class="rows" id="additives">${additives.map((t) => `<li><span class="ing"><span class="tx" data-tag="${esc(t)}">${esc(prettyTag(t))}</span>${wikiLink(t, prettyTag(t), 'additives')}</span><span class="muted small add-class" data-class-for="${esc(t)}"></span></li>`).join('')}</ul>`
      : '<p class="muted">Keine Zusatzstoffe erkannt.</p>', additives.length ? wikiNote : '')}
    ${box('Zutaten', 'ingredients', ingr.length
      ? `<ul class="rows">${rows}</ul>${ingr.length > 40 ? `<p class="muted small">… und ${ingr.length - 40} weitere</p>` : ''}${wikiNote}`
      : (text ? '' : empty('Für dieses Produkt ist keine Zutatenliste erfasst.', src, p)),
      `${text ? `<details class="raw"><summary>Originaltext der Verpackung</summary><p>${esc(text)}</p>${p.image_ingredients_url ? `<a href="${safeUrl(p.image_ingredients_url)}" target="_blank" rel="noopener">Foto der Zutatenliste ansehen ${icon.ext}</a>` : ''}</details>` : ''}`)}
    <div class="enrich-msgs" data-enrich="inhalt"></div>`;
}

function panelEnvironment(p, src, isFood) {
  const g = p.environmental_score_grade || p.ecoscore_grade;
  const data = p.environmental_score_data || p.ecoscore_data || {};
  const score = p.environmental_score_score ?? p.ecoscore_score ?? data.score;
  const adj = data.adjustments || {};
  const adjRows = Object.entries(GREEN_ADJ).map(([k, label]) => {
    const v = adj[k] && adj[k].value;
    if (v === undefined || v === null) return '';
    return `<li><span>${esc(label)}</span><span class="${v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'}">${v > 0 ? '+' : ''}${esc(num(v, 0))} Punkte</span></li>`;
  }).join('');
  const missing = data.missing ? Object.keys(data.missing).map((k) => MISSING[k] || prettyTag(k)) : [];
  let green;
  if (!isFood) green = '';
  else if (gradeLabel(g)) {
    green = box('Green-Score', 'greenscore', `
      <div class="big-score"><span class="score-val lg" style="background:${GRADE_COLORS[g]}">${esc(gradeLabel(g))}</span>
      <div><strong>${score !== undefined ? `${esc(num(score, 0))} von 100 Punkten` : ''}</strong><p class="muted small">Umweltwirkung über den ganzen Lebensweg, verglichen mit ähnlichen Produkten.</p></div></div>
      ${adjRows ? `<h3>Boni &amp; Abzüge</h3><ul class="rows">${adjRows}</ul>` : ''}
      ${missing.length ? `<p class="note">Für eine genauere Bewertung fehlen Angaben zu: ${esc(missing.join(', '))}.</p>` : ''}`);
  } else {
    green = box('Green-Score', 'greenscore', g === 'not-applicable'
      ? '<p class="muted">Für diese Produktkategorie wird kein Green-Score berechnet (z. B. Wasser, Alkohol, frische Früchte ohne Verpackung).</p>'
      : `<p class="muted">Noch nicht berechnet – es fehlen Angaben${missing.length ? ` zu: ${esc(missing.join(', '))}` : ' (meist Produktkategorie oder Verpackung)'}.</p>${empty('', src, p)}`);
  }
  const packs = Array.isArray(p.packagings) ? p.packagings : [];
  const packBody = packs.length
    ? `<ul class="rows">${packs.map((k) => `<li><span>${k.number_of_units ? `${esc(k.number_of_units)} × ` : ''}<span class="tx" data-tag="${esc(k.shape || '')}" data-tt="packaging_shapes">${esc(prettyTag(k.shape) || 'Teil')}</span>${k.material ? ` · <span class="tx" data-tag="${esc(k.material)}" data-tt="packaging_materials">${esc(prettyTag(k.material))}</span>` : ''}</span><span class="muted small">${k.recycling ? `<span class="tx" data-tag="${esc(k.recycling)}" data-tt="packaging_recycling">${esc(prettyTag(k.recycling))}</span>` : ''}${k.weight_measured ? ` · ${esc(num(k.weight_measured))} g` : ''}</span></li>`).join('')}</ul>`
    : (p.packaging_text || p.packaging ? `<p>${esc(p.packaging_text || p.packaging)}</p>` : empty('Keine Verpackungsangaben erfasst.', src, p));
  const labels = p.labels_tags || [];
  return `${green}
    ${box('Verpackung & Entsorgung', 'packaging', packBody, p.packaging_text && packs.length ? `<p class="muted small">Hinweis auf der Packung: ${esc(p.packaging_text)}</p>` : '')}
    ${box(`Siegel & Labels (${labels.length})`, 'labels', labels.length
      ? `<div class="pills-row">${labels.map((t) => `<span class="pill pill-good tx" data-tag="${esc(t)}" data-tt="labels">${esc(prettyTag(t))}</span>`).join('')}</div>`
      : '<p class="muted">Keine Siegel erfasst.</p>')}
    <div class="enrich-msgs" data-enrich="umwelt"></div>`;
}

function panelSupplyChain(p, src) {
  const data = p.environmental_score_data || p.ecoscore_data || {};
  const agb = data.agribalyse || {};
  const stages = LCA_STAGES.map(([k, label]) => [label, Number(agb[k])]).filter(([, v]) => !isNaN(v));
  const total = Number(agb.co2_total);
  const max = Math.max(...stages.map(([, v]) => v), 0.0001);
  const lca = stages.length ? box('Reise des Produkts: CO₂ je Phase', 'lca', `
      <ol class="journey">${stages.map(([label, v], i) => `<li><span class="step">${i + 1}</span><div class="step-body"><div class="step-top"><span>${esc(label)}</span><span class="muted">${esc(num(v, 2))} kg${!isNaN(total) && total > 0 ? ` · ${esc(num((v / total) * 100, 0))} %` : ''}</span></div><div class="bar"><span style="width:${Math.max(2, (v / max) * 100).toFixed(1)}%"></span></div></div></li>`).join('')}</ol>
      ${!isNaN(total) ? `<p><strong>Gesamt: ${esc(num(total, 2))} kg CO₂e je kg Produkt</strong></p>` : ''}
      ${agb.name_en || agb.name_fr ? `<p class="muted small">Referenzkategorie in Agribalyse: ${esc(agb.name_en || agb.name_fr)}${agb.agribalyse_food_code || agb.code ? ` (Code ${esc(agb.agribalyse_food_code || agb.code)})` : ''}</p>` : ''}`)
    : box('Reise des Produkts: CO₂ je Phase', 'lca', `<p class="muted">Für dieses Produkt liegt keine Ökobilanz vor. Sie wird nur für Lebensmittel berechnet, denen eine Agribalyse-Kategorie zugeordnet ist.</p>`);

  const agg = (((data.adjustments || {}).origins_of_ingredients || {}).aggregated_origins || []).filter((o) => o.origin);
  const originsText = p.origins_de || p.origins;
  const originTags = (p.origins_tags || []).filter((t) => !/unknown/.test(t));
  const originBody = agg.length && !(agg.length === 1 && /unknown/.test(agg[0].origin))
    ? `<ul class="rows">${agg.map((o) => `<li><span class="tx" data-tag="${esc(o.origin)}" data-tt="countries">${esc(/unknown/.test(o.origin) ? 'Unbekannt' : prettyTag(o.origin))}</span><span class="muted">${esc(num(o.percent, 0))} %</span></li>`).join('')}</ul>`
    : originTags.length ? `<p>${originTags.map((t) => `<span class="tx" data-tag="${esc(t)}" data-tt="countries">${esc(prettyTag(t))}</span>`).join(', ')}</p>`
      : originsText ? '' : empty('Keine Herkunftsangaben erfasst.', src, p);

  const manu = p.manufacturing_places;
  const emb = p.emb_codes;
  const countries = (p.countries_tags || []);
  const gs1 = gs1Region(p.code);
  return `${lca}
    ${box('Herkunft der Zutaten', 'origins', originBody, originsText ? `<p class="muted small">Angabe auf der Packung: ${esc(originsText)}</p>` : '')}
    ${box('Herstellung', 'manufacturing', manu || emb
      ? `${manu ? `<p><strong>Hergestellt/verarbeitet in:</strong> ${esc(manu)}</p>` : ''}${emb ? `<p><strong>Verpackercode:</strong> ${esc(emb)}</p>` : ''}`
      : empty('Kein Herstellungsort erfasst.', src, p))}
    <div id="maker-slot"></div>
    ${box('Erhältlich in', 'sold', countries.length || p.stores
      ? `${countries.length ? `<p>${countries.map((t) => `<span class="tx" data-tag="${esc(t)}" data-tt="countries">${esc(prettyTag(t))}</span>`).join(', ')}</p>` : ''}${p.stores ? `<p class="muted small">Gesehen bei: ${esc(p.stores)}</p>` : ''}`
      : '<p class="muted">Keine Angaben.</p>')}
    ${gs1 ? box('Barcode registriert bei', 'gs1', `<p><strong>${esc(gs1.region || 'Unbekanntes Präfix')}</strong> <span class="muted small">(Präfix ${esc(gs1.prefix)})</span></p><p class="muted small">Zeigt die GS1-Länderorganisation – nicht das Herkunftsland des Produkts.</p>`) : ''}
    <div class="enrich-msgs" data-enrich="kette"></div>`;
}

function panelNutrition(p) {
  const n = p.nutriments || {};
  const rows = NUTRIENTS.map(([k, label, unit]) => {
    const v = n[`${k}_100g`];
    if (v === undefined) return '';
    return `<tr><th scope="row">${esc(label)}</th><td>${esc(num(v, 2))} ${unit}</td></tr>`;
  }).join('');
  return box('Nährwerte je 100 g / 100 ml', 'nutrition', rows ? `<table class="nutri"><tbody>${rows}</tbody></table>` : '<p class="muted">Keine Nährwerte erfasst.</p>');
}

async function linkWikipedia(result, signal, note) {
  const els = [...view.querySelectorAll('a.wiki[data-wiki]')].filter((a) => a.dataset.wiki);
  if (!els.length) return;
  const byTt = {};
  els.forEach((a) => (byTt[a.dataset.wikiTt] = byTt[a.dataset.wikiTt] || new Set()).add(a.dataset.wiki));
  try {
    // Zutaten aus der Taxonomie der jeweiligen Datenbank, Zusatzstoffe aus Open Food Facts
    const tax = {};
    for (const [tt, set] of Object.entries(byTt)) {
      const base = tt === 'ingredients' ? SOURCES[result.sourceId].base : OFF;
      tax[tt] = await taxonomyNames(base, tt, [...set]);
    }
    const qids = Object.values(tax).flatMap((m) => Object.values(m).map((e) => e && e.qid)).filter(Boolean);
    const links = await wikipediaLinks(qids);
    if (signal.aborted) return;
    els.forEach((a) => {
      const e = tax[a.dataset.wikiTt] && tax[a.dataset.wikiTt][a.dataset.wiki];
      const l = e && e.qid && links[e.qid];
      if (!l) return;
      a.href = l.url;
      a.classList.add('is-direct');
      a.setAttribute('aria-label', `Artikel „${l.title}“ bei Wikipedia${l.lang === 'en' ? ' (englisch)' : ''}`);
      a.title = `Wikipedia: ${l.title}${l.lang === 'en' ? ' (englisch)' : ''}`;
    });
  } catch (err) {
    note('inhalt', enrichError('Wikidata/Wikipedia', 'Die direkten Wikipedia-Artikel für Zutaten und Zusatzstoffe konnten nicht ermittelt werden. Die „W“-Links öffnen deshalb die Wikipedia-Suche zum jeweiligen Begriff.', err));
  }
}

const taxType = (el) => el.dataset.tt || (el.closest('#additives') ? 'additives' : 'allergens');

/** Lädt deutsche Begriffe und Herstellerdaten nach; Fehler werden als Hinweis angezeigt. */
async function enrich(result, signal) {
  const { product: p } = result;
  const note = (panel, err) => {
    if (signal.aborted) return;
    const slot = view.querySelector(`[data-enrich="${panel}"]`);
    if (slot && !slot.querySelector(`[data-error-code="ENRICH_FAILED"][data-src="${err.info.sourceName}"]`)) {
      slot.insertAdjacentHTML('beforeend', errorCard(err, { compact: true }).replace('<section ', `<section data-src="${esc(err.info.sourceName)}" `));
    }
  };
  // Taxonomien
  const groups = {};
  view.querySelectorAll('.tx[data-tag]').forEach((el) => {
    const tt = taxType(el);
    if (!el.dataset.tag) return;
    (groups[tt] = groups[tt] || new Set()).add(el.dataset.tag);
  });
  const panelOf = { allergens: 'inhalt', additives: 'inhalt', labels: 'umwelt', packaging_shapes: 'umwelt', packaging_materials: 'umwelt', packaging_recycling: 'umwelt', countries: 'kette' };
  let taxFailed = false;
  await Promise.all(Object.entries(groups).map(async ([tt, set]) => {
    try {
      const names = await taxonomyNames(OFF, tt, [...set]);
      if (signal.aborted) return;
      view.querySelectorAll('.tx[data-tag]').forEach((el) => {
        const t = el.dataset.tag;
        if (taxType(el) === tt && names[t] && names[t].name) el.textContent = names[t].name;
      });
      if (tt === 'additives') {
        view.querySelectorAll('[data-class-for]').forEach((el) => {
          const n = names[el.dataset.classFor];
          if (n && n.classes) el.textContent = n.classes.split(',').map((c) => prettyTag(c)).join(', ');
        });
      }
    } catch (err) {
      if (signal.aborted) return;
      if (!taxFailed) {
        taxFailed = true;
        note(panelOf[tt] || 'inhalt', enrichError('Open Food Facts (Taxonomie)', 'Die deutschen Bezeichnungen für Zutaten, Siegel, Verpackungen und Länder konnten nicht geladen werden. Sie werden deshalb in der Originalschreibweise der Datenbank (meist Englisch) angezeigt.', err));
      }
    }
  }));
  // Wikipedia-Links für Zutaten & Zusatzstoffe
  await linkWikipedia(result, signal, note);
  // Wikidata – Hersteller
  if (p.brands) {
    try {
      const wd = await wikidataBrand(p.brands);
      if (signal.aborted || !wd) return;
      setCitations({ maker: wikidataCitation(wd) });
      const rows = [
        ['Unternehmen', wd.label + (wd.description ? ` – ${wd.description}` : '')],
        ['Land', wd.country.join(', ')], ['Sitz', wd.hq.join(', ')], ['Gehört zu', wd.parent.join(', ')],
        ['Branche', wd.industry.join(', ')], ['Gegründet', wd.founded]
      ].filter(([, v]) => v).map(([k, v]) => `<li><span>${esc(k)}</span><span class="muted">${esc(v)}</span></li>`).join('');
      const slot = view.querySelector('#maker-slot');
      if (slot) slot.innerHTML = box('Marke & Hersteller', 'maker', `<ul class="rows">${rows}</ul>${wd.website ? `<p><a href="${safeUrl(wd.website)}" target="_blank" rel="noopener">Website ${icon.ext}</a></p>` : ''}<p class="muted small">Automatisch über den Markennamen „${esc(p.brands.split(',')[0])}“ zugeordnet.</p>`);
    } catch (err) {
      note('kette', enrichError('Wikidata', 'Informationen zu Marke und Hersteller (Land, Mutterkonzern, Website) konnten nicht geladen werden.', err));
    }
  }
}

// ---------------------------------------------------------------------------
// Kamera-Scan
async function scanView() {
  view.innerHTML = `<div class="page scan-page">
    <header class="top"><div><p class="kicker">Kamera</p><h1 class="display">Barcode scannen</h1></div>
      <a class="icon-btn soft" href="#/" aria-label="Schließen">${icon.close}</a></header>
    <p class="muted" role="status" id="scan-status">Prüfe, was dein Browser kann …</p>
    <div class="scan-stage" id="stage" hidden>
      <video id="video" playsinline muted aria-label="Kamerabild"></video>
      <div class="scan-frame" aria-hidden="true"><span></span></div>
      <button type="button" class="btn btn-primary scan-start" data-action="start">${icon.camera} Kamera starten</button>
      <button type="button" class="icon-btn scan-torch" data-action="torch" aria-label="Licht ein/aus" aria-pressed="false" hidden>${icon.flash}</button>
    </div>
    <div id="scan-msg" aria-live="polite"></div>
    <div class="scan-alt">
      <label class="btn btn-ghost" id="photo-btn" hidden>${icon.image} Foto aufnehmen oder wählen
        <input type="file" accept="image/*" capture="environment" class="sr-only" id="photo"></label>
      <form class="manual" data-manual>
        <label for="manual-code">Oder Nummer eintippen</label>
        <div class="manual-row"><input id="manual-code" name="code" inputmode="numeric" pattern="[0-9 ]*" placeholder="z. B. 40…" autocomplete="off">
        <button class="btn btn-primary" type="submit">Prüfen</button></div>
      </form>
    </div>
    <p class="engine" id="engine"></p>
  </div>`;

  const $ = (s) => view.querySelector(s);
  const status = $('#scan-status'), msg = $('#scan-msg'), stage = $('#stage'), video = $('#video');
  let stream = null, scanner = null, dead = false;
  const stopAll = () => { if (scanner) scanner.stop(); scanner = null; scan.stopStream(stream); stream = null; video.srcObject = null; };
  const onVis = () => { if (document.hidden && stream) { stopAll(); showStart('Kamera pausiert. Tippe, um fortzufahren.'); } };
  document.addEventListener('visibilitychange', onVis);
  current.cleanup = () => { dead = true; stopAll(); document.removeEventListener('visibilitychange', onVis); };

  $('[data-manual]').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.code.value.trim();
    if (q) location.hash = `#/suche?${new URLSearchParams({ q })}`;
  });

  const caps = await scan.capabilities();
  if (dead) return;
  const eng = scan.engineLabel(caps);
  setCitations({ scanner: scannerCitation(caps.engine) });
  $('#engine').innerHTML = `Erkennung: <strong>${esc(eng.short)}</strong> · ${esc(caps.browser.name)} <button type="button" class="linklike" data-action="engineInfo">Wie funktioniert das?</button> ${citeBtn('scanner')}`;
  current.actions.engineInfo = () => openSheet(`<p class="sheet-kicker">Barcode-Erkennung</p><h2 class="sheet-title">${esc(eng.short)}</h2><p>${esc(eng.long)}</p>
    <p class="muted small">Die App wählt automatisch: Hat der Browser eine eingebaute Erkennung, wird diese genutzt (schneller). Sonst wird ZXing geladen. Ohne Kamerazugriff kannst du ein Foto auswählen – auch das wird nur lokal ausgewertet.</p>`, 'Barcode-Erkennung');

  const showError = (err, extra = {}) => { msg.innerHTML = errorCard(err, { ctx: { browserName: caps.browser.name }, ...extra }); };
  const showStart = (text) => { const b = $('.scan-start'); b.hidden = false; status.textContent = text; $('.scan-torch').hidden = true; };

  if (!caps.engine) { status.textContent = ''; showError(new AppError('SCANNER_UNSUPPORTED')); return; }
  $('#photo-btn').hidden = false;

  const found = (code) => {
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch { /* egal */ } }
    stopAll();
    status.textContent = `Barcode ${code} erkannt – lade Produkt …`;
    location.hash = `#/produkt/${code}`;
  };

  const startLive = async () => {
    msg.innerHTML = '';
    $('.scan-start').hidden = true;
    status.textContent = caps.engine === 'zxing' ? 'Lade Barcode-Erkennung (ZXing) …' : 'Starte Kamera …';
    let det;
    try { det = await scan.getDetector(caps); }
    catch (err) { if (!dead) { showStart(''); showError(err); } return; }
    if (dead) return;
    status.textContent = 'Starte Kamera … bitte erlaube den Zugriff, falls dein Browser fragt.';
    try { stream = await scan.startCamera(video, caps); }
    catch (err) { if (!dead) { showStart(''); showError(err, { actions: [{ label: 'Foto statt Kamera', action: 'photo' }] }); } return; }
    if (dead) { stopAll(); return; }
    status.textContent = 'Halte den Barcode in den Rahmen.';
    if (scan.torchSupported(stream)) $('.scan-torch').hidden = false;
    scanner = new scan.LiveScanner({
      video, detector: det.detector, onCode: found,
      onHint: (code) => { msg.innerHTML = errorCard(new AppError(code), { compact: true }); },
      onFatal: (err) => { stopAll(); showStart(''); showError(err); }
    });
    scanner.start();
  };
  current.retry = startLive;
  current.actions.start = startLive;
  current.actions.photo = () => $('#photo').click();
  let torchOn = false;
  current.actions.torch = async (btn) => {
    try { torchOn = !torchOn; await scan.setTorch(stream, torchOn); btn.setAttribute('aria-pressed', torchOn); }
    catch { torchOn = false; toast('Licht lässt sich auf diesem Gerät nicht steuern'); }
  };

  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    stopAll();
    msg.innerHTML = '';
    status.textContent = 'Werte Foto aus …';
    try {
      const det = await scan.getDetector(caps);
      const code = await scan.decodePhoto(file, det.detector);
      found(code);
    } catch (err) {
      status.textContent = '';
      current.retry = () => $('#photo').click();
      showError(err, { actions: [{ label: 'Neues Foto', action: 'photo' }] });
    }
  });

  // Browserabhängiger Einstieg
  if (!caps.secure) { status.textContent = ''; showError(new AppError('CAMERA_INSECURE_CONTEXT')); return; }
  if (!caps.media) { status.textContent = ''; showError(new AppError('CAMERA_UNSUPPORTED', { browserName: caps.browser.name }), { actions: [{ label: 'Foto aufnehmen', action: 'photo' }] }); return; }
  stage.hidden = false;
  if (caps.permission === 'granted') startLive();
  else if (caps.permission === 'denied') {
    showStart('');
    showError(new AppError('CAMERA_PERMISSION_DENIED', { permissionHelp: permissionHelp(caps.browser) }), { actions: [{ label: 'Foto statt Kamera', action: 'photo' }] });
  } else showStart(caps.browser.isIOS ? 'Tippe auf „Kamera starten“. Safari fragt dann nach der Erlaubnis.' : 'Tippe auf „Kamera starten“. Dein Browser fragt dann nach der Erlaubnis.');
}

// ---------------------------------------------------------------------------
// Merkliste
function savedView() {
  const list = store.getSaved();
  view.innerHTML = `<div class="page">
    <header class="top"><div><p class="kicker">Deine Pinnwand</p><h1 class="display">Merkliste</h1></div></header>
    ${storageNotice()}
    ${list.length ? masonry(list) : `<p class="empty-big">Noch nichts gemerkt. Tippe auf einer Produktseite auf das Herz, um ein Produkt hier zu sammeln.</p><a class="btn btn-primary" href="#/suche">Produkt suchen</a>`}
  </div>`;
}

// ---------------------------------------------------------------------------
// Quellen & Lizenzen
function sourcesView() {
  const db = Object.values(SOURCES).map((s) => `<li><a href="${s.base}" target="_blank" rel="noopener"><strong>${esc(s.name)}</strong> ${icon.ext}</a><span class="muted small">${esc(s.kind)} · ${esc(LICENSES.odbl.name)}</span></li>`).join('');
  view.innerHTML = `<div class="page prose">
    <header class="top"><div><p class="kicker">Transparenz</p><h1 class="display">Quellen &amp; Lizenzen</h1></div></header>
    <p>Diese App zeigt ausschließlich Daten aus offenen, frei verfügbaren Quellen. Sie nutzt keine künstliche Intelligenz und erstellt keine eigenen Bewertungen. Neben jeder Angabe findest du einen <span class="cite-demo">${icon.source} Quelle</span>-Knopf mit Anbieter, Lizenz, Aktualisierungsdatum und Link zum Originaleintrag.</p>
    ${box('Produktdatenbanken', null, `<ul class="rows rows-stack">${db}</ul><p class="muted small">Gemeinnütziges Projekt Open Food Facts und Mitwirkende. Fotos: <a href="${LICENSES.ccbysa.url}" target="_blank" rel="noopener">CC BY-SA 3.0</a>.</p>`)}
    ${box('Bewertungen & Ökobilanzen', null, `<ul class="rows rows-stack">
      <li><a href="${OFF}/green-score-methodology" target="_blank" rel="noopener"><strong>Green-Score (früher Eco-Score)</strong> ${icon.ext}</a><span class="muted small">berechnet von Open Food Facts</span></li>
      <li><a href="https://agribalyse.ademe.fr/" target="_blank" rel="noopener"><strong>Agribalyse (ADEME)</strong> ${icon.ext}</a><span class="muted small">CO₂ je Lebenszyklus-Phase · ${esc(LICENSES.etalab.name)}</span></li>
      <li><a href="${OFF}/nutriscore" target="_blank" rel="noopener"><strong>Nutri-Score</strong> ${icon.ext}</a><span class="muted small">berechnet von Open Food Facts</span></li>
      <li><a href="${OFF}/nova" target="_blank" rel="noopener"><strong>NOVA-Klassifikation</strong> ${icon.ext}</a><span class="muted small">berechnet von Open Food Facts</span></li></ul>`)}
    ${box('Anreicherung', null, `<ul class="rows rows-stack">
      <li><a href="https://www.wikidata.org/" target="_blank" rel="noopener"><strong>Wikidata</strong> ${icon.ext}</a><span class="muted small">Marke &amp; Hersteller · CC0</span></li>
      <li><a href="https://www.gs1.org/standards/id-keys/company-prefix" target="_blank" rel="noopener"><strong>GS1-Präfixliste</strong> ${icon.ext}</a><span class="muted small">Registrierungsland des Barcodes</span></li>
      <li><a href="${OFF}/data" target="_blank" rel="noopener"><strong>Taxonomien von Open Food Facts</strong> ${icon.ext}</a><span class="muted small">deutsche Begriffe für Zutaten, Zusatzstoffe, Siegel, Verpackungen</span></li></ul>`)}
    ${box('Barcode-Erkennung', null, `<ul class="rows rows-stack">
      <li><a href="https://developer.mozilla.org/de/docs/Web/API/Barcode_Detection_API" target="_blank" rel="noopener"><strong>BarcodeDetector-API</strong> ${icon.ext}</a><span class="muted small">eingebaut in Chrome/Edge/Samsung Internet (Android)</span></li>
      <li><a href="https://github.com/Sec-ant/barcode-detector" target="_blank" rel="noopener"><strong>barcode-detector + ZXing-C++</strong> ${icon.ext}</a><span class="muted small">für Safari/iOS, Firefox u. a. · MIT / Apache 2.0</span></li></ul>`)}
    ${box('Datenschutz', null, `<p>Kamerabilder werden nur auf deinem Gerät ausgewertet und nie übertragen. Merkliste und Verlauf liegen nur im Speicher deines Browsers. Suchanfragen gehen direkt an die genannten Datenbanken. Es gibt kein Tracking.</p>`)}
  </div>`;
}

// ---------------------------------------------------------------------------
updateNet();
route();
