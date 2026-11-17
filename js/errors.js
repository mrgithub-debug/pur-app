// Fehlerkatalog: Jeder Fehler sagt der Nutzerin, was passiert ist,
// was sie tun kann – oder dass sie nichts tun muss.

export class AppError extends Error {
  constructor(code, info = {}) {
    super(info.message || code);
    this.name = 'AppError';
    this.code = code;
    this.info = info; // { source, status, url, cause, detail, ...context }
    this.time = new Date();
  }
}

const later = 'Das Problem liegt nicht bei dir. Versuche es in ein paar Minuten noch einmal.';

// fix: Text oder Funktion(ctx) -> Text. noAction: true = Nutzerin muss nichts tun.
export const CATALOG = {
  // --- Netzwerk & Datenquellen -------------------------------------------
  NETWORK_OFFLINE: {
    severity: 'error', retry: true,
    title: 'Keine Internetverbindung',
    what: 'Dein Gerät ist gerade offline. Ohne Verbindung kann die App keine Produktdaten abrufen.',
    fix: 'Prüfe WLAN oder mobile Daten (Flugmodus aus?). Sobald du wieder online bist, tippe auf „Erneut versuchen“.'
  },
  SOURCE_TIMEOUT: {
    severity: 'error', retry: true,
    title: (c) => `${c.sourceName || 'Die Datenquelle'} antwortet zu langsam`,
    what: (c) => `Die Anfrage an ${c.sourceName || 'die Datenquelle'} wurde nach ${c.seconds || 15} Sekunden abgebrochen. Die Server der gemeinnützigen Datenbank sind zeitweise stark ausgelastet.`,
    fix: (c) => c.slowNetwork
      ? 'Deine Verbindung scheint langsam zu sein. Wechsle wenn möglich ins WLAN und versuche es erneut.'
      : later,
    noAction: (c) => !c.slowNetwork
  },
  SOURCE_UNAVAILABLE: {
    severity: 'error', retry: true,
    title: (c) => `${c.sourceName || 'Die Datenquelle'} ist gerade nicht erreichbar`,
    what: (c) => `Der Server hat mit einem Fehler geantwortet (HTTP ${c.status || '5xx'}). Das passiert bei Wartungsarbeiten oder Überlastung.`,
    fix: later, noAction: true
  },
  SOURCE_RATE_LIMIT: {
    severity: 'warning', retry: true,
    title: 'Zu viele Anfragen in kurzer Zeit',
    what: (c) => `${c.sourceName || 'Die Datenquelle'} begrenzt, wie viele Suchen pro Minute möglich sind (HTTP 429). Dieses Limit ist gerade erreicht.`,
    fix: 'Warte etwa eine Minute und tippe dann auf „Erneut versuchen“.'
  },
  SOURCE_UNREACHABLE: {
    severity: 'error', retry: true,
    title: (c) => `Verbindung zu ${c.sourceName || 'der Datenquelle'} fehlgeschlagen`,
    what: 'Dein Gerät ist online, aber die Anfrage kam nicht an. Häufige Ursachen: ein Werbe- oder Tracking-Blocker, ein Firmen- oder Schul-WLAN mit Filter, ein VPN – oder eine kurze Störung beim Anbieter.',
    fix: (c) => `Deaktiviere testweise deinen Inhalts-Blocker für diese Seite oder wechsle das Netz (z. B. mobile Daten statt WLAN). Wenn das nichts ändert, liegt vermutlich eine Störung vor – dann einfach später erneut versuchen.${c.host ? ` Benötigte Adresse: ${c.host}` : ''}`
  },
  SOURCE_BAD_RESPONSE: {
    severity: 'error', retry: true,
    title: 'Unerwartete Antwort der Datenquelle',
    what: (c) => `${c.sourceName || 'Die Datenquelle'} hat Daten in einem unerwarteten Format geliefert${c.status ? ` (HTTP ${c.status})` : ''}. Oft ist das eine vorübergehende Wartungsseite.`,
    fix: 'Du musst nichts tun. Versuche es später erneut. Bleibt der Fehler über Stunden bestehen, melde ihn bitte mit den technischen Details unten.',
    noAction: true
  },
  SEARCH_PARTIAL: {
    severity: 'info', retry: true,
    title: 'Nicht alle Datenbanken haben geantwortet',
    what: (c) => `Folgende Quellen konnten nicht durchsucht werden: ${c.failed}. Die Ergebnisse unten stammen nur aus den übrigen Quellen.`,
    fix: 'Du musst nichts tun. Wenn du ein bestimmtes Produkt vermisst, tippe später auf „Erneut versuchen“.',
    noAction: true
  },
  // --- Suche & Produkt ----------------------------------------------------
  SEARCH_TOO_SHORT: {
    severity: 'info', retry: false,
    title: 'Suchbegriff zu kurz',
    what: 'Für eine sinnvolle Suche braucht die App mindestens 2 Zeichen.',
    fix: 'Gib einen Produktnamen, eine Marke oder die Barcode-Nummer ein (8, 12, 13 oder 14 Ziffern).'
  },
  SEARCH_NO_RESULTS: {
    severity: 'info', retry: false,
    title: 'Keine Treffer gefunden',
    what: (c) => `Für „${c.query}“ gibt es in ${c.scope || 'den Datenbanken'} keinen Eintrag.`,
    fix: 'Prüfe die Schreibweise, suche nur nach der Marke oder einem Teil des Namens – oder nutze die Barcode-Nummer bzw. den Kamera-Scan. Probiere auch die Kategorie „Alle“.'
  },
  INVALID_BARCODE_LENGTH: {
    severity: 'warning', retry: false,
    title: 'Diese Nummer ist kein gültiger Barcode',
    what: (c) => `Die Eingabe hat ${c.length} Ziffern. Produkt-Barcodes (EAN/UPC/GTIN) haben 8, 12, 13 oder 14 Ziffern.`,
    fix: 'Tippe alle Ziffern unter den Strichen ab – auch die kleinen Zahlen ganz links und rechts.'
  },
  INVALID_BARCODE_CHECKSUM: {
    severity: 'warning', retry: false,
    title: 'Die Prüfziffer passt nicht',
    what: 'Die letzte Ziffer eines Barcodes ist eine Prüfziffer. Sie passt nicht zu den übrigen Ziffern – vermutlich hat sich ein Tippfehler eingeschlichen.',
    fix: 'Vergleiche die Ziffern noch einmal mit der Verpackung. Ist die Nummer sicher korrekt (z. B. ein Händler-Code), tippe auf „Trotzdem suchen“.'
  },
  PRODUCT_NOT_FOUND: {
    severity: 'info', retry: false,
    title: 'Dieses Produkt ist noch nicht erfasst',
    what: (c) => `Der Barcode ${c.code} ist in keiner der durchsuchten offenen Datenbanken (${c.scope}) vorhanden. Die Datenbanken werden von Freiwilligen gepflegt und sind nicht vollständig.`,
    fix: 'Prüfe die Nummer. Du kannst das Produkt mit ein paar Fotos selbst bei Open Food Facts anlegen – dann steht es allen zur Verfügung.'
  },
  PRODUCT_NOT_FOUND_PARTIAL: {
    severity: 'warning', retry: true,
    title: 'Produkt nicht gefunden – nicht alle Quellen erreichbar',
    what: (c) => `Der Barcode ${c.code} wurde in ${c.checked} nicht gefunden. ${c.failed} konnte(n) aber nicht abgefragt werden – dort könnte das Produkt stehen.`,
    fix: 'Du musst nichts tun. Tippe in ein paar Minuten auf „Erneut versuchen“.',
    noAction: true
  },
  ENRICH_FAILED: {
    severity: 'info', retry: false,
    title: (c) => `Zusatzinformationen von ${c.sourceName} nicht verfügbar`,
    what: (c) => c.effect || 'Ergänzende Informationen konnten nicht geladen werden. Die Produktdaten selbst sind vollständig angezeigt.',
    fix: 'Du musst nichts tun. Beim nächsten Öffnen des Produkts wird es automatisch erneut versucht.',
    noAction: true
  },
  IMAGE_LOAD_FAILED: {
    severity: 'info', retry: false,
    title: 'Produktfoto nicht geladen',
    what: 'Das Foto liegt auf dem Bildserver der Datenbank und konnte nicht abgerufen werden.',
    fix: 'Du musst nichts tun. Alle anderen Angaben sind davon nicht betroffen.',
    noAction: true
  },
  STORAGE_UNAVAILABLE: {
    severity: 'info', retry: false,
    title: 'Merkliste wird nur vorübergehend gespeichert',
    what: 'Dein Browser erlaubt dieser Seite keinen dauerhaften Speicher – meist wegen des privaten Modus oder weil Website-Daten blockiert sind.',
    fix: 'Für eine dauerhafte Merkliste öffne die App im normalen (nicht privaten) Modus oder erlaube Website-Daten für diese Seite. Ansonsten musst du nichts tun.'
  },
  // --- Kamera & Barcode-Erkennung -----------------------------------------
  CAMERA_INSECURE_CONTEXT: {
    severity: 'error', retry: false,
    title: 'Kamera nur über sichere Verbindung',
    what: 'Browser geben die Kamera nur frei, wenn die Seite über https:// geöffnet wird. Diese Seite wurde ohne Verschlüsselung geladen.',
    fix: 'Öffne die App über eine Adresse, die mit https:// beginnt. Bis dahin kannst du ein Foto auswählen oder die Nummer eintippen.'
  },
  CAMERA_UNSUPPORTED: {
    severity: 'warning', retry: false,
    title: 'Live-Kamera wird von diesem Browser nicht unterstützt',
    what: (c) => `${c.browserName || 'Dein Browser'} bietet keinen Kamerazugriff für Webseiten an (oder er ist in einer eingebetteten Ansicht, z. B. in einer anderen App, gesperrt).`,
    fix: 'Nutze „Foto aufnehmen“ – das öffnet die normale Kamera-App – oder öffne die Seite in Safari (iPhone) bzw. Chrome (Android).'
  },
  CAMERA_PERMISSION_DENIED: {
    severity: 'error', retry: true,
    title: 'Kamerazugriff wurde nicht erlaubt',
    what: 'Die App braucht deine Erlaubnis, um die Kamera zu nutzen. Die Anfrage wurde abgelehnt – entweder gerade eben oder früher, und der Browser hat sich die Entscheidung gemerkt. Die Bilder bleiben übrigens immer auf deinem Gerät.',
    fix: (c) => c.permissionHelp
  },
  CAMERA_NOT_FOUND: {
    severity: 'error', retry: true,
    title: 'Keine Kamera gefunden',
    what: 'Der Browser hat an diesem Gerät keine Kamera gefunden.',
    fix: 'Schließe ggf. eine Webcam an und tippe auf „Erneut versuchen“. Alternativ kannst du ein Foto auswählen oder die Nummer eintippen.'
  },
  CAMERA_IN_USE: {
    severity: 'error', retry: true,
    title: 'Kamera ist gerade belegt',
    what: 'Die Kamera wird bereits von einer anderen App oder einem anderen Browser-Tab verwendet (z. B. Videoanruf, Kamera-App).',
    fix: 'Schließe die andere App bzw. den anderen Tab und tippe dann auf „Erneut versuchen“. Hilft das nicht, starte den Browser neu.'
  },
  CAMERA_BLOCKED_POLICY: {
    severity: 'error', retry: false,
    title: 'Kamera durch Einstellungen gesperrt',
    what: 'Der Kamerazugriff ist für diese Seite durch eine Browser- oder Geräterichtlinie gesperrt (z. B. Jugendschutz, Firmengerät, eingebettete Ansicht).',
    fix: 'Öffne die Seite direkt im Browser statt in einer anderen App. Bei verwalteten Geräten hilft nur die zuständige IT. Alternativ: Foto auswählen oder Nummer eintippen.'
  },
  CAMERA_START_FAILED: {
    severity: 'error', retry: true,
    title: 'Kamera konnte nicht gestartet werden',
    what: (c) => `Beim Starten der Kamera ist ein unerwarteter Fehler aufgetreten${c.detail ? ` (${c.detail})` : ''}.`,
    fix: 'Tippe auf „Erneut versuchen“. Hilft das nicht, lade die Seite neu oder starte den Browser neu.'
  },
  SCANNER_LIB_LOAD_FAILED: {
    severity: 'error', retry: true,
    title: 'Barcode-Erkennung konnte nicht geladen werden',
    what: (c) => `${c.browserName || 'Dein Browser'} hat keine eingebaute Barcode-Erkennung. Deshalb lädt die App die freie Erkennungs-Software ZXing aus dem Netz (cdn.jsdelivr.net) – das ist fehlgeschlagen.`,
    fix: 'Prüfe deine Internetverbindung und ob ein Inhalts-Blocker cdn.jsdelivr.net sperrt, dann „Erneut versuchen“. Die Nummer eintippen funktioniert immer.'
  },
  SCANNER_UNSUPPORTED: {
    severity: 'warning', retry: false,
    title: 'Barcode-Erkennung in diesem Browser nicht möglich',
    what: 'Dein Browser unterstützt WebAssembly nicht, das für die Erkennung nötig ist.',
    fix: 'Aktualisiere deinen Browser oder nutze einen aktuellen Safari, Chrome, Firefox oder Edge. Die Nummer eintippen funktioniert immer.'
  },
  SCAN_DETECT_FAILED: {
    severity: 'error', retry: true,
    title: 'Fehler in der Barcode-Erkennung',
    what: (c) => `Die Erkennung ist beim Auswerten des Kamerabildes wiederholt abgebrochen${c.detail ? ` (${c.detail})` : ''}.`,
    fix: 'Tippe auf „Erneut versuchen“. Wenn es wieder passiert, lade die Seite neu – oder nutze „Foto aufnehmen“ bzw. die manuelle Eingabe.'
  },
  SCAN_NO_CODE_HINT: {
    severity: 'info', retry: false,
    title: 'Noch kein Barcode erkannt',
    what: 'Die Kamera läuft, aber im Bild wurde bisher kein lesbarer Barcode gefunden.',
    fix: 'Halte das Handy 10–20 cm vom Barcode entfernt, den Barcode waagerecht und vollständig im Rahmen. Sorge für gutes Licht (Lampe-Symbol, falls vorhanden) und vermeide Spiegelungen auf Folie. Gebogene Flaschen leicht drehen.'
  },
  SCAN_QR_CODE: {
    severity: 'info', retry: false,
    title: 'Das ist ein QR-Code',
    what: 'Erkannt wurde ein QR-Code. Die Produktdatenbanken arbeiten aber mit dem Strich-Barcode (EAN/UPC).',
    fix: 'Suche auf der Verpackung den Strichcode mit Ziffern darunter und halte diesen in den Rahmen.'
  },
  SCAN_INVALID_CODE: {
    severity: 'info', retry: false,
    title: 'Barcode unvollständig gelesen',
    what: 'Ein Barcode wurde erkannt, aber die Prüfziffer passt nicht – vermutlich wurde er unscharf erfasst.',
    fix: 'Du musst nichts tun – halte die Kamera einfach weiter ruhig auf den Barcode. Die App liest automatisch erneut.',
    noAction: true
  },
  PHOTO_NO_CODE: {
    severity: 'warning', retry: false,
    title: 'Auf dem Foto wurde kein Barcode gefunden',
    what: 'Die Erkennung hat das Foto ausgewertet, aber keinen lesbaren Produkt-Barcode gefunden.',
    fix: 'Fotografiere den Barcode formatfüllend, scharf (kurz antippen zum Fokussieren), gerade von vorn und ohne Spiegelung. Dann erneut „Foto aufnehmen“.'
  },
  PHOTO_DECODE_FAILED: {
    severity: 'warning', retry: false,
    title: 'Foto konnte nicht geöffnet werden',
    what: (c) => `Das Bildformat${c.type ? ` (${c.type})` : ''} kann dieser Browser nicht lesen. Das betrifft z. B. HEIC-Fotos vom iPhone in Chrome oder Firefox.`,
    fix: 'Nimm das Foto direkt über „Foto aufnehmen“ auf oder wähle ein JPG/PNG. Auf dem iPhone: Einstellungen › Kamera › Formate › „Maximale Kompatibilität“.'
  },
  // --- Allgemein -----------------------------------------------------------
  APP_UNEXPECTED: {
    severity: 'error', retry: true,
    title: 'Unerwarteter Fehler in der App',
    what: (c) => `In der App ist ein Programmfehler aufgetreten${c.detail ? `: ${c.detail}` : ''}.`,
    fix: 'Lade die Seite neu. Tritt der Fehler wiederholt auf, melde ihn bitte mit den technischen Details unten – das hilft bei der Behebung.'
  }
};

// Bei „keine Aktion nötig“ steht der Satz schon in der Überschrift der Lösung
const noActionText = (fix, noAction) => (noAction ? String(fix).replace(/^Du musst nichts tun\.\s*/, '') : fix);
const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

/** Wandelt beliebige Fehler in eine anzeigbare Beschreibung um. */
export function describe(err, extraCtx = {}) {
  let code = 'APP_UNEXPECTED';
  let info = {};
  if (err instanceof AppError) { code = err.code; info = err.info || {}; }
  else if (err && err.code && CATALOG[err.code]) { code = err.code; info = err.info || {}; }
  else info = { detail: err && err.message ? err.message : String(err) };
  const entry = CATALOG[code] || CATALOG.APP_UNEXPECTED;
  const ctx = { ...info, ...extraCtx };
  return {
    code,
    severity: entry.severity,
    title: val(entry.title, ctx),
    what: val(entry.what, ctx),
    fix: noActionText(val(entry.fix, ctx), !!val(entry.noAction, ctx)),
    noAction: !!val(entry.noAction, ctx),
    retry: entry.retry,
    tech: {
      code,
      status: info.status,
      url: info.url,
      source: info.sourceName,
      detail: info.detail || (info.cause && info.cause.message) || undefined,
      time: (err && err.time ? err.time : new Date()).toISOString()
    }
  };
}
