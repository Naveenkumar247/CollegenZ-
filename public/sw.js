self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.body || "New message from a friend",
        icon: "/uploads/logo.png", // Path to your logo
        badge: "/uploads/logo.png",
        vibrate: [100, 50, 100],
        data: { url: data.url }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Open the chat when the notification is clicked
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
