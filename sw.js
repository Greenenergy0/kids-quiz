// 오프라인 캐시. 파일을 고치면 CACHE 이름의 숫자를 올려야 새 버전이 적용된다.
const CACHE = "kidsquiz-v7";

const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/store.js",
  "js/quiz.js",
  "js/questions.js",
  "js/stories.js",
  "js/english.js",
  "js/words.js",
  "js/listen.js",
  "js/mic.js",
  "js/speech.js",
  "js/app.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

// 새 버전은 앱을 완전히 닫았다 다시 열 때 적용된다.
// (놀고 있는 도중에 화면이 새로고침되지 않도록 skipWaiting은 쓰지 않는다)
self.addEventListener("install", (event) => {
  // cache: "reload" — 브라우저가 들고 있던 옛 파일 말고 항상 새로 받아서 저장한다.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => (request.mode === "navigate" ? caches.match("index.html") : undefined));
    })
  );
});
