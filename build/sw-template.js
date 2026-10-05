// Service worker gerado no build (build/service-worker-plugin.ts).
// Guarda os arquivos do app no aparelho para abrir rápido e funcionar sem internet.
const VERSION = __VERSION__;
const CACHE = `filtros-${VERSION}`;
const PRECACHE = __PRECACHE__;
// Sem resposta da rede nesse tempo, abre a versão guardada.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('filtros-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Página: tenta a rede primeiro (para receber atualizações) e cai para a cópia guardada.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Demais arquivos têm hash no nome (ou raramente mudam): cópia guardada primeiro.
  event.respondWith(cacheFirst(request));
});

/**
 * Arquivos que ainda não estão guardados vêm da rede e são guardados na hora.
 * Isso mantém o app funcionando sem internet mesmo quando a página nova chega
 * antes deste service worker ser atualizado (a página nova pede arquivos novos).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const fromNetwork = fetch(request).then((response) => {
    if (response.ok) cache.put('./', response.clone());
    return response;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([fromNetwork, timeout]);
    if (response) return response;
  } catch {
    // sem rede
  }
  const cached = await cache.match('./');
  return cached || fromNetwork;
}
