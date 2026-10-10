// Service Worker — StarTech PWA
// Never cache: auth routes, admin routes, signed URLs, API routes

const CACHE_NAME = "startech-v1";
const OFFLINE_URL = "/offline.html";

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
];

// Install: pre-cache offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first with offline fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache these paths
  const neverCache = [
    "/api/",
    "/login",
    "/signup",
    "/auth/",
    "/admin/",
    "/checkout/",
    "/settings/",
  ];

  // Never cache signed URLs (Mux, Supabase Storage)
  const isSignedUrl =
    url.searchParams.has("token") ||
    url.searchParams.has("X-Amz-Signature") ||
    url.hostname.includes("mux.com");

  if (
    neverCache.some((path) => url.pathname.startsWith(path)) ||
    isSignedUrl ||
    event.request.method !== "GET"
  ) {
    return; // Let the browser handle it normally
  }

  // For navigation requests, try network first, fall back to offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For other requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (
          response.ok &&
          (url.pathname.startsWith("/_next/static/") ||
            url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
