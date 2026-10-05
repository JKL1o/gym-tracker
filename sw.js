// Service Worker: macht die App offline startbar.
// Strategie "Netz zuerst": online immer die neueste Version laden (und Kopie ablegen),
// offline oder bei sehr langsamem Netz die abgelegte Kopie verwenden.
// Die Daten selbst speichert Firestore – hier geht es nur um die App-Dateien.
const CACHE = 'gym-tracker-v1';
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/plan.js',
  './js/entries.js',
  './js/store.js',
  './js/export.js',
  './js/firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  `${SDK}firebase-app.js`,
  `${SDK}firebase-auth.js`,
  `${SDK}firebase-firestore.js`,
];
const TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  // Alte Cache-Versionen löschen
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const own = url.origin === self.location.origin;
  const sdk = request.url.startsWith(SDK);
  if (!own && !sdk) return; // Login- und Datenbank-Anfragen nie anfassen

  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      // Bei schlechtem Netz nicht ewig warten, wenn eine Kopie da ist
      if (!cached) return await network;
      return await Promise.race([
        network,
        new Promise((resolve) => setTimeout(() => resolve(cached), TIMEOUT_MS)),
      ]);
    } catch {
      return cached ?? Response.error();
    }
  })());
});
