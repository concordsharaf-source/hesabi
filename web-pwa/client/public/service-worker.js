const CACHE_NAME = "hesabi-pwa-v1";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [SCOPE_PATH, `${SCOPE_PATH}manifest.json`, `${SCOPE_PATH}service-worker.js`, "/manus-storage/hesabi-mark_5cb0429a.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match(SCOPE_PATH) : Response.error())));
});
