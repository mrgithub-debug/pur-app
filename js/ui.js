// Kleine UI-Bausteine (ohne Framework).
import { describe } from './errors.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeUrl = (u) => (/^https:\/\//i.test(String(u || '')) ? esc(u) : '');

const sv = (d, extra = '') => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const icon = {
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  barcode: sv('<path d="M4 6v12M7.5 6v12M11 6v12M13.5 6v12M17 6v12M20 6v12"/>'),
  camera: sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  heart: sv('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
  heartFill: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  pins: sv('<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/>'),
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  source: sv('<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8 13h8M8 17h5"/>', 'width="16" height="16"'),
  close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  alert: sv('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  check: sv('<path d="M5 12l4 4 10-10"/>'),
  flash: sv('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
  image: sv('<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20 16l-5-5-7 8"/>'),
  keyboard: sv('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
  leaf: sv('<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>'),
  ext: sv('<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', 'width="14" height="14"')
};

/** Quellen-Button, öffnet das Quellen-Blatt. */
export const citeBtn = (id, label = 'Quelle') => `<button class="cite" type="button" data-cite="${esc(id)}" aria-label="${esc(label)} anzeigen">${icon.source}<span>${esc(label)}</span></button>`;

/** Fehlerkarte mit Ursache, Lösung und technischen Details. */
export function errorCard(err, { actions = [], ctx = {}, compact = false } = {}) {
  const d = describe(err, ctx);
  const sevIcon = d.severity === 'info' ? icon.info : icon.alert;
  const btns = [];
  if (d.retry) btns.push(`<button class="btn btn-primary" type="button" data-action="retry">Erneut versuchen</button>`);
  for (const a of actions) {
    btns.push(a.href
      ? `<a class="btn btn-ghost" href="${esc(a.href)}" ${a.external ? 'target="_blank" rel="noopener"' : ''}>${esc(a.label)}</a>`
      : `<button class="btn btn-ghost" type="button" data-action="${esc(a.action)}">${esc(a.label)}</button>`);
  }
  const tech = Object.entries({ Fehlercode: d.tech.code, 'HTTP-Status': d.tech.status, Quelle: d.tech.source, Adresse: d.tech.url, Details: d.tech.detail, Zeitpunkt: d.tech.time })
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  return `<section class="err err-${d.severity}${compact ? ' err-compact' : ''}" role="${d.severity === 'error' ? 'alert' : 'status'}" data-error-code="${esc(d.code)}">
    <div class="err-head"><span class="err-icon">${sevIcon}</span><h2>${esc(d.title)}</h2></div>
    <p class="err-what"><strong>Was ist passiert?</strong> ${esc(d.what)}</p>
    <p class="err-fix ${d.noAction ? 'is-noaction' : ''}"><strong>${d.noAction ? 'Du musst nichts tun.' : 'So löst du es:'}</strong> ${esc(d.fix)}</p>
    ${btns.length ? `<div class="err-actions">${btns.join('')}</div>` : ''}
    <details class="err-tech"><summary>Technische Details</summary><dl>${tech}</dl></details>
  </section>`;
}

/** Bottom-Sheet für Quellen & Infos. */
export function openSheet(innerHtml, label = 'Information') {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <button class="sheet-close icon-btn" type="button" data-close aria-label="Schließen">${icon.close}</button>
      ${innerHtml}
    </div>`;
  const prev = document.activeElement;
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  wrap._prev = prev;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  wrap.querySelector('.sheet-close').focus();
}
export function closeSheet() {
  const w = document.querySelector('.sheet-wrap');
  if (!w) return;
  const prev = w._prev;
  w.remove();
  if (prev && prev.focus) prev.focus();
}

export function citationHtml(c) {
  if (!c) return '<p>Für diese Angabe ist keine Quelle hinterlegt.</p>';
  const rows = [
    ['Anbieter', esc(c.provider)],
    c.license ? ['Lizenz', `<a href="${safeUrl(c.license.url)}" target="_blank" rel="noopener">${esc(c.license.name)}</a>`] : null,
    c.updated ? ['Zuletzt geändert', esc(c.updated)] : null,
    c.retrieved ? ['Abgerufen', esc(c.retrieved)] : null
  ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const links = [];
  if (c.url) links.push(`<a class="src-link" href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.urlLabel || 'Zur Quelle')} ${icon.ext}</a>`);
  for (const m of c.more || []) links.push(`<a class="src-link" href="${safeUrl(m.url)}" target="_blank" rel="noopener">${esc(m.label)} ${icon.ext}</a>`);
  if (c.api) links.push(`<a class="src-link src-link-sm" href="${safeUrl(c.api)}" target="_blank" rel="noopener">Rohdaten (JSON) ${icon.ext}</a>`);
  return `<p class="sheet-kicker">Quelle</p><h2 class="sheet-title">${esc(c.title)}</h2>
    ${c.about ? `<p>${esc(c.about)}</p>` : ''}
    ${c.note ? `<p class="src-note">${esc(c.note)}</p>` : ''}
    <dl class="src-meta">${rows}</dl>
    <div class="src-links">${links.join('')}</div>`;
}

let toastTimer;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// --- Scores ---------------------------------------------------------------
export const GRADE_COLORS = {
  'a-plus': '#1E6B3C', a: '#2F7A4A', b: '#4E8A3A', c: '#9A6A12', d: '#B5462F', e: '#9B2C2C', f: '#7A1F1F'
};
export function gradeLabel(g) {
  if (!g) return null;
  if (g === 'a-plus') return 'A+';
  if (/^[a-f]$/.test(g)) return g.toUpperCase();
  return null;
}

export function pinCard(item) {
  const g = gradeLabel(item.green);
  const tint = ['#F3D9CF', '#E9E2F0', '#DCE8DA', '#F6E3C8', '#E4E9F2'][Math.abs(hash(item.code)) % 5];
  const h = 120 + (Math.abs(hash(item.code + 'h')) % 4) * 28;
  return `<a class="pin" href="#/produkt/${esc(item.code)}">
    <div class="pin-img" style="background:${tint};min-height:${h}px">
      ${item.image ? `<img src="${safeUrl(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="pin-ph">${icon.image}</span>`}
      ${g ? `<span class="badge" style="background:${GRADE_COLORS[item.green]}">Green ${g}</span>` : ''}
    </div>
    <div class="pin-body"><span class="pin-name">${esc(item.name)}</span><span class="pin-meta">${esc([item.brand, item.quantity].filter(Boolean).join(' · '))}</span></div>
  </a>`;
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
