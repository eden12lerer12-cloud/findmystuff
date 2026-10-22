// Static shell only: never cache inventory, backup JSON, photos or API responses.
const ASSETS = __ASSETS__;
const PREFIX = `findmystuff-shell:${self.registration.scope}:`;
const CACHE = PREFIX + "__DIGEST__";
const urls = new Set(
  ASSETS.map((path) => new URL(path, self.registration.scope).href),
);
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // A failed asset aborts installation; the previous complete shell remains.
      await cache.addAll(
        ASSETS.map(
          (path) =>
            new Request(new URL(path, self.registration.scope), {
              cache: "reload",
            }),
        ),
      );
    })(),
  );
});
// No skipWaiting: all open tabs finish using their coherent shell before updates.
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const root = new URL("./", self.registration.scope);
  if (event.request.mode === "navigate" && url.pathname === root.pathname) {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(new URL("index.html", root).href))
        .then((hit) => hit || fetch(event.request)),
    );
    return;
  }
  // Exact allowlist: queries, unrelated routes and blobs are never cached.
  if (!urls.has(url.href)) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(event.request))
      .then((hit) => hit || fetch(event.request)),
  );
});
