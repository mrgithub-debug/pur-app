// Quellenangaben: Für jede angezeigte Information wird eine Quelle hinterlegt.
import { SOURCES, productUrl } from './api.js';

export const LICENSES = {
  odbl: { name: 'Open Database License (ODbL) 1.0 – Datenbank; Database Contents License – Inhalte', url: 'https://opendatacommons.org/licenses/odbl/1-0/' },
  ccbysa: { name: 'CC BY-SA 3.0 – Fotos der Mitwirkenden', url: 'https://creativecommons.org/licenses/by-sa/3.0/deed.de' },
  ccbysa4: { name: 'CC BY-SA 4.0 – Texte der Wikipedia', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.de' },
  cc0: { name: 'CC0 1.0 – gemeinfrei', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.de' },
  etalab: { name: 'Licence Ouverte / Etalab 2.0', url: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/' },
  mit: { name: 'MIT-Lizenz', url: 'https://opensource.org/license/mit' },
  apache: { name: 'Apache-Lizenz 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' }
};

const date = (d) => (d ? new Date(d).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : null);

/**
 * Baut alle Quellenangaben für eine Produktansicht.
 * Jede Angabe: { title, provider, about, url, urlLabel, license, updated, retrieved, note, more[] }
 */
export function productCitations(result) {
  const { sourceId, product: p, apiUrl, fetchedAt } = result;
  const src = SOURCES[sourceId];
  const page = productUrl(sourceId, p.code);
  const updated = p.last_modified_t ? date(p.last_modified_t * 1000) : null;
  const retrieved = date(fetchedAt);
  const base = { provider: src.name, url: page, urlLabel: `Produktseite bei ${src.name}`, license: LICENSES.odbl, updated, retrieved, api: apiUrl };
  const offBase = SOURCES.off.base;
  return {
    product: { ...base, title: 'Produktname, Marke, Menge & Kategorien', about: `Von Freiwilligen erfasst und von ${src.name} bereitgestellt.` },
    image: { ...base, title: 'Produktfoto', about: 'Foto von Mitwirkenden der Datenbank hochgeladen.', license: LICENSES.ccbysa },
    ingredients: { ...base, title: 'Zutaten bzw. Inhaltsstoffe', about: 'Von der Verpackung abgeschrieben (teils per Texterkennung von den Fotos) und automatisch in einzelne Zutaten zerlegt. Prozentangaben ohne Angabe auf der Packung sind Schätzungen der Datenbank.', note: 'Maßgeblich ist immer die Angabe auf der Verpackung.' },
    analysis: { ...base, title: 'Vegan, vegetarisch, Palmöl', about: `Automatische Auswertung der Zutatenliste durch ${src.name}.`, note: 'Kann bei unvollständigen Zutatenlisten ungenau sein („unbekannt“).', more: [{ label: 'Erklärung der Zutatenanalyse', url: `${offBase}/ingredients-analysis` }] },
    allergens: { ...base, title: 'Allergene & Spuren', about: 'Aus der Zutatenliste erkannt bzw. von Mitwirkenden eingetragen.', note: 'Bei Allergien bitte immer die Verpackung prüfen.' },
    additives: { ...base, title: 'Zusatzstoffe', about: 'E-Nummern aus der Zutatenliste erkannt. Deutsche Bezeichnungen und Funktionsklassen stammen aus der Zusatzstoff-Taxonomie von Open Food Facts.', more: [{ label: 'Zusatzstoffe bei Open Food Facts', url: `${offBase}/facets/additives` }] },
    nutrition: { ...base, title: 'Nährwerte', about: 'Von der Nährwerttabelle der Verpackung übernommen, je 100 g bzw. 100 ml.' },
    nutriscore: { ...base, title: 'Nutri-Score', about: 'Von Open Food Facts aus Nährwerten und Kategorie berechnet (Nährwertqualität A–E). Kann vom Aufdruck auf der Packung abweichen, wenn Daten fehlen oder die Berechnungsversion abweicht.', more: [{ label: 'So wird der Nutri-Score berechnet', url: `${offBase}/nutriscore` }] },
    nova: { ...base, title: 'NOVA-Gruppe (Verarbeitungsgrad)', about: 'Von Open Food Facts aus der Zutatenliste abgeleitet: 1 = unverarbeitet bis 4 = hochverarbeitet.', more: [{ label: 'Erklärung der NOVA-Klassifikation', url: `${offBase}/nova` }] },
    greenscore: { ...base, title: 'Green-Score (früher Eco-Score)', about: 'Umweltbewertung A+ bis F. Grundlage ist die Ökobilanz der Produktkategorie aus der französischen Datenbank Agribalyse (ADEME), korrigiert um Boni/Mali für Herkunft, Verpackung, Siegel und bedrohte Arten.', more: [{ label: 'Methodik des Green-Score', url: `${offBase}/green-score-methodology` }, { label: 'Agribalyse (ADEME)', url: 'https://agribalyse.ademe.fr/' }] },
    lca: { ...base, title: 'CO₂-Fußabdruck nach Lebenszyklus-Phasen', about: 'Werte der Agribalyse-Datenbank (ADEME) für die zugeordnete Lebensmittelkategorie – nicht für dieses einzelne Produkt gemessen. Einheit: kg CO₂-Äquivalent je kg Produkt.', license: LICENSES.etalab, more: [{ label: 'Agribalyse – Datenbank & Methode', url: 'https://agribalyse.ademe.fr/' }, { label: 'Methodik des Green-Score', url: `${offBase}/green-score-methodology` }] },
    packaging: { ...base, title: 'Verpackung & Entsorgung', about: 'Verpackungsbestandteile, Materialien und Entsorgungshinweise, von Mitwirkenden eingetragen bzw. aus den Fotos erfasst.', note: 'Regionale Entsorgungsregeln können abweichen.' },
    labels: { ...base, title: 'Siegel & Labels', about: 'Von der Verpackung erfasste Siegel. Deutsche Namen aus der Label-Taxonomie von Open Food Facts.' },
    origins: { ...base, title: 'Herkunft der Zutaten', about: 'Angaben zur Herkunft, soweit auf der Verpackung genannt oder eingetragen.' },
    manufacturing: { ...base, title: 'Herstellungsort & Verpackerkennung', about: 'Herstellungs-/Verarbeitungsorte und EU-Identitätskennzeichen (Verpackercode), eingetragen von Mitwirkenden.' },
    sold: { ...base, title: 'Verkaufsländer & Geschäfte', about: 'Länder und Geschäfte, in denen Mitwirkende das Produkt gesehen haben – nicht vollständig.' },
    gs1: { title: 'Registrierungsland des Barcodes (GS1-Präfix)', provider: 'GS1 (Präfixliste, in der App hinterlegt)', url: 'https://www.gs1.org/standards/id-keys/company-prefix', urlLabel: 'GS1 Company Prefix', about: 'Die ersten Ziffern eines Barcodes zeigen, bei welcher nationalen GS1-Organisation der Hersteller den Code registriert hat.', note: 'Das ist NICHT das Herkunfts- oder Herstellungsland des Produkts.' }
  };
}

export function wikidataCitation(wd) {
  return {
    title: 'Herstellerinformationen', provider: 'Wikidata', url: wd.url, urlLabel: `Eintrag ${wd.id} bei Wikidata`, license: LICENSES.cc0,
    about: 'Automatisch über den Markennamen gefundener Wikidata-Eintrag (Land, Sitz, Mutterkonzern, Website).',
    note: 'Automatische Zuordnung über den Namen – bei Marken mit gleichem Namen kann sie danebenliegen.',
    retrieved: date(new Date())
  };
}

export function searchCitation(res) {
  return {
    title: 'Suchergebnisse', provider: res.sources.map((s) => SOURCES[s.id].name).join(', '),
    url: res.sources[0] ? SOURCES[res.sources[0].id].base : null, urlLabel: 'Datenbank öffnen', license: LICENSES.odbl,
    about: `Volltextsuche in ${res.sources.map((s) => `${SOURCES[s.id].name} (${s.count} Treffer)`).join(', ')}.`,
    retrieved: date(res.fetchedAt)
  };
}

export const scannerCitation = (engine) => engine === 'native'
  ? { title: 'Barcode-Erkennung', provider: 'Eingebaute BarcodeDetector-API des Browsers', url: 'https://developer.mozilla.org/de/docs/Web/API/Barcode_Detection_API', urlLabel: 'Dokumentation (MDN)', about: 'Die Erkennung läuft im Browser auf deinem Gerät; es werden keine Bilder übertragen.' }
  : { title: 'Barcode-Erkennung', provider: 'ZXing-C++ (WebAssembly) über das Paket „barcode-detector“', url: 'https://github.com/Sec-ant/barcode-detector', urlLabel: 'Projekt auf GitHub', license: LICENSES.mit, about: 'Freie Erkennungs-Software, wird von cdn.jsdelivr.net geladen und läuft lokal auf deinem Gerät; es werden keine Bilder übertragen.', note: 'ZXing-C++ steht unter der Apache-Lizenz 2.0.' };

export const wikiCitation = () => ({
  title: 'Links zu Wikipedia', provider: 'Wikipedia (verknüpft über Wikidata)',
  url: 'https://de.wikipedia.org/', urlLabel: 'Wikipedia öffnen', license: LICENSES.ccbysa4,
  about: 'Die Taxonomie von Open Food Facts ordnet vielen Zutaten und Zusatzstoffen einen Wikidata-Eintrag zu. Darüber führt der „W“-Link direkt zum deutschen Wikipedia-Artikel – gibt es keinen, zum englischen. Ist keine Verknüpfung vorhanden, öffnet der Link die Wikipedia-Suche zum Begriff.',
  note: 'Die Zuordnung erfolgt automatisch. Bei allgemeinen Begriffen (z. B. „Öl“) kann der Artikel allgemeiner sein als die konkrete Zutat.',
  more: [{ label: 'Wikidata', url: 'https://www.wikidata.org/' }]
});
