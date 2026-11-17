// Anreicherung: deutsche Begriffe aus den Open-Food-Facts-Taxonomien, Herstellerdaten aus Wikidata.
import { fetchJson } from './api.js';
import { AppError } from './errors.js';

const memo = new Map();

/** Übersetzt Taxonomie-Tags (z. B. "en:e330") ins Deutsche. Wirft AppError bei Fehlschlag. */
export async function taxonomyNames(base, tagtype, tags) {
  const uniq = [...new Set(tags.filter(Boolean))];
  if (!uniq.length) return {};
  const key = `${base}|${tagtype}|${uniq.join(',')}`;
  if (memo.has(key)) return memo.get(key);
  const params = new URLSearchParams({ tagtype, tags: uniq.join(','), fields: 'name,additives_classes', lc: 'de' });
  const url = `${base}/api/v2/taxonomy?${params}`;
  const { json } = await fetchJson(url, { sourceName: 'Open Food Facts (Taxonomie)', timeout: 10000 });
  const out = {};
  for (const t of uniq) {
    const e = json && json[t];
    if (!e) continue;
    const n = e.name;
    const name = typeof n === 'string' ? n : n && (n.de || n.en || Object.values(n)[0]);
    out[t] = { name, classes: e.additives_classes && e.additives_classes.en ? e.additives_classes.en : null, url };
  }
  out.__url = url;
  memo.set(key, out);
  return out;
}

const WD = 'https://www.wikidata.org/w/api.php';
const COMPANY_PROPS = ['P17', 'P159', 'P749', 'P127', 'P856', 'P452', 'P571'];

/** Sucht die Marke in Wikidata und liefert Firmendaten – oder null, wenn kein passender Eintrag existiert. */
export async function wikidataBrand(brand) {
  const name = String(brand || '').split(',')[0].trim();
  if (!name) return null;
  const key = 'wd|' + name.toLowerCase();
  if (memo.has(key)) return memo.get(key);
  const s = new URLSearchParams({ action: 'wbsearchentities', search: name, language: 'de', uselang: 'de', type: 'item', limit: '5', format: 'json', origin: '*' });
  const { json: sj } = await fetchJson(`${WD}?${s}`, { sourceName: 'Wikidata', timeout: 8000 });
  const ids = (sj && sj.search || []).map((x) => x.id);
  if (!ids.length) { memo.set(key, null); return null; }
  const g = new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|labels|descriptions', languages: 'de|en', format: 'json', origin: '*' });
  const { json: gj } = await fetchJson(`${WD}?${g}`, { sourceName: 'Wikidata', timeout: 8000 });
  const ents = gj && gj.entities ? ids.map((id) => gj.entities[id]).filter(Boolean) : [];
  // Ersten Treffer mit Unternehmensmerkmalen nehmen, Label muss zum Markennamen passen
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  const ent = ents.find((e) => {
    const lab = (e.labels.de || e.labels.en || {}).value;
    return norm(lab).startsWith(norm(name)) && COMPANY_PROPS.some((p) => e.claims && e.claims[p]);
  });
  if (!ent) { memo.set(key, null); return null; }
  const itemIds = (p) => (ent.claims[p] || []).map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
  const strVal = (p) => { const c = (ent.claims[p] || [])[0]; return c && c.mainsnak.datavalue ? c.mainsnak.datavalue.value : null; };
  const refs = { country: itemIds('P17'), hq: itemIds('P159'), parent: itemIds('P749').concat(itemIds('P127')).slice(0, 2), industry: itemIds('P452').slice(0, 2) };
  const all = [...new Set(Object.values(refs).flat())];
  let labels = {};
  if (all.length) {
    const l = new URLSearchParams({ action: 'wbgetentities', ids: all.join('|'), props: 'labels', languages: 'de|en', format: 'json', origin: '*' });
    const { json: lj } = await fetchJson(`${WD}?${l}`, { sourceName: 'Wikidata', timeout: 8000 });
    for (const id of all) {
      const e = lj && lj.entities && lj.entities[id];
      labels[id] = e ? ((e.labels.de || e.labels.en || {}).value || id) : id;
    }
  }
  const inception = strVal('P571');
  const result = {
    id: ent.id,
    label: (ent.labels.de || ent.labels.en).value,
    description: (ent.descriptions.de || ent.descriptions.en || {}).value || null,
    country: refs.country.map((i) => labels[i]),
    hq: refs.hq.map((i) => labels[i]),
    parent: refs.parent.map((i) => labels[i]),
    industry: refs.industry.map((i) => labels[i]),
    website: strVal('P856'),
    founded: inception && inception.time ? inception.time.slice(1, 5) : null,
    url: `https://www.wikidata.org/wiki/${ent.id}`
  };
  memo.set(key, result);
  return result;
}

export function enrichError(sourceName, effect, err) {
  return new AppError('ENRICH_FAILED', {
    sourceName, effect,
    status: err && err.info && err.info.status, url: err && err.info && err.info.url,
    detail: err && (err.code || err.message)
  });
}
