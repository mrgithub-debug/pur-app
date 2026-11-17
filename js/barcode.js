// Barcode-Hilfen: Prüfziffer, UPC-E-Umwandlung, GS1-Präfix.

export const isDigits = (s) => /^\d+$/.test(s);
export const VALID_LENGTHS = [8, 12, 13, 14];

/** GTIN-Prüfziffer (gilt für EAN-8, UPC-A, EAN-13, GTIN-14). */
export function checksumOk(code) {
  if (!isDigits(code) || !VALID_LENGTHS.includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  let sum = 0;
  digits.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check;
}

/** UPC-E (8-stellig, beginnt mit 0 oder 1) in UPC-A (12-stellig) umwandeln. */
export function upcEtoA(upce) {
  if (!/^[01]\d{7}$/.test(upce)) return null;
  const ns = upce[0], d = upce.slice(1, 7), check = upce[7];
  const last = d[5];
  let body;
  if ('012'.includes(last)) body = d.slice(0, 2) + last + '0000' + d.slice(2, 5);
  else if (last === '3') body = d.slice(0, 3) + '00000' + d.slice(3, 5);
  else if (last === '4') body = d.slice(0, 4) + '00000' + d[4];
  else body = d.slice(0, 5) + '0000' + last;
  return ns + body + check;
}

/** Normalisiert eine Eingabe: Leerzeichen/Bindestriche entfernen. */
export function cleanCode(input) {
  return String(input || '').replace(/[\s-]/g, '');
}

// GS1-Präfixe (erste 3 Ziffern einer GTIN-13). Quelle: GS1 Company Prefix-Liste.
// Achtung: zeigt die Länderorganisation, bei der der Code registriert wurde – NICHT das Herkunftsland.
const GS1 = [
  [0, 19, 'USA & Kanada (GS1 US)'], [20, 29, 'Händler-interner Code'], [30, 39, 'USA (GS1 US)'],
  [40, 49, 'Händler-interner Code'], [50, 59, 'Coupon'], [60, 139, 'USA & Kanada (GS1 US)'],
  [200, 299, 'Händler-interner Code (z. B. Frischware, Eigenmarke)'],
  [300, 379, 'Frankreich & Monaco'], [380, 380, 'Bulgarien'], [383, 383, 'Slowenien'], [385, 385, 'Kroatien'],
  [387, 387, 'Bosnien und Herzegowina'], [389, 389, 'Montenegro'], [400, 440, 'Deutschland'],
  [450, 459, 'Japan'], [460, 469, 'Russland'], [470, 470, 'Kirgisistan'], [471, 471, 'Taiwan'],
  [474, 474, 'Estland'], [475, 475, 'Lettland'], [476, 476, 'Aserbaidschan'], [477, 477, 'Litauen'],
  [478, 478, 'Usbekistan'], [479, 479, 'Sri Lanka'], [480, 480, 'Philippinen'], [481, 481, 'Belarus'],
  [482, 482, 'Ukraine'], [484, 484, 'Moldau'], [485, 485, 'Armenien'], [486, 486, 'Georgien'],
  [487, 487, 'Kasachstan'], [488, 488, 'Tadschikistan'], [489, 489, 'Hongkong'], [490, 499, 'Japan'],
  [500, 509, 'Vereinigtes Königreich'], [520, 521, 'Griechenland'], [528, 528, 'Libanon'], [529, 529, 'Zypern'],
  [530, 530, 'Albanien'], [531, 531, 'Nordmazedonien'], [535, 535, 'Malta'], [539, 539, 'Irland'],
  [540, 549, 'Belgien & Luxemburg'], [560, 560, 'Portugal'], [569, 569, 'Island'], [570, 579, 'Dänemark'],
  [590, 590, 'Polen'], [594, 594, 'Rumänien'], [599, 599, 'Ungarn'], [600, 601, 'Südafrika'],
  [603, 603, 'Ghana'], [604, 604, 'Senegal'], [608, 608, 'Bahrain'], [609, 609, 'Mauritius'],
  [611, 611, 'Marokko'], [613, 613, 'Algerien'], [615, 615, 'Nigeria'], [616, 616, 'Kenia'],
  [618, 618, 'Elfenbeinküste'], [619, 619, 'Tunesien'], [621, 621, 'Syrien'], [622, 622, 'Ägypten'],
  [624, 624, 'Libyen'], [625, 625, 'Jordanien'], [626, 626, 'Iran'], [627, 627, 'Kuwait'],
  [628, 628, 'Saudi-Arabien'], [629, 629, 'Vereinigte Arabische Emirate'], [640, 649, 'Finnland'],
  [690, 699, 'China'], [700, 709, 'Norwegen'], [729, 729, 'Israel'], [730, 739, 'Schweden'],
  [740, 740, 'Guatemala'], [741, 741, 'El Salvador'], [742, 742, 'Honduras'], [743, 743, 'Nicaragua'],
  [744, 744, 'Costa Rica'], [745, 745, 'Panama'], [746, 746, 'Dominikanische Republik'], [750, 750, 'Mexiko'],
  [754, 755, 'Kanada'], [759, 759, 'Venezuela'], [760, 769, 'Schweiz & Liechtenstein'], [770, 771, 'Kolumbien'],
  [773, 773, 'Uruguay'], [775, 775, 'Peru'], [777, 777, 'Bolivien'], [778, 779, 'Argentinien'],
  [780, 780, 'Chile'], [784, 784, 'Paraguay'], [786, 786, 'Ecuador'], [789, 790, 'Brasilien'],
  [800, 839, 'Italien, San Marino & Vatikan'], [840, 849, 'Spanien & Andorra'], [850, 850, 'Kuba'],
  [858, 858, 'Slowakei'], [859, 859, 'Tschechien'], [860, 860, 'Serbien'], [865, 865, 'Mongolei'],
  [867, 867, 'Nordkorea'], [868, 869, 'Türkei'], [870, 879, 'Niederlande'], [880, 880, 'Südkorea'],
  [884, 884, 'Kambodscha'], [885, 885, 'Thailand'], [888, 888, 'Singapur'], [890, 890, 'Indien'],
  [893, 893, 'Vietnam'], [896, 896, 'Pakistan'], [899, 899, 'Indonesien'], [900, 919, 'Österreich'],
  [930, 939, 'Australien'], [940, 949, 'Neuseeland'], [955, 955, 'Malaysia'], [958, 958, 'Macau'],
  [977, 977, 'Zeitschrift (ISSN)'], [978, 979, 'Buch (ISBN)']
];

/** Liefert die registrierende GS1-Organisation für einen Barcode – oder null. */
export function gs1Region(code) {
  if (!isDigits(code)) return null;
  let c = code;
  if (c.length === 12) c = '0' + c;       // UPC-A
  if (c.length === 14) c = c.slice(1);    // GTIN-14 -> GTIN-13
  if (c.length !== 13) return null;       // EAN-8 nutzt eigene Präfixvergabe
  const p = Number(c.slice(0, 3));
  const hit = GS1.find(([a, b]) => p >= a && p <= b);
  return hit ? { prefix: c.slice(0, 3), region: hit[2] } : { prefix: c.slice(0, 3), region: null };
}
