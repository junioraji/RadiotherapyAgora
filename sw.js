/**
 * Service worker — Sistem Manajemen Radioterapi (PWA)
 * - Berkas tampilan (index.html, css, js, ikon): network-first → selalu versi terbaru bila online,
 *   pakai salinan cache bila jaringan putus (halaman tetap terbuka).
 * - Font/ikon/Chart.js dari CDN: cache-first (jarang berubah, mempercepat buka aplikasi).
 * - Panggilan API Apps Script (script.google.com) TIDAK PERNAH di-cache: data pasien selalu langsung dari server.
 */
const VERSI = 'rt-v2.0.1';
const INTI = ['./', './index.html', './css/style.css', './js/config.js', './js/app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSI).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke API: lewat langsung
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {              // berkas situs: network-first
    e.respondWith(fetch(req).then(res => {
      if (res && res.ok) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(req, salin)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  if (CDN.test(req.url)) {                                // CDN: cache-first
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(req, salin)); }
      return res;
    })));
  }
  // selain itu (termasuk script.google.com): tidak disentuh
});
