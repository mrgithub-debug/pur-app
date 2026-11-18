// Wird von Netlify vor jeder Veröffentlichung ausgeführt (netlify.toml → build.command).
// Bricht ab, wenn das Impressum unvollständig ist – so geht die App nie ohne Pflichtangaben online.
import { LEGAL, legalComplete } from '../js/legal-config.js';

if (!legalComplete()) {
  const missing = ['name', 'street', 'zip', 'city', 'email'].filter((k) => !String(LEGAL[k] || '').trim());
  console.error(`\n✖ Veröffentlichung gestoppt: Impressum unvollständig. Fehlende Felder in js/legal-config.js: ${missing.join(', ')}\n`);
  process.exit(1);
}
console.log('✔ Impressum vollständig – Veröffentlichung freigegeben.');
