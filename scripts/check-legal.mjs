// Wird von Netlify vor jeder Veröffentlichung ausgeführt (netlify.toml → build.command).
// Familienmodus: Veröffentlichung nur, wenn der Passwortschutz aktiv ist (FAMILY_ACCESS gesetzt).
// Öffentlicher Modus: Veröffentlichung nur mit vollständigem Impressum.
import { existsSync, readFileSync } from 'node:fs';
import { LEGAL, legalComplete } from '../js/legal-config.js';

const stop = (msg) => { console.error(`\n✖ Veröffentlichung gestoppt: ${msg}\n`); process.exit(1); };

if (LEGAL.mode === 'family') {
  const gate = 'netlify/edge-functions/family-gate.js';
  if (!existsSync(gate) || !readFileSync(gate, 'utf8').includes('FAMILY_ACCESS')) stop(`Familienmodus ohne Passwortschutz (${gate} fehlt).`);
  if (process.env.NETLIFY && String(process.env.FAMILY_ACCESS || '').length < 10) {
    stop('Familienmodus: Die Umgebungsvariable FAMILY_ACCESS (Familienpasswort, mind. 10 Zeichen) ist in Netlify nicht gesetzt.');
  }
  console.log('✔ Private Familienseite: Passwortschutz aktiv – Veröffentlichung freigegeben.');
} else {
  if (!legalComplete()) {
    const missing = ['name', 'street', 'zip', 'city', 'email'].filter((k) => !String(LEGAL[k] || '').trim());
    stop(`Impressum unvollständig. Fehlende Felder in js/legal-config.js: ${missing.join(', ')}`);
  }
  console.log('✔ Impressum vollständig – Veröffentlichung freigegeben.');
}
