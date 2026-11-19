// Rechtstexte: Impressum, Datenschutzerklärung, Nutzungshinweise & Haftung, Erststart-Hinweis.
// Hinweis für die Anbieterin: Diese Texte sind sorgfältig erstellt, ersetzen aber keine Rechtsberatung.
import { LEGAL, legalComplete, isFamily } from './legal-config.js';
import { esc } from './ui.js';

const L = LEGAL;
const addr = () => [L.company, L.name, L.street, `${L.zip} ${L.city}`.trim(), L.country].filter((x) => String(x || '').trim()).map(esc).join('<br>');
const mail = () => (isFamily() && !L.email ? 'direkt innerhalb der Familie' : L.email ? `<a href="mailto:${esc(L.email)}">${esc(L.email)}</a>` : '<em>[E-Mail-Adresse fehlt]</em>');
const incomplete = () => (isFamily() || legalComplete() ? '' : `<section class="err err-warning" role="alert"><div class="err-head"><h2>Impressum unvollständig</h2></div><p>Die Angaben der Anbieterin sind noch nicht eingetragen (Datei <code>js/legal-config.js</code>). Die App darf so nicht öffentlich betrieben werden.</p></section>`);
export const legalNav = () => `<nav class="legal-links" aria-label="Rechtliches"><a href="#/impressum">${isFamily() ? 'Über diese Seite' : 'Impressum'}</a><a href="#/datenschutz">Datenschutz</a><a href="#/nutzung">Nutzungshinweise</a></nav>`;

export const FAMILY_BADGE = () => (isFamily() ? '<p class="family-badge"><span aria-hidden="true">●</span> Private Familienseite – nicht öffentlich</p>' : '');

function familyHtml() {
  return `<section class="family-box">
    <h2>Private Familienseite</h2>
    <p>Pur. ist ein <strong>rein privates, nicht geschäftliches Projekt</strong>, das ausschließlich innerhalb der Familie genutzt wird.</p>
  </section>
  <ul>
    <li>Die Seite ist <strong>nicht öffentlich zugänglich</strong>: Jeder Aufruf ist durch ein Familienpasswort geschützt, das nur innerhalb der Familie weitergegeben wird.</li>
    <li>Sie wird nicht beworben, nicht verlinkt und ist für Suchmaschinen gesperrt.</li>
    <li>Es gibt keine Werbung, keine Einnahmen, keine Nutzerkonten und keine kommerziellen Interessen.</li>
  </ul>
  <p>Da es sich um eine ausschließlich persönliche bzw. familiäre Seite handelt, die nicht geschäftsmäßig und nicht öffentlich angeboten wird, wird kein Impressum nach § 5 DDG bzw. § 18 MStV geführt.</p>
  <p><strong>Bitte gib den Zugang nicht an Personen außerhalb der Familie weiter.</strong> Fragen, Hinweise und Fehlermeldungen bitte direkt an die Person in der Familie, die dir den Zugang gegeben hat.</p>
  <h2>Inhalte Dritter</h2>
  <p>Pur. zeigt automatisch Daten aus offenen Datenbanken an (siehe <a href="#/quellen">Quellen &amp; Lizenzen</a>). Diese Inhalte werden nicht selbst erstellt oder geprüft; es gelten die <a href="#/nutzung">Nutzungshinweise</a>.</p>`;
}

export function impressumHtml() {
  if (isFamily()) return familyHtml();
  return `${incomplete()}
  <h2>Angaben gemäß § 5 DDG</h2>
  <p>${addr() || '<em>[Name und Anschrift fehlen]</em>'}</p>
  <h2>Kontakt</h2>
  <p>E-Mail: ${mail()}${L.phone ? `<br>Telefon: ${esc(L.phone)}` : ''}</p>
  ${L.vatId ? `<h2>Umsatzsteuer-ID</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${esc(L.vatId)}</p>` : ''}
  <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
  <p>${esc(L.name) || '<em>[Name fehlt]</em>'}, Anschrift wie oben.</p>
  <h2>Verbraucherstreitbeilegung</h2>
  <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
  <h2>Inhalte Dritter</h2>
  <p>Pur. zeigt automatisch Daten aus offenen Datenbanken an (siehe <a href="#/quellen">Quellen &amp; Lizenzen</a>). Diese Inhalte stammen nicht von mir und werden von mir weder erstellt noch geprüft. Hinweise auf fehlerhafte oder rechtswidrige Inhalte nehme ich unter der oben genannten E-Mail-Adresse entgegen; bekannt gewordene Rechtsverletzungen werden umgehend geprüft.</p>`;
}

export function nutzungHtml() {
  return `<p class="muted small">Stand: ${esc(L.updated)}</p>
  <h2>1. Was Pur. ist – und was nicht</h2>
  ${isFamily() ? '<p><strong>Pur. ist eine private Familienseite</strong> – ein nicht geschäftliches Hobbyprojekt, das nur innerhalb der Familie genutzt wird und nicht öffentlich zugänglich ist.</p>' : ''}
  <p>Pur. ist ein kostenloses Informationsangebot. Die App zeigt Angaben zu Produkten an, die aus öffentlich zugänglichen, von Freiwilligen gepflegten Datenbanken stammen (insbesondere Open Food Facts, Open Beauty Facts, Open Pet Food Facts, Open Products Facts, Wikidata und Wikipedia). Pur. erstellt keine eigenen Bewertungen, prüft keine Produkte und nutzt keine künstliche Intelligenz.</p>
  <p><strong>Pur. ist keine medizinische, ernährungswissenschaftliche, allergologische, rechtliche oder sonstige fachliche Beratung</strong> und ersetzt diese nicht. Dies gilt insbesondere bei Allergien und Unverträglichkeiten, in Schwangerschaft und Stillzeit, für Säuglinge und Kinder, bei Erkrankungen oder der Einnahme von Medikamenten. Wende dich in diesen Fällen an Ärztinnen, Ärzte, Apotheken oder andere Fachleute.</p>
  <h2>2. Keine Gewähr für Daten Dritter</h2>
  <p>Die angezeigten Daten werden automatisch von Dritten übernommen. Sie können unvollständig, veraltet oder fehlerhaft sein, und Hersteller ändern Rezepturen und Verpackungen. Für Richtigkeit, Vollständigkeit und Aktualität wird keine Gewähr übernommen. <strong>Maßgeblich sind immer die Angaben auf der Verpackung des Produkts.</strong> Das Fehlen eines Hinweises (z. B. auf ein Allergen) bedeutet nicht, dass ein Stoff nicht enthalten ist.</p>
  <p>Bewertungen wie Green-Score, Nutri-Score und NOVA-Gruppe sowie CO₂-Werte werden von Dritten nach deren Methoden berechnet; CO₂-Werte beziehen sich auf Produktkategorien, nicht auf das einzelne Produkt. Sie sind keine Aussagen oder Empfehlungen der Anbieterin von Pur. Hinweise auf Wikipedia-Artikel werden automatisch zugeordnet und können unpassend sein.</p>
  <h2>3. Marken und Produktnamen</h2>
  <p>Produkt- und Markennamen sowie Produktfotos gehören den jeweiligen Rechteinhabern bzw. den Mitwirkenden der Datenbanken (Fotos unter CC BY-SA). Sie werden ausschließlich zur Information angezeigt. Es besteht keine Verbindung zu den Herstellern; die Anzeige ist keine Werbung und keine Kaufempfehlung.</p>
  <h2>4. Verfügbarkeit</h2>
  <p>Ein Anspruch auf Verfügbarkeit der App oder der angebundenen Datenquellen besteht nicht. Funktionen können jederzeit geändert oder eingestellt werden.</p>
  <h2>5. Haftung</h2>
  <p>Pur. wird unentgeltlich bereitgestellt. Die Anbieterin haftet nur für Vorsatz und grobe Fahrlässigkeit. Diese Beschränkung gilt nicht für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, für Ansprüche nach dem Produkthaftungsgesetz sowie bei arglistig verschwiegenen Mängeln; insoweit gilt die gesetzliche Haftung.</p>
  <h2>6. Links zu anderen Websites</h2>
  <p>Pur. verlinkt auf Websites Dritter (z. B. Datenbankeinträge, Wikipedia). Für deren Inhalte sind ausschließlich die jeweiligen Betreiber verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar; bei Bekanntwerden von Rechtsverletzungen werden die Links umgehend entfernt.</p>
  <h2>7. Fehler melden</h2>
  <p>Fehlerhafte Produktdaten kannst du direkt in der jeweiligen Datenbank korrigieren (Link „Angaben ergänzen“ auf jeder Produktseite). Hinweise zur App selbst: ${mail()}.</p>
  <h2>8. Anwendbares Recht</h2>
  <p>Es gilt das Recht der Bundesrepublik Deutschland. Zwingende Verbraucherschutzvorschriften des Staates, in dem du deinen gewöhnlichen Aufenthalt hast, bleiben unberührt.</p>`;
}

export function datenschutzHtml() {
  return `${incomplete()}<p class="muted small">Stand: ${esc(L.updated)}</p>
  <h2>1. Verantwortliche</h2>
  ${isFamily() ? '<p>Pur. ist eine private Familienseite. Verantwortlich ist das Familienmitglied, das diese Seite betreibt und dir den Zugang gegeben hat. Für Fragen zum Datenschutz wende dich bitte direkt an diese Person.</p>' : `<p>${addr() || '<em>[Name und Anschrift fehlen]</em>'}<br>E-Mail: ${mail()}</p>`}
  <h2>2. Das Wichtigste in Kürze</h2>
  <ul>
    ${isFamily() ? '<li>Private Familienseite: Zugang nur mit Familienpasswort. Das Passwort wird bei jedem Aufruf vom Server geprüft und nicht protokolliert.</li>' : ''}
    <li>Kein Konto, keine Cookies, kein Tracking, keine Analyse- oder Werbedienste.</li>
    <li>Kamerabilder werden ausschließlich auf deinem Gerät ausgewertet und nie übertragen.</li>
    <li>Merkliste und Verlauf liegen nur im Speicher deines Browsers.</li>
    <li>Für Suche und Produktdaten ruft dein Browser die genannten offenen Datenbanken direkt ab. Dabei erhalten deren Betreiber technisch bedingt deine IP-Adresse.</li>
  </ul>
  <h2>3. Hosting (Netlify)</h2>
  <p>Die App wird bei Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, USA, gehostet. Beim Aufruf verarbeitet Netlify technisch notwendige Daten (IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser-Kennung) in Server-Protokollen, um die App auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist mein berechtigtes Interesse an einer sicheren und funktionsfähigen Bereitstellung (Art. 6 Abs. 1 lit. f DSGVO). Netlify verarbeitet die Daten als Auftragsverarbeiter auf Grundlage eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO). Netlify ist unter dem EU-US Data Privacy Framework zertifiziert; die Übermittlung in die USA stützt sich auf den Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO) sowie ergänzend auf Standardvertragsklauseln. Weitere Informationen: <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener">Datenschutzerklärung von Netlify</a>.</p>
  <h2>4. Abruf von Produktdaten</h2>
  <p>Wenn du suchst, einen Barcode scannst oder ein Produkt öffnest, ruft dein Browser die Daten direkt bei den Datenbanken des gemeinnützigen Vereins Open Food Facts (21 rue des Iles, 94100 Saint-Maur-des-Fossés, Frankreich) ab: openfoodfacts.org, openbeautyfacts.org, openpetfoodfacts.org und openproductsfacts.org, einschließlich der zugehörigen Bildserver. Dabei werden deine IP-Adresse, die Browser-Kennung und der Suchbegriff bzw. die Barcode-Nummer übermittelt. Ohne diesen Abruf kann die App keine Produktinformationen anzeigen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung der von dir angefragten Informationen). Open Food Facts verarbeitet diese Daten in eigener Verantwortung: <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener">Datenschutzerklärung von Open Food Facts</a>.</p>
  <h2>5. Wikidata und Wikipedia</h2>
  <p>Auf Produktseiten fragt dein Browser bei Wikidata (Wikimedia Foundation, Inc., 1 Montgomery Street, Suite 1600, San Francisco, CA 94104, USA) Informationen zur Marke sowie Verknüpfungen von Zutaten zu Wikipedia-Artikeln ab. Übermittelt werden deine IP-Adresse, die Browser-Kennung, der Markenname und Kennungen der Zutaten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die Wikimedia Foundation verarbeitet diese Daten in eigener Verantwortung, auch in den USA: <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" target="_blank" rel="noopener">Datenschutzrichtlinie der Wikimedia Foundation</a>. Wenn du einen „W“-Link antippst, öffnest du Wikipedia; dort gilt dieselbe Datenschutzrichtlinie.</p>
  <h2>6. Barcode-Erkennung (jsDelivr) – nur mit deiner Einwilligung</h2>
  <p>Browser ohne eingebaute Barcode-Erkennung (z. B. Safari auf iPhone und iPad oder Firefox) benötigen die freie Software ZXing. Sie wird erst geladen, nachdem du in der App ausdrücklich zugestimmt hast, und zwar vom Dienst jsDelivr (Betreiber: Prospect One). Dabei werden deine IP-Adresse, die Browser-Kennung, die angefragte Datei und die Herkunftsseite übermittelt. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen: <button type="button" class="linklike" data-action="revokeZxing">Einwilligung widerrufen</button>. Weitere Informationen: <a href="https://www.jsdelivr.com/privacy-policy-jsdelivr-net" target="_blank" rel="noopener">Datenschutzerklärung von jsDelivr</a>. Die Kamerabilder selbst werden auch in diesem Fall nur auf deinem Gerät ausgewertet.</p>
  <h2>7. Kamera</h2>
  <p>Den Kamerazugriff erteilst du über deinen Browser. Das Kamerabild wird ausschließlich lokal zur Erkennung des Barcodes verarbeitet, nicht gespeichert und nicht übertragen. Ausgewählte Fotos werden ebenfalls nur lokal ausgewertet.</p>
  <h2>8. Speicherung auf deinem Gerät</h2>
  <p>Pur. speichert im lokalen Speicher deines Browsers (localStorage): deine Merkliste, den Verlauf zuletzt geprüfter Produkte, dass du den Startbildschirm-Hinweis gelesen hast, sowie gegebenenfalls deine Einwilligung zum Laden der Barcode-Erkennung. Diese Daten verlassen dein Gerät nicht und sind für die von dir gewünschten Funktionen unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst sie jederzeit löschen: <button type="button" class="linklike" data-action="clearLocal">Alle lokal gespeicherten Daten löschen</button> – oder über die Einstellungen deines Browsers.</p>
  <h2>9. Kontakt per E-Mail</h2>
  <p>Wenn du mir eine E-Mail schreibst, verarbeite ich deine Angaben zur Bearbeitung deiner Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO) und lösche sie, sobald sie dafür nicht mehr benötigt werden und keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
  <h2>10. Deine Rechte</h2>
  <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Erteilte Einwilligungen kannst du jederzeit widerrufen (Art. 7 Abs. 3). Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), insbesondere in dem Bundesland bzw. Mitgliedstaat deines Aufenthalts.</p>
  <p>Da Pur. selbst keine personenbezogenen Daten auf eigenen Servern speichert, liegen mir in der Regel keine Daten über dich vor. Für Daten, die die genannten Dienste in eigener Verantwortung verarbeiten, wende dich bitte direkt an diese.</p>
  <h2>11. Keine automatisierte Entscheidungsfindung</h2>
  <p>Es findet keine automatisierte Entscheidungsfindung und kein Profiling statt.</p>`;
}

export const NOTICE_KEY = 'pp.notice.v1';
export function noticeHtml() {
  return `<p class="sheet-kicker">Willkommen bei Pur.</p><h2 class="sheet-title">Bevor du loslegst</h2>
  <ul class="notice-list">
    ${isFamily() ? '<li><strong>Private Familienseite</strong> – nur für Familienmitglieder. Bitte gib den Zugang nicht weiter.</li>' : ''}
    <li>Pur. zeigt Daten aus <strong>offenen, von Freiwilligen gepflegten Datenbanken</strong> – ohne Gewähr auf Richtigkeit und Vollständigkeit.</li>
    <li><strong>Maßgeblich ist immer die Verpackung.</strong> Besonders bei Allergien und Unverträglichkeiten.</li>
    <li>Pur. ist <strong>keine medizinische oder Ernährungsberatung</strong>. Bewertungen stammen von Dritten.</li>
    <li>Kein Konto, kein Tracking. Für Produktdaten ruft dein Browser die Datenbanken direkt ab.</li>
  </ul>
  <p class="muted small">Mehr dazu: <a href="#/nutzung" data-close>Nutzungshinweise</a> · <a href="#/datenschutz" data-close>Datenschutz</a> · <a href="#/impressum" data-close>${isFamily() ? 'Über diese Seite' : 'Impressum'}</a></p>
  <button type="button" class="btn btn-primary" data-close data-ack>Verstanden</button>`;
}
