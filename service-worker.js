
self.addEventListener("install", event => {
  event.waitUntil(caches.open("routine-v3").then(cache => cache.addAll([
    "./", "./index.html", "./styles.css", "./app.js", "./routine-data.json", "./manifest.webmanifest"
  ])));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== "routine-v3").map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        const copy = resp.clone();
        caches.open("routine-v3").then(cache => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request).then(resp => resp || caches.match("./index.html")))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./"));
});
