// Lokaler Speicher für Merkliste & Verlauf – mit Rückfall auf Arbeitsspeicher.
const mem = {};
let available = null;

export function storageAvailable() {
  if (available !== null) return available;
  try {
    const k = '__pp_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    available = true;
  } catch { available = false; }
  return available;
}

function read(key) {
  try {
    if (storageAvailable()) return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { /* defekte Daten ignorieren */ }
  return mem[key] || [];
}
function write(key, list) {
  mem[key] = list;
  if (!storageAvailable()) return;
  try { localStorage.setItem(key, JSON.stringify(list)); }
  catch { available = false; } // z. B. Speicher voll
}

const SAVED = 'pp.saved.v1';
const HISTORY = 'pp.history.v1';

export const summary = (p, sourceId) => ({
  code: p.code,
  name: p.product_name_de || p.product_name || 'Unbenanntes Produkt',
  brand: (p.brands || '').split(',')[0].trim(),
  quantity: p.quantity || '',
  image: p.image_front_small_url || p.image_front_url || '',
  green: p.environmental_score_grade || p.ecoscore_grade || '',
  source: sourceId || p._source || 'off',
  ts: Date.now()
});

export const getSaved = () => read(SAVED);
export const isSaved = (code) => getSaved().some((x) => x.code === code);
export function toggleSaved(item) {
  const list = getSaved();
  const i = list.findIndex((x) => x.code === item.code);
  if (i >= 0) list.splice(i, 1); else list.unshift(item);
  write(SAVED, list);
  return i < 0;
}
export const getHistory = () => read(HISTORY);
export function addHistory(item) {
  const list = getHistory().filter((x) => x.code !== item.code);
  list.unshift(item);
  write(HISTORY, list.slice(0, 30));
}
export function clearHistory() { write(HISTORY, []); }
