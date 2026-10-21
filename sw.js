// 서비스 워커: 오프라인에서도 앱이 열리도록 한 번 받은 파일을 캐시에 보관한다.
// 네트워크 우선 전략이라 온라인일 때는 항상 최신 파일을 받고, 끊겼을 때만 캐시를 쓴다.
// 캐시 구조를 바꾸면 CACHE 이름을 올린다. (모험 기록은 localStorage 에 있으므로 캐시와 무관)
const CACHE = 'colorquest-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // cache: 'no-cache' — 브라우저 HTTP 캐시의 오래된 파일 대신 서버에 최신 여부를 확인한다
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html'))),
  );
});
