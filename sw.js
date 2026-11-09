// Service worker: permite jugar sin conexión
const VERSION = 'pasatiempos-v2';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/comun.js', 'js/teclado.js', 'js/wordle.js', 'js/sudoku.js', 'js/lexireto.js', 'js/crucigrama.js', 'js/app.js',
  'data/palabras.js', 'data/frecuentes.js', 'data/wordle.js', 'data/pistas.js', 'data/pistas-dificiles.js',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (para recibir actualizaciones) y caché si no hay conexión
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
