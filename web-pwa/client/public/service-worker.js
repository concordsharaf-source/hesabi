const CACHE_NAME = "hesabi-pwa-v7";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [SCOPE_PATH, `${SCOPE_PATH}manifest.json`, `${SCOPE_PATH}service-worker.js`];
const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;

const shellAssetUrls = (html) => [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => new URL(match[1], self.registration.scope))
  .filter((url) => url.origin === self.location.origin)
  .map((url) => url.href);

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch(SCOPE_PATH, { cache: "no-store" });
  if (!shellResponse.ok) throw new Error("تعذر تحميل واجهة التطبيق للتخزين المحلي.");
  await cache.put(SCOPE_PATH, shellResponse.clone());
  const urls = [...new Set([...APP_SHELL, ...shellAssetUrls(await shellResponse.text())])];
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) await cache.put(url, response.clone());
    } catch {
      /* يحتفظ التطبيق بما اكتمل تخزينه كي يفتح بلا شبكة بعد أول تحميل ناجح. */
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell().catch(() => caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!isSameOrigin(event.request)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_PATH, response.clone()));
      return response;
    }).catch(() => caches.match(SCOPE_PATH)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => Response.error())));
});
