import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checksumOk, upcEtoA, gs1Region, cleanCode } from '../js/barcode.js';
import { AppError, CATALOG, describe } from '../js/errors.js';
import { detectBrowser, permissionHelp } from '../js/browser.js';
import { normalizeDetected } from '../js/scanner.js';
import { getProduct, searchProducts } from '../js/api.js';

test('Prüfziffern', () => {
  assert.equal(checksumOk('3017620422003'), true);   // EAN-13
  assert.equal(checksumOk('3017620422004'), false);
  assert.equal(checksumOk('96385074'), true);         // EAN-8
  assert.equal(checksumOk('036000291452'), true);     // UPC-A
  assert.equal(checksumOk('12345'), false);
  assert.equal(cleanCode(' 4006 381-333931 '), '4006381333931');
});

test('UPC-E → UPC-A', () => {
  assert.equal(upcEtoA('04252614'), '042100005264');
  assert.equal(checksumOk(upcEtoA('04252614')), true);
});

test('GS1-Präfix', () => {
  assert.equal(gs1Region('4006381333931').region, 'Deutschland');
  assert.equal(gs1Region('3017620422003').region, 'Frankreich & Monaco');
  assert.equal(gs1Region('036000291452').region, 'USA & Kanada (GS1 US)');
  assert.equal(gs1Region('96385074'), null);
});

test('Jeder Fehler hat Titel, Ursache und Lösung', () => {
  const ctx = { sourceName: 'X', status: 503, code: '1', scope: 'a', checked: 'a', failed: 'b', query: 'q', length: 3, permissionHelp: 'Hilfe', browserName: 'B', effect: 'e' };
  for (const code of Object.keys(CATALOG)) {
    const d = describe(new AppError(code, ctx));
    assert.ok(d.title && d.what && d.fix, `${code} unvollständig`);
    assert.ok(['error', 'warning', 'info'].includes(d.severity), code);
  }
  const u = describe(new Error('kaputt'));
  assert.equal(u.code, 'APP_UNEXPECTED');
  assert.match(u.what, /kaputt/);
});

test('Browsererkennung & Berechtigungs-Hilfe', () => {
  const ios = detectBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  assert.equal(ios.id, 'ios-safari');
  const ipad = detectBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', { maxTouchPoints: 5 });
  assert.equal(ipad.id, 'ios-safari');
  const crios = detectBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1');
  assert.equal(crios.id, 'ios-chrome');
  const and = detectBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  assert.equal(and.id, 'android-chrome');
  const sam = detectBrowser('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36');
  assert.equal(sam.id, 'android-samsung');
  const ff = detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0');
  assert.equal(ff.id, 'desktop-firefox');
  for (const b of [ios, crios, and, sam, ff]) assert.ok(permissionHelp(b).length > 20);
});

test('Scan-Ergebnisse normalisieren', () => {
  assert.deepEqual(normalizeDetected({ format: 'ean_13', rawValue: '3017620422003' }), { kind: 'code', code: '3017620422003' });
  assert.equal(normalizeDetected({ format: 'ean_13', rawValue: '3017620422009' }).kind, 'invalid');
  assert.equal(normalizeDetected({ format: 'qr_code', rawValue: 'https://x' }).kind, 'qr');
  assert.equal(normalizeDetected({ format: 'upc_e', rawValue: '04252614' }).code, '042100005264');
});

// --- API mit simuliertem fetch -------------------------------------------
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function mockFetch(handler) { globalThis.fetch = async (url) => handler(String(url)); }

test('Produkt: Treffer in Open Beauty Facts', async () => {
  mockFetch((u) => u.includes('openbeautyfacts') ? json(200, { status: 1, product: { code: '1', product_name: 'Creme' } }) : json(404, { status: 0 }));
  const r = await getProduct('1');
  assert.equal(r.sourceId, 'obf');
});

test('Produkt: nicht gefunden', async () => {
  mockFetch(() => json(404, { status: 0 }));
  await assert.rejects(getProduct('1'), (e) => e.code === 'PRODUCT_NOT_FOUND');
});

test('Produkt: nicht gefunden, eine Quelle gestört', async () => {
  mockFetch((u) => u.includes('openpetfoodfacts') ? json(503, {}) : json(404, { status: 0 }));
  await assert.rejects(getProduct('1'), (e) => e.code === 'PRODUCT_NOT_FOUND_PARTIAL' && /Pet Food/.test(e.info.failed));
});

test('Produkt: alle Quellen überlastet / blockiert / Rate-Limit', async () => {
  mockFetch(() => json(503, {}));
  await assert.rejects(getProduct('1'), (e) => e.code === 'SOURCE_UNAVAILABLE');
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(getProduct('1'), (e) => e.code === 'SOURCE_UNREACHABLE');
  mockFetch(() => json(429, {}));
  await assert.rejects(getProduct('1'), (e) => e.code === 'SOURCE_RATE_LIMIT');
  mockFetch(() => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML'); } }));
  await assert.rejects(getProduct('1'), (e) => e.code === 'SOURCE_BAD_RESPONSE');
});

test('Suche: Teilausfall wird gemeldet, Ergebnisse gemischt', async () => {
  mockFetch((u) => {
    if (u.includes('openfoodfacts')) return json(200, { count: 2, products: [{ code: 'a', product_name: 'A' }, { code: 'b', product_name: 'B' }] });
    if (u.includes('openbeautyfacts')) return json(200, { count: 1, products: [{ code: 'c', product_name: 'C' }] });
    return json(502, {});
  });
  const r = await searchProducts('test');
  assert.deepEqual(r.products.map((p) => p.code), ['a', 'c', 'b']);
  assert.equal(r.partial.code, 'SEARCH_PARTIAL');
});

test('Zeitüberschreitung', async () => {
  globalThis.fetch = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))));
  const { fetchJson } = await import('../js/api.js');
  await assert.rejects(fetchJson('https://world.openfoodfacts.org/x', { timeout: 30 }), (e) => e.code === 'SOURCE_TIMEOUT');
});

test('Wikipedia: Taxonomie → Wikidata → Artikel (de bevorzugt, en als Rückfall)', async () => {
  const { taxonomyNames, wikipediaLinks, wikipediaSearchUrl } = await import('../js/enrich.js');
  mockFetch((u) => {
    if (u.includes('/api/v2/taxonomy')) return json(200, { 'en:oat': { name: { de: 'Hafer' }, wikidata: { en: 'Q165137' } }, 'en:e340': { name: { de: 'E340' }, wikidata: { en: 'Q2' } } });
    if (u.includes('wbgetentities')) return json(200, { entities: { Q165137: { sitelinks: { dewiki: { title: 'Saat-Hafer' }, enwiki: { title: 'Oat' } } }, Q2: { sitelinks: { enwiki: { title: 'Potassium phosphate' } } } } });
    return json(404, {});
  });
  const tax = await taxonomyNames('https://world.openfoodfacts.org', 'ingredients', ['en:oat', 'en:e340']);
  assert.equal(tax['en:oat'].qid, 'Q165137');
  const links = await wikipediaLinks([tax['en:oat'].qid, tax['en:e340'].qid, 'kaputt']);
  assert.equal(links.Q165137.url, 'https://de.wikipedia.org/wiki/Saat-Hafer');
  assert.equal(links.Q2.lang, 'en');
  assert.match(wikipediaSearchUrl('Hafer (10 %)'), /search=Hafer&/);
});

test('Familien-Zugang: Passwortprüfung serverseitig, gesperrt ohne Passwort', async () => {
  const gate = await import('../netlify/edge-functions/family-gate.js');
  const req = (auth) => new Request('https://x/', { headers: auth ? { authorization: auth } : {} });
  const ctx = { next: async () => new Response('app', { status: 200 }) };
  globalThis.Netlify = { env: { get: () => '' } };
  assert.equal((await gate.default(req(), ctx)).status, 503);           // nicht eingerichtet → gesperrt
  globalThis.Netlify = { env: { get: () => 'geheim-familie-123' } };
  assert.equal((await gate.default(req(), ctx)).status, 401);           // ohne Passwort
  assert.equal((await gate.default(req('Basic ' + btoa('familie:falsch')), ctx)).status, 401);
  const ok = await gate.default(req('Basic ' + btoa('familie:geheim-familie-123')), ctx);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('x-robots-tag'), /noindex/);
  assert.equal(gate.passwordFrom('Basic ' + btoa('a:b:c')), 'b:c');
});
