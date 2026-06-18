/// <reference lib="webworker" />

/**
 * Service Worker — offline invoice cache + app shell caching.
 *
 * Strategy:
 * - App shell (HTML, JS, CSS): Cache-first
 * - API calls: Network-first, fallback to cache
 * - Invoice data: Stale-while-revalidate
 */

const SW_VERSION = "1.0.0";
const CACHE_NAME = `agrounu-v${SW_VERSION}`;
const API_CACHE = `agrounu-api-v${SW_VERSION}`;

const APP_SHELL = [
  "/",
  "/dashboard",
  "/manifest.json",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for shell
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful GET responses
          if (request.method === "GET" && response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
