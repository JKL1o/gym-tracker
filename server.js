// Mini-Webserver zum lokalen Testen am PC (ohne Zusatzpakete).
// Nötig, weil Browser JavaScript-Module nicht direkt per Doppelklick (file://) laden.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(ROOT, urlPath);
    // Nur Dateien innerhalb des Projektordners ausliefern
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      return res.end('Verboten');
    }
    const data = await readFile(file);
    // no-store: beim Testen immer die aktuelle Version laden, nichts aus dem Cache
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Nicht gefunden');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Gym-Tracker läuft auf http://localhost:${PORT}  (Beenden: Strg+C oder Fenster schließen)`);
});
