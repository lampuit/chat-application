importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

function getFirebaseConfig() {
  const searchParams = new URL(self.location.href).searchParams;

  return {
    apiKey: searchParams.get("apiKey"),
    authDomain: searchParams.get("authDomain"),
    projectId: searchParams.get("projectId"),
    storageBucket: searchParams.get("storageBucket"),
    messagingSenderId: searchParams.get("messagingSenderId"),
    appId: searchParams.get("appId"),
  };
}

function hasFirebaseConfig(firebaseConfig) {
  return Object.values(firebaseConfig).every(Boolean);
}

function buildNotificationDetail(payload) {
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  return {
    title: notification.title ?? data.title ?? "New message",
    body: notification.body ?? data.body ?? "",
    conversationId: data.conversationId ?? null,
    messageId: data.messageId ?? null,
    senderId: data.senderId ?? null,
  };
}

async function postMessageToClients(message) {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  windowClients.forEach((client) => {
    client.postMessage(message);
  });
}

const firebaseConfig = getFirebaseConfig();

if (hasFirebaseConfig(firebaseConfig)) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const detail = buildNotificationDetail(payload);
    void postMessageToClients({
      type: "chat-background-message",
      detail,
    });
    const options = {
      body: detail.body,
      icon: payload.notification?.icon ?? payload.data?.icon,
      image: payload.notification?.image ?? payload.data?.image,
      data: {
        ...(payload.data ?? {}),
        conversationId: detail.conversationId,
        messageId: detail.messageId,
        senderId: detail.senderId,
      },
    };

    return self.registration.showNotification(detail.title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const detail = {
    conversationId: event.notification.data?.conversationId ?? null,
    messageId: event.notification.data?.messageId ?? null,
    senderId: event.notification.data?.senderId ?? null,
  };

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (windowClients) => {
        const chatClient =
          windowClients.find((client) => new URL(client.url).origin === self.location.origin) ??
          null;

        if (chatClient) {
          await chatClient.focus();
          chatClient.postMessage({
            type: "chat-notification-click",
            detail,
          });
          return;
        }

        const nextUrl = detail.conversationId
          ? `/chat?conversationId=${encodeURIComponent(detail.conversationId)}`
          : "/chat";

        await self.clients.openWindow(nextUrl);
      }),
  );
});
