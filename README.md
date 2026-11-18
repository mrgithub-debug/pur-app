# Pur.

**Nur das, was drin ist.**

Eine leichtgewichtige Web-App, mit der du Produkte nach **Inhaltsstoffen**, **Umweltwirkung (Green-Score)** und **Lieferkette (CO₂ je Lebenszyklus-Phase)** prüfen kannst. Sie arbeitet ausschließlich mit offenen Daten, ohne KI und ohne Tracking. Das Design ist im Pinterest-Stil („Blush Pinboard“) gehalten.

## Funktionen

- **Suche** nach Produktname, Marke oder Barcode-Nummer (EAN-8/-13, UPC-A/-E, GTIN-14) mit Prüfziffer-Kontrolle
- **Kamera-Scan**: Die Erkennung wird je nach Browser gewählt (siehe unten). Alternativ gehen Foto-Upload oder die Eingabe der Nummer.
- **Produktdetail** mit Tabs:
  - *Inhaltsstoffe*: vegan/vegetarisch/Palmöl, Allergene & Spuren, Zusatzstoffe mit deutscher Bezeichnung und Funktion, Zutaten mit Anteilen, Originaltext. Jede Zutat und jeder Zusatzstoff hat einen **„W“-Link zu Wikipedia**: Über die Wikidata-Verknüpfung der OFF-Taxonomie öffnet er direkt den deutschen Artikel (sonst den englischen). Ohne Verknüpfung öffnet er die Wikipedia-Suche zum Begriff.
  - *Umwelt*: Green-Score mit Boni/Abzügen und fehlenden Angaben, Verpackungsbestandteile & Entsorgung, Siegel
  - *Lieferkette*: CO₂ je Phase (Landwirtschaft → Verarbeitung → Verpackung → Transport → Handel → Verbrauch), Herkunft der Zutaten, Herstellungsort, Verpackercode, Marke & Hersteller (Wikidata), Verkaufsländer, GS1-Registrierungsland
  - *Nährwerte* (bei Lebensmitteln)
- **Quellenangaben überall**: Jeder Abschnitt hat einen „Quelle“-Knopf mit Anbieter, Lizenz, Änderungs- und Abrufdatum, Link zum Originaleintrag und zu den Rohdaten. Dazu gibt es ein Quellenverzeichnis pro Produkt und die Seite „Quellen & Lizenzen“.
- **Merkliste & Verlauf** werden lokal im Browser gespeichert.
- **Verständliche Fehlermeldungen**: Jede Meldung sagt, *was passiert ist*, *wie man es löst* bzw. dass *keine Aktion nötig ist*. Unter „Technische Details“ stehen Fehlercode, HTTP-Status und Adresse (Katalog in `js/errors.js`).

## Datenquellen

| Quelle | Inhalt | Lizenz |
|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org) | Lebensmittel, Green-/Nutri-Score, NOVA, Agribalyse-Werte | ODbL / DbCL, Fotos CC BY-SA |
| [Open Beauty Facts](https://world.openbeautyfacts.org) | Kosmetik | ODbL / DbCL |
| [Open Pet Food Facts](https://world.openpetfoodfacts.org) | Tierbedarf | ODbL / DbCL |
| [Open Products Facts](https://world.openproductsfacts.org) | Haushalt & Sonstiges | ODbL / DbCL |
| OFF-Taxonomien | deutsche Begriffe (Zusatzstoffe, Siegel, Verpackung, Länder) | ODbL |
| [Wikidata](https://www.wikidata.org) | Marke & Hersteller, Verknüpfung Zutat → Artikel | CC0 |
| [Wikipedia](https://de.wikipedia.org) | Beschreibungen der Zutaten & Zusatzstoffe (verlinkt) | CC BY-SA 4.0 |
| [Agribalyse (ADEME)](https://agribalyse.ademe.fr) | Ökobilanz-Grundlage (über OFF) | Etalab 2.0 |
| GS1-Präfixliste (in `js/barcode.js`) | Registrierungsland des Barcodes | – |

Ein Barcode wird parallel in allen vier Datenbanken gesucht. Fällt eine Quelle aus, wird das gemeldet, und die übrigen Ergebnisse werden trotzdem angezeigt.

## Kamera-Scan je nach Browser

| Browser | Erkennung |
|---|---|
| Chrome / Edge / Samsung Internet auf Android, Chrome auf macOS | eingebaute **BarcodeDetector-API** |
| Safari (iPhone/iPad/Mac), alle iOS-Browser, Firefox, Chrome unter Windows/Linux | **ZXing-C++ als WebAssembly** (Paket [`barcode-detector`](https://github.com/Sec-ant/barcode-detector), wird bei Bedarf von jsDelivr geladen) |
| ohne Kamerazugriff (z. B. eingebettete App-Ansicht, http) | Foto aufnehmen/auswählen → gleiche Erkennung |
| immer | Nummer eintippen |

Ein Code wird erst übernommen, wenn er zweimal hintereinander mit gültiger Prüfziffer gelesen wurde. QR-Codes werden erkannt und mit einem Hinweis beantwortet. UPC-E wird in UPC-A umgewandelt. Wo möglich, lässt sich das Licht einschalten. Für eine verweigerte Kamera-Erlaubnis gibt es eine Anleitung passend zum Browser (`js/browser.js`). Alle Bilder bleiben auf dem Gerät.

## Projektstruktur

```
index.html            App-Hülle
css/app.css           Design A „Blush Pinboard“
js/main.js            Router & Ansichten
js/api.js             Anbindung der Datenbanken, Fehlerzuordnung
js/enrich.js          Taxonomien & Wikidata
js/scanner.js         Kamera, Erkennung, Foto
js/browser.js         Browsererkennung & Berechtigungshilfe
js/errors.js          Fehlerkatalog
js/sources.js         Quellenangaben & Lizenzen
js/barcode.js         Prüfziffer, UPC-E, GS1
js/store.js           Merkliste & Verlauf (localStorage mit Rückfall)
tests/                Unit-Tests (node --test) & harness.html mit Beispieldaten
netlify.toml          Netlify-Konfiguration (ohne Build-Schritt)
```

## Lokal starten

Die Kamera braucht `https://` oder `localhost`.

```bash
npx serve -l 8080 .        # oder: python3 -m http.server 8080
# http://localhost:8080
```

Tests: `npm test` (Node ≥ 18). `tests/harness.html` zeigt die Oberfläche mit Beispieldaten, ganz ohne Netz, z. B. `http://localhost:8080/tests/harness.html#/produkt/1234567890128`.

## Auf Netlify veröffentlichen (noch nicht erfolgt)

1. In Netlify „Add new site → Import an existing project“ wählen und dieses Repository verbinden.
2. Build command leer lassen, Publish directory `.`. Beides ist in `netlify.toml` schon gesetzt.
3. Deploy. Netlify liefert automatisch HTTPS, das für die Kamera nötig ist.

## Hinweise

- Die Daten stammen aus Gemeinschaftsprojekten und können unvollständig sein. Maßgeblich ist immer die Verpackung.
- Der Green-Score und die CO₂-Werte beruhen auf der Ökobilanz der *Produktkategorie* (Agribalyse), nicht auf einer Messung des einzelnen Produkts.
- Das GS1-Präfix zeigt das Land der Barcode-Registrierung, **nicht** das Herkunftsland.

## Rechtliches

- **Impressum, Datenschutzerklärung, Nutzungshinweise & Haftung** sind in der App unter `#/impressum`, `#/datenschutz` und `#/nutzung` zu finden. Die Texte stehen in `js/legal.js`, die Angaben der Anbieterin in `js/legal-config.js`.
- **Sperre vor dem Veröffentlichen:** Netlify führt `scripts/check-legal.mjs` aus. Sind Name, Anschrift oder E-Mail in `js/legal-config.js` leer, bricht die Veröffentlichung ab.
- **Datensparsamkeit:**
  - keine Google Fonts, es werden Systemschriften genutzt
  - keine Cookies, kein Tracking
  - ZXing wird erst nach ausdrücklicher Einwilligung von jsDelivr geladen, und die Einwilligung lässt sich widerrufen
  - eine Content-Security-Policy erlaubt nur die in der Datenschutzerklärung genannten Dienste
- Beim ersten Start erscheint ein Hinweis: Daten ohne Gewähr, maßgeblich ist die Verpackung, keine Beratung.
- Die Texte sind sorgfältig erstellt, ersetzen aber keine Rechtsberatung.
