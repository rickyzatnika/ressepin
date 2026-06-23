self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        data: data.data || {},
      }),
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification(event.data.text(), {
        icon: "/icon-192.png",
      }),
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
