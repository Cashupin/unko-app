// public/sw.js
self.addEventListener("install", (event) => {
  console.log("Service Worker de FinWise instalado.");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker de FinWise activado.");
});

// No fetch handler — the browser handles all network requests natively.
// A fetch listener is not required for PWA installability; adding one that
// only calls fetch(event.request) causes CSP connect-src violations when the
// SW re-fetches external URLs (e.g. Cloudinary images) from its own context.
