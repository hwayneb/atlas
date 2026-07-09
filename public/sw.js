const CACHE_NAME = "atlas-mvp-001";
const ASSETS = [
  "/",
  "/index.html",
  "/src/ui/app.js",
  "/src/ui/styles.css",
  "/public/manifest.webmanifest",
  "/public/sample-campaign/campaign.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || new Response("Offline asset not cached.", { status: 503 }))
  );
});
