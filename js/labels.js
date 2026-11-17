// Deutsche Bezeichnungen & Aufbereitung von Datenbank-Feldern.

/** "en:sunflower-oil" -> "Sunflower oil" (Rückfall, wenn keine Übersetzung vorliegt) */
export function prettyTag(tag) {
  const s = String(tag || '').replace(/^[a-z]{2,3}:/, '').replace(/-/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
export const tagName = (names, tag) => (names && names[tag] && names[tag].name) || prettyTag(tag);

export const ANALYSIS = {
  'en:vegan': { text: 'Vegan', tone: 'good' },
  'en:non-vegan': { text: 'Nicht vegan', tone: 'warn' },
  'en:maybe-vegan': { text: 'Evtl. vegan', tone: 'neutral' },
  'en:vegan-status-unknown': { text: 'Vegan: unbekannt', tone: 'neutral' },
  'en:vegetarian': { text: 'Vegetarisch', tone: 'good' },
  'en:non-vegetarian': { text: 'Nicht vegetarisch', tone: 'warn' },
  'en:maybe-vegetarian': { text: 'Evtl. vegetarisch', tone: 'neutral' },
  'en:vegetarian-status-unknown': { text: 'Vegetarisch: unbekannt', tone: 'neutral' },
  'en:palm-oil-free': { text: 'Ohne Palmöl', tone: 'good' },
  'en:palm-oil': { text: 'Enthält Palmöl', tone: 'warn' },
  'en:may-contain-palm-oil': { text: 'Evtl. Palmöl', tone: 'neutral' },
  'en:palm-oil-content-unknown': { text: 'Palmöl: unbekannt', tone: 'neutral' }
};

export const NOVA = {
  1: 'Unverarbeitet oder minimal verarbeitet',
  2: 'Verarbeitete Küchenzutaten',
  3: 'Verarbeitete Lebensmittel',
  4: 'Hochverarbeitete Lebensmittel'
};

export const NUTRIENTS = [
  ['energy-kcal', 'Energie', 'kcal'],
  ['fat', 'Fett', 'g'],
  ['saturated-fat', 'davon gesättigte Fettsäuren', 'g'],
  ['carbohydrates', 'Kohlenhydrate', 'g'],
  ['sugars', 'davon Zucker', 'g'],
  ['fiber', 'Ballaststoffe', 'g'],
  ['proteins', 'Eiweiß', 'g'],
  ['salt', 'Salz', 'g']
];

export const LCA_STAGES = [
  ['co2_agriculture', 'Landwirtschaft'],
  ['co2_processing', 'Verarbeitung'],
  ['co2_packaging', 'Verpackung'],
  ['co2_transportation', 'Transport'],
  ['co2_distribution', 'Handel & Vertrieb'],
  ['co2_consumption', 'Verbrauch']
];

export const GREEN_ADJ = {
  production_system: 'Siegel & Produktionsweise',
  origins_of_ingredients: 'Herkunft & Transport',
  threatened_species: 'Bedrohte Arten (z. B. Palmöl)',
  packaging: 'Verpackung'
};

export const MISSING = { labels: 'Siegel', origins: 'Herkunft der Zutaten', packagings: 'Verpackung', agb_category: 'Produktkategorie' };

export const num = (v, d = 1) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }));
