// Angaben der Anbieterin für Impressum und Datenschutzerklärung.
// Solange Pflichtfelder fehlen, zeigt die App einen Hinweis „Impressum unvollständig“
// und Netlify bricht die Veröffentlichung ab (scripts/check-legal.mjs).
export const LEGAL = {
  // 'family' = private Familienseite: nur mit Familienpasswort erreichbar, nicht öffentlich, kein Impressum.
  // 'public' = öffentliches Angebot: vollständiges Impressum erforderlich.
  mode: 'family',
  name: '',            // Vor- und Nachname (bzw. Firma)
  company: '',         // optional: Firmenname bei gewerblichem Angebot
  street: '',          // Straße und Hausnummer (kein Postfach)
  zip: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',           // optional
  vatId: '',           // optional: USt-IdNr. bei gewerblichem Angebot
  updated: '18. November 2026' // Stand der Rechtstexte
};

export const isFamily = () => LEGAL.mode === 'family';
export const legalComplete = () => ['name', 'street', 'zip', 'city', 'email'].every((k) => String(LEGAL[k] || '').trim());
