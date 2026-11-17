// Erkennt Browser & Betriebssystem, um Kamera-Strategie und Hilfetexte anzupassen.

export function detectBrowser(ua = (typeof navigator !== 'undefined' ? navigator.userAgent : ''), opts = {}) {
  const maxTouch = opts.maxTouchPoints ?? (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0);
  const isIPadOS = /Macintosh/.test(ua) && maxTouch > 1; // iPad gibt sich als Mac aus
  const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPadOS;
  const isAndroid = /Android/.test(ua);
  let id = 'other';
  let name = 'Dein Browser';

  if (isIOS) {
    if (/CriOS/.test(ua)) { id = 'ios-chrome'; name = 'Chrome (iOS)'; }
    else if (/FxiOS/.test(ua)) { id = 'ios-firefox'; name = 'Firefox (iOS)'; }
    else if (/EdgiOS/.test(ua)) { id = 'ios-edge'; name = 'Edge (iOS)'; }
    else if (/Safari/.test(ua) && !/(FBAN|FBAV|Instagram|Line\/|GSA\/)/.test(ua)) { id = 'ios-safari'; name = 'Safari (iOS)'; }
    else { id = 'ios-inapp'; name = 'Die eingebettete Browser-Ansicht'; }
  } else if (isAndroid) {
    if (/SamsungBrowser/.test(ua)) { id = 'android-samsung'; name = 'Samsung Internet'; }
    else if (/Firefox/.test(ua)) { id = 'android-firefox'; name = 'Firefox (Android)'; }
    else if (/EdgA/.test(ua)) { id = 'android-edge'; name = 'Edge (Android)'; }
    else if (/; wv\)/.test(ua)) { id = 'android-inapp'; name = 'Die eingebettete Browser-Ansicht'; }
    else if (/Chrome/.test(ua)) { id = 'android-chrome'; name = 'Chrome (Android)'; }
    else { id = 'android-other'; name = 'Dein Android-Browser'; }
  } else {
    if (/Edg\//.test(ua)) { id = 'desktop-edge'; name = 'Edge'; }
    else if (/Firefox/.test(ua)) { id = 'desktop-firefox'; name = 'Firefox'; }
    else if (/Chrome/.test(ua)) { id = 'desktop-chrome'; name = 'Chrome'; }
    else if (/Safari/.test(ua)) { id = 'desktop-safari'; name = 'Safari'; }
  }
  return { id, name, isIOS, isAndroid, isMobile: isIOS || isAndroid };
}

/** Browserspezifische Anleitung, um eine verweigerte Kamera-Erlaubnis zu ändern. */
export function permissionHelp(browser) {
  const reload = ' Danach die Seite neu laden und auf „Erneut versuchen“ tippen.';
  switch (browser.id) {
    case 'ios-safari':
      return 'Tippe in der Adressleiste auf „AA“ (bzw. das Seiten-Symbol) › Website-Einstellungen › Kamera › „Erlauben“. Falls das fehlt: iPhone-Einstellungen › Apps › Safari › Kamera › „Fragen“ oder „Erlauben“.' + reload;
    case 'ios-chrome':
      return 'Öffne die iPhone-Einstellungen › Apps › Chrome › Kamera einschalten.' + reload;
    case 'ios-firefox':
      return 'Öffne die iPhone-Einstellungen › Apps › Firefox › Kamera einschalten.' + reload;
    case 'ios-edge':
      return 'Öffne die iPhone-Einstellungen › Apps › Edge › Kamera einschalten.' + reload;
    case 'android-chrome':
    case 'android-edge':
      return 'Tippe links in der Adressleiste auf das Einstellungs-Symbol › Berechtigungen › Kamera › „Zulassen“. Ist die Kamera dort nicht auswählbar: Android-Einstellungen › Apps › Chrome › Berechtigungen › Kamera.' + reload;
    case 'android-samsung':
      return 'Tippe auf das Schloss-Symbol in der Adressleiste › Berechtigungen › Kamera zulassen. Alternativ: Android-Einstellungen › Apps › Samsung Internet › Berechtigungen › Kamera.' + reload;
    case 'android-firefox':
      return 'Tippe auf das Schloss-Symbol in der Adressleiste › Kamera › „Erlaubt“. Ggf. zusätzlich: Android-Einstellungen › Apps › Firefox › Berechtigungen › Kamera.' + reload;
    case 'desktop-chrome':
    case 'desktop-edge':
      return 'Klicke links in der Adressleiste auf das Symbol neben der Adresse › Kamera › „Zulassen“. Prüfe auch die Datenschutz-Einstellungen deines Betriebssystems (Kamera für den Browser erlaubt?).' + reload;
    case 'desktop-firefox':
      return 'Klicke in der Adressleiste auf das durchgestrichene Kamera-Symbol und entferne die Blockierung. Prüfe auch die Kamera-Freigabe in den Systemeinstellungen.' + reload;
    case 'desktop-safari':
      return 'Menü Safari › Einstellungen › Websites › Kamera › für diese Seite „Erlauben“. Prüfe auch Systemeinstellungen › Datenschutz & Sicherheit › Kamera.' + reload;
    case 'ios-inapp':
    case 'android-inapp':
      return 'Du hast die App vermutlich aus einer anderen App heraus geöffnet (z. B. Instagram). Öffne sie über das Menü „Im Browser öffnen“ in Safari bzw. Chrome.';
    default:
      return 'Erlaube den Kamerazugriff in den Website-Einstellungen deines Browsers (meist über das Symbol links in der Adressleiste).' + reload;
  }
}
