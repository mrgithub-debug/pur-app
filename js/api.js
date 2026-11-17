// Anbindung der offenen Produktdatenbanken (Open Food / Beauty / Pet Food / Products Facts).
import { AppError } from './errors.js';

export const SOURCES = {
  off:  { id: 'off',  name: 'Open Food Facts',     base: 'https://world.openfoodfacts.org',     kind: 'Lebensmittel', cat: 'food' },
  obf:  { id: 'obf',  name: 'Open Beauty Facts',   base: 'https://world.openbeautyfacts.org',   kind: 'Kosmetik',     cat: 'beauty' },
  opff: { id: 'opff', name: 'Open Pet Food Facts', base: 'https://world.openpetfoodfacts.org',  kind: 'Tierbedarf',   cat: 'petfood' },
  opf:  { id: 'opf',  name: 'Open Products Facts', base: 'https://world.openproductsfacts.org', kind: 'Haushalt & Sonstiges', cat: 'product' }
};
export const SOURCE_ORDER = ['off', 'obf', 'opff', 'opf'];
export const CATEGORY_SOURCES = {
  alle: SOURCE_ORDER, lebensmittel: ['off'], kosmetik: ['obf'], tierbedarf: ['opff'], haushalt: ['opf']
};

const SEARCH_FIELDS = [
  'code', 'product_name', 'product_name_de', 'brands', 'quantity', 'image_front_small_url',
  'image_front_url', 'environmental_score_grade', 'ecoscore_grade', 'nutriscore_grade', 'product_type'
].join(',');

/**
 * fetch mit Zeitlimit und präziser Fehlerzuordnung.
 * Gibt { status, json } zurück; wirft AppError mit passendem Code.
 */
export async function fetchJson(url, { source, sourceName, timeout = 15000, signal, allow404 = false } = {}) {
  const name = sourceName || (source && source.name) || new URL(url).host;
  const host = new URL(url).host;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AppError('NETWORK_OFFLINE', { url, sourceName: name });
  }
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeout);
  const onOuterAbort = () => ctrl.abort();
  if (signal) signal.addEventListener('abort', onOuterAbort, { once: true });
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } catch (cause) {
    if (signal && signal.aborted) throw cause; // von der App abgebrochen (z. B. neue Suche)
    if (timedOut) {
      const conn = typeof navigator !== 'undefined' && navigator.connection;
      const slowNetwork = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
      throw new AppError('SOURCE_TIMEOUT', { url, sourceName: name, seconds: Math.round(timeout / 1000), slowNetwork, cause });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AppError('NETWORK_OFFLINE', { url, sourceName: name, cause });
    }
    throw new AppError('SOURCE_UNREACHABLE', { url, sourceName: name, host, cause, detail: cause && cause.message });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
  }
  const status = res.status;
  if (status === 429) throw new AppError('SOURCE_RATE_LIMIT', { url, status, sourceName: name });
  if (status >= 500) throw new AppError('SOURCE_UNAVAILABLE', { url, status, sourceName: name });
  if (!res.ok && !(allow404 && status === 404)) {
    throw new AppError('SOURCE_BAD_RESPONSE', { url, status, sourceName: name });
  }
  let json;
  try { json = await res.json(); }
  catch (cause) {
    if (allow404 && status === 404) return { status, json: null, ms: Date.now() - started };
    throw new AppError('SOURCE_BAD_RESPONSE', { url, status, sourceName: name, cause, detail: 'Antwort ist kein JSON' });
  }
  return { status, json, ms: Date.now() - started };
}

export function productUrl(sourceId, code) {
  return `${SOURCES[sourceId].base}/product/${encodeURIComponent(code)}`;
}

/** Fragt einen Barcode parallel in allen vier Datenbanken ab. */
export async function getProduct(code, { signal } = {}) {
  const attempts = await Promise.allSettled(SOURCE_ORDER.map(async (id) => {
    const src = SOURCES[id];
    const url = `${src.base}/api/v2/product/${encodeURIComponent(code)}.json?lc=de`;
    const { json } = await fetchJson(url, { source: src, signal, allow404: true, timeout: 15000 });
    const found = json && json.status === 1 && json.product;
    return { id, url, product: found ? json.product : null };
  }));
  if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');

  for (const id of SOURCE_ORDER) {
    const a = attempts[SOURCE_ORDER.indexOf(id)];
    if (a.status === 'fulfilled' && a.value.product) {
      return { sourceId: id, apiUrl: a.value.url, product: a.value.product, fetchedAt: new Date() };
    }
  }
  const failed = attempts.map((a, i) => ({ a, id: SOURCE_ORDER[i] })).filter((x) => x.a.status === 'rejected');
  const checked = SOURCE_ORDER.filter((id, i) => attempts[i].status === 'fulfilled');
  if (failed.length === SOURCE_ORDER.length) {
    // Alle Quellen fehlgeschlagen: den aussagekräftigsten Fehler weitergeben
    const first = failed.map((f) => f.a.reason).find((r) => r instanceof AppError) || failed[0].a.reason;
    if (first instanceof AppError && first.code !== 'NETWORK_OFFLINE') {
      first.info.sourceName = 'Open Food Facts (alle Produktdatenbanken)';
      first.info.detail = failed.map((f) => `${SOURCES[f.id].name}: ${f.a.reason && f.a.reason.code}`).join('; ');
    }
    throw first;
  }
  if (failed.length) {
    throw new AppError('PRODUCT_NOT_FOUND_PARTIAL', {
      code,
      checked: checked.map((id) => SOURCES[id].name).join(', '),
      failed: failed.map((f) => SOURCES[f.id].name).join(', '),
      detail: failed.map((f) => `${SOURCES[f.id].name}: ${f.a.reason && f.a.reason.code}`).join('; ')
    });
  }
  throw new AppError('PRODUCT_NOT_FOUND', { code, scope: SOURCE_ORDER.map((id) => SOURCES[id].name).join(', ') });
}

/** Volltextsuche (Name/Marke) in den gewählten Datenbanken. */
export async function searchProducts(query, { category = 'alle', signal, pageSize = 24 } = {}) {
  const ids = CATEGORY_SOURCES[category] || SOURCE_ORDER;
  const attempts = await Promise.allSettled(ids.map(async (id) => {
    const src = SOURCES[id];
    const params = new URLSearchParams({
      search_terms: query, search_simple: '1', action: 'process', json: '1',
      page_size: String(pageSize), page: '1', lc: 'de', fields: SEARCH_FIELDS
    });
    const url = `${src.base}/cgi/search.pl?${params}`;
    const { json } = await fetchJson(url, { source: src, signal, timeout: 20000 });
    if (!json || !Array.isArray(json.products)) {
      throw new AppError('SOURCE_BAD_RESPONSE', { url, sourceName: src.name, detail: 'Feld "products" fehlt' });
    }
    return { id, url, count: json.count || json.products.length, products: json.products.map((p) => ({ ...p, _source: id })) };
  }));
  if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');

  const ok = attempts.filter((a) => a.status === 'fulfilled').map((a) => a.value);
  const failed = attempts.map((a, i) => ({ a, id: ids[i] })).filter((x) => x.a.status === 'rejected');
  if (!ok.length) {
    const first = failed.map((f) => f.a.reason).find((r) => r instanceof AppError) || failed[0].a.reason;
    if (first instanceof AppError && ids.length > 1 && first.code !== 'NETWORK_OFFLINE') {
      first.info.sourceName = 'Open Food Facts (alle Produktdatenbanken)';
      first.info.detail = failed.map((f) => `${SOURCES[f.id].name}: ${f.a.reason && f.a.reason.code}`).join('; ');
    }
    throw first;
  }
  // Ergebnisse abwechselnd mischen, damit jede Quelle sichtbar ist
  const lists = ok.map((r) => r.products.filter((p) => p.code && (p.product_name || p.product_name_de)));
  const merged = [];
  const seen = new Set();
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (l[i] && !seen.has(l[i].code)) { seen.add(l[i].code); merged.push(l[i]); }
  }
  return {
    products: merged,
    sources: ok.map((r) => ({ id: r.id, url: r.url, count: r.count })),
    partial: failed.length ? new AppError('SEARCH_PARTIAL', {
      failed: failed.map((f) => SOURCES[f.id].name).join(', '),
      detail: failed.map((f) => `${SOURCES[f.id].name}: ${f.a.reason && (f.a.reason.code || f.a.reason.message)}`).join('; ')
    }) : null,
    fetchedAt: new Date()
  };
}
