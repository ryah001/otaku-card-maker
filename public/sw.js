const CACHE_PREFIX = "carte-otaku-";
const CACHE_VERSION = "v1";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_ROOT = "/otaku-card-maker/";
const APP_SHELL = [
  APP_ROOT,
  APP_ROOT + "index.html",
  APP_ROOT + "manifest.webmanifest",
  APP_ROOT + "icons/carte-otaku.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_ROOT)) return;

  // Les pages HTML passent par le réseau en priorité pour récupérer les nouvelles versions.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT + "index.html", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(APP_ROOT + "index.html")))
    );
    return;
  }

  // Ne met en cache que les ressources de l'application, jamais les appels API externes.
  if (url.pathname.includes("/assets/") || url.pathname === APP_ROOT + "manifest.webmanifest" || url.pathname.startsWith(APP_ROOT + "icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        });
        return cached || network;
      })
    );
  }
});
