
self.addEventListener("install", event => {
  event.waitUntil(caches.open("routine-v1").then(cache => cache.addAll([
    "./", "./index.html", "./styles.css", "./app.js", "./routine-data.json", "./manifest.webmanifest"
  ])));
});
self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./"));
});
