// Familien-Zugang: Jede Anfrage braucht das Familienpasswort (HTTP Basic Auth).
// Das Passwort steht NICHT im Code, sondern in der Netlify-Umgebungsvariable FAMILY_ACCESS.
// Ist sie nicht gesetzt, bleibt die Seite gesperrt („fail closed“).

const robots = 'noindex, nofollow, noarchive';

function sameText(a, b) {
  // Vergleich ohne früh abzubrechen (erschwert das Erraten über Antwortzeiten)
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export function passwordFrom(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    const i = decoded.indexOf(':');
    return i >= 0 ? decoded.slice(i + 1) : null;
  } catch { return null; }
}

const page = (title, text) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${robots}"><title>${title}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#FBF5F2;color:#2B1E1E;display:flex;min-height:100vh;align-items:center;justify-content:center}main{max-width:420px;padding:24px}h1{font-family:Georgia,serif;font-size:28px;margin:0 0 12px}p{line-height:1.5}</style></head>
<body><main><h1>Pur<span style="color:#A3404F">.</span></h1><p><strong>${title}</strong></p><p>${text}</p></main></body></html>`;

export default async (request, context) => {
  const secret = (globalThis.Netlify && Netlify.env.get('FAMILY_ACCESS')) || '';
  if (secret.length < 10) {
    return new Response(page('Zugang noch nicht eingerichtet', 'Diese private Familienseite ist gesperrt, bis das Familienpasswort eingerichtet ist.'), {
      status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': robots, 'cache-control': 'no-store' }
    });
  }
  const given = passwordFrom(request.headers.get('authorization'));
  if (given !== null && sameText(given, secret)) {
    const res = await context.next();
    res.headers.set('x-robots-tag', robots);
    return res;
  }
  return new Response(page('Private Familienseite', 'Diese Seite ist nur für Familienmitglieder gedacht und nicht öffentlich. Den Zugang erhältst du innerhalb der Familie. Benutzername: beliebig (z. B. „familie“).'), {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="Pur. - private Familienseite", charset="UTF-8"',
      'content-type': 'text/html; charset=utf-8', 'x-robots-tag': robots, 'cache-control': 'no-store'
    }
  });
};

export const config = { path: '/*' };
