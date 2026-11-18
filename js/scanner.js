// Kamera-Scan – die Erkennung wird je nach Browser gewählt:
//  1. Eingebaute BarcodeDetector-API (Chrome/Edge/Samsung Internet auf Android, Chrome auf macOS)
//  2. Sonst ZXing als WebAssembly (Safari/iOS, Firefox, Chrome unter Windows/Linux)
//  3. Ohne Live-Kamera: Foto aufnehmen/auswählen; immer möglich: Nummer eintippen
// Alle Bilder werden ausschließlich lokal auf dem Gerät ausgewertet.
import { AppError } from './errors.js';
import { detectBrowser, permissionHelp } from './browser.js';
import { checksumOk, upcEtoA } from './barcode.js';

export const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
export const POLYFILL_URLS = [
  'https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js',
  'https://cdn.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js'
];

/** Ermittelt, was dieser Browser kann. */
export async function capabilities() {
  const browser = detectBrowser();
  const secure = !!window.isSecureContext;
  const media = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  let nativeFormats = [];
  if ('BarcodeDetector' in window) {
    try { nativeFormats = await window.BarcodeDetector.getSupportedFormats(); } catch { nativeFormats = []; }
  }
  const native = nativeFormats.includes('ean_13');
  const wasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  let permission = 'unknown';
  try {
    if (navigator.permissions && navigator.permissions.query) {
      permission = (await navigator.permissions.query({ name: 'camera' })).state;
    }
  } catch { /* Firefox/ältere Safari kennen "camera" nicht */ }
  return { browser, secure, media, native, nativeFormats, wasm, permission, engine: native ? 'native' : (wasm ? 'zxing' : null) };
}

export function engineLabel(caps) {
  if (caps.engine === 'native') return { short: 'Im Browser eingebaut', long: `${caps.browser.name} bringt eine eigene Barcode-Erkennung mit (BarcodeDetector-API). Sie ist schnell und läuft vollständig auf deinem Gerät.` };
  if (caps.engine === 'zxing') return { short: 'ZXing (lokal, WebAssembly)', long: `${caps.browser.name} hat keine eingebaute Barcode-Erkennung. Die App lädt deshalb einmalig die freie Erkennungs-Software ZXing (ca. 1 MB). Die Auswertung läuft vollständig auf deinem Gerät – es werden keine Bilder hochgeladen.` };
  return { short: 'Nicht verfügbar', long: 'In diesem Browser ist keine Barcode-Erkennung möglich. Bitte tippe die Nummer ein.' };
}

let detectorPromise = null;
/** Lädt die passende Erkennung. Wirft AppError (SCANNER_*). */
export function getDetector(caps) {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    const browserName = caps.browser.name;
    if (caps.engine === 'native') {
      const formats = PRODUCT_FORMATS.filter((f) => caps.nativeFormats.includes(f));
      if (caps.nativeFormats.includes('qr_code')) formats.push('qr_code');
      return { engine: 'native', detector: new window.BarcodeDetector({ formats }) };
    }
    if (!caps.wasm) throw new AppError('SCANNER_UNSUPPORTED', { browserName });
    let lastErr = null;
    for (const url of POLYFILL_URLS) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        if (!mod.BarcodeDetector) throw new Error('Modul ohne BarcodeDetector');
        const detector = new mod.BarcodeDetector({ formats: [...PRODUCT_FORMATS, 'qr_code'] });
        // WebAssembly sofort laden, damit Ladefehler hier und nicht erst beim Scannen auftreten
        const c = document.createElement('canvas'); c.width = 8; c.height = 8;
        await detector.detect(c);
        return { engine: 'zxing', detector, url };
      } catch (e) { lastErr = e; }
    }
    throw new AppError('SCANNER_LIB_LOAD_FAILED', { browserName, url: POLYFILL_URLS[0], detail: lastErr && lastErr.message });
  })();
  detectorPromise.catch(() => { detectorPromise = null; }); // nächster Versuch lädt neu
  return detectorPromise;
}

function mapCameraError(e, caps) {
  const name = e && e.name;
  const ctx = { browserName: caps.browser.name, permissionHelp: permissionHelp(caps.browser), detail: name ? `${name}: ${e.message || ''}`.trim() : String(e) };
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return new AppError('CAMERA_PERMISSION_DENIED', ctx);
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return new AppError('CAMERA_NOT_FOUND', ctx);
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return new AppError('CAMERA_IN_USE', ctx);
  if (name === 'SecurityError') return new AppError('CAMERA_BLOCKED_POLICY', ctx);
  if (name === 'TypeError') return new AppError('CAMERA_UNSUPPORTED', ctx);
  return new AppError('CAMERA_START_FAILED', ctx);
}

/** Startet die Rückkamera. Gibt den MediaStream zurück oder wirft AppError (CAMERA_*). */
export async function startCamera(video, caps) {
  if (!caps.secure) throw new AppError('CAMERA_INSECURE_CONTEXT', { browserName: caps.browser.name });
  if (!caps.media) throw new AppError('CAMERA_UNSUPPORTED', { browserName: caps.browser.name });
  const tries = [
    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { audio: false, video: { facingMode: 'environment' } },
    { audio: false, video: true }
  ];
  let lastErr;
  for (const constraints of tries) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      return stream;
    } catch (e) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      lastErr = e;
      if (e && (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError')) continue;
      break;
    }
  }
  throw mapCameraError(lastErr, caps);
}

export function stopStream(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

export function torchSupported(stream) {
  const track = stream && stream.getVideoTracks()[0];
  try { return !!(track && track.getCapabilities && track.getCapabilities().torch); } catch { return false; }
}
export async function setTorch(stream, on) {
  const track = stream && stream.getVideoTracks()[0];
  if (track) await track.applyConstraints({ advanced: [{ torch: on }] });
}

/** Wandelt ein Erkennungsergebnis in eine prüfbare GTIN um. */
export function normalizeDetected(result) {
  const raw = String(result.rawValue || '').replace(/\D/g, '');
  const f = result.format;
  if (f === 'qr_code') return { kind: 'qr' };
  if (!PRODUCT_FORMATS.includes(f) || !raw) return { kind: 'other' };
  let code = raw;
  if (f === 'upc_e' && raw.length === 8) code = upcEtoA(raw) || raw;
  if (f === 'upc_e' && raw.length === 6) return { kind: 'invalid' };
  return checksumOk(code) ? { kind: 'code', code } : { kind: 'invalid' };
}

/** Live-Scan-Schleife: meldet einen Code erst, wenn er zweimal hintereinander gelesen wurde. */
export class LiveScanner {
  constructor({ video, detector, onCode, onHint, onFatal }) {
    Object.assign(this, { video, detector, onCode, onHint, onFatal });
    this.running = false; this.timer = null; this.last = null; this.errors = 0;
    this.started = 0; this.hinted = {};
  }
  start() {
    this.running = true; this.started = Date.now(); this.tick();
  }
  stop() { this.running = false; clearTimeout(this.timer); }
  hint(code, every = 6000) {
    const t = Date.now();
    if (!this.hinted[code] || t - this.hinted[code] > every) { this.hinted[code] = t; this.onHint(code); }
  }
  async tick() {
    if (!this.running) return;
    const v = this.video;
    if (v.readyState >= 2 && v.videoWidth > 0) {
      try {
        const results = await this.detector.detect(v);
        this.errors = 0;
        let sawQr = false, sawInvalid = false;
        for (const r of results) {
          const n = normalizeDetected(r);
          if (n.kind === 'code') {
            if (this.last === n.code) { this.stop(); this.onCode(n.code); return; }
            this.last = n.code;
          } else if (n.kind === 'qr') sawQr = true;
          else if (n.kind === 'invalid') sawInvalid = true;
        }
        if (sawQr) this.hint('SCAN_QR_CODE');
        else if (sawInvalid) this.hint('SCAN_INVALID_CODE', 8000);
        if (!results.length && Date.now() - this.started > 15000) this.hint('SCAN_NO_CODE_HINT', 30000);
      } catch (e) {
        if (++this.errors >= 5) {
          this.stop();
          this.onFatal(new AppError('SCAN_DETECT_FAILED', { detail: e && (e.name + ': ' + e.message) }));
          return;
        }
      }
    }
    if (this.running) this.timer = setTimeout(() => this.tick(), 120);
  }
}

async function fileToCanvas(file) {
  const max = 1600;
  let src, w, h;
  try {
    src = await createImageBitmap(file);
    w = src.width; h = src.height;
  } catch {
    src = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild nicht lesbar')); };
      img.src = url;
    });
    w = src.naturalWidth; h = src.naturalHeight;
  }
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Erkennt einen Barcode auf einem Foto. Wirft AppError (PHOTO_*, SCAN_QR_CODE). */
export async function decodePhoto(file, detector) {
  let canvas;
  try { canvas = await fileToCanvas(file); }
  catch (e) { throw new AppError('PHOTO_DECODE_FAILED', { type: file && file.type, detail: e.message }); }
  let results;
  try { results = await detector.detect(canvas); }
  catch (e) { throw new AppError('SCAN_DETECT_FAILED', { detail: e && (e.name + ': ' + e.message) }); }
  let qr = false;
  for (const r of results) {
    const n = normalizeDetected(r);
    if (n.kind === 'code') return n.code;
    if (n.kind === 'qr') qr = true;
  }
  throw new AppError(qr ? 'SCAN_QR_CODE' : 'PHOTO_NO_CODE', {});
}
