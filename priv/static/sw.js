/* eslint-disable no-restricted-globals */

// Cache MapTiler requests client-side to reduce API usage.
// Best-effort eviction: keep only the most recent N entries per cache.
// Goal: keep hot assets around for ~3 months (client-side only).

const VERSION = "v2";
const CACHE_TILES = `maptiler-tiles-${VERSION}`;
const CACHE_SPRITES = `maptiler-sprites-${VERSION}`;
const CACHE_FONTS = `maptiler-fonts-${VERSION}`;

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // ~3 months
const MAX_ENTRIES_TILES = 15000;
const MAX_ENTRIES_SPRITES = 200;
const MAX_ENTRIES_FONTS = 1500;
const FETCHED_AT_HEADER = "sw-fetched-at";
const CACHE_STATUS_HEADER = "sw-cache";

function isCacheableMaptilerUrl(url, method = "GET") {
  if (method !== "GET") return false;
  if (url.protocol !== "https:") return false;
  if (url.hostname !== "api.maptiler.com") return false;

  // Cache only the highest-frequency/most-expensive assets.
  // - tiles: /tiles/.../*.pbf|*.jpg|*.png
  // - sprites: /maps/.../sprite*.png|.json
  // - glyphs: /fonts/.../*.pbf
  if (url.pathname.startsWith("/tiles/")) return true;
  if (url.pathname.startsWith("/fonts/")) return true;
  if (url.pathname.includes("/sprite")) return true;
  return false;
}

function isCacheableMaptilerRequest(request) {
  const url = new URL(request.url);
  return isCacheableMaptilerUrl(url, request.method);
}

function cacheNameFor(url) {
  if (url.pathname.startsWith("/tiles/")) return CACHE_TILES;
  if (url.pathname.startsWith("/fonts/")) return CACHE_FONTS;
  return CACHE_SPRITES;
}

function maxEntriesFor(cacheName) {
  if (cacheName === CACHE_TILES) return MAX_ENTRIES_TILES;
  if (cacheName === CACHE_FONTS) return MAX_ENTRIES_FONTS;
  return MAX_ENTRIES_SPRITES;
}

function isFresh(cachedResponse) {
  const fetchedAtRaw = cachedResponse.headers.get(FETCHED_AT_HEADER);
  const fetchedAt = fetchedAtRaw ? parseInt(fetchedAtRaw, 10) : 0;
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false;
  return isFreshFetchedAtMs(fetchedAt, Date.now());
}

function isFreshFetchedAtMs(fetchedAtMs, nowMs) {
  if (!Number.isFinite(fetchedAtMs) || fetchedAtMs <= 0) return false;
  return nowMs - fetchedAtMs < MAX_AGE_MS;
}

function withFetchedAtHeader(response) {
  // Clone response so we can attach fetch timestamp metadata for TTL.
  const headers = new Headers(response.headers);
  headers.set(FETCHED_AT_HEADER, String(Date.now()));
  return response
    .clone()
    .arrayBuffer()
    .then((buf) => new Response(buf, { status: response.status, statusText: response.statusText, headers }));
}

function withCacheStatusHeader(response, status) {
  // Attach debugging info without buffering the body.
  // Note: Response bodies are one-shot streams; wrapping is fine since we're returning it immediately.
  const headers = new Headers(response.headers);
  headers.set(CACHE_STATUS_HEADER, status);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  // Not true LRU, but keeps cache bounded.
  for (const req of keys.slice(0, excess)) {
    await cache.delete(req);
  }
}

async function purgeExpired(cache) {
  const keys = await cache.keys();
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    if (!isFresh(res)) {
      await cache.delete(req);
    }
  }
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        // Drop old versions.
        const keep = new Set([CACHE_TILES, CACHE_SPRITES, CACHE_FONTS]);
        const names = await caches.keys();
        await Promise.all(
          names.filter((n) => n.startsWith("maptiler-") && !keep.has(n)).map((n) => caches.delete(n))
        );

        // Best-effort purge on activate.
        await Promise.all(
          [CACHE_TILES, CACHE_SPRITES, CACHE_FONTS].map(async (name) => {
            const cache = await caches.open(name);
            await purgeExpired(cache);
            await trimCache(cache, maxEntriesFor(name));
          })
        );

        await self.clients.claim();
      })()
    );
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (!isCacheableMaptilerRequest(request)) return;

    event.respondWith(
      (async () => {
        const url = new URL(request.url);
        const cacheName = cacheNameFor(url);
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);

        const fetchAndUpdate = async () => {
          try {
            const res = await fetch(request);
            if (res && res.ok) {
              const stamped = await withFetchedAtHeader(res);
              await cache.put(request, stamped);
              await trimCache(cache, maxEntriesFor(cacheName));
            }
            return res;
          } catch {
            return null;
          }
        };

        if (cached) {
          // Cache-first: only revalidate when older than our target TTL.
          if (!isFresh(cached)) {
            event.waitUntil(fetchAndUpdate());
            return withCacheStatusHeader(cached, "stale");
          }
          return withCacheStatusHeader(cached, "hit");
        }

        const fresh = await fetchAndUpdate();
        if (fresh) return withCacheStatusHeader(fresh, "miss");
        return cached || fresh;
      })()
    );
  });
}

// Allow importing and unit-testing helper logic in Node (Vitest) without running a service worker.
const __exports = {
  isCacheableMaptilerUrl: (urlString, method = "GET") => isCacheableMaptilerUrl(new URL(urlString), method),
  cacheNameForUrl: (urlString) => cacheNameFor(new URL(urlString)),
  isFreshFetchedAtMs,
  constants: {
    CACHE_TILES,
    CACHE_FONTS,
    CACHE_SPRITES,
    MAX_AGE_MS,
  },
};

// eslint-disable-next-line no-undef
if (typeof module !== "undefined" && module.exports) {
  // eslint-disable-next-line no-undef
  module.exports = __exports;
}

