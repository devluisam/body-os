const CACHE = "body-os-shell-v3";
// Public files the shell needs offline; served from the cache, then network.
const STATIC = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.svg",
  "/manifest.webmanifest",
];
const asset = (url) =>
  url.origin === self.location.origin &&
  // Vite builds emit /assets/; the Vinext build used here emits /_next/static/.
  /^\/(?:assets|_next\/static)\/.*\.(?:js|css|woff2?)$/.test(url.pathname);
async function shell(response) {
  if (
    response.ok &&
    !response.redirected &&
    new URL(response.url).pathname === "/" &&
    response.headers.get("content-type")?.includes("text/html")
  ) {
    const html = await response.clone().text();
    if (html.includes('data-bodyos-shell="1"'))
      await (await caches.open(CACHE)).put("/", response.clone());
  }
  return response;
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(STATIC);
      await fetch("/", { cache: "reload" })
        .then(shell)
        .catch(() => {});
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter((k) => k.startsWith("body-os-shell-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_ASSETS") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        event.data.urls
          .filter((u) => asset(new URL(u)))
          .map(async (u) => {
            const response = await fetch(u);
            if (response.ok && !response.redirected)
              await cache.put(u, response);
          }),
      );
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Private API responses, photos and authentication routes never enter Cache Storage.
  if (request.mode === "navigate" && url.pathname === "/")
    event.respondWith(
      fetch(request)
        .then(shell)
        .catch(
          async () =>
            (await caches.match("/")) || (await caches.match("/offline.html")),
        ),
    );
  else if (asset(url))
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE),
          stored = await cache.match(request);
        if (stored) return stored;
        const response = await fetch(request);
        if (response.ok && !response.redirected)
          await cache.put(request, response.clone());
        return response;
      })(),
    );
  else if (STATIC.includes(url.pathname))
    event.respondWith(
      caches
        .match(url.pathname)
        .then((stored) => stored || fetch(request)),
    );
});
